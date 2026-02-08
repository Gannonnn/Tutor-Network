import { notFound } from "next/navigation";
import { getSubjectBySlug } from "@/lib/subjects";
import SubjectPage from "@/app/Pages/subject";

type Props = { params: Promise<{ slug: string }> };

export default async function SubjectRoute({ params }: Props) {
  const { slug } = await params;
  const subject = getSubjectBySlug(slug);
  if (!subject) notFound();
  return <SubjectPage slug={slug} />;
}
