"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useChatConnection } from "@/features/chat/hooks/use-chat-socket";
import { LobbyChat } from "@/features/chat/components/lobby/lobby-chat";
import { TokenRefresher } from "@/features/auth/token-refresher";
import { FullPageLoader } from "@/components/ui/spinner";

export default function ChatPage() {
  const router = useRouter();
  const session = useAuth((s) => s.session);
  const hydrated = useAuth((s) => s.hydrated);

  useChatConnection(session?.token, session?.nick);

  useEffect(() => {
    if (hydrated && !session) router.replace("/login");
  }, [hydrated, session, router]);

  // Wait for the persisted session to load before deciding, so a refresh
  // doesn't bounce a signed-in user to /login.
  if (!hydrated) return <FullPageLoader label="Loading…" />;

  if (!session) return null;

  return (
    <>
      <TokenRefresher />
      <LobbyChat />
    </>
  );
}
