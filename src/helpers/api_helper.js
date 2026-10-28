import axios from "axios";
import { getCrmApiBaseUrl } from "./crmApiBase";
import {
  clearAuthUser,
  getStoredAuthToken,
  markTabForceLogout,
  readAuthUser,
} from "./authSession";

const CRM_API_BASE = getCrmApiBaseUrl();

// Always CRM product API — never Themesbrand
axios.defaults.baseURL = CRM_API_BASE;
axios.defaults.headers.post["Content-Type"] = "application/json";

axios.interceptors.request.use((config) => {
  // Re-assert base URL on every request (guards against stale HMR / mock overrides)
  if (!config.baseURL || /themesbrand/i.test(String(config.baseURL))) {
    config.baseURL = getCrmApiBaseUrl();
  }

  try {
    const auth = readAuthUser();
    const roles = Array.isArray(auth?.productContext?.roles)
      ? auth.productContext.roles
      : [];
    const codes = roles
      .map((r) => String(r?.roleCode || r?.role_code || "").trim())
      .filter(Boolean);
    config.headers = config.headers || {};
    if (codes.length) {
      config.headers["X-Role-Codes"] = codes.join(",");
    }
    const userType =
      auth?.user?.userType || auth?.user?.user_type || "";
    if (userType) {
      config.headers["X-User-Type"] = String(userType).trim();
    }
  } catch {
    /* ignore */
  }
  return config;
});

const token = getStoredAuthToken();
if (token) {
  axios.defaults.headers.common["Authorization"] = "Bearer " + token;
}

axios.interceptors.response.use(
  function (response) {
    return response.data ? response.data : response;
  },
  function (error) {
    const status = error.response?.status;
    const data = error.response?.data;
    let message = data?.message;

    if (status === 401) {
      const reqUrl = String(error.config?.url || "");
      if (reqUrl.includes("/api/auth/session-renew")) {
        return Promise.reject({
          message: data?.message || "Session renew failed",
          status,
          data,
        });
      }

      const code = String(data?.code || "").toUpperCase();
      const path = typeof window !== "undefined" ? window.location.pathname : "";
      if (path && path !== "/login") {
        const usedRaw =
          error.config?.headers?.Authorization ||
          error.config?.headers?.authorization ||
          "";
        const usedToken = String(usedRaw)
          .replace(/^Bearer\s+/i, "")
          .trim();
        const storedToken = getStoredAuthToken();

        if (
          code === "PASSWORD_CHANGED" &&
          usedToken &&
          storedToken &&
          usedToken !== storedToken
        ) {
          markTabForceLogout();
          delete axios.defaults.headers.common["Authorization"];
          window.location.href = "/login?reason=password_changed";
        } else {
          clearAuthUser();
          delete axios.defaults.headers.common["Authorization"];
          const reason =
            code === "PASSWORD_CHANGED" ? "password_changed" : "session_ended";
          window.location.href = `/login?reason=${reason}`;
        }
      }
    }

    if (!message) {
      // Axios "Network Error" = no HTTP response (API down / wrong port / CORS)
      if (!error.response && (error.message === "Network Error" || error.code === "ERR_NETWORK")) {
        message =
          "Cannot reach CRM API at " +
          (getCrmApiBaseUrl() || "http://localhost:5191") +
          ". Start CRM.API (port 5191), then refresh.";
      } else {
        switch (status) {
          case 500:
            message = "Internal Server Error";
            break;
          case 401:
            message = "Invalid credentials";
            break;
          case 403:
            message = "Access denied";
            break;
          case 404:
            message =
              "API route not found (404). Stop CRM.API, rebuild, start again on port 5191, then check Swagger for /api/contacts (or /api/leads).";
            break;
          default:
            message = error.message || "Something went wrong";
        }
      }
    }

    return Promise.reject({ message, status, data, code: error.code });
  }
);


const setAuthorization = (tokenValue) => {
  if (tokenValue) {
    axios.defaults.headers.common["Authorization"] = "Bearer " + tokenValue;
  } else {
    delete axios.defaults.headers.common["Authorization"];
  }
};

class APIClient {
  /**
   * GET with optional query object. Uses axios `params` (Appointment-safe).
   * Do not pass the params object as the axios config root — that caused odd 404s/noise.
   */
  get = (url, params) => {
    if (params && typeof params === "object" && Object.keys(params).length > 0) {
      return axios.get(url, { params });
    }
    return axios.get(url);
  };

  create = (url, data) => axios.post(url, data);
  update = (url, data) => axios.patch(url, data);
  put = (url, data) => axios.put(url, data);
  delete = (url, config) => axios.delete(url, { ...config });
}

const getLoggedinUser = () => readAuthUser();

export { APIClient, setAuthorization, getLoggedinUser, getCrmApiBaseUrl };
