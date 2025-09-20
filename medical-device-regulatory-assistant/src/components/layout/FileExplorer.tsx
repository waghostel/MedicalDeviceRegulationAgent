'use client';

import {
  Folder,
  FolderOpen,
  File,
  FileText,
  FilePlus,
  FolderPlus,
  MoreHorizontal,
  Edit,
  Trash2,
  ChevronRight,
  ChevronDown,
  Upload,
} from 'lucide-react';
import React, { useState, useCallback } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  description?: string;
  size?: number;
  lastModified?: Date;
  expanded?: boolean;
}

interface FileExplorerProps {
  files: FileNode[];
  onFileSelect?: (file: FileNode) => void;
  onFileCreate?: (parentId: string | null, type: 'file' | 'folder') => void;
  onFileRename?: (fileId: string, newName: string) => void;
  onFileDelete?: (fileId: string) => void;
  onFileUpload?: (files: FileList, parentId: string | null) => void;
  className?: string;
}

interface FileItemProps {
  node: FileNode;
  level: number;
  onSelect?: (file: FileNode) => void;
  onToggle?: (fileId: string) => void;
  onRename?: (fileId: string, newName: string) => void;
  onDelete?: (fileId: string) => void;
}

const FileItem: React.FC<FileItemProps> = ({
  node,
  level,
  onSelect,
  onToggle,
  onRename,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(node.name);
  const [showActions, setShowActions] = useState(false);

  const handleRename = () => {
    if (editName.trim() && editName !== node.name) {
      onRename?.(node.id, editName.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRename();
    } else if (e.key === 'Escape') {
      setEditName(node.name);
      setIsEditing(false);
    }
  };

  const paddingLeft = level * 16 + 8;

  return (
    <div>
      <div
        className={cn(
          'group flex items-center py-1 px-2 hover:bg-muted/50 cursor-pointer',
          showActions && 'bg-muted/50'
        )}
        style={{ paddingLeft }}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        {/* Expand/Collapse button for folders */}
        {node.type === 'folder' && (
          <Button
            variant="ghost"
            size="sm"
            className="h-4 w-4 p-0 mr-1"
            onClick={() => onToggle?.(node.id)}
          >
            {node.expanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </Button>
        )}

        {/* Icon */}
        <div className="mr-2">
          {node.type === 'folder' ? (
            node.expanded ? (
              <FolderOpen className="h-4 w-4 text-blue-500" />
            ) : (
              <Folder className="h-4 w-4 text-blue-500" />
            )
          ) : (
            <FileText className="h-4 w-4 text-gray-500" />
          )}
        </div>

        {/* Name */}
        <div className="flex-1 min-w-0" onClick={() => onSelect?.(node)}>
          {isEditing ? (
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={handleKeyDown}
              className="w-full px-1 py-0 text-sm bg-background border rounded"
              autoFocus
            />
          ) : (
            <div>
              <div className="text-sm truncate">{node.name}</div>
              {node.description && (
                <div className="text-xs text-muted-foreground truncate">
                  {node.description}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        {showActions && !isEditing && (
          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setIsEditing(true)}
            >
              <Edit className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
              onClick={() => onDelete?.(node.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Children */}
      {node.type === 'folder' && node.expanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileItem
              key={child.id}
              node={child}
              level={level + 1}
              onSelect={onSelect}
              onToggle={onToggle}
              onRename={onRename}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const FileExplorer: React.FC<FileExplorerProps> = ({
  files,
  onFileSelect,
  onFileCreate,
  onFileRename,
  onFileDelete,
  onFileUpload,
  className,
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set()
  );
  const [dragOver, setDragOver] = useState(false);

  const handleToggle = (fileId: string) => {
    setExpandedFolders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);

      if (e.dataTransfer.files && onFileUpload) {
        onFileUpload(e.dataTransfer.files, null);
      }
    },
    [onFileUpload]
  );

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && onFileUpload) {
      onFileUpload(e.target.files, null);
    }
  };

  // Add expanded state to file nodes
  const filesWithExpanded = files.map((file) => ({
    ...file,
    expanded: expandedFolders.has(file.id),
  }));

  return (
    <div className={cn('border rounded-lg bg-background', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="text-sm font-medium">Project Files</h3>
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onFileCreate?.(null, 'folder')}
          >
            <FolderPlus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onFileCreate?.(null, 'file')}
          >
            <FilePlus className="h-4 w-4" />
          </Button>
          <label>
            <Button variant="ghost" size="sm" asChild>
              <span>
                <Upload className="h-4 w-4" />
              </span>
            </Button>
            <input
              type="file"
              multiple
              className="hidden"
              onChange={handleFileInputChange}
            />
          </label>
        </div>
      </div>

      {/* File Tree */}
      <div
        className={cn(
          'min-h-[200px] p-2',
          dragOver && 'bg-primary/5 border-primary border-dashed'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Folder className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No files yet</p>
            <p className="text-xs text-muted-foreground">
              Drag and drop files here or use the buttons above
            </p>
          </div>
        ) : (
          <div>
            {filesWithExpanded.map((file) => (
              <FileItem
                key={file.id}
                node={file}
                level={0}
                onSelect={onFileSelect}
                onToggle={handleToggle}
                onRename={onFileRename}
                onDelete={onFileDelete}
              />
            ))}
          </div>
        )}

        {dragOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-primary/10 border-2 border-dashed border-primary rounded-lg">
            <div className="text-center">
              <Upload className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium text-primary">
                Drop files here to upload
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
