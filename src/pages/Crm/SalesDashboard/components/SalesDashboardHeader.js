import React from "react";
import { Button, Input } from "reactstrap";

const SalesDashboardHeader = ({
  period = "this_month",
  onPeriodChange,
  owners = [],
  selectedOwner = "",
  onOwnerChange,
  onRefresh,
  loading = false,
  comparisonLabel = "vs previous period",
  startDate,
  endDate,
}) => {
  const formatDateRange = () => {
    const now = new Date();
    const s = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
    const e = endDate ? new Date(endDate) : new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const opts = { day: "2-digit", month: "short", year: "numeric" };
    return `${s.toLocaleDateString("en-GB", opts)} - ${e.toLocaleDateString("en-GB", opts)}`;
  };

  return (
    <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4 pt-2">
      <div>
        <h4 className="fw-bold text-dark mb-0 fs-20">Sales Dashboard</h4>
        <p className="text-muted fs-13 mb-0 mt-1">
          Real-time overview of your sales performance and KPIs
        </p>
      </div>

      <div className="d-flex flex-wrap align-items-center gap-2">
        {/* Date Range Badge */}
        <div
          className="d-flex align-items-center gap-2 px-3 py-1 border bg-white text-muted fs-12 fw-medium"
          style={{ borderRadius: 0, height: "34px" }}
        >
          <span>{formatDateRange()}</span>
          <i className="ri-calendar-line fs-14 text-muted" />
        </div>

        {/* Period Preset Dropdown */}
        <div style={{ minWidth: 130 }}>
          <Input
            type="select"
            bsSize="sm"
            className="form-select form-select-sm border bg-white"
            value={period}
            onChange={(e) => onPeriodChange && onPeriodChange(e.target.value)}
            style={{ borderRadius: 0, height: "34px", fontSize: "13px", cursor: "pointer" }}
          >
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="this_quarter">This Quarter</option>
            <option value="this_year">This Year</option>
            <option value="custom">Custom Range</option>
          </Input>
        </div>

        {/* Sales Owner Dropdown */}
        {owners.length > 0 && (
          <div style={{ minWidth: 150 }}>
            <Input
              type="select"
              bsSize="sm"
              className="form-select form-select-sm border bg-white"
              value={selectedOwner}
              onChange={(e) => onOwnerChange && onOwnerChange(e.target.value)}
              style={{ borderRadius: 0, height: "34px", fontSize: "13px", cursor: "pointer" }}
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
          color="light"
          size="sm"
          className="d-flex align-items-center gap-1 border"
          onClick={onRefresh}
          disabled={loading}
          style={{ borderRadius: 0, height: "34px", padding: "6px 12px", fontSize: "13px" }}
        >
          <i className={`ri-refresh-line fs-14 ${loading ? "ri-spin" : ""}`} /> Refresh
        </Button>
      </div>
    </div>
  );
};

export default SalesDashboardHeader;
