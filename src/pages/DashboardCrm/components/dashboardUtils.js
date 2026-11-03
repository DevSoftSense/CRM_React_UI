// SoftOnCloud CRM Dashboard Utilities & Formatters
// 100% Dynamic calculations from backend — zero static values

export const formatCurrency = (val) => {
  if (val === undefined || val === null || isNaN(val)) return "₹0";
  const num = Number(val);
  const abs = Math.abs(num);
  if (abs >= 10000000) {
    return `₹${(num / 10000000).toFixed(2)} Cr`;
  }
  if (abs >= 100000) {
    return `₹${(num / 100000).toFixed(2)} L`;
  }
  if (abs >= 1000) {
    return `₹${(num / 1000).toFixed(1)} k`;
  }
  return `₹${num.toLocaleString("en-IN")}`;
};

export const formatFullCurrency = (val) => {
  if (val === undefined || val === null || isNaN(val)) return "₹0";
  return `₹${Number(val).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;
};

export const formatNumber = (val) => {
  if (val === undefined || val === null || isNaN(val)) return "0";
  return Number(val).toLocaleString("en-IN");
};

export const THEME_COLORS = {
  maroon: "#7f1d1d",
  maroonLight: "#991b1b",
  maroonBg: "#fef2f2",
  crimson: "#b91c1c",
  amber: "#d97706",
  amberBg: "#fffbeb",
  emerald: "#059669",
  emeraldBg: "#ecfdf5",
  indigo: "#6366f1",
  indigoBg: "#eef2ff",
  slate: "#475569",
  slateLight: "#94a3b8",
  slateBg: "#f8fafc",
  rose: "#e11d48",
  roseBg: "#fff1f2",
};

