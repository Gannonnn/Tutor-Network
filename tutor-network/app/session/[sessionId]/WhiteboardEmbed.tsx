"use client";

const WHITEBOARD_URL =
  process.env.NEXT_PUBLIC_WHITEBOARD_URL ?? "https://whiteboard-online.org";

// Public board — shared by all sessions (scratch work)
const boardUrl = `${WHITEBOARD_URL}/public`;

export default function WhiteboardEmbed() {

  return (
    <div className="absolute inset-0 flex flex-col bg-zinc-100">
      <a
        href={boardUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute top-2 right-2 z-10 px-2 py-1 rounded bg-white border border-zinc-200 text-xs text-zinc-700 hover:bg-zinc-50 shadow"
      >
        Open whiteboard in new tab
      </a>
      <p className="absolute top-2 left-2 z-10 text-[10px] text-zinc-500 bg-white/90 px-2 py-1 rounded">
        Public whiteboard
      </p>
      <iframe
        src={boardUrl}
        className="absolute inset-0 w-full h-full border-0"
        title="Live Whiteboard"
        allow="camera; microphone"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
      />
    </div>
  );
}
