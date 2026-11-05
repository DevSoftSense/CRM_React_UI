import React, { useMemo } from "react";
import { Row, Col, Button, Input } from "reactstrap";
import { useNavigate } from "react-router-dom";

const PERIOD_LABELS = {
  today: "Today",
  this_week: "This Week",
  this_month: "This Month",
  this_quarter: "This Quarter",
  this_year: "This Year",
  custom: "Custom Range",
};

const PERIOD_DEFAULTS = [
  { id: "today", label: "Today" },
  { id: "this_week", label: "This Week" },
  { id: "this_month", label: "This Month" },
  { id: "this_quarter", label: "This Quarter" },
  { id: "this_year", label: "This Year" },
  { id: "custom", label: "Custom Range" },
];

const DashboardHeader = ({
  meta,
  lookups,
  filters,
  onFilterChange,
  userName = "User",
}) => {
  const navigate = useNavigate();

  const formatDateRange = () => {
    if (!meta?.start_date || !meta?.end_date) return "";
    try {
      const d1 = new Date(meta.start_date);
      const d2 = new Date(meta.end_date);
      const opts = { day: "2-digit", month: "short", year: "numeric" };
      return `${d1.toLocaleDateString("en-IN", opts)} - ${d2.toLocaleDateString("en-IN", opts)}`;
    } catch {
      return "";
    }
  };

  // Safe formatting of periods: guarantees clean human-readable labels (no "this_month")
  const periodOptions = useMemo(() => {
    const rawList =
      Array.isArray(lookups?.periods) && lookups.periods.length > 0
        ? lookups.periods
        : PERIOD_DEFAULTS;

    return rawList.map((p, index) => {
      const id = String(p.id || p.code || p.value || `period-${index}`);
      const fallbackLabel =
        PERIOD_LABELS[id] ||
        id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      const label = p.label || p.name || fallbackLabel;
      return { id, label };
    });
  }, [lookups?.periods]);

  return (
    <div className="mb-4">
      <Row className="gy-3 align-items-center">
        {/* Title & Greeting */}
        <Col xl={4} lg={4} md={12}>
          <div>
            <h4
              className="fw-bold mb-1 crm-header-title"
              style={{ fontSize: "1.45rem", letterSpacing: "-0.02em" }}
            >
              CRM Dashboard
            </h4>
            <p className="text-muted mb-0" style={{ fontSize: "0.875rem" }}>
              Welcome back, <strong className="crm-header-user-accent" style={{ color: "#7f1d1d" }}>{userName}</strong>! Here&apos;s
              what&apos;s happening with your business.
            </p>
          </div>
        </Col>

        {/* Filter Controls & Action Buttons (Standardized 38px Height, SoftOnCloud Palette) */}
        <Col xl={8} lg={8} md={12}>
          <div className="d-flex flex-wrap align-items-center justify-content-lg-end gap-2">
            {/* Period Selector */}
            <div style={{ minWidth: "135px" }}>
              <Input
                type="select"
                className="form-select rounded-0 crm-header-select"
                style={{
                  height: "38px",
                  fontSize: "0.8125rem",
                  fontWeight: 500,
                }}
                value={filters.period || "this_month"}
                onChange={(e) => onFilterChange("period", e.target.value)}
              >
                {periodOptions.map((p) => (
                  <option key={`period-opt-${p.id}`} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </Input>
            </div>

            {/* Custom Date Pickers when 'custom' is selected */}
            {filters.period === "custom" && (
              <div className="d-flex align-items-center gap-1">
                <Input
                  type="date"
                  className="form-control rounded-0 crm-header-input"
                  style={{
                    height: "38px",
                    fontSize: "0.8125rem",
                    padding: "0.375rem 0.6rem",
                  }}
                  value={filters.dateFrom || ""}
                  onChange={(e) => onFilterChange("dateFrom", e.target.value)}
                />
                <span className="text-muted small px-1">to</span>
                <Input
                  type="date"
                  className="form-control rounded-0 crm-header-input"
                  style={{
                    height: "38px",
                    fontSize: "0.8125rem",
                    padding: "0.375rem 0.6rem",
                  }}
                  value={filters.dateTo || ""}
                  onChange={(e) => onFilterChange("dateTo", e.target.value)}
                />
              </div>
            )}

            {/* Team / Owner Selector */}
            <div style={{ minWidth: "140px" }}>
              <Input
                type="select"
                className="form-select rounded-0 crm-header-select"
                style={{
                  height: "38px",
                  fontSize: "0.8125rem",
                  fontWeight: 500,
                }}
                value={filters.ownerId || ""}
                onChange={(e) => onFilterChange("ownerId", e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">All Teams</option>
                {(lookups?.owners || []).map((o, index) => (
                  <option key={`owner-opt-${o.owner_id || index}`} value={o.owner_id}>
                    {o.full_name}
                  </option>
                ))}
              </Input>
            </div>

            {/* Date Range Badge (Standardized 38px height & border) */}
            {formatDateRange() && filters.period !== "custom" && (
              <div
                className="d-none d-xl-inline-flex align-items-center px-3 rounded-0 crm-date-badge"
                style={{
                  height: "38px",
                  fontSize: "0.8125rem",
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                }}
              >
                <i className="ri-calendar-line me-2 fs-14" style={{ color: "#7f1d1d" }} />
                <span>{formatDateRange()}</span>
              </div>
            )}

            {/* + New Lead Button (SoftOnCloud Maroon) */}
            <Button
              className="crm-btn-primary-3d d-inline-flex align-items-center justify-content-center"
              style={{
                height: "38px",
                fontSize: "0.8125rem",
                fontWeight: 600,
                padding: "0 14px",
                letterSpacing: "0.01em",
              }}
              onClick={() => navigate("/crm/leads")}
            >
              <i className="ri-user-add-line me-1.5 fs-14" /> + New Lead
            </Button>

            {/* + New Opportunity Button (SoftOnCloud Theme Maroon) */}
            <Button
              className="crm-btn-primary-3d d-inline-flex align-items-center justify-content-center"
              style={{
                height: "38px",
                fontSize: "0.8125rem",
                fontWeight: 600,
                padding: "0 14px",
                letterSpacing: "0.01em",
              }}
              onClick={() => navigate("/crm/opportunities")}
            >
              <i className="ri-shake-hands-line me-1.5 fs-14" /> + New Opportunity
            </Button>

            {/* Schedule Meeting Button (Executive Outline with SoftOnCloud Maroon Icon) */}
            <Button
              className="crm-btn-outline-3d d-inline-flex align-items-center justify-content-center"
              style={{
                height: "38px",
                fontSize: "0.8125rem",
                fontWeight: 500,
                padding: "0 14px",
              }}
              onClick={() => navigate("/crm/calendar")}
            >
              <i className="ri-calendar-event-line me-1.5 fs-14" style={{ color: "#7f1d1d" }} /> Schedule Meeting
            </Button>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardHeader;
