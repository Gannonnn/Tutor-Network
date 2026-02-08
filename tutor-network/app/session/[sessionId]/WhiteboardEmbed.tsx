"use client";

const WHITEBOARD_URL =
  process.env.NEXT_PUBLIC_WHITEBOARD_URL ?? "https://whiteboard-online.org";

export default function WhiteboardEmbed() {
  // Use shared public board for hackathon simplicity
  const boardUrl = `${WHITEBOARD_URL}/public`;

  return (
    <iframe
      src={boardUrl}
      className="absolute inset-0 w-full h-full border-0"
      title="Live Whiteboard"
      allow="camera; microphone"
      sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
    />
  );
}
