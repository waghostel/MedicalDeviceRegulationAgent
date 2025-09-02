"""
Document Models for Medical Device Regulatory Assistant

Data models for document processing, metadata, versioning, and analysis results.
"""

from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from enum import Enum


class DocumentType(Enum):
    """Enumeration of supported document types"""
    PDF = "pdf"
    DOCX = "docx"
    TXT = "txt"
    HTML = "html"
    MARKDOWN = "md"
    FDA_GUIDANCE = "fda_guidance"
    FDA_510K = "fda_510k"
    CFR_SECTION = "cfr_section"


class ProcessingStatus(Enum):
    """Document processing status"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CACHED = "cached"


@dataclass
class DocumentMetadata:
    """Metadata for processed documents"""
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
    page_count: Optional[int] = None
    word_count: Optional[int] = None
    
    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now()
        if self.modified_at is None:
            self.modified_at = self.created_at


@dataclass
class ProcessedDocument:
    """Represents a fully processed document"""
    id: str
    title: str
    content: str
    markdown_content: str
    metadata: DocumentMetadata
    processing_status: ProcessingStatus
    extraction_results: Optional['ExtractionResult'] = None
    summary_results: Optional['SummaryResult'] = None
    version_info: Optional['DocumentVersion'] = None
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)


@dataclass
class DocumentVersion:
    """Document version tracking information"""
    document_id: str
    version_number: int
    content_hash: str
    content_length: int
    created_at: datetime
    metadata: Dict[str, Any] = field(default_factory=dict)
    changes_summary: Optional[str] = None
    previous_version_hash: Optional[str] = None


@dataclass
class ExtractionResult:
    """Results from NLP-based structured data extraction"""
    entities: List[Dict[str, Any]] = field(default_factory=list)
    key_phrases: List[str] = field(default_factory=list)
    regulatory_concepts: Dict[str, Any] = field(default_factory=dict)
    confidence_score: float = 0.0
    extraction_timestamp: datetime = field(default_factory=datetime.now)
    
    # FDA-specific extractions
    k_numbers: List[str] = field(default_factory=list)
    product_codes: List[str] = field(default_factory=list)
    cfr_sections: List[str] = field(default_factory=list)
    device_classes: List[str] = field(default_factory=list)
    effective_dates: List[str] = field(default_factory=list)


@dataclass
class SummaryResult:
    """Results from document summarization"""
    summary: str
    original_length: int
    summary_length: int
    compression_ratio: float
    confidence_score: float
    summary_type: str = "extractive"
    key_points: List[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)


@dataclass
class SearchResult:
    """Individual search result"""
    document_id: str
    title: str
    content_preview: str
    similarity_score: float
    metadata: Dict[str, Any] = field(default_factory=dict)
    highlighted_passages: List[str] = field(default_factory=list)
    relevance_explanation: Optional[str] = None


@dataclass
class DocumentSearchQuery:
    """Search query parameters"""
    query_text: str
    document_types: List[DocumentType] = field(default_factory=list)
    date_range: Optional[tuple] = None
    min_similarity: float = 0.1
    max_results: int = 10
    include_metadata: bool = True
    highlight_matches: bool = True


@dataclass
class OCRResult:
    """Results from OCR processing"""
    extracted_text: str
    confidence_score: float
    page_number: Optional[int] = None
    bounding_boxes: List[Dict[str, Any]] = field(default_factory=list)
    processing_time_ms: int = 0
    ocr_engine: str = "tesseract"


@dataclass
class DocumentAnalysis:
    """Comprehensive document analysis results"""
    document_id: str
    readability_score: Optional[float] = None
    complexity_metrics: Dict[str, float] = field(default_factory=dict)
    topic_classification: List[Dict[str, Any]] = field(default_factory=list)
    sentiment_analysis: Optional[Dict[str, Any]] = None
    regulatory_compliance_score: Optional[float] = None
    
    # FDA-specific analysis
    regulatory_pathway_suggestions: List[str] = field(default_factory=list)
    predicate_device_mentions: List[str] = field(default_factory=list)
    guidance_document_references: List[str] = field(default_factory=list)


@dataclass
class DocumentComparisonResult:
    """Results from comparing two documents"""
    document1_id: str
    document2_id: str
    similarity_score: float
    differences: List[Dict[str, Any]] = field(default_factory=list)
    similarities: List[Dict[str, Any]] = field(default_factory=list)
    change_summary: Optional[str] = None
    comparison_timestamp: datetime = field(default_factory=datetime.now)


@dataclass
class FDAGuidanceDocument:
    """Specialized model for FDA guidance documents"""
    document_number: str
    title: str
    effective_date: Optional[datetime] = None
    subject: Optional[str] = None
    document_type: str = "guidance"
    status: str = "final"  # draft, final, withdrawn
    url: Optional[str] = None
    content: str = ""
    sections: List[Dict[str, Any]] = field(default_factory=list)
    related_cfr_sections: List[str] = field(default_factory=list)
    applicable_device_types: List[str] = field(default_factory=list)


@dataclass
class DocumentProcessingJob:
    """Represents a document processing job"""
    job_id: str
    document_id: str
    processing_type: str  # convert, extract, summarize, search, etc.
    status: ProcessingStatus
    parameters: Dict[str, Any] = field(default_factory=dict)
    result: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.now)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    processing_time_ms: Optional[int] = None


@dataclass
class DocumentCache:
    """Cache entry for processed documents"""
    cache_key: str
    document_id: str
    cached_data: Dict[str, Any]
    cache_type: str  # extraction, summary, search_results, etc.
    created_at: datetime = field(default_factory=datetime.now)
    expires_at: Optional[datetime] = None
    access_count: int = 0
    last_accessed: datetime = field(default_factory=datetime.now)


# Utility functions for model validation and conversion

def validate_document_metadata(metadata: DocumentMetadata) -> bool:
    """Validate document metadata"""
    required_fields = ['filename', 'file_size', 'file_type', 'content_hash']
    
    for field_name in required_fields:
        if not hasattr(metadata, field_name) or getattr(metadata, field_name) is None:
            return False
    
    # Validate file size
    if metadata.file_size < 0:
        return False
    
    # Validate content hash (allow shorter hashes for testing)
    if len(metadata.content_hash) < 8:  # Minimum hash length
        return False
    
    return True


def create_document_from_dict(data: Dict[str, Any]) -> ProcessedDocument:
    """Create ProcessedDocument from dictionary"""
    metadata_dict = data.get('metadata', {})
    metadata = DocumentMetadata(**metadata_dict)
    
    extraction_dict = data.get('extraction_results')
    extraction_results = ExtractionResult(**extraction_dict) if extraction_dict else None
    
    summary_dict = data.get('summary_results')
    summary_results = SummaryResult(**summary_dict) if summary_dict else None
    
    version_dict = data.get('version_info')
    version_info = DocumentVersion(**version_dict) if version_dict else None
    
    return ProcessedDocument(
        id=data['id'],
        title=data['title'],
        content=data['content'],
        markdown_content=data['markdown_content'],
        metadata=metadata,
        processing_status=ProcessingStatus(data['processing_status']),
        extraction_results=extraction_results,
        summary_results=summary_results,
        version_info=version_info,
        created_at=datetime.fromisoformat(data.get('created_at', datetime.now().isoformat())),
        updated_at=datetime.fromisoformat(data.get('updated_at', datetime.now().isoformat()))
    )


def document_to_dict(document: ProcessedDocument) -> Dict[str, Any]:
    """Convert ProcessedDocument to dictionary"""
    from dataclasses import asdict
    return asdict(document)


# Export all models
__all__ = [
    'DocumentType',
    'ProcessingStatus',
    'DocumentMetadata',
    'ProcessedDocument',
    'DocumentVersion',
    'ExtractionResult',
    'SummaryResult',
    'SearchResult',
    'DocumentSearchQuery',
    'OCRResult',
    'DocumentAnalysis',
    'DocumentComparisonResult',
    'FDAGuidanceDocument',
    'DocumentProcessingJob',
    'DocumentCache',
    'validate_document_metadata',
    'create_document_from_dict',
    'document_to_dict'
]