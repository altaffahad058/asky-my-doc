import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPineconeIndex, pineconeConfig } from "@/lib/pinecone";
import { embeddingConfig } from "@/lib/embeddings";
import { aiConfig } from "@/lib/ai";
import { CohereEmbeddings } from "@langchain/cohere";
import { PineconeStore } from "@langchain/pinecone";

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const userId = await getSessionUserId();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const documentId = Number(id);
  if (!Number.isFinite(documentId)) {
    return NextResponse.json(
      { error: "Invalid document id" },
      { status: 400 }
    );
  }

  try {
    // Ensure the document exists and belongs to the current user
    const existing = await prisma.document.findFirst({
      where: { id: documentId, userId },
      select: { id: true, fileName: true, title: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Delete chunks + document in a single transaction
    const result = await prisma.$transaction(async (tx) => {
      const deletedChunks = await tx.chunk.deleteMany({
        where: { documentId: documentId },
      });

      const deletedDoc = await tx.document.delete({
        where: { id: documentId },
      });

      return {
        deletedChunksCount: deletedChunks.count,
        deletedDocumentId: deletedDoc.id,
      };
    });

    // Best-effort deletion from Pinecone based on metadata
    let embeddingsDeleted: boolean | null = null;
    if (pineconeConfig.hasApiKey) {
      try {
        const index = getPineconeIndex();

        // Reuse LangChain's PineconeStore so metadata filters stay consistent
        const embeddingsClient = new CohereEmbeddings({
          apiKey: aiConfig.apiKey!,
          model: embeddingConfig.model,
        });

        const store = await PineconeStore.fromExistingIndex(embeddingsClient, {
          pineconeIndex: index,
          namespace: `user-${userId}`,
        });

        await store.delete({
          filter: { documentId },
        });
        embeddingsDeleted = true;
      } catch (error) {
        console.error(
          "Failed to delete embeddings from Pinecone for document",
          documentId,
          error
        );
        embeddingsDeleted = false;
      }
    }

    return NextResponse.json({
      message: "Document deleted",
      documentId: result.deletedDocumentId,
      chunksDeleted: result.deletedChunksCount,
      embeddingsDeleted,
    });
  } catch (error) {
    console.error("Delete document route error:", error);
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    );
  }
}


