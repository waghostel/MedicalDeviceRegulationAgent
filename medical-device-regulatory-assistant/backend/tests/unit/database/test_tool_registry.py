"""
Unit tests for Tool Registry and Circuit Breaker functionality
"""

import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch
from typing import Dict, Any

from langchain.tools import BaseTool

from backend.tools.tool_registry import (
    ToolRegistry,
    ToolConfiguration,
    ToolStatus,
    CircuitBreaker
)


class MockTool(BaseTool):
    """Mock tool for testing"""
    
    name: str = "mock_tool"
    description: str = "A mock tool for testing"
    
    def __init__(self, should_fail: bool = False, **kwargs):
        super().__init__(**kwargs)
        self.should_fail = should_fail
        self.call_count = 0
    
    def _run(self, **kwargs: Any) -> Dict[str, Any]:
        self.call_count += 1
        if self.should_fail:
            raise Exception("Mock tool failure")
        return {"status": "success", "call_count": self.call_count}
    
    async def _arun(self, **kwargs: Any) -> Dict[str, Any]:
        self.call_count += 1
        if self.should_fail:
            raise Exception("Mock tool failure")
        return {"status": "success", "call_count": self.call_count}
    
    def get_schema(self) -> Dict[str, Any]:
        return {"type": "object", "properties": {}}
    
    async def health_check(self) -> bool:
        return not self.should_fail


class TestCircuitBreaker:
    """Test cases for CircuitBreaker"""
    
    def setup_method(self):
        """Setup test fixtures"""
        self.circuit_breaker = CircuitBreaker(failure_threshold=3, recovery_timeout=60)
    
    def test_initial_state(self):
        """Test initial circuit breaker state"""
        assert self.circuit_breaker.state == "closed"
        assert self.circuit_breaker.failure_count == 0
        assert self.circuit_breaker.can_execute() is True
    
    def test_record_success(self):
        """Test recording successful executions"""
        # Record some failures first
        self.circuit_breaker.record_failure()
        self.circuit_breaker.record_failure()
        assert self.circuit_breaker.failure_count == 2
        
        # Record success should reset
        self.circuit_breaker.record_success()
        assert self.circuit_breaker.failure_count == 0
        assert self.circuit_breaker.state == "closed"
    
    def test_circuit_opens_on_threshold(self):
        """Test circuit opens when failure threshold is reached"""
        # Record failures up to threshold
        for _ in range(3):
            self.circuit_breaker.record_failure()
        
        assert self.circuit_breaker.state == "open"
        assert self.circuit_breaker.can_execute() is False
    
    def test_circuit_half_open_after_timeout(self):
        """Test circuit moves to half-open after recovery timeout"""
        # Open the circuit
        for _ in range(3):
            self.circuit_breaker.record_failure()
        
        assert self.circuit_breaker.state == "open"
        
        # Mock time to simulate timeout
        with patch('time.time') as mock_time:
            # Set current time to be past recovery timeout
            mock_time.return_value = self.circuit_breaker.last_failure_time + 61
            
            assert self.circuit_breaker.can_execute() is True
            assert self.circuit_breaker.state == "half-open"
    
    def test_half_open_success_closes_circuit(self):
        """Test successful execution in half-open state closes circuit"""
        # Open circuit and move to half-open
        for _ in range(3):
            self.circuit_breaker.record_failure()
        
        self.circuit_breaker.state = "half-open"
        
        # Record success should close circuit
        self.circuit_breaker.record_success()
        assert self.circuit_breaker.state == "closed"
        assert self.circuit_breaker.failure_count == 0


class TestToolRegistry:
    """Test cases for ToolRegistry"""
    
    def setup_method(self):
        """Setup test fixtures"""
        self.registry = ToolRegistry()
        # Clear default tools for clean testing
        self.registry.tools.clear()
        self.registry.tool_instances.clear()
        self.registry.circuit_breakers.clear()
        self.registry.health_status.clear()
    
    def test_register_tool(self):
        """Test registering a new tool"""
        self.registry.register_tool(
            name="test_tool",
            description="Test tool",
            tool_class=MockTool,
            config_params={"should_fail": False},
            dependencies=["dependency_tool"],
            rate_limit=60,
            timeout=30
        )
        
        # Verify tool was registered
        assert "test_tool" in self.registry.tools
        assert "test_tool" in self.registry.circuit_breakers
        assert "test_tool" in self.registry.health_status
        
        config = self.registry.tools["test_tool"]
        assert config.name == "test_tool"
        assert config.description == "Test tool"
        assert config.tool_class == MockTool
        assert config.dependencies == ["dependency_tool"]
        assert config.rate_limit == 60
        assert config.timeout == 30
    
    def test_register_tool_initialization_failure(self):
        """Test handling tool initialization failure"""
        
        class FailingTool(BaseTool):
            name = "failing_tool"
            description = "Tool that fails to initialize"
            
            def __init__(self, **kwargs):
                raise Exception("Initialization failed")
            
            def _run(self, **kwargs):
                pass
        
        self.registry.register_tool(
            name="failing_tool",
            description="Failing tool",
            tool_class=FailingTool
        )
        
        # Verify tool was registered but marked as error
        assert "failing_tool" in self.registry.tools
        assert self.registry.tools["failing_tool"].status == ToolStatus.ERROR
        assert self.registry.health_status["failing_tool"] is False
    
    @pytest.mark.asyncio
    async def test_get_tool_success(self):
        """Test successfully getting a tool"""
        self.registry.register_tool(
            name="test_tool",
            description="Test tool",
            tool_class=MockTool,
            config_params={"should_fail": False}
        )
        
        tool = await self.registry.get_tool("test_tool")
        assert isinstance(tool, MockTool)
        assert tool.should_fail is False
    
    @pytest.mark.asyncio
    async def test_get_tool_not_found(self):
        """Test error when tool not found"""
        with pytest.raises(ValueError, match="Tool 'nonexistent' not found"):
            await self.registry.get_tool("nonexistent")
    
    @pytest.mark.asyncio
    async def test_get_tool_unavailable(self):
        """Test error when tool is unavailable"""
        self.registry.register_tool(
            name="unavailable_tool",
            description="Unavailable tool",
            tool_class=MockTool
        )
        
        # Mark tool as unavailable
        self.registry.tools["unavailable_tool"].status = ToolStatus.UNAVAILABLE
        
        with pytest.raises(RuntimeError, match="Tool 'unavailable_tool' is not available"):
            await self.registry.get_tool("unavailable_tool")
    
    @pytest.mark.asyncio
    async def test_get_tool_circuit_breaker_open(self):
        """Test error when circuit breaker is open"""
        self.registry.register_tool(
            name="failing_tool",
            description="Failing tool",
            tool_class=MockTool,
            circuit_breaker_threshold=2
        )
        
        # Open circuit breaker
        circuit_breaker = self.registry.circuit_breakers["failing_tool"]
        circuit_breaker.state = "open"
        
        with pytest.raises(RuntimeError, match="Tool 'failing_tool' circuit breaker is open"):
            await self.registry.get_tool("failing_tool")
    
    @pytest.mark.asyncio
    async def test_get_tool_missing_dependency(self):
        """Test error when tool dependency is missing"""
        self.registry.register_tool(
            name="dependent_tool",
            description="Tool with dependency",
            tool_class=MockTool,
            dependencies=["missing_dependency"]
        )
        
        with pytest.raises(RuntimeError, match="dependency 'missing_dependency' is not available"):
            await self.registry.get_tool("dependent_tool")
    
    @pytest.mark.asyncio
    async def test_execute_tool_success(self):
        """Test successful tool execution"""
        self.registry.register_tool(
            name="test_tool",
            description="Test tool",
            tool_class=MockTool,
            config_params={"should_fail": False}
        )
        
        result = await self.registry.execute_tool("test_tool", test_param="value")
        
        assert result["status"] == "success"
        assert result["call_count"] == 1
        
        # Verify health status updated
        assert self.registry.health_status["test_tool"] is True
        
        # Verify circuit breaker state
        circuit_breaker = self.registry.circuit_breakers["test_tool"]
        assert circuit_breaker.failure_count == 0
    
    @pytest.mark.asyncio
    async def test_execute_tool_with_timeout(self):
        """Test tool execution with timeout"""
        
        class SlowTool(MockTool):
            async def _arun(self, **kwargs):
                await asyncio.sleep(2)  # Simulate slow operation
                return await super()._arun(**kwargs)
        
        self.registry.register_tool(
            name="slow_tool",
            description="Slow tool",
            tool_class=SlowTool,
            timeout=1  # 1 second timeout
        )
        
        with pytest.raises(asyncio.TimeoutError):
            await self.registry.execute_tool("slow_tool")
    
    @pytest.mark.asyncio
    async def test_execute_tool_with_retry(self):
        """Test tool execution with retry logic"""
        
        class FlakyTool(MockTool):
            def __init__(self, **kwargs):
                super().__init__(**kwargs)
                self.attempt_count = 0
            
            async def _arun(self, **kwargs):
                self.attempt_count += 1
                if self.attempt_count < 3:  # Fail first 2 attempts
                    raise Exception("Flaky failure")
                return {"status": "success", "attempts": self.attempt_count}
        
        self.registry.register_tool(
            name="flaky_tool",
            description="Flaky tool",
            tool_class=FlakyTool,
            retry_count=3
        )
        
        result = await self.registry.execute_tool("flaky_tool")
        
        assert result["status"] == "success"
        assert result["attempts"] == 3
    
    @pytest.mark.asyncio
    async def test_execute_tool_failure_exhausts_retries(self):
        """Test tool execution failure after exhausting retries"""
        self.registry.register_tool(
            name="failing_tool",
            description="Always failing tool",
            tool_class=MockTool,
            config_params={"should_fail": True},
            retry_count=2
        )
        
        with pytest.raises(Exception, match="Mock tool failure"):
            await self.registry.execute_tool("failing_tool")
        
        # Verify circuit breaker recorded failure
        circuit_breaker = self.registry.circuit_breakers["failing_tool"]
        assert circuit_breaker.failure_count > 0
        
        # Verify health status updated
        assert self.registry.health_status["failing_tool"] is False
    
    @pytest.mark.asyncio
    async def test_health_check_single_tool(self):
        """Test health check for single tool"""
        self.registry.register_tool(
            name="healthy_tool",
            description="Healthy tool",
            tool_class=MockTool,
            config_params={"should_fail": False}
        )
        
        health_results = await self.registry.health_check("healthy_tool")
        
        assert "healthy_tool" in health_results
        result = health_results["healthy_tool"]
        assert result["status"] == "healthy"
        assert result["circuit_breaker_state"] == "closed"
        assert result["failure_count"] == 0
    
    @pytest.mark.asyncio
    async def test_health_check_all_tools(self):
        """Test health check for all tools"""
        self.registry.register_tool(
            name="healthy_tool",
            description="Healthy tool",
            tool_class=MockTool,
            config_params={"should_fail": False}
        )
        
        self.registry.register_tool(
            name="unhealthy_tool",
            description="Unhealthy tool",
            tool_class=MockTool,
            config_params={"should_fail": True}
        )
        
        health_results = await self.registry.health_check()
        
        assert len(health_results) == 2
        assert health_results["healthy_tool"]["status"] == "healthy"
        assert health_results["unhealthy_tool"]["status"] == "error"
    
    def test_get_available_tools(self):
        """Test getting list of available tools"""
        # Register healthy tool
        self.registry.register_tool(
            name="available_tool",
            description="Available tool",
            tool_class=MockTool
        )
        
        # Register unavailable tool
        self.registry.register_tool(
            name="unavailable_tool",
            description="Unavailable tool",
            tool_class=MockTool
        )
        self.registry.tools["unavailable_tool"].status = ToolStatus.UNAVAILABLE
        
        available_tools = self.registry.get_available_tools()
        
        assert "available_tool" in available_tools
        assert "unavailable_tool" not in available_tools
    
    def test_get_tool_info(self):
        """Test getting detailed tool information"""
        self.registry.register_tool(
            name="info_tool",
            description="Tool for info testing",
            tool_class=MockTool,
            rate_limit=60,
            timeout=30,
            retry_count=3
        )
        
        info = self.registry.get_tool_info("info_tool")
        
        assert info["name"] == "info_tool"
        assert info["description"] == "Tool for info testing"
        assert info["status"] == ToolStatus.AVAILABLE.value
        assert info["configuration"]["rate_limit"] == 60
        assert info["configuration"]["timeout"] == 30
        assert info["configuration"]["retry_count"] == 3
        assert "circuit_breaker" in info
    
    def test_get_tool_info_not_found(self):
        """Test error when getting info for nonexistent tool"""
        with pytest.raises(ValueError, match="Tool 'nonexistent' not found"):
            self.registry.get_tool_info("nonexistent")
    
    def test_update_tool_status(self):
        """Test updating tool status"""
        self.registry.register_tool(
            name="status_tool",
            description="Tool for status testing",
            tool_class=MockTool
        )
        
        # Update status
        self.registry.update_tool_status("status_tool", ToolStatus.MAINTENANCE)
        
        assert self.registry.tools["status_tool"].status == ToolStatus.MAINTENANCE
    
    def test_update_tool_status_not_found(self):
        """Test error when updating status of nonexistent tool"""
        with pytest.raises(ValueError, match="Tool 'nonexistent' not found"):
            self.registry.update_tool_status("nonexistent", ToolStatus.MAINTENANCE)
    
    def test_get_registry_stats(self):
        """Test getting registry statistics"""
        # Register various tools
        self.registry.register_tool(
            name="healthy_tool",
            description="Healthy tool",
            tool_class=MockTool
        )
        
        self.registry.register_tool(
            name="unhealthy_tool",
            description="Unhealthy tool",
            tool_class=MockTool
        )
        self.registry.health_status["unhealthy_tool"] = False
        
        self.registry.register_tool(
            name="maintenance_tool",
            description="Maintenance tool",
            tool_class=MockTool
        )
        self.registry.tools["maintenance_tool"].status = ToolStatus.MAINTENANCE
        
        stats = self.registry.get_registry_stats()
        
        assert stats["total_tools"] == 3
        assert stats["available_tools"] == 2  # healthy + unhealthy (both available status)
        assert stats["healthy_tools"] == 1   # only healthy_tool
        assert stats["health_percentage"] == 33.33  # 1/3 * 100
        assert len(stats["circuit_breakers"]) == 3
        assert len(stats["tool_list"]) == 3


if __name__ == "__main__":
    pytest.main([__file__, "-v"])