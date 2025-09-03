"""
API Response Compression Middleware

This middleware provides gzip compression for API responses
to improve performance and reduce bandwidth usage.
"""

import gzip
import json
import logging
import time
from typing import Dict, Any, Optional
from io import BytesIO

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

logger = logging.getLogger(__name__)


class CompressionMiddleware(BaseHTTPMiddleware):
    """
    Middleware for compressing API responses
    """
    
    def __init__(
        self,
        app: ASGIApp,
        minimum_size: int = 1024,  # Only compress responses larger than 1KB
        compression_level: int = 6,  # Compression level (1-9)
        exclude_paths: Optional[list] = None
    ):
        super().__init__(app)
        self.minimum_size = minimum_size
        self.compression_level = compression_level
        self.exclude_paths = exclude_paths or ["/health", "/docs", "/openapi.json"]
        
        # Track compression statistics
        self.stats = {
            "total_requests": 0,
            "compressed_requests": 0,
            "total_bytes_before": 0,
            "total_bytes_after": 0,
            "total_compression_time": 0.0
        }
    
    async def dispatch(self, request: Request, call_next) -> Response:
        """Process request and compress response if appropriate"""
        start_time = time.time()
        
        # Get the response
        response = await call_next(request)
        
        # Update request count
        self.stats["total_requests"] += 1
        
        # Check if we should compress this response
        if not self._should_compress(request, response):
            return response
        
        # Read response body
        response_body = b""
        async for chunk in response.body_iterator:
            response_body += chunk
        
        original_size = len(response_body)
        self.stats["total_bytes_before"] += original_size
        
        # Only compress if response is large enough
        if original_size < self.minimum_size:
            return Response(
                content=response_body,
                status_code=response.status_code,
                headers=dict(response.headers),
                media_type=response.media_type
            )
        
        # Compress the response
        compression_start = time.time()
        compressed_body = await self._compress_data(response_body)
        compression_time = time.time() - compression_start
        
        compressed_size = len(compressed_body)
        compression_ratio = compressed_size / original_size if original_size > 0 else 1.0
        
        # Update statistics
        self.stats["compressed_requests"] += 1
        self.stats["total_bytes_after"] += compressed_size
        self.stats["total_compression_time"] += compression_time
        
        # Log compression results
        logger.debug(
            f"Compressed response: {original_size} -> {compressed_size} bytes "
            f"({compression_ratio:.2%}) in {compression_time:.4f}s"
        )
        
        # Create compressed response
        headers = dict(response.headers)
        headers["content-encoding"] = "gzip"
        headers["content-length"] = str(compressed_size)
        headers["x-compression-ratio"] = f"{compression_ratio:.3f}"
        headers["x-compression-time"] = f"{compression_time:.4f}"
        
        total_time = time.time() - start_time
        headers["x-process-time"] = f"{total_time:.4f}"
        
        return Response(
            content=compressed_body,
            status_code=response.status_code,
            headers=headers,
            media_type=response.media_type
        )
    
    def _should_compress(self, request: Request, response: Response) -> bool:
        """Determine if response should be compressed"""
        # Check if client accepts gzip
        accept_encoding = request.headers.get("accept-encoding", "")
        if "gzip" not in accept_encoding.lower():
            return False
        
        # Check if path is excluded
        if request.url.path in self.exclude_paths:
            return False
        
        # Check if response is already compressed
        if response.headers.get("content-encoding"):
            return False
        
        # Check content type
        content_type = response.headers.get("content-type", "")
        compressible_types = [
            "application/json",
            "text/plain",
            "text/html",
            "text/css",
            "text/javascript",
            "application/javascript",
            "application/xml",
            "text/xml"
        ]
        
        if not any(ct in content_type for ct in compressible_types):
            return False
        
        # Check response status
        if response.status_code < 200 or response.status_code >= 300:
            return False
        
        return True
    
    async def _compress_data(self, data: bytes) -> bytes:
        """Compress data using gzip"""
        try:
            buffer = BytesIO()
            with gzip.GzipFile(fileobj=buffer, mode='wb', compresslevel=self.compression_level) as gz_file:
                gz_file.write(data)
            
            return buffer.getvalue()
            
        except Exception as e:
            logger.error(f"Compression failed: {e}")
            return data  # Return original data if compression fails
    
    async def compress_response(self, data: Any) -> bytes:
        """Utility method to compress arbitrary data"""
        if isinstance(data, dict) or isinstance(data, list):
            json_data = json.dumps(data, default=str).encode('utf-8')
        elif isinstance(data, str):
            json_data = data.encode('utf-8')
        elif isinstance(data, bytes):
            json_data = data
        else:
            json_data = str(data).encode('utf-8')
        
        return await self._compress_data(json_data)
    
    def get_compression_stats(self) -> Dict[str, Any]:
        """Get compression statistics"""
        total_requests = self.stats["total_requests"]
        compressed_requests = self.stats["compressed_requests"]
        
        if total_requests == 0:
            return {
                "total_requests": 0,
                "compressed_requests": 0,
                "compression_rate": 0.0,
                "average_compression_ratio": 0.0,
                "average_compression_time_ms": 0.0,
                "bytes_saved": 0,
                "bandwidth_savings": 0.0
            }
        
        bytes_before = self.stats["total_bytes_before"]
        bytes_after = self.stats["total_bytes_after"]
        bytes_saved = bytes_before - bytes_after
        
        return {
            "total_requests": total_requests,
            "compressed_requests": compressed_requests,
            "compression_rate": compressed_requests / total_requests,
            "average_compression_ratio": bytes_after / bytes_before if bytes_before > 0 else 0.0,
            "average_compression_time_ms": (self.stats["total_compression_time"] / compressed_requests * 1000) if compressed_requests > 0 else 0.0,
            "bytes_saved": bytes_saved,
            "bandwidth_savings": bytes_saved / bytes_before if bytes_before > 0 else 0.0,
            "total_bytes_before": bytes_before,
            "total_bytes_after": bytes_after
        }


class ResponseCompressionService:
    """
    Service for handling response compression outside of middleware
    """
    
    def __init__(self, compression_level: int = 6):
        self.compression_level = compression_level
    
    async def compress_json_response(
        self,
        data: Dict[str, Any],
        compression_level: Optional[int] = None
    ) -> tuple[bytes, Dict[str, str]]:
        """Compress JSON response data"""
        level = compression_level or self.compression_level
        
        # Serialize to JSON
        json_data = json.dumps(data, default=str).encode('utf-8')
        original_size = len(json_data)
        
        # Compress
        start_time = time.time()
        compressed_data = await self._compress_with_level(json_data, level)
        compression_time = time.time() - start_time
        
        compressed_size = len(compressed_data)
        compression_ratio = compressed_size / original_size if original_size > 0 else 1.0
        
        headers = {
            "content-encoding": "gzip",
            "content-type": "application/json",
            "content-length": str(compressed_size),
            "x-compression-ratio": f"{compression_ratio:.3f}",
            "x-compression-time": f"{compression_time:.4f}",
            "x-original-size": str(original_size)
        }
        
        return compressed_data, headers
    
    async def _compress_with_level(self, data: bytes, level: int) -> bytes:
        """Compress data with specific compression level"""
        buffer = BytesIO()
        with gzip.GzipFile(fileobj=buffer, mode='wb', compresslevel=level) as gz_file:
            gz_file.write(data)
        
        return buffer.getvalue()
    
    async def benchmark_compression_levels(self, data: Dict[str, Any]) -> Dict[int, Dict[str, Any]]:
        """Benchmark different compression levels"""
        json_data = json.dumps(data, default=str).encode('utf-8')
        original_size = len(json_data)
        
        results = {}
        
        for level in range(1, 10):  # Test compression levels 1-9
            start_time = time.time()
            compressed_data = await self._compress_with_level(json_data, level)
            compression_time = time.time() - start_time
            
            compressed_size = len(compressed_data)
            compression_ratio = compressed_size / original_size
            
            results[level] = {
                "compressed_size": compressed_size,
                "compression_ratio": compression_ratio,
                "compression_time_ms": compression_time * 1000,
                "bytes_saved": original_size - compressed_size,
                "efficiency_score": (1 - compression_ratio) / compression_time  # Savings per second
            }
        
        return {
            "original_size": original_size,
            "levels": results,
            "recommended_level": max(results.keys(), key=lambda k: results[k]["efficiency_score"])
        }


# Utility functions for manual compression
async def compress_large_response(data: Any, min_size: int = 1024) -> tuple[bytes, bool]:
    """Compress response data if it's large enough"""
    if isinstance(data, dict) or isinstance(data, list):
        json_data = json.dumps(data, default=str).encode('utf-8')
    elif isinstance(data, str):
        json_data = data.encode('utf-8')
    elif isinstance(data, bytes):
        json_data = data
    else:
        json_data = str(data).encode('utf-8')
    
    if len(json_data) < min_size:
        return json_data, False
    
    # Compress the data
    buffer = BytesIO()
    with gzip.GzipFile(fileobj=buffer, mode='wb', compresslevel=6) as gz_file:
        gz_file.write(json_data)
    
    compressed_data = buffer.getvalue()
    return compressed_data, True


def create_compressed_json_response(
    data: Any,
    status_code: int = 200,
    headers: Optional[Dict[str, str]] = None
) -> Response:
    """Create a compressed JSON response"""
    import asyncio
    
    # Compress the data
    compressed_data, was_compressed = asyncio.run(compress_large_response(data))
    
    response_headers = headers or {}
    
    if was_compressed:
        response_headers.update({
            "content-encoding": "gzip",
            "content-type": "application/json",
            "content-length": str(len(compressed_data))
        })
        
        return Response(
            content=compressed_data,
            status_code=status_code,
            headers=response_headers
        )
    else:
        return JSONResponse(
            content=data,
            status_code=status_code,
            headers=response_headers
        )


# Performance testing utilities
class CompressionBenchmark:
    """Benchmark compression performance"""
    
    @staticmethod
    async def test_compression_performance(
        test_data: Dict[str, Any],
        iterations: int = 100
    ) -> Dict[str, Any]:
        """Test compression performance with multiple iterations"""
        service = ResponseCompressionService()
        
        # Prepare test data
        json_data = json.dumps(test_data, default=str).encode('utf-8')
        original_size = len(json_data)
        
        # Run compression tests
        total_time = 0.0
        total_compressed_size = 0
        
        for _ in range(iterations):
            start_time = time.time()
            compressed_data, _ = await service.compress_json_response(test_data)
            compression_time = time.time() - start_time
            
            total_time += compression_time
            total_compressed_size += len(compressed_data)
        
        avg_time = total_time / iterations
        avg_compressed_size = total_compressed_size / iterations
        avg_compression_ratio = avg_compressed_size / original_size
        
        return {
            "original_size_bytes": original_size,
            "average_compressed_size_bytes": avg_compressed_size,
            "average_compression_ratio": avg_compression_ratio,
            "average_compression_time_ms": avg_time * 1000,
            "compression_throughput_mb_per_sec": (original_size / (1024 * 1024)) / avg_time,
            "bandwidth_savings_percent": (1 - avg_compression_ratio) * 100,
            "iterations": iterations
        }