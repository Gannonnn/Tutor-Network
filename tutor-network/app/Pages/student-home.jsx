"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import NavBar from "../components/NavBar";
import { createClient } from "@/lib/supabase/client";
import { SUBJECTS } from "@/lib/subjects";

const CORE_SUBJECTS = Object.values(SUBJECTS);

// Placeholder images for cards
const imageFor = (title) => {
  const key = title.toLowerCase();
  if (key.includes("geometry")) return "/images/geometry.jpg";
  if (key.includes("calculus")) return "/images/calculus.jpg";
  if (key.includes("physics")) return "/images/physics.jpg";
  if (key.includes("chem")) return "/images/chemistry.jpg";
  if (key.includes("bio")) return "/images/biology.jpg";
  if (key.includes("science")) return "/images/science.jpg";
  if (key.includes("english")) return "/images/english.jpg";
  if (key.includes("history")) return "/images/history.jpg";
  if (key.includes("language")) return "/images/languages.jpg";
  if (key.includes("math")) return "/images/math.jpg";
  if (key.includes("arts")) return "/images/arts.jpg"
};

function generateRecommendations(answers) {
  // Very simple rule-based recommendations as a stand-in for AI
  const subjects = new Set();
  const methods = new Set();

  const fav = (answers?.favoriteSubjects || "").split(/,|;/).map((s) => s.trim()).filter(Boolean);
  const struggle = (answers?.strugglingSubjects || "").split(/,|;/).map((s) => s.trim()).filter(Boolean);
  const level = answers?.currentLevel || "On track";
  const helpType = answers?.helpType || "Understanding concepts";
  const learn = (answers?.learningBest || "").toLowerCase();

  struggle.forEach((s) => subjects.add(s));
  if (fav.length) subjects.add(fav[0]);

  // Derive methods by helpType and learning style
  if (helpType.includes("Homework")) methods.add("Targeted homework walkthroughs 2–3x/week");
  if (helpType.includes("Understanding")) methods.add("Concept-first lessons with summaries");
  if (helpType.includes("Test")) methods.add("Timed practice tests + error logs");
  if (helpType.toLowerCase().includes("advanced")) methods.add("AP/IB-style problems and rubrics");

  if (learn.includes("video") || learn.includes("visual")) methods.add("Short video explainers and diagram-based notes");
  if (learn.includes("practice") || learn.includes("kinesthetic")) methods.add("Lots of practice sets with immediate feedback");
  if (learn.includes("reading") || learn.includes("text")) methods.add("Textbook chapters and written summaries");
  if (learn.includes("auditory")) methods.add("Live explanations and verbal Q&A sessions");

  if (level.includes("Struggling a lot")) methods.add("Foundations review and scaffolded examples");
  if (level.includes("A little behind")) methods.add("Weekly check-ins and gap-filling exercises");
  if (level.includes("Want a challenge")) methods.add("Extension problems and enrichment resources");

  const recSubjects = Array.from(subjects).slice(0, 8).map((title, idx) => ({ id: idx + 1, title, image: imageFor(title) }));
  const recMethods = Array.from(methods);
  return { recSubjects, recMethods };
}

export default function StudentHome() {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [answers, setAnswers] = useState(null);
  const [error, setError] = useState("");

  const [recommended, setRecommended] = useState([]);
  const [studyMethods, setStudyMethods] = useState([]);
  const [genLoading, setGenLoading] = useState(false);

  // Clickable study strategies popover state
  const [openStrategy, setOpenStrategy] = useState(null);
  const STRATEGY_DEFS = {
    "Practice Testing": "Self‑quizzing with recall (flashcards, closed‑book problems) to strengthen memory and reveal gaps.",
    "Spaced Repitition": "Reviewing material over increasing intervals (days/weeks) to boost long‑term retention.",
    Interweaving: "Mixing different problem types/topics within a study session to improve transfer and discrimination.",
  };

  const recommendedRef = useRef(null);
  const coreRef = useRef(null);

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
        const { data: { user: u } } = await supabase.auth.getUser();
        setUser(u || null);
        if (!u) {
          setLoading(false);
          return;
        }
        const { data, error: qErr } = await supabase
          .from("questionnaires")
          .select("answers")
          .eq("user_id", u.id)
          .maybeSingle();
        if (qErr) throw qErr;
        setAnswers(data?.answers || null);
        if (data?.answers) {
          // simulate AI generation quickly
          const { recSubjects, recMethods } = generateRecommendations(data.answers);
          setRecommended(recSubjects);
          setStudyMethods(recMethods);
        }
      } catch (e) {
        setError(e?.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [supabase]);


  const regenerate = async () => {
    if (!answers) return;
    setGenLoading(true);
    // Simulate async AI call
    setTimeout(() => {
      const { recSubjects, recMethods } = generateRecommendations(answers);
      setRecommended(recSubjects);
      setStudyMethods(recMethods);
      setGenLoading(false);
    }, 500);
  };


  return (
    <div className="fixed inset-0 bg-white overflow-hidden flex flex-col">
      <NavBar />

      <main className="flex-1 pt-14 overflow-y-auto min-h-0">
        {loading ? (
          <div className="py-16 text-center text-zinc-600">Loading…</div>
        ) : !user ? (
          <div className="py-16 text-center">
            <p className="mb-4 text-zinc-700">You need to log in to view your home page.</p>
            <Link href="/login" className="px-4 py-2 rounded-md bg-primary text-white inline-block">Log in</Link>
          </div>
        ) : (
          <>
            {/* Recommended Subjects Carousel */}
            <section className="pt-6 pb-4 px-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-semibold text-zinc-900">Recommended Subjects</h2>
                <div className="flex items-center gap-2">
                  <button onClick={regenerate} className="px-3 py-1.5 rounded-md border border-zinc-300 hover:bg-zinc-50 text-sm">
                    {genLoading ? "Refreshing…" : "Refresh recommendations"}
                  </button>
                  <Link href="/questionnaire" className="px-3 py-1.5 rounded-md bg-primary text-white text-sm hover:opacity-90">Update questionnaire</Link>
                </div>
              </div>
              {user && !answers ? (
                <div className="flex items-center justify-center h-48">
                  <Link href="/questionnaire" className="px-6 py-3 rounded-md bg-primary text-white text-base hover:opacity-90 shadow">
                    Please Complete a Short Questionnaire
                  </Link>
                </div>
              ) : recommended.length === 0 ? (
                <div className="rounded-lg border border-zinc-200 p-6 text-zinc-600">No recommendations yet. Try refreshing or updating your questionnaire.</div>
              ) : (
                <div
                  ref={recommendedRef}
                  className="flex gap-4 overflow-x-auto scroll-smooth pb-2"
                  style={{ scrollbarWidth: "thin", scrollbarColor: "#d4d4d8 #f4f4f5" }}
                >
                  {recommended.map((subject) => (
                    <div
                      key={subject.id}
                      className="flex-shrink-0 w-64 h-48 rounded-xl border border-zinc-200 bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
                    >
                      <div className="h-32 bg-zinc-100 flex items-center justify-center relative">
                        <img
                          src={subject.image}
                          alt={subject.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-4">
                        <h3 className="text-lg font-medium text-zinc-900">{subject.title}</h3>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Recommended Study Methods */}
            <section className="pt-2 pb-6 px-6">
              <h2 className="text-2xl font-semibold text-zinc-900 mb-3">Recommended Study Methods for You</h2>

              <div className="text-sm text-zinc-700 mb-4">
                No matter what your learning style is, we always recommend
                <span className="relative inline-block align-middle ml-1 mr-1">
                  <button
                    type="button"
                    onClick={() => setOpenStrategy(openStrategy === 'Practice Testing' ? null : 'Practice Testing')}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    Practice Testing
                  </button>
                  {openStrategy === 'Practice Testing' && (
                    <div className="absolute left-0 top-full mt-1 z-20 w-64 text-xs rounded-md border border-zinc-200 bg-white shadow p-2">
                      <button
                        type="button"
                        aria-label="Close definition"
                        onClick={() => setOpenStrategy(null)}
                        className="absolute top-1 right-1 w-5 h-5 inline-flex items-center justify-center rounded hover:bg-zinc-100"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                      </button>
                      {STRATEGY_DEFS['Practice Testing']}
                    </div>
                  )}
                </span>,<span className="relative inline-block align-middle ml-1 mr-1">
                  <button
                    type="button"
                    onClick={() => setOpenStrategy(openStrategy === 'Spaced Repitition' ? null : 'Spaced Repitition')}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    Spaced Repitition
                  </button>
                  {openStrategy === 'Spaced Repitition' && (
                    <div className="absolute left-0 top-full mt-1 z-20 w-64 text-xs rounded-md border border-zinc-200 bg-white shadow p-2">
                      <button
                        type="button"
                        aria-label="Close definition"
                        onClick={() => setOpenStrategy(null)}
                        className="absolute top-1 right-1 w-5 h-5 inline-flex items-center justify-center rounded hover:bg-zinc-100"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                      </button>
                      {STRATEGY_DEFS['Spaced Repitition']}
                    </div>
                  )}
                </span>
                and
                <span className="relative inline-block align-middle ml-1">
                  <button
                    type="button"
                    onClick={() => setOpenStrategy(openStrategy === 'Interweaving' ? null : 'Interweaving')}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    Interweaving
                  </button>
                  {openStrategy === 'Interweaving' && (
                    <div className="absolute left-0 top-full mt-1 z-20 w-64 text-xs rounded-md border border-zinc-200 bg-white shadow p-2">
                      <button
                        type="button"
                        aria-label="Close definition"
                        onClick={() => setOpenStrategy(null)}
                        className="absolute top-1 right-1 w-5 h-5 inline-flex items-center justify-center rounded hover:bg-zinc-100"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                      </button>
                      {STRATEGY_DEFS['Interweaving']}
                    </div>
                  )}
                </span>, as the research suggests they're always the best.
              </div>

              {studyMethods.length > 0 && (
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {studyMethods.map((m, i) => (
                    <li key={i} className="rounded-lg border border-zinc-200 bg-white p-4 text-zinc-800">
                      • {m}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Core Subjects Carousel (static showcase) */}
            <section className="pt-4 pb-8 px-6">
              <h2 className="text-2xl font-semibold text-zinc-900 mb-4">
                Core Subjects
              </h2>
              <div
                ref={coreRef}
                className="flex gap-4 overflow-x-auto scroll-smooth pb-2"
                style={{ scrollbarWidth: "thin", scrollbarColor: "#d4d4d8 #f4f4f5" }}
              >
                {CORE_SUBJECTS.map((subject) => (
                  <Link
                    key={subject.slug}
                    href={`/subject/${subject.slug}`}
                    className="flex-shrink-0 w-64 h-48 rounded-xl border border-zinc-200 bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden block"
                  >
                    <div className="h-32 bg-zinc-100 flex items-center justify-center relative">
                      <img
                        src={imageFor(subject.title)}
                        alt={subject.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="text-lg font-medium text-zinc-900">{subject.title}</h3>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
