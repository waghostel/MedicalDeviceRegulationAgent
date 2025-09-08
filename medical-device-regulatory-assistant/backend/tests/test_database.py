"""
Unit tests for database connection and management
"""

import pytest
import tempfile
from pathlib import Path

from database.config import DatabaseConfig
from database.connection import DatabaseManager
from database.backup import DatabaseBackupManager
from database.seeder import DatabaseSeeder


class TestDatabaseConfig:
    """Test database configuration"""
    
    def test_default_config(self):
        """Test default database configuration"""
        config = DatabaseConfig()
        
        assert config.database_url == "sqlite+aiosqlite:///./medical_device_assistant.db"
        assert config.pool_size == 5
        assert config.max_overflow == 10
        assert config.auto_backup is True
        assert config.backup_retention_days == 30
    
    def test_custom_config(self):
        """Test custom database configuration"""
        config = DatabaseConfig(
            database_url="sqlite+aiosqlite:///./test.db",
            pool_size=10,
            auto_backup=False
        )
        
        assert config.database_url == "sqlite+aiosqlite:///./test.db"
        assert config.pool_size == 10
        assert config.auto_backup is False


class TestDatabaseManager:
    """Test database manager"""
    
    @pytest.mark.asyncio
    async def test_database_manager_creation(self, test_db_config):
        """Test database manager creation"""
        manager = DatabaseManager(test_db_config)
        
        assert manager.config == test_db_config
        assert manager._engine is None
        assert manager._session_factory is None
    
    @pytest.mark.asyncio
    async def test_engine_creation(self, test_db_config):
        """Test database engine creation"""
        manager = DatabaseManager(test_db_config)
        engine = manager.engine
        
        assert engine is not None
        assert manager._engine is engine
    
    @pytest.mark.asyncio
    async def test_session_factory_creation(self, test_db_config):
        """Test session factory creation"""
        manager = DatabaseManager(test_db_config)
        session_factory = manager.session_factory
        
        assert session_factory is not None
        assert manager._session_factory is session_factory
    
    @pytest.mark.asyncio
    async def test_get_session(self, test_db_manager):
        """Test getting database session"""
        async with test_db_manager.get_session() as session:
            assert session is not None
            # Test that we can execute a simple query
            from sqlalchemy import text
            result = await session.execute(text("SELECT 1"))
            assert result.scalar() == 1
    
    @pytest.mark.asyncio
    async def test_health_check(self, test_db_manager):
        """Test database health check"""
        is_healthy = await test_db_manager.health_check()
        assert is_healthy is True
    
    @pytest.mark.asyncio
    async def test_create_and_drop_tables(self, test_db_config):
        """Test creating and dropping tables"""
        manager = DatabaseManager(test_db_config)
        
        # Create tables
        await manager.create_tables()
        
        # Verify tables exist by trying to query them
        async with manager.get_session() as session:
            from sqlalchemy import text
            result = await session.execute(text("SELECT name FROM sqlite_master WHERE type='table'"))
            tables = [row[0] for row in result.fetchall()]
            
            expected_tables = [
                "users", "projects", "device_classifications", 
                "predicate_devices", "agent_interactions", "project_documents"
            ]
            
            for table in expected_tables:
                assert table in tables
        
        # Drop tables
        await manager.drop_tables()
        
        # Verify tables are dropped
        async with manager.get_session() as session:
            from sqlalchemy import text
            result = await session.execute(text("SELECT name FROM sqlite_master WHERE type='table'"))
            tables = [row[0] for row in result.fetchall()]
            
            # Only alembic_version table should remain
            assert len([t for t in tables if not t.startswith("alembic")]) == 0
        
        await manager.close()


class TestDatabaseBackup:
    """Test database backup functionality"""
    
    def test_backup_manager_creation(self):
        """Test backup manager creation"""
        with tempfile.TemporaryDirectory() as temp_dir:
            config = DatabaseConfig(
                database_url=f"sqlite+aiosqlite:///{temp_dir}/test.db",
                backup_directory=f"{temp_dir}/backups"
            )
            config.database_path = Path(f"{temp_dir}/test.db")
            
            manager = DatabaseBackupManager()
            manager.config = config
            manager.backup_dir = Path(config.backup_directory)
            manager.backup_dir.mkdir(exist_ok=True)
            
            assert manager.backup_dir.exists()
    
    def test_list_backups(self):
        """Test listing backups"""
        with tempfile.TemporaryDirectory() as temp_dir:
            config = DatabaseConfig(backup_directory=f"{temp_dir}/backups")
            
            manager = DatabaseBackupManager()
            manager.config = config
            manager.backup_dir = Path(config.backup_directory)
            manager.backup_dir.mkdir(exist_ok=True)
            
            # Create some dummy backup files
            (manager.backup_dir / "backup_1.db").touch()
            (manager.backup_dir / "backup_2.db").touch()
            
            backups = manager.list_backups()
            assert len(backups) == 2
            assert all(backup.suffix == ".db" for backup in backups)


class TestDatabaseSeeder:
    """Test database seeding functionality"""
    
    @pytest.mark.asyncio
    async def test_seeder_creation(self, test_db_manager):
        """Test seeder creation"""
        seeder = DatabaseSeeder(test_db_manager)
        
        assert seeder.db_manager is not None
    
    @pytest.mark.asyncio
    async def test_seed_users(self, test_db_manager):
        """Test seeding users"""
        seeder = DatabaseSeeder(test_db_manager)
        
        async with test_db_manager.get_session() as session:
            await seeder.seed_users(session)
            # For now, just test that the method runs without error
            # In a full implementation, this would verify actual data
    
    @pytest.mark.asyncio
    async def test_clear_all_data(self, test_db_manager):
        """Test clearing all data"""
        seeder = DatabaseSeeder(test_db_manager)
        
        # First seed some data
        async with test_db_manager.get_session() as session:
            await seeder.seed_users(session)
        
        # Then clear it
        await seeder.clear_all_data()
        
        # Verify data is cleared
        async with test_db_manager.get_session() as session:
            from sqlalchemy import text
            result = await session.execute(text("SELECT COUNT(*) FROM users"))
            count = result.scalar()
            assert count == 0


class TestDatabaseIntegration:
    """Integration tests for database functionality"""
    
    @pytest.mark.asyncio
    async def test_full_database_workflow(self, test_db_manager):
        """Test complete database workflow"""
        from models.user import User
        from models.project import Project, ProjectStatus
        from models.device_classification import DeviceClassification, DeviceClass
        
        async with test_db_manager.get_session() as session:
            # Create user
            user = User(
                email="integration@test.com",
                name="Integration Test",
                google_id="integration_123"
            )
            session.add(user)
            await session.flush()
            
            # Create project
            project = Project(
                user_id=user.id,
                name="Integration Test Project",
                description="Testing full workflow",
                status=ProjectStatus.IN_PROGRESS
            )
            session.add(project)
            await session.flush()
            
            # Create classification
            classification = DeviceClassification(
                project_id=project.id,
                device_class=DeviceClass.CLASS_II,
                product_code="TEST",
                confidence_score=0.95
            )
            session.add(classification)
            await session.flush()
            
            # Verify relationships
            await session.refresh(user, ["projects"])
            await session.refresh(project, ["device_classifications"])
            
            assert len(user.projects) == 1
            assert user.projects[0].name == "Integration Test Project"
            assert len(project.device_classifications) == 1
            assert project.device_classifications[0].product_code == "TEST"
    
    @pytest.mark.asyncio
    async def test_transaction_rollback(self, test_db_manager):
        """Test transaction rollback on error"""
        from models.user import User
        
        try:
            async with test_db_manager.get_session() as session:
                # Create valid user
                user1 = User(
                    email="valid@test.com",
                    name="Valid User",
                    google_id="valid_123"
                )
                session.add(user1)
                await session.flush()
                
                # Try to create user with duplicate email (should fail)
                user2 = User(
                    email="valid@test.com",  # Duplicate email
                    name="Invalid User",
                    google_id="invalid_123"
                )
                session.add(user2)
                await session.flush()  # This should raise an error
                
        except Exception:
            # Expected to fail due to unique constraint
            pass
        
        # Verify that no users were created due to rollback
        async with test_db_manager.get_session() as session:
            from sqlalchemy import text
            result = await session.execute(text("SELECT COUNT(*) FROM users"))
            count = result.scalar()
            assert count == 0