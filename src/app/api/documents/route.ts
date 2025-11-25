import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const documents = await prisma.document.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        fileName: true,
        fileType: true,
        createdAt: true,
        _count: {
          select: { chunks: true },
        },
      },
    });

    return NextResponse.json({
      documents: documents.map((doc) => ({
        id: doc.id,
        title: doc.title,
        fileName: doc.fileName,
        fileType: doc.fileType,
        createdAt: doc.createdAt,
        chunkCount: doc._count.chunks,
      })),
    });
  } catch (error) {
    console.error("Documents route error:", error);
    return NextResponse.json(
      {
        error: "Failed to load documents",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

