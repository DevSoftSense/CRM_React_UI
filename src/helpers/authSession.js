/**
 * SoftOnCloud CRM auth session — HOS-style persistence.
 *
 * Use localStorage (shared across tabs) so middle-click / open-in-new-tab
 * stays logged in. Mirror to sessionStorage for compatibility.
 */

const AUTH_USER_KEY = "authUser";
const TOKEN_KEY = "token";
const SOC_TOKEN_KEY = "socAccessToken";

/** Per-tab flag: this tab must re-login after password changed elsewhere (shared localStorage stays). */
const TAB_FORCE_LOGOUT_KEY = "soc_tab_force_logout";
/** Cross-tab signal (storage event fires in other tabs only). */
const AUTH_BROADCAST_KEY = "crm_soc_auth_event";
const AUTH_CHANNEL_NAME = "crm-soc-auth";
/**
 * Shared localStorage epoch — bumped when password changes.
 * Each tab keeps its own copy in sessionStorage; mismatch = logout (no API poll).
 */
const PASSWORD_EPOCH_KEY = "crm_soc_password_epoch";
const TAB_PASSWORD_EPOCH_KEY = "soc_tab_password_epoch";

const safeParse = (raw) => {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

/**
 * Prefer localStorage (cross-tab); fall back to sessionStorage (legacy).
 */
export const readAuthUser = () => {
  const fromLocal = safeParse(localStorage.getItem(AUTH_USER_KEY));
  if (fromLocal && typeof fromLocal === "object") {
    return fromLocal;
  }
  const fromSession = safeParse(sessionStorage.getItem(AUTH_USER_KEY));
  if (fromSession && typeof fromSession === "object") {
    // Migrate legacy session-only auth into localStorage so new tabs work.
    try {
      writeAuthUser(fromSession);
    } catch {
      /* ignore */
    }
    return fromSession;
  }
  return null;
};

export const writeAuthUser = (session) => {
  if (!session || typeof session !== "object") {
    clearAuthUser();
    return;
  }

  const raw = JSON.stringify(session);
  localStorage.setItem(AUTH_USER_KEY, raw);
  try {
    sessionStorage.setItem(AUTH_USER_KEY, raw);
  } catch {
    /* private mode / quota */
  }

  const token = session.token || session.socAccessToken || null;
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(SOC_TOKEN_KEY, token);
    try {
      sessionStorage.setItem(TOKEN_KEY, token);
      sessionStorage.setItem(SOC_TOKEN_KEY, token);
    } catch {
      /* ignore */
    }
  }
};

export const clearAuthUser = () => {
  localStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(SOC_TOKEN_KEY);
  try {
    sessionStorage.removeItem(AUTH_USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(SOC_TOKEN_KEY);
  } catch {
    /* ignore */
  }
};

export const getStoredAuthToken = () => {
  const auth = readAuthUser();
  return (
    auth?.token ||
    auth?.socAccessToken ||
    localStorage.getItem(SOC_TOKEN_KEY) ||
    localStorage.getItem(TOKEN_KEY) ||
    sessionStorage.getItem(SOC_TOKEN_KEY) ||
    sessionStorage.getItem(TOKEN_KEY) ||
    null
  );
};

/** True when THIS browser tab was kicked after password change in another tab. */
export const isTabForceLogout = () => {
  try {
    return sessionStorage.getItem(TAB_FORCE_LOGOUT_KEY) === "1";
  } catch {
    return false;
  }
};

export const markTabForceLogout = () => {
  try {
    sessionStorage.setItem(TAB_FORCE_LOGOUT_KEY, "1");
  } catch {
    /* ignore */
  }
};

export const clearTabForceLogout = () => {
  try {
    sessionStorage.removeItem(TAB_FORCE_LOGOUT_KEY);
  } catch {
    /* ignore */
  }
};

/** Read shared password-change epoch (localStorage). */
export const getPasswordEpoch = () => {
  try {
    return String(localStorage.getItem(PASSWORD_EPOCH_KEY) || "0");
  } catch {
    return "0";
  }
};

/**
 * Bind this tab to the current password epoch (call after login / after THIS tab changes password).
 * Uses sessionStorage so it is per-tab only.
 */
export const bindTabPasswordEpoch = (epoch = getPasswordEpoch()) => {
  try {
    sessionStorage.setItem(TAB_PASSWORD_EPOCH_KEY, String(epoch || "0"));
  } catch {
    /* ignore */
  }
};

/** True when another tab in THIS browser bumped the password epoch. */
export const isPasswordEpochStale = () => {
  try {
    const shared = getPasswordEpoch();
    const bound = String(sessionStorage.getItem(TAB_PASSWORD_EPOCH_KEY) || "0");
    // shared bumped and this tab still on an older (or unbound) epoch
    return shared !== "0" && shared !== bound;
  } catch {
    return false;
  }
};

const LOGOUT_BROADCAST_TYPE = "LOGGED_OUT";

const postAuthBroadcast = (payload) => {
  try {
    const bc = new BroadcastChannel(AUTH_CHANNEL_NAME);
    bc.postMessage(payload);
    bc.close();
  } catch {
    /* unsupported */
  }
  try {
    localStorage.setItem(AUTH_BROADCAST_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
};

/** Same browser other tabs — password change. */
export const kickOtherTabsAfterPasswordChange = () => {
  const at = Date.now();
  const epoch = String(at);
  try {
    localStorage.setItem(PASSWORD_EPOCH_KEY, epoch);
  } catch {
    /* ignore */
  }
  postAuthBroadcast({ type: "PASSWORD_CHANGED", at, epoch });
};

/** Same browser other tabs — logout. Call BEFORE clearAuthUser. */
export const kickOtherTabsAfterLogout = () => {
  postAuthBroadcast({ type: LOGOUT_BROADCAST_TYPE, at: Date.now() });
};

/**
 * @param {(reason: 'password_changed' | 'session_ended') => void} onKick
 */
export const installAuthCrossTabListener = (onKick) => {
  if (typeof window === "undefined" || typeof onKick !== "function") {
    return () => {};
  }

  let handling = false;
  const kick = (reason) => {
    if (handling || isTabForceLogout()) return;
    handling = true;
    onKick(reason);
  };

  const handlePayload = (data) => {
    if (!data?.type) return;
    if (data.type === "PASSWORD_CHANGED") kick("password_changed");
    if (data.type === LOGOUT_BROADCAST_TYPE) kick("session_ended");
  };

  let bc = null;
  try {
    bc = new BroadcastChannel(AUTH_CHANNEL_NAME);
    bc.onmessage = (event) => handlePayload(event?.data);
  } catch {
    bc = null;
  }

  const onStorage = (event) => {
    if (event.key === PASSWORD_EPOCH_KEY && event.newValue && isPasswordEpochStale()) {
      kick("password_changed");
      return;
    }
    if (event.key === AUTH_USER_KEY && !event.newValue) {
      kick("session_ended");
      return;
    }
    if (event.key !== AUTH_BROADCAST_KEY || !event.newValue) return;
    try {
      handlePayload(JSON.parse(event.newValue));
    } catch {
      /* ignore */
    }
  };
  window.addEventListener("storage", onStorage);

  const onVisible = () => {
    if (document.visibilityState === "visible" && isPasswordEpochStale()) {
      kick("password_changed");
    }
  };
  document.addEventListener("visibilitychange", onVisible);

  return () => {
    window.removeEventListener("storage", onStorage);
    document.removeEventListener("visibilitychange", onVisible);
    try {
      bc?.close();
    } catch {
      /* ignore */
    }
  };
};

/** Turn SoftOnCloud role codes into a short UI label (e.g. APPOINTMENT_RECEPTIONIST → Receptionist). */
const humanizeRoleCode = (code) => {
  const raw = String(code || "").trim();
  if (!raw) return "";
  const upper = raw.toUpperCase();
  if (upper === "ORG_OWNER" || upper === "OWNER" || upper === "ORGADMIN") return "Owner";
  if (upper === "ADMIN" || upper.endsWith("_ADMIN")) return "Admin";
  return raw
    .replace(/^APPOINTMENT[_-]?/i, "")
    .replace(/^SOC[_-]?/i, "")
    .replace(/[_-]+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

/**
 * Role label under the header name — from SoftOnCloud resolve-context roles
 * (not a hardcoded "Founder").
 */
export const resolveAuthRoleLabel = (authUser = readAuthUser()) => {
  if (!authUser || typeof authUser !== "object") return "User";

  const roles = Array.isArray(authUser.productContext?.roles)
    ? authUser.productContext.roles
    : [];

  const labels = [];
  const seen = new Set();
  for (const r of roles) {
    const name = String(r?.roleName || r?.role_name || r?.name || "").trim();
    const code = String(r?.roleCode || r?.role_code || r?.code || "").trim();
    const label = name || humanizeRoleCode(code);
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    labels.push(label);
  }

  if (labels.length) {
    // Prefer product roles over platform Owner when both exist
    const productOnly = labels.filter((l) => {
      const x = l.toLowerCase();
      return x !== "owner" && x !== "admin";
    });
    return (productOnly.length ? productOnly : labels).slice(0, 2).join(", ");
  }

  const userType = String(
    authUser.user?.userType ||
      authUser.user?.user_type ||
      authUser.productContext?.userType ||
      authUser.productContext?.user_type ||
      ""
  )
    .trim()
    .toLowerCase();
  if (userType === "prime" || userType === "owner" || userType === "org_owner") {
    return "Owner";
  }

  return "User";
};

export const resolveAuthDisplay = (authUser = readAuthUser()) => {
  if (!authUser || typeof authUser !== "object") {
    return { name: "Admin", email: "", id: "", roleLabel: "User" };
  }

  // SoftOnCloud Appointment login: { token, user, productContext, ... }
  if (authUser.user || (authUser.token && authUser.productContext)) {
    const u = authUser.user || {};
    const name =
      u.displayName ||
      u.fullName ||
      [u.firstName, u.lastName].filter(Boolean).join(" ").trim() ||
      u.first_name ||
      u.name ||
      u.email ||
      "Admin";
    return {
      name,
      email: u.email || "",
      id: String(u.userId ?? u.uid ?? u.id ?? ""),
      roleLabel: resolveAuthRoleLabel(authUser),
    };
  }

  // Velzon fake backend: { status, data: { first_name, email, _id } }
  if (authUser.data && typeof authUser.data === "object") {
    return {
      name: authUser.data.first_name || authUser.username || "Admin",
      email: authUser.data.email || "",
      id: String(authUser.data._id ?? ""),
      roleLabel: resolveAuthRoleLabel(authUser),
    };
  }

  // Dev bypass / flat objects
  return {
    name:
      authUser.first_name ||
      authUser.displayName ||
      authUser.username ||
      authUser.email ||
      "Admin",
    email: authUser.email || "",
    id: String(authUser.uid ?? authUser.id ?? ""),
    roleLabel: resolveAuthRoleLabel(authUser),
  };
};
