"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const SAVE_DEBOUNCE_MS = 800;
const POLL_INTERVAL_MS = 2500;
const IDLE_BEFORE_SYNC_MS = 2500; // Only apply remote updates when user has stopped typing this long

interface LiveNotesEmbedProps {
  sessionId: string;
  onSaveRef?: React.MutableRefObject<(() => Promise<void>) | null>;
}

export default function LiveNotesEmbed({
  sessionId,
  onSaveRef,
}: LiveNotesEmbedProps) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaveAtRef = useRef<number>(0);
  const lastLocalEditAtRef = useRef<number>(0);
  const supabase = createClient();

  const saveNow = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    const toSave = content;
    await supabase
      .from("bookings")
      .update({
        notes: toSave || null,
        notes_updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);
    lastSaveAtRef.current = Date.now();
  }, [content, sessionId, supabase]);

  useEffect(() => {
    if (onSaveRef) onSaveRef.current = saveNow;
    return () => {
      if (onSaveRef) onSaveRef.current = null;
    };
  }, [onSaveRef, saveNow]);

  // Load initial notes
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("bookings")
        .select("notes")
        .eq("id", sessionId)
        .single();
      if (!cancelled && data) setContent((data as { notes: string | null }).notes ?? "");
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, supabase]);

  // Polling: only apply remote updates when user has stopped typing (idle) to avoid glitchy overwrites
  useEffect(() => {
    if (loading) return;
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from("bookings")
        .select("notes")
        .eq("id", sessionId)
        .single();
      const remote = (data as { notes: string | null } | null)?.notes ?? "";
      const now = Date.now();
      setContent((current) => {
        if (current === remote) return current;
        if (now - lastSaveAtRef.current < 1500) return current;
        if (now - lastLocalEditAtRef.current < IDLE_BEFORE_SYNC_MS) return current;
        return remote;
      });
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loading, sessionId, supabase]);

  // Debounced save on content change
  useEffect(() => {
    if (loading) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveTimeoutRef.current = null;
      supabase
        .from("bookings")
        .update({
          notes: content || null,
          notes_updated_at: new Date().toISOString(),
        })
        .eq("id", sessionId)
        .then(() => {});
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [content, loading, sessionId, supabase]);

  if (loading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-zinc-100 text-zinc-500">
        Loading notes…
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex flex-col bg-white rounded-lg border border-zinc-200 overflow-hidden">
      <div className="px-2 py-1.5 border-b border-zinc-200 text-xs text-zinc-500 bg-zinc-50">
        Live notes — edits sync when you stop typing
      </div>
      <textarea
        value={content}
        onChange={(e) => {
          lastLocalEditAtRef.current = Date.now();
          setContent(e.target.value);
        }}
        placeholder="Session notes…"
        className="flex-1 w-full p-3 text-sm text-foreground placeholder-zinc-400 resize-none focus:outline-none focus:ring-0 border-0"
        spellCheck
      />
    </div>
  );
}
