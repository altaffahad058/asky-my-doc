import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from '@/lib/db';

export const runtime = "nodejs";

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    let textContent = "";
    if (extension === "txt") {
      textContent = fileBuffer.toString("utf-8");
    } else if (extension === "pdf") {
      const data = await pdf(fileBuffer);
      textContent = data.text;
    } else if (extension === "docx") {
      const { value } = await mammoth.extractRawText({ buffer: fileBuffer });
      textContent = value;
    } else {
      return NextResponse.json({ error: `Unsupported file type: ${extension}` }, { status: 400 });
    }

    await prisma.document.create({
      data: {
        title: safeName,
        fileName: safeName,
        fileType: extension,
        content: textContent,
        userId,
      },
    });

    return NextResponse.json({
      message: "File processed successfully",
      fileName: safeName,
      userId,
      contentPreview: textContent.slice(0, 300),
    });
  } catch (error) {
    console.error("Processing error:", error);
    return NextResponse.json({ error: "Failed to process file" }, { status: 500 });
  }
}
