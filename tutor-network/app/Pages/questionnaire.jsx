"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import NavBar from "../components/NavBar";
import { createClient } from "@/lib/supabase/client";

/*
  Student Questionnaire Page
  - Collects study preferences and needs from students
  - Saves responses to Supabase table `questionnaires`
  - If the user already has a questionnaire, prefill and allow update

  Expected Supabase table (suggested):
  - Table: questionnaires
    - user_id: uuid PRIMARY KEY references auth.users(id)
    - answers: jsonb NOT NULL
    - updated_at: timestamptz NOT NULL default now()

  Notes:
  - If RLS is enabled, add a policy to allow users to upsert their own row where user_id = auth.uid().
*/

const HELP_TYPES = [
  "Homework help",
  "Understanding concepts",
  "Test prep",
  "Advanced placement",
];

const LEVELS = [
  "Struggling a lot",
  "A little behind",
  "On track",
  "Want a challenge",
];

const LEARNING_STYLES = [
  "Visual (videos, diagrams)",
  "Auditory (lectures, podcasts)",
  "Reading/Writing (notes, textbooks)",
  "Kinesthetic (hands-on, practice)",
];

export default function QuestionnairePage() {
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form state
  const [gradeLevel, setGradeLevel] = useState("");
  const [favoriteSubjects, setFavoriteSubjects] = useState("");
  const [strugglingSubjects, setStrugglingSubjects] = useState("");
  const [specificNeeds, setSpecificNeeds] = useState("");
  const [helpType, setHelpType] = useState(HELP_TYPES[0]);
  const [currentLevel, setCurrentLevel] = useState(LEVELS[1]);
  const [learningBest, setLearningBest] = useState("");
  const [specificWants, setSpecificWants] = useState("");
  const [extraNotes, setExtraNotes] = useState("");

  useEffect(() => {
    // Prevent body scrolling
    document.body.style.overflow = 'hidden';
    
    return () => {
      // Restore body scrolling when component unmounts
      document.body.style.overflow = 'unset';
    };
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setError("");
      try {
        const {
          data: { user },
          error: authErr,
        } = await supabase.auth.getUser();
        if (authErr) throw authErr;
        if (!user) {
          setLoading(false);
          return;
        }
        setUserId(user.id);
        // Load existing answers if present
        const { data, error: qErr } = await supabase
          .from("questionnaires")
          .select("answers")
          .eq("user_id", user.id)
          .maybeSingle();
        if (qErr) throw qErr;
        if (data?.answers) {
          const a = data.answers;
          setGradeLevel(a.gradeLevel ?? "");
          setFavoriteSubjects(a.favoriteSubjects ?? "");
          setStrugglingSubjects(a.strugglingSubjects ?? "");
          setSpecificNeeds(a.specificNeeds ?? "");
          setHelpType(a.helpType ?? HELP_TYPES[0]);
          setCurrentLevel(a.currentLevel ?? LEVELS[1]);
          setLearningBest(a.learningBest ?? "");
          setSpecificWants(a.specificWants ?? "");
          setExtraNotes(a.extraNotes ?? "");
        }
      } catch (e) {
        setError(e?.message || "Failed to load questionnaire.");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [supabase]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!userId) {
      setError("You must be logged in to submit the questionnaire.");
      return;
    }

    // Minimal validation
    if (!gradeLevel || !helpType || !currentLevel) {
      setError("Please complete the required fields.");
      return;
    }

    setSaving(true);
    try {
      const answers = {
        gradeLevel,
        favoriteSubjects,
        strugglingSubjects,
        specificNeeds,
        helpType,
        currentLevel,
        learningBest,
        specificWants,
        extraNotes,
      };

      // 1. Save answers to Supabase
      const { error: upErr } = await supabase
        .from("questionnaires")
        .upsert(
          {
            user_id: userId,
            answers,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );
      if (upErr) throw upErr;

      // 2. Call Groq to generate recommendations
      setSuccess("Saved! Generating personalized recommendations…");
      try {
        const res = await fetch("/api/recommend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers }),
        });
        const data = await res.json();
        if (data.recommendations?.length > 0) {
          // 3. Save recommendations to Supabase
          await supabase
            .from("questionnaires")
            .update({
              recommendations: data.recommendations,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", userId);
        }
      } catch (aiErr) {
        // If AI fails, still redirect — recommendations can be generated later
        console.error("AI recommendation failed:", aiErr);
      }

      setSuccess("Done! Redirecting to your home page…");
      setTimeout(() => {
        window.location.href = "/student-home";
      }, 500);
    } catch (e) {
      setError(e?.message || "Failed to save your responses.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-white overflow-hidden flex flex-col">
      <NavBar />
      <main className="flex-1 pt-14 overflow-y-auto min-h-0">
        <div className="max-w-3xl mx-auto px-6 pb-10 pt-0">
          <h1 className="text-2xl font-semibold text-zinc-900 mb-1">Student Questionnaire</h1>
          <p className="text-sm text-zinc-600 mb-6">Answer a few questions so we can tailor your learning experience.</p>

          {loading ? (
            <div className="py-16 text-center text-zinc-600">Loading…</div>
          ) : (
            <>
              {!userId ? (
                <div className="rounded-lg border border-zinc-200 p-6 text-center">
                  <p className="mb-4">You need to log in to complete the questionnaire.</p>
                  <Link href="/login" className="px-4 py-2 rounded-md bg-primary text-white inline-block">Log in</Link>
                </div>
              ) : (
                <form onSubmit={onSubmit} className="space-y-5">
                  {error ? (
                    <div className="rounded-md border border-red-300 bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div>
                  ) : null}
                  {success ? (
                    <div className="rounded-md border border-emerald-300 bg-emerald-50 text-emerald-700 px-3 py-2 text-sm">{success}</div>
                  ) : null}

                  <div>
                    <label className="block text-sm text-zinc-700 mb-1">What is your grade level? <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={gradeLevel}
                      onChange={(e) => setGradeLevel(e.target.value)}
                      placeholder="e.g., 9th grade, College Freshman"
                      className="w-full rounded-md border border-zinc-300 px-3 py-2"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-zinc-700 mb-1">What are your favorite subjects?</label>
                    <input
                      type="text"
                      value={favoriteSubjects}
                      onChange={(e) => setFavoriteSubjects(e.target.value)}
                      placeholder="e.g., Math, Biology"
                      className="w-full rounded-md border border-zinc-300 px-3 py-2"
                    />
                    <p className="text-xs text-zinc-500 mt-1">Comma-separated list is fine.</p>
                  </div>

                  <div>
                    <label className="block text-sm text-zinc-700 mb-1">What subjects are you struggling with?</label>
                    <input
                      type="text"
                      value={strugglingSubjects}
                      onChange={(e) => setStrugglingSubjects(e.target.value)}
                      placeholder="e.g., Geometry, Chemistry"
                      className="w-full rounded-md border border-zinc-300 px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-zinc-700 mb-1">What specifically do you need help with?</label>
                    <textarea
                      rows={3}
                      value={specificNeeds}
                      onChange={(e) => setSpecificNeeds(e.target.value)}
                      placeholder="Topics, chapters, kinds of questions…"
                      className="w-full rounded-md border border-zinc-300 px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-zinc-700 mb-1">Homework help, understanding concepts, test prep, or advanced placement <span className="text-red-500">*</span></label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {HELP_TYPES.map((ht) => (
                        <label key={ht} className={`flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer ${helpType === ht ? "border-primary bg-primary/10 text-primary" : "border-zinc-300 hover:bg-zinc-50"}`}>
                          <input
                            type="radio"
                            name="helpType"
                            value={ht}
                            checked={helpType === ht}
                            onChange={() => setHelpType(ht)}
                          />
                          <span className="text-sm">{ht}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-zinc-700 mb-1">How would you describe your current level in the subject? <span className="text-red-500">*</span></label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {LEVELS.map((lv) => (
                        <label key={lv} className={`flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer ${currentLevel === lv ? "border-primary bg-primary/10 text-primary" : "border-zinc-300 hover:bg-zinc-50"}`}>
                          <input
                            type="radio"
                            name="level"
                            value={lv}
                            checked={currentLevel === lv}
                            onChange={() => setCurrentLevel(lv)}
                          />
                          <span className="text-sm">{lv}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-zinc-700 mb-1">How do you learn best?</label>
                    <input
                      type="text"
                      value={learningBest}
                      onChange={(e) => setLearningBest(e.target.value)}
                      placeholder="e.g., videos, practice problems, explaining to others"
                      className="w-full rounded-md border border-zinc-300 px-3 py-2"
                      list="learningStyles"
                    />
                    <datalist id="learningStyles">
                      {LEARNING_STYLES.map((s) => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-sm text-zinc-700 mb-1">Is there anything specific you want from your tutor?</label>
                    <textarea
                      rows={2}
                      value={specificWants}
                      onChange={(e) => setSpecificWants(e.target.value)}
                      placeholder="e.g., assigns extra practice, patient with step-by-step, flexible scheduling"
                      className="w-full rounded-md border border-zinc-300 px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-zinc-700 mb-1">Please list anything else you would like us to tell your tutors ahead of time.</label>
                    <textarea
                      rows={3}
                      value={extraNotes}
                      onChange={(e) => setExtraNotes(e.target.value)}
                      placeholder="Anything else you'd like us to know"
                      className="w-full rounded-md border border-zinc-300 px-3 py-2"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <Link href="/student-home" className="px-3 py-2 rounded-md border border-zinc-300 hover:bg-zinc-50 text-sm">Cancel</Link>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-4 py-2 rounded-md bg-primary text-white hover:opacity-90 text-sm disabled:opacity-60"
                    >
                      {saving ? "Saving…" : "Save questionnaire"}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
