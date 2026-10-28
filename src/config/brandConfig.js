/**
 * SoftOnCloud CRM — brand logo & colors (single source of truth).
 *
 * When senior asks to change logo or colors, edit THIS FILE only.
 * Logo file: public/logo.png (Gradient Cloud Team Icon).
 *
 * Current: maroon #7f1d1d
 */

export const brandColors = {
  /** Landing navbar / primary */
  primary: "#7f1d1d",
  /** Landing sticky / footer deep */
  primaryDark: "#5c1018",
  /** Hover */
  primaryHover: "#991b1b",
  /** Soft accent on dark red */
  primaryLight: "#fca5a5",
  menuText: "#ffffff",
  menuMuted: "rgba(255, 255, 255, 0.82)",
  subMenuText: "rgba(255, 255, 255, 0.68)",
  menuTitle: "rgba(255, 255, 255, 0.45)",
};

export const brandLogos = {
  /** Main logo — landing, login, footer, sidebar, favicon */
  main: "/logo.png",
  /** Same mark (collapsed sidebar / small) */
  mark: "/logo.png",
};

export const brandText = {
  fullName: "SoftOnCloud CRM",
  productName: "CRM",
  companyName: "SoftOnCloud",
  tagline: "Sales · Leads · Pipeline",
  landingSubtitle: "SoftOnCloud",
  /** App shell footer (same as Appointment) */
  poweredBy: "Powered by SoftSense",
  copyright: "Powered by SoftSense",
  registerUrl: "https://softoncloud.com",
  companyUrl: "https://softoncloud.com/",
};

export default {
  colors: brandColors,
  logos: brandLogos,
  text: brandText,
};
