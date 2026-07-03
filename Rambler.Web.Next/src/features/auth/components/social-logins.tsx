"use client";

import { useEffect, useState } from "react";
import { authApi, type ExternalProvider } from "@/features/auth/api/auth.api";

/** Font Awesome brand icons for known provider scheme names. */
const PROVIDER_ICON: Record<string, string> = {
  Google: "fa-google",
  Facebook: "fa-facebook-f",
  GitHub: "fa-github",
  Microsoft: "fa-microsoft",
  MicrosoftAccount: "fa-microsoft",
  Twitter: "fa-x-twitter",
};

/**
 * Renders "Continue with …" buttons for whatever external providers the server
 * has configured. Renders nothing when none are set up, so it's safe to drop
 * into the auth pages unconditionally.
 */
export function SocialLogins() {
  const [providers, setProviders] = useState<ExternalProvider[]>([]);

  useEffect(() => {
    let alive = true;
    authApi
      .externalProviders()
      .then((p) => alive && setProviders(p ?? []))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (providers.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-xs text-white/40">
        <span className="h-px flex-1 bg-white/15" />
        or continue with
        <span className="h-px flex-1 bg-white/15" />
      </div>

      <div className="space-y-2">
        {providers.map((p) => (
          <a
            key={p.Name}
            href={`/api/account/Login?provider=${encodeURIComponent(p.Name)}&returnUrl=/chat`}
            className="flex h-11 w-full items-center justify-center gap-2.5 rounded-lg border border-white/15 text-sm font-medium text-white/90 transition-colors hover:border-white/30 hover:bg-white/5"
          >
            <i className={`fa-brands ${PROVIDER_ICON[p.Name] ?? "fa-right-to-bracket"}`} />
            Continue with {p.DisplayName || p.Name}
          </a>
        ))}
      </div>
    </div>
  );
}
