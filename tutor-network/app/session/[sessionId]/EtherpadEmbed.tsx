"use client";

const ETHERPAD_URL =
  process.env.NEXT_PUBLIC_ETHERPAD_URL ?? "https://beta.etherpad.org";

interface EtherpadEmbedProps {
  sessionId: string;
}

export default function EtherpadEmbed({ sessionId }: EtherpadEmbedProps) {
  // Pad names should be URL-safe (letters, numbers, underscores, hyphens)
  const padName = sessionId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const padUrl = `${ETHERPAD_URL}/p/${padName}?showChat=false&showLineNumbers=false`;

  return (
    <iframe
      src={padUrl}
      className="absolute inset-0 w-full h-full border-0"
      title="Live Notes"
      allow="clipboard-read; clipboard-write"
      sandbox="allow-same-origin allow-scripts allow-forms allow-modals allow-popups"
    />
  );
}
