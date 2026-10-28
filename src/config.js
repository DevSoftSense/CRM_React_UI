// Keep CommonJS shape (Velzon). Resolve CRM API without Themesbrand.
const THEMESBRAND_HOST = /themesbrand\.website|api-node\.themesbrand/i;
const stripSlash = (url) => String(url || "").trim().replace(/\/$/, "");

function getCrmApiBaseUrl() {
  const fromEnv = stripSlash(process.env.REACT_APP_API_URL);
  if (fromEnv && !THEMESBRAND_HOST.test(fromEnv)) return fromEnv;
  if (process.env.NODE_ENV === "production") return "https://crmapi.softoncloud.com";
  return "http://localhost:5191";
}

module.exports = {
  google: {
    API_KEY: "",
    CLIENT_ID: "",
    SECRET: "",
  },
  facebook: {
    APP_ID: "",
  },
  api: {
    API_URL: getCrmApiBaseUrl(),
  },
  app: {
    UI_ORIGIN:
      process.env.REACT_APP_UI_ORIGIN ||
      (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"),
  },
};
