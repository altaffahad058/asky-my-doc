import { MutableRefObject } from "react";
import type { ChatMessage } from "@/hooks/useChat";

type ChatPaneProps = {
  messages: ChatMessage[];
  listRef: MutableRefObject<HTMLDivElement | null>;
  input: string;
  onInputChange: (value: string) => void;
  isSending: boolean;
  canCompose: boolean;
  canSend: boolean;
  onSend: (e?: React.FormEvent) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onResetChat: () => void;
};

export function ChatPane({
  messages,
  listRef,
  input,
  onInputChange,
  isSending,
  canCompose,
  canSend,
  onSend,
  onKeyDown,
  onResetChat,
}: ChatPaneProps) {
  return (
    <div className="md:col-span-8 order-1 md:order-none">
      <div className="panel flex h-[578px] flex-col">
        <div className="sticky top-0 z-10 -mx-6 -mt-6 mb-3 border-b border-neutral-200 bg-white px-6 py-4 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Chat</p>
            <button
              className="text-sm underline-offset-4 hover:underline text-cyan-500"
              type="button"
              onClick={onResetChat}
            >
              New chat
            </button>
          </div>
        </div>

        <div
          ref={listRef}
          className="flex-1 space-y-3 overflow-y-auto no-scrollbar pr-1"
        >
          {messages.map((m) => (
            <div
              key={m.id}
              className={
                m.role === "user" ? "flex justify-end" : "flex justify-start"
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
                    <p className="whitespace-pre-wrap break-all">{m.content}</p>
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

        <form onSubmit={onSend} className="mt-3 flex flex-col gap-2">
          <textarea
            className="input min-h-[70px] flex-1 resize-none overflow-y-auto no-scrollbar"
            placeholder="Lets Start..."
            rows={1}
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
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
  );
}

