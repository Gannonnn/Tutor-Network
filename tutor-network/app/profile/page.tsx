"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  getAllSubtopicsFlat,
  filterSubtopicsBySearch,
  type SubtopicOption,
} from "@/lib/subjects";
import type { AuthUser } from "@supabase/supabase-js";

type ProfileRow = {
  id: string;
  email?: string | null;
  full_name?: string | null;
  username?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  user_type?: string | null;
} | null;

type TutorSubjectRow = { subject_slug: string; subtopic_id: string };

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<ProfileRow>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    full_name: "",
    username: "",
    bio: "",
    avatar_url: "",
  });
  const [selectedSubtopics, setSelectedSubtopics] = useState<TutorSubjectRow[]>(
    []
  );
  const [subjectSearch, setSubjectSearch] = useState("");

  const supabase = createClient();
  const allSubtopics = useMemo(() => getAllSubtopicsFlat(), []);
  const filteredSubtopics = useMemo(
    () => filterSubtopicsBySearch(allSubtopics, subjectSearch),
    [allSubtopics, subjectSearch]
  );
  const selectedAsOptions = useMemo(() => {
    const set = new Set(
      selectedSubtopics.map((s) => `${s.subject_slug}:${s.subtopic_id}`)
    );
    return allSubtopics.filter((o) =>
      set.has(`${o.subject_slug}:${o.subtopic_id}`)
    );
  }, [allSubtopics, selectedSubtopics]);

  useEffect(() => {
    // Prevent body scrolling
    document.body.style.overflow = 'hidden';
    
    return () => {
      // Restore body scrolling when component unmounts
      document.body.style.overflow = 'unset';
    };
  }, []);

  useEffect(() => {
    const loadUserAndProfile = async () => {
      const {
        data: { user: u },
      } = await supabase.auth.getUser();
      if (!u) {
        router.replace("/login");
        return;
      }
      setUser(u);
      setForm((prev) => ({
        ...prev,
        full_name: u.user_metadata?.full_name ?? "",
      }));

      let { data: p } = await supabase
        .from("profiles")
        .select("id, email, full_name, username, bio, avatar_url, user_type")
        .eq("id", u.id)
        .single();

      // Sync user_type from signup metadata into profile if missing (e.g. trigger didn't set it)
      const metaType = u.user_metadata?.user_type as string | undefined;
      if (p && !p.user_type && (metaType === "tutor" || metaType === "student")) {
        await supabase
          .from("profiles")
          .update({ user_type: metaType })
          .eq("id", u.id);
        const { data: updated } = await supabase
          .from("profiles")
          .select("id, email, full_name, username, bio, avatar_url, user_type")
          .eq("id", u.id)
          .single();
        p = updated ?? p;
      }

      if (p) {
        setProfile(p);
        setForm({
          full_name: p.full_name ?? "",
          username: p.username ?? "",
          bio: p.bio ?? "",
          avatar_url: p.avatar_url ?? "",
        });
        if (p.user_type === "tutor") {
          const { data: ts } = await supabase
            .from("tutor_subjects")
            .select("subject_slug, subtopic_id")
            .eq("tutor_id", u.id);
          setSelectedSubtopics(ts ?? []);
        }
      } else {
        setForm((prev) => ({
          ...prev,
          full_name: prev.full_name || (u.user_metadata?.full_name ?? ""),
        }));
      }
      setLoading(false);
    };
    loadUserAndProfile();
  }, [router]);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    setMessage("");
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,
          email: user.email,
          full_name: form.full_name,
          username: form.username || null,
          bio: form.bio || null,
          avatar_url: form.avatar_url || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
    if (error) {
      setSaving(false);
      setMessage(error.message);
      return;
    }
    const isTutor =
      profile?.user_type === "tutor" || user?.user_metadata?.user_type === "tutor";
    if (isTutor) {
      const { error: delErr } = await supabase
        .from("tutor_subjects")
        .delete()
        .eq("tutor_id", user.id);
      if (delErr) {
        setSaving(false);
        setMessage(delErr.message);
        return;
      }
      if (selectedSubtopics.length > 0) {
        const { error: insErr } = await supabase.from("tutor_subjects").insert(
          selectedSubtopics.map((s) => ({
            tutor_id: user.id,
            subject_slug: s.subject_slug,
            subtopic_id: s.subtopic_id,
          }))
        );
        if (insErr) {
          setSaving(false);
          setMessage(insErr.message);
          return;
        }
      }
    }
    setSaving(false);
    setMessage("Profile saved.");
    router.refresh();
  };

  const addSubtopic = (opt: SubtopicOption) => {
    const key = `${opt.subject_slug}:${opt.subtopic_id}`;
    if (
      selectedSubtopics.some(
        (s) => `${s.subject_slug}:${s.subtopic_id}` === key
      )
    )
      return;
    setSelectedSubtopics((prev) => [
      ...prev,
      { subject_slug: opt.subject_slug, subtopic_id: opt.subtopic_id },
    ]);
  };

  const removeSubtopic = (subject_slug: string, subtopic_id: string) => {
    setSelectedSubtopics((prev) =>
      prev.filter(
        (s) => !(s.subject_slug === subject_slug && s.subtopic_id === subtopic_id)
      )
    );
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-zinc-600">Loading…</p>
      </main>
    );
  }

  return (
    <main className="fixed inset-0 bg-background overflow-hidden flex flex-col">
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="mx-auto max-w-xl px-6 py-16">
        <h1 className="text-2xl font-semibold text-foreground mb-6">
          Profile
        </h1>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium text-zinc-700"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={user?.email ?? ""}
              readOnly
              className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-zinc-600"
            />
            <p className="mt-1 text-xs text-zinc-500">
              Email cannot be changed here.
            </p>
          </div>

          <div>
            <label
              htmlFor="full_name"
              className="mb-1 block text-sm font-medium text-zinc-700"
            >
              Name
            </label>
            <input
              id="full_name"
              type="text"
              value={form.full_name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, full_name: e.target.value }))
              }
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-foreground placeholder-zinc-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Your name"
            />
          </div>

          <div>
            <label
              htmlFor="username"
              className="mb-1 block text-sm font-medium text-zinc-700"
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              value={form.username}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, username: e.target.value }))
              }
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-foreground placeholder-zinc-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="username"
            />
          </div>

          <div>
            <label
              htmlFor="bio"
              className="mb-1 block text-sm font-medium text-zinc-700"
            >
              Bio
            </label>
            <textarea
              id="bio"
              rows={4}
              value={form.bio}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, bio: e.target.value }))
              }
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-foreground placeholder-zinc-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="A short bio..."
            />
          </div>

          <div>
            <label
              htmlFor="avatar_url"
              className="mb-1 block text-sm font-medium text-zinc-700"
            >
              Avatar URL
            </label>
            <input
              id="avatar_url"
              type="url"
              value={form.avatar_url}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, avatar_url: e.target.value }))
              }
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-foreground placeholder-zinc-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="https://..."
            />
          </div>

          {(profile?.user_type === "tutor" || user?.user_metadata?.user_type === "tutor") && (
            <>
              {/* Display current subjects */}
              {selectedAsOptions.length > 0 && (
                <div className="mb-4">
                  <h3 className="mb-2 text-sm font-medium text-zinc-700">
                    My Teaching Subjects
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedAsOptions.map((opt) => (
                      <span
                        key={`${opt.subject_slug}:${opt.subtopic_id}`}
                        className="inline-flex items-center rounded bg-primary/15 px-2 py-0.5 text-xs text-foreground"
                      >
                        {opt.subject_title} → {opt.subtopic_title}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">
                  Add or Remove Subjects
                </label>
                <p className="mb-2 text-xs text-zinc-500">
                  Search and add the subjects/topics you teach. Students will see
                  you on subject pages when they match.
                </p>
              <input
                type="search"
                value={subjectSearch}
                onChange={(e) => setSubjectSearch(e.target.value)}
                placeholder="Search subjects or topics..."
                className="mb-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-foreground placeholder-zinc-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                aria-label="Search subjects"
              />
              <div className="mb-2 max-h-40 overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50 p-2">
                {filteredSubtopics.length === 0 ? (
                  <p className="text-sm text-zinc-500">
                    {subjectSearch ? "No matches." : "No subtopics."}
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {filteredSubtopics.map((opt) => {
                      const key = `${opt.subject_slug}:${opt.subtopic_id}`;
                      const selected = selectedSubtopics.some(
                        (s) =>
                          s.subject_slug === opt.subject_slug &&
                          s.subtopic_id === opt.subtopic_id
                      );
                      return (
                        <li key={key}>
                          <button
                            type="button"
                            onClick={() => addSubtopic(opt)}
                            disabled={selected}
                            className={`w-full rounded px-2 py-1.5 text-left text-sm ${
                              selected
                                ? "cursor-default bg-zinc-200 text-zinc-500"
                                : "hover:bg-primary/10 text-foreground"
                            }`}
                          >
                            {opt.subject_title} → {opt.subtopic_title}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              {selectedAsOptions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedAsOptions.map((opt) => (
                    <span
                      key={`${opt.subject_slug}:${opt.subtopic_id}`}
                      className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-sm text-foreground"
                    >
                      {opt.subject_title} → {opt.subtopic_title}
                      <button
                        type="button"
                        onClick={() =>
                          removeSubtopic(opt.subject_slug, opt.subtopic_id)
                        }
                        className="rounded-full p-0.5 hover:bg-primary/30"
                        aria-label={`Remove ${opt.subtopic_title}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              </div>
            </>
          )}

          {message && (
            <p
              className={
                message === "Profile saved."
                  ? "text-sm text-primary"
                  : "text-sm text-red-600"
              }
            >
              {message}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save profile"}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Log out
            </button>
          </div>
        </form>

        <p className="mt-8">
          <Link
            href="/"
            className="text-sm text-primary hover:underline"
          >
            Back to home
          </Link>
        </p>
        </div>
      </div>
    </main>
  );
}
