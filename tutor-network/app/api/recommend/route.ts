import { NextRequest, NextResponse } from "next/server";
import { SUBJECTS } from "@/lib/subjects";

/**
 * POST /api/recommend
 * Body: { answers: { gradeLevel, favoriteSubjects, strugglingSubjects, ... } }
 * Returns: { recommendations: [{ subject_slug, subtopic_id, reason }], error: null }
 *
 * Calls Groq to pick ~6 subtopics from the catalog that best fit the student.
 */

// Build the catalog string once so we can embed it in the prompt
function buildCatalog(): string {
  const lines: string[] = [];
  for (const config of Object.values(SUBJECTS)) {
    for (const st of config.subtopics) {
      lines.push(
        `- subject_slug: "${config.slug}", subtopic_id: "${st.id}", title: "${config.title} > ${st.title}", description: "${st.description}"`
      );
    }
  }
  return lines.join("\n");
}

const CATALOG = buildCatalog();

const SYSTEM_PROMPT = `You are an intelligent tutor recommendation engine. Given a student's questionnaire answers, you must recommend exactly 6 sub-courses from the provided catalog that would best help this student succeed academically.

Consider the student's:
- Grade level (match difficulty appropriately)
- Subjects they enjoy (include related topics to keep them engaged)
- Subjects they struggle with (prioritize these for support)
- What kind of help they need (homework, concepts, test prep, advanced)
- Their current academic level
- How they learn best
- Any specific needs or preferences

Return ONLY a JSON array of exactly 6 objects. Each object must have exactly these keys:
- "subject_slug": the parent subject slug from the catalog
- "subtopic_id": the subtopic id from the catalog
- "reason": a brief 1-sentence explanation of why this is recommended for this student

Do not include any text outside the JSON array. Do not wrap in markdown code fences.`;

async function callGroq(
  answers: Record<string, string>,
  apiKey: string
): Promise<Array<{ subject_slug: string; subtopic_id: string; reason: string }>> {
  const userContent = `Available sub-courses catalog:
${CATALOG}

Student questionnaire answers:
- Grade level: ${answers.gradeLevel || "Not specified"}
- Favorite subjects: ${answers.favoriteSubjects || "Not specified"}
- Struggling subjects: ${answers.strugglingSubjects || "Not specified"}
- Specific needs: ${answers.specificNeeds || "Not specified"}
- Help type: ${answers.helpType || "Not specified"}
- Current level: ${answers.currentLevel || "Not specified"}
- Learning style: ${answers.learningBest || "Not specified"}
- Wants from tutor: ${answers.specificWants || "Not specified"}
- Extra notes: ${answers.extraNotes || "Not specified"}

Pick exactly 6 sub-courses from the catalog above. Return a JSON array.`;

  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        max_tokens: 800,
        temperature: 0.7,
      }),
    }
  );

  if (!response.ok) {
    console.error("[recommend] Groq HTTP error:", response.status);
    return [];
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const raw = data?.choices?.[0]?.message?.content?.trim() ?? "";

  // Extract JSON array from response
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    console.error("[recommend] No JSON array found in Groq response:", raw);
    return [];
  }

  try {
    const arr = JSON.parse(jsonMatch[0]) as unknown[];

    // Validate each item has valid subject_slug + subtopic_id from our catalog
    const validSlugs = new Set(Object.keys(SUBJECTS));
    const validPairs = new Set<string>();
    for (const config of Object.values(SUBJECTS)) {
      for (const st of config.subtopics) {
        validPairs.add(`${config.slug}:${st.id}`);
      }
    }

    return arr
      .filter(
        (item): item is Record<string, string> =>
          item != null && typeof item === "object"
      )
      .map((item) => ({
        subject_slug: String(item.subject_slug ?? "").trim(),
        subtopic_id: String(item.subtopic_id ?? "").trim(),
        reason: String(item.reason ?? "").trim(),
      }))
      .filter(
        (r) =>
          validSlugs.has(r.subject_slug) &&
          validPairs.has(`${r.subject_slug}:${r.subtopic_id}`)
      )
      .slice(0, 6);
  } catch {
    console.error("[recommend] JSON parse failed:", jsonMatch[0]);
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const answers = body?.answers;

    if (!answers || typeof answers !== "object") {
      return NextResponse.json(
        { error: "answers object is required", recommendations: [] },
        { status: 400 }
      );
    }

    const groqKey = process.env.GROQ_API_KEY?.trim();

    if (!groqKey) {
      return NextResponse.json(
        { error: "GROQ_API_KEY not configured", recommendations: [] },
        { status: 500 }
      );
    }

    const recommendations = await callGroq(answers, groqKey);

    if (recommendations.length === 0) {
      return NextResponse.json(
        {
          error: "AI could not generate recommendations. Please try again.",
          recommendations: [],
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ recommendations, error: null });
  } catch (e) {
    console.error("[recommend] Exception:", e);
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Failed to generate recommendations.",
        recommendations: [],
      },
      { status: 500 }
    );
  }
}
