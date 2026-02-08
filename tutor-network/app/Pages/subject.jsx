"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import NavBar from "../components/NavBar";
import BookingModal from "../components/BookingModal";
import { createClient } from "@/lib/supabase/client";
import { getSubjectBySlug } from "@/lib/subjects";

// Tutors are from profiles (id, full_name, email, bio as blurb)
const tutorShape = (p) => ({
  id: p.id,
  name: p.full_name || p.email || "Tutor",
  blurb: p.bio || "",
  email: p.email,
});

export default function SubjectPage({ slug }) {
  const subjectConfig = getSubjectBySlug(slug);
  const coreSubject = subjectConfig?.title ?? "";
  const subSubjects = subjectConfig?.subtopics ?? [];

  const [selectedId, setSelectedId] = useState(subSubjects[0]?.id ?? null);
  const selected = useMemo(
    () => subSubjects.find((s) => s.id === selectedId) || subSubjects[0] || null,
    [selectedId, subSubjects]
  );

  const [tutors, setTutors] = useState([]);
  const [user, setUser] = useState(null);
  const [activeTutor, setActiveTutor] = useState(null);
  const supabase = createClient();

  useEffect(() => {
    if (!slug) return;
    const loadTutors = async () => {
      const { data: rows } = await supabase
        .from("tutor_subjects")
        .select("tutor_id")
        .eq("subject_slug", slug);
      if (!rows?.length) {
        setTutors([]);
        return;
      }
      const tutorIds = [...new Set(rows.map((r) => r.tutor_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, bio")
        .in("id", tutorIds);
      setTutors((profiles || []).map(tutorShape));
    };
    loadTutors();
  }, [slug, supabase]);

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      setUser(u);
    };
    loadUser();
  }, [supabase]);

  const listRef = useRef(null);
  const scrollList = (direction) => {
    if (!listRef.current) return;
    const delta = direction === "up" ? -160 : 160;
    listRef.current.scrollBy({ top: delta, behavior: "smooth" });
  };

  const [aiOpen, setAiOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResults, setAiResults] = useState([]);
  const [aiError, setAiError] = useState("");

  const queryAiForResources = async () => {
    setAiOpen(true);
    setAiLoading(true);
    setAiError("");
    setAiResults([]);
    try {
      await new Promise((r) => setTimeout(r, 900));
      setAiResults([
        { title: `${selected?.title} Crash Course (YouTube)`, url: "https://www.youtube.com/results?search_query=" + encodeURIComponent(`${selected?.title} basics`), note: "Free video series to get started quickly." },
        { title: `${selected?.title} Practice Problems (Khan Academy)`, url: "https://www.khanacademy.org/", note: "Exercises with step-by-step hints." },
        { title: `${selected?.title} Reference (OpenStax)`, url: "https://openstax.org/subjects/math", note: "Free, open textbooks and chapters." },
      ]);
    } catch (e) {
      setAiError("Failed to fetch resources. Please try again.");
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedId && subSubjects[0]) setSelectedId(subSubjects[0].id);
  }, [selectedId, subSubjects]);

  useEffect(() => {
    // Prevent body scrolling
    document.body.style.overflow = 'hidden';
    
    return () => {
      // Restore body scrolling when component unmounts
      document.body.style.overflow = 'unset';
    };
  }, []);

  if (!subjectConfig) return null;

  return (
    <div className="fixed inset-0 bg-white overflow-hidden flex flex-col">
      <NavBar contextLabel={coreSubject ? `Core: ${coreSubject}` : undefined} />

      <main className="flex-1 pt-14 overflow-y-auto min-h-0">
        <div className="grid grid-cols-12 gap-6 px-6 pb-6 pt-6">
          <aside className="col-span-12 md:col-span-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-zinc-900">{coreSubject} Topics</h2>
              <div className="flex gap-1">
                <button type="button" onClick={() => scrollList("up")} className="w-8 h-8 flex items-center justify-center rounded-md border border-zinc-200 hover:bg-zinc-50" aria-label="Scroll up">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"/></svg>
                </button>
                <button type="button" onClick={() => scrollList("down")} className="w-8 h-8 flex items-center justify-center rounded-md border border-zinc-200 hover:bg-zinc-50" aria-label="Scroll down">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
                </button>
              </div>
            </div>
            <div ref={listRef} className="max-h-[520px] overflow-y-auto pr-1" style={{ scrollbarWidth: "thin" }}>
              <ul className="space-y-3">
                {subSubjects.map((s) => {
                  const isActive = s.id === selected?.id;
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(s.id)}
                        className={"w-full text-left p-4 rounded-lg border transition " + (isActive ? "border-primary bg-primary/10 text-primary" : "border-zinc-200 hover:bg-zinc-50")}
                      >
                        <div className="font-medium">{s.title}</div>
                        <div className="text-sm text-zinc-600 line-clamp-2">{s.description}</div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </aside>

          <section className="col-span-12 md:col-span-5">
            <div className="rounded-xl border border-zinc-200 p-5 bg-white shadow-sm">
              <h2 className="text-xl font-semibold text-zinc-900 mb-2">{selected?.title}</h2>
              <p className="text-zinc-700 mb-4">{selected?.description}</p>
              <div className="flex items-center justify-between">
                <div className="text-sm text-zinc-500">Need help getting started?</div>
                <button type="button" onClick={queryAiForResources} className="px-3 py-2 rounded-md bg-primary text-white hover:opacity-90 text-sm">
                  Ask AI for free resources
                </button>
              </div>
            </div>
          </section>

          <aside className="col-span-12 md:col-span-4">
            <div className="rounded-xl border border-zinc-200 p-5 bg-white shadow-sm">
              <h2 className="text-lg font-semibold text-zinc-900 mb-3">Available Tutors</h2>
              {tutors.length === 0 ? (
                <div className="text-sm text-zinc-600">No tutors found for this subject yet.</div>
              ) : (
                <ul className="space-y-3">
                  {tutors.map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => setActiveTutor(t)}
                        className="w-full p-4 text-left rounded-lg border border-zinc-200 hover:bg-zinc-50"
                      >
                        <div className="font-medium text-zinc-900">{t.name}</div>
                        {t.blurb && <div className="text-sm text-zinc-600">{t.blurb}</div>}
                        <div className="mt-2 inline-flex items-center gap-2 text-primary text-sm">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3"/></svg>
                          Schedule an appointment
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </div>
      </main>

      {aiOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-xl bg-white border border-zinc-200 shadow-xl">
            <div className="p-4 border-b border-zinc-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Free resources for {selected?.title}</h3>
              <button type="button" className="w-8 h-8 inline-flex items-center justify-center rounded-md hover:bg-zinc-100" onClick={() => setAiOpen(false)} aria-label="Close">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="p-4">
              {aiLoading && <div className="text-sm text-zinc-600">Thinking…</div>}
              {aiError && <div className="text-sm text-red-600">{aiError}</div>}
              {!aiLoading && !aiError && (
                <ul className="space-y-3">
                  {aiResults.map((r, idx) => (
                    <li key={idx} className="rounded-lg border border-zinc-200 p-3">
                      <a href={r.url} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">{r.title}</a>
                      {r.note ? <div className="text-sm text-zinc-600">{r.note}</div> : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="p-4 border-t border-zinc-200 text-right">
              <button type="button" onClick={() => setAiOpen(false)} className="px-3 py-2 rounded-md border border-zinc-300 hover:bg-zinc-50 text-sm">Close</button>
            </div>
          </div>
        </div>
      )}

      {activeTutor && (
        user ? (
          <BookingModal
            tutorId={activeTutor.id}
            tutorName={activeTutor.name}
            studentId={user.id}
            subjectSlug={slug}
            subtopicTitle={selected?.title}
            onClose={() => setActiveTutor(null)}
            onSuccess={() => setActiveTutor(null)}
          />
        ) : (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-sm rounded-xl bg-white border border-zinc-200 p-6 text-center">
              <p className="text-sm text-zinc-700 mb-4">Log in to schedule an appointment.</p>
              <a href="/login" className="inline-block px-4 py-2 rounded-md bg-primary text-white text-sm hover:opacity-90">Log in</a>
              <button type="button" onClick={() => setActiveTutor(null)} className="block w-full mt-2 text-sm text-zinc-500 hover:underline">Cancel</button>
            </div>
          </div>
        )
      )}
    </div>
  );
}
