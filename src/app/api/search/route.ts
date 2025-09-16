// Semantic search API - Find relevant document chunks based on user queries
import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateQueryEmbedding } from "@/lib/embeddings";
import { searchSimilar } from "@/lib/pinecone";

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { query, topK = 5, documentId } = await req.json();

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return NextResponse.json(
        { error: "Query is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    // Generate embedding for the search query
    console.log(`Searching for: "${query}"`);
    const queryEmbedding = await generateQueryEmbedding(query.trim());

    // Search for similar chunks in Pinecone
    const searchResults = await searchSimilar(queryEmbedding, {
      topK,
      userId, // Only search user's documents
      documentId, // Optional: limit to specific document
    });

    if (searchResults.length === 0) {
      return NextResponse.json({
        results: [],
        message: "No relevant content found in your documents.",
      });
    }

    // Fetch full chunk details from database
    const chunkIds = searchResults.map(result => result.chunkId);
    const chunks = await prisma.chunk.findMany({
      where: {
        id: { in: chunkIds },
        document: { userId } // Double-check user ownership
      },
      include: {
        document: {
          select: {
            id: true,
            title: true,
            fileName: true,
            fileType: true,
          }
        }
      }
    });

    // Combine search results with database data
    const enrichedResults = searchResults
      .map(searchResult => {
        const chunk = chunks.find(c => c.id === searchResult.chunkId);
        if (!chunk) return null;

        return {
          chunkId: chunk.id,
          score: searchResult.score,
          text: chunk.text,
          document: chunk.document,
          relevanceScore: Math.round(searchResult.score * 100) / 100, // Round for readability
        };
      })
      .filter(Boolean) // Remove null entries
      .sort((a, b) => b!.score - a!.score); // Sort by relevance

    console.log(`Found ${enrichedResults.length} relevant chunks`);

    return NextResponse.json({
      query,
      results: enrichedResults,
      totalFound: enrichedResults.length,
    });

  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { 
        error: "Search failed",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
