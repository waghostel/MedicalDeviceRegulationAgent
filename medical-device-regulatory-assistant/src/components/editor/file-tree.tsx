'use client';

import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  Plus,
  MoreHorizontal,
} from 'lucide-react';
import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DocumentTreeNode, Document } from '@/types/document';

interface FileTreeProps {
  tree: DocumentTreeNode[];
  selectedDocumentId?: string;
  onSelectDocument: (id: string) => void;
  onCreateDocument: (
    name: string,
    type: Document['type'],
    parentId?: string
  ) => void;
  onDeleteDocument: (id: string) => void;
  onRenameDocument: (id: string, newName: string) => void;
}

interface TreeNodeProps {
  node: DocumentTreeNode;
  level: number;
  selectedDocumentId?: string;
  onSelectDocument: (id: string) => void;
  onCreateDocument: (
    name: string,
    type: Document['type'],
    parentId?: string
  ) => void;
  onDeleteDocument: (id: string) => void;
  onRenameDocument: (id: string, newName: string) => void;
}

const TreeNode = ({
  node,
  level,
  selectedDocumentId,
  onSelectDocument,
  onCreateDocument,
  onDeleteDocument,
  onRenameDocument,
}: TreeNodeProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(node.name);

  const handleToggle = () => {
    if (node.isFolder) {
      setIsExpanded(!isExpanded);
    } else {
      onSelectDocument(node.id);
    }
  };

  const handleRename = () => {
    if (newName.trim() && newName !== node.name) {
      onRenameDocument(node.id, newName.trim());
    }
    setIsRenaming(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRename();
    } else if (e.key === 'Escape') {
      setNewName(node.name);
      setIsRenaming(false);
    }
  };

  const getIcon = () => {
    if (node.isFolder) {
      return isExpanded ? (
        <FolderOpen className="h-4 w-4" />
      ) : (
        <Folder className="h-4 w-4" />
      );
    }
    return <File className="h-4 w-4" />;
  };

  const getTypeColor = () => {
    switch (node.type) {
      case 'predicate-analysis':
        return 'text-blue-600';
      case 'device-classification':
        return 'text-green-600';
      case 'submission-checklist':
        return 'text-purple-600';
      case 'guidance-summary':
        return 'text-orange-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div>
      <div
        className={`flex items-center gap-1 py-1 px-2 hover:bg-gray-100 cursor-pointer group ${
          selectedDocumentId === node.id ? 'bg-blue-100' : ''
        }`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
      >
        {node.isFolder && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="p-0.5 hover:bg-gray-200 rounded"
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
        )}

        <div
          className="flex items-center gap-2 flex-1 min-w-0"
          onClick={handleToggle}
        >
          <span className={getTypeColor()}>{getIcon()}</span>
          {isRenaming ? (
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={handleKeyPress}
              className="flex-1 px-1 py-0.5 text-sm border rounded"
              autoFocus
            />
          ) : (
            <span className="flex-1 text-sm truncate">{node.name}</span>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
            >
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {node.isFolder && (
              <>
                <DropdownMenuItem
                  onClick={() =>
                    onCreateDocument('New Document', 'general-note', node.id)
                  }
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Document
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    onCreateDocument('New Folder', 'folder', node.id)
                  }
                >
                  <Folder className="h-4 w-4 mr-2" />
                  New Folder
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuItem onClick={() => setIsRenaming(true)}>
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDeleteDocument(node.id)}
              className="text-red-600"
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {node.isFolder && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              selectedDocumentId={selectedDocumentId}
              onSelectDocument={onSelectDocument}
              onCreateDocument={onCreateDocument}
              onDeleteDocument={onDeleteDocument}
              onRenameDocument={onRenameDocument}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export const FileTree = ({
  tree,
  selectedDocumentId,
  onSelectDocument,
  onCreateDocument,
  onDeleteDocument,
  onRenameDocument,
}: FileTreeProps) => (
    <div className="w-64 border-r bg-gray-50 overflow-y-auto">
      <div className="p-3 border-b">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-sm">Documents</h3>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <Plus className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => onCreateDocument('New Document', 'general-note')}
              >
                <File className="h-4 w-4 mr-2" />
                New Document
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onCreateDocument('New Folder', 'folder')}
              >
                <Folder className="h-4 w-4 mr-2" />
                New Folder
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="py-2">
        {tree.map((node) => (
          <TreeNode
            key={node.id}
            node={node}
            level={0}
            selectedDocumentId={selectedDocumentId}
            onSelectDocument={onSelectDocument}
            onCreateDocument={onCreateDocument}
            onDeleteDocument={onDeleteDocument}
            onRenameDocument={onRenameDocument}
          />
        ))}
      </div>
    </div>
  )
