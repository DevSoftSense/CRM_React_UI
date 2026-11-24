import React from "react";
import { useSelector } from "react-redux";
import { Button, Input } from "reactstrap";

const DEFAULT_PERIODS = [
  { code: "this_month", label: "This Month" },
  { code: "last_month", label: "Last Month" },
  { code: "this_quarter", label: "This Quarter" },
  { code: "this_year", label: "This Year" },
  { code: "custom", label: "Custom Range" },
];

const parseSafeDate = (val, fallback) => {
  if (!val) return fallback;
  const s = String(val).slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? fallback : d;
};

const SalesDashboardHeader = ({
  period = "this_month",
  onPeriodChange,
  periods = [],
  dateFrom = "",
  dateTo = "",
  onDateFromChange,
  onDateToChange,
  owners = [],
  selectedOwner = "",
  onOwnerChange,
  onRefresh,
  loading = false,
  comparisonLabel = "vs previous period",
  startDate,
  endDate,
}) => {
  const layoutMode = useSelector((state) => state.Layout?.layoutModeType);
  const isDark = layoutMode === "dark";

  const cardBorder = isDark ? "#21262d" : "#e2e8f0";
  const subtleBg = isDark ? "#161b22" : "#ffffff";
  const subtleBorder = isDark ? "#30363d" : "#e2e8f0";
  const textTitle = isDark ? "#f0f6fc" : "#0f172a";
  const textSub = isDark ? "#8b949e" : "#64748b";

  const periodOptions = Array.isArray(periods) && periods.length > 0 ? periods : DEFAULT_PERIODS;

  const formatDateRange = () => {
    const now = new Date();
    const s = parseSafeDate(startDate, new Date(now.getFullYear(), now.getMonth(), 1));
    const e = parseSafeDate(endDate, new Date(now.getFullYear(), now.getMonth() + 1, 0));
    const opts = { day: "2-digit", month: "short", year: "numeric" };
    return `${s.toLocaleDateString("en-GB", opts)} - ${e.toLocaleDateString("en-GB", opts)}`;
  };

  return (
    <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4 pt-2">
      <div>
        <h4 className="fw-bold mb-0 fs-20" style={{ color: textTitle }}>Sales Dashboard</h4>
        <p className="fs-13 mb-0 mt-1" style={{ color: textSub }}>
          Real-time overview of your sales performance and KPIs
        </p>
      </div>

      <div className="d-flex flex-wrap align-items-center gap-2">
        {/* Date Range Badge */}
        <div
          className="d-flex align-items-center gap-2 px-3 py-1 border fs-12 fw-medium"
          style={{
            borderRadius: 0,
            height: "34px",
            backgroundColor: subtleBg,
            borderColor: cardBorder,
            color: textSub,
          }}
        >
          <span>{formatDateRange()}</span>
          <i className="ri-calendar-line fs-14" style={{ color: textSub }} />
        </div>

        {/* Period Preset Dropdown */}
        <div style={{ minWidth: 130 }}>
          <Input
            type="select"
            bsSize="sm"
            className="form-select form-select-sm border"
            value={period}
            onChange={(e) => onPeriodChange && onPeriodChange(e.target.value)}
            style={{
              borderRadius: 0,
              height: "34px",
              fontSize: "13px",
              cursor: "pointer",
              backgroundColor: subtleBg,
              borderColor: subtleBorder,
              color: textTitle,
            }}
          >
            {periodOptions.map((p) => (
              <option key={p.code || p.value} value={p.code || p.value}>
                {p.label || p.name}
              </option>
            ))}
          </Input>
        </div>

        {/* Custom Date Range Pickers */}
        {period === "custom" && (
          <div className="d-flex align-items-center gap-1">
            <Input
              type="date"
              bsSize="sm"
              value={dateFrom}
              onChange={(e) => onDateFromChange && onDateFromChange(e.target.value)}
              style={{
                borderRadius: 0,
                height: "34px",
                fontSize: "12px",
                backgroundColor: subtleBg,
                borderColor: subtleBorder,
                color: textTitle,
                width: "130px",
              }}
            />
            <span className="fs-12" style={{ color: textSub }}>to</span>
            <Input
              type="date"
              bsSize="sm"
              value={dateTo}
              onChange={(e) => onDateToChange && onDateToChange(e.target.value)}
              style={{
                borderRadius: 0,
                height: "34px",
                fontSize: "12px",
                backgroundColor: subtleBg,
                borderColor: subtleBorder,
                color: textTitle,
                width: "130px",
              }}
            />
          </div>
        )}

        {/* Sales Owner Dropdown */}
        {owners.length > 0 && (
          <div style={{ minWidth: 150 }}>
            <Input
              type="select"
              bsSize="sm"
              className="form-select form-select-sm border"
              value={selectedOwner}
              onChange={(e) => onOwnerChange && onOwnerChange(e.target.value)}
              style={{
                borderRadius: 0,
                height: "34px",
                fontSize: "13px",
                cursor: "pointer",
                backgroundColor: subtleBg,
                borderColor: subtleBorder,
                color: textTitle,
              }}
            >
              <option value="">All Teams / Reps</option>
              {owners.map((o) => {
                const id = o.owner_employee_id ?? o.owner_id ?? o.employee_id;
                return (
                  <option key={id} value={id}>
                    {o.full_name}
                  </option>
                );
              })}
            </Input>
          </div>
        )}

        {/* Refresh / Filter Button */}
        <Button
          size="sm"
          className="d-flex align-items-center gap-1 border"
          onClick={onRefresh}
          disabled={loading}
          style={{
            borderRadius: 0,
            height: "34px",
            padding: "6px 12px",
            fontSize: "13px",
            backgroundColor: subtleBg,
            borderColor: cardBorder,
            color: textTitle,
          }}
        >
          <i className={`ri-refresh-line fs-14 ${loading ? "ri-spin" : ""}`} /> Refresh
        </Button>
      </div>
    </div>
  );
};

export default SalesDashboardHeader;
