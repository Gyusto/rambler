"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { adminApi } from "@/features/admin/api/admin.api";
import type {
  ServerBanDto,
  ServerUserInfoDto,
  ServerUserSocketDto,
} from "@/features/admin/api/admin.types";
import { importApi } from "@/features/admin/api/import.api";
import { Loading, Spinner } from "@/components/ui/spinner";
import { ApiError } from "@/lib/api/http";

/** All-zero GUID the server returns in Info.UserId when a nick isn't found. */
const EMPTY_GUID = "00000000-0000-0000-0000-000000000000";

type Tab = "bans" | "lookup" | "import";

/** Turn a thrown API error into a friendly, access-aware message. */
function messageFor(err: unknown, fallback: string): string {
  if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
    return "You don't have server-admin access.";
  }
  return fallback;
}

function formatDate(value: string): string {
  const t = Date.parse(value);
  return Number.isNaN(t) ? value : new Date(t).toLocaleString();
}

/**
 * Server-admin entry point for the lobby. Hidden entirely for guest sessions.
 * Opens a modal that wires the .NET ManagementController endpoints exposed by
 * `adminApi`: server bans (list / add / remove) and per-user lookup.
 */
export function AdminPanelButton() {
  const isGuest = useAuth((s) => s.session?.isGuest);
  const [open, setOpen] = useState(false);

  // Guests never see the admin affordance.
  if (isGuest) return null;

  return (
    <>
      <button
        type="button"
        className="icon-btn"
        aria-label="Server admin"
        title="Server admin"
        onClick={() => setOpen(true)}
      >
        <i className="fa-solid fa-user-shield" />
      </button>
      {open && <AdminPanelModal onClose={() => setOpen(false)} />}
    </>
  );
}

function AdminPanelModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("bans");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex h-[640px] max-h-[90vh] w-full max-w-2xl flex-col rounded-xl border border-[var(--line)] bg-[var(--surface)] text-[var(--text)] shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-label="Server administration"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
          <h2 className="text-base font-semibold">Server administration</h2>
          <button
            type="button"
            className="icon-btn"
            aria-label="Close"
            title="Close"
            onClick={onClose}
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <div className="flex gap-1 border-b border-[var(--line)] px-4 pt-2">
          <TabButton active={tab === "bans"} onClick={() => setTab("bans")}>
            Bans
          </TabButton>
          <TabButton active={tab === "lookup"} onClick={() => setTab("lookup")}>
            User lookup
          </TabButton>
          <TabButton active={tab === "import"} onClick={() => setTab("import")}>
            Import
          </TabButton>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {tab === "bans" && <BansSection />}
          {tab === "lookup" && <LookupSection />}
          {tab === "import" && <ImportSection />}
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-t-md px-3 py-1.5 text-sm ${
        active
          ? "border-b-2 border-[var(--text)] font-medium text-[var(--text)]"
          : "text-[var(--muted)] hover:text-[var(--text)]"
      }`}
    >
      {children}
    </button>
  );
}

function BansSection() {
  const [bans, setBans] = useState<ServerBanDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);

  const [newNick, setNewNick] = useState("");
  const [newReason, setNewReason] = useState("");
  const [adding, setAdding] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editReason, setEditReason] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await adminApi.getbans();
      setBans(list ?? []);
    } catch (err) {
      setError(messageFor(err, "Couldn't load the server bans. Please try again."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function remove(ban: ServerBanDto) {
    setRemovingId(ban.Id);
    setError(null);
    try {
      await adminApi.removeServerBan(ban);
      await load();
    } catch (err) {
      setError(messageFor(err, "Couldn't remove that ban. Please try again."));
    } finally {
      setRemovingId(null);
    }
  }

  function startEdit(ban: ServerBanDto) {
    setEditingId(ban.Id);
    setEditReason(ban.Reason ?? "");
    setError(null);
  }

  async function saveEdit(ban: ServerBanDto) {
    setSavingEdit(true);
    setError(null);
    try {
      await adminApi.updateServerBan({ ...ban, Reason: editReason.trim() });
      setEditingId(null);
      await load();
    } catch (err) {
      setError(messageFor(err, "Couldn't update that ban. Please try again."));
    } finally {
      setSavingEdit(false);
    }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const nick = newNick.trim();
    if (!nick) return;
    setAdding(true);
    setError(null);
    try {
      // ServerBanDto is mostly server-populated. Created/Expires are non-nullable
      // DateTimes on the server, so send real values: Created is overwritten with
      // UtcNow server-side; a far-future Expires means the ban doesn't lapse.
      await adminApi.addServerBan({
        Id: 0,
        BannedUserId: null,
        BannedNick: nick,
        IPFilter: "",
        Reason: newReason.trim(),
        CreatedById: "",
        CreatedByNick: "",
        Created: new Date().toISOString(),
        Expires: "2999-12-31T00:00:00.000Z",
      });
      setNewNick("");
      setNewReason("");
      await load();
    } catch (err) {
      setError(messageFor(err, "Couldn't add that ban. Please try again."));
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <form
        onSubmit={add}
        className="flex flex-col gap-2 rounded-lg border border-[var(--line)] p-3"
      >
        <div className="text-sm font-medium">Add ban</div>
        <div className="flex flex-col gap-2">
          <input
            value={newNick}
            onChange={(e) => setNewNick(e.target.value)}
            placeholder="Nick"
            className="w-full min-w-0 rounded-md border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1.5 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
          />
          <div className="flex min-w-0 gap-2">
            <input
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              placeholder="Reason (optional)"
              className="min-w-0 flex-1 rounded-md border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1.5 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
            />
            <button
              type="submit"
              disabled={adding || !newNick.trim()}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-[var(--glow-b)] px-3.5 py-1.5 text-sm font-medium text-white hover:brightness-110 disabled:opacity-50"
            >
              {adding && <Spinner />}
              {adding ? "Adding" : "Add"}
            </button>
          </div>
        </div>
      </form>

      {loading && <Loading label="Loading bans…" />}

      {!loading && error && (
        <p className="py-4 text-center text-sm text-[var(--danger,#d9686c)]">{error}</p>
      )}

      {!loading && !error && bans.length === 0 && (
        <p className="py-6 text-center text-sm text-[var(--muted)]">No active server bans.</p>
      )}

      {!loading && bans.length > 0 && (
        <ul className="flex flex-col gap-2">
          {bans.map((ban) => (
            <li
              key={ban.Id}
              className="flex flex-col gap-2 rounded-lg border border-[var(--line)] px-3 py-2"
            >
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    {ban.BannedNick || ban.IPFilter || "Unknown"}
                  </div>
                  {editingId !== ban.Id && (
                    <div className="truncate text-xs text-[var(--muted)]">
                      {ban.Reason || "No reason given"}
                    </div>
                  )}
                  <div className="truncate text-xs text-[var(--muted)]">
                    {ban.Created ? formatDate(ban.Created) : ""}
                    {ban.CreatedByNick ? ` · by ${ban.CreatedByNick}` : ""}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  {editingId !== ban.Id && (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded-md border border-[var(--line)] px-2.5 py-1 text-xs text-[var(--text)] hover:bg-[var(--line)]"
                      onClick={() => startEdit(ban)}
                    >
                      Edit
                    </button>
                  )}
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-md border border-[var(--line)] px-2.5 py-1 text-xs text-[var(--text)] hover:bg-[var(--line)] disabled:opacity-50"
                    disabled={removingId === ban.Id}
                    onClick={() => remove(ban)}
                  >
                    {removingId === ban.Id && <Spinner className="h-3 w-3" />}
                    {removingId === ban.Id ? "Removing" : "Remove"}
                  </button>
                </div>
              </div>

              {editingId === ban.Id && (
                <div className="flex min-w-0 gap-2">
                  <input
                    value={editReason}
                    autoFocus
                    onChange={(e) => setEditReason(e.target.value)}
                    placeholder="Reason"
                    className="min-w-0 flex-1 rounded-md border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1.5 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
                  />
                  <button
                    type="button"
                    disabled={savingEdit}
                    onClick={() => saveEdit(ban)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-[var(--glow-b)] px-3 py-1.5 text-xs font-medium text-white hover:brightness-110 disabled:opacity-50"
                  >
                    {savingEdit && <Spinner className="h-3 w-3" />}
                    {savingEdit ? "Saving" : "Save"}
                  </button>
                  <button
                    type="button"
                    disabled={savingEdit}
                    onClick={() => setEditingId(null)}
                    className="inline-flex shrink-0 items-center rounded-md border border-[var(--line)] px-3 py-1.5 text-xs text-[var(--muted)] hover:bg-[var(--line)] hover:text-[var(--text)] disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function LookupSection() {
  const [nick, setNick] = useState("");
  const [info, setInfo] = useState<ServerUserInfoDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Admin promote/demote, per-action pending state.
  const [toggling, setToggling] = useState<"up" | "down" | null>(null);

  // Live connections / sockets for the looked-up user.
  const [sockets, setSockets] = useState<ServerUserSocketDto[] | null>(null);
  const [socketsLoading, setSocketsLoading] = useState(false);
  const [socketsError, setSocketsError] = useState<string | null>(null);

  // Password reset (admin-plus).
  const [resetOpen, setResetOpen] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [verifyPw, setVerifyPw] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetDone, setResetDone] = useState(false);

  const userId = info?.Info?.UserId;
  const found = Boolean(userId) && userId !== EMPTY_GUID;

  const loadSockets = useCallback(async (uid: string) => {
    setSocketsLoading(true);
    setSocketsError(null);
    try {
      const list = await adminApi.getUserSockets(uid);
      setSockets(list ?? []);
    } catch (err) {
      setSockets(null);
      setSocketsError(messageFor(err, "Couldn't load connections. Please try again."));
    } finally {
      setSocketsLoading(false);
    }
  }, []);

  const runLookup = useCallback(
    async (target: string) => {
      setLoading(true);
      setError(null);
      setInfo(null);
      setSockets(null);
      setSocketsError(null);
      setResetOpen(false);
      setResetDone(false);
      setResetError(null);
      setNewPw("");
      setVerifyPw("");
      try {
        const result = await adminApi.getUserInfo(target);
        setInfo(result);
        const uid = result?.Info?.UserId;
        if (uid && uid !== EMPTY_GUID) {
          await loadSockets(uid);
        }
      } catch (err) {
        setError(messageFor(err, "Couldn't find that user. Please try again."));
      } finally {
        setLoading(false);
      }
    },
    [loadSockets],
  );

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    const target = nick.trim();
    if (!target) return;
    await runLookup(target);
  }

  async function toggleAdmin(up: boolean) {
    if (!found || !info) return;
    setToggling(up ? "up" : "down");
    setError(null);
    try {
      await adminApi.toggleAdmin(up, info.Info.Nick);
      await runLookup(info.Info.Nick);
    } catch (err) {
      setError(
        messageFor(
          err,
          up
            ? "Couldn't promote that user. Please try again."
            : "Couldn't remove admin. Please try again.",
        ),
      );
    } finally {
      setToggling(null);
    }
  }

  async function resetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!found || !info) return;
    if (!newPw || newPw !== verifyPw) {
      setResetError("Passwords don't match.");
      return;
    }
    if (!window.confirm(`Reset the password for ${info.Info.Nick}?`)) return;
    setResetting(true);
    setResetError(null);
    setResetDone(false);
    try {
      await adminApi.resetUserPassword({
        UserId: info.Info.UserId,
        NewPassword: newPw,
        VerifyNewPassword: verifyPw,
      });
      setResetDone(true);
      setResetOpen(false);
      setNewPw("");
      setVerifyPw("");
    } catch (err) {
      setResetError(messageFor(err, "Couldn't reset that password. Please try again."));
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={lookup} className="flex gap-2">
        <input
          value={nick}
          onChange={(e) => setNick(e.target.value)}
          placeholder="Nick"
          className="flex-1 rounded-md border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1.5 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
        />
        <button
          type="submit"
          disabled={loading || !nick.trim()}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-[var(--line)] px-3 py-1.5 text-sm text-[var(--text)] hover:bg-[var(--line)] disabled:opacity-50"
        >
          {loading && <Spinner />}
          {loading ? "Looking" : "Look up"}
        </button>
      </form>

      {loading && <Loading label="Looking up user…" />}

      {!loading && error && (
        <p className="py-4 text-center text-sm text-[var(--danger,#d9686c)]">{error}</p>
      )}

      {!loading && info && (
        <div className="flex flex-col gap-3 rounded-lg border border-[var(--line)] p-3 text-sm">
          <div>
            <div className="font-medium">{info.Info?.Nick || "Unknown"}</div>
            {found && <div className="text-xs text-[var(--muted)]">{info.Info?.UserId}</div>}
          </div>

          {found && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => toggleAdmin(true)}
                disabled={toggling !== null}
                className="inline-flex items-center gap-1.5 rounded-md border border-[var(--line)] px-2.5 py-1 text-xs text-[var(--text)] hover:bg-[var(--line)] disabled:opacity-50"
              >
                {toggling === "up" ? (
                  <Spinner className="h-3 w-3" />
                ) : (
                  <i className="fa-solid fa-user-shield" />
                )}
                Make admin
              </button>
              <button
                type="button"
                onClick={() => toggleAdmin(false)}
                disabled={toggling !== null}
                className="inline-flex items-center gap-1.5 rounded-md border border-[var(--line)] px-2.5 py-1 text-xs text-[var(--text)] hover:bg-[var(--line)] disabled:opacity-50"
              >
                {toggling === "down" ? (
                  <Spinner className="h-3 w-3" />
                ) : (
                  <i className="fa-solid fa-user-minus" />
                )}
                Remove admin
              </button>
            </div>
          )}

          {found && <Field label="Active connections">{String(info.ConnectionCount)}</Field>}

          {found && (
            <div>
              <div className="mb-1 text-xs font-medium text-[var(--muted)]">Connections</div>
              {socketsLoading ? (
                <Loading label="Loading connections…" compact />
              ) : socketsError ? (
                <div className="text-xs text-[var(--danger,#d9686c)]">{socketsError}</div>
              ) : sockets && sockets.length ? (
                <ul className="flex flex-col gap-1">
                  {sockets.map((s) => (
                    <li
                      key={s.Id}
                      className="flex items-center justify-between gap-2 rounded-md border border-[var(--line)] px-2 py-1 font-mono text-xs"
                    >
                      <span className="truncate">{s.IPAddress || "-"}</span>
                      <span className="shrink-0 text-[var(--muted)]">{s.Id.slice(0, 8)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-xs text-[var(--muted)]">No live connections.</div>
              )}
            </div>
          )}

          <div>
            <div className="mb-1 text-xs font-medium text-[var(--muted)]">IP addresses</div>
            {info.IPAddresses?.length ? (
              <ul className="flex flex-col gap-0.5 font-mono text-xs">
                {info.IPAddresses.map((ip) => (
                  <li key={ip} className="truncate">
                    {ip}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-xs text-[var(--muted)]">None</div>
            )}
          </div>

          <div>
            <div className="mb-1 text-xs font-medium text-[var(--muted)]">Channels</div>
            {info.Channels?.length ? (
              <ul className="flex flex-col gap-1">
                {info.Channels.map((c) => (
                  <li
                    key={c.ChannelId}
                    className="flex items-center justify-between gap-2 rounded-md border border-[var(--line)] px-2 py-1 text-xs"
                  >
                    <span className="truncate">{c.Name || c.ChannelId}</span>
                    <span className="shrink-0 text-[var(--muted)]">{c.Level}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-xs text-[var(--muted)]">None</div>
            )}
          </div>

          {info.RelatedUsers?.length ? (
            <div>
              <div className="mb-1 text-xs font-medium text-[var(--muted)]">Related users</div>
              <ul className="flex flex-col gap-0.5 text-xs">
                {info.RelatedUsers.map((u) => (
                  <li key={u.UserId} className="truncate">
                    {u.Nick}{" "}
                    <span className="text-[var(--muted)]">({u.UserId})</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {found && (
            <div className="border-t border-[var(--line)] pt-3">
              {resetDone && (
                <p className="mb-2 text-xs text-[var(--muted)]">
                  <i className="fa-solid fa-check mr-1" />
                  Password reset.
                </p>
              )}
              {!resetOpen ? (
                <button
                  type="button"
                  onClick={() => {
                    setResetOpen(true);
                    setResetDone(false);
                    setResetError(null);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-md border border-[var(--line)] px-2.5 py-1 text-xs text-[var(--danger,#d9686c)] hover:bg-[var(--line)]"
                >
                  <i className="fa-solid fa-key" />
                  Reset password
                </button>
              ) : (
                <form onSubmit={resetPassword} className="flex flex-col gap-2">
                  <div className="text-xs font-medium text-[var(--muted)]">
                    Reset password for {info.Info.Nick}
                  </div>
                  <input
                    type="password"
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    placeholder="New password"
                    autoComplete="new-password"
                    className="w-full rounded-md border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1.5 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
                  />
                  <input
                    type="password"
                    value={verifyPw}
                    onChange={(e) => setVerifyPw(e.target.value)}
                    placeholder="Confirm new password"
                    autoComplete="new-password"
                    className="w-full rounded-md border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1.5 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
                  />
                  {resetError && (
                    <p className="text-xs text-[var(--danger,#d9686c)]">{resetError}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={resetting || !newPw || !verifyPw}
                      className="inline-flex items-center gap-1.5 rounded-md bg-[var(--danger,#d9686c)] px-3 py-1.5 text-xs font-medium text-white hover:brightness-110 disabled:opacity-50"
                    >
                      {resetting && <Spinner className="h-3 w-3" />}
                      {resetting ? "Resetting" : "Reset password"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setResetOpen(false);
                        setResetError(null);
                        setNewPw("");
                        setVerifyPw("");
                      }}
                      disabled={resetting}
                      className="rounded-md border border-[var(--line)] px-3 py-1.5 text-xs text-[var(--text)] hover:bg-[var(--line)] disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs font-medium text-[var(--muted)]">{label}</span>
      <span className="text-sm">{children}</span>
    </div>
  );
}

type ImportKind = "full" | "users" | "channels" | "moderators";

/** Paste-JSON Anope migration importer (admin-only). */
function ImportSection() {
  const [kind, setKind] = useState<ImportKind>("full");
  const [json, setJson] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    setOk(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      setError("That isn't valid JSON.");
      setBusy(false);
      return;
    }
    try {
      if (kind === "full") await importApi.anope(parsed as never);
      else if (kind === "users") await importApi.registerUsers(parsed as never);
      else if (kind === "channels") await importApi.registerChannels(parsed as never);
      else await importApi.registerModerators(parsed as never);
      setOk("Import completed.");
    } catch (err) {
      setError(messageFor(err, "Import failed. Check the payload and try again."));
    } finally {
      setBusy(false);
    }
  }

  const placeholder =
    kind === "full"
      ? '{ "Nicknames": [...], "Channels": [...], "Moderators": [...] }'
      : kind === "users"
        ? '[ { "nick": "...", "email": "...", "password": "...", "register_date": "...", "last_connection_date": "..." } ]'
        : kind === "channels"
          ? '[ { "name": "...", "founder": "...", "time_registered": "...", "forbidden": false } ]'
          : '[ { "nick": "...", "channel": "...", "level": 0, "last_seen": "..." } ]';

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-[var(--muted)]">
        Migrate an Anope export. Paste the JSON payload for the selected type.
      </p>

      <div className="flex flex-wrap gap-1 rounded-md border border-[var(--line)] p-1">
        {(
          [
            { k: "full", label: "Full import" },
            { k: "users", label: "Users" },
            { k: "channels", label: "Channels" },
            { k: "moderators", label: "Moderators" },
          ] as const
        ).map((o) => (
          <button
            key={o.k}
            type="button"
            onClick={() => setKind(o.k)}
            className={`flex-1 rounded px-2.5 py-1 text-xs font-medium ${
              kind === o.k
                ? "bg-[var(--glow-b)] text-white"
                : "text-[var(--muted)] hover:bg-[var(--line)] hover:text-[var(--text)]"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      <textarea
        value={json}
        onChange={(e) => setJson(e.target.value)}
        placeholder={placeholder}
        rows={8}
        className="w-full resize-y rounded-md border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1.5 font-mono text-xs text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--glow-b)]"
      />

      <button
        type="button"
        onClick={run}
        disabled={busy || !json.trim()}
        className="inline-flex items-center justify-center gap-2 rounded-md bg-[var(--glow-b)] px-3.5 py-1.5 text-sm font-medium text-white hover:brightness-110 disabled:opacity-50"
      >
        {busy && <Spinner className="h-4 w-4" />}
        {busy ? "Importing…" : "Run import"}
      </button>

      {error && <p className="text-center text-sm text-[var(--danger,#d9686c)]">{error}</p>}
      {ok && <p className="text-center text-sm text-rambler-turquoise">{ok}</p>}
    </div>
  );
}
