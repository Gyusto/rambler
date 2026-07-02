"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authApi } from "@/features/auth/api/auth.api";
import type { LoginInput, RegisterInput, Session } from "@/features/auth/types";

interface AuthState {
  session: Session | null;
  /** false until the persisted session has been read from localStorage. */
  hydrated: boolean;
  setHydrated: () => void;
  setUserId: (userId: string) => void;
  /** Replace the chat token in place (e.g. after a background refresh). */
  setToken: (token: string) => void;
  clear: () => void;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  guest: (nick: string) => Promise<void>;
}

/**
 * Auth store. Persists the chat token + nick so a refresh keeps you signed in
 * (the token, not the cookie, is what authorizes the WebSocket). `hydrated`
 * lets guards wait for rehydration instead of bouncing to /login on refresh.
 */
export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      hydrated: false,

      setHydrated: () => set({ hydrated: true }),

      setUserId: (userId) =>
        set((s) => (s.session ? { session: { ...s.session, userId } } : s)),

      setToken: (token) =>
        set((s) => (s.session ? { session: { ...s.session, token } } : s)),

      clear: () => {
        void authApi.logout().catch(() => {});
        set({ session: null });
      },

      login: async ({ Username, Password }) => {
        await authApi.login({ Username, Password });
        const token = await authApi.chatToken();
        set({ session: { token, nick: Username, isGuest: false } });
      },

      register: async (input) => {
        await authApi.register(input);
        await authApi.login({ Username: input.Nick, Password: input.Password });
        const token = await authApi.chatToken();
        set({ session: { token, nick: input.Nick, isGuest: false } });
      },

      guest: async (nick) => {
        const token = await authApi.guestToken(nick);
        set({ session: { token, nick, isGuest: true } });
      },
    }),
    {
      name: "rambler.session",
      // only persist the session; `hydrated` is runtime-only
      partialize: (s) => ({ session: s.session }),
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    },
  ),
);
