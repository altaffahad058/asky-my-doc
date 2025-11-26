import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fetchWebReferences } from "@/lib/references";
import { summarizeDocumentOneLiner } from "@/lib/summaries";

type RequestBody = {
  query?: string;
  limit?: number;
};

export async function POST(
  req: Request,
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

  const document = await prisma.document.findFirst({
    where: { id: documentId, userId },
    select: {
      id: true,
      title: true,
      fileName: true,
      content: true,
      updatedAt: true,
    },
  });

  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  let body: RequestBody = {};
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    body = {};
  }

  const rawQuery =
    typeof body.query === "string" ? body.query.trim() : undefined;
  const limit =
    typeof body.limit === "number" && Number.isFinite(body.limit)
      ? Math.min(Math.max(Math.trunc(body.limit), 1), 8)
      : 5;

  let derivedQuery = rawQuery;
  let summaryText: string | null = null;

  if (!derivedQuery || derivedQuery.length === 0) {
    const fallback = document.title?.trim() || document.fileName;

    if (!document.content || !fallback) {
      return NextResponse.json(
        {
          error:
            "Unable to derive a search query for this document. Provide a `query` in the request body.",
        },
        { status: 400 }
      );
    }

    summaryText = await summarizeDocumentOneLiner({
      content: document.content,
      fallback,
    });

    derivedQuery = summaryText;
  }

  try {
    const references = await fetchWebReferences({
      query: derivedQuery,
      limit,
    });

    return NextResponse.json({
      documentId: document.id,
      queryUsed: derivedQuery,
      querySummary: summaryText ?? derivedQuery,
      references,
    });
  } catch (error: any) {
    console.error("References route error:", error);
    const message =
      error?.message || "Failed to fetch references for this document.";
    const status = message.includes("TAVILY_API_KEY") ? 500 : 502;

    return NextResponse.json({ error: message }, { status });
  }
}

