"""
Integrated database seeder with environment-specific configuration and validation
"""

import asyncio
import logging
from typing import Dict, Any, Optional, List
from pathlib import Path

from .seeder import EnhancedDatabaseSeeder
from .seeder_config import (
    SeederConfig, 
    SeederConfigManager, 
    get_seeder_config, 
    get_environment,
    Environment
)
from .seeder_validation import SeederValidator, ValidationReport, format_validation_report
from .connection import get_database_manager

logger = logging.getLogger(__name__)


class IntegratedSeederManager:
    """
    Integrated seeder manager that handles environment-specific configuration,
    validation, and error reporting for database seeding operations.
    """
    
    def __init__(self, config: Optional[SeederConfig] = None):
        self.config = config or get_seeder_config()
        self.validator = SeederValidator()
        self._seeder: Optional[EnhancedDatabaseSeeder] = None
        
        # Configure logging based on config
        self._configure_logging()
    
    def _configure_logging(self):
        """Configure logging based on seeder configuration"""
        log_level = getattr(logging, self.config.log_level.upper(), logging.INFO)
        
        # Set logger level for seeder-related loggers
        seeder_logger = logging.getLogger('database.seeder')
        seeder_logger.setLevel(log_level)
        
        if self.config.log_seeding_details:
            seeder_logger.info(f"Seeder logging configured for {self.config.environment.value} environment")
    
    def _get_seeder(self) -> EnhancedDatabaseSeeder:
        """Get or create seeder instance with appropriate configuration"""
        if self._seeder is None:
            config_path = self._find_config_file()
            self._seeder = EnhancedDatabaseSeeder(config_path)
        return self._seeder
    
    def _find_config_file(self) -> Optional[str]:
        """Find the appropriate configuration file for the current environment"""
        # Check explicit config file first
        if self.config.config_file_path:
            config_path = Path(self.config.config_file_path)
            if config_path.exists():
                logger.info(f"Using explicit config file: {config_path}")
                return str(config_path)
            else:
                logger.warning(f"Explicit config file not found: {config_path}")
        
        # Try fallback paths
        for fallback_path in self.config.fallback_config_paths:
            config_path = Path(fallback_path)
            if config_path.exists():
                logger.info(f"Using fallback config file: {config_path}")
                return str(config_path)
        
        logger.warning("No configuration file found, will use minimal sample data")
        return None
    
    async def validate_configuration(self) -> ValidationReport:
        """Validate the seeder configuration file"""
        config_path = self._find_config_file()
        
        if not config_path:
            # No config file found, but this might be acceptable
            from .seeder_validation import ValidationResult, ValidationLevel
            return ValidationReport(
                is_valid=True,
                results=[ValidationResult(
                    level=ValidationLevel.INFO,
                    message="No configuration file found, will use minimal sample data",
                    suggestion="Provide a configuration file for more comprehensive seeding"
                )]
            )
        
        return self.validator.validate_config_file(config_path)
    
    async def seed_database(self, force: bool = False) -> Dict[str, Any]:
        """
        Seed the database with environment-appropriate configuration
        
        Args:
            force: Force seeding even if validation fails (development only)
            
        Returns:
            Dict containing seeding results and validation reports
        """
        results = {
            "success": False,
            "environment": self.config.environment.value,
            "validation_report": None,
            "seeding_report": None,
            "errors": [],
            "warnings": []
        }
        
        try:
            # Pre-seeding validation
            if self.config.validate_before_seed:
                logger.info("Running pre-seeding validation...")
                validation_report = await self.validate_configuration()
                results["validation_report"] = validation_report
                
                if self.config.log_seeding_details:
                    logger.info(f"Validation report:\n{format_validation_report(validation_report)}")
                
                if not validation_report.is_valid:
                    if self.config.fail_on_validation_error and not force:
                        results["errors"].append("Pre-seeding validation failed")
                        return results
                    elif validation_report.has_errors:
                        results["warnings"].append("Pre-seeding validation has errors but continuing")
            
            # Perform seeding
            logger.info(f"Starting database seeding for {self.config.environment.value} environment...")
            
            seeder = self._get_seeder()
            
            if self.config.clear_before_seed:
                logger.info("Clearing existing data before seeding...")
                await seeder.clear_all_data()
            
            if self.config.seed_minimal_data:
                logger.info("Seeding minimal data...")
                # For minimal seeding, we could implement a separate method
                # For now, use the regular seeding
                await seeder.seed_all(clear_existing=False)
            else:
                logger.info("Seeding comprehensive data...")
                await seeder.seed_all(clear_existing=False)
            
            # Post-seeding validation
            if self.config.validate_after_seed:
                logger.info("Running post-seeding validation...")
                db_manager = get_database_manager()
                post_validation = self.validator.validate_seeded_data(db_manager)
                
                if not post_validation.is_valid and self.config.fail_on_validation_error:
                    results["errors"].append("Post-seeding validation failed")
                    return results
            
            results["success"] = True
            results["seeding_report"] = "Database seeding completed successfully"
            
            logger.info(f"✅ Database seeding completed successfully for {self.config.environment.value} environment")
            
        except Exception as e:
            error_msg = f"Database seeding failed: {str(e)}"
            logger.error(error_msg)
            results["errors"].append(error_msg)
            
            if not self.config.continue_on_seed_error:
                raise
        
        return results
    
    async def clear_database(self) -> Dict[str, Any]:
        """Clear the database"""
        results = {
            "success": False,
            "environment": self.config.environment.value,
            "errors": []
        }
        
        try:
            # Safety check for production
            if self.config.environment == Environment.PRODUCTION:
                error_msg = "Database clearing is not allowed in production environment"
                logger.error(error_msg)
                results["errors"].append(error_msg)
                return results
            
            logger.info(f"Clearing database for {self.config.environment.value} environment...")
            
            seeder = self._get_seeder()
            await seeder.clear_all_data()
            
            results["success"] = True
            logger.info("✅ Database cleared successfully")
            
        except Exception as e:
            error_msg = f"Database clearing failed: {str(e)}"
            logger.error(error_msg)
            results["errors"].append(error_msg)
            raise
        
        return results
    
    async def seed_incremental(self, data_types: List[str]) -> Dict[str, Any]:
        """Seed specific data types incrementally"""
        results = {
            "success": False,
            "environment": self.config.environment.value,
            "data_types": data_types,
            "errors": []
        }
        
        try:
            logger.info(f"Running incremental seeding for: {data_types}")
            
            seeder = self._get_seeder()
            await seeder.seed_incremental(data_types)
            
            results["success"] = True
            logger.info(f"✅ Incremental seeding completed for: {data_types}")
            
        except Exception as e:
            error_msg = f"Incremental seeding failed: {str(e)}"
            logger.error(error_msg)
            results["errors"].append(error_msg)
            
            if not self.config.continue_on_seed_error:
                raise
        
        return results
    
    def get_seeding_status(self) -> Dict[str, Any]:
        """Get current seeding configuration and status"""
        return {
            "environment": self.config.environment.value,
            "auto_seed_on_startup": self.config.auto_seed_on_startup,
            "clear_before_seed": self.config.clear_before_seed,
            "seed_minimal_data": self.config.seed_minimal_data,
            "config_file_path": self.config.config_file_path,
            "fallback_config_paths": self.config.fallback_config_paths,
            "validate_before_seed": self.config.validate_before_seed,
            "validate_after_seed": self.config.validate_after_seed,
            "fail_on_validation_error": self.config.fail_on_validation_error,
            "continue_on_seed_error": self.config.continue_on_seed_error,
            "log_level": self.config.log_level,
            "log_seeding_details": self.config.log_seeding_details
        }


# Global integrated seeder manager
_integrated_seeder: Optional[IntegratedSeederManager] = None


def get_integrated_seeder(config: Optional[SeederConfig] = None) -> IntegratedSeederManager:
    """Get the global integrated seeder manager"""
    global _integrated_seeder
    if _integrated_seeder is None or config is not None:
        _integrated_seeder = IntegratedSeederManager(config)
    return _integrated_seeder


async def auto_seed_on_startup() -> Optional[Dict[str, Any]]:
    """
    Automatically seed database on startup if configured to do so
    
    Returns:
        Seeding results if seeding was performed, None otherwise
    """
    # Get fresh configuration to check current environment variables
    from .seeder_config import SeederConfigManager
    config_manager = SeederConfigManager()
    config_manager.reset_cache()  # Force reload to pick up environment changes
    config = config_manager.get_config()
    
    if not config.auto_seed_on_startup:
        logger.info("Auto-seeding disabled, skipping database seeding")
        return None
    
    logger.info("Auto-seeding enabled, starting database seeding...")
    
    seeder_manager = IntegratedSeederManager(config)
    return await seeder_manager.seed_database()


async def validate_seeder_setup() -> ValidationReport:
    """Validate the current seeder setup and configuration"""
    seeder_manager = get_integrated_seeder()
    return await seeder_manager.validate_configuration()


# Convenience functions for different environments
async def seed_development_data(clear_first: bool = False) -> Dict[str, Any]:
    """Seed development data"""
    from .seeder_config import override_seeder_config
    
    config = override_seeder_config(
        environment=Environment.DEVELOPMENT,
        clear_before_seed=clear_first,
        seed_minimal_data=False,
        auto_seed_on_startup=False
    )
    
    seeder_manager = IntegratedSeederManager(config)
    return await seeder_manager.seed_database()


async def seed_testing_data(clear_first: bool = True) -> Dict[str, Any]:
    """Seed testing data"""
    from .seeder_config import override_seeder_config
    
    config = override_seeder_config(
        environment=Environment.TESTING,
        clear_before_seed=clear_first,
        seed_minimal_data=True,
        auto_seed_on_startup=False
    )
    
    seeder_manager = IntegratedSeederManager(config)
    return await seeder_manager.seed_database()


async def seed_production_data() -> Dict[str, Any]:
    """Seed production data (minimal and safe)"""
    from .seeder_config import override_seeder_config
    
    config = override_seeder_config(
        environment=Environment.PRODUCTION,
        clear_before_seed=False,  # Never clear production data
        seed_minimal_data=True,
        auto_seed_on_startup=False
    )
    
    seeder_manager = IntegratedSeederManager(config)
    return await seeder_manager.seed_database()