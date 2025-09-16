// Cohere Configuration (for chat and embeddings)
const COHERE_API_KEY = process.env.COHERE_API_KEY;
const COHERE_API_BASE = process.env.COHERE_API_BASE ?? "https://api.cohere.ai/v1";
const COHERE_CHAT_MODEL = process.env.COHERE_CHAT_MODEL ?? "command-r";
const COHERE_EMBED_MODEL = process.env.COHERE_EMBED_MODEL ?? "embed-english-v3.0";

if (!COHERE_API_KEY) {
  throw new Error("⚠️ Missing COHERE_API_KEY in .env file. Get a free key from dashboard.cohere.com");
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export async function chatRequest(
  message: string,
  options: ChatOptions = {}
): Promise<string> {
  const {
    maxTokens = 500,
    temperature = 0.7,
    systemPrompt = "You are a helpful AI assistant for a document Q&A system. Be concise and helpful."
  } = options;

  try {
    const response = await fetch(`${COHERE_API_BASE}/chat`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${COHERE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: COHERE_CHAT_MODEL,
        message: message,
        preamble: systemPrompt,
        max_tokens: maxTokens,
        temperature,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Cohere chat API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data.text || "⚠️ No response generated";
  } catch (error) {
    console.error("Cohere chat failed:", error);
    throw error;
  }
}

// Export configuration for debugging
export const aiConfig = {
  chatModel: COHERE_CHAT_MODEL,
  embedModel: COHERE_EMBED_MODEL,
  apiBase: COHERE_API_BASE,
  hasApiKey: Boolean(COHERE_API_KEY),
  keyPreview: COHERE_API_KEY ? `${COHERE_API_KEY.substring(0, 8)}...` : "NOT_SET"
};

// Export shared constants for use in other modules
export { COHERE_API_KEY, COHERE_API_BASE, COHERE_EMBED_MODEL };
