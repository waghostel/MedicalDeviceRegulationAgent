#!/usr/bin/env python3
"""
Test script to verify Task 15 fixes:
1. Pydantic model validation errors resolved
2. psutil dependency available
3. sentence_transformers dependency handled (disabled for Python 3.13)
"""

import sys
import logging
from unittest.mock import Mock

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_psutil_dependency():
    """Test that psutil is available"""
    try:
        import psutil
        logger.info(f"✅ psutil is available (version: {psutil.__version__})")
        return True
    except ImportError as e:
        logger.error(f"❌ psutil import failed: {e}")
        return False

def test_sentence_transformers_handling():
    """Test that sentence_transformers is properly handled"""
    try:
        from tools.document_processing_tool import get_sentence_transformer
        result = get_sentence_transformer()
        if result is None:
            logger.info("✅ sentence_transformers properly disabled with fallback")
            return True
        else:
            logger.info("✅ sentence_transformers is available")
            return True
    except Exception as e:
        logger.error(f"❌ sentence_transformers handling failed: {e}")
        return False

def test_device_classification_tool_pydantic():
    """Test that DeviceClassificationTool accepts Mock objects"""
    try:
        from tools.device_classification_tool import DeviceClassificationTool
        
        # Create mock service
        mock_service = Mock()
        mock_service.lookup_device_classification = Mock()
        
        # This should not raise Pydantic validation errors
        tool = DeviceClassificationTool(openfda_service=mock_service)
        logger.info("✅ DeviceClassificationTool accepts Mock objects (Pydantic validation fixed)")
        return True
    except Exception as e:
        logger.error(f"❌ DeviceClassificationTool Pydantic validation failed: {e}")
        return False

def test_fda_predicate_search_tool_pydantic():
    """Test that FDAPredicateSearchTool accepts Mock objects"""
    try:
        from tools.fda_predicate_search_tool import FDAPredicateSearchTool
        
        # Create mock service
        mock_service = Mock()
        mock_service.search_predicates = Mock()
        
        # This should not raise Pydantic validation errors
        tool = FDAPredicateSearchTool(openfda_service=mock_service)
        logger.info("✅ FDAPredicateSearchTool accepts Mock objects (Pydantic validation fixed)")
        return True
    except Exception as e:
        logger.error(f"❌ FDAPredicateSearchTool Pydantic validation failed: {e}")
        return False

def test_document_processing_tool():
    """Test that DocumentProcessingTool works without sentence_transformers"""
    try:
        from tools.document_processing_tool import DocumentProcessingTool
        
        # This should work even without sentence_transformers
        tool = DocumentProcessingTool()
        logger.info("✅ DocumentProcessingTool works without sentence_transformers")
        return True
    except Exception as e:
        logger.error(f"❌ DocumentProcessingTool failed: {e}")
        return False

def main():
    """Run all tests"""
    logger.info("Testing Task 15 fixes...")
    
    tests = [
        test_psutil_dependency,
        test_sentence_transformers_handling,
        test_device_classification_tool_pydantic,
        test_fda_predicate_search_tool_pydantic,
        test_document_processing_tool
    ]
    
    results = []
    for test in tests:
        try:
            result = test()
            results.append(result)
        except Exception as e:
            logger.error(f"❌ Test {test.__name__} failed with exception: {e}")
            results.append(False)
    
    passed = sum(results)
    total = len(results)
    
    logger.info(f"\n📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        logger.info("🎉 All Task 15 fixes verified successfully!")
        return 0
    else:
        logger.error("❌ Some tests failed. Please check the issues above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())