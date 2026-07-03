"use client";

import { avatarColor, avatarGradient, initials } from "@/lib/avatar";
import { useChatStore } from "@/features/chat/state/chat-store";
import { roleBadge, roleMark as marks } from "@/features/chat/roles";
import { channelsApi } from "@/features/chat/api/channels.api";
import { settingsApi } from "@/features/chat/api/settings.api";
import { BanLevel, type ChannelBanDto, type ChannelModeratorDto } from "@/features/chat/api/channels.types";
import type { RoomUser } from "@/types/protocol";
import { UserMenu } from "./user-menu";

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
  // Kick/ban needs Moderator(10); promoting/demoting a role needs Admin(100).
  const canModerateRoom = isRoom && myLevel >= 10;
  const canManageRoom = isRoom && myLevel >= 100;

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
          // I can act on this user only if they don't outrank me and it's not me.
          const outranksTarget = !isSelf && u.ModLevel < myLevel;
          const canModerate = canModerateRoom && outranksTarget;
          const canManage = canManageRoom && outranksTarget;

          return (
            <UserMenu
              key={u.Id}
              user={u}
              isSelf={isSelf}
              canModerate={canModerate}
              canManage={canManage}
              onMessage={() => openDm(u.Id, u.Nick)}
              onIgnore={() => {
                void settingsApi.addIgnore(u.Id);
              }}
              onSetMode={(level) => {
                if (!active) return;
                // Grant/upgrade via AddModerator (it upserts); clear via RemoveModerator.
                if (level <= 0) {
                  void channelsApi.removeChannelModerator(active.id, {
                    UserId: u.Id,
                  } as ChannelModeratorDto);
                } else {
                  void channelsApi.addChannelModerator(active.id, u.Id, level);
                }
              }}
              onMute={() => {
                if (active) void channelsApi.addChannelBan(buildBanDto(active.id, u, BanLevel.Mute));
              }}
              onBan={() => {
                // Ban force-removes the user from the channel (server broadcasts a part) and bans them.
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
