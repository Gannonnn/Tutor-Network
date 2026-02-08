"use client";

import { JitsiMeeting } from "@jitsi/react-sdk";

const JITSI_DOMAIN = process.env.NEXT_PUBLIC_JITSI_DOMAIN ?? "meet.jit.si";

interface JitsiEmbedProps {
  sessionId: string;
}

export default function JitsiEmbed({ sessionId }: JitsiEmbedProps) {
  // Jitsi room names should be URL-safe (alphanumeric, hyphens, underscores)
  const roomName = sessionId.replace(/[^a-zA-Z0-9_-]/g, "_");

  return (
    <div className="absolute inset-0 w-full h-full">
      <JitsiMeeting
        domain={JITSI_DOMAIN}
        roomName={roomName}
        configOverwrite={{
          startWithAudioMuted: true,
          disableModeratorIndicator: true,
        }}
        interfaceConfigOverwrite={{
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
        }}
        getIFrameRef={(iframeRef) => {
          if (iframeRef) {
            iframeRef.style.height = "100%";
            iframeRef.style.width = "100%";
          }
        }}
      />
    </div>
  );
}
