# Medical Device Regulatory Assistant - Backend

This is the backend service for the Medical Device Regulatory Assistant MVP, built with FastAPI and Poetry.

## Setup

### Prerequisites
- Python 3.11+
- Poetry

### Installation

1. Install dependencies:
```bash
poetry install
```

2. Set up environment variables:
```bash
cp .env.example .env.local
# Edit .env.local with your configuration
```

### Running the Application

#### Development
```bash
poetry run uvicorn main:app --reload
```

#### Production
```bash
poetry run uvicorn main:app --host 0.0.0.0 --port 8000
```

### Testing

Run all tests:
```bash
poetry run python -m pytest
```

Run tests with coverage:
```bash
poetry run python -m pytest --cov=backend tests/
```

Run specific test file:
```bash
poetry run python -m pytest tests/test_main.py -v
```

### Code Quality

Format code:
```bash
poetry run black .
poetry run isort .
```

Lint code:
```bash
poetry run flake8
poetry run mypy .
```

## Project Structure

```
backend/
├── agents/          # LangGraph agent implementations
├── models/          # Data models and schemas
├── services/        # Business logic services
├── tools/           # Agent tools (FDA API, document processing)
├── tests/           # Test files
├── main.py          # FastAPI application entry point
└── pyproject.toml   # Poetry configuration
```