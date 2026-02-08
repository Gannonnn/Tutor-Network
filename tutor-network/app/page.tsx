import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // User is not logged in, redirect to login
    redirect("/Routes");
  }

  // Check user type and redirect accordingly
  const userType = user.user_metadata?.user_type;
  
  // If user_type is not in metadata, check profile
  if (!userType) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_type")
      .eq("id", user.id)
      .single();
    
    if (profile?.user_type === "tutor") {
      // Tutors go to dashboard
      redirect("/dashboard");
    } else {
      // Students go to student-home
      redirect("/student-home");
    }
  } else if (userType === "tutor") {
    // Tutors go to dashboard
    redirect("/dashboard");
  } else {
    // Students go to student-home
    redirect("/student-home");
  }
}
