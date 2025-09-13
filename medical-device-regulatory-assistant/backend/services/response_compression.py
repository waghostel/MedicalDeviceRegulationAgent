"""
Response Compression Service

Provides intelligent response compression for large FDA API responses
and other data to optimize network transfer and storage.
"""

import gzip
import zlib
import json
import logging
import time
from typing import Any, Dict, Optional, Tuple, Union
from dataclasses import dataclass
from enum import Enum
import base64

# Optional brotli import
try:
    import brotli
    BROTLI_AVAILABLE = True
except ImportError:
    BROTLI_AVAILABLE = False
    brotli = None

logger = logging.getLogger(__name__)


class CompressionAlgorithm(str, Enum):
    """Supported compression algorithms"""
    GZIP = "gzip"
    ZLIB = "zlib"
    BROTLI = "brotli"
    NONE = "none"


@dataclass
class CompressionResult:
    """Result of compression operation"""
    compressed_data: str
    original_size: int
    compressed_size: int
    compression_ratio: float
    algorithm: CompressionAlgorithm
    encoding: str = "base64"


@dataclass
class CompressionConfig:
    """Compression configuration"""
    min_size_bytes: int = 1024  # Don't compress data smaller than 1KB
    preferred_algorithm: CompressionAlgorithm = CompressionAlgorithm.GZIP
    compression_level: int = 6  # Balance between speed and compression
    enable_adaptive: bool = True  # Automatically choose best algorithm
    max_size_mb: int = 50  # Don't compress data larger than 50MB


class ResponseCompressionService:
    """
    Service for compressing and decompressing API responses and cached data
    """
    
    def __init__(self, config: Optional[CompressionConfig] = None):
        self.config = config or CompressionConfig()
        self.compression_stats = {
            "total_compressions": 0,
            "total_decompressions": 0,
            "bytes_saved": 0,
            "avg_compression_ratio": 0.0,
            "algorithm_usage": {alg.value: 0 for alg in CompressionAlgorithm}
        }
    
    async def compress_data(
        self,
        data: Any,
        algorithm: Optional[CompressionAlgorithm] = None,
        force_compression: bool = False
    ) -> CompressionResult:
        """
        Compress data using specified or optimal algorithm
        
        Args:
            data: Data to compress (will be JSON serialized)
            algorithm: Specific algorithm to use (None for adaptive)
            force_compression: Force compression even for small data
            
        Returns:
            CompressionResult with compressed data and metadata
        """
        try:
            # Serialize data to JSON
            if isinstance(data, (str, bytes)):
                json_data = data if isinstance(data, str) else data.decode('utf-8')
            else:
                json_data = json.dumps(data, default=str, separators=(',', ':'))
            
            original_size = len(json_data.encode('utf-8'))
            
            # Check size limits
            if not force_compression and original_size < self.config.min_size_bytes:
                return CompressionResult(
                    compressed_data=json_data,
                    original_size=original_size,
                    compressed_size=original_size,
                    compression_ratio=1.0,
                    algorithm=CompressionAlgorithm.NONE,
                    encoding="none"
                )
            
            if original_size > self.config.max_size_mb * 1024 * 1024:
                logger.warning(f"Data size ({original_size} bytes) exceeds maximum compression limit")
                return CompressionResult(
                    compressed_data=json_data,
                    original_size=original_size,
                    compressed_size=original_size,
                    compression_ratio=1.0,
                    algorithm=CompressionAlgorithm.NONE,
                    encoding="none"
                )
            
            # Choose compression algorithm
            if algorithm is None and self.config.enable_adaptive:
                algorithm = await self._choose_optimal_algorithm(json_data)
            elif algorithm is None:
                algorithm = self.config.preferred_algorithm
            
            # Compress data
            compressed_bytes = await self._compress_with_algorithm(json_data, algorithm)
            compressed_size = len(compressed_bytes)
            compression_ratio = compressed_size / original_size
            
            # Encode compressed data
            compressed_data = base64.b64encode(compressed_bytes).decode('utf-8')
            
            # Update statistics
            self._update_compression_stats(original_size, compressed_size, algorithm)
            
            result = CompressionResult(
                compressed_data=compressed_data,
                original_size=original_size,
                compressed_size=compressed_size,
                compression_ratio=compression_ratio,
                algorithm=algorithm,
                encoding="base64"
            )
            
            logger.debug(
                f"Compressed {original_size} bytes to {compressed_size} bytes "
                f"({compression_ratio:.2%}) using {algorithm.value}"
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Compression failed: {e}")
            # Return uncompressed data as fallback
            return CompressionResult(
                compressed_data=json_data if 'json_data' in locals() else str(data),
                original_size=len(str(data).encode('utf-8')),
                compressed_size=len(str(data).encode('utf-8')),
                compression_ratio=1.0,
                algorithm=CompressionAlgorithm.NONE,
                encoding="none"
            )
    
    async def decompress_data(
        self,
        compressed_data: str,
        algorithm: CompressionAlgorithm,
        encoding: str = "base64"
    ) -> Any:
        """
        Decompress data using specified algorithm
        
        Args:
            compressed_data: Compressed data string
            algorithm: Algorithm used for compression
            encoding: Encoding used (base64, none)
            
        Returns:
            Decompressed and deserialized data
        """
        try:
            if algorithm == CompressionAlgorithm.NONE:
                # No compression was used
                try:
                    return json.loads(compressed_data)
                except json.JSONDecodeError:
                    return compressed_data
            
            # Decode compressed data
            if encoding == "base64":
                compressed_bytes = base64.b64decode(compressed_data.encode('utf-8'))
            else:
                compressed_bytes = compressed_data.encode('utf-8')
            
            # Decompress data
            decompressed_data = await self._decompress_with_algorithm(compressed_bytes, algorithm)
            
            # Update statistics
            self.compression_stats["total_decompressions"] += 1
            
            # Try to parse as JSON
            try:
                return json.loads(decompressed_data)
            except json.JSONDecodeError:
                return decompressed_data
            
        except Exception as e:
            logger.error(f"Decompression failed: {e}")
            # Try to return original data as fallback
            try:
                return json.loads(compressed_data)
            except json.JSONDecodeError:
                return compressed_data
    
    async def _choose_optimal_algorithm(self, data: str) -> CompressionAlgorithm:
        """
        Choose optimal compression algorithm based on data characteristics
        """
        data_size = len(data.encode('utf-8'))
        
        # For small data, use fast compression
        if data_size < 10 * 1024:  # < 10KB
            return CompressionAlgorithm.ZLIB
        
        # For medium data, use balanced compression
        elif data_size < 100 * 1024:  # < 100KB
            return CompressionAlgorithm.GZIP
        
        # For large data, use best compression if available
        else:
            return CompressionAlgorithm.BROTLI if BROTLI_AVAILABLE else CompressionAlgorithm.GZIP
    
    async def _compress_with_algorithm(
        self,
        data: str,
        algorithm: CompressionAlgorithm
    ) -> bytes:
        """Compress data with specific algorithm"""
        data_bytes = data.encode('utf-8')
        
        if algorithm == CompressionAlgorithm.GZIP:
            return gzip.compress(data_bytes, compresslevel=self.config.compression_level)
        
        elif algorithm == CompressionAlgorithm.ZLIB:
            return zlib.compress(data_bytes, level=self.config.compression_level)
        
        elif algorithm == CompressionAlgorithm.BROTLI:
            if not BROTLI_AVAILABLE:
                raise ValueError("Brotli compression not available - install brotli package")
            # Brotli compression level is 0-11
            brotli_level = min(11, max(0, self.config.compression_level + 3))
            return brotli.compress(data_bytes, quality=brotli_level)
        
        else:
            raise ValueError(f"Unsupported compression algorithm: {algorithm}")
    
    async def _decompress_with_algorithm(
        self,
        compressed_data: bytes,
        algorithm: CompressionAlgorithm
    ) -> str:
        """Decompress data with specific algorithm"""
        if algorithm == CompressionAlgorithm.GZIP:
            decompressed_bytes = gzip.decompress(compressed_data)
        
        elif algorithm == CompressionAlgorithm.ZLIB:
            decompressed_bytes = zlib.decompress(compressed_data)
        
        elif algorithm == CompressionAlgorithm.BROTLI:
            if not BROTLI_AVAILABLE:
                raise ValueError("Brotli decompression not available - install brotli package")
            decompressed_bytes = brotli.decompress(compressed_data)
        
        else:
            raise ValueError(f"Unsupported compression algorithm: {algorithm}")
        
        return decompressed_bytes.decode('utf-8')
    
    def _update_compression_stats(
        self,
        original_size: int,
        compressed_size: int,
        algorithm: CompressionAlgorithm
    ) -> None:
        """Update compression statistics"""
        self.compression_stats["total_compressions"] += 1
        self.compression_stats["bytes_saved"] += (original_size - compressed_size)
        self.compression_stats["algorithm_usage"][algorithm.value] += 1
        
        # Update average compression ratio
        total_compressions = self.compression_stats["total_compressions"]
        current_ratio = compressed_size / original_size
        
        if total_compressions == 1:
            self.compression_stats["avg_compression_ratio"] = current_ratio
        else:
            # Exponential moving average
            alpha = 0.1
            self.compression_stats["avg_compression_ratio"] = (
                alpha * current_ratio + 
                (1 - alpha) * self.compression_stats["avg_compression_ratio"]
            )
    
    async def compress_fda_search_results(
        self,
        results: list,
        algorithm: Optional[CompressionAlgorithm] = None
    ) -> CompressionResult:
        """
        Compress FDA search results with optimized settings
        """
        # Convert results to serializable format
        serializable_results = []
        for result in results:
            if hasattr(result, 'to_dict'):
                serializable_results.append(result.to_dict())
            elif isinstance(result, dict):
                serializable_results.append(result)
            else:
                serializable_results.append(str(result))
        
        # Use adaptive compression for search results
        return await self.compress_data(
            serializable_results,
            algorithm=algorithm or CompressionAlgorithm.GZIP
        )
    
    async def compress_device_classification(
        self,
        classification: dict,
        algorithm: Optional[CompressionAlgorithm] = None
    ) -> CompressionResult:
        """
        Compress device classification data
        """
        return await self.compress_data(
            classification,
            algorithm=algorithm or CompressionAlgorithm.ZLIB  # Fast compression for smaller data
        )
    
    async def benchmark_algorithms(self, test_data: Any) -> Dict[str, Dict[str, float]]:
        """
        Benchmark different compression algorithms on test data
        """
        import time
        
        results = {}
        
        algorithms = [CompressionAlgorithm.GZIP, CompressionAlgorithm.ZLIB]
        if BROTLI_AVAILABLE:
            algorithms.append(CompressionAlgorithm.BROTLI)
        
        for algorithm in algorithms:
            try:
                # Compression benchmark
                start_time = time.time()
                compression_result = await self.compress_data(test_data, algorithm=algorithm, force_compression=True)
                compression_time = time.time() - start_time
                
                # Decompression benchmark
                start_time = time.time()
                await self.decompress_data(
                    compression_result.compressed_data,
                    algorithm,
                    compression_result.encoding
                )
                decompression_time = time.time() - start_time
                
                results[algorithm.value] = {
                    "compression_ratio": compression_result.compression_ratio,
                    "compression_time_ms": compression_time * 1000,
                    "decompression_time_ms": decompression_time * 1000,
                    "total_time_ms": (compression_time + decompression_time) * 1000,
                    "original_size": compression_result.original_size,
                    "compressed_size": compression_result.compressed_size
                }
                
            except Exception as e:
                results[algorithm.value] = {
                    "error": str(e)
                }
        
        return results
    
    def get_compression_stats(self) -> Dict[str, Any]:
        """Get compression statistics"""
        total_bytes_processed = (
            self.compression_stats["bytes_saved"] / (1 - self.compression_stats["avg_compression_ratio"])
            if self.compression_stats["avg_compression_ratio"] < 1 and self.compression_stats["avg_compression_ratio"] > 0 else 0
        )
        
        return {
            "total_compressions": self.compression_stats["total_compressions"],
            "total_decompressions": self.compression_stats["total_decompressions"],
            "bytes_saved": self.compression_stats["bytes_saved"],
            "avg_compression_ratio": self.compression_stats["avg_compression_ratio"],
            "space_savings_percent": (1 - self.compression_stats["avg_compression_ratio"]) * 100,
            "algorithm_usage": self.compression_stats["algorithm_usage"],
            "config": {
                "min_size_bytes": self.config.min_size_bytes,
                "preferred_algorithm": self.config.preferred_algorithm.value,
                "compression_level": self.config.compression_level,
                "enable_adaptive": self.config.enable_adaptive,
                "max_size_mb": self.config.max_size_mb
            }
        }
    
    def reset_stats(self) -> None:
        """Reset compression statistics"""
        self.compression_stats = {
            "total_compressions": 0,
            "total_decompressions": 0,
            "bytes_saved": 0,
            "avg_compression_ratio": 0.0,
            "algorithm_usage": {alg.value: 0 for alg in CompressionAlgorithm}
        }
        logger.info("Compression statistics reset")
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform health check on compression service"""
        try:
            # Test compression/decompression cycle
            test_data = {"test": "data", "numbers": list(range(100))}
            
            start_time = time.time()
            compressed = await self.compress_data(test_data, force_compression=True)
            decompressed = await self.decompress_data(
                compressed.compressed_data,
                compressed.algorithm,
                compressed.encoding
            )
            end_time = time.time()
            
            # Verify data integrity
            data_integrity = test_data == decompressed
            
            return {
                "status": "healthy" if data_integrity else "unhealthy",
                "response_time_ms": (end_time - start_time) * 1000,
                "data_integrity": data_integrity,
                "test_compression_ratio": compressed.compression_ratio,
                "algorithms_available": [
                    alg.value for alg in CompressionAlgorithm 
                    if alg != CompressionAlgorithm.NONE and (alg != CompressionAlgorithm.BROTLI or BROTLI_AVAILABLE)
                ],
                "stats": self.get_compression_stats(),
                "timestamp": time.time()
            }
            
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "timestamp": time.time()
            }


# Global compression service instance
_compression_service: Optional[ResponseCompressionService] = None


def get_compression_service(config: Optional[CompressionConfig] = None) -> ResponseCompressionService:
    """Get or create compression service instance"""
    global _compression_service
    if _compression_service is None:
        _compression_service = ResponseCompressionService(config)
    return _compression_service


# Utility functions for common compression tasks
async def compress_json_response(data: Any, min_size: int = 1024) -> Tuple[str, Dict[str, str]]:
    """
    Compress JSON response and return compressed data with headers
    
    Returns:
        Tuple of (compressed_data, headers_dict)
    """
    service = get_compression_service()
    
    if isinstance(data, str):
        data_size = len(data.encode('utf-8'))
    else:
        data_size = len(json.dumps(data, default=str).encode('utf-8'))
    
    if data_size < min_size:
        # Don't compress small responses
        return json.dumps(data, default=str), {"Content-Type": "application/json"}
    
    result = await service.compress_data(data)
    
    headers = {
        "Content-Type": "application/json",
        "Content-Encoding": result.algorithm.value if result.algorithm != CompressionAlgorithm.NONE else "identity",
        "X-Original-Size": str(result.original_size),
        "X-Compressed-Size": str(result.compressed_size),
        "X-Compression-Ratio": f"{result.compression_ratio:.3f}"
    }
    
    return result.compressed_data, headers


async def decompress_json_response(
    compressed_data: str,
    content_encoding: str = "gzip"
) -> Any:
    """
    Decompress JSON response
    """
    service = get_compression_service()
    
    if content_encoding == "identity" or content_encoding == "none":
        try:
            return json.loads(compressed_data)
        except json.JSONDecodeError:
            return compressed_data
    
    algorithm = CompressionAlgorithm(content_encoding)
    return await service.decompress_data(compressed_data, algorithm)