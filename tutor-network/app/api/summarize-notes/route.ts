import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT =
  "You summarize tutoring session notes. Output a clear, concise overview: main topics covered, key points, and any action items or follow-ups. Use plain text, no markdown headers.";

async function callGroq(content: string, apiKey: string) {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Summarize these session notes:\n\n${content}` },
      ],
      max_tokens: 500,
    }),
  });
  return response;
}

async function callOpenAI(content: string, apiKey: string) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Summarize these session notes:\n\n${content}` },
      ],
      max_tokens: 500,
    }),
  });
  return response;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const content = typeof body?.content === "string" ? body.content : "";

    if (!content.trim()) {
      return NextResponse.json(
        { error: "No content to summarize", summary: null },
        { status: 400 }
      );
    }

    const groqKey = process.env.GROQ_API_KEY?.trim();
    const openaiKey = process.env.OPENAI_API_KEY?.trim();

    // Prefer Groq (free tier); fallback to OpenAI
    let response: Response;
    let provider: string;

    if (groqKey) {
      response = await callGroq(content, groqKey);
      provider = "Groq";
    } else if (openaiKey) {
      response = await callOpenAI(content, openaiKey);
      provider = "OpenAI";
    } else {
      return NextResponse.json(
        {
          error:
            "No API key. Add GROQ_API_KEY (free at console.groq.com) or OPENAI_API_KEY to .env.local, then restart (npm run dev).",
          summary: null,
        },
        { status: 503 }
      );
    }

    if (!response.ok) {
      const err = await response.text();
      const status = response.status;
      console.error("[summarize-notes]", provider, "error:", status, err);
      let hint = "";
      if (status === 401) hint = " Invalid or missing API key. Check .env.local.";
      else if (status === 429) hint = " Rate limit exceeded. Try Groq (free tier) if using OpenAI.";
      else hint = " Restart dev server after changing .env.local.";
      return NextResponse.json(
        {
          error: `${provider} request failed (${status}).${hint}`,
          summary: null,
          details: err,
        },
        { status: 502 }
      );
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const summary =
      data?.choices?.[0]?.message?.content?.trim() ?? "No summary generated.";

    return NextResponse.json({ summary, error: null });
  } catch (e) {
    console.error("[summarize-notes] Exception:", e);
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Summarization failed. Check server terminal for details.",
        summary: null,
      },
      { status: 500 }
    );
  }
}
