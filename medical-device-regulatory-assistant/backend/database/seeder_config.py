"""
Environment-specific configuration for database seeding
"""

import os
import logging
from enum import Enum
from typing import Dict, Any, Optional, List
from pathlib import Path
from dataclasses import dataclass

logger = logging.getLogger(__name__)


class Environment(Enum):
    """Application environment types"""
    DEVELOPMENT = "development"
    TESTING = "testing"
    PRODUCTION = "production"


@dataclass
class SeederConfig:
    """Configuration for database seeding operations"""
    
    # Environment settings
    environment: Environment
    
    # Seeding behavior
    auto_seed_on_startup: bool = False
    clear_before_seed: bool = False
    seed_minimal_data: bool = False
    
    # Configuration files
    config_file_path: Optional[str] = None
    fallback_config_paths: List[str] = None
    
    # Validation settings
    validate_before_seed: bool = True
    validate_after_seed: bool = True
    
    # Error handling
    fail_on_validation_error: bool = True
    continue_on_seed_error: bool = False
    
    # Logging
    log_level: str = "INFO"
    log_seeding_details: bool = True
    
    def __post_init__(self):
        """Initialize default values based on environment"""
        if self.fallback_config_paths is None:
            self.fallback_config_paths = self._get_default_config_paths()
    
    def _get_default_config_paths(self) -> List[str]:
        """Get default configuration file paths for the environment"""
        base_paths = [
            "mock_data/sample_mock_data_config.json",
            "backend/mock_data/sample_mock_data_config.json",
            "medical-device-regulatory-assistant/backend/mock_data/sample_mock_data_config.json"
        ]
        
        if self.environment == Environment.DEVELOPMENT:
            return [
                "mock_data/sample_mock_data_config.json",
                "mock_data/comprehensive_mock_data_config.json",
                *base_paths
            ]
        elif self.environment == Environment.TESTING:
            return [
                "mock_data/minimal_test_config.json",
                "mock_data/edge_cases_mock_data_config.json",
                *base_paths
            ]
        elif self.environment == Environment.PRODUCTION:
            return [
                "mock_data/production_seed_config.json",
                *base_paths
            ]
        
        return base_paths


class SeederConfigManager:
    """Manages seeder configuration based on environment"""
    
    def __init__(self):
        self._config: Optional[SeederConfig] = None
        self._environment: Optional[Environment] = None
    
    def reset_cache(self):
        """Reset cached configuration to force reload"""
        self._config = None
        self._environment = None
    
    def get_environment(self) -> Environment:
        """Detect current environment from environment variables"""
        if self._environment is None:
            env_name = os.getenv("ENVIRONMENT", os.getenv("NODE_ENV", "development")).lower()
            
            if env_name in ["prod", "production"]:
                self._environment = Environment.PRODUCTION
            elif env_name in ["test", "testing"]:
                self._environment = Environment.TESTING
            else:
                self._environment = Environment.DEVELOPMENT
        
        return self._environment
    
    def get_config(self) -> SeederConfig:
        """Get seeder configuration for current environment"""
        if self._config is None:
            self._config = self._create_config_for_environment()
        
        return self._config
    
    def _create_config_for_environment(self) -> SeederConfig:
        """Create configuration based on current environment"""
        env = self.get_environment()
        
        if env == Environment.DEVELOPMENT:
            return self._create_development_config()
        elif env == Environment.TESTING:
            return self._create_testing_config()
        elif env == Environment.PRODUCTION:
            return self._create_production_config()
        else:
            logger.warning(f"Unknown environment: {env}, using development config")
            return self._create_development_config()
    
    def _create_development_config(self) -> SeederConfig:
        """Create configuration for development environment"""
        return SeederConfig(
            environment=Environment.DEVELOPMENT,
            auto_seed_on_startup=os.getenv("AUTO_SEED_ON_STARTUP", "true").lower() == "true",
            clear_before_seed=os.getenv("CLEAR_BEFORE_SEED", "false").lower() == "true",
            seed_minimal_data=False,
            config_file_path=os.getenv("SEEDER_CONFIG_FILE"),
            validate_before_seed=True,
            validate_after_seed=True,
            fail_on_validation_error=False,  # More lenient in development
            continue_on_seed_error=True,     # Continue on errors in development
            log_level=os.getenv("LOG_LEVEL", "INFO"),
            log_seeding_details=True
        )
    
    def _create_testing_config(self) -> SeederConfig:
        """Create configuration for testing environment"""
        return SeederConfig(
            environment=Environment.TESTING,
            auto_seed_on_startup=False,  # Manual control in tests
            clear_before_seed=True,      # Always clear for clean tests
            seed_minimal_data=True,      # Minimal data for faster tests
            config_file_path=os.getenv("SEEDER_CONFIG_FILE"),
            validate_before_seed=True,
            validate_after_seed=True,
            fail_on_validation_error=True,   # Strict validation in tests
            continue_on_seed_error=False,    # Fail fast in tests
            log_level=os.getenv("LOG_LEVEL", "WARNING"),
            log_seeding_details=False        # Less verbose in tests
        )
    
    def _create_production_config(self) -> SeederConfig:
        """Create configuration for production environment"""
        return SeederConfig(
            environment=Environment.PRODUCTION,
            auto_seed_on_startup=False,  # Never auto-seed in production
            clear_before_seed=False,     # Never clear production data
            seed_minimal_data=True,      # Only essential data in production
            config_file_path=os.getenv("SEEDER_CONFIG_FILE"),
            validate_before_seed=True,
            validate_after_seed=True,
            fail_on_validation_error=True,   # Strict validation in production
            continue_on_seed_error=False,    # Fail fast in production
            log_level=os.getenv("LOG_LEVEL", "ERROR"),
            log_seeding_details=False        # Minimal logging in production
        )
    
    def override_config(self, **kwargs) -> SeederConfig:
        """Override specific configuration values"""
        current_config = self.get_config()
        
        # Create new config with overrides
        config_dict = {
            'environment': current_config.environment,
            'auto_seed_on_startup': current_config.auto_seed_on_startup,
            'clear_before_seed': current_config.clear_before_seed,
            'seed_minimal_data': current_config.seed_minimal_data,
            'config_file_path': current_config.config_file_path,
            'fallback_config_paths': current_config.fallback_config_paths,
            'validate_before_seed': current_config.validate_before_seed,
            'validate_after_seed': current_config.validate_after_seed,
            'fail_on_validation_error': current_config.fail_on_validation_error,
            'continue_on_seed_error': current_config.continue_on_seed_error,
            'log_level': current_config.log_level,
            'log_seeding_details': current_config.log_seeding_details
        }
        
        # Apply overrides
        config_dict.update(kwargs)
        
        return SeederConfig(**config_dict)


# Global configuration manager instance
_config_manager = SeederConfigManager()


def get_seeder_config() -> SeederConfig:
    """Get the current seeder configuration"""
    return _config_manager.get_config()


def get_environment() -> Environment:
    """Get the current environment"""
    return _config_manager.get_environment()


def override_seeder_config(**kwargs) -> SeederConfig:
    """Override seeder configuration for specific operations"""
    return _config_manager.override_config(**kwargs)


def is_development() -> bool:
    """Check if running in development environment"""
    return get_environment() == Environment.DEVELOPMENT


def is_testing() -> bool:
    """Check if running in testing environment"""
    return get_environment() == Environment.TESTING


def is_production() -> bool:
    """Check if running in production environment"""
    return get_environment() == Environment.PRODUCTION