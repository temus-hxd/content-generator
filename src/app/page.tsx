"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import FileUpload from "../components/FileUpload";
import FileList from "../components/FileList";
import QueryInterface from "../components/QueryInterface";
import FileSearchStoreSelector from "../components/FileSearchStoreSelector";

interface FileSearchStore {
  name: string;
  displayName?: string;
}

export default function Home() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedFileSearchStoreName, setSelectedFileSearchStoreName] =
    useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [stores, setStores] = useState<FileSearchStore[]>([]);
  const [storesLoading, setStoresLoading] = useState(true);

  useEffect(() => {
    loadStores();
  }, []);

  const loadStores = async () => {
    setStoresLoading(true);
    try {
      const response = await fetch("/api/file-search-stores");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load stores");
      }

      const loadedStores = data.stores || [];
      setStores(loadedStores);

      // Auto-select first store if available and none selected
      if (loadedStores.length > 0 && !selectedFileSearchStoreName) {
        const firstStore = loadedStores[0].name;
        setSelectedFileSearchStoreName(firstStore);
      }
    } catch (err) {
      console.error("Failed to load stores:", err);
    } finally {
      setStoresLoading(false);
    }
  };

  const handleUploadSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      {/* Upload Documents Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setModalOpen(true)}
        className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        aria-label="Upload documents"
      >
        <svg
          className="w-5 h-5 text-gray-900 dark:text-gray-100"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Upload Documents
        </span>
      </motion.button>

      {/* Modal Overlay */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md"
            onClick={() => setModalOpen(false)}
          >
            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto z-50 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
                <motion.h2
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-xl font-semibold text-gray-900 dark:text-gray-100"
                >
                  File Management
                </motion.h2>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  aria-label="Close modal"
                >
                  <svg
                    className="w-6 h-6 text-gray-900 dark:text-gray-100"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </motion.button>
              </div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15 }}
                className="p-6 space-y-6"
              >
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800"
                >
                  <FileSearchStoreSelector
                    onStoreSelect={setSelectedFileSearchStoreName}
                    stores={stores}
                    selectedStore={selectedFileSearchStoreName}
                    onStoresChange={setStores}
                    loading={storesLoading}
                    onReload={loadStores}
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800"
                >
                  <FileUpload
                    onUploadSuccess={handleUploadSuccess}
                    fileSearchStoreName={selectedFileSearchStoreName}
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800"
                >
                  <FileList
                    onFileSelect={() => {}}
                    refreshTrigger={refreshTrigger}
                  />
                </motion.div>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main>
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Content Generator
            </h1>
          </div>

          <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
            <QueryInterface fileSearchStoreName={selectedFileSearchStoreName} />
          </div>
        </div>
      </main>
    </div>
  );
}
