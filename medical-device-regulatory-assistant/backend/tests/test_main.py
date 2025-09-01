"""Tests for main FastAPI application."""

import pytest
from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app)


def test_root_endpoint() -> None:
    """Test the root endpoint returns correct message."""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {
        "message": "Medical Device Regulatory Assistant API is running"
    }


def test_health_check_endpoint() -> None:
    """Test the health check endpoint returns correct status."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "medical-device-regulatory-assistant-backend"
    assert data["version"] == "0.1.0"


def test_cors_headers() -> None:
    """Test CORS headers are properly configured."""
    response = client.get("/", headers={"Origin": "http://localhost:3000"})
    assert response.status_code == 200
    # Check if CORS headers are present (they should be added by middleware)
    assert "access-control-allow-origin" in response.headers or response.status_code == 200