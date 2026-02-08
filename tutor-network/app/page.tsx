"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/Routes");
        return;
      }

      // Check user type and redirect accordingly
      const userType = user.user_metadata?.user_type;

      if (!userType) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_type")
          .eq("id", user.id)
          .single();

        if (profile?.user_type === "tutor") {
          router.replace("/dashboard");
        } else {
          router.replace("/student-home");
        }
      } else if (userType === "tutor") {
        router.replace("/dashboard");
      } else {
        router.replace("/student-home");
      }
    };

    checkAuth().finally(() => setChecking(false));
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-zinc-500">Redirecting…</p>
      </div>
    );
  }

  return null;
}
