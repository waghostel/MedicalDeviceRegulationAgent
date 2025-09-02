"""
Tool Registry for managing agent tools and their configurations
"""

import asyncio
from typing import Dict, Any, List, Optional, Type, Protocol
from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum

from langchain.tools import BaseTool


class ToolStatus(Enum):
    """Status of a tool in the registry"""
    AVAILABLE = "available"
    UNAVAILABLE = "unavailable"
    ERROR = "error"
    MAINTENANCE = "maintenance"


@dataclass
class ToolConfiguration:
    """Configuration for a tool"""
    name: str
    description: str
    tool_class: Type[BaseTool]
    config_params: Dict[str, Any]
    dependencies: List[str]
    status: ToolStatus = ToolStatus.AVAILABLE
    version: str = "1.0.0"
    rate_limit: Optional[int] = None  # requests per minute
    timeout: Optional[int] = None  # seconds
    retry_count: int = 3
    circuit_breaker_threshold: int = 5  # failures before circuit opens


class ToolProtocol(Protocol):
    """Protocol for regulatory agent tools"""
    
    @abstractmethod
    async def arun(self, **kwargs: Any) -> Dict[str, Any]:
        """Execute the tool asynchronously"""
        pass
    
    @abstractmethod
    def get_schema(self) -> Dict[str, Any]:
        """Get tool input/output schema"""
        pass
    
    @abstractmethod
    async def health_check(self) -> bool:
        """Check if tool is healthy and available"""
        pass


class CircuitBreaker:
    """Circuit breaker for tool reliability"""
    
    def __init__(self, failure_threshold: int = 5, recovery_timeout: int = 60):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failure_count = 0
        self.last_failure_time = 0
        self.state = "closed"  # closed, open, half-open
    
    def can_execute(self) -> bool:
        """Check if tool execution is allowed"""
        
        if self.state == "closed":
            return True
        
        if self.state == "open":
            # Check if recovery timeout has passed
            import time
            if time.time() - self.last_failure_time > self.recovery_timeout:
                self.state = "half-open"
                return True
            return False
        
        if self.state == "half-open":
            return True
        
        return False
    
    def record_success(self):
        """Record successful execution"""
        self.failure_count = 0
        self.state = "closed"
    
    def record_failure(self):
        """Record failed execution"""
        import time
        self.failure_count += 1
        self.last_failure_time = time.time()
        
        if self.failure_count >= self.failure_threshold:
            self.state = "open"


class ToolRegistry:
    """
    Registry for managing regulatory agent tools with health monitoring,
    circuit breakers, and configuration management.
    """
    
    def __init__(self):
        self.tools: Dict[str, ToolConfiguration] = {}
        self.tool_instances: Dict[str, BaseTool] = {}
        self.circuit_breakers: Dict[str, CircuitBreaker] = {}
        self.health_status: Dict[str, bool] = {}
        
        # Initialize default tools
        self._register_default_tools()
    
    def register_tool(
        self,
        name: str,
        description: str,
        tool_class: Type[BaseTool],
        config_params: Optional[Dict[str, Any]] = None,
        dependencies: Optional[List[str]] = None,
        **kwargs
    ) -> None:
        """Register a new tool in the registry"""
        
        config = ToolConfiguration(
            name=name,
            description=description,
            tool_class=tool_class,
            config_params=config_params or {},
            dependencies=dependencies or [],
            **kwargs
        )
        
        self.tools[name] = config
        self.circuit_breakers[name] = CircuitBreaker(
            failure_threshold=config.circuit_breaker_threshold
        )
        
        # Initialize tool instance
        try:
            self.tool_instances[name] = tool_class(**config.config_params)
            self.health_status[name] = True
        except Exception as e:
            print(f"Failed to initialize tool {name}: {e}")
            self.health_status[name] = False
            config.status = ToolStatus.ERROR
    
    async def get_tool(self, name: str) -> BaseTool:
        """Get a tool instance by name"""
        
        if name not in self.tools:
            raise ValueError(f"Tool '{name}' not found in registry")
        
        config = self.tools[name]
        
        # Check tool status
        if config.status != ToolStatus.AVAILABLE:
            raise RuntimeError(f"Tool '{name}' is not available (status: {config.status.value})")
        
        # Check circuit breaker
        circuit_breaker = self.circuit_breakers[name]
        if not circuit_breaker.can_execute():
            raise RuntimeError(f"Tool '{name}' circuit breaker is open")
        
        # Check dependencies
        for dependency in config.dependencies:
            if dependency not in self.tools or not self.health_status.get(dependency, False):
                raise RuntimeError(f"Tool '{name}' dependency '{dependency}' is not available")
        
        # Return tool instance
        if name not in self.tool_instances:
            self.tool_instances[name] = config.tool_class(**config.config_params)
        
        return self.tool_instances[name]
    
    async def execute_tool(
        self,
        name: str,
        **kwargs: Any
    ) -> Dict[str, Any]:
        """Execute a tool with error handling and circuit breaker"""
        
        tool = await self.get_tool(name)
        circuit_breaker = self.circuit_breakers[name]
        config = self.tools[name]
        
        try:
            # Apply timeout if configured
            if config.timeout:
                result = await asyncio.wait_for(
                    tool.arun(**kwargs),
                    timeout=config.timeout
                )
            else:
                result = await tool.arun(**kwargs)
            
            # Record success
            circuit_breaker.record_success()
            self.health_status[name] = True
            
            return result
            
        except Exception as e:
            # Record failure
            circuit_breaker.record_failure()
            self.health_status[name] = False
            
            # Retry logic
            if config.retry_count > 0:
                for attempt in range(config.retry_count):
                    try:
                        await asyncio.sleep(2 ** attempt)  # Exponential backoff
                        
                        if config.timeout:
                            result = await asyncio.wait_for(
                                tool.arun(**kwargs),
                                timeout=config.timeout
                            )
                        else:
                            result = await tool.arun(**kwargs)
                        
                        # Success on retry
                        circuit_breaker.record_success()
                        self.health_status[name] = True
                        return result
                        
                    except Exception:
                        continue
            
            # All retries failed
            raise e
    
    async def health_check(self, tool_name: Optional[str] = None) -> Dict[str, Any]:
        """Perform health check on tools"""
        
        if tool_name:
            tools_to_check = [tool_name] if tool_name in self.tools else []
        else:
            tools_to_check = list(self.tools.keys())
        
        health_results = {}
        
        for name in tools_to_check:
            try:
                tool = self.tool_instances.get(name)
                if tool and hasattr(tool, 'health_check'):
                    is_healthy = await tool.health_check()
                else:
                    # Basic health check - try to get the tool
                    await self.get_tool(name)
                    is_healthy = True
                
                self.health_status[name] = is_healthy
                
                health_results[name] = {
                    "status": "healthy" if is_healthy else "unhealthy",
                    "circuit_breaker_state": self.circuit_breakers[name].state,
                    "failure_count": self.circuit_breakers[name].failure_count,
                    "tool_status": self.tools[name].status.value
                }
                
            except Exception as e:
                self.health_status[name] = False
                health_results[name] = {
                    "status": "error",
                    "error": str(e),
                    "circuit_breaker_state": self.circuit_breakers[name].state,
                    "failure_count": self.circuit_breakers[name].failure_count
                }
        
        return health_results
    
    def get_available_tools(self) -> List[str]:
        """Get list of available tool names"""
        
        return [
            name for name, config in self.tools.items()
            if config.status == ToolStatus.AVAILABLE and self.health_status.get(name, False)
        ]
    
    def get_tool_info(self, name: str) -> Dict[str, Any]:
        """Get detailed information about a tool"""
        
        if name not in self.tools:
            raise ValueError(f"Tool '{name}' not found")
        
        config = self.tools[name]
        circuit_breaker = self.circuit_breakers[name]
        
        return {
            "name": config.name,
            "description": config.description,
            "version": config.version,
            "status": config.status.value,
            "health": self.health_status.get(name, False),
            "dependencies": config.dependencies,
            "circuit_breaker": {
                "state": circuit_breaker.state,
                "failure_count": circuit_breaker.failure_count,
                "threshold": circuit_breaker.failure_threshold
            },
            "configuration": {
                "rate_limit": config.rate_limit,
                "timeout": config.timeout,
                "retry_count": config.retry_count
            }
        }
    
    def update_tool_status(self, name: str, status: ToolStatus) -> None:
        """Update tool status"""
        
        if name not in self.tools:
            raise ValueError(f"Tool '{name}' not found")
        
        self.tools[name].status = status
    
    def _register_default_tools(self) -> None:
        """Register default regulatory tools"""
        
        # Import actual tool implementations
        try:
            from .device_classification_tool import DeviceClassificationTool
            device_classification_available = True
        except ImportError:
            device_classification_available = False
        
        try:
            from .fda_predicate_search_tool import FDAPredicateSearchTool
            predicate_search_available = True
        except ImportError:
            predicate_search_available = False
        
        # Register Device Classification Tool (implemented)
        if device_classification_available:
            self.register_tool(
                name="device_classification",
                description="Classify medical devices and determine FDA product codes, regulatory pathways, and CFR sections",
                tool_class=DeviceClassificationTool,
                dependencies=[],
                rate_limit=60,  # 60 requests per minute
                timeout=30
            )
        
        # Register FDA Predicate Search Tool (implemented)
        if predicate_search_available:
            self.register_tool(
                name="fda_predicate_search",
                description="Search FDA 510(k) database for predicate devices with comprehensive analysis",
                tool_class=FDAPredicateSearchTool,
                dependencies=[],
                rate_limit=240,  # FDA API limit
                timeout=60
            )
        
        # Register Document Processing Tool (implemented)
        try:
            from .document_processing_tool import DocumentProcessingTool
            document_processing_available = True
        except ImportError:
            document_processing_available = False
        
        if document_processing_available:
            self.register_tool(
                name="document_processing",
                description="Process regulatory documents including PDF/DOCX conversion, OCR, NLP extraction, search, and summarization",
                tool_class=DocumentProcessingTool,
                dependencies=[],
                rate_limit=30,  # 30 requests per minute for document processing
                timeout=120  # 2 minutes for complex document processing
            )
        
        # Register placeholder tools for not yet implemented tools
        placeholder_tools = [
            {
                "name": "predicate_comparison",
                "description": "Compare devices with predicate devices for substantial equivalence",
                "dependencies": ["fda_predicate_search"],
                "rate_limit": 30,
                "timeout": 45
            },
            {
                "name": "guidance_document_search",
                "description": "Search FDA guidance documents for regulatory requirements",
                "dependencies": ["document_processing"],
                "rate_limit": 60,
                "timeout": 30
            }
        ]
        
        # Register placeholder tools (will be replaced with actual implementations)
        for tool_config in placeholder_tools:
            # Create a placeholder tool class
            class PlaceholderTool(BaseTool):
                name: str = tool_config["name"]
                description: str = tool_config["description"]
                
                def _run(self, **kwargs: Any) -> Dict[str, Any]:
                    return {"status": "placeholder", "message": f"Tool {self.name} not yet implemented"}
                
                async def _arun(self, **kwargs: Any) -> Dict[str, Any]:
                    return {"status": "placeholder", "message": f"Tool {self.name} not yet implemented"}
                
                def get_schema(self) -> Dict[str, Any]:
                    return {"type": "object", "properties": {}}
                
                async def health_check(self) -> bool:
                    return True
            
            self.register_tool(
                name=tool_config["name"],
                description=tool_config["description"],
                tool_class=PlaceholderTool,
                dependencies=tool_config.get("dependencies", []),
                rate_limit=tool_config.get("rate_limit"),
                timeout=tool_config.get("timeout")
            )
    
    def get_registry_stats(self) -> Dict[str, Any]:
        """Get registry statistics"""
        
        total_tools = len(self.tools)
        available_tools = len([
            t for t in self.tools.values()
            if t.status == ToolStatus.AVAILABLE
        ])
        healthy_tools = len([
            name for name, healthy in self.health_status.items()
            if healthy
        ])
        
        circuit_breaker_stats = {}
        for name, cb in self.circuit_breakers.items():
            circuit_breaker_stats[name] = {
                "state": cb.state,
                "failure_count": cb.failure_count
            }
        
        return {
            "total_tools": total_tools,
            "available_tools": available_tools,
            "healthy_tools": healthy_tools,
            "health_percentage": (healthy_tools / total_tools * 100) if total_tools > 0 else 0,
            "circuit_breakers": circuit_breaker_stats,
            "tool_list": list(self.tools.keys())
        }