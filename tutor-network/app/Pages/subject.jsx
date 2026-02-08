"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import NavBar from "../components/NavBar";

// NOTES
// - This file implements the Subject page layout requested:
//   - Top navbar shows the current core subject name to the right of the logo.
//   - Left: vertical carousel with sub-subjects. First item is selected on load; clicking selects a different one.
//   - Middle: short description of the selected sub-subject and a button to "Ask AI" for free learning resources.
//       The AI section currently simulates a query and shows a popup modal with example links.
//   - Right: list of tutors available for the selected sub-subject; clicking a tutor opens a scheduling popup/modal.
//       IMPORTANT: Scheduling is NOT implemented (placeholder only) — see comments in the modal section below.
// - Replace the mock data and the AI simulation with real data sources / APIs when available.

// ----- Mock Data (replace with real data from your backend) -----
const MOCK_CORE_SUBJECT = "Math"; // Example; pass dynamically via route or props later

const MOCK_SUB_SUBJECTS = [
  {
    id: "algebra",
    title: "Algebra",
    description:
      "Understand variables, equations, inequalities, functions, and how to reason symbolically.",
  },
  {
    id: "geometry",
    title: "Geometry",
    description:
      "Explore shapes, theorems, proofs, and spatial reasoning including Euclidean geometry.",
  },
  {
    id: "trigonometry",
    title: "Trigonometry",
    description:
      "Study angles, triangles, and trigonometric functions with applications to waves and rotations.",
  },
  {
    id: "calculus",
    title: "Calculus",
    description:
      "Limits, derivatives, integrals, and the fundamental theorem of calculus with real-world modeling.",
  },
];

const MOCK_TUTORS_BY_SUBSUBJECT = {
  algebra: [
    {
      id: "t1",
      name: "Alex Johnson",
      blurb: "STEM tutor with 4+ years of Algebra and Pre-Calc experience.",
    },
    { id: "t2", name: "Priya K.", blurb: "Focus on fundamentals and intuitive problem breakdowns." },
  ],
  geometry: [
    { id: "t3", name: "Marco D.", blurb: "Proofs specialist and contest geometry coach." },
  ],
  trigonometry: [
    { id: "t4", name: "Selina Park", blurb: "Trig identities and applications explained clearly." },
    { id: "t5", name: "Robert C.", blurb: "Connect trig to physics and real-world examples." },
  ],
  calculus: [
    { id: "t6", name: "Dr. Nguyen", blurb: "PhD mathematician focusing on Calculus I–III." },
  ],
};

export default function SubjectPage() {
  // In a future iteration, read these values from route params, search params, or server data
  const coreSubject = MOCK_CORE_SUBJECT;
  const subSubjects = MOCK_SUB_SUBJECTS;

  const [selectedId, setSelectedId] = useState(subSubjects[0]?.id ?? null);
  const selected = useMemo(
    () => subSubjects.find((s) => s.id === selectedId) || subSubjects[0] || null,
    [selectedId, subSubjects]
  );

  // Vertical carousel scrolling controls
  const listRef = useRef(null);
  const scrollList = (direction) => {
    if (!listRef.current) return;
    const el = listRef.current;
    const delta = direction === "up" ? -160 : 160; // approx one tile height
    el.scrollBy({ top: delta, behavior: "smooth" });
  };

  // "Ask AI" resources modal state (simulated)
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
      // TODO: Replace this with a real call to your AI/recommendations API.
      // For example, create an API route at /api/resources and fetch from here.
      await new Promise((r) => setTimeout(r, 900));
      const example = [
        {
          title: `${selected?.title} Crash Course (YouTube)`,
          url: "https://www.youtube.com/results?search_query=" + encodeURIComponent(`${selected?.title} basics`),
          note: "Free video series to get started quickly.",
        },
        {
          title: `${selected?.title} Practice Problems (Khan Academy)`,
          url: "https://www.khanacademy.org/",
          note: "Exercises with step-by-step hints.",
        },
        {
          title: `${selected?.title} Reference (OpenStax)`,
          url: "https://openstax.org/subjects/math",
          note: "Free, open textbooks and chapters.",
        },
      ];
      setAiResults(example);
    } catch (e) {
      setAiError("Failed to fetch resources. Please try again.");
    } finally {
      setAiLoading(false);
    }
  };

  // Tutors for the selected sub-subject
  const tutors = useMemo(() => {
    if (!selected) return [];
    return MOCK_TUTORS_BY_SUBSUBJECT[selected.id] || [];
  }, [selected]);

  // Appointment modal state (placeholder — NOT IMPLEMENTED)
  const [activeTutor, setActiveTutor] = useState(null);

  useEffect(() => {
    // Ensure a valid selection on mount or when subSubjects change
    if (!selectedId && subSubjects[0]) setSelectedId(subSubjects[0].id);
  }, [selectedId, subSubjects]);

  return (
    <div className="min-h-screen bg-white">
      {/* NavBar with core subject name shown next to the logo */}
      <NavBar contextLabel={coreSubject ? `Core: ${coreSubject}` : undefined} />

      <main className="pt-14">
        <div className="grid grid-cols-12 gap-6 px-6 pb-6 pt-0">
          {/* Left third: Vertical carousel of sub-subjects */}
          <aside className="col-span-12 md:col-span-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-zinc-900">{coreSubject} Topics</h2>
              <div className="flex gap-1">
                <button
                  onClick={() => scrollList("up")}
                  className="w-8 h-8 flex items-center justify-center rounded-md border border-zinc-200 hover:bg-zinc-50"
                  aria-label="Scroll up"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"/></svg>
                </button>
                <button
                  onClick={() => scrollList("down")}
                  className="w-8 h-8 flex items-center justify-center rounded-md border border-zinc-200 hover:bg-zinc-50"
                  aria-label="Scroll down"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
                </button>
              </div>
            </div>

            <div
              ref={listRef}
              className="max-h-[520px] overflow-y-auto pr-1"
              style={{ scrollbarWidth: "thin" }}
            >
              <ul className="space-y-3">
                {subSubjects.map((s) => {
                  const isActive = s.id === selected?.id;
                  return (
                    <li key={s.id}>
                      <button
                        onClick={() => setSelectedId(s.id)}
                        className={
                          "w-full text-left p-4 rounded-lg border transition " +
                          (isActive
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-zinc-200 hover:bg-zinc-50")
                        }
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

          {/* Middle third: Description + AI resources */}
          <section className="col-span-12 md:col-span-5">
            <div className="rounded-xl border border-zinc-200 p-5 bg-white shadow-sm">
              <h2 className="text-xl font-semibold text-zinc-900 mb-2">{selected?.title}</h2>
              <p className="text-zinc-700 mb-4">{selected?.description}</p>

              <div className="flex items-center justify-between">
                <div className="text-sm text-zinc-500">Need help getting started?</div>
                <button
                  onClick={queryAiForResources}
                  className="px-3 py-2 rounded-md bg-primary text-white hover:opacity-90 text-sm"
                >
                  Ask AI for free resources
                </button>
              </div>
            </div>
          </section>

          {/* Right third: Tutors list */}
          <aside className="col-span-12 md:col-span-4">
            <div className="rounded-xl border border-zinc-200 p-5 bg-white shadow-sm">
              <h2 className="text-lg font-semibold text-zinc-900 mb-3">Available Tutors</h2>
              {tutors.length === 0 ? (
                <div className="text-sm text-zinc-600">No tutors found for this topic yet.</div>
              ) : (
                <ul className="space-y-3">
                  {tutors.map((t) => (
                    <li key={t.id}>
                      <button
                        onClick={() => setActiveTutor(t)}
                        className="w-full p-4 text-left rounded-lg border border-zinc-200 hover:bg-zinc-50"
                      >
                        <div className="font-medium text-zinc-900">{t.name}</div>
                        <div className="text-sm text-zinc-600">{t.blurb}</div>
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

      {/* AI Resources Modal */}
      {aiOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-xl bg-white border border-zinc-200 shadow-xl">
            <div className="p-4 border-b border-zinc-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Free resources for {selected?.title}</h3>
              <button
                className="w-8 h-8 inline-flex items-center justify-center rounded-md hover:bg-zinc-100"
                onClick={() => setAiOpen(false)}
                aria-label="Close"
              >
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
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-primary hover:underline"
                      >
                        {r.title}
                      </a>
                      {r.note ? <div className="text-sm text-zinc-600">{r.note}</div> : null}
                    </li>
                  ))}
                  {aiResults.length === 0 && (
                    <li className="text-sm text-zinc-600">No results yet.</li>
                  )}
                </ul>
              )}
            </div>
            <div className="p-4 border-t border-zinc-200 text-right">
              <button
                onClick={() => setAiOpen(false)}
                className="px-3 py-2 rounded-md border border-zinc-300 hover:bg-zinc-50 text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tutor Scheduling Modal (PLACEHOLDER — NOT IMPLEMENTED) */}
      {/*
        NOTE: This popup demonstrates the intended UI but does not save or submit appointments.
        Integrate with your backend scheduling system (and Supabase auth) to:
        - Load tutor availability
        - Allow selecting time slots
        - Create bookings
        - Send notifications
      */}
      {activeTutor && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-xl bg-white border border-zinc-200 shadow-xl">
            <div className="p-4 border-b border-zinc-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Schedule with {activeTutor.name}</h3>
              <button
                className="w-8 h-8 inline-flex items-center justify-center rounded-md hover:bg-zinc-100"
                onClick={() => setActiveTutor(null)}
                aria-label="Close"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-sm text-zinc-700 mb-1">Preferred date</label>
                <input type="date" className="w-full rounded-md border border-zinc-300 px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm text-zinc-700 mb-1">Preferred time</label>
                <input type="time" className="w-full rounded-md border border-zinc-300 px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm text-zinc-700 mb-1">Notes for your tutor</label>
                <textarea rows={3} className="w-full rounded-md border border-zinc-300 px-3 py-2" placeholder={`Topics/questions in ${selected?.title}`} />
              </div>
              <div className="text-xs text-zinc-500">
                This is a placeholder. Submitting will not create an appointment.
              </div>
            </div>
            <div className="p-4 border-t border-zinc-200 flex items-center justify-end gap-2">
              <button
                onClick={() => setActiveTutor(null)}
                className="px-3 py-2 rounded-md border border-zinc-300 hover:bg-zinc-50 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => alert("Scheduling is not implemented yet. This is a placeholder.")}
                className="px-3 py-2 rounded-md bg-primary text-white hover:opacity-90 text-sm"
              >
                Request appointment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
