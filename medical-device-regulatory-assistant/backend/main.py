"""FastAPI main application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Medical Device Regulatory Assistant API",
    description="Backend services for FDA regulatory pathway discovery",
    version="0.1.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root() -> dict[str, str]:
    """Health check endpoint."""
    return {"message": "Medical Device Regulatory Assistant API is running"}


@app.get("/health")
async def health_check() -> dict[str, str]:
    """Detailed health check endpoint."""
    return {
        "status": "healthy",
        "service": "medical-device-regulatory-assistant-backend",
        "version": "0.1.0"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)