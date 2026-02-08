"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { AuthUser } from "@supabase/supabase-js";

type ProfileRow = {
  id: string;
  email?: string | null;
  full_name?: string | null;
  username?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
} | null;

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

  const supabase = createClient();

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

      const { data: p } = await supabase
        .from("profiles")
        .select("id, email, full_name, username, bio, avatar_url")
        .eq("id", u.id)
        .single();

      if (p) {
        setProfile(p);
        setForm({
          full_name: p.full_name ?? "",
          username: p.username ?? "",
          bio: p.bio ?? "",
          avatar_url: p.avatar_url ?? "",
        });
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
    setSaving(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage("Profile saved.");
    router.refresh();
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
    <main className="min-h-screen bg-background">
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
    </main>
  );
}
