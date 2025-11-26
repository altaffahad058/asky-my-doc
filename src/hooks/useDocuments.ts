import { useCallback, useEffect, useMemo, useState } from "react";
import { DocumentSummary } from "@/types/documents";

type UploadResult = {
  fileName: string;
  preview: string;
  chunksCreated: number;
  documentId?: number;
};

export function useDocuments() {
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);

  const loadDocuments = useCallback(async () => {
    try {
      setDocumentsLoading(true);
      const res = await fetch("/api/documents");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to load documents");
      }
      setDocuments(Array.isArray(data?.documents) ? data.documents : []);
    } catch (error) {
      console.error("Failed to load documents", error);
      setDocuments([]);
    } finally {
      setDocumentsLoading(false);
    }
  }, []);

  const uploadDocument = useCallback(
    async (file: File): Promise<UploadResult> => {
      const formData = new FormData();
      formData.append("file", file);
      try {
        setIsUploading(true);
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const data = await response.json().catch(() => ({} as any));
        if (!response.ok) {
          const errorMessage =
            (data && (data.error || data.message)) || "Upload failed";
          throw new Error(errorMessage);
        }

        await loadDocuments();
        if (data?.documentId) {
          setSelectedDocumentId(String(data.documentId));
        }

        return {
          fileName: data?.fileName ?? file.name,
          preview: data?.contentPreview ?? "(no preview available)",
          chunksCreated: data?.chunksCreated ?? 0,
          documentId:
            typeof data?.documentId === "number" ? data.documentId : undefined,
        };
      } finally {
        setIsUploading(false);
      }
    },
    [loadDocuments]
  );

  const deleteDocument = useCallback(
    async (documentId: number): Promise<boolean> => {
      try {
        const res = await fetch(`/api/documents/${documentId}`, {
          method: "DELETE",
        });
        const data = await res.json().catch(() => ({} as any));

        if (!res.ok) {
          const message =
            (data && (data.error || data.message)) ||
            "Failed to delete document";
          throw new Error(message);
        }

        await loadDocuments();

        if (String(documentId) === selectedDocumentId) {
          setSelectedDocumentId("");
        }

        return true;
      } catch (error: any) {
        console.error("Failed to delete document", error);
        return false;
      }
    },
    [loadDocuments, selectedDocumentId]
  );

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  useEffect(() => {
    if (documents.length === 0) {
      setSelectedDocumentId("");
      return;
    }
    if (!documents.some((doc) => String(doc.id) === selectedDocumentId)) {
      setSelectedDocumentId(String(documents[0].id));
    }
  }, [documents, selectedDocumentId]);

  return useMemo(
    () => ({
      documents,
      documentsLoading,
      selectedDocumentId,
      setSelectedDocumentId,
      loadDocuments,
      isUploading,
      uploadDocument,
      deleteDocument,
    }),
    [
      documents,
      documentsLoading,
      selectedDocumentId,
      loadDocuments,
      isUploading,
      uploadDocument,
      deleteDocument,
    ]
  );
}

