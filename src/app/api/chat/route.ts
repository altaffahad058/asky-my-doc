// src/app/api/chat/route.ts
import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { chatRequest, aiConfig } from "@/lib/ai";
import { embeddingConfig } from "@/lib/embeddings";
import { getPineconeIndex, pineconeConfig } from "@/lib/pinecone";
import { CohereEmbeddings } from "@langchain/cohere";
import { PineconeStore } from "@langchain/pinecone";

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { message } = await req.json();

    if (
      !message ||
      typeof message !== "string" ||
      message.trim().length === 0
    ) {
      return NextResponse.json(
        { error: "Message is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    // Check if AI + vector services are configured
    if (!aiConfig.hasApiKey) {
      return NextResponse.json(
        {
          error: "AI API key not configured",
          hint: "Please set COHERE_API_KEY in your .env file. Get a free key from dashboard.cohere.com",
        },
        { status: 500 }
      );
    }

    if (!embeddingConfig.hasApiKey) {
      return NextResponse.json(
        {
          error: "Embedding service not configured",
          hint: "Please set COHERE_API_KEY in your .env file. Get a free key from dashboard.cohere.com",
        },
        { status: 500 }
      );
    }

    if (!pineconeConfig.hasApiKey) {
      return NextResponse.json(
        {
          error: "Pinecone not configured",
          hint: "Please set PINECONE_API_KEY in your .env file. Get a free key from app.pinecone.io",
        },
        { status: 500 }
      );
    }

    // Search for relevant document chunks
    let contextChunks = [];
    let systemPrompt =
      "You are a helpful AI assistant. Be concise and helpful.";

    try {
      console.log(`Searching for context: "${message}"`);
      const trimmedMessage = message.trim();

      const embeddingsClient = new CohereEmbeddings({
        apiKey: process.env.COHERE_API_KEY!,
        model: process.env.COHERE_EMBED_MODEL ?? "embed-english-v3.0",
      });

      const pineconeIndex = getPineconeIndex();
      const vectorStore = await PineconeStore.fromExistingIndex(
        embeddingsClient,
        {
          pineconeIndex,
          namespace: `user-${userId}`,
        }
      );

      // Search for relevant chunks (top 3 for context)
      const searchResults = await vectorStore.similaritySearchWithScore(
        trimmedMessage,
        3
      );

      if (searchResults.length > 0) {
        // Build context from relevant chunks
        contextChunks = searchResults.map(([doc, score]) => ({
          text: doc.pageContent,
          document:
            (doc.metadata?.fileName as string) ??
            (doc.metadata?.title as string) ??
            "Document",
          score,
        }));

        // Create enhanced system prompt with context
        const contextText = contextChunks
          .map((chunk, index) => `[Document: ${chunk.document}]\n${chunk.text}`)
          .join("\n\n---\n\n");

        systemPrompt = `You are an AI assistant that answers questions based on the user's uploaded documents. Use the following document excerpts to answer the user's question. If the answer isn't in the provided context, say so clearly.

DOCUMENT CONTEXT:
${contextText}

Instructions:
- Answer based primarily on the provided document context
- Be concise and helpful
- If the context doesn't contain relevant information, say "I don't find relevant information in your uploaded documents to answer this question."
- When referencing information, you can mention which document it came from`;

        console.log(`Found ${contextChunks.length} relevant chunks for context`);
      } else {
        console.log("No relevant document context found");
        systemPrompt =
          "You are a helpful AI assistant. The user has uploaded documents but none appear relevant to their current question. Be concise and helpful. You may suggest they upload more relevant documents or rephrase their question.";
      }
    } catch (searchError) {
      console.error("Context search failed:", searchError);
      // Continue without context if search fails
    }

    // Call AI with context-aware prompt
    const reply = await chatRequest(message, {
      maxTokens: 700,
      temperature: 0.7,
      systemPrompt,
    });

    return NextResponse.json({
      reply,
      contextUsed: contextChunks.length > 0,
      sourcesCount: contextChunks.length,
    });
  } catch (err: any) {
    console.error("Chat route error:", err);
    return NextResponse.json(
      { error: err.message ?? "Server error while processing chat" },
      { status: 500 }
    );
  }
}
