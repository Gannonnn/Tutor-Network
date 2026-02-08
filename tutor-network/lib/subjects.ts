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
      { id: "elementary", title: "Elementary Math", description: "Basic arithmetic, number sense, simple fractions, and fundamental problem-solving skills for grades K-5." },
      { id: "middle-school", title: "Middle School Math", description: "Pre-algebra concepts, ratios, proportions, introductory equations, and mathematical reasoning for grades 6-8." },
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
      { id: "computer-science", title: "Computer Science", description: "Programming, algorithms, data structures, and computational thinking to solve problems with technology." },
      { id: "geography", title: "Geography", description: "Physical and human geography, maps, spatial patterns, and understanding Earth's landscapes and cultures." },
    ],
  },
  english: {
    title: "English",
    slug: "english",
    subtopics: [
      { id: "grammar", title: "Grammar", description: "Sentence structure, parts of speech, punctuation, and the rules governing clear written communication." },
      { id: "creative-writing", title: "Creative Writing", description: "Storytelling, narrative techniques, character development, and expressing ideas through fiction and poetry." },
      { id: "essay-writing", title: "Essay Writing", description: "Academic writing, thesis development, argumentation, research skills, and crafting persuasive essays." },
      { id: "literature", title: "Literature", description: "Reading comprehension, analysis of fiction and non-fiction, and critical thinking." },
    ],
  },
  history: {
    title: "History",
    slug: "history",
    subtopics: [
      { id: "us-history", title: "U.S. History", description: "American history from colonization through the present day." },
      { id: "world-history", title: "World History", description: "Major civilizations, events, and global developments over time." },
      { id: "government", title: "Government", description: "Political systems, civic participation, constitutional principles, and how governments function and impact society." },
      { id: "economics", title: "Economics", description: "Micro and macroeconomics, markets, supply and demand, financial literacy, and economic decision-making." },
    ],
  },
  "foreign-languages": {
    title: "Foreign Languages",
    slug: "foreign-languages",
    subtopics: [
      { id: "spanish", title: "Spanish", description: "Spanish language fundamentals, conversation, and culture." },
      { id: "french", title: "French", description: "French language fundamentals, conversation, and culture." },
      { id: "german", title: "German", description: "German language fundamentals, vocabulary, grammar, and cultural insights into German-speaking countries." },
      { id: "japanese", title: "Japanese", description: "Japanese language basics including hiragana, katakana, kanji, grammar, and understanding Japanese culture." },
      { id: "chinese", title: "Chinese (Mandarin)", description: "Mandarin Chinese language fundamentals, characters, tones, grammar, and cultural context." },
    ],
  },
  arts: {
    title: "Arts",
    slug: "arts",
    subtopics: [
      { id: "visual", title: "Visual Arts", description: "Drawing, painting, composition, and art history." },
      { id: "ceramics", title: "Ceramics", description: "Pottery, sculpture, hand-building techniques, glazing, and working with clay as an artistic medium." },
      { id: "choir", title: "Choir", description: "Vocal music performance, sight-singing, harmony, and choral techniques for ensemble singing." },
      { id: "band", title: "Band", description: "Instrumental music performance with wind and percussion instruments, music reading, and ensemble coordination." },
      { id: "orchestra", title: "Orchestra", description: "String and orchestral instrument performance, classical repertoire, and symphonic ensemble skills." },
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
