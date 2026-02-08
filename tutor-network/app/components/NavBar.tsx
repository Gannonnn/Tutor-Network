"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { AuthUser } from "@supabase/supabase-js";

type ProfileRow = { avatar_url: string | null; full_name: string | null } | null;

export default function NavBar({ contextLabel }: { contextLabel?: string }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<ProfileRow>(null);

  useEffect(() => {
    const supabase = createClient();
    const getAuthAndProfile = async () => {
      const {
        data: { user: u },
      } = await supabase.auth.getUser();
      setUser(u);
      if (u) {
        const { data: p } = await supabase
          .from("profiles")
          .select("avatar_url, full_name")
          .eq("id", u.id)
          .single();
        setProfile(p ?? null);
      } else {
        setProfile(null);
      }
    };
    getAuthAndProfile();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      getAuthAndProfile();
    });
    return () => subscription.unsubscribe();
  }, []);

  const avatarUrl =
    profile?.avatar_url ||
    user?.user_metadata?.avatar_url ||
    null;
  const displayName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "?";
  const initials = displayName
    .split(/\s+/)
    .map((s: string) => s[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-14 bg-background border-b border-zinc-200 px-6 flex items-center justify-between">
      <div className="flex items-center gap-3 min-w-0">
        <Link
          href="/"
          className="text-xl font-medium text-foreground hover:opacity-80 transition-opacity shrink-0"
        >
          Tutor<span className="font-[family-name:var(--font-orbitron)] text-primary">Network</span>
        </Link>
        {contextLabel ? (
          <span className="text-sm text-zinc-600 truncate border-l border-zinc-200 pl-3" title={contextLabel}>
            {contextLabel}
          </span>
        ) : null}
      </div>

      <div className="flex items-center gap-4">
        {user ? (
          <>
            <Link
              href="/dashboard"
              className="text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              My Dashboard
            </Link>
            <Link
              href="/profile"
              className="flex items-center justify-center w-9 h-9 rounded-full overflow-hidden bg-primary/20 text-primary border border-primary/30 hover:opacity-90 transition-opacity shrink-0"
              title="Profile"
              aria-label="Profile"
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-sm font-medium">{initials}</span>
              )}
            </Link>
          </>
        ) : (
          <Link
            href="/login"
            className="text-sm font-medium text-foreground hover:text-primary transition-colors"
          >
            Log in
          </Link>
        )}
      </div>
    </nav>
  );
}
