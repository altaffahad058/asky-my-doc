import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from '@/lib/db';
import { chunkText } from '@/lib/chunking';
import { generateEmbeddings, embeddingConfig } from '@/lib/embeddings';
import { storeEmbeddings, pineconeConfig } from '@/lib/pinecone';

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

    // Create document and chunks in a transaction
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
      const chunks = chunkText(textContent, {
        chunkSize: 1000,
        overlap: 200,
        minChunkSize: 100
      });

      // Create chunks in database (no embedding field needed now)
      const createdChunks = [];
      if (chunks.length > 0) {
        for (const chunk of chunks) {
          const createdChunk = await tx.chunk.create({
            data: {
              text: chunk.text,
              documentId: document.id
            }
          });
          createdChunks.push(createdChunk);
        }
      }

      return { document, chunks: createdChunks };
    });

    // Generate embeddings and store in Pinecone
    try {
      if (result.chunks.length > 0) {
        console.log(`Generating embeddings for ${result.chunks.length} chunks...`);
        
        const chunkTexts = result.chunks.map(chunk => chunk.text);
        const embeddings = await generateEmbeddings(chunkTexts);
        
        // Prepare embeddings for Pinecone
        const embeddingsToStore = embeddings.map((embedding, index) => ({
          chunkId: result.chunks[index].id,
          embedding: embedding.embedding,
          metadata: {
            chunkId: result.chunks[index].id,
            documentId: result.document.id,
            userId,
            text: embedding.text,
            chunkLength: embedding.text.length,
          }
        }));
        
        // Store in Pinecone
        await storeEmbeddings(embeddingsToStore);
        console.log(`Stored ${embeddings.length} embeddings in Pinecone`);
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
