import { DocumentSummary } from "@/types/documents";

type DocumentListProps = {
  documents: DocumentSummary[];
  selectedDocumentId: string;
  onSelect: (documentId: string) => void;
  loading: boolean;
  onRefresh: () => void;
};

export function DocumentList({
  documents,
  selectedDocumentId,
  onSelect,
  loading,
  onRefresh,
}: DocumentListProps) {
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Your documents</h2>
        <button
          type="button"
          className="text-sm underline-offset-4 hover:underline text-cyan-500"
          onClick={onRefresh}
          disabled={loading}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>
      {loading ? (
        <p className="muted mt-3">Loading documents…</p>
      ) : documents.length === 0 ? (
        <p className="muted mt-3">
          No documents uploaded yet. Upload one to start chatting.
        </p>
      ) : (
        <div className="mt-4 space-y-2">
          {documents.map((doc) => {
            const isActive = selectedDocumentId === String(doc.id);
            return (
              <button
                key={doc.id}
                type="button"
                className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                  isActive
                    ? "border-black bg-neutral-100 dark:border-white dark:bg-neutral-800"
                    : "border-neutral-200 hover:border-black dark:border-neutral-800 dark:hover:border-white"
                }`}
                onClick={() => onSelect(String(doc.id))}
              >
                <p className="font-medium truncate">
                  {doc.title || doc.fileName}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {doc.fileType.toUpperCase()} · {doc.chunkCount} chunk
                  {doc.chunkCount === 1 ? "" : "s"}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

