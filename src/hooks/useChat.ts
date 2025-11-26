import { useCallback, useMemo, useState } from "react";
import { DocumentSummary } from "@/types/documents";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type UseChatArgs = {
  selectedDocumentId: string;
  documents: DocumentSummary[];
};

export function useChat({ selectedDocumentId, documents }: UseChatArgs) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-1",
      role: "assistant",
      content:
        "Welcome to Ask My Doc! Please upload your documents to get started.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isFetchingReferences, setIsFetchingReferences] = useState(false);

  const canCompose = selectedDocumentId.trim().length > 0;
  const canSend = canCompose && !isSending && input.trim().length > 0;

  const appendAssistantMessage = useCallback((content: string, id?: string) => {
    const messageId = id ?? crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      { id: messageId, role: "assistant", content },
    ]);
    return messageId;
  }, []);

  const updateMessageContent = useCallback((messageId: string, content: string) => {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === messageId ? { ...message, content } : message
      )
    );
  }, []);

  const resetChat = useCallback(() => {
    setMessages([
      {
        id: "welcome-1",
        role: "assistant",
        content:
          "New chat started. Ask anything about your uploaded documents.",
      },
    ]);
  }, []);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text) return;

    const documentIdPayload =
      selectedDocumentId.trim().length > 0
        ? Number(selectedDocumentId)
        : undefined;
    if (documentIdPayload == null || Number.isNaN(documentIdPayload)) {
      appendAssistantMessage(
        "ℹ️ Please select a document from the sidebar before asking a question."
      );
      return;
    }

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };
    setInput("");
    setMessages((prev) => [...prev, userMsg]);

    try {
      setIsSending(true);
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          documentId: documentIdPayload,
        }),
      });
      const data = (await res.json()) as any;

      if (!res.ok) {
        const serverError =
          data?.error || data?.message || `Request failed (${res.status})`;
        appendAssistantMessage(`❌ ${serverError}`);
        return;
      }

      const replyText = data?.reply || "⚠️ No response from API.";
      const contextUsed = data?.contextUsed || false;
      const sourcesCount = data?.sourcesCount || 0;

      const selectedDocument = documents.find(
        (doc) => doc.id === documentIdPayload
      );
      const docLabel = selectedDocument
        ? selectedDocument.title || selectedDocument.fileName
        : null;
      const contextIndicator = contextUsed
        ? `\n\n📚 *Answer based on ${sourcesCount} relevant section${
            sourcesCount > 1 ? "s" : ""
          }${
            docLabel
              ? ` from "${docLabel}"`
              : documentIdPayload != null
              ? " from the selected document"
              : " from your documents"
          }*`
        : `\n\nℹ️ *No relevant context found in the selected document.*`;

      appendAssistantMessage(replyText + contextIndicator);
    } catch (err: any) {
      console.error(err);
      appendAssistantMessage(
        `❌ ${err?.message || "Network error contacting backend."}`
      );
    } finally {
      setIsSending(false);
    }
  }, [
    appendAssistantMessage,
    documents,
    input,
    selectedDocumentId,
  ]);

  const fetchReferences = useCallback(async () => {
    const trimmedId = selectedDocumentId.trim();
    const documentIdPayload = trimmedId.length > 0 ? Number(trimmedId) : NaN;
    if (!Number.isFinite(documentIdPayload)) {
      appendAssistantMessage(
        "ℹ️ Please select a document before fetching references."
      );
      return;
    }

    const selectedDocument = documents.find(
      (doc) => doc.id === documentIdPayload
    );
    const docLabel =
      selectedDocument?.title ||
      selectedDocument?.fileName ||
      `Document ${documentIdPayload}`;

    const placeholderId = appendAssistantMessage(
      `🔎 Summarizing "${docLabel}" and fetching references…`
    );

    try {
      setIsFetchingReferences(true);
      const res = await fetch(`/api/documents/${documentIdPayload}/references`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const message =
          (data && (data.error || data.message)) ||
          `Request failed (${res.status})`;
        updateMessageContent(placeholderId, `❌ ${message}`);
        return;
      }

      const summaryLine =
        typeof data?.querySummary === "string" && data.querySummary.length > 0
          ? data.querySummary
          : data?.queryUsed || docLabel;
      const references = Array.isArray(data?.references)
        ? data.references
        : [];

      const formatSnippet = (snippet?: string) => {
        if (!snippet) return null;
        const singleLine = snippet.replace(/\s+/g, " ").trim();
        if (!singleLine) return null;
        return singleLine.length > 220
          ? `${singleLine.slice(0, 217)}…`
          : singleLine;
      };

      const formattedReferences =
        references.length > 0
          ? references
              .map((ref: any, index: number) => {
                const title = ref.title || ref.url || `Result ${index + 1}`;
                const sourceTag = ref.source ? ` (${ref.source})` : "";
                const snippet = formatSnippet(ref.snippet);
                const lines = [
                  `${index + 1}. ${title}${sourceTag}`,
                  snippet ? `   • ${snippet}` : null,
                  ref.url ? `   ↗ ${ref.url}` : null,
                ].filter(Boolean);
                return lines.join("\n");
              })
              .join("\n\n")
          : "No matching web references were found.";

      const messageParts = [
        `📝 Search summary:\n> ${summaryLine}`,
        references.length > 0
          ? `🔗 Web references:\n${formattedReferences}`
          : "🔗 No matching web references were found.",
      ].filter(Boolean);

      updateMessageContent(placeholderId, messageParts.join("\n\n"));
    } catch (error: any) {
      updateMessageContent(
        placeholderId,
        `❌ ${error?.message || "Failed to fetch web references."}`
      );
    } finally {
      setIsFetchingReferences(false);
    }
  }, [
    appendAssistantMessage,
    documents,
    selectedDocumentId,
    updateMessageContent,
  ]);

  return useMemo(
    () => ({
      messages,
      input,
      setInput,
      isSending,
      canCompose,
      canSend,
      sendMessage,
      resetChat,
      appendAssistantMessage,
      updateMessageContent,
      fetchReferences,
      isFetchingReferences,
    }),
    [
      appendAssistantMessage,
      canCompose,
      canSend,
      input,
      isSending,
      isFetchingReferences,
      messages,
      resetChat,
      sendMessage,
      fetchReferences,
      updateMessageContent,
    ]
  );
}

