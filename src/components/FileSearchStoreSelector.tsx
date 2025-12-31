"use client";

import { useEffect, useState, useCallback } from "react";

export interface FileSearchStore {
  name: string;
  displayName?: string;
}

interface FileSearchStoreSelectorProps {
  onStoreSelect: (storeName: string | null) => void;
  stores?: FileSearchStore[];
  selectedStore?: string | null;
  onStoresChange?: (stores: FileSearchStore[]) => void;
  loading?: boolean;
  onReload?: () => Promise<void>;
}

export default function FileSearchStoreSelector({
  onStoreSelect,
  stores: externalStores,
  selectedStore: externalSelectedStore,
  onStoresChange,
  loading: externalLoading,
  onReload,
}: FileSearchStoreSelectorProps) {
  const [internalStores, setInternalStores] = useState<FileSearchStore[]>([]);
  const [internalSelectedStore, setInternalSelectedStore] = useState<
    string | null
  >(null);
  const [internalLoading, setInternalLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newStoreName, setNewStoreName] = useState("");
  const [deletingStore, setDeletingStore] = useState<string | null>(null);

  // Use external props if provided, otherwise use internal state
  const stores = externalStores ?? internalStores;
  const selectedStore = externalSelectedStore ?? internalSelectedStore;
  const loading = externalLoading ?? internalLoading;
  const setStores = onStoresChange ?? setInternalStores;

  const handleStoreChange = (store: string | null) => {
    if (externalSelectedStore === undefined) {
      setInternalSelectedStore(store);
    }
    onStoreSelect(store);
  };

  const loadStores = useCallback(async () => {
    if (externalLoading !== undefined) return; // Don't load if externally controlled

    setInternalLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/file-search-stores");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load stores");
      }

      const loadedStores = data.stores || [];
      setStores(loadedStores);

      // Auto-select first store if available
      if (loadedStores.length > 0 && !selectedStore) {
        const firstStore = loadedStores[0].name;
        if (externalSelectedStore === undefined) {
          setInternalSelectedStore(firstStore);
        }
        onStoreSelect(firstStore);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load stores");
    } finally {
      setInternalLoading(false);
    }
  }, [
    externalLoading,
    externalSelectedStore,
    setStores,
    selectedStore,
    onStoreSelect,
  ]);

  useEffect(() => {
    // Only load stores if not provided externally
    if (externalStores === undefined) {
      loadStores();
    }
  }, [externalStores, loadStores]);

  const handleCreateStore = async () => {
    if (!newStoreName.trim()) {
      setError("Store name is required");
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const response = await fetch("/api/file-search-stores", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          displayName: newStoreName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create store");
      }

      setNewStoreName("");

      // Reload stores (either internally or trigger parent reload)
      if (externalStores === undefined) {
        await loadStores();
      } else if (onReload) {
        await onReload();
      } else {
        // Fallback: reload from API if onReload not provided
        const response = await fetch("/api/file-search-stores");
        const reloadData = await response.json();
        if (response.ok && onStoresChange) {
          onStoresChange(reloadData.stores || []);
        }
      }

      // Auto-select the newly created store
      if (data.store?.name) {
        handleStoreChange(data.store.name);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create store");
    } finally {
      setCreating(false);
    }
  };

  const handleStoreSelectChange = (storeName: string) => {
    handleStoreChange(storeName);
  };

  const handleDeleteStore = async (
    storeName: string,
    force: boolean = false
  ) => {
    if (
      !confirm(
        `Are you sure you want to delete this store?${
          force
            ? "\n\nThis will also delete all files in the store."
            : "\n\nNote: Stores with files cannot be deleted unless you force delete."
        }`
      )
    ) {
      return;
    }

    setDeletingStore(storeName);
    setError(null);

    try {
      const response = await fetch(
        `/api/file-search-stores?name=${encodeURIComponent(storeName)}${
          force ? "&force=true" : ""
        }`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        // If deletion failed and it's because store has files, offer force delete
        if (
          data.error?.includes("FAILED_PRECONDITION") ||
          data.error?.includes("contains")
        ) {
          const forceDelete = confirm(
            "This store contains files. Do you want to delete it anyway? This will delete all files in the store."
          );
          if (forceDelete) {
            return handleDeleteStore(storeName, true);
          }
        }
        throw new Error(data.error || "Failed to delete store");
      }

      // If the deleted store was selected, clear selection
      if (selectedStore === storeName) {
        handleStoreChange(null);
      }

      // Reload stores list
      if (externalStores === undefined) {
        await loadStores();
      } else if (onReload) {
        await onReload();
      } else {
        // Fallback: reload from API if onReload not provided
        const response = await fetch("/api/file-search-stores");
        const reloadData = await response.json();
        if (response.ok && onStoresChange) {
          onStoresChange(reloadData.stores || []);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete store");
    } finally {
      setDeletingStore(null);
    }
  };

  if (loading) {
    return (
      <div className="w-full p-4 text-center text-gray-500 dark:text-gray-400">
        Loading stores...
      </div>
    );
  }

  return (
    <div className="w-full">
      <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
        File Search Store
      </label>

      {error && (
        <div className="mb-2 p-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded">
          {error}
        </div>
      )}

      {stores.length > 0 ? (
        <div className="space-y-2">
          <select
            value={selectedStore || ""}
            onChange={(e) => handleStoreSelectChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {stores.map((store) => (
              <option key={store.name} value={store.name}>
                {store.displayName || store.name}
              </option>
            ))}
          </select>

          {/* Store list with delete buttons */}
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {stores.map((store) => (
              <div
                key={store.name}
                className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
              >
                <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 truncate">
                  {store.displayName || store.name}
                </span>
                <button
                  onClick={() => handleDeleteStore(store.name)}
                  disabled={deletingStore === store.name}
                  className="ml-2 px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  title="Delete store"
                >
                  {deletingStore === store.name ? "Deleting..." : "Delete"}
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mb-2 p-3 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg">
          No stores found. Create one to get started.
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <input
          type="text"
          value={newStoreName}
          onChange={(e) => setNewStoreName(e.target.value)}
          placeholder="New store name..."
          className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          onKeyPress={(e) => {
            if (e.key === "Enter") {
              handleCreateStore();
            }
          }}
        />
        <button
          onClick={handleCreateStore}
          disabled={creating || !newStoreName.trim()}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {creating ? "Creating..." : "Create"}
        </button>
      </div>
    </div>
  );
}
