'use client';

import { useEffect, useState } from 'react';

interface File {
  name: string;
  displayName?: string;
  uri: string;
  mimeType: string;
  sizeBytes: string;
  createTime?: string;
}

interface FileListProps {
  onFileSelect: (uris: string[]) => void;
  refreshTrigger: number;
}

export default function FileList({ onFileSelect, refreshTrigger }: FileListProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFiles();
  }, [refreshTrigger]);

  const loadFiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/files');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load files');
      }

      setFiles(data.files || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const handleFileToggle = (uri: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(uri)) {
      newSelected.delete(uri);
    } else {
      newSelected.add(uri);
    }
    setSelectedFiles(newSelected);
    onFileSelect(Array.from(newSelected));
  };

  const handleDelete = async (fileName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      const response = await fetch(`/api/files?name=${encodeURIComponent(fileName)}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete file');
      }

      loadFiles();
      // Remove from selected if it was selected
      const newSelected = new Set(selectedFiles);
      files.forEach((file) => {
        if (file.name === fileName) {
          newSelected.delete(file.uri);
        }
      });
      setSelectedFiles(newSelected);
      onFileSelect(Array.from(newSelected));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete file');
    }
  };

  const formatFileSize = (bytes: string) => {
    const numBytes = parseInt(bytes, 10);
    if (numBytes < 1024) return `${numBytes} B`;
    if (numBytes < 1024 * 1024) return `${(numBytes / 1024).toFixed(2)} KB`;
    return `${(numBytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  if (loading) {
    return (
      <div className="w-full p-4 text-center text-gray-500 dark:text-gray-400">
        Loading files...
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full p-4 text-center text-red-600 dark:text-red-400">
        {error}
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="w-full p-4 text-center text-gray-500 dark:text-gray-400">
        No files uploaded yet. Upload a file to get started.
      </div>
    );
  }

  return (
    <div className="w-full">
      <h3 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
        Uploaded Files ({files.length})
      </h3>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {files.map((file) => (
          <div
            key={file.uri}
            className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
              selectedFiles.has(file.uri)
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
            onClick={() => handleFileToggle(file.uri)}
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {file.displayName || file.name}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {file.mimeType} • {formatFileSize(file.sizeBytes)}
              </div>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <input
                type="checkbox"
                checked={selectedFiles.has(file.uri)}
                onChange={() => handleFileToggle(file.uri)}
                className="w-4 h-4 text-blue-600 rounded"
                onClick={(e) => e.stopPropagation()}
              />
              <button
                onClick={(e) => handleDelete(file.name, e)}
                className="px-2 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
      {selectedFiles.size > 0 && (
        <div className="mt-3 text-sm text-blue-600 dark:text-blue-400">
          {selectedFiles.size} file(s) selected for query
        </div>
      )}
    </div>
  );
}

