import { chatRequest } from "./ai";

type SummarizeArgs = {
  content: string;
  fallback: string;
};

export async function summarizeDocumentOneLiner({
  content,
  fallback,
}: SummarizeArgs): Promise<string> {
  const trimmedContent = content?.trim();
  if (!trimmedContent) {
    return fallback;
  }

  const promptContent = trimmedContent.slice(0, 4000);
  const prompt = `Summarize the following document in a single short sentence (max 25 words) that highlights what the document is about. Avoid marketing language and just state the subject matter.

Document content:
${promptContent}`;

  const summary = await chatRequest(prompt, {
    maxTokens: 80,
    temperature: 0.3,
    systemPrompt:
      "You distill long documents into a single short descriptive sentence that can be used as a search query.",
  });

  return summary.trim() || fallback;
}

