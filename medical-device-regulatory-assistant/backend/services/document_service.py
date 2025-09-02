"""
Document Service for Medical Device Regulatory Assistant

Service layer for document processing operations including:
- Document conversion and processing
- FDA guidance document management
- Document search and retrieval
- Version tracking and caching
"""

import os
import logging
from typing import Dict, List, Optional, Any, Tuple
from pathlib import Path
from datetime import datetime, timedelta
import asyncio
import json

# Database imports
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, desc
from sqlalchemy.orm import selectinload

# Internal imports
from backend.models.document_models import (
    ProcessedDocument,
    DocumentMetadata,
    DocumentVersion,
    ExtractionResult,
    SummaryResult,
    SearchResult,
    DocumentSearchQuery,
    FDAGuidanceDocument,
    DocumentProcessingJob,
    ProcessingStatus,
    DocumentType
)
from backend.tools.document_processing_tool import (
    DocumentProcessingTool,
    DocumentProcessingConfig
)
from backend.database.models import (
    Document as DBDocument,
    DocumentVersion as DBDocumentVersion,
    Project as DBProject
)

# Configure logging
logger = logging.getLogger(__name__)


class DocumentService:
    """
    Service for managing document processing operations
    """
    
    def __init__(self, db_session: AsyncSession, config: Optional[DocumentProcessingConfig] = None):
        self.db = db_session
        self.config = config or DocumentProcessingConfig()
        self.processing_tool = DocumentProcessingTool(self.config)
        self._cache = {}  # Simple in-memory cache
    
    async def process_document(
        self,
        file_path: Optional[str] = None,
        url: Optional[str] = None,
        content: Optional[str] = None,
        project_id: Optional[int] = None,
        document_type: Optional[DocumentType] = None
    ) -> Dict[str, Any]:
        """
        Process a document through the complete pipeline
        
        Args:
            file_path: Path to local file
            url: URL to remote document
            content: Raw text content
            project_id: Associated project ID
            document_type: Type of document
        
        Returns:
            Dictionary with processing results
        """
        try:
            # Step 1: Convert to markdown
            logger.info("Converting document to markdown")
            conversion_result = await self.processing_tool._arun(
                "convert_to_markdown",
                file_path=file_path,
                url=url,
                content=content
            )
            
            if not conversion_result.get("success"):
                return conversion_result
            
            markdown_content = conversion_result["markdown"]
            original_text = conversion_result["original_text"]
            metadata_dict = conversion_result["metadata"]
            
            # Step 2: Extract structured data
            logger.info("Extracting structured data")
            extraction_result = await self.processing_tool._arun(
                "extract_structured_data",
                text=original_text,
                extraction_type="regulatory"
            )
            
            # Step 3: Generate summary
            logger.info("Generating document summary")
            summary_result = await self.processing_tool._arun(
                "summarize_document",
                text=original_text,
                max_length=200,
                min_length=50
            )
            
            # Step 4: Create document record
            document_id = f"doc_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            # Create metadata object
            metadata = DocumentMetadata(**metadata_dict)
            if document_type:
                metadata.document_type = document_type
            
            # Create processed document
            processed_doc = ProcessedDocument(
                id=document_id,
                title=self._extract_title(original_text, metadata.filename),
                content=original_text,
                markdown_content=markdown_content,
                metadata=metadata,
                processing_status=ProcessingStatus.COMPLETED,
                extraction_results=ExtractionResult(**extraction_result.get("extraction_result", {})) if extraction_result.get("success") else None,
                summary_results=SummaryResult(**summary_result.get("summary_result", {})) if summary_result.get("success") else None
            )
            
            # Step 5: Save to database
            if project_id:
                await self._save_document_to_db(processed_doc, project_id)
            
            # Step 6: Cache results
            self._cache_document(processed_doc)
            
            return {
                "success": True,
                "document_id": document_id,
                "document": processed_doc,
                "processing_summary": {
                    "conversion_success": conversion_result.get("success", False),
                    "extraction_success": extraction_result.get("success", False),
                    "summary_success": summary_result.get("success", False)
                }
            }
            
        except Exception as e:
            logger.error(f"Error processing document: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def search_documents(
        self,
        query: DocumentSearchQuery,
        project_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Search documents using semantic similarity
        
        Args:
            query: Search query parameters
            project_id: Optional project filter
        
        Returns:
            Dictionary with search results
        """
        try:
            # Get documents from database
            documents = await self._get_documents_from_db(
                project_id=project_id,
                document_types=query.document_types,
                date_range=query.date_range
            )
            
            # Convert to format expected by processing tool
            doc_list = []
            for doc in documents:
                doc_dict = {
                    "id": doc.id,
                    "title": doc.title,
                    "content": doc.content,
                    "metadata": doc.metadata
                }
                doc_list.append(doc_dict)
            
            # Perform search using processing tool
            search_result = await self.processing_tool._arun(
                "search_documents",
                query=query.query_text,
                documents=doc_list,
                top_k=query.max_results
            )
            
            if not search_result.get("success"):
                return search_result
            
            # Filter results by minimum similarity
            filtered_results = [
                result for result in search_result["results"]
                if result["similarity_score"] >= query.min_similarity
            ]
            
            return {
                "success": True,
                "results": filtered_results,
                "total_documents_searched": search_result["total_documents"],
                "query": query.query_text
            }
            
        except Exception as e:
            logger.error(f"Error searching documents: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "results": []
            }
    
    async def get_document_by_id(self, document_id: str) -> Optional[ProcessedDocument]:
        """Get document by ID from cache or database"""
        try:
            # Check cache first
            if document_id in self._cache:
                return self._cache[document_id]
            
            # Query database
            result = await self.db.execute(
                select(DBDocument).where(DBDocument.id == document_id)
            )
            db_doc = result.scalar_one_or_none()
            
            if not db_doc:
                return None
            
            # Convert to ProcessedDocument
            processed_doc = self._db_document_to_processed(db_doc)
            
            # Cache for future use
            self._cache_document(processed_doc)
            
            return processed_doc
            
        except Exception as e:
            logger.error(f"Error retrieving document {document_id}: {str(e)}")
            return None
    
    async def update_document(
        self,
        document_id: str,
        content: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Update document content and track version
        
        Args:
            document_id: Document ID to update
            content: New content (optional)
            metadata: Updated metadata (optional)
        
        Returns:
            Dictionary with update results
        """
        try:
            # Get existing document
            existing_doc = await self.get_document_by_id(document_id)
            if not existing_doc:
                return {
                    "success": False,
                    "error": f"Document {document_id} not found"
                }
            
            # Track version if content changed
            version_result = None
            if content and content != existing_doc.content:
                version_result = await self.processing_tool._arun(
                    "track_version",
                    document_id=document_id,
                    content=content,
                    metadata=metadata or {}
                )
            
            # Update document in database
            await self._update_document_in_db(document_id, content, metadata)
            
            # Clear cache
            if document_id in self._cache:
                del self._cache[document_id]
            
            return {
                "success": True,
                "document_id": document_id,
                "version_info": version_result.get("version") if version_result else None
            }
            
        except Exception as e:
            logger.error(f"Error updating document {document_id}: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def delete_document(self, document_id: str) -> Dict[str, Any]:
        """Delete document and all associated data"""
        try:
            # Remove from database
            result = await self.db.execute(
                select(DBDocument).where(DBDocument.id == document_id)
            )
            db_doc = result.scalar_one_or_none()
            
            if not db_doc:
                return {
                    "success": False,
                    "error": f"Document {document_id} not found"
                }
            
            await self.db.delete(db_doc)
            await self.db.commit()
            
            # Remove from cache
            if document_id in self._cache:
                del self._cache[document_id]
            
            return {
                "success": True,
                "document_id": document_id
            }
            
        except Exception as e:
            logger.error(f"Error deleting document {document_id}: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def get_fda_guidance_documents(
        self,
        search_terms: Optional[List[str]] = None,
        device_type: Optional[str] = None,
        effective_date_after: Optional[datetime] = None
    ) -> List[FDAGuidanceDocument]:
        """
        Retrieve FDA guidance documents
        
        Args:
            search_terms: Terms to search for
            device_type: Filter by device type
            effective_date_after: Filter by effective date
        
        Returns:
            List of FDA guidance documents
        """
        try:
            # This would typically query an FDA guidance database
            # For now, return a placeholder implementation
            
            guidance_docs = []
            
            # Example FDA guidance documents (would be from database/API)
            sample_docs = [
                {
                    "document_number": "FDA-2019-D-1149",
                    "title": "Software as a Medical Device (SaMD): Clinical Evaluation",
                    "effective_date": datetime(2019, 12, 9),
                    "subject": "Software as Medical Device Clinical Evaluation Guidance",
                    "url": "https://www.fda.gov/regulatory-information/search-fda-guidance-documents/software-medical-device-samd-clinical-evaluation"
                },
                {
                    "document_number": "FDA-2016-D-2025",
                    "title": "Cybersecurity in Medical Devices: Quality System Considerations and Content of Premarket Submissions",
                    "effective_date": datetime(2016, 10, 2),
                    "subject": "Cybersecurity considerations for medical devices",
                    "url": "https://www.fda.gov/regulatory-information/search-fda-guidance-documents/cybersecurity-medical-devices-quality-system-considerations-and-content-premarket-submissions"
                }
            ]
            
            for doc_data in sample_docs:
                # Filter by search terms
                if search_terms:
                    title_lower = doc_data["title"].lower()
                    subject_lower = doc_data["subject"].lower()
                    if not any(term.lower() in title_lower or term.lower() in subject_lower for term in search_terms):
                        continue
                
                # Filter by effective date
                if effective_date_after and doc_data["effective_date"] < effective_date_after:
                    continue
                
                guidance_doc = FDAGuidanceDocument(**doc_data)
                guidance_docs.append(guidance_doc)
            
            return guidance_docs
            
        except Exception as e:
            logger.error(f"Error retrieving FDA guidance documents: {str(e)}")
            return []
    
    async def analyze_document_compliance(
        self,
        document_id: str,
        regulatory_framework: str = "FDA"
    ) -> Dict[str, Any]:
        """
        Analyze document for regulatory compliance
        
        Args:
            document_id: Document to analyze
            regulatory_framework: Regulatory framework to check against
        
        Returns:
            Dictionary with compliance analysis results
        """
        try:
            document = await self.get_document_by_id(document_id)
            if not document:
                return {
                    "success": False,
                    "error": f"Document {document_id} not found"
                }
            
            # Analyze regulatory compliance
            compliance_score = 0.0
            compliance_issues = []
            recommendations = []
            
            # Check for required regulatory elements
            content_lower = document.content.lower()
            
            # FDA-specific checks
            if regulatory_framework.upper() == "FDA":
                # Check for predicate device mentions
                if "predicate device" in content_lower:
                    compliance_score += 0.2
                else:
                    compliance_issues.append("No predicate device mentioned")
                    recommendations.append("Include predicate device comparison")
                
                # Check for substantial equivalence
                if "substantial equivalence" in content_lower:
                    compliance_score += 0.2
                else:
                    compliance_issues.append("Substantial equivalence not discussed")
                    recommendations.append("Include substantial equivalence analysis")
                
                # Check for intended use
                if "intended use" in content_lower:
                    compliance_score += 0.2
                else:
                    compliance_issues.append("Intended use not clearly stated")
                    recommendations.append("Clearly define intended use")
                
                # Check for safety and effectiveness
                if any(term in content_lower for term in ["safety", "effectiveness", "efficacy"]):
                    compliance_score += 0.2
                else:
                    compliance_issues.append("Safety and effectiveness not addressed")
                    recommendations.append("Include safety and effectiveness data")
                
                # Check for regulatory citations
                if any(term in content_lower for term in ["21 cfr", "fda guidance", "510(k)"]):
                    compliance_score += 0.2
                else:
                    compliance_issues.append("Missing regulatory citations")
                    recommendations.append("Include relevant FDA regulations and guidance")
            
            return {
                "success": True,
                "document_id": document_id,
                "compliance_score": min(compliance_score, 1.0),
                "compliance_issues": compliance_issues,
                "recommendations": recommendations,
                "regulatory_framework": regulatory_framework
            }
            
        except Exception as e:
            logger.error(f"Error analyzing document compliance: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    # Private helper methods
    
    def _extract_title(self, content: str, filename: str) -> str:
        """Extract title from document content or use filename"""
        # Try to extract title from first line
        lines = content.strip().split('\n')
        if lines:
            first_line = lines[0].strip()
            if len(first_line) < 100 and not first_line.endswith('.'):
                return first_line
        
        # Fall back to filename without extension
        return Path(filename).stem
    
    def _cache_document(self, document: ProcessedDocument):
        """Cache document in memory"""
        self._cache[document.id] = document
        
        # Simple cache size management
        if len(self._cache) > 100:
            # Remove oldest entries
            oldest_key = min(self._cache.keys(), key=lambda k: self._cache[k].created_at)
            del self._cache[oldest_key]
    
    async def _save_document_to_db(self, document: ProcessedDocument, project_id: int):
        """Save processed document to database"""
        try:
            # Create database document record
            db_doc = DBDocument(
                id=document.id,
                project_id=project_id,
                filename=document.metadata.filename,
                file_path=f"documents/{document.id}",
                document_type=document.metadata.document_type.value if document.metadata.document_type else "unknown",
                content_markdown=document.markdown_content,
                metadata=json.dumps({
                    "file_size": document.metadata.file_size,
                    "file_type": document.metadata.file_type,
                    "content_hash": document.metadata.content_hash,
                    "source_url": document.metadata.source_url,
                    "language": document.metadata.language,
                    "encoding": document.metadata.encoding,
                    "page_count": document.metadata.page_count,
                    "word_count": document.metadata.word_count
                })
            )
            
            self.db.add(db_doc)
            await self.db.commit()
            
        except Exception as e:
            logger.error(f"Error saving document to database: {str(e)}")
            await self.db.rollback()
            raise
    
    async def _get_documents_from_db(
        self,
        project_id: Optional[int] = None,
        document_types: Optional[List[DocumentType]] = None,
        date_range: Optional[Tuple[datetime, datetime]] = None
    ) -> List[ProcessedDocument]:
        """Retrieve documents from database with filters"""
        try:
            query = select(DBDocument)
            
            # Apply filters
            conditions = []
            
            if project_id:
                conditions.append(DBDocument.project_id == project_id)
            
            if document_types:
                type_values = [dt.value for dt in document_types]
                conditions.append(DBDocument.document_type.in_(type_values))
            
            if date_range:
                start_date, end_date = date_range
                conditions.append(and_(
                    DBDocument.created_at >= start_date,
                    DBDocument.created_at <= end_date
                ))
            
            if conditions:
                query = query.where(and_(*conditions))
            
            result = await self.db.execute(query)
            db_docs = result.scalars().all()
            
            # Convert to ProcessedDocument objects
            processed_docs = []
            for db_doc in db_docs:
                processed_doc = self._db_document_to_processed(db_doc)
                processed_docs.append(processed_doc)
            
            return processed_docs
            
        except Exception as e:
            logger.error(f"Error retrieving documents from database: {str(e)}")
            return []
    
    def _db_document_to_processed(self, db_doc: DBDocument) -> ProcessedDocument:
        """Convert database document to ProcessedDocument"""
        # Parse metadata
        metadata_dict = json.loads(db_doc.metadata) if db_doc.metadata else {}
        metadata = DocumentMetadata(
            filename=db_doc.filename,
            file_size=metadata_dict.get("file_size", 0),
            file_type=metadata_dict.get("file_type", "unknown"),
            content_hash=metadata_dict.get("content_hash", ""),
            source_url=metadata_dict.get("source_url"),
            language=metadata_dict.get("language", "en"),
            encoding=metadata_dict.get("encoding", "utf-8"),
            page_count=metadata_dict.get("page_count"),
            word_count=metadata_dict.get("word_count"),
            created_at=db_doc.created_at,
            modified_at=db_doc.updated_at
        )
        
        return ProcessedDocument(
            id=db_doc.id,
            title=Path(db_doc.filename).stem,
            content=db_doc.content_markdown,  # Using markdown as content
            markdown_content=db_doc.content_markdown,
            metadata=metadata,
            processing_status=ProcessingStatus.COMPLETED,
            created_at=db_doc.created_at,
            updated_at=db_doc.updated_at
        )
    
    async def _update_document_in_db(
        self,
        document_id: str,
        content: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Update document in database"""
        try:
            result = await self.db.execute(
                select(DBDocument).where(DBDocument.id == document_id)
            )
            db_doc = result.scalar_one_or_none()
            
            if not db_doc:
                raise ValueError(f"Document {document_id} not found")
            
            if content:
                db_doc.content_markdown = content
            
            if metadata:
                existing_metadata = json.loads(db_doc.metadata) if db_doc.metadata else {}
                existing_metadata.update(metadata)
                db_doc.metadata = json.dumps(existing_metadata)
            
            db_doc.updated_at = datetime.now()
            
            await self.db.commit()
            
        except Exception as e:
            logger.error(f"Error updating document in database: {str(e)}")
            await self.db.rollback()
            raise


# Export main service class
__all__ = ['DocumentService']