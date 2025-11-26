"use client";

import { useEffect, useRef } from "react";
import { useDocuments } from "@/hooks/useDocuments";
import { useChat } from "@/hooks/useChat";
import { useAuth } from "@/hooks/useAuth";
import { HomeHeader } from "./home/HomeHeader";
import { DocumentList } from "./home/DocumentList";
import { ChatPane } from "./home/ChatPane";
import { UploadCard } from "./home/UploadCard";

type HomeClientProps = {
  userFullName?: string;
};

export default function HomeClient({ userFullName }: HomeClientProps) {
  const { logout, isLoggingOut } = useAuth();
  const listRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    documents,
    documentsLoading,
    selectedDocumentId,
    setSelectedDocumentId,
    loadDocuments,
    isUploading,
    uploadDocument,
    deleteDocument,
  } = useDocuments();
  const {
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
  } = useChat({ selectedDocumentId, documents });

  async function onLogout(e: React.FormEvent) {
    e.preventDefault();
    await logout();
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

  async function handleDeleteDocument(documentId: number) {
    const doc = documents.find((d) => d.id === documentId);
    const label = doc?.title || doc?.fileName || `Document ${documentId}`;
    const messageId = appendAssistantMessage(
      `🗑️ Deleting "${label}" and its chunks…`
    );

    const ok = await deleteDocument(documentId);

    updateMessageContent(
      messageId,
      ok
        ? `✅ Deleted "${label}" and its chunks.\n\nEmbeddings in the vector database were also deleted.`
        : `❌ Failed to delete "${label}". Please try again later.`
    );
  }

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
      const uploadingId = appendAssistantMessage("📂 Uploading your file…");
      try {
        const { fileName, preview, chunksCreated } = await uploadDocument(file);
        updateMessageContent(
          uploadingId,
          [
            `✅ File processed successfully!`,
            `📄 File: ${fileName}`,
            `🧩 Text chunks created: ${chunksCreated}`,
            "",
            `Preview:`,
            "```",
            preview,
            "```",
          ].join("\n")
        );
      } catch (err: any) {
        const errorMessage =
          err?.message || "Unexpected error during upload. Please try again.";
        updateMessageContent(uploadingId, `❌ Upload error: ${errorMessage}`);
      } finally {
        scrollToBottom();
      }
    } finally {
      if (inputEl) inputEl.value = "";
    }
  }

  function onSend(e?: React.FormEvent) {
    e?.preventDefault();
    sendMessage();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="flex w-full justify-center">
      <div className="flex w-full max-w-6xl flex-col gap-8">
        <HomeHeader loggingOut={isLoggingOut} onLogout={onLogout} />

        {/* Main Content */}
        <section className="grid w-full gap-6 md:grid-cols-12">
          {/* Chat (8 cols) */}
          <ChatPane
            messages={messages}
            listRef={listRef}
            input={input}
            onInputChange={setInput}
            isSending={isSending}
            canCompose={canCompose}
            canSend={canSend}
            onSend={onSend}
            onKeyDown={onKeyDown}
            onResetChat={resetChat}
            onFetchReferences={fetchReferences}
            canFetchReferences={canCompose && !isFetchingReferences}
            isFetchingReferences={isFetchingReferences}
          />

          {/* Sidebar (4 cols) */}
          <div className="md:col-span-4 order-2 md:order-none flex flex-col gap-6">
            <UploadCard
              fileInputRef={fileInputRef}
              isUploading={isUploading}
              onFileChange={onFileChange}
              userFullName={userFullName}
            />
            <DocumentList
              documents={documents}
              selectedDocumentId={selectedDocumentId}
              onSelect={setSelectedDocumentId}
              loading={documentsLoading}
              onRefresh={loadDocuments}
              onDelete={handleDeleteDocument}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
