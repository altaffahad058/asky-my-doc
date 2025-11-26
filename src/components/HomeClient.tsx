"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useDocuments } from "@/hooks/useDocuments";
import { useChat } from "@/hooks/useChat";
import { HomeHeader } from "./home/HomeHeader";
import { DocumentList } from "./home/DocumentList";
import { ChatPane } from "./home/ChatPane";
import { UploadCard } from "./home/UploadCard";

type HomeClientProps = {
  userFullName?: string;
};

export default function HomeClient({ userFullName }: HomeClientProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
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
  } = useChat({ selectedDocumentId, documents });

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
        <HomeHeader loggingOut={loggingOut} onLogout={onLogout} />

        {/* Main Content */}
        <section className="grid gap-6 md:grid-cols-12">
          {/* Left: Upload and Document List (4 cols) */}
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
            />
          </div>
          {/* Right: Chat (8 cols) */}
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
          />
        </section>
      </div>
    </div>
  );
}
