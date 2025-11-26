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
  const documentCount = documents.length;
  const hasDocuments = documentCount > 0;

  return (
    <div className="card flex h-[333px] flex-col gap-4">
      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your documents</h2>
          <button
            type="button"
            className="text-sm underline-offset-4 hover:underline text-cyan-500 disabled:opacity-50"
            onClick={onRefresh}
            disabled={loading}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Pick a file to continue your conversation.
        </p>
        <p className="text-xs uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
          {loading
            ? "Syncing document list…"
            : hasDocuments
              ? `${documentCount} document${documentCount === 1 ? "" : "s"} uploaded`
              : "No documents available"}
        </p>
      </header>

      <section className="relative flex-1 overflow-hidden rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-neutral-500 dark:text-neutral-400">
            Loading documents…
          </div>
        ) : !hasDocuments ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <h3 className="text-base font-medium">Nothing here yet</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Upload a PDF, DOCX, or text file to start asking questions.
            </p>
          </div>
        ) : (
          <div className="no-scrollbar h-full space-y-2 overflow-y-auto px-3 py-4 pr-4">
            {documents.map((doc) => {
              const isActive = selectedDocumentId === String(doc.id);
              return (
                <button
                  key={doc.id}
                  type="button"
                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                    isActive
                      ? "border-black bg-neutral-100 shadow-sm dark:border-white dark:bg-neutral-800"
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
      </section>
    </div>
  );
}

