"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type Message = { id: string; role: "user" | "assistant"; content: string };
type DocumentSummary = {
  id: number;
  title: string;
  fileName: string;
  fileType: string;
  createdAt: string;
  chunkCount: number;
};

export default function HomeClient() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome-1",
      role: "assistant",
      content:
        "Welcome to Ask My Doc! Upload your notes, articles, or books and ask questions. I'll answer based on your documents.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>("");

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
    } finally {
      setDocumentsLoading(false);
    }
  }, []);

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

  async function onLogout(e: React.FormEvent) {
    e.preventDefault();
    try {
      setLoggingOut(true);
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
    } finally {
      setLoggingOut(false);
    }
  }

  function scrollToBottom() {
    const el = listRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }

  useEffect(() => {
    scrollToBottom();
  }, [messages.length]);

  function resetChat() {
    setMessages([
      {
        id: "welcome-1",
        role: "assistant",
        content:
          "New chat started. Ask anything about your uploaded documents.",
      },
    ]);
  }

  const canCompose = selectedDocumentId.trim().length > 0;
  const canSend =
    canCompose && !isSending && input.trim().length > 0;

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const inputEl = e.currentTarget;
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const isValid = Array.from(files).every((file) => {
      const name = file.name.toLowerCase();
      return (
        name.endsWith(".txt") || name.endsWith(".pdf") || name.endsWith(".docx")
      );
    });

    if (!isValid) {
      alert("Only .txt, .pdf or .docx files are allowed.");
      if (inputEl) inputEl.value = "";
      return;
    }

    const file = files[0];
    try {
      setIsUploading(true);
      const uploadingId = crypto.randomUUID();
      setMessages((prev) => [
        ...prev,
        {
          id: uploadingId,
          role: "assistant",
          content: "📂 Uploading your file…",
        },
      ]);
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json().catch(() => ({} as any));
      if (!response.ok) {
        const errorMessage =
          (data && (data.error || data.message)) || "Upload failed";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === uploadingId
              ? {
                  ...m,
                  content: `❌ Upload error: ${errorMessage}`,
                }
              : m
          )
        );
        scrollToBottom();
        return;
      }

      const fileName = data?.fileName ?? file.name;
      const preview = data?.contentPreview ?? "(no preview available)";
      const chunksCreated = data?.chunksCreated ?? 0;

      await loadDocuments();
      setMessages((prev) =>
        prev.map((m) =>
          m.id === uploadingId
            ? {
                ...m,
                content: [
                  `✅ File processed successfully!`,
                  `📄 File: ${fileName}`,
                  `🧩 Text chunks created: ${chunksCreated}`,
                  "",
                  `Preview:`,
                  "```",
                  preview,
                  "```",
                ].join("\n"),
              }
            : m
        )
      );
      if (data?.documentId) {
        setSelectedDocumentId(String(data.documentId));
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.content === "📂 Uploading your file…"
            ? {
                ...m,
                content: "❌ Unexpected error during upload. Please try again.",
              }
            : m
        )
      );
    } finally {
      setIsUploading(false);
      if (inputEl) inputEl.value = "";
    }
  }

  async function onSend(e?: React.FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text) return;
    const documentIdPayload =
      selectedDocumentId.trim().length > 0
        ? Number(selectedDocumentId)
        : undefined;
    if (documentIdPayload == null || Number.isNaN(documentIdPayload)) {
      const assistantErr: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          "ℹ️ Please select a document from the sidebar before asking a question.",
      };
      setMessages((prev) => [...prev, assistantErr]);
      return;
    }

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };
    setInput("");
    setMessages((prev) => [...prev, userMsg]);

    // Send to backend and surface any server error messages to the chat
    try {
      setIsSending(true);
      // 🔹 Call your backend API route
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
        const serverError = data?.error || data?.message || `Request failed (${res.status})`;
        const assistantErr: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `❌ ${serverError}`,
        };
        setMessages((prev) => [...prev, assistantErr]);
        return;
      }

      const replyText = data?.reply || "⚠️ No response from API.";
      const contextUsed = data?.contextUsed || false;
      const sourcesCount = data?.sourcesCount || 0;
      
      // Add context indicator if document context was used
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

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: replyText + contextIndicator,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error(err);
      const assistantErr: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `❌ ${err?.message || "Network error contacting backend."}`,
      };
      setMessages((prev) => [...prev, assistantErr]);
    } finally {
      setIsSending(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }

  return (
    <div className="flex w-full flex-col gap-8">
      {/* App Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-black text-white dark:bg-white dark:text-black">
            A
          </div>
          <div>
            <p className="text-base font-semibold">
              AskMyDocs: AI-Powered Knowledge Explorer
            </p>
            <p className="muted">Ask questions about your documents</p>
          </div>
        </div>
        <form onSubmit={onLogout}>
          <button
            className="button cursor-pointer"
            type="submit"
            disabled={loggingOut}
          >
            {loggingOut ? "Logging out…" : "Log out"}
          </button>
        </form>
      </header>

      {/* Main Content */}
      <section className="grid gap-6 md:grid-cols-12">
        {/* Left: Chat (8 cols) */}
        <div className="md:col-span-8 order-1 md:order-none">
          <div className="panel flex h-[578px] flex-col">
            {/* Chat sticky header */}
            <div className="sticky top-0 z-10 -mx-6 -mt-6 mb-3 border-b border-neutral-200 bg-white px-6 py-4 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Chat</p>
                <button
                  className="text-sm underline-offset-4 hover:underline text-cyan-500"
                  type="button"
                  onClick={resetChat}
                >
                  New chat
                </button>
              </div>
            </div>

            {/* Messages */}
            <div
              ref={listRef}
              className="flex-1 space-y-3 overflow-y-auto no-scrollbar pr-1"
            >
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={
                    m.role === "user"
                      ? "flex justify-end"
                      : "flex justify-start"
                  }
                >
                  <div className="flex max-w-[85%] items-start gap-2">
                    {m.role === "assistant" ? (
                      <div className="mt-1 h-6 w-6 shrink-0 rounded-full bg-neutral-200 text-center text-[10px] leading-6 dark:bg-neutral-700">
                        🤖
                      </div>
                    ) : null}
                    <div
                      className={
                        "rounded-2xl px-3 py-2 text-sm break-all " +
                        (m.role === "user"
                          ? "bg-black text-white dark:bg-white dark:text-black"
                          : "bg-neutral-100 dark:bg-neutral-800")
                      }
                    >
                      {m.role === "assistant" && m.content.includes("```") ? (
                        <div className="space-y-2">
                          {m.content.split("```").map((segment, idx) =>
                            idx % 2 === 1 ? (
                              <pre
                                key={idx}
                                className="rounded-md bg-neutral-200 p-2 text-[12px] leading-relaxed dark:bg-neutral-700 whitespace-pre-wrap break-all overflow-x-hidden"
                              >
                                {segment}
                              </pre>
                            ) : (
                              <p
                                key={idx}
                                className="whitespace-pre-wrap break-all"
                              >
                                {segment}
                              </p>
                            )
                          )}
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap break-all">
                          {m.content}
                        </p>
                      )}
                    </div>
                    {m.role === "user" ? (
                      <div className="mt-1 h-6 w-6 shrink-0 rounded-full bg-neutral-200 text-center text-[10px] leading-6 dark:bg-neutral-700">
                        👤
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            {/* Composer: buttons below input */}
            <form onSubmit={onSend} className="mt-3 flex flex-col gap-2">
              <textarea
                className="input min-h-[70px] flex-1 resize-none overflow-y-auto no-scrollbar"
                placeholder="Lets Start..."
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                disabled={isSending || !canCompose}
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  className="button w-auto"
                  type="submit"
                  disabled={!canSend}
                >
                  {isSending ? "Sending…" : "➤"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right: Info (4 cols) */}
        <div className="md:col-span-4 order-2 md:order-none flex flex-col gap-6">
          <div className="card">
            <h1 className="text-2xl">Welcome to Ask My Doc</h1>
            <p className="muted mt-2">
              Upload text documents like notes, articles, or books. Then chat to
              extract insights, summarize sections, find references, or get
              direct answers grounded in your content.
            </p>
            <div className="mt-4 flex items-center gap-3">
              {/* 
                File upload input is hidden. Ref is used to programmatically trigger click when user presses the button.
                Only files of type .txt, .pdf, or .docx are accepted.
                When a file is selected, onFileChange handles the upload logic.
              */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.pdf,.docx"
                onChange={onFileChange}
                className="hidden"
              />
              {/* 
                Upload button opens the file picker via ref.
                Disabled and shows "Uploading…" if an upload is in progress.
                Otherwise, shows "Upload document". 
              */}
              <button
                type="button"
                className="button cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? "Uploading…" : "Upload document"}
              </button>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Your documents</h2>
              <button
                type="button"
                className="text-sm underline-offset-4 hover:underline text-cyan-500"
                onClick={loadDocuments}
                disabled={documentsLoading}
              >
                {documentsLoading ? "Refreshing…" : "Refresh"}
              </button>
            </div>
            {documentsLoading ? (
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
                      onClick={() => setSelectedDocumentId(String(doc.id))}
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
        </div>
      </section>
    </div>
  );
}
