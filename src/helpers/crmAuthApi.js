import axios from "axios";
import { setAuthorization } from "./api_helper";
import { getCrmApiBaseUrl } from "./crmApiBase";
import {
  clearAuthUser,
  clearTabForceLogout,
  getStoredAuthToken,
  bindTabPasswordEpoch,
  kickOtherTabsAfterPasswordChange,
  markTabForceLogout,
  readAuthUser,
  writeAuthUser,
} from "./authSession";

/**
 * SoftOnCloud platform auth client (https://api.softoncloud.com).
 * Login / resolve-context — same pattern as Appointment (Auth API v2.5).
 */
const socApi = axios.create({
  baseURL: process.env.REACT_APP_SOFTONCLOUD_API_URL || "https://api.softoncloud.com",
  headers: { "Content-Type": "application/json" },
});

/** CRM product API only (localhost:5191 / crmapi) — never Themesbrand */
const crmAxios = axios.create({
  baseURL: getCrmApiBaseUrl(),
  headers: { "Content-Type": "application/json" },
});


/** SoftOnCloud app-id for CRM — from env only (never invent). Senior = 28. */
const getProductId = () =>
  Number(process.env.REACT_APP_CRM_PRODUCT_ID || "28");

const readSocErrorMessage = (error, fallback) => {
  const data = error?.response?.data;
  if (typeof data?.message === "string" && data.message.trim()) {
    return data.message;
  }
  if (typeof data === "string" && data.trim()) {
    return data;
  }
  return fallback;
};

/**
 * Full CRM login (Appointment pattern):
 * 1) SoftOnCloud POST /api/auth/login
 * 2) SoftOnCloud GET /api/auth/resolve-context?productId=28
 * 3) CRM API POST /api/auth/session-renew
 */
export const crmLogin = async ({ orgId, email, password, rememberMe }) => {
  const loginPayload = {
    orgId: Number(orgId),
    email: String(email || "").trim(),
    password,
    rememberMe: Boolean(rememberMe),
  };

  let loginResponse;
  try {
    const { data } = await socApi.post("/api/auth/login", loginPayload);
    loginResponse = data;
  } catch (error) {
    throw new Error(
      readSocErrorMessage(error, "Unable to sign in. Please check your credentials.")
    );
  }

  if (!loginResponse?.token) {
    throw new Error("Login succeeded but no access token was returned.");
  }

  setAuthorization(loginResponse.token);

  const productId = getProductId();
  let productContext;
  try {
    const { data } = await socApi.get("/api/auth/resolve-context", {
      params: { productId },
      headers: { Authorization: `Bearer ${loginResponse.token}` },
    });
    productContext = data;
  } catch (error) {
    const status = error?.response?.status;
    if (status === 403) {
      const reason = error?.response?.data?.denialReason;
      const message = readSocErrorMessage(
        error,
        "You do not have access to the CRM product."
      );
      throw new Error(reason ? `${message} (${reason})` : message);
    }
    if (status === 401) {
      setAuthorization(null);
      throw new Error(
        readSocErrorMessage(error, "Your session has ended. Please sign in again.")
      );
    }
    throw new Error(
      readSocErrorMessage(error, "Unable to authorize CRM product access.")
    );
  }

  if (!productContext?.accessGranted) {
    throw new Error(
      productContext?.denialReason
        ? `Access denied: ${productContext.denialReason}`
        : "You do not have access to the CRM product."
    );
  }

  const user = normalizeLoginUser(loginResponse.user, loginResponse.token, productContext);

  const session = {
    token: loginResponse.token,
    refreshToken: loginResponse.refreshToken,
    expiresAt: loginResponse.expiresAt,
    sessionId: loginResponse.sessionId,
    rememberMe: loginResponse.rememberMe,
    user,
    productContext,
    productId,
    appId: productId,
  };

  try {
    writeAuthUser(session);
    setAuthorization(session.token);
    // Absolute CRM API — never inherits Themesbrand axios defaults
    crmAxios.defaults.baseURL = getCrmApiBaseUrl();
    await crmAxios.post(
      "/api/auth/session-renew",
      {},
      { headers: { Authorization: `Bearer ${session.token}` } }
    );
  } catch {
    /* SoftOnCloud login already succeeded — do not fail sign-in on renew */
  }

  return session;
};

export const revokeCrmSessionsOnAllDevices = async (opts = {}) => {
  const token = getStoredAuthToken();
  if (!token) return;
  try {
    setAuthorization(token);
    crmAxios.defaults.baseURL = getCrmApiBaseUrl();
    await crmAxios.post(
      "/api/auth/logout",
      {
        reason: opts.reason || "session_ended",
        exceptConnectionId: opts.exceptConnectionId || null,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
  } catch {
    /* continue */
  }
};

export const forceSoftOnCloudLocalLogout = (reason = "password_changed") => {
  markTabForceLogout();
  clearAuthUser();
  setAuthorization(null);
  const safe = reason === "session_ended" ? "session_ended" : "password_changed";
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.location.href = `/login?reason=${safe}`;
  }
};

const normalizeLoginUser = (rawUser, token, productContext) => {
  const u = rawUser && typeof rawUser === "object" ? { ...rawUser } : {};
  const ctxUser = productContext?.user;
  if (ctxUser && typeof ctxUser === "object") {
    if (ctxUser.userType && !u.userType) u.userType = ctxUser.userType;
    if (ctxUser.user_type && !u.user_type) u.user_type = ctxUser.user_type;
    if (ctxUser.isOwner != null && u.isOwner == null) u.isOwner = ctxUser.isOwner;
  }
  if (!u.orgId && u.org_id) u.orgId = u.org_id;
  if (!u.userId && u.user_id) u.userId = u.user_id;
  if (!u.displayName) {
    const parts = [u.firstName, u.lastName].filter(Boolean);
    u.displayName = parts.length ? parts.join(" ") : u.email || "User";
  }
  return u;
};

socApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      const code = String(error?.response?.data?.code || "").toUpperCase();
      if (code === "PASSWORD_CHANGED") {
        forceSoftOnCloudLocalLogout("password_changed");
      }
    }
    return Promise.reject(error);
  }
);

export { getProductId, readAuthUser, writeAuthUser, clearAuthUser, clearTabForceLogout, bindTabPasswordEpoch, kickOtherTabsAfterPasswordChange };
