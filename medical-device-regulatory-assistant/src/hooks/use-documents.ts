import { useState, useCallback, useEffect } from 'react';
import { Document, DocumentTreeNode, MentionItem } from '@/types/document';

// Mock data for development - in production this would connect to a backend
const mockDocuments: Document[] = [
  {
    id: '1',
    name: 'Project Overview',
    content: '# Project Overview\n\nThis is the main project document.',
    type: 'general-note',
    projectId: 'project-1',
    isFolder: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: '2',
    name: 'Regulatory Documents',
    content: '',
    type: 'folder',
    projectId: 'project-1',
    isFolder: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: '3',
    name: 'Predicate Analysis - K123456',
    content: '# Predicate Analysis\n\nAnalysis of predicate device K123456.',
    type: 'predicate-analysis',
    projectId: 'project-1',
    parentId: '2',
    isFolder: false,
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02')
  }
];

export function useDocuments(projectId: string) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load documents for the project
  useEffect(() => {
    const loadDocuments = async () => {
      try {
        setLoading(true);
        // In production, this would be an API call
        const projectDocuments = mockDocuments.filter(doc => doc.projectId === projectId);
        setDocuments(projectDocuments);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load documents');
      } finally {
        setLoading(false);
      }
    };

    loadDocuments();
  }, [projectId]);

  const createDocument = useCallback(async (
    name: string,
    content: string,
    type: Document['type'],
    parentId?: string
  ): Promise<Document> => {
    const newDocument: Document = {
      id: Date.now().toString(),
      name,
      content,
      type,
      projectId,
      parentId,
      isFolder: type === 'folder',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setDocuments(prev => [...prev, newDocument]);
    return newDocument;
  }, [projectId]);

  const updateDocument = useCallback(async (id: string, updates: Partial<Document>): Promise<void> => {
    setDocuments(prev => prev.map(doc => 
      doc.id === id 
        ? { ...doc, ...updates, updatedAt: new Date() }
        : doc
    ));
  }, []);

  const deleteDocument = useCallback(async (id: string): Promise<void> => {
    setDocuments(prev => prev.filter(doc => doc.id !== id && doc.parentId !== id));
  }, []);

  const getDocument = useCallback((id: string): Document | undefined => {
    return documents.find(doc => doc.id === id);
  }, [documents]);

  const getDocumentTree = useCallback((): DocumentTreeNode[] => {
    const buildTree = (parentId?: string): DocumentTreeNode[] => {
      return documents
        .filter(doc => doc.parentId === parentId)
        .map(doc => ({
          id: doc.id,
          name: doc.name,
          type: doc.type,
          isFolder: doc.isFolder,
          parentId: doc.parentId,
          children: doc.isFolder ? buildTree(doc.id) : undefined
        }));
    };

    return buildTree();
  }, [documents]);

  const getMentionItems = useCallback((): MentionItem[] => {
    return documents
      .filter(doc => !doc.isFolder)
      .map(doc => ({
        id: doc.id,
        type: 'document',
        label: doc.name,
        value: `@${doc.name.replace(/\s+/g, '-').toLowerCase()}`,
        metadata: {
          type: doc.type,
          updatedAt: doc.updatedAt
        }
      }));
  }, [documents]);

  const searchDocuments = useCallback((query: string): Document[] => {
    const lowercaseQuery = query.toLowerCase();
    return documents.filter(doc => 
      doc.name.toLowerCase().includes(lowercaseQuery) ||
      doc.content.toLowerCase().includes(lowercaseQuery)
    );
  }, [documents]);

  return {
    documents,
    loading,
    error,
    createDocument,
    updateDocument,
    deleteDocument,
    getDocument,
    getDocumentTree,
    getMentionItems,
    searchDocuments
  };
}