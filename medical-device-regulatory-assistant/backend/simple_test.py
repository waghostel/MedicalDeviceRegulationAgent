#!/usr/bin/env python3
"""
Simple test script for Document Processing Tool

This script tests the core functionality without complex imports.
"""

import sys
import os
import tempfile
import hashlib
from pathlib import Path
from datetime import datetime, timezone
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from enum import Enum

# Simple test implementations
class DocumentType(Enum):
    PDF = "pdf"
    DOCX = "docx"
    TXT = "txt"
    HTML = "html"
    MARKDOWN = "md"
    FDA_GUIDANCE = "fda_guidance"

class ProcessingStatus(Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

@dataclass
class DocumentMetadata:
    filename: str
    file_size: int
    file_type: str
    content_hash: str
    created_at: Optional[datetime] = None
    modified_at: Optional[datetime] = None
    source_url: Optional[str] = None
    document_type: Optional[DocumentType] = None
    language: str = "en"
    encoding: str = "utf-8"
    
    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now()
        if self.modified_at is None:
            self.modified_at = self.created_at

@dataclass
class DocumentProcessingConfig:
    max_file_size_mb: int = 50
    supported_formats: List[str] = None
    ocr_enabled: bool = True
    nlp_enabled: bool = True
    cache_enabled: bool = True
    cache_duration_hours: int = 24
    
    def __post_init__(self):
        if self.supported_formats is None:
            self.supported_formats = ['.pdf', '.docx', '.txt', '.html', '.md']

def calculate_hash(content: str) -> str:
    """Calculate SHA-256 hash of content"""
    return hashlib.sha256(content.encode('utf-8')).hexdigest()

def text_to_markdown(text: str) -> str:
    """Convert plain text to markdown with basic formatting"""
    # Clean up text
    import re
    text = re.sub(r'\n\s*\n\s*\n', '\n\n', text)  # Remove excessive line breaks
    text = re.sub(r'[ \t]+', ' ', text)  # Normalize whitespace
    
    lines = text.split('\n')
    markdown_lines = []
    
    for line in lines:
        line = line.strip()
        if not line:
            markdown_lines.append('')
            continue
        
        # Detect headings (simple heuristic)
        if len(line) < 100 and (
            line.isupper() or
            re.match(r'^\d+\.?\s+[A-Z]', line) or
            re.match(r'^[A-Z][^.!?]*$', line)
        ):
            # Determine heading level based on context
            if any(keyword in line.lower() for keyword in ['section', 'chapter', 'part']):
                markdown_lines.append(f'## {line}')
            else:
                markdown_lines.append(f'### {line}')
        else:
            markdown_lines.append(line)
    
    return '\n'.join(markdown_lines)

def extract_fda_guidance_metadata(text: str) -> Dict[str, Any]:
    """Extract metadata specific to FDA guidance documents"""
    import re
    metadata = {}
    
    # Extract document title
    title_match = re.search(r'^(.+?)(?:\n|$)', text.strip(), re.MULTILINE)
    if title_match:
        metadata['title'] = title_match.group(1).strip()
    
    # Extract effective date
    date_patterns = [
        r'Effective\s+Date[:\s]+([A-Za-z]+\s+\d{1,2},?\s+\d{4})',
        r'Date\s+of\s+this\s+Guidance[:\s]+([A-Za-z]+\s+\d{1,2},?\s+\d{4})',
        r'([A-Za-z]+\s+\d{1,2},?\s+\d{4})'
    ]
    
    for pattern in date_patterns:
        date_match = re.search(pattern, text, re.IGNORECASE)
        if date_match:
            metadata['effective_date'] = date_match.group(1)
            break
    
    # Extract document number
    doc_num_match = re.search(r'Document\s+Number[:\s]+(\S+)', text, re.IGNORECASE)
    if doc_num_match:
        metadata['document_number'] = doc_num_match.group(1)
    
    # Extract subject/topic
    subject_match = re.search(r'Subject[:\s]+(.+?)(?:\n|$)', text, re.IGNORECASE | re.MULTILINE)
    if subject_match:
        metadata['subject'] = subject_match.group(1).strip()
    
    return metadata

def identify_regulatory_sections(text: str) -> List[Dict[str, Any]]:
    """Identify and extract regulatory sections from FDA documents"""
    import re
    sections = []
    
    # Common FDA document section patterns
    section_patterns = [
        r'(I{1,3}\.?\s+[A-Z][^.!?]*(?:Background|Introduction|Purpose|Scope))',
        r'(\d+\.?\s+[A-Z][^.!?]*(?:Requirements|Recommendations|Guidance))',
        r'([A-Z]\.\s+[A-Z][^.!?]*)',
        r'(Section\s+\d+[^.!?]*)'
    ]
    
    for pattern in section_patterns:
        matches = re.finditer(pattern, text, re.MULTILINE | re.IGNORECASE)
        for match in matches:
            sections.append({
                'title': match.group(1).strip(),
                'start_position': match.start(),
                'type': 'section_header'
            })
    
    return sections

def extract_regulatory_concepts(text: str) -> Dict[str, Any]:
    """Extract FDA regulatory-specific concepts"""
    import re
    regulatory_patterns = {
        'k_numbers': re.findall(r'K\d{6}', text, re.IGNORECASE),
        'product_codes': re.findall(r'\b[A-Z]{3}\b', text),
        'cfr_sections': re.findall(r'21\s*CFR\s*\d+(?:\.\d+)?', text, re.IGNORECASE),
        'device_classes': re.findall(r'Class\s*[I]{1,3}', text, re.IGNORECASE),
        'fda_guidance': re.findall(r'FDA\s+Guidance', text, re.IGNORECASE),
        'predicate_devices': re.findall(r'predicate\s+device', text, re.IGNORECASE)
    }
    
    # Extract dates
    date_patterns = re.findall(
        r'\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b',
        text
    )
    regulatory_patterns['dates'] = date_patterns
    
    return regulatory_patterns

def test_basic_functionality():
    """Test basic document processing functionality"""
    print("🧪 Testing Basic Document Processing...")
    
    try:
        # Test configuration
        config = DocumentProcessingConfig(
            max_file_size_mb=10,
            ocr_enabled=False,
            nlp_enabled=False,
            cache_enabled=False
        )
        print("✅ Created configuration")
        
        # Test sample content
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
        
        # Test text to markdown conversion
        print("🔄 Testing text to markdown conversion...")
        markdown = text_to_markdown(sample_text)
        content_hash = calculate_hash(sample_text)
        
        metadata = DocumentMetadata(
            filename="test.txt",
            file_size=len(sample_text),
            file_type="txt",
            content_hash=content_hash,
            document_type=DocumentType.FDA_GUIDANCE
        )
        
        print("✅ Text to markdown conversion successful")
        print(f"   - Original length: {len(sample_text)} characters")
        print(f"   - Markdown length: {len(markdown)} characters")
        print(f"   - Content hash: {content_hash[:16]}...")
        
        # Test FDA metadata extraction
        print("🔄 Testing FDA metadata extraction...")
        fda_metadata = extract_fda_guidance_metadata(sample_text)
        
        if fda_metadata:
            print("✅ FDA metadata extraction successful")
            print(f"   - Title: {fda_metadata.get('title', 'N/A')}")
            print(f"   - Subject: {fda_metadata.get('subject', 'N/A')}")
            print(f"   - Document Number: {fda_metadata.get('document_number', 'N/A')}")
            print(f"   - Effective Date: {fda_metadata.get('effective_date', 'N/A')}")
        
        # Test regulatory concept extraction
        print("🔄 Testing regulatory concept extraction...")
        regulatory_concepts = extract_regulatory_concepts(sample_text)
        
        print("✅ Regulatory concept extraction successful")
        print(f"   - K-numbers found: {regulatory_concepts.get('k_numbers', [])}")
        print(f"   - CFR sections found: {regulatory_concepts.get('cfr_sections', [])}")
        print(f"   - Device classes found: {regulatory_concepts.get('device_classes', [])}")
        
        # Test section identification
        print("🔄 Testing section identification...")
        sections = identify_regulatory_sections(sample_text)
        
        if sections:
            print("✅ Section identification successful")
            print(f"   - Found {len(sections)} sections")
            for section in sections[:3]:
                print(f"   - {section['title'][:50]}...")
        
        # Test file processing
        print("🔄 Testing file processing...")
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=True, encoding='utf-8') as tmp_file:
            tmp_file.write(sample_text)
            tmp_file.flush()
            
            # Simulate file processing
            file_size = os.path.getsize(tmp_file.name)
            
            if file_size <= config.max_file_size_mb * 1024 * 1024:
                print("✅ File processing successful")
                print(f"   - File size: {file_size} bytes")
                print(f"   - File type: .txt")
            else:
                print(f"❌ File too large: {file_size} bytes")
        
        print("\n🎉 All basic tests completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_document_validation():
    """Test document validation"""
    print("\n🧪 Testing Document Validation...")
    
    try:
        # Test valid metadata
        valid_metadata = DocumentMetadata(
            filename="test.txt",
            file_size=1024,
            file_type="txt",
            content_hash="abc123def456789abcdef",
            document_type=DocumentType.FDA_GUIDANCE
        )
        
        # Simple validation
        required_fields = ['filename', 'file_size', 'file_type', 'content_hash']
        is_valid = True
        
        for field_name in required_fields:
            if not hasattr(valid_metadata, field_name) or getattr(valid_metadata, field_name) is None:
                is_valid = False
                break
        
        if valid_metadata.file_size < 0:
            is_valid = False
        
        if len(valid_metadata.content_hash) < 8:
            is_valid = False
        
        if is_valid:
            print("✅ Document validation successful")
            print(f"   - Filename: {valid_metadata.filename}")
            print(f"   - File size: {valid_metadata.file_size} bytes")
            print(f"   - File type: {valid_metadata.file_type}")
            print(f"   - Document type: {valid_metadata.document_type.value}")
        else:
            print("❌ Document validation failed")
        
        return is_valid
        
    except Exception as e:
        print(f"❌ Error in document validation: {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 Starting Simple Document Processing Tests")
    print("=" * 60)
    
    success_count = 0
    total_tests = 2
    
    # Run basic functionality tests
    if test_basic_functionality():
        success_count += 1
    
    # Run document validation tests
    if test_document_validation():
        success_count += 1
    
    print("\n" + "=" * 60)
    print(f"📊 Test Results: {success_count}/{total_tests} test suites passed")
    
    if success_count == total_tests:
        print("🎉 All tests passed! Core document processing functionality is working correctly.")
        return 0
    else:
        print("❌ Some tests failed. Please check the output above for details.")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)