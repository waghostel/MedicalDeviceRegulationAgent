'use client';

import { File, FileText, Folder, Search } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';

import { MentionItem } from '@/types/document';

interface MentionDropdownProps {
  items: MentionItem[];
  query: string;
  position: { top: number; left: number };
  onSelect: (item: MentionItem) => void;
  onClose: () => void;
}

export const MentionDropdown = ({
  items,
  query,
  position,
  onSelect,
  onClose,
}: MentionDropdownProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter items based on query
  const filteredItems = items.filter(
    (item) =>
      item.label.toLowerCase().includes(query.toLowerCase()) ||
      item.type.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredItems.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredItems.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredItems[selectedIndex]) {
            onSelect(filteredItems[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [filteredItems, selectedIndex, onSelect, onClose]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'document':
        return <FileText className="h-4 w-4" />;
      case 'project':
        return <Folder className="h-4 w-4" />;
      case 'predicate':
        return <Search className="h-4 w-4" />;
      case 'guidance':
        return <File className="h-4 w-4" />;
      default:
        return <File className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'document':
        return 'text-blue-600';
      case 'project':
        return 'text-green-600';
      case 'predicate':
        return 'text-purple-600';
      case 'guidance':
        return 'text-orange-600';
      default:
        return 'text-gray-600';
    }
  };

  if (filteredItems.length === 0) {
    return (
      <div
        ref={dropdownRef}
        className="absolute z-50 bg-white border border-gray-200 rounded-md shadow-lg p-2 min-w-[200px]"
        style={{ top: position.top, left: position.left }}
      >
        <div className="text-sm text-gray-500 text-center py-2">
          No items found for "{query}"
        </div>
      </div>
    );
  }

  return (
    <div
      ref={dropdownRef}
      className="absolute z-50 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto min-w-[250px]"
      style={{ top: position.top, left: position.left }}
    >
      <div className="p-2 border-b border-gray-100">
        <div className="text-xs text-gray-500 font-medium">
          Link to resource ({filteredItems.length} found)
        </div>
      </div>

      {filteredItems.map((item, index) => (
        <div
          key={item.id}
          className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50 ${
            index === selectedIndex
              ? 'bg-blue-50 border-l-2 border-blue-500'
              : ''
          }`}
          onClick={() => onSelect(item)}
        >
          <span className={getTypeColor(item.type)}>{getIcon(item.type)}</span>

          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">
              {item.label}
            </div>
            <div className="text-xs text-gray-500 capitalize">
              {item.type}
              {item.metadata?.updatedAt && (
                <span className="ml-2">
                  • Updated{' '}
                  {new Date(item.metadata.updatedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}

      <div className="p-2 border-t border-gray-100 text-xs text-gray-500">
        Use ↑↓ to navigate, Enter to select, Esc to close
      </div>
    </div>
  );
}
