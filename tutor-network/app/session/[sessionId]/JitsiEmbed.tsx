"use client";

import { JitsiMeeting } from "@jitsi/react-sdk";

const JITSI_DOMAIN = process.env.NEXT_PUBLIC_JITSI_DOMAIN ?? "meet.jit.si";

interface JitsiEmbedProps {
  sessionId: string;
  onReadyToClose?: () => void;
}

export default function JitsiEmbed({ sessionId, onReadyToClose }: JitsiEmbedProps) {
  // Same room for tutor and student: full session id, hyphens removed (alphanumeric only)
  const roomName = sessionId.replace(/[^a-zA-Z0-9]/g, "") || "session";

  return (
    <div className="absolute inset-0 w-full h-full" style={{ position: 'relative' }}>
      <JitsiMeeting
        domain={JITSI_DOMAIN}
        roomName={roomName}
        configOverwrite={{
          startWithAudioMuted: true,
          disableModeratorIndicator: true,
          startAudioOnly: false,
          enableWelcomePage: false,
          enableNoisyMicDetection: false,
          everyoneIsModerator: true,
          // Show prejoin so user clicks "Join" — often fixes "waiting for moderator" on meet.jit.si
          prejoinPageEnabled: true,
          // Enable fullscreen
          enableFullscreen: true,
        }}
        interfaceConfigOverwrite={{
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
          SHOW_JITSI_WATERMARK: false,
          // Enable fullscreen button
          TOOLBAR_BUTTONS: [
            'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
            'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
            'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
            'videoquality', 'filmstrip', 'invite', 'feedback', 'stats', 'shortcuts'
          ],
        }}
        onReadyToClose={onReadyToClose}
        getIFrameRef={(iframeRef) => {
          if (iframeRef) {
            iframeRef.style.height = "100%";
            iframeRef.style.width = "100%";
            iframeRef.style.border = "none";
            // Allow fullscreen
            iframeRef.setAttribute("allowfullscreen", "true");
            iframeRef.setAttribute("allow", "fullscreen");
          }
        }}
      />
    </div>
  );
}
