"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { AuthUser } from "@supabase/supabase-js";

type NoteItem = {
  id: string;
  date: string;
  time: string;
  notes: string | null;
  notes_updated_at: string | null;
  other_name: string;
  subject_slug: string | null;
  subtopic_title: string | null;
};

const SAVE_DEBOUNCE_MS = 600;

export default function NotesPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [items, setItems] = useState<NoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const load = async () => {
      const {
        data: { user: u },
      } = await supabase.auth.getUser();
      if (!u) {
        router.replace("/login");
        return;
      }
      setUser(u);

      const { data: bookings, error } = await supabase
        .from("bookings")
        .select(`
          id,
          date,
          time,
          notes,
          notes_updated_at,
          tutor_id,
          student_id,
          subject_slug,
          subtopic_title,
          tutor:profiles!bookings_tutor_id_fkey(full_name),
          student:profiles!bookings_student_id_fkey(full_name)
        `)
        .or(`tutor_id.eq.${u.id},student_id.eq.${u.id}`)
        .order("date", { ascending: false })
        .order("time", { ascending: false });

      if (error) {
        setLoading(false);
        return;
      }

      const list: NoteItem[] = (bookings || []).map((b: any) => ({
        id: b.id,
        date: b.date,
        time: b.time,
        notes: b.notes ?? null,
        notes_updated_at: b.notes_updated_at ?? null,
        other_name:
          b.tutor_id === u.id
            ? (b.student?.full_name ?? "Student")
            : (b.tutor?.full_name ?? "Tutor"),
        subject_slug: b.subject_slug ?? null,
        subtopic_title: b.subtopic_title ?? null,
      }));
      setItems(list);
      if (list.length > 0 && !selectedId) setSelectedId(list[0].id);
      setLoading(false);
    };
    load();
  }, [router, supabase]);

  const selected = items.find((i) => i.id === selectedId);

  useEffect(() => {
    if (selected) {
      setEditContent(selected.notes ?? "");
      setSummary(null);
      setSummaryError(null);
    }
  }, [selected?.id]);

  const saveNotes = useCallback(
    async (bookingId: string, content: string) => {
      setSaving(true);
      await supabase
        .from("bookings")
        .update({
          notes: content || null,
          notes_updated_at: new Date().toISOString(),
        })
        .eq("id", bookingId);
      setItems((prev) =>
        prev.map((i) =>
          i.id === bookingId
            ? {
                ...i,
                notes: content || null,
                notes_updated_at: new Date().toISOString(),
              }
            : i
        )
      );
      setSaving(false);
    },
    [supabase]
  );

  useEffect(() => {
    if (!selectedId || !selected) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveTimeoutRef.current = null;
      saveNotes(selectedId, editContent);
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [editContent, selectedId, selected?.id, saveNotes]);

  const fetchSummary = useCallback(async () => {
    if (!selected?.notes?.trim()) {
      setSummary("No content to summarize.");
      return;
    }
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const res = await fetch("/api/summarize-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: selected.notes }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data?.error ?? "Failed to generate summary";
        const details = data?.details ? ` — ${String(data.details).slice(0, 200)}` : "";
        setSummaryError(msg + details);
        setSummary(null);
      } else {
        setSummary(data.summary ?? "No summary generated.");
        setSummaryError(null);
      }
    } catch (e) {
      setSummaryError(e instanceof Error ? e.message : "Request failed");
      setSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  }, [selected?.notes]);

  useEffect(() => {
    if (selected?.notes?.trim() && selected.id) {
      setSummaryLoading(true);
      setSummaryError(null);
      setSummary(null);
      fetch("/api/summarize-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: selected.notes }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.summary != null) setSummary(data.summary);
          else {
            const msg = data?.error ?? "Failed";
            const details = data?.details ? ` — ${String(data.details).slice(0, 200)}` : "";
            setSummaryError(msg + details);
          }
        })
        .catch(() => setSummaryError("Request failed"))
        .finally(() => setSummaryLoading(false));
    } else {
      setSummary(null);
      setSummaryLoading(false);
      setSummaryError(null);
    }
  }, [selected?.id]);

  if (!user) return null;

  if (loading) {
    return (
      <main className="h-screen bg-background overflow-hidden flex flex-col">
        <div className="flex-1 flex items-center justify-center p-3">
          <p className="text-sm text-zinc-500">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="h-screen bg-background overflow-hidden flex flex-col">
      <div className="flex-1 p-3 overflow-hidden flex flex-col">
        <div className="grid grid-cols-12 gap-3 flex-1 min-h-0">
          {/* Left - Notes list (match dashboard left column) */}
          <div className="col-span-4 flex flex-col gap-2 h-full min-h-0">
            <div className="bg-white rounded-lg border border-zinc-200 p-3 flex-1 overflow-hidden flex flex-col min-h-0">
              <h2 className="text-lg font-semibold mb-3 flex-shrink-0">My Notes</h2>
              <p className="text-xs text-zinc-500 mb-2">Past sessions</p>
              {items.length === 0 ? (
                <p className="text-sm text-zinc-500">No sessions yet. Notes from your tutoring sessions will appear here.</p>
              ) : (
                <div className="space-y-1.5 flex-1 overflow-y-auto">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      className={`w-full text-left p-2 rounded-lg border transition-colors ${
                        selectedId === item.id
                          ? "bg-green-100 border-green-700"
                          : "border-zinc-100 hover:bg-zinc-50"
                      }`}
                    >
                      <p className="text-xs font-medium">{item.other_name}</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">
                        {new Date(item.date).toLocaleDateString()} at {item.time}
                      </p>
                      {(item.subtopic_title || item.subject_slug) && (
                        <p className="text-[10px] text-zinc-500 truncate mt-0.5">
                          {item.subtopic_title ?? item.subject_slug}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Middle - Note content (match dashboard middle column) */}
          <div className="col-span-4 bg-white rounded-lg border border-zinc-200 p-4 overflow-hidden flex flex-col h-full min-h-0">
            <h2 className="text-lg font-semibold mb-3 flex-shrink-0">Note</h2>
            {selected ? (
              <>
                <div className="p-3 border border-zinc-200 rounded-lg space-y-2 flex-shrink-0 mb-3">
                  <p className="text-sm font-medium">{selected.other_name}</p>
                  <p className="text-xs text-zinc-600">
                    {new Date(selected.date).toLocaleDateString()} at {selected.time}
                  </p>
                  {(selected.subtopic_title || selected.subject_slug) && (
                    <p className="text-xs text-zinc-600">
                      Topic: {selected.subtopic_title ?? selected.subject_slug ?? "—"}
                    </p>
                  )}
                  {saving && <p className="text-xs text-zinc-500">Saving…</p>}
                </div>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="Session notes…"
                  className="flex-1 w-full p-3 text-sm text-foreground placeholder-zinc-400 resize-none border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary min-h-0"
                  spellCheck
                />
              </>
            ) : (
              <p className="text-sm text-zinc-600">
                Select a session from the list to view and edit notes.
              </p>
            )}
          </div>

          {/* Right - AI overview (match dashboard right column) */}
          <div className="col-span-4 bg-white rounded-lg border border-zinc-200 p-4 overflow-y-auto h-full flex flex-col min-h-0">
            <h2 className="text-lg font-semibold mb-3 flex-shrink-0">AI overview</h2>
            {selected?.notes?.trim() && (
              <button
                type="button"
                onClick={fetchSummary}
                disabled={summaryLoading}
                className="mb-2 text-xs text-primary hover:underline font-medium disabled:opacity-50"
              >
                {summaryLoading ? "Generating…" : "Regenerate"}
              </button>
            )}
            <div className="flex-1 overflow-y-auto min-h-0">
              {!selected?.notes?.trim() ? (
                <p className="text-sm text-zinc-500">Add or select notes to see an AI summary.</p>
              ) : summaryLoading && !summary ? (
                <p className="text-sm text-zinc-500">Generating summary…</p>
              ) : summaryError ? (
                <p className="text-sm text-red-600">{summaryError}</p>
              ) : summary ? (
                <div className="text-sm text-foreground whitespace-pre-wrap">{summary}</div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
