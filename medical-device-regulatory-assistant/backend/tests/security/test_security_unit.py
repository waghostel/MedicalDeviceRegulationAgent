"""
Unit security tests that don't require a running server.
Tests security functions, validation, and sanitization.
"""

import pytest
import jwt
import time
from unittest.mock import patch, MagicMock
import hashlib
import secrets

# Import security-related modules
from backend.middleware.auth import validate_jwt_token, hash_password, verify_password
from backend.services.validation import sanitize_input, validate_project_data
from backend.models.audit import AuditLogEntry


class TestAuthenticationSecurity:
    """Test authentication security functions."""

    def test_jwt_token_validation_success(self):
        """Test valid JWT token validation."""
        # Create a valid token
        payload = {
            "sub": "user123",
            "exp": int(time.time()) + 3600,  # Expires in 1 hour
            "iat": int(time.time()),
        }
        secret = "test-secret-key"
        token = jwt.encode(payload, secret, algorithm="HS256")

        # Mock the secret key
        with patch('backend.middleware.auth.JWT_SECRET', secret):
            result = validate_jwt_token(token)
            assert result is not None
            assert result["sub"] == "user123"

    def test_jwt_token_validation_expired(self):
        """Test expired JWT token validation."""
        # Create an expired token
        payload = {
            "sub": "user123",
            "exp": int(time.time()) - 3600,  # Expired 1 hour ago
            "iat": int(time.time()) - 7200,
        }
        secret = "test-secret-key"
        token = jwt.encode(payload, secret, algorithm="HS256")

        with patch('backend.middleware.auth.JWT_SECRET', secret):
            result = validate_jwt_token(token)
            assert result is None

    def test_jwt_token_validation_invalid_signature(self):
        """Test JWT token with invalid signature."""
        # Create a token with one secret
        payload = {
            "sub": "user123",
            "exp": int(time.time()) + 3600,
            "iat": int(time.time()),
        }
        token = jwt.encode(payload, "wrong-secret", algorithm="HS256")

        # Validate with different secret
        with patch('backend.middleware.auth.JWT_SECRET', "correct-secret"):
            result = validate_jwt_token(token)
            assert result is None

    def test_password_hashing(self):
        """Test password hashing and verification."""
        password = "test-password-123"
        
        # Hash the password
        hashed = hash_password(password)
        
        # Verify the password
        assert verify_password(password, hashed) is True
        assert verify_password("wrong-password", hashed) is False

    def test_password_hash_uniqueness(self):
        """Test that password hashes are unique (salt is working)."""
        password = "test-password"
        
        hash1 = hash_password(password)
        hash2 = hash_password(password)
        
        # Hashes should be different due to salt
        assert hash1 != hash2
        
        # But both should verify correctly
        assert verify_password(password, hash1) is True
        assert verify_password(password, hash2) is True


class TestInputValidation:
    """Test input validation and sanitization."""

    def test_sanitize_input_xss_prevention(self):
        """Test XSS prevention in input sanitization."""
        malicious_inputs = [
            "<script>alert('xss')</script>",
            "javascript:alert('xss')",
            "<img src=x onerror=alert('xss')>",
            "';DROP TABLE users;--",
            "<iframe src='javascript:alert(1)'></iframe>",
        ]

        for malicious_input in malicious_inputs:
            sanitized = sanitize_input(malicious_input)
            
            # Should not contain dangerous elements
            assert "<script>" not in sanitized.lower()
            assert "javascript:" not in sanitized.lower()
            assert "<iframe" not in sanitized.lower()
            assert "onerror=" not in sanitized.lower()
            assert "drop table" not in sanitized.lower()

    def test_sanitize_input_sql_injection_prevention(self):
        """Test SQL injection prevention."""
        sql_injections = [
            "'; DROP TABLE projects; --",
            "1' OR '1'='1",
            "admin'--",
            "1; DELETE FROM users; --",
            "' UNION SELECT * FROM passwords --",
        ]

        for injection in sql_injections:
            sanitized = sanitize_input(injection)
            
            # Should escape or remove dangerous SQL
            assert "drop table" not in sanitized.lower()
            assert "delete from" not in sanitized.lower()
            assert "union select" not in sanitized.lower()
            assert "'--" not in sanitized

    def test_validate_project_data_success(self):
        """Test valid project data validation."""
        valid_data = {
            "name": "Test Device",
            "description": "A valid medical device description",
            "deviceType": "Class II Medical Device",
            "intendedUse": "For testing purposes"
        }

        result = validate_project_data(valid_data)
        assert result["valid"] is True
        assert len(result["errors"]) == 0

    def test_validate_project_data_missing_fields(self):
        """Test project data validation with missing fields."""
        invalid_data = {
            "name": "Test Device",
            # Missing required fields
        }

        result = validate_project_data(invalid_data)
        assert result["valid"] is False
        assert len(result["errors"]) > 0

    def test_validate_project_data_length_limits(self):
        """Test project data validation with length limits."""
        invalid_data = {
            "name": "A" * 1000,  # Too long
            "description": "B" * 5000,  # Too long
            "deviceType": "Class II",
            "intendedUse": "Testing"
        }

        result = validate_project_data(invalid_data)
        assert result["valid"] is False
        assert any("too long" in error.lower() for error in result["errors"])

    def test_validate_project_data_malicious_content(self):
        """Test project data validation with malicious content."""
        malicious_data = {
            "name": "<script>alert('xss')</script>",
            "description": "'; DROP TABLE projects; --",
            "deviceType": "javascript:alert('xss')",
            "intendedUse": "<img src=x onerror=alert('xss')>"
        }

        result = validate_project_data(malicious_data)
        
        # Should either reject or sanitize
        if result["valid"]:
            # If accepted, should be sanitized
            assert "<script>" not in result["sanitized"]["name"]
            assert "drop table" not in result["sanitized"]["description"].lower()
        else:
            # If rejected, should have security-related errors
            assert len(result["errors"]) > 0


class TestAuditSecurity:
    """Test audit trail security."""

    def test_audit_log_entry_creation(self):
        """Test audit log entry creation with required fields."""
        entry = AuditLogEntry(
            user_id="user123",
            action="CREATE_PROJECT",
            resource_type="project",
            resource_id="proj123",
            details={"name": "Test Project"},
            ip_address="192.168.1.1",
            user_agent="Test Agent"
        )

        assert entry.user_id == "user123"
        assert entry.action == "CREATE_PROJECT"
        assert entry.timestamp is not None
        assert entry.details["name"] == "Test Project"

    def test_audit_log_entry_immutability(self):
        """Test that audit log entries cannot be modified after creation."""
        entry = AuditLogEntry(
            user_id="user123",
            action="CREATE_PROJECT",
            resource_type="project",
            resource_id="proj123",
            details={"name": "Test Project"}
        )

        original_timestamp = entry.timestamp
        original_action = entry.action

        # Attempt to modify (should not be allowed in production)
        with pytest.raises(AttributeError):
            entry.timestamp = "modified"

        # Verify values haven't changed
        assert entry.timestamp == original_timestamp
        assert entry.action == original_action

    def test_audit_log_sensitive_data_filtering(self):
        """Test that sensitive data is filtered from audit logs."""
        sensitive_details = {
            "name": "Test Project",
            "password": "secret123",
            "api_key": "sk-1234567890",
            "token": "bearer-token-123",
            "credit_card": "4111-1111-1111-1111"
        }

        entry = AuditLogEntry(
            user_id="user123",
            action="CREATE_PROJECT",
            resource_type="project",
            resource_id="proj123",
            details=sensitive_details
        )

        # Sensitive fields should be filtered or masked
        details_str = str(entry.details)
        assert "secret123" not in details_str
        assert "sk-1234567890" not in details_str
        assert "bearer-token-123" not in details_str
        assert "4111-1111-1111-1111" not in details_str


class TestCryptographicSecurity:
    """Test cryptographic functions and security."""

    def test_secure_random_generation(self):
        """Test secure random number generation."""
        # Generate multiple random values
        randoms = [secrets.token_hex(32) for _ in range(10)]
        
        # All should be different
        assert len(set(randoms)) == len(randoms)
        
        # All should be proper length
        for random_val in randoms:
            assert len(random_val) == 64  # 32 bytes = 64 hex chars

    def test_hash_consistency(self):
        """Test that hash functions are consistent."""
        data = "test-data-for-hashing"
        
        hash1 = hashlib.sha256(data.encode()).hexdigest()
        hash2 = hashlib.sha256(data.encode()).hexdigest()
        
        assert hash1 == hash2

    def test_hash_uniqueness(self):
        """Test that different inputs produce different hashes."""
        data1 = "test-data-1"
        data2 = "test-data-2"
        
        hash1 = hashlib.sha256(data1.encode()).hexdigest()
        hash2 = hashlib.sha256(data2.encode()).hexdigest()
        
        assert hash1 != hash2


class TestRateLimiting:
    """Test rate limiting functionality."""

    def test_rate_limit_tracking(self):
        """Test rate limit tracking for users."""
        from backend.middleware.rate_limit import RateLimiter
        
        limiter = RateLimiter(max_requests=5, window_seconds=60)
        user_id = "test-user"
        
        # Should allow requests within limit
        for i in range(5):
            assert limiter.is_allowed(user_id) is True
        
        # Should block after limit exceeded
        assert limiter.is_allowed(user_id) is False

    def test_rate_limit_window_reset(self):
        """Test that rate limit window resets properly."""
        from backend.middleware.rate_limit import RateLimiter
        
        limiter = RateLimiter(max_requests=2, window_seconds=1)
        user_id = "test-user"
        
        # Use up the limit
        assert limiter.is_allowed(user_id) is True
        assert limiter.is_allowed(user_id) is True
        assert limiter.is_allowed(user_id) is False
        
        # Wait for window to reset
        time.sleep(1.1)
        
        # Should be allowed again
        assert limiter.is_allowed(user_id) is True


if __name__ == "__main__":
    pytest.main([__file__, "-v"])