// src/app/api/chat/route.ts
import { NextResponse } from "next/server";
import { chatRequest, aiConfig } from "@/lib/ai";

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    // Check if AI is configured
    if (!aiConfig.hasApiKey) {
      return NextResponse.json(
        { 
          error: "AI API key not configured",
          hint: "Please set GROQ_API_KEY in your .env file. Get a free key from console.groq.com"
        },
        { status: 500 }
      );
    }


    // Call AI using the centralized client
    const reply = await chatRequest(message, {
      maxTokens: 500,
      temperature: 0.7,
      systemPrompt: "You are a helpful AI assistant for a document Q&A system. Be concise and helpful."
    });

    return NextResponse.json({ reply });
  } catch (err: any) {
    console.error("Chat route error:", err);
    return NextResponse.json(
      { error: err.message ?? "Server error while processing chat" },
      { status: 500 }
    );
  }
}
