// src/app/api/chat/route.ts
import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { chatRequest, aiConfig } from "@/lib/ai";
import { generateQueryEmbedding } from "@/lib/embeddings";
import { searchSimilar } from "@/lib/pinecone";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { message } = await req.json();

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json(
        { error: "Message is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    // Check if AI is configured
    if (!aiConfig.hasApiKey) {
      return NextResponse.json(
        { 
          error: "AI API key not configured",
          hint: "Please set COHERE_API_KEY in your .env file. Get a free key from dashboard.cohere.com"
        },
        { status: 500 }
      );
    }

    // Search for relevant document chunks
    let contextChunks = [];
    let systemPrompt = "You are a helpful AI assistant. Be concise and helpful.";
    
    try {
      console.log(`Searching for context: "${message}"`);
      
      // Generate embedding for the user's message
      const queryEmbedding = await generateQueryEmbedding(message.trim());
      
      // Search for relevant chunks (top 3 for context)
      const searchResults = await searchSimilar(queryEmbedding, {
        topK: 3,
        userId,
      });

      if (searchResults.length > 0) {
        // Fetch full chunk details
        const chunkIds = searchResults.map(result => result.chunkId);
        const chunks = await prisma.chunk.findMany({
          where: {
            id: { in: chunkIds },
            document: { userId }
          },
          include: {
            document: {
              select: { title: true, fileName: true }
            }
          }
        });

        // Build context from relevant chunks
        contextChunks = chunks.map(chunk => ({
          text: chunk.text,
          document: chunk.document.title,
          score: searchResults.find(r => r.chunkId === chunk.id)?.score || 0
        }));

        // Create enhanced system prompt with context
        const contextText = contextChunks
          .map((chunk, index) => `[Document: ${chunk.document}]\n${chunk.text}`)
          .join('\n\n---\n\n');

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
        systemPrompt = "You are a helpful AI assistant. The user has uploaded documents but none appear relevant to their current question. Be concise and helpful. You may suggest they upload more relevant documents or rephrase their question.";
      }
    } catch (searchError) {
      console.error("Context search failed:", searchError);
      // Continue without context if search fails
    }

    // Call AI with context-aware prompt
    const reply = await chatRequest(message, {
      maxTokens: 700,
      temperature: 0.7,
      systemPrompt
    });

    return NextResponse.json({ 
      reply,
      contextUsed: contextChunks.length > 0,
      sourcesCount: contextChunks.length 
    });
  } catch (err: any) {
    console.error("Chat route error:", err);
    return NextResponse.json(
      { error: err.message ?? "Server error while processing chat" },
      { status: 500 }
    );
  }
}
