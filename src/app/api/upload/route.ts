import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from '@/lib/db';
import { embeddingConfig } from '@/lib/embeddings';
import { aiConfig } from '@/lib/ai';
import { pineconeConfig, getPineconeIndex } from '@/lib/pinecone';
import { Document as LangChainDocument } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { CohereEmbeddings } from "@langchain/cohere";
import { PineconeStore } from "@langchain/pinecone";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if embedding services are configured
  if (!embeddingConfig.hasApiKey) {
    return NextResponse.json(
      { 
        error: "Embedding service not configured",
        hint: "Please set COHERE_API_KEY in your .env file. Get a free key from dashboard.cohere.com"
      },
      { status: 500 }
    );
  }

  if (!pineconeConfig.hasApiKey) {
    return NextResponse.json(
      { 
        error: "Pinecone not configured",
        hint: "Please set PINECONE_API_KEY in your .env file. Get a free key from app.pinecone.io"
      },
      { status: 500 }
    );
  }

  try {
    // Lazy load file parsers to keep the edge bundle slim
    const { default: pdf } = await import("pdf-parse");
    const { default: mammoth } = await import("mammoth");
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    if (fileBuffer.length > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
    }

    const name = file.name || "";
    const safeName = name.trim() || "Untitled";
    const extension = safeName.split(".").pop()?.toLowerCase() || "";

    // Validate file type
    const supportedTypes = ["txt", "pdf", "docx"];
    if (!supportedTypes.includes(extension)) {
      return NextResponse.json({ 
        error: `Unsupported file type: .${extension}`,
        hint: `Supported formats: ${supportedTypes.map(t => `.${t}`).join(", ")}`
      }, { status: 400 });
    }

    // Extract text content
    let textContent = "";
    try {
      if (extension === "txt") {
        textContent = fileBuffer.toString("utf-8");
      } else if (extension === "pdf") {
        const data = await pdf(fileBuffer);
        textContent = data.text;
      } else if (extension === "docx") {
        const { value } = await mammoth.extractRawText({ buffer: fileBuffer });
        textContent = value;
      }
    } catch (parseError) {
      console.error("File parsing error:", parseError);
      return NextResponse.json({ 
        error: `Failed to parse ${extension.toUpperCase()} file`,
        hint: "Please ensure the file is not corrupted and try again."
      }, { status: 400 });
    }

    // Validate extracted content
    if (!textContent || textContent.trim().length < 50) {
      return NextResponse.json({ 
        error: "Document appears to be empty or too short",
        hint: "Please upload a document with substantial text content (at least 50 characters)."
      }, { status: 400 });
    }

    // Build LangChain documents + chunking
    const baseDocument = new LangChainDocument({
      pageContent: textContent,
      metadata: {
        fileName: safeName,
        fileType: extension,
        userId,
      },
    });

    // Use LangChain splitter so chunk sizing stays consistent with retrieval tooling
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const chunkDocuments = (await textSplitter.splitDocuments([baseDocument]))
      .map((doc: LangChainDocument) => new LangChainDocument({
        pageContent: doc.pageContent.trim(),
        metadata: {
          ...doc.metadata,
          userId,
          fileName: safeName,
          fileType: extension,
        },
      }))
      .filter((doc: LangChainDocument) => doc.pageContent.length >= 100);

    if (chunkDocuments.length === 0) {
      return NextResponse.json({
        error: "Unable to generate meaningful chunks from this document",
        hint: "Try uploading a document with denser text or adjust chunk settings.",
      }, { status: 400 });
    }

    // Create document + associated chunks atomically so we never have orphan records
    const result = await prisma.$transaction(async (tx) => {
      // Create the document
      const document = await tx.document.create({
        data: {
          title: safeName,
          fileName: safeName,
          fileType: extension,
          content: textContent,
          userId,
        },
      });

      // Generate chunks
      const createdChunks = [];
      for (const chunkDoc of chunkDocuments) {
        const createdChunk = await tx.chunk.create({
          data: {
            text: chunkDoc.pageContent,
            documentId: document.id
          }
        });
        createdChunks.push(createdChunk);
      }

      return { document, chunks: createdChunks };
    });

    // Generate embeddings and store in Pinecone
    try {
      if (result.chunks.length > 0) {
        console.log(`Generating embeddings for ${result.chunks.length} chunks via LangChain...`);

        const embeddingsClient = new CohereEmbeddings({
          apiKey: aiConfig.apiKey!,
          model: embeddingConfig.model,
        });

        const pineconeIndex = getPineconeIndex();
        const docsForIndex = result.chunks.map((chunk, index) => new LangChainDocument({
          pageContent: chunk.text,
          metadata: {
            ...(chunkDocuments[index]?.metadata ?? {}),
            chunkId: chunk.id,
            documentId: result.document.id,
            userId,
            fileName: safeName,
            chunkIndex: index,
            chunkLength: chunk.text.length,
            text: chunk.text.slice(0, 1000),
          },
        }));

        // Let LangChain handle batching + upserts so we stay in sync with retrieval metadata
        await PineconeStore.fromDocuments(docsForIndex, embeddingsClient, {
          pineconeIndex,
          namespace: `user-${userId}`,
        });
        console.log(`Stored ${result.chunks.length} embeddings in Pinecone`);
      }
    } catch (embeddingError) {
      console.error('Error generating/storing embeddings:', embeddingError);
      // Don't fail the entire upload if embeddings fail
      // The document and chunks are still saved in PostgreSQL
      
      // Return partial success with warning
      return NextResponse.json({
        message: "File processed with warnings",
        fileName: safeName,
        userId,
        contentPreview: textContent.slice(0, 300),
        chunksCreated: result.chunks.length,
        documentId: result.document.id,
        embeddingsGenerated: 0,
        warning: "Embeddings failed to generate. Document saved but search functionality limited.",
        error: embeddingError instanceof Error ? embeddingError.message : "Unknown embedding error"
      });
    }

    return NextResponse.json({
      message: "File processed successfully",
      fileName: safeName,
      userId,
      contentPreview: textContent.slice(0, 300),
      chunksCreated: result.chunks.length,
      documentId: result.document.id,
      embeddingsGenerated: result.chunks.length
    });
  } catch (error) {
    console.error("Processing error:", error);
    return NextResponse.json({ error: "Failed to process file" }, { status: 500 });
  }
}
