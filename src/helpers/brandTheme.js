import { brandColors } from "../config/brandConfig";
import { LAYOUT_STATE_KEY } from "../slices/layouts/reducer";

export const SIDEBAR_CUSTOM_COLORS_KEY = "crm_sidebar_custom_colors_v1";

export const defaultSidebarCustomColors = {
  customColor: brandColors.primary,
  menuColor: brandColors.menuText,
  menuMutedColor: brandColors.menuMuted,
  subMenuColor: brandColors.subMenuText,
  menuTitleColor: brandColors.menuTitle,
};

export const SIDEBAR_BG = `var(--vz-vertical-menu-bg-custom, ${brandColors.primary})`;

const hexToRgb = (hex) => {
  const normalized = String(hex || "").replace("#", "");
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => c + c)
          .join("")
      : normalized;
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return { r: 127, g: 29, b: 29 };
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
};

const darkenHex = (hex, percent = 12) => {
  const { r, g, b } = hexToRgb(hex);
  const factor = 1 - percent / 100;
  const toHex = (n) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r * factor)}${toHex(g * factor)}${toHex(b * factor)}`;
};

const persistSidebarCustomColors = (colors) => {
  try {
    localStorage.setItem(SIDEBAR_CUSTOM_COLORS_KEY, JSON.stringify(colors));
  } catch {
    /* ignore */
  }
};

export const getSidebarCustomColors = () => {
  try {
    const saved = localStorage.getItem(SIDEBAR_CUSTOM_COLORS_KEY);
    if (saved) {
      return { ...defaultSidebarCustomColors, ...JSON.parse(saved) };
    }
  } catch {
    /* keep defaults */
  }
  return { ...defaultSidebarCustomColors };
};

/**
 * Applies landing maroon as CSS variables across the whole app
 * (sidebar, landing, login auth hero, buttons, .text-primary, etc.)
 */
export const applyBrandTheme = (colors = getSidebarCustomColors()) => {
  const resolved = { ...defaultSidebarCustomColors, ...colors };
  const primary = resolved.customColor || brandColors.primary;
  const primaryDark =
    primary === brandColors.primary
      ? brandColors.primaryDark
      : darkenHex(primary, 12);
  const { r, g, b } = hexToRgb(primary);
  const root = document.documentElement;

  root.style.setProperty("--vz-vertical-menu-bg-custom", primary);
  root.style.setProperty(
    "--vz-vertical-menu-item-color-custom",
    resolved.menuColor
  );
  root.style.setProperty(
    "--vz-vertical-menu-sub-item-color-custom",
    resolved.subMenuColor
  );
  root.style.setProperty(
    "--vz-vertical-menu-item-muted-custom",
    resolved.menuMutedColor
  );
  root.style.setProperty(
    "--vz-vertical-menu-title-color-custom",
    resolved.menuTitleColor
  );
  root.style.setProperty("--vz-vertical-menu-item-color", resolved.menuMutedColor);
  root.style.setProperty("--vz-vertical-menu-item-hover-color", resolved.menuColor);
  root.style.setProperty("--vz-vertical-menu-item-active-color", resolved.menuColor);
  root.style.setProperty("--vz-vertical-menu-sub-item-color", resolved.subMenuColor);
  root.style.setProperty(
    "--vz-vertical-menu-sub-item-hover-color",
    resolved.menuColor
  );
  root.style.setProperty(
    "--vz-vertical-menu-sub-item-active-color",
    resolved.menuColor
  );
  root.style.setProperty("--vz-vertical-menu-title-color", resolved.menuTitleColor);

  root.style.setProperty("--vz-primary", primary);
  root.style.setProperty("--vz-primary-rgb", `${r}, ${g}, ${b}`);
  root.style.setProperty("--bs-primary", primary);
  root.style.setProperty("--bs-primary-rgb", `${r}, ${g}, ${b}`);

  root.style.setProperty("--landing-accent", primary);
  root.style.setProperty("--landing-accent-rgb", `${r}, ${g}, ${b}`);
  root.style.setProperty("--landing-accent-dark", primaryDark);
  root.style.setProperty("--landing-accent-hover", brandColors.primaryHover);
  root.style.setProperty("--landing-accent-soft", brandColors.primaryLight);

  root.style.setProperty("--vz-brand-primary", primary);
  root.style.setProperty("--vz-brand-primary-dark", primaryDark);
  root.style.setProperty("--vz-brand-primary-light", brandColors.primaryLight);
  root.style.setProperty(
    "--auth-overlay-gradient",
    `linear-gradient(to right, ${primaryDark}, ${primary})`
  );

  root.style.setProperty("--vz-list-group-active-bg", primary);
  root.style.setProperty("--vz-list-group-active-border-color", primary);
  root.style.setProperty("--vz-list-group-active-color", "#ffffff");

  root.setAttribute("data-sidebar", "custom");

  return resolved;
};

export const applySavedLayoutMode = () => {
  try {
    const layoutState = JSON.parse(
      localStorage.getItem(LAYOUT_STATE_KEY) || "{}"
    );
    const mode = layoutState.layoutModeType;
    if (mode === "dark" || mode === "light") {
      document.documentElement.setAttribute("data-bs-theme", mode);
    }
  } catch {
    /* ignore */
  }
};

export const initBrandTheme = () => {
  const colors = getSidebarCustomColors();
  applyBrandTheme(colors);
  applySavedLayoutMode();
  try {
    if (!localStorage.getItem(SIDEBAR_CUSTOM_COLORS_KEY)) {
      persistSidebarCustomColors(colors);
    }
  } catch {
    /* ignore */
  }
  return colors;
};

export const applyLandingBrandTheme = () => {
  document.documentElement.setAttribute("data-sidebar", "custom");
  return applyBrandTheme();
};

if (typeof document !== "undefined") {
  initBrandTheme();
}
