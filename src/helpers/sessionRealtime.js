/**
 * Cross-browser logout / password change — SignalR push only.
 * No session-check. No SoftOnCloud session-status.
 */

import {
  HubConnectionBuilder,
  HubConnectionState,
  HttpTransportType,
  LogLevel,
} from "@microsoft/signalr";
import { getCrmApiBaseUrl } from "./crmApiBase";
import { getStoredAuthToken, isTabForceLogout, readAuthUser } from "./authSession";

let connection = null;
let refCount = 0;
let onForceLogout = null;
let startPromise = null;
/** While THIS tab changes password + silent re-login, ignore ForceLogout (other devices still kicked). */
let ignoreForceLogoutUntil = 0;

export const getSessionHubConnectionId = () =>
  connection?.connectionId ? String(connection.connectionId) : null;

/** Call before revoke/re-login so this tab is not bounced to login. */
export const beginPasswordChangeSessionShield = (ms = 20000) => {
  ignoreForceLogoutUntil = Date.now() + Math.max(3000, Number(ms) || 20000);
};

export const endPasswordChangeSessionShield = () => {
  ignoreForceLogoutUntil = 0;
};

const hubBaseUrl = () => `${getCrmApiBaseUrl()}/hubs/session`;

const handleForceLogoutPayload = (payload) => {
  if (typeof onForceLogout !== "function") return;
  if (isTabForceLogout()) return;
  if (Date.now() < ignoreForceLogoutUntil) return;
  const reason =
    String(payload?.reason || "").toLowerCase() === "password_changed"
      ? "password_changed"
      : "session_ended";
  onForceLogout(reason);
};

const stopConnectionOnly = async () => {
  const conn = connection;
  connection = null;
  if (!conn) return;
  try {
    conn.off("ForceLogout");
    if (conn.state !== HubConnectionState.Disconnected) {
      await conn.stop();
    }
  } catch {
    /* ignore */
  }
};

const connectOnce = async () => {
  const token = getStoredAuthToken();
  if (!token || isTabForceLogout() || !readAuthUser()) return;

  if (
    connection &&
    (connection.state === HubConnectionState.Connected ||
      connection.state === HubConnectionState.Connecting ||
      connection.state === HubConnectionState.Reconnecting)
  ) {
    return;
  }

  await stopConnectionOnly();

  const conn = new HubConnectionBuilder()
    .withUrl(hubBaseUrl(), {
      accessTokenFactory: () => getStoredAuthToken() || "",
      // LongPolling first is more reliable behind some local proxies; WS still tried via fallback order
      transport: HttpTransportType.WebSockets | HttpTransportType.LongPolling,
      skipNegotiation: false,
    })
    .withAutomaticReconnect([0, 500, 1000, 2000, 5000])
    .configureLogging(LogLevel.Information)
    .build();

  conn.on("ForceLogout", handleForceLogoutPayload);
  connection = conn;

  await conn.start();
};

const startInternal = async (handler) => {
  if (typeof handler === "function") {
    onForceLogout = handler;
  }

  if (startPromise) {
    await startPromise;
    return;
  }

  startPromise = (async () => {
    try {
      await connectOnce();
    } catch (err) {
      console.warn("[sessionRealtime] SignalR connect failed:", err?.message || err);
      await stopConnectionOnly();
      try {
        await new Promise((r) => setTimeout(r, 300));
        // Retry with LongPolling only
        const token = getStoredAuthToken();
        if (!token || isTabForceLogout()) return;
        const conn = new HubConnectionBuilder()
          .withUrl(hubBaseUrl(), {
            accessTokenFactory: () => getStoredAuthToken() || "",
            transport: HttpTransportType.LongPolling,
          })
          .withAutomaticReconnect([0, 1000, 3000, 5000])
          .configureLogging(LogLevel.Information)
          .build();
        conn.on("ForceLogout", handleForceLogoutPayload);
        connection = conn;
        await conn.start();
      } catch (err2) {
        console.warn("[sessionRealtime] SignalR retry failed:", err2?.message || err2);
        await stopConnectionOnly();
      }
    }
  })();

  try {
    await startPromise;
  } finally {
    startPromise = null;
  }
};

/**
 * @param {(reason: string) => void} onKick
 * @returns {() => void} cleanup
 */
export function startSessionRealtime(onKick) {
  if (typeof onKick === "function") {
    onForceLogout = onKick;
  }

  if (refCount === 0) {
    void startInternal(onKick);
  }

  refCount += 1;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    refCount = Math.max(0, refCount - 1);
    if (refCount === 0) {
      void stopConnectionOnly();
      onForceLogout = null;
    }
  };
}

export function stopSessionRealtime() {
  refCount = 0;
  onForceLogout = null;
  startPromise = null;
  void stopConnectionOnly();
}

export async function reconnectSessionRealtime(onKick) {
  if (typeof onKick === "function") {
    onForceLogout = onKick;
  }
  await stopConnectionOnly();
  if (refCount === 0) {
    refCount = 1;
  }
  await startInternal(onForceLogout);
}
