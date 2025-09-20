'use client';

import { Plus, FileText, FolderPlus } from 'lucide-react';
import React, { useState, useCallback } from 'react';

import { Button } from '@/components/ui/button';
import { useDocuments } from '@/hooks/use-documents';
import { Document } from '@/types/document';

import { FileTree } from './file-tree';
import { MarkdownEditor } from './markdown-editor';
import { TemplateSelector } from './template-selector';


interface DocumentEditorProps {
  projectId: string;
}

export const DocumentEditor = ({ projectId }: DocumentEditorProps) => {
  const {
    documents,
    loading,
    error,
    createDocument,
    updateDocument,
    deleteDocument,
    getDocument,
    getDocumentTree,
    getMentionItems,
  } = useDocuments(projectId);

  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(
    null
  );
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);

  const selectedDocument = selectedDocumentId
    ? getDocument(selectedDocumentId)
    : null;
  const documentTree = getDocumentTree();
  const mentionItems = getMentionItems();

  const handleCreateDocument = useCallback(
    async (name: string, type: Document['type'], parentId?: string) => {
      try {
        const newDoc = await createDocument(name, '', type, parentId);
        if (!newDoc.isFolder) {
          setSelectedDocumentId(newDoc.id);
        }
      } catch (error) {
        console.error('Failed to create document:', error);
      }
    },
    [createDocument]
  );

  const handleDeleteDocument = useCallback(
    async (id: string) => {
      try {
        await deleteDocument(id);
        if (selectedDocumentId === id) {
          setSelectedDocumentId(null);
        }
      } catch (error) {
        console.error('Failed to delete document:', error);
      }
    },
    [deleteDocument, selectedDocumentId]
  );

  const handleRenameDocument = useCallback(
    async (id: string, newName: string) => {
      try {
        await updateDocument(id, { name: newName });
      } catch (error) {
        console.error('Failed to rename document:', error);
      }
    },
    [updateDocument]
  );

  const handleSaveDocument = useCallback(
    async (content: string) => {
      if (!selectedDocumentId) return;

      try {
        await updateDocument(selectedDocumentId, { content });
      } catch (error) {
        console.error('Failed to save document:', error);
        throw error;
      }
    },
    [selectedDocumentId, updateDocument]
  );

  const handleTemplateSelect = useCallback(
    async (content: string, templateName: string) => {
      try {
        const newDoc = await createDocument(
          templateName,
          content,
          'general-note'
        );
        setSelectedDocumentId(newDoc.id);
      } catch (error) {
        console.error('Failed to create document from template:', error);
      }
    },
    [createDocument]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Loading documents...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-red-600">
          <p className="font-medium">Error loading documents</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-white">
      {/* File Tree Sidebar */}
      <FileTree
        tree={documentTree}
        selectedDocumentId={selectedDocumentId}
        onSelectDocument={setSelectedDocumentId}
        onCreateDocument={handleCreateDocument}
        onDeleteDocument={handleDeleteDocument}
        onRenameDocument={handleRenameDocument}
      />

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col">
        {selectedDocument ? (
          selectedDocument.isFolder ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <FolderPlus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Folder: {selectedDocument.name}
                </h3>
                <p className="text-gray-600 mb-4">
                  This is a folder. Select a document to edit or create a new
                  one.
                </p>
                <div className="flex gap-2 justify-center">
                  <Button
                    onClick={() =>
                      handleCreateDocument(
                        'New Document',
                        'general-note',
                        selectedDocument.id
                      )
                    }
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    New Document
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsTemplateDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    From Template
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <MarkdownEditor
              document={selectedDocument}
              onSave={handleSaveDocument}
              mentionItems={mentionItems}
              className="flex-1"
            />
          )
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Document Selected
              </h3>
              <p className="text-gray-600 mb-4">
                Select a document from the sidebar to start editing, or create a
                new one.
              </p>
              <div className="flex gap-2 justify-center">
                <Button
                  onClick={() =>
                    handleCreateDocument('New Document', 'general-note')
                  }
                >
                  <FileText className="h-4 w-4 mr-2" />
                  New Document
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsTemplateDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  From Template
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Template Selector Dialog */}
      <TemplateSelector
        isOpen={isTemplateDialogOpen}
        onClose={() => setIsTemplateDialogOpen(false)}
        onSelectTemplate={handleTemplateSelect}
      />
    </div>
  );
}
