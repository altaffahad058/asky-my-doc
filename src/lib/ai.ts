const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL ?? "llama-3.1-8b-instant";
const GROQ_API_BASE = process.env.GROQ_API_BASE ?? "https://api.groq.com/openai/v1";

if (!GROQ_API_KEY) {
  throw new Error("⚠️ Missing GROQ_API_KEY in .env file");
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

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: systemPrompt
    },
    {
      role: "user",
      content: message
    }
  ];

  const response = await fetch(`${GROQ_API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      max_tokens: maxTokens,
      temperature,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const reply = data.choices?.[0]?.message?.content || "⚠️ No response generated";
  
  return reply;
}

export async function chatRequestWithHistory(
  messages: ChatMessage[],
  options: ChatOptions = {}
): Promise<string> {
  const {
    maxTokens = 500,
    temperature = 0.7,
  } = options;

  const response = await fetch(`${GROQ_API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      max_tokens: maxTokens,
      temperature,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const reply = data.choices?.[0]?.message?.content || "⚠️ No response generated";
  
  return reply;
}

// For future document processing - embeddings function
export async function generateEmbedding(text: string): Promise<number[]> {
  // Note: Groq doesn't have embeddings API yet
  // This is a placeholder for when you add embeddings later
  // You might use OpenAI, Cohere, or local embeddings
  throw new Error("Embeddings not yet implemented - will be added for document processing");
}

// Export configuration for debugging
export const aiConfig = {
  model: GROQ_MODEL,
  apiBase: GROQ_API_BASE,
  hasApiKey: Boolean(GROQ_API_KEY),
  keyPreview: GROQ_API_KEY ? `${GROQ_API_KEY.substring(0, 8)}...` : "NOT_SET"
};
