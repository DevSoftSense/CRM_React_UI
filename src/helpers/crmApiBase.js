/**
 * CRM product API base URL only.
 * Blocks leftover Velzon Themesbrand demo host (api-node.themesbrand.website).
 */

const THEMESBRAND_HOST = /themesbrand\.website|api-node\.themesbrand/i;

const LOCAL_CRM_API = "http://localhost:5191";
const LIVE_CRM_API = "https://crmapi.softoncloud.com";

const stripSlash = (url) => String(url || "").trim().replace(/\/$/, "");

export function getCrmApiBaseUrl() {
  const fromEnv = stripSlash(process.env.REACT_APP_API_URL);

  if (fromEnv && !THEMESBRAND_HOST.test(fromEnv)) {
    return fromEnv;
  }

  if (process.env.NODE_ENV === "production") {
    return LIVE_CRM_API;
  }

  return LOCAL_CRM_API;
}

export default { getCrmApiBaseUrl };
