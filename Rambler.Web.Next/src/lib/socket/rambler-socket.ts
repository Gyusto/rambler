import { env } from "@/lib/config/env";
import type { ResponseEnvelope } from "@/types/protocol";

type ResponseHandler = (msg: ResponseEnvelope) => void;
type StatusHandler = (e?: CloseEvent | Event) => void;

/**
 * Thin WebSocket client for the Rambler protocol.
 *
 * - Outbound: `send(key, data)` writes `<KEY><json>`.
 * - Inbound: parses the JSON envelope and forwards it to `onResponse`.
 * - Auto-reconnects unless closed intentionally or on auth/ban close codes.
 */
export class RamblerSocket {
  private ws: WebSocket | null = null;
  private token: string;
  private intentionalClose = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  onResponse: ResponseHandler = () => {};
  onOpen: StatusHandler = () => {};
  onClose: StatusHandler = () => {};
  onError: StatusHandler = () => {};

  constructor(token: string) {
    this.token = token;
  }

  connect() {
    this.intentionalClose = false;
    const url = `${this.baseUrl()}/?token=${encodeURIComponent(this.token)}`;
    const ws = new WebSocket(url);
    this.ws = ws;

    ws.onopen = (e) => this.onOpen(e);
    ws.onerror = (e) => this.onError(e);

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data as string) as ResponseEnvelope;
        this.onResponse(msg);
      } catch {
        // ignore malformed frames
      }
    };

    ws.onclose = (e) => {
      this.onClose(e);
      // 1007 = bad auth token, 1008 = server ban -> do not auto-reconnect
      if (this.intentionalClose || e.code === 1007 || e.code === 1008) return;
      this.reconnectTimer = setTimeout(() => this.connect(), 2000);
    };
  }

  /** Same-origin ws URL by default; NEXT_PUBLIC_WS_URL overrides. */
  private baseUrl() {
    if (env.wsUrl) return env.wsUrl;
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${window.location.host}`;
  }

  /** Outbound frame: key + JSON body, no separator. */
  send<T>(key: string, data: T) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(key + JSON.stringify(data));
    }
  }

  disconnect() {
    this.intentionalClose = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }

  get isOpen() {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
