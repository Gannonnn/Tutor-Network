import { NextRequest, NextResponse } from "next/server";

// Curated resources: we build every URL ourselves so links always work. AI only picks which to suggest and writes the note.
const CURATED_BY_KEY: Record<
  string,
  { title: string; urlTemplate: string }
> = {
  youtube: {
    title: "YouTube — video tutorials",
    urlTemplate: "https://www.youtube.com/results?search_query={{query}}",
  },
  khan: {
    title: "Khan Academy",
    urlTemplate: "https://www.khanacademy.org/",
  },
  openstax: {
    title: "OpenStax free textbooks",
    urlTemplate: "https://openstax.org/",
  },
  crashcourse: {
    title: "Crash Course (YouTube)",
    urlTemplate: "https://www.youtube.com/results?search_query=crash+course+{{query}}",
  },
};

const SYSTEM_PROMPT = `You suggest free learning resources for a school topic. You must return a JSON array of 3 or 4 objects. Each object has exactly: "key" (one of: youtube, khan, openstax, crashcourse) and "note" (one short sentence explaining why this resource helps for this topic). Use only those four keys. Do not include any URLs. Return only the JSON array.`;

async function callGroq(
  subjectTitle: string,
  topicTitle: string,
  topicDescription: string,
  apiKey: string
): Promise<Array<{ key: string; note: string }>> {
  const userContent = `Subject: ${subjectTitle}. Topic: ${topicTitle}. ${topicDescription ? `Description: ${topicDescription}.` : ""} Suggest 3–4 resources from the allowed keys (youtube, khan, openstax, crashcourse). Return a JSON array of objects with "key" and "note" only.`;

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
        { role: "user", content: userContent },
      ],
      max_tokens: 400,
    }),
  });

  if (!response.ok) return [];
  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const raw = data?.choices?.[0]?.message?.content?.trim() ?? "";
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];
  try {
    const arr = JSON.parse(jsonMatch[0]) as unknown[];
    return arr
      .filter((item): item is Record<string, string> => item != null && typeof item === "object")
      .map((item) => ({
        key: String(item.key ?? "").trim().toLowerCase(),
        note: String(item.note ?? "").trim(),
      }))
      .filter((r) => r.key && CURATED_BY_KEY[r.key]);
  } catch {
    return [];
  }
}

function buildResourcesFromAi(
  topicTitle: string,
  suggestions: Array<{ key: string; note: string }>
): Array<{ title: string; url: string; note: string }> {
  const query = encodeURIComponent(topicTitle);
  return suggestions.map((s) => {
    const curated = CURATED_BY_KEY[s.key];
    const url = curated.urlTemplate.replace(/\{\{query\}\}/g, query);
    return {
      title: curated.title,
      url,
      note: s.note || `Free resource for ${topicTitle}.`,
    };
  });
}

function buildResourcesFallback(topicTitle: string): Array<{ title: string; url: string; note: string }> {
  const query = encodeURIComponent(topicTitle);
  return Object.entries(CURATED_BY_KEY).map(([_, r]) => ({
    title: r.title,
    url: r.urlTemplate.replace(/\{\{query\}\}/g, query),
    note: `Free resource for ${topicTitle}.`,
  }));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const subjectTitle = typeof body?.subjectTitle === "string" ? body.subjectTitle.trim() : "";
    const topicTitle = typeof body?.topicTitle === "string" ? body.topicTitle.trim() : "";
    const topicDescription = typeof body?.topicDescription === "string" ? body.topicDescription.trim() : "";

    if (!subjectTitle || !topicTitle) {
      return NextResponse.json(
        { error: "subjectTitle and topicTitle required", resources: [] },
        { status: 400 }
      );
    }

    const groqKey = process.env.GROQ_API_KEY?.trim();
    let resources: Array<{ title: string; url: string; note: string }>;

    if (groqKey) {
      const suggestions = await callGroq(subjectTitle, topicTitle, topicDescription, groqKey);
      if (suggestions.length > 0) {
        resources = buildResourcesFromAi(topicTitle, suggestions);
      } else {
        resources = buildResourcesFallback(topicTitle);
      }
    } else {
      resources = buildResourcesFallback(topicTitle);
    }

    return NextResponse.json({ resources, error: null });
  } catch (e) {
    console.error("[subject-resources] Exception:", e);
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Failed to fetch resources.",
        resources: [],
      },
      { status: 500 }
    );
  }
}
