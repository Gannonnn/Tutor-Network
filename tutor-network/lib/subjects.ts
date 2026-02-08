/**
 * Hardcoded core subjects and subtopics. Slug matches student-home core subject slugs.
 */
export type Subtopic = {
  id: string;
  title: string;
  description: string;
};

export type SubjectConfig = {
  title: string;
  slug: string;
  subtopics: Subtopic[];
};

export const SUBJECTS: Record<string, SubjectConfig> = {
  math: {
    title: "Math",
    slug: "math",
    subtopics: [
      { id: "algebra", title: "Algebra", description: "Understand variables, equations, inequalities, functions, and how to reason symbolically." },
      { id: "geometry", title: "Geometry", description: "Explore shapes, theorems, proofs, and spatial reasoning including Euclidean geometry." },
      { id: "trigonometry", title: "Trigonometry", description: "Study angles, triangles, and trigonometric functions with applications to waves and rotations." },
      { id: "calculus", title: "Calculus", description: "Limits, derivatives, integrals, and the fundamental theorem of calculus with real-world modeling." },
    ],
  },
  science: {
    title: "Science",
    slug: "science",
    subtopics: [
      { id: "physics", title: "Physics", description: "Motion, forces, energy, and the fundamental laws governing the physical world." },
      { id: "chemistry", title: "Chemistry", description: "Atoms, molecules, reactions, and the structure and behavior of matter." },
      { id: "biology", title: "Biology", description: "Living organisms, cells, genetics, evolution, and ecosystems." },
    ],
  },
  english: {
    title: "English",
    slug: "english",
    subtopics: [
      { id: "grammar", title: "Grammar & Writing", description: "Sentence structure, punctuation, essay writing, and clear communication." },
      { id: "literature", title: "Literature", description: "Reading comprehension, analysis of fiction and non-fiction, and critical thinking." },
    ],
  },
  history: {
    title: "History",
    slug: "history",
    subtopics: [
      { id: "us-history", title: "U.S. History", description: "American history from colonization through the present day." },
      { id: "world-history", title: "World History", description: "Major civilizations, events, and global developments over time." },
    ],
  },
  "foreign-languages": {
    title: "Foreign Languages",
    slug: "foreign-languages",
    subtopics: [
      { id: "spanish", title: "Spanish", description: "Spanish language fundamentals, conversation, and culture." },
      { id: "french", title: "French", description: "French language fundamentals, conversation, and culture." },
    ],
  },
  arts: {
    title: "Arts",
    slug: "arts",
    subtopics: [
      { id: "visual", title: "Visual Arts", description: "Drawing, painting, composition, and art history." },
      { id: "music", title: "Music", description: "Music theory, performance, and appreciation." },
    ],
  },
};

export function getSubjectBySlug(slug: string): SubjectConfig | null {
  return SUBJECTS[slug] ?? null;
}

/** Flat list of all subtopics for tutor profile picker and search */
export type SubtopicOption = {
  subject_slug: string;
  subject_title: string;
  subtopic_id: string;
  subtopic_title: string;
  searchText: string; // subject + title for filtering
};

let _allSubtopicsFlat: SubtopicOption[] | null = null;

export function getAllSubtopicsFlat(): SubtopicOption[] {
  if (_allSubtopicsFlat) return _allSubtopicsFlat;
  const out: SubtopicOption[] = [];
  for (const config of Object.values(SUBJECTS)) {
    for (const st of config.subtopics) {
      out.push({
        subject_slug: config.slug,
        subject_title: config.title,
        subtopic_id: st.id,
        subtopic_title: st.title,
        searchText: `${config.title} ${st.title}`.toLowerCase(),
      });
    }
  }
  _allSubtopicsFlat = out;
  return out;
}

export function filterSubtopicsBySearch(
  options: SubtopicOption[],
  query: string
): SubtopicOption[] {
  if (!query.trim()) return options;
  const q = query.trim().toLowerCase();
  return options.filter((o) => o.searchText.includes(q));
}
