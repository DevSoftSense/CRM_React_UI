/**
 * CRM always uses SoftOnCloud auth (product 28).
 * Default to "crm" so Themesbrand fake /auth/signin is never used.
 */
export const getDefaultAuth = () =>
  String(process.env.REACT_APP_DEFAULTAUTH || "crm")
    .trim()
    .toLowerCase();

export const isCrmAuth = () => getDefaultAuth() === "crm";

export const isFakeAuth = () => getDefaultAuth() === "fake";
