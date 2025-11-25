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
        "Welcome to Ask My Doc! Upload your notes, articles, or books and ask questions. I'll answer based on your documents.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);

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
    }),
    [
      appendAssistantMessage,
      canCompose,
      canSend,
      input,
      isSending,
      messages,
      resetChat,
      sendMessage,
      updateMessageContent,
    ]
  );
}

