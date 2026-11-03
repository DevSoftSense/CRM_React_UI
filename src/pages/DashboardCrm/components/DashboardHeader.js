import React from "react";
import { Row, Col, Button, Input } from "reactstrap";
import { useNavigate } from "react-router-dom";

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

  return (
    <div className="mb-4">
      <Row className="gy-3 align-items-center">
        <Col xl={5} lg={6} md={12}>
          <div>
            <h4
              className="fw-bold mb-1"
              style={{ color: "#1e293b", fontSize: "1.45rem", letterSpacing: "-0.02em" }}
            >
              CRM Dashboard
            </h4>
            <p className="text-muted mb-0" style={{ fontSize: "0.875rem" }}>
              Welcome back, <strong style={{ color: "#7f1d1d" }}>{userName}</strong>! Here&apos;s
              what&apos;s happening with your business.
            </p>
          </div>
        </Col>

        <Col xl={7} lg={6} md={12}>
          <div className="d-flex flex-wrap align-items-center justify-content-lg-end gap-2">
            {/* Period Selector */}
            <div style={{ minWidth: "130px" }}>
              <Input
                type="select"
                className="form-select rounded-0"
                style={{
                  fontSize: "0.8125rem",
                  borderColor: "#cbd5e1",
                  fontWeight: 500,
                  backgroundColor: "#ffffff",
                }}
                value={filters.period || "this_month"}
                onChange={(e) => onFilterChange("period", e.target.value)}
              >
                {(lookups?.periods || [
                  { id: "today", label: "Today" },
                  { id: "this_week", label: "This Week" },
                  { id: "this_month", label: "This Month" },
                  { id: "this_quarter", label: "This Quarter" },
                  { id: "this_year", label: "This Year" },
                  { id: "custom", label: "Custom Range" },
                ]).map((p, index) => {
                  const val = String(p.id || p.code || p.value || `period-${index}`);
                  return (
                    <option key={`period-opt-${val}-${index}`} value={val}>
                      {p.label || p.name || val}
                    </option>
                  );
                })}
              </Input>
            </div>

            {/* Custom Date Pickers when 'custom' is selected */}
            {filters.period === "custom" && (
              <div className="d-flex align-items-center gap-1">
                <Input
                  type="date"
                  className="form-control rounded-0"
                  style={{ fontSize: "0.8125rem", padding: "0.4rem 0.5rem", borderColor: "#cbd5e1" }}
                  value={filters.dateFrom || ""}
                  onChange={(e) => onFilterChange("dateFrom", e.target.value)}
                />
                <span className="text-muted small">to</span>
                <Input
                  type="date"
                  className="form-control rounded-0"
                  style={{ fontSize: "0.8125rem", padding: "0.4rem 0.5rem", borderColor: "#cbd5e1" }}
                  value={filters.dateTo || ""}
                  onChange={(e) => onFilterChange("dateTo", e.target.value)}
                />
              </div>
            )}

            {/* Team / Owner Selector */}
            <div style={{ minWidth: "140px" }}>
              <Input
                type="select"
                className="form-select rounded-0"
                style={{
                  fontSize: "0.8125rem",
                  borderColor: "#cbd5e1",
                  fontWeight: 500,
                  backgroundColor: "#ffffff",
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

            {/* Date Range Badge */}
            {formatDateRange() && filters.period !== "custom" && (
              <div
                className="d-none d-xl-flex align-items-center px-2 py-1 text-muted"
                style={{
                  backgroundColor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  fontSize: "0.785rem",
                  fontWeight: 500,
                }}
              >
                <i className="ri-calendar-line me-1" style={{ color: "#7f1d1d" }} />
                <span>{formatDateRange()}</span>
              </div>
            )}

            {/* + New Lead Button */}
            <Button
              className="crm-btn-primary-3d d-inline-flex align-items-center"
              style={{
                fontSize: "0.8125rem",
                padding: "0.48rem 0.95rem",
                letterSpacing: "0.01em",
              }}
              onClick={() => navigate("/crm/leads")}
            >
              <i className="ri-user-add-line me-1" /> + New Lead
            </Button>

            {/* + New Opportunity Button */}
            <Button
              className="crm-btn-success-3d d-inline-flex align-items-center"
              style={{
                fontSize: "0.8125rem",
                padding: "0.48rem 0.95rem",
                letterSpacing: "0.01em",
              }}
              onClick={() => navigate("/crm/opportunities")}
            >
              <i className="ri-shake-hands-line me-1" /> + New Opportunity
            </Button>

            {/* Schedule Meeting Button */}
            <Button
              className="crm-btn-outline-3d d-inline-flex align-items-center"
              style={{
                fontSize: "0.8125rem",
                padding: "0.48rem 0.95rem",
              }}
              onClick={() => navigate("/crm/calendar")}
            >
              <i className="ri-calendar-event-line me-1" style={{ color: "#7f1d1d" }} /> Schedule Meeting
            </Button>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardHeader;
