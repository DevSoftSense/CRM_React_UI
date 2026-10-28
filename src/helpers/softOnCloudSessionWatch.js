/**
 * Cross-browser session watch — SignalR push (no session-check / no SoftOnCloud poll).
 * Kept filename for AuthProtected imports.
 */

export {
  startSessionRealtime as startSoftOnCloudSessionWatch,
  stopSessionRealtime as stopSoftOnCloudSessionWatch,
  getSessionHubConnectionId,
  reconnectSessionRealtime,
} from "./sessionRealtime";
