"""
Unit tests for Document Processing Tool

Tests cover:
- PDF/DOCX to markdown conversion
- OCR functionality
- NLP-based text extraction
- Document search and relevance scoring
- Document summarization
- Version tracking and change detection
"""

import pytest
import tempfile
import os
from pathlib import Path
from datetime import datetime, timezone
from unittest.mock import Mock, patch, MagicMock
import json

# Test imports
from backend.tools.document_processing_tool import (
    DocumentProcessingTool,
    DocumentProcessingConfig,
    extract_fda_guidance_metadata,
    identify_regulatory_sections
)
from backend.models.document_models import (
    DocumentMetadata,
    ExtractionResult,
    SummaryResult,
    SearchResult
)


class TestDocumentProcessingTool:
    """Test suite for DocumentProcessingTool"""
    
    @pytest.fixture
    def config(self):
        """Test configuration"""
        return DocumentProcessingConfig(
            max_file_size_mb=10,
            supported_formats=['.pdf', '.docx', '.txt', '.html', '.md'],
            ocr_enabled=False,  # Disable OCR for testing
            nlp_enabled=True,
            cache_enabled=False  # Disable caching for testing
        )
    
    @pytest.fixture
    def tool(self, config):
        """Document processing tool instance"""
        return DocumentProcessingTool(config)
    
    @pytest.fixture
    def sample_text(self):
        """Sample FDA regulatory text"""
        return """
        FDA Guidance Document
        
        Subject: 510(k) Predicate Device Selection
        Document Number: FDA-2023-D-1234
        Effective Date: January 15, 2023
        
        I. Introduction
        
        This guidance document provides recommendations for selecting appropriate 
        predicate devices for 510(k) submissions. The selection of a predicate 
        device is critical for demonstrating substantial equivalence.
        
        II. Predicate Device Requirements
        
        A predicate device must be:
        1. Legally marketed in the United States
        2. Have the same intended use as the subject device
        3. Have similar technological characteristics
        
        The device classification is Class II with product code ABC.
        CFR Section 21 CFR 878.4040 applies to this device type.
        
        K123456 is an example of an appropriate predicate device.
        """
    
    @pytest.fixture
    def sample_pdf_content(self):
        """Sample PDF content for testing"""
        return "This is a sample PDF document content for testing purposes."
    
    @pytest.fixture
    def sample_docx_content(self):
        """Sample DOCX content for testing"""
        return "This is a sample DOCX document content for testing purposes."
    
    def test_tool_initialization(self, config):
        """Test tool initialization with config"""
        tool = DocumentProcessingTool(config)
        assert tool.config == config
        assert tool.name == "document_processing_tool"
        assert "Process regulatory documents" in tool.description
    
    def test_tool_initialization_default_config(self):
        """Test tool initialization with default config"""
        tool = DocumentProcessingTool()
        assert tool.config is not None
        assert tool.config.max_file_size_mb == 50
        assert '.pdf' in tool.config.supported_formats
    
    def test_convert_text_to_markdown(self, tool, sample_text):
        """Test text to markdown conversion"""
        result = tool.convert_to_markdown(content=sample_text)
        
        assert result["success"] is True
        assert "markdown" in result
        assert "metadata" in result
        assert "original_text" in result
        
        markdown = result["markdown"]
        assert "## FDA Guidance Document" in markdown or "### FDA Guidance Document" in markdown
        assert "## I. Introduction" in markdown or "### I. Introduction" in markdown
        
        metadata = result["metadata"]
        assert metadata["filename"] == "text_content"
        assert metadata["file_type"] == "text"
        assert len(metadata["content_hash"]) == 64  # SHA-256 hash
    
    def test_convert_url_to_markdown(self, tool):
        """Test URL to markdown conversion"""
        with patch('requests.get') as mock_get:
            # Mock successful HTTP response
            mock_response = Mock()
            mock_response.content = b"<html><body><h1>Test Document</h1><p>Test content</p></body></html>"
            mock_response.raise_for_status.return_value = None
            mock_get.return_value = mock_response
            
            result = tool.convert_to_markdown(url="https://example.com/test.html")
            
            assert result["success"] is True
            assert "markdown" in result
            assert "Test Document" in result["markdown"]
            assert "Test content" in result["markdown"]
    
    def test_convert_file_not_found(self, tool):
        """Test conversion with non-existent file"""
        result = tool.convert_to_markdown(file_path="/nonexistent/file.pdf")
        
        assert result["success"] is False
        assert "error" in result
        assert "File not found" in result["error"]
    
    def test_convert_unsupported_format(self, tool):
        """Test conversion with unsupported file format"""
        with tempfile.NamedTemporaryFile(suffix='.xyz', delete=False) as tmp_file:
            tmp_file.write(b"test content")
            tmp_file.flush()
            
            try:
                result = tool.convert_to_markdown(file_path=tmp_file.name)
                assert result["success"] is False
                assert "Unsupported format" in result["error"]
            finally:
                os.unlink(tmp_file.name)
    
    def test_convert_file_too_large(self, tool):
        """Test conversion with file exceeding size limit"""
        # Create a large temporary file
        large_content = "x" * (tool.config.max_file_size_mb * 1024 * 1024 + 1)
        
        with tempfile.NamedTemporaryFile(suffix='.txt', delete=False) as tmp_file:
            tmp_file.write(large_content.encode())
            tmp_file.flush()
            
            try:
                result = tool.convert_to_markdown(file_path=tmp_file.name)
                assert result["success"] is False
                assert "File too large" in result["error"]
            finally:
                os.unlink(tmp_file.name)
    
    def test_convert_txt_file(self, tool, sample_text):
        """Test TXT file conversion"""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8') as tmp_file:
            tmp_file.write(sample_text)
            tmp_file.flush()
            
            try:
                result = tool.convert_to_markdown(file_path=tmp_file.name)
                
                assert result["success"] is True
                assert result["original_text"] == sample_text
                assert "FDA Guidance Document" in result["markdown"]
            finally:
                os.unlink(tmp_file.name)
    
    @patch('pypdf.PdfReader')
    def test_extract_pdf_text(self, mock_pdf_reader, tool, sample_pdf_content):
        """Test PDF text extraction"""
        # Mock PDF reader
        mock_page = Mock()
        mock_page.extract_text.return_value = sample_pdf_content
        
        mock_reader_instance = Mock()
        mock_reader_instance.pages = [mock_page]
        mock_pdf_reader.return_value = mock_reader_instance
        
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp_file:
            tmp_file.write(b"fake pdf content")
            tmp_file.flush()
            
            try:
                result = tool._extract_pdf_text(tmp_file.name)
                assert result.strip() == sample_pdf_content
            finally:
                os.unlink(tmp_file.name)
    
    @patch('docx.Document')
    def test_extract_docx_text(self, mock_docx, tool, sample_docx_content):
        """Test DOCX text extraction"""
        # Mock DOCX document
        mock_paragraph = Mock()
        mock_paragraph.text = sample_docx_content
        
        mock_doc_instance = Mock()
        mock_doc_instance.paragraphs = [mock_paragraph]
        mock_doc_instance.tables = []
        mock_docx.return_value = mock_doc_instance
        
        with tempfile.NamedTemporaryFile(suffix='.docx', delete=False) as tmp_file:
            tmp_file.write(b"fake docx content")
            tmp_file.flush()
            
            try:
                result = tool._extract_docx_text(tmp_file.name)
                assert result.strip() == sample_docx_content
            finally:
                os.unlink(tmp_file.name)
    
    def test_extract_structured_data(self, tool, sample_text):
        """Test structured data extraction"""
        result = tool.extract_structured_data(sample_text, extraction_type="regulatory")
        
        assert result["success"] is True
        assert "extraction_result" in result
        
        extraction = result["extraction_result"]
        assert "entities" in extraction
        assert "key_phrases" in extraction
        assert "regulatory_concepts" in extraction
        assert "confidence_score" in extraction
        
        # Check regulatory concepts
        regulatory_concepts = extraction["regulatory_concepts"]
        assert "k_numbers" in regulatory_concepts
        assert "K123456" in regulatory_concepts["k_numbers"]
        assert "product_codes" in regulatory_concepts
        assert "ABC" in regulatory_concepts["product_codes"]
        assert "cfr_sections" in regulatory_concepts
        assert any("21 CFR 878.4040" in section for section in regulatory_concepts["cfr_sections"])
    
    def test_extract_structured_data_nlp_disabled(self, tool, sample_text):
        """Test structured data extraction with NLP disabled"""
        tool.config.nlp_enabled = False
        
        result = tool.extract_structured_data(sample_text)
        
        assert result["success"] is False
        assert "NLP processing disabled" in result["error"]
    
    def test_search_documents(self, tool):
        """Test document search functionality"""
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
            },
            {
                "id": "doc3",
                "title": "Software Guidance",
                "content": "Guidelines for software as a medical device (SaMD) submissions.",
                "metadata": {"type": "guidance"}
            }
        ]
        
        # Test search for 510(k) related content
        result = tool.search_documents(
            query="510k predicate device",
            documents=documents,
            top_k=2
        )
        
        assert result["success"] is True
        assert "results" in result
        assert len(result["results"]) <= 2
        
        # First result should be most relevant
        if result["results"]:
            first_result = result["results"][0]
            assert first_result["document_id"] == "doc1"
            assert first_result["similarity_score"] > 0
    
    def test_search_documents_empty_list(self, tool):
        """Test document search with empty document list"""
        result = tool.search_documents(
            query="test query",
            documents=[],
            top_k=5
        )
        
        assert result["success"] is True
        assert result["results"] == []
        assert result["total_documents"] == 0
    
    def test_summarize_document(self, tool, sample_text):
        """Test document summarization"""
        with patch('backend.tools.document_processing_tool.get_summarizer') as mock_get_summarizer:
            # Mock summarizer
            mock_summarizer = Mock()
            mock_summarizer.return_value = [{"summary_text": "This is a test summary of the FDA guidance document."}]
            mock_get_summarizer.return_value = mock_summarizer
            
            result = tool.summarize_document(
                text=sample_text,
                max_length=100,
                min_length=20
            )
            
            assert result["success"] is True
            assert "summary_result" in result
            
            summary = result["summary_result"]
            assert "summary" in summary
            assert "original_length" in summary
            assert "summary_length" in summary
            assert "compression_ratio" in summary
            assert summary["original_length"] == len(sample_text)
    
    def test_summarize_document_too_short(self, tool):
        """Test summarization with text too short"""
        short_text = "Short text."
        
        result = tool.summarize_document(
            text=short_text,
            max_length=100,
            min_length=50
        )
        
        assert result["success"] is False
        assert "Text too short to summarize" in result["error"]
    
    def test_track_document_version(self, tool, sample_text):
        """Test document version tracking"""
        result = tool.track_document_version(
            document_id="test_doc_123",
            content=sample_text,
            metadata={"author": "test_user"}
        )
        
        assert result["success"] is True
        assert "version" in result
        assert "changes_detected" in result
        assert "content_hash" in result
        
        version = result["version"]
        assert version["document_id"] == "test_doc_123"
        assert version["version_number"] == 1
        assert len(version["content_hash"]) == 64  # SHA-256 hash
        assert version["content_length"] == len(sample_text)
    
    def test_calculate_hash(self, tool):
        """Test content hash calculation"""
        content = "test content for hashing"
        hash1 = tool._calculate_hash(content)
        hash2 = tool._calculate_hash(content)
        
        # Same content should produce same hash
        assert hash1 == hash2
        assert len(hash1) == 64  # SHA-256 hash length
        
        # Different content should produce different hash
        hash3 = tool._calculate_hash("different content")
        assert hash1 != hash3
    
    def test_text_to_markdown_formatting(self, tool):
        """Test text to markdown formatting"""
        text = """
        MAIN TITLE
        
        Section 1: Introduction
        This is the introduction section with some content.
        
        1. First Point
        This is the first point in the list.
        
        2. Second Point
        This is the second point.
        """
        
        markdown = tool._text_to_markdown(text)
        
        # Check that headings are properly formatted
        assert "## MAIN TITLE" in markdown or "### MAIN TITLE" in markdown
        assert "## Section 1: Introduction" in markdown or "### Section 1: Introduction" in markdown
    
    def test_extract_main_content_from_html(self, tool):
        """Test HTML main content extraction"""
        from bs4 import BeautifulSoup
        
        html = """
        <html>
            <head><title>Test</title></head>
            <body>
                <nav>Navigation content</nav>
                <main>
                    <h1>Main Title</h1>
                    <p>Main content paragraph</p>
                </main>
                <footer>Footer content</footer>
            </body>
        </html>
        """
        
        soup = BeautifulSoup(html, 'html.parser')
        content = tool._extract_main_content(soup)
        
        assert "Main Title" in content
        assert "Main content paragraph" in content
        assert "Navigation content" not in content
        assert "Footer content" not in content


class TestFDAUtilityFunctions:
    """Test FDA-specific utility functions"""
    
    def test_extract_fda_guidance_metadata(self):
        """Test FDA guidance metadata extraction"""
        text = """
        FDA Guidance Document
        
        Subject: Software as a Medical Device (SaMD): Clinical Evaluation
        Document Number: FDA-2019-D-1149
        Effective Date: December 9, 2019
        
        This guidance document provides recommendations...
        """
        
        metadata = extract_fda_guidance_metadata(text)
        
        assert metadata["title"] == "FDA Guidance Document"
        assert metadata["subject"] == "Software as a Medical Device (SaMD): Clinical Evaluation"
        assert metadata["document_number"] == "FDA-2019-D-1149"
        assert "December 9, 2019" in metadata["effective_date"]
    
    def test_identify_regulatory_sections(self):
        """Test regulatory section identification"""
        text = """
        I. Introduction
        This is the introduction section.
        
        II. Background
        This section provides background information.
        
        Section 3: Requirements
        This section outlines the requirements.
        
        A. Subsection A
        This is a subsection.
        """
        
        sections = identify_regulatory_sections(text)
        
        assert len(sections) >= 3
        
        # Check that sections are identified
        section_titles = [section["title"] for section in sections]
        assert any("Introduction" in title for title in section_titles)
        assert any("Background" in title for title in section_titles)
        assert any("Requirements" in title for title in section_titles)


class TestDocumentProcessingConfig:
    """Test DocumentProcessingConfig"""
    
    def test_default_config(self):
        """Test default configuration values"""
        config = DocumentProcessingConfig()
        
        assert config.max_file_size_mb == 50
        assert '.pdf' in config.supported_formats
        assert '.docx' in config.supported_formats
        assert config.ocr_enabled is True
        assert config.nlp_enabled is True
        assert config.cache_enabled is True
        assert config.cache_duration_hours == 24
    
    def test_custom_config(self):
        """Test custom configuration values"""
        config = DocumentProcessingConfig(
            max_file_size_mb=100,
            supported_formats=['.pdf', '.txt'],
            ocr_enabled=False,
            nlp_enabled=False,
            cache_enabled=False,
            cache_duration_hours=12
        )
        
        assert config.max_file_size_mb == 100
        assert config.supported_formats == ['.pdf', '.txt']
        assert config.ocr_enabled is False
        assert config.nlp_enabled is False
        assert config.cache_enabled is False
        assert config.cache_duration_hours == 12


# Integration tests with sample FDA documents

class TestFDADocumentProcessing:
    """Integration tests with sample FDA documents"""
    
    @pytest.fixture
    def fda_510k_summary(self):
        """Sample 510(k) summary text"""
        return """
        510(k) SUMMARY
        
        K123456
        
        SUBMITTER: Example Medical Device Company
        
        DEVICE NAME: Example Cardiac Monitor
        
        INTENDED USE:
        The Example Cardiac Monitor is intended for continuous monitoring of 
        cardiac rhythm in hospital and clinical settings.
        
        PREDICATE DEVICE:
        The predicate device is the ABC Cardiac Monitor (K987654), which has 
        the same intended use and similar technological characteristics.
        
        SUBSTANTIAL EQUIVALENCE:
        The subject device is substantially equivalent to the predicate device 
        based on intended use and technological characteristics comparison.
        
        DEVICE DESCRIPTION:
        The device consists of a monitoring unit with ECG electrodes and 
        wireless connectivity for data transmission.
        
        PERFORMANCE DATA:
        Clinical testing demonstrated safety and effectiveness equivalent 
        to the predicate device.
        """
    
    @pytest.fixture
    def fda_guidance_document(self):
        """Sample FDA guidance document text"""
        return """
        Guidance for Industry and FDA Staff
        
        Software as a Medical Device (SaMD): Clinical Evaluation
        
        Document issued on: December 9, 2019
        
        This document supersedes the draft guidance of the same title dated September 27, 2016.
        
        For questions about this document, contact the Division of Industry and Consumer Education (DICE) 
        at DICE@fda.hhs.gov or 800-638-2041 or 301-796-7100.
        
        U.S. Department of Health and Human Services
        Food and Drug Administration
        Center for Devices and Radiological Health
        
        I. INTRODUCTION
        
        This guidance document provides recommendations to industry and Food and Drug Administration (FDA) 
        staff on clinical evaluation considerations for Software as a Medical Device (SaMD).
        
        II. BACKGROUND
        
        SaMD is software intended to be used for one or more medical purposes that perform these purposes 
        without being part of a hardware medical device.
        """
    
    def test_process_510k_summary(self, fda_510k_summary):
        """Test processing of 510(k) summary document"""
        tool = DocumentProcessingTool()
        
        # Convert to markdown
        conversion_result = tool.convert_to_markdown(content=fda_510k_summary)
        assert conversion_result["success"] is True
        
        # Extract structured data
        extraction_result = tool.extract_structured_data(
            fda_510k_summary, 
            extraction_type="regulatory"
        )
        assert extraction_result["success"] is True
        
        regulatory_concepts = extraction_result["extraction_result"]["regulatory_concepts"]
        
        # Check for K-numbers
        assert "K123456" in regulatory_concepts["k_numbers"]
        assert "K987654" in regulatory_concepts["k_numbers"]
        
        # Check for key regulatory terms
        key_phrases = extraction_result["extraction_result"]["key_phrases"]
        assert any("predicate" in phrase.lower() for phrase in key_phrases)
        assert any("equivalence" in phrase.lower() for phrase in key_phrases)
    
    def test_process_fda_guidance(self, fda_guidance_document):
        """Test processing of FDA guidance document"""
        tool = DocumentProcessingTool()
        
        # Extract metadata
        metadata = extract_fda_guidance_metadata(fda_guidance_document)
        assert "Software as a Medical Device" in metadata.get("title", "")
        assert "December 9, 2019" in metadata.get("effective_date", "")
        
        # Identify sections
        sections = identify_regulatory_sections(fda_guidance_document)
        section_titles = [section["title"] for section in sections]
        assert any("INTRODUCTION" in title for title in section_titles)
        assert any("BACKGROUND" in title for title in section_titles)
        
        # Summarize document
        summary_result = tool.summarize_document(fda_guidance_document, max_length=150)
        if summary_result["success"]:
            summary = summary_result["summary_result"]["summary"]
            assert len(summary) > 0
            assert "SaMD" in summary or "Software" in summary


if __name__ == "__main__":
    pytest.main([__file__])