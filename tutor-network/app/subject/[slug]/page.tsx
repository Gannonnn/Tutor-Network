import { notFound, redirect } from "next/navigation";
import { getSubjectBySlug } from "@/lib/subjects";
import { createClient } from "@/lib/supabase/server";
import SubjectPage from "@/app/Pages/subject";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export default async function SubjectRoute({ params }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Check if user is a tutor - tutors cannot access subject pages
  if (user) {
    const userType = user.user_metadata?.user_type;
    if (!userType) {
      // Check profile if not in metadata
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_type")
        .eq("id", user.id)
        .single();
      
      if (profile?.user_type === "tutor") {
        redirect("/dashboard");
      }
    } else if (userType === "tutor") {
      redirect("/dashboard");
    }
  }

  const { slug } = await params;
  const subject = getSubjectBySlug(slug);
  if (!subject) notFound();
  return <SubjectPage slug={slug} />;
}
