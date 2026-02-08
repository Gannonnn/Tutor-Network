import JitsiEmbed from "./JitsiEmbed";
import EtherpadEmbed from "./EtherpadEmbed";
import WhiteboardEmbed from "./WhiteboardEmbed";

interface SessionPageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function SessionPage({ params }: SessionPageProps) {
  const { sessionId } = await params;

  return (
    <div className="grid grid-cols-2 h-[calc(100vh-3.5rem)] gap-2 p-2 bg-zinc-100">
      <div className="flex flex-col gap-2">
        <div className="flex-1 min-h-0 relative rounded-lg overflow-hidden">
          <JitsiEmbed sessionId={sessionId} />
        </div>
        <div className="flex-1 min-h-0 relative rounded-lg overflow-hidden">
          <EtherpadEmbed sessionId={sessionId} />
        </div>
      </div>
      <div className="relative rounded-lg overflow-hidden">
        <WhiteboardEmbed />
      </div>
    </div>
  );
}
