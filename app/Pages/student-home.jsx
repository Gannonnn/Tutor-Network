"use client";

import { useRef } from "react";
import NavBar from "../components/NavBar";

// Placeholder subject data
const recommendedSubjects = [
  { id: 1, title: "Geometry", image: "/images/geometry.jpg" },
  { id: 2, title: "Calculus", image: "/images/calculus.jpg" },
  { id: 3, title: "Physics", image: "/images/physics.jpg" },
  { id: 4, title: "Chemistry", image: "/images/chemistry.jpg" },
  { id: 5, title: "Biology", image: "/images/biology.jpg" },
];

const coreSubjects = [
  { id: 1, title: "Math", image: "/images/math.jpg" },
  { id: 2, title: "Science", image: "/images/science.jpg" },
  { id: 3, title: "English", image: "/images/english.jpg" },
  { id: 4, title: "History", image: "/images/history.jpg" },
  { id: 5, title: "Languages", image: "/images/languages.jpg" },
  { id: 6, title: "Arts", image: "/images/arts.jpg" },
];

export default function StudentHome() {
  const recommendedRef = useRef(null);
  const coreRef = useRef(null);

  const scroll = (ref, direction) => {
    if (ref.current) {
      const scrollAmount = direction === "left" ? -300 : 300;
      ref.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <NavBar />

      <main className="pt-14">
        {/* Recommended Subjects Carousel */}
        <section className="py-8 px-6">
          <h2 className="text-2xl font-semibold text-zinc-900 mb-6">
            Recommended Subjects
          </h2>
          <div className="relative">
            <button
              onClick={() => scroll(recommendedRef, "left")}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white border border-zinc-200 rounded-full p-2 shadow-md transition-colors"
              aria-label="Scroll left"
            >
              <svg className="w-6 h-6 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div
              ref={recommendedRef}
              className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {recommendedSubjects.map((subject) => (
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

            <button
              onClick={() => scroll(recommendedRef, "right")}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white border border-zinc-200 rounded-full p-2 shadow-md transition-colors"
              aria-label="Scroll right"
            >
              <svg className="w-6 h-6 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </section>

        {/* Core Subjects Carousel */}
        <section className="py-8 px-6">
          <h2 className="text-2xl font-semibold text-zinc-900 mb-6">
            Core Subjects
          </h2>
          <div className="relative">
            <button
              onClick={() => scroll(coreRef, "left")}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white border border-zinc-200 rounded-full p-2 shadow-md transition-colors"
              aria-label="Scroll left"
            >
              <svg className="w-6 h-6 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div
              ref={coreRef}
              className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {coreSubjects.map((subject) => (
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

            <button
              onClick={() => scroll(coreRef, "right")}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white border border-zinc-200 rounded-full p-2 shadow-md transition-colors"
              aria-label="Scroll right"
            >
              <svg className="w-6 h-6 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
