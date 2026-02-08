"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import JitsiEmbed from "./JitsiEmbed";
import LiveNotesEmbed from "./LiveNotesEmbed";
import WhiteboardEmbed from "./WhiteboardEmbed";

interface SessionClientProps {
  sessionId: string;
}

export default function SessionClient({ sessionId }: SessionClientProps) {
  const router = useRouter();
  const notesSaveRef = useRef<(() => Promise<void>) | null>(null);

  const handleEndSession = async () => {
    if (notesSaveRef.current) await notesSaveRef.current();
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="fixed inset-0 pt-14 bg-zinc-100 overflow-y-auto">
      <div className="h-full grid grid-cols-2 gap-2 p-2 pb-4">
        <div className="flex flex-col gap-2">
          <div className="flex-1 min-h-[400px] relative rounded-lg overflow-hidden bg-white">
            <JitsiEmbed sessionId={sessionId} onReadyToClose={handleEndSession} />
            <p className="absolute bottom-2 left-2 right-2 z-10 text-[10px] text-zinc-500 bg-white/90 px-2 py-1 rounded pointer-events-none">
              Tip: If you see &quot;waiting for moderator&quot;, have both people join — the meeting often starts when the second person joins. Or refresh and try again.
            </p>
          </div>
          <div className="flex-1 min-h-[400px] relative rounded-lg overflow-hidden">
            <LiveNotesEmbed sessionId={sessionId} onSaveRef={notesSaveRef} />
          </div>
          <div className="flex-shrink-0 flex justify-center py-2">
            <button
              type="button"
              onClick={handleEndSession}
              className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90 shadow"
            >
              End session
            </button>
          </div>
        </div>
        <div className="relative rounded-lg overflow-hidden min-h-[800px]">
          <WhiteboardEmbed />
        </div>
      </div>
    </div>
  );
}
