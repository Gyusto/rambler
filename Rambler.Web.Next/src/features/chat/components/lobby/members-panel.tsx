"use client";

import { avatarColor, avatarGradient, initials } from "@/lib/avatar";
import { useChatStore } from "@/features/chat/state/chat-store";
import { roleBadge } from "@/features/chat/roles";
import { channelsApi } from "@/features/chat/api/channels.api";
import { settingsApi } from "@/features/chat/api/settings.api";
import { BanLevel, type ChannelBanDto } from "@/features/chat/api/channels.types";
import type { RoomUser } from "@/types/protocol";
import { UserMenu } from "./user-menu";

const marks: Record<string, string> = {
  admin: "fa-crown",
  owner: "fa-shield-halved",
  mod: "fa-star",
  guest: "fa-user",
};

/** Build a ChannelBanDto from what we know about the target user. */
function buildBanDto(channelId: string, user: RoomUser, level: BanLevel): ChannelBanDto {
  return {
    ChannelId: channelId,
    UserId: user.Id,
    Nick: user.Nick,
    Reason: level === BanLevel.Warning ? "Warned by moderator" : "Banned by moderator",
    Level: level,
  } as ChannelBanDto;
}

export function MembersPanel({ open }: { open: boolean }) {
  const userId = useChatStore((s) => s.userId);
  const active = useChatStore((s) => (s.activeId ? s.conversations[s.activeId] : undefined));
  const openDm = useChatStore((s) => s.openDm);

  // Rank highest authority first: owner/admin -> operator -> half-op -> voice -> members.
  const users = [...(active?.users ?? [])].sort(
    (a, b) => b.ModLevel - a.ModLevel || a.Nick.localeCompare(b.Nick),
  );
  const isRoom = active?.kind === "room";
  const myLevel = active?.myLevel ?? 0;
  const canModerateRoom = isRoom && myLevel >= 10;

  return (
    <aside className={`members${open ? " open" : ""}`}>
      <div className="members-head">
        <div>
          <h2>Who&apos;s here</h2>
          <p>{users.length} online</p>
        </div>
      </div>

      <div className="roster">
        <div className="group-label">Online - {users.length}</div>
        {users.map((u) => {
          const role = roleBadge(u);
          const isSelf = u.Id === userId;
          // can moderate this user: I'm a room mod, it's not me, and they don't outrank me
          const canModerate = canModerateRoom && !isSelf && u.ModLevel < myLevel;

          return (
            <UserMenu
              key={u.Id}
              user={u}
              isSelf={isSelf}
              canModerate={canModerate}
              onMessage={() => openDm(u.Id, u.Nick)}
              onIgnore={() => {
                void settingsApi.addIgnore(u.Id);
              }}
              onSetMode={(level) => {
                if (active) void channelsApi.setChannelModeratorLevel(active.id, u.Id, level);
              }}
              onKick={() => {
                if (active) void channelsApi.addChannelBan(buildBanDto(active.id, u, BanLevel.Mute));
              }}
              onBan={() => {
                if (active) void channelsApi.addChannelBan(buildBanDto(active.id, u, BanLevel.Ban));
              }}
              onKickBan={() => {
                if (active) void channelsApi.addChannelBan(buildBanDto(active.id, u, BanLevel.Ban));
              }}
            >
              <div className="m-av" style={{ background: avatarGradient(u.Nick) }}>
                {initials(u.Nick)}
                <span className="status online" />
              </div>
              <div className="m-body">
                <div className="m-name" style={{ color: avatarColor(u.Nick) }}>
                  {role && marks[role] && <i className={`m-mark fa-solid ${marks[role]} mr-1.5`} />}
                  {u.Nick}
                </div>
                <div className="m-note">{role ?? "member"}</div>
              </div>
            </UserMenu>
          );
        })}
        {users.length === 0 && (
          <div className="m-note" style={{ padding: "8px 10px" }}>
            No one here yet.
          </div>
        )}
      </div>
    </aside>
  );
}
