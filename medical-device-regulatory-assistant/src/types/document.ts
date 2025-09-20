export interface Document {
  id: string;
  name: string;
  content: string;
  type: DocumentType;
  projectId: string;
  parentId?: string; // For folder structure
  isFolder: boolean;
  createdAt: Date;
  updatedAt: Date;
  metadata?: DocumentMetadata;
}

export interface DocumentMetadata {
  tags?: string[];
  template?: string;
  version?: number;
  author?: string;
}

export type DocumentType =
  | 'predicate-analysis'
  | 'device-classification'
  | 'submission-checklist'
  | 'guidance-summary'
  | 'comparison-matrix'
  | 'general-note'
  | 'folder';

export interface DocumentTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  placeholders: TemplatePlaceholder[];
  template: string;
  created_at: string;
  updated_at: string;
}

export interface TemplatePlaceholder {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'date';
  required: boolean;
  options?: string[];
  description?: string;
  defaultValue?: string;
}

export interface MentionItem {
  id: string;
  type: 'document' | 'project' | 'predicate' | 'guidance';
  label: string;
  value: string;
  metadata?: Record<string, any>;
}

export interface DocumentTreeNode {
  id: string;
  name: string;
  type: DocumentType;
  isFolder: boolean;
  children?: DocumentTreeNode[];
  parentId?: string;
}
