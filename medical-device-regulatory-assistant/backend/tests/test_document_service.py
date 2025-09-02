"""
Unit tests for Document Service

Tests cover:
- Document processing pipeline
- Document search and retrieval
- Version tracking
- FDA guidance document management
- Compliance analysis
"""

import pytest
import asyncio
from datetime import datetime, timedelta
from unittest.mock import Mock, AsyncMock, patch
import json

# Test imports
from backend.services.document_service import DocumentService
from backend.tools.document_processing_tool import DocumentProcessingConfig
from backend.models.document_models import (
    ProcessedDocument,
    DocumentMetadata,
    DocumentSearchQuery,
    DocumentType,
    ProcessingStatus,
    FDAGuidanceDocument
)


class TestDocumentService:
    """Test suite for DocumentService"""
    
    @pytest.fixture
    def mock_db_session(self):
        """Mock database session"""
        session = AsyncMock()
        session.execute = AsyncMock()
        session.commit = AsyncMock()
        session.rollback = AsyncMock()
        session.add = Mock()
        session.delete = AsyncMock()
        return session
    
    @pytest.fixture
    def config(self):
        """Test configuration"""
        return DocumentProcessingConfig(
            max_file_size_mb=10,
            ocr_enabled=False,
            nlp_enabled=True,
            cache_enabled=False
        )
    
    @pytest.fixture
    def service(self, mock_db_session, config):
        """Document service instance"""
        return DocumentService(mock_db_session, config)
    
    @pytest.fixture
    def sample_document_content(self):
        """Sample document content for testing"""
        return """
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
    
    @pytest.fixture
    def sample_processed_document(self, sample_document_content):
        """Sample processed document"""
        metadata = DocumentMetadata(
            filename="test_guidance.txt",
            file_size=len(sample_document_content),
            file_type="txt",
            content_hash="abc123def456",
            document_type=DocumentType.FDA_GUIDANCE
        )
        
        return ProcessedDocument(
            id="doc_test_123",
            title="FDA Guidance Document",
            content=sample_document_content,
            markdown_content=f"# FDA Guidance Document\n\n{sample_document_content}",
            metadata=metadata,
            processing_status=ProcessingStatus.COMPLETED
        )
    
    @pytest.mark.asyncio
    async def test_process_document_success(self, service, sample_document_content):
        """Test successful document processing"""
        with patch.object(service.processing_tool, '_arun') as mock_arun:
            # Mock processing tool responses
            mock_arun.side_effect = [
                # Convert to markdown
                {
                    "success": True,
                    "markdown": f"# Test Document\n\n{sample_document_content}",
                    "original_text": sample_document_content,
                    "metadata": {
                        "filename": "test.txt",
                        "file_size": len(sample_document_content),
                        "file_type": "txt",
                        "content_hash": "test_hash_123"
                    }
                },
                # Extract structured data
                {
                    "success": True,
                    "extraction_result": {
                        "entities": [{"text": "FDA", "label": "ORG"}],
                        "key_phrases": ["medical device", "software validation"],
                        "regulatory_concepts": {
                            "k_numbers": ["K234567"],
                            "cfr_sections": ["21 CFR 820.30"]
                        },
                        "confidence_score": 0.85
                    }
                },
                # Summarize document
                {
                    "success": True,
                    "summary_result": {
                        "summary": "This guidance provides recommendations for medical device software validation.",
                        "original_length": len(sample_document_content),
                        "summary_length": 75,
                        "compression_ratio": 0.1,
                        "confidence_score": 0.9
                    }
                }
            ]
            
            # Mock database save
            with patch.object(service, '_save_document_to_db') as mock_save:
                mock_save.return_value = None
                
                result = await service.process_document(
                    content=sample_document_content,
                    project_id=1,
                    document_type=DocumentType.FDA_GUIDANCE
                )
                
                assert result["success"] is True
                assert "document_id" in result
                assert "document" in result
                assert result["processing_summary"]["conversion_success"] is True
                assert result["processing_summary"]["extraction_success"] is True
                assert result["processing_summary"]["summary_success"] is True
    
    @pytest.mark.asyncio
    async def test_process_document_conversion_failure(self, service, sample_document_content):
        """Test document processing with conversion failure"""
        with patch.object(service.processing_tool, '_arun') as mock_arun:
            # Mock conversion failure
            mock_arun.return_value = {
                "success": False,
                "error": "Conversion failed"
            }
            
            result = await service.process_document(content=sample_document_content)
            
            assert result["success"] is False
            assert "error" in result
    
    @pytest.mark.asyncio
    async def test_search_documents(self, service):
        """Test document search functionality"""
        # Mock documents from database
        mock_documents = [
            {
                "id": "doc1",
                "title": "510(k) Guidance",
                "content": "This document provides guidance on 510(k) submissions.",
                "metadata": {"type": "guidance"}
            },
            {
                "id": "doc2",
                "title": "PMA Guidance", 
                "content": "This document covers PMA submissions for Class III devices.",
                "metadata": {"type": "guidance"}
            }
        ]
        
        with patch.object(service, '_get_documents_from_db') as mock_get_docs:
            mock_get_docs.return_value = mock_documents
            
            with patch.object(service.processing_tool, '_arun') as mock_arun:
                mock_arun.return_value = {
                    "success": True,
                    "results": [
                        {
                            "document_id": "doc1",
                            "title": "510(k) Guidance",
                            "content_preview": "This document provides guidance...",
                            "similarity_score": 0.85,
                            "metadata": {"type": "guidance"}
                        }
                    ],
                    "total_documents": 2
                }
                
                query = DocumentSearchQuery(
                    query_text="510k submission guidance",
                    max_results=5,
                    min_similarity=0.3
                )
                
                result = await service.search_documents(query, project_id=1)
                
                assert result["success"] is True
                assert len(result["results"]) == 1
                assert result["results"][0]["document_id"] == "doc1"
                assert result["results"][0]["similarity_score"] == 0.85
    
    @pytest.mark.asyncio
    async def test_search_documents_no_results(self, service):
        """Test document search with no matching results"""
        with patch.object(service, '_get_documents_from_db') as mock_get_docs:
            mock_get_docs.return_value = []
            
            with patch.object(service.processing_tool, '_arun') as mock_arun:
                mock_arun.return_value = {
                    "success": True,
                    "results": [],
                    "total_documents": 0
                }
                
                query = DocumentSearchQuery(
                    query_text="nonexistent topic",
                    max_results=5
                )
                
                result = await service.search_documents(query)
                
                assert result["success"] is True
                assert result["results"] == []
                assert result["total_documents_searched"] == 0
    
    @pytest.mark.asyncio
    async def test_get_document_by_id_from_cache(self, service, sample_processed_document):
        """Test retrieving document from cache"""
        # Add document to cache
        service._cache[sample_processed_document.id] = sample_processed_document
        
        result = await service.get_document_by_id(sample_processed_document.id)
        
        assert result is not None
        assert result.id == sample_processed_document.id
        assert result.title == sample_processed_document.title
    
    @pytest.mark.asyncio
    async def test_get_document_by_id_from_database(self, service):
        """Test retrieving document from database"""
        # Mock database document
        mock_db_doc = Mock()
        mock_db_doc.id = "doc_123"
        mock_db_doc.filename = "test.txt"
        mock_db_doc.content_markdown = "# Test Document"
        mock_db_doc.metadata = json.dumps({
            "file_size": 100,
            "file_type": "txt",
            "content_hash": "hash123"
        })
        mock_db_doc.created_at = datetime.now()
        mock_db_doc.updated_at = datetime.now()
        
        # Mock database query
        mock_result = Mock()
        mock_result.scalar_one_or_none.return_value = mock_db_doc
        service.db.execute.return_value = mock_result
        
        result = await service.get_document_by_id("doc_123")
        
        assert result is not None
        assert result.id == "doc_123"
        assert result.markdown_content == "# Test Document"
    
    @pytest.mark.asyncio
    async def test_get_document_by_id_not_found(self, service):
        """Test retrieving non-existent document"""
        # Mock database query returning None
        mock_result = Mock()
        mock_result.scalar_one_or_none.return_value = None
        service.db.execute.return_value = mock_result
        
        result = await service.get_document_by_id("nonexistent_doc")
        
        assert result is None
    
    @pytest.mark.asyncio
    async def test_update_document(self, service, sample_processed_document):
        """Test document update with version tracking"""
        # Add document to cache
        service._cache[sample_processed_document.id] = sample_processed_document
        
        new_content = "Updated document content"
        
        with patch.object(service.processing_tool, '_arun') as mock_arun:
            mock_arun.return_value = {
                "success": True,
                "version": {
                    "document_id": sample_processed_document.id,
                    "version_number": 2,
                    "content_hash": "new_hash_456"
                }
            }
            
            with patch.object(service, '_update_document_in_db') as mock_update_db:
                mock_update_db.return_value = None
                
                result = await service.update_document(
                    sample_processed_document.id,
                    content=new_content,
                    metadata={"updated_by": "test_user"}
                )
                
                assert result["success"] is True
                assert result["document_id"] == sample_processed_document.id
                assert "version_info" in result
                
                # Check that document was removed from cache
                assert sample_processed_document.id not in service._cache
    
    @pytest.mark.asyncio
    async def test_update_document_not_found(self, service):
        """Test updating non-existent document"""
        result = await service.update_document("nonexistent_doc", content="new content")
        
        assert result["success"] is False
        assert "not found" in result["error"]
    
    @pytest.mark.asyncio
    async def test_delete_document(self, service):
        """Test document deletion"""
        document_id = "doc_to_delete"
        
        # Mock database document
        mock_db_doc = Mock()
        mock_db_doc.id = document_id
        
        mock_result = Mock()
        mock_result.scalar_one_or_none.return_value = mock_db_doc
        service.db.execute.return_value = mock_result
        
        # Add to cache
        service._cache[document_id] = Mock()
        
        result = await service.delete_document(document_id)
        
        assert result["success"] is True
        assert result["document_id"] == document_id
        
        # Check that document was removed from cache
        assert document_id not in service._cache
        
        # Verify database operations
        service.db.delete.assert_called_once_with(mock_db_doc)
        service.db.commit.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_delete_document_not_found(self, service):
        """Test deleting non-existent document"""
        mock_result = Mock()
        mock_result.scalar_one_or_none.return_value = None
        service.db.execute.return_value = mock_result
        
        result = await service.delete_document("nonexistent_doc")
        
        assert result["success"] is False
        assert "not found" in result["error"]
    
    @pytest.mark.asyncio
    async def test_get_fda_guidance_documents(self, service):
        """Test retrieving FDA guidance documents"""
        result = await service.get_fda_guidance_documents(
            search_terms=["software", "medical device"],
            device_type="software",
            effective_date_after=datetime(2019, 1, 1)
        )
        
        assert isinstance(result, list)
        
        # Check that results contain expected guidance documents
        if result:
            guidance_doc = result[0]
            assert isinstance(guidance_doc, FDAGuidanceDocument)
            assert guidance_doc.document_number is not None
            assert guidance_doc.title is not None
    
    @pytest.mark.asyncio
    async def test_analyze_document_compliance(self, service, sample_processed_document):
        """Test document compliance analysis"""
        # Add document to cache
        service._cache[sample_processed_document.id] = sample_processed_document
        
        result = await service.analyze_document_compliance(
            sample_processed_document.id,
            regulatory_framework="FDA"
        )
        
        assert result["success"] is True
        assert "compliance_score" in result
        assert "compliance_issues" in result
        assert "recommendations" in result
        assert result["regulatory_framework"] == "FDA"
        
        # Check compliance score is between 0 and 1
        assert 0 <= result["compliance_score"] <= 1
    
    @pytest.mark.asyncio
    async def test_analyze_document_compliance_not_found(self, service):
        """Test compliance analysis for non-existent document"""
        result = await service.analyze_document_compliance("nonexistent_doc")
        
        assert result["success"] is False
        assert "not found" in result["error"]
    
    def test_extract_title_from_content(self, service):
        """Test title extraction from document content"""
        content = "FDA Guidance Document\n\nThis is the content of the document."
        filename = "test_document.txt"
        
        title = service._extract_title(content, filename)
        
        assert title == "FDA Guidance Document"
    
    def test_extract_title_from_filename(self, service):
        """Test title extraction from filename when content has no clear title"""
        content = "This document has no clear title. It just starts with regular content."
        filename = "important_guidance_document.txt"
        
        title = service._extract_title(content, filename)
        
        assert title == "important_guidance_document"
    
    def test_cache_document(self, service, sample_processed_document):
        """Test document caching functionality"""
        service._cache_document(sample_processed_document)
        
        assert sample_processed_document.id in service._cache
        assert service._cache[sample_processed_document.id] == sample_processed_document
    
    def test_cache_size_management(self, service):
        """Test cache size management (LRU eviction)"""
        # Fill cache beyond limit
        for i in range(105):  # Exceeds default limit of 100
            doc = Mock()
            doc.id = f"doc_{i}"
            doc.created_at = datetime.now() - timedelta(minutes=i)  # Older documents first
            service._cache_document(doc)
        
        # Cache should not exceed 100 items
        assert len(service._cache) <= 100
        
        # Oldest document should be evicted
        assert "doc_0" not in service._cache
        assert "doc_104" in service._cache
    
    @pytest.mark.asyncio
    async def test_save_document_to_db(self, service, sample_processed_document):
        """Test saving document to database"""
        project_id = 1
        
        await service._save_document_to_db(sample_processed_document, project_id)
        
        # Verify database operations
        service.db.add.assert_called_once()
        service.db.commit.assert_called_once()
        
        # Check the document that was added
        added_doc = service.db.add.call_args[0][0]
        assert added_doc.id == sample_processed_document.id
        assert added_doc.project_id == project_id
        assert added_doc.filename == sample_processed_document.metadata.filename
    
    @pytest.mark.asyncio
    async def test_save_document_to_db_error(self, service, sample_processed_document):
        """Test database error handling during document save"""
        service.db.commit.side_effect = Exception("Database error")
        
        with pytest.raises(Exception):
            await service._save_document_to_db(sample_processed_document, 1)
        
        # Verify rollback was called
        service.db.rollback.assert_called_once()
    
    def test_db_document_to_processed(self, service):
        """Test conversion from database document to ProcessedDocument"""
        # Mock database document
        mock_db_doc = Mock()
        mock_db_doc.id = "doc_123"
        mock_db_doc.filename = "test.txt"
        mock_db_doc.content_markdown = "# Test Document\n\nContent here."
        mock_db_doc.metadata = json.dumps({
            "file_size": 100,
            "file_type": "txt",
            "content_hash": "hash123",
            "language": "en"
        })
        mock_db_doc.created_at = datetime.now()
        mock_db_doc.updated_at = datetime.now()
        
        processed_doc = service._db_document_to_processed(mock_db_doc)
        
        assert processed_doc.id == "doc_123"
        assert processed_doc.title == "test"  # Filename without extension
        assert processed_doc.content == "# Test Document\n\nContent here."
        assert processed_doc.metadata.filename == "test.txt"
        assert processed_doc.metadata.file_size == 100
        assert processed_doc.processing_status == ProcessingStatus.COMPLETED


class TestDocumentServiceIntegration:
    """Integration tests for DocumentService"""
    
    @pytest.fixture
    def service_with_real_tool(self, mock_db_session):
        """Service with real processing tool for integration testing"""
        config = DocumentProcessingConfig(
            ocr_enabled=False,  # Disable OCR for testing
            nlp_enabled=False,  # Disable NLP for faster testing
            cache_enabled=False
        )
        return DocumentService(mock_db_session, config)
    
    @pytest.mark.asyncio
    async def test_end_to_end_document_processing(self, service_with_real_tool):
        """Test complete document processing pipeline"""
        sample_content = """
        FDA Device Classification Database
        
        Product Code: ABC
        Device Class: II
        Regulation Number: 21 CFR 878.4040
        
        This device is classified as Class II and requires 510(k) clearance.
        """
        
        with patch.object(service_with_real_tool, '_save_document_to_db') as mock_save:
            mock_save.return_value = None
            
            result = await service_with_real_tool.process_document(
                content=sample_content,
                project_id=1,
                document_type=DocumentType.FDA_GUIDANCE
            )
            
            assert result["success"] is True
            assert "document_id" in result
            
            # Verify document was processed
            document = result["document"]
            assert document.content == sample_content
            assert "FDA Device Classification Database" in document.markdown_content
            assert document.metadata.file_type == "text"
    
    @pytest.mark.asyncio
    async def test_search_and_retrieve_workflow(self, service_with_real_tool):
        """Test document search and retrieval workflow"""
        # First, process some documents
        documents_content = [
            "This document discusses 510(k) predicate device selection criteria.",
            "PMA submissions require clinical data for Class III medical devices.",
            "Software as a Medical Device (SaMD) validation guidelines."
        ]
        
        processed_docs = []
        for i, content in enumerate(documents_content):
            with patch.object(service_with_real_tool, '_save_document_to_db'):
                result = await service_with_real_tool.process_document(
                    content=content,
                    project_id=1
                )
                if result["success"]:
                    processed_docs.append(result["document"])
        
        # Mock database retrieval
        with patch.object(service_with_real_tool, '_get_documents_from_db') as mock_get_docs:
            mock_get_docs.return_value = processed_docs
            
            # Search for documents
            query = DocumentSearchQuery(
                query_text="510k predicate device",
                max_results=3,
                min_similarity=0.1
            )
            
            search_result = await service_with_real_tool.search_documents(query, project_id=1)
            
            assert search_result["success"] is True
            # Should find at least the first document which mentions 510(k)
            assert len(search_result["results"]) >= 1


if __name__ == "__main__":
    pytest.main([__file__])