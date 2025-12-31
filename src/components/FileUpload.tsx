'use client';

import { useState } from 'react';

interface FileUploadProps {
  onUploadSuccess: () => void;
  fileSearchStoreName: string | null;
}

export default function FileUpload({
  onUploadSuccess,
  fileSearchStoreName,
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!fileSearchStoreName) {
      setError("Please select a File Search Store first");
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      // Step 1: Upload file
      const formData = new FormData();
      formData.append("file", file);

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadResponse.json();

      if (!uploadResponse.ok) {
        throw new Error(uploadData.error || "Upload failed");
      }

      // Step 2: Import file into File Search Store
      const importResponse = await fetch(
        `/api/file-search-stores/${encodeURIComponent(fileSearchStoreName)}/import`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fileUri: uploadData.file.uri,
          }),
        }
      );

      const importData = await importResponse.json();

      if (!importResponse.ok) {
        throw new Error(importData.error || "Failed to import file into store");
      }

      setSuccess(`File "${file.name}" uploaded and imported successfully!`);
      onUploadSuccess();

      // Reset file input
      e.target.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full">
      <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
        Upload Document
      </label>
      <div className="flex items-center gap-4">
        <label className="flex-1 cursor-pointer">
          <input
            type="file"
            onChange={handleFileUpload}
            disabled={uploading || !fileSearchStoreName}
            className="hidden"
            accept=".pdf,.docx,.txt,.json,.md,.py,.java,.js,.ts,.html,.css"
          />
          <div className="flex items-center justify-center w-full h-32 px-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
            {uploading ? (
              <div className="text-gray-500 dark:text-gray-400">
                Uploading and importing...
              </div>
            ) : !fileSearchStoreName ? (
              <div className="text-center">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Please select a File Search Store first
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Click to upload or drag and drop
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  PDF, DOCX, TXT, JSON, MD, and code files
                </div>
              </div>
            )}
          </div>
        </label>
      </div>
      {error && (
        <div className="mt-2 p-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded">
          {error}
        </div>
      )}
      {success && (
        <div className="mt-2 p-2 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded">
          {success}
        </div>
      )}
    </div>
  );
}

