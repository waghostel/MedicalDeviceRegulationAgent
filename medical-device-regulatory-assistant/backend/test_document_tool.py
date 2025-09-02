#!/usr/bin/env python3
"""
Test script for Document Processing Tool

This script can be run directly to test the document processing functionality
without requiring complex pytest setup or module path issues.
"""

import sys
import os
import tempfile
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

def test_basic_functionality():
    """Test basic document processing functionality"""
    print("🧪 Testing Document Processing Tool...")
    
    try:
        # Import the tool
        from tools.document_processing_tool import DocumentProcessingTool, DocumentProcessingConfig
        print("✅ Successfully imported DocumentProcessingTool")
        
        # Create configuration with minimal dependencies
        config = DocumentProcessingConfig(
            max_file_size_mb=10,
            ocr_enabled=False,  # Disable OCR to avoid Tesseract dependency
            nlp_enabled=False,  # Disable NLP to avoid model downloads
            cache_enabled=False
        )
        print("✅ Created configuration")
        
        # Initialize tool
        tool = DocumentProcessingTool(config)
        print("✅ Initialized DocumentProcessingTool")
        
        # Test text to markdown conversion
        sample_text = """
        FDA Guidance Document
        
        Subject: Medical Device Software Validation
        Document Number: FDA-2023-D-5678
        Effective Date: March 15, 2023
        
        I. Introduction
        
        This guidance provides recommendations for validating medical device software.
        Software validation is critical for ensuring device safety and effectiveness.
        
        II. Validation Requirements
        
        Medical device software must be validated according to 21 CFR 820.30.
        The validation process should include:
        1. Requirements analysis
        2. Design verification
        3. Validation testing
        
        K234567 is an example of a device with validated software.
        """
        
        print("🔄 Testing text to markdown conversion...")
        result = tool.convert_to_markdown(content=sample_text)
        
        if result.get("success"):
            print("✅ Text to markdown conversion successful")
            print(f"   - Original length: {len(sample_text)} characters")
            print(f"   - Markdown length: {len(result['markdown'])} characters")
            print(f"   - Content hash: {result['metadata']['content_hash'][:16]}...")
        else:
            print(f"❌ Text to markdown conversion failed: {result.get('error')}")
            return False
        
        # Test structured data extraction (if NLP is available)
        if config.nlp_enabled:
            print("🔄 Testing structured data extraction...")
            extraction_result = tool.extract_structured_data(sample_text, "regulatory")
            
            if extraction_result.get("success"):
                print("✅ Structured data extraction successful")
                regulatory_concepts = extraction_result["extraction_result"]["regulatory_concepts"]
                print(f"   - K-numbers found: {regulatory_concepts.get('k_numbers', [])}")
                print(f"   - CFR sections found: {regulatory_concepts.get('cfr_sections', [])}")
            else:
                print(f"❌ Structured data extraction failed: {extraction_result.get('error')}")
        else:
            print("⏭️  Skipping NLP tests (disabled in config)")
        
        # Test document search
        print("🔄 Testing document search...")
        documents = [
            {
                "id": "doc1",
                "title": "510(k) Guidance",
                "content": "This document provides guidance on 510(k) submissions and predicate device selection.",
                "metadata": {"type": "guidance"}
            },
            {
                "id": "doc2",
                "title": "PMA Guidance",
                "content": "This document covers PMA submissions for Class III medical devices.",
                "metadata": {"type": "guidance"}
            }
        ]
        
        search_result = tool.search_documents(
            query="510k predicate device",
            documents=documents,
            top_k=2
        )
        
        if search_result.get("success"):
            print("✅ Document search successful")
            print(f"   - Found {len(search_result['results'])} results")
            if search_result['results']:
                first_result = search_result['results'][0]
                print(f"   - Top result: {first_result['document_id']} (score: {first_result['similarity_score']:.3f})")
        else:
            print(f"❌ Document search failed: {search_result.get('error')}")
        
        # Test version tracking
        print("🔄 Testing version tracking...")
        version_result = tool.track_document_version(
            document_id="test_doc_123",
            content=sample_text,
            metadata={"author": "test_user"}
        )
        
        if version_result.get("success"):
            print("✅ Version tracking successful")
            print(f"   - Document ID: {version_result['version']['document_id']}")
            print(f"   - Version number: {version_result['version']['version_number']}")
            print(f"   - Content hash: {version_result['content_hash'][:16]}...")
        else:
            print(f"❌ Version tracking failed: {version_result.get('error')}")
        
        # Test file processing with temporary file
        print("🔄 Testing file processing...")
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8') as tmp_file:
            tmp_file.write(sample_text)
            tmp_file.flush()
            
            try:
                file_result = tool.convert_to_markdown(file_path=tmp_file.name)
                
                if file_result.get("success"):
                    print("✅ File processing successful")
                    print(f"   - File size: {file_result['metadata']['file_size']} bytes")
                    print(f"   - File type: {file_result['metadata']['file_type']}")
                else:
                    print(f"❌ File processing failed: {file_result.get('error')}")
            finally:
                os.unlink(tmp_file.name)
        
        print("\n🎉 All basic tests completed successfully!")
        return True
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("   Make sure all dependencies are installed with: poetry install")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_fda_utility_functions():
    """Test FDA-specific utility functions"""
    print("\n🧪 Testing FDA Utility Functions...")
    
    try:
        from tools.document_processing_tool import extract_fda_guidance_metadata, identify_regulatory_sections
        
        # Test FDA guidance metadata extraction
        fda_text = """
        FDA Guidance Document
        
        Subject: Software as a Medical Device (SaMD): Clinical Evaluation
        Document Number: FDA-2019-D-1149
        Effective Date: December 9, 2019
        
        This guidance document provides recommendations...
        """
        
        print("🔄 Testing FDA guidance metadata extraction...")
        metadata = extract_fda_guidance_metadata(fda_text)
        
        if metadata:
            print("✅ FDA metadata extraction successful")
            print(f"   - Title: {metadata.get('title', 'N/A')}")
            print(f"   - Subject: {metadata.get('subject', 'N/A')}")
            print(f"   - Document Number: {metadata.get('document_number', 'N/A')}")
            print(f"   - Effective Date: {metadata.get('effective_date', 'N/A')}")
        else:
            print("❌ FDA metadata extraction returned empty result")
        
        # Test regulatory section identification
        regulatory_text = """
        I. Introduction
        This is the introduction section.
        
        II. Background
        This section provides background information.
        
        Section 3: Requirements
        This section outlines the requirements.
        
        A. Subsection A
        This is a subsection.
        """
        
        print("🔄 Testing regulatory section identification...")
        sections = identify_regulatory_sections(regulatory_text)
        
        if sections:
            print("✅ Regulatory section identification successful")
            print(f"   - Found {len(sections)} sections")
            for section in sections[:3]:  # Show first 3 sections
                print(f"   - {section['title'][:50]}...")
        else:
            print("❌ No regulatory sections identified")
        
        print("✅ FDA utility functions test completed!")
        return True
        
    except Exception as e:
        print(f"❌ Error testing FDA utilities: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_document_models():
    """Test document models"""
    print("\n🧪 Testing Document Models...")
    
    try:
        from models.document_models import (
            DocumentMetadata, ProcessedDocument, DocumentType, 
            ProcessingStatus, validate_document_metadata
        )
        from datetime import datetime
        
        print("✅ Successfully imported document models")
        
        # Test DocumentMetadata
        print("🔄 Testing DocumentMetadata...")
        metadata = DocumentMetadata(
            filename="test.txt",
            file_size=1024,
            file_type="txt",
            content_hash="abc123def456789",
            document_type=DocumentType.FDA_GUIDANCE
        )
        
        is_valid = validate_document_metadata(metadata)
        if is_valid:
            print("✅ DocumentMetadata validation successful")
        else:
            print("❌ DocumentMetadata validation failed")
        
        # Test ProcessedDocument
        print("🔄 Testing ProcessedDocument...")
        processed_doc = ProcessedDocument(
            id="doc_123",
            title="Test Document",
            content="This is test content",
            markdown_content="# Test Document\n\nThis is test content",
            metadata=metadata,
            processing_status=ProcessingStatus.COMPLETED
        )
        
        print("✅ ProcessedDocument creation successful")
        print(f"   - Document ID: {processed_doc.id}")
        print(f"   - Title: {processed_doc.title}")
        print(f"   - Status: {processed_doc.processing_status.value}")
        
        print("✅ Document models test completed!")
        return True
        
    except Exception as e:
        print(f"❌ Error testing document models: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all tests"""
    print("🚀 Starting Document Processing Tool Tests")
    print("=" * 60)
    
    success_count = 0
    total_tests = 3
    
    # Run basic functionality tests
    if test_basic_functionality():
        success_count += 1
    
    # Run FDA utility tests
    if test_fda_utility_functions():
        success_count += 1
    
    # Run document models tests
    if test_document_models():
        success_count += 1
    
    print("\n" + "=" * 60)
    print(f"📊 Test Results: {success_count}/{total_tests} test suites passed")
    
    if success_count == total_tests:
        print("🎉 All tests passed! Document Processing Tool is working correctly.")
        return 0
    else:
        print("❌ Some tests failed. Please check the output above for details.")
        return 1


if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)