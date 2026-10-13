import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health_check_endpoint():
    """Verify that the health check endpoint returns 200 and expected schema."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "ProcessPulse Intelligence Engine"
    assert "llm_configured" in data
    assert "mode" in data
