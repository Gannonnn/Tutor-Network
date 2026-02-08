import SessionClient from "./SessionClient";

export const dynamic = "force-dynamic";

interface SessionPageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function SessionPage({ params }: SessionPageProps) {
  const { sessionId } = await params;

  return <SessionClient sessionId={sessionId} />;
}
