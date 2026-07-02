import type { RoomUser } from "@/types/protocol";

/** Short role label for a member, or null for a plain member. */
// ModerationLevel: Moderator=10, RoomOwner=150, ServerAdmin=1000
export function roleBadge(u?: Pick<RoomUser, "ModLevel" | "IsGuest">): string | null {
  if (!u) return null;
  if (u.ModLevel >= 1000) return "admin";
  if (u.ModLevel >= 150) return "owner";
  if (u.ModLevel >= 10) return "mod";
  if (u.IsGuest) return "guest";
  return null;
}
