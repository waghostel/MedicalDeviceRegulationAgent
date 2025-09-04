"""Unit tests for the HealthCheckService implementation."""

import pytest
import asyncio
import tempfile
import os
import sys
from unittest.mock import AsyncMock, MagicMock, patch, create_autospec
from services.health_check import HealthCheckService
from database.connection import DatabaseManager, init_database, close_database


@pytest.fixture
def health_service():
    """Create HealthCheckService instance"""
    return HealthCheckService()


async def setup_temp_db():
    """Setup temporary database for testing"""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        db_path = tmp.name
    
    # Initialize database manager
    await init_database(f"sqlite:{db_path}")
    return db_path


async def cleanup_temp_db(db_path):
    """Cleanup temporary database"""
    await close_database()
    if os.path.exists(db_path):
        os.unlink(db_path)
    
@pytest.mark.asyncio
async def test_database_health_check_success(health_service):
    """Test successful database health check"""
    db_path = await setup_temp_db()
    try:
        result = await health_service._check_database()
        
        assert result['healthy'] is True
        assert result['status'] == 'connected'
        assert 'database_path' in result
        assert result['message'] == 'Database connection successful'
    finally:
        await cleanup_temp_db(db_path)
    
@pytest.mark.asyncio
async def test_database_health_check_failure(health_service):
    """Test database health check failure when database not initialized"""
    # Close any existing database connection
    await close_database()
    
    result = await health_service._check_database()
    
    assert result['healthy'] is False
    assert result['status'] == 'error'
    assert 'error' in result
    
@pytest.mark.asyncio
async def test_redis_health_check_not_configured(health_service):
    """Test Redis health check when Redis is not configured"""
    with patch('services.health_check.get_redis_client', return_value=None):
        result = await health_service._check_redis()
        
        assert result['healthy'] is False
        assert result['status'] == 'not_configured'
        assert result['message'] == 'Redis client not initialized'


@pytest.mark.asyncio
async def test_redis_health_check_success(health_service):
    """Test successful Redis health check"""
    # Mock Redis client
    mock_redis = AsyncMock()
    mock_redis.ping.return_value = True
    mock_redis.info.return_value = {
        'redis_version': '6.2.0',
        'connected_clients': 1,
        'used_memory_human': '1.5M'
    }
    
    with patch('services.health_check.get_redis_client', return_value=mock_redis):
        result = await health_service._check_redis()
        
        assert result['healthy'] is True
        assert result['status'] == 'connected'
        assert result['details']['version'] == '6.2.0'
        assert result['details']['connected_clients'] == 1
        assert result['details']['used_memory_human'] == '1.5M'


@pytest.mark.asyncio
async def test_redis_health_check_connection_failure(health_service):
    """Test Redis health check when connection fails"""
    mock_redis = AsyncMock()
    mock_redis.ping.side_effect = Exception("Connection refused")
    
    with patch('services.health_check.get_redis_client', return_value=mock_redis):
        result = await health_service._check_redis()
        
        assert result['healthy'] is False
        assert result['status'] == 'disconnected'
        assert 'Connection refused' in result['error']
    
@pytest.mark.asyncio
async def test_fda_api_health_check_success(health_service):
    """Test successful FDA API health check"""
    # Mock OpenFDAService
    mock_fda_service = AsyncMock()
    mock_fda_service.search_predicates.return_value = [
        {'k_number': 'K123456', 'device_name': 'Test Device'}
    ]
    
    with patch('services.health_check.OpenFDAService', return_value=mock_fda_service):
        result = await health_service._check_fda_api()
        
        assert result['healthy'] is True
        assert result['status'] == 'accessible'
        assert result['details']['total_results'] == 1


@pytest.mark.asyncio
async def test_fda_api_health_check_failure(health_service):
    """Test FDA API health check failure"""
    # Mock OpenFDAService to raise exception
    mock_fda_service = AsyncMock()
    mock_fda_service.search_predicates.side_effect = Exception("API unavailable")
    
    with patch('services.health_check.OpenFDAService', return_value=mock_fda_service):
        result = await health_service._check_fda_api()
        
        assert result['healthy'] is False
        assert result['status'] == 'inaccessible'
        assert 'API unavailable' in result['error']
    
@pytest.mark.asyncio
async def test_disk_space_health_check_success(health_service):
    """Test successful disk space health check"""
    # Mock shutil.disk_usage to return healthy disk space
    mock_usage = (1000 * 1024**3, 500 * 1024**3, 500 * 1024**3)  # 1TB total, 500GB used, 500GB free
    
    with patch('services.health_check.shutil.disk_usage', return_value=mock_usage):
        result = await health_service._check_disk_space()
        
        assert result['healthy'] is True
        assert result['status'] == 'ok'
        assert result['details']['total_gb'] == 1000.0
        assert result['details']['used_gb'] == 500.0
        assert result['details']['free_gb'] == 500.0
        assert result['details']['usage_percent'] == 50.0


@pytest.mark.asyncio
async def test_disk_space_health_check_low_space(health_service):
    """Test disk space health check with low space"""
    # Mock shutil.disk_usage to return low disk space (95% used)
    mock_usage = (1000 * 1024**3, 950 * 1024**3, 50 * 1024**3)  # 1TB total, 950GB used, 50GB free
    
    with patch('services.health_check.shutil.disk_usage', return_value=mock_usage):
        result = await health_service._check_disk_space()
        
        assert result['healthy'] is False
        assert result['status'] == 'low_space'
        assert result['details']['usage_percent'] == 95.0


@pytest.mark.asyncio
async def test_disk_space_health_check_error(health_service):
    """Test disk space health check error handling"""
    with patch('services.health_check.shutil.disk_usage', side_effect=Exception("Disk error")):
        result = await health_service._check_disk_space()
        
        assert result['healthy'] is False
        assert result['status'] == 'error'
        assert 'Disk error' in result['error']
    
@pytest.mark.asyncio
async def test_memory_health_check_success(health_service):
    """Test successful memory health check"""
    # Mock psutil module and virtual_memory function
    mock_memory = MagicMock()
    mock_memory.total = 16 * 1024**3  # 16GB
    mock_memory.available = 8 * 1024**3  # 8GB available
    mock_memory.percent = 50.0  # 50% used
    
    # Mock the entire psutil module
    mock_psutil = MagicMock()
    mock_psutil.virtual_memory.return_value = mock_memory
    
    with patch.dict('sys.modules', {'psutil': mock_psutil}):
        result = await health_service._check_memory()
        
        assert result['healthy'] is True
        assert result['status'] == 'ok'
        assert result['details']['total_gb'] == 16.0
        assert result['details']['available_gb'] == 8.0
        assert result['details']['used_percent'] == 50.0


@pytest.mark.asyncio
async def test_memory_health_check_high_usage(health_service):
    """Test memory health check with high usage"""
    # Mock psutil.virtual_memory with high usage
    mock_memory = MagicMock()
    mock_memory.total = 16 * 1024**3  # 16GB
    mock_memory.available = 1 * 1024**3  # 1GB available
    mock_memory.percent = 95.0  # 95% used
    
    # Mock the entire psutil module
    mock_psutil = MagicMock()
    mock_psutil.virtual_memory.return_value = mock_memory
    
    with patch.dict('sys.modules', {'psutil': mock_psutil}):
        result = await health_service._check_memory()
        
        assert result['healthy'] is False
        assert result['status'] == 'high_usage'
        assert result['details']['used_percent'] == 95.0


@pytest.mark.asyncio
async def test_memory_health_check_psutil_not_available(health_service):
    """Test memory health check when psutil is not installed"""
    # Remove psutil from sys.modules to simulate it not being installed
    with patch.dict('sys.modules', {'psutil': None}, clear=False):
        result = await health_service._check_memory()
        
        assert result['healthy'] is True
        assert result['status'] == 'not_available'
        assert result['message'] == 'psutil not installed, memory check skipped'


@pytest.mark.asyncio
async def test_memory_health_check_error(health_service):
    """Test memory health check error handling"""
    # Mock psutil to raise an exception
    mock_psutil = MagicMock()
    mock_psutil.virtual_memory.side_effect = Exception("Memory error")
    
    with patch.dict('sys.modules', {'psutil': mock_psutil}):
        result = await health_service._check_memory()
        
        assert result['healthy'] is False
        assert result['status'] == 'error'
        assert 'Memory error' in result['error']
    
@pytest.mark.asyncio
async def test_check_all_success(health_service):
    """Test check_all method with all checks passing"""
    db_path = await setup_temp_db()
    try:
        # Mock all external dependencies
        mock_redis = AsyncMock()
        mock_redis.ping.return_value = True
        mock_redis.info.return_value = {'redis_version': '6.2.0', 'connected_clients': 1, 'used_memory_human': '1.5M'}
        
        mock_fda_service = AsyncMock()
        mock_fda_service.search_predicates.return_value = [{'k_number': 'K123456'}]
        
        mock_usage = (1000 * 1024**3, 500 * 1024**3, 500 * 1024**3)
        mock_memory = MagicMock()
        mock_memory.total = 16 * 1024**3
        mock_memory.available = 8 * 1024**3
        mock_memory.percent = 50.0
        
        # Mock the entire psutil module
        mock_psutil = MagicMock()
        mock_psutil.virtual_memory.return_value = mock_memory
        
        with patch('services.health_check.get_redis_client', return_value=mock_redis), \
             patch('services.health_check.OpenFDAService', return_value=mock_fda_service), \
             patch('services.health_check.shutil.disk_usage', return_value=mock_usage), \
             patch.dict('sys.modules', {'psutil': mock_psutil}):
            
            result = await health_service.check_all()
            
            assert result['healthy'] is True
            assert result['service'] == 'medical-device-regulatory-assistant'
            assert result['version'] == '0.1.0'
            assert 'execution_time_ms' in result
            assert 'timestamp' in result
            
            # Check that all checks are present
            assert 'database' in result['checks']
            assert 'redis' in result['checks']
            assert 'fda_api' in result['checks']
            assert 'disk_space' in result['checks']
            assert 'memory' in result['checks']
            
            # Check that all checks passed
            for check_name, check_result in result['checks'].items():
                assert check_result['healthy'] is True
                assert 'execution_time_ms' in check_result
                assert 'timestamp' in check_result
    finally:
        await cleanup_temp_db(db_path)
    
@pytest.mark.asyncio
async def test_check_all_with_failures(health_service):
    """Test check_all method with some checks failing"""
    # Close database to cause database check to fail
    await close_database()
    
    # Mock psutil to raise an exception
    mock_psutil = MagicMock()
    mock_psutil.virtual_memory.side_effect = Exception("Memory error")
    
    # Mock other dependencies to fail as well
    with patch('services.health_check.get_redis_client', return_value=None), \
         patch('services.health_check.OpenFDAService', side_effect=Exception("FDA API error")), \
         patch('services.health_check.shutil.disk_usage', side_effect=Exception("Disk error")), \
         patch.dict('sys.modules', {'psutil': mock_psutil}):
        
        result = await health_service.check_all()
        
        assert result['healthy'] is False
        
        # Check that all checks failed
        for check_name, check_result in result['checks'].items():
            assert check_result['healthy'] is False
            # Some checks might have 'error' field, others might have 'message' field
            assert 'error' in check_result or 'message' in check_result
            assert 'execution_time_ms' in check_result
            assert 'timestamp' in check_result
    
@pytest.mark.asyncio
async def test_check_all_specific_checks(health_service):
    """Test check_all method with specific checks only"""
    db_path = await setup_temp_db()
    try:
        result = await health_service.check_all(['database', 'disk_space'])
        
        assert 'database' in result['checks']
        assert 'disk_space' in result['checks']
        assert 'redis' not in result['checks']
        assert 'fda_api' not in result['checks']
        assert 'memory' not in result['checks']
    finally:
        await cleanup_temp_db(db_path)


@pytest.mark.asyncio
async def test_check_all_invalid_check_name(health_service):
    """Test check_all method with invalid check name"""
    # Invalid check names should be silently ignored
    result = await health_service.check_all(['database', 'invalid_check'])
    
    assert 'database' in result['checks']
    assert 'invalid_check' not in result['checks']


@pytest.mark.asyncio
async def test_individual_check_execution_time_tracking(health_service):
    """Test that individual checks track execution time properly"""
    db_path = await setup_temp_db()
    try:
        result = await health_service._check_database()
        
        # Should not have execution_time_ms in individual check result
        # (it's added by check_all method)
        assert 'execution_time_ms' not in result
        
        # But should have the basic health check result
        assert 'healthy' in result
        assert 'status' in result
    finally:
        await cleanup_temp_db(db_path)