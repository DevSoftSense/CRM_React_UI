/**
 * Utility helpers for SoftOnCloud CRM Reports module
 */

export const formatCurrency = (val) => {
  if (val === null || val === undefined || isNaN(val)) return "₹ 0";
  const num = Number(val);
  return "₹ " + num.toLocaleString("en-IN", { maximumFractionDigits: 0 });
};

export const formatNumber = (val) => {
  if (val === null || val === undefined || isNaN(val)) return "0";
  return Number(val).toLocaleString("en-IN");
};

export const formatPercent = (val) => {
  if (val === null || val === undefined || isNaN(val)) return "0%";
  return `${Number(val).toFixed(1)}%`;
};

/**
 * Derives start and end ISO dates based on a preset name
 */
export const getDateRangeFromPreset = (preset) => {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  if (preset === "this_month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      dateFrom: start.toISOString().slice(0, 10),
      dateTo: todayStr,
    };
  }

  if (preset === "this_quarter") {
    const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
    const start = new Date(now.getFullYear(), quarterStartMonth, 1);
    return {
      dateFrom: start.toISOString().slice(0, 10),
      dateTo: todayStr,
    };
  }

  if (preset === "this_year") {
    const start = new Date(now.getFullYear(), 0, 1);
    return {
      dateFrom: start.toISOString().slice(0, 10),
      dateTo: todayStr,
    };
  }

  if (preset === "last_30_days") {
    const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return {
      dateFrom: start.toISOString().slice(0, 10),
      dateTo: todayStr,
    };
  }

  // "all_time" or unknown
  return {
    dateFrom: "",
    dateTo: "",
  };
};

/**
 * Converts snake_case key to Title Case
 */
export const humanizeKey = (key = "") => {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

/**
 * Returns formatted value and visual metadata for report KPI keys
 */
export const getKpiConfig = (key, value) => {
  const k = (key || "").toLowerCase();
  const numVal = Number(value);

  // Default config
  let label = humanizeKey(key);
  let displayVal = String(value ?? "0");
  let icon = "ri-bar-chart-2-line";
  let color = "#7f1d1d"; // SoftOnCloud Maroon
  let bg = "rgba(127, 29, 29, 0.08)";

  // Currency fields
  if (
    k.includes("amount") ||
    k.includes("value") ||
    k.includes("revenue") ||
    k.includes("spend") ||
    k.includes("budget") ||
    k.includes("pipeline") ||
    k.includes("forecast") ||
    k.includes("clv")
  ) {
    displayVal = formatCurrency(value);
    icon = "ri-money-dollar-circle-line";
    color = "#16a34a"; // Green
    bg = "rgba(22, 163, 74, 0.08)";
  }
  // Percentage / Rate fields
  else if (
    k.includes("rate") ||
    k.includes("percentage") ||
    k.includes("pct") ||
    k.includes("achievement")
  ) {
    displayVal = formatPercent(value);
    icon = "ri-percent-line";
    color = "#15803d"; // Forest Green
    bg = "rgba(21, 128, 61, 0.08)";
  }
  // Days fields
  else if (k.includes("days") || k.includes("cycle")) {
    displayVal = `${numVal ? numVal.toFixed(1) : 0} days`;
    icon = "ri-time-line";
    color = "#b45309"; // Amber
    bg = "rgba(180, 83, 9, 0.08)";
  }
  // Danger / Risk fields (Stuck, Overdue, Dormant, Lost)
  else if (
    k.includes("stuck") ||
    k.includes("overdue") ||
    k.includes("lost") ||
    k.includes("dormant") ||
    k.includes("uncontacted")
  ) {
    displayVal = formatNumber(value);
    icon = "ri-alarm-warning-line";
    color = "#dc2626"; // Red
    bg = "rgba(220, 38, 38, 0.08)";
  }
  // Count fields
  else {
    displayVal = formatNumber(value);
    icon = "ri-hashtag";
    color = "#475569"; // Slate
    bg = "rgba(71, 85, 105, 0.08)";
  }

  // Specific overrides for key metric polish
  if (k === "total_pipeline_value") {
    label = "Total Pipeline Value";
    color = "#7f1d1d";
    bg = "rgba(127, 29, 29, 0.08)";
    icon = "ri-funds-line";
  } else if (k === "active_deals_count") {
    label = "Active Pipeline Deals";
    icon = "ri-briefcase-line";
  } else if (k === "win_rate_percentage") {
    label = "Overall Win Rate";
    icon = "ri-trophy-line";
  } else if (k === "total_weighted_forecast") {
    label = "Weighted Forecast Revenue";
    icon = "ri-line-chart-line";
  } else if (k === "conversion_rate_percentage") {
    label = "Lead Conversion Rate";
    icon = "ri-filter-3-line";
  } else if (k === "compliance_rate_percentage") {
    label = "Follow-up Compliance Rate";
    icon = "ri-checkbox-circle-line";
  } else if (k === "quota_used_percentage") {
    label = "Cloud Storage Used";
    icon = "ri-hard-drive-2-line";
  }

  return { label, displayVal, icon, color, bg };
};

/**
 * Client-side CSV Exporter from table rows
 */
export const exportToCsv = (filename, rows) => {
  if (!rows || !rows.length) return;
  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.map((h) => `"${humanizeKey(h)}"`).join(","),
    ...rows.map((row) =>
      headers
        .map((header) => {
          let val = row[header];
          if (val === null || val === undefined) val = "";
          val = String(val).replace(/"/g, '""');
          return `"${val}"`;
        })
        .join(",")
    ),
  ].join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `${filename || "crm_report"}_${new Date().toISOString().slice(0, 10)}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

