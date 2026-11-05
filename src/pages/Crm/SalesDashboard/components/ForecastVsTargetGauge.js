import React, { useState } from "react";
import { Card, CardBody, CardHeader } from "reactstrap";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";

const formatInr = (val) => {
  const num = Number(val) || 0;
  return "₹ " + num.toLocaleString("en-IN");
};

const ForecastVsTargetGauge = ({ forecast = {} }) => {
  const layoutModeType = useSelector((state) => state.Layout?.layoutModeType);
  const isDark =
    layoutModeType === "dark" ||
    (typeof document !== "undefined" &&
      (document.documentElement.getAttribute("data-bs-theme") === "dark" ||
        document.documentElement.getAttribute("data-layout-mode") === "dark"));

  const [periodFilter, setPeriodFilter] = useState("quarter");

  // Strictly real data from database
  const target = Number(forecast?.target_amount ?? 0);
  const currentForecast = Number(forecast?.forecast_amount ?? 0);
  const gap = Number(
    forecast?.gap_amount ?? Math.max(0, target - currentForecast)
  );
  const pct = Number(
    forecast?.percentage ??
      (target > 0 ? Math.round((currentForecast / target) * 100) : 0)
  );
  const clampedPct = Math.min(Math.max(pct, 0), 100);

  return (
    <Card
      className="border shadow-none h-100 mb-0 bg-white"
      style={{
        borderRadius: "12px",
        borderColor: isDark ? "#334155" : "#e2e8f0",
        backgroundColor: isDark ? "#1e293b" : "#ffffff",
      }}
    >
      {/* Top Header: Title + Period Filter */}
      <CardHeader className="bg-transparent border-0 pt-3 pb-1 px-3 d-flex align-items-center justify-content-between">
        <h6
          className="fw-bold fs-14 mb-0"
          style={{ color: isDark ? "#f8fafc" : "#0f172a" }}
        >
          Forecast vs Target
        </h6>
        <div style={{ width: 110 }}>
          <select
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
            className="form-select form-select-sm border shadow-none"
            style={{
              borderRadius: "6px",
              fontSize: "11px",
              fontWeight: 500,
              padding: "4px 8px",
              cursor: "pointer",
              backgroundColor: isDark ? "#0f172a" : "#ffffff",
              color: isDark ? "#cbd5e1" : "#334155",
              borderColor: isDark ? "#334155" : "#e2e8f0",
            }}
          >
            <option value="quarter">This Quarter</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
        </div>
      </CardHeader>

      <CardBody className="p-3 pt-2 d-flex flex-column justify-content-between">
        {/* Main Body: Left Thermometer Capsule + Divider + Right Metric Stack */}
        <div className="d-flex align-items-center gap-3 my-auto py-2">
          {/* Left Column: Vertical Thermometer Capsule Bar */}
          <div
            className="d-flex align-items-center justify-content-center position-relative"
            style={{ width: "38%", minWidth: "110px" }}
          >
            <div className="d-flex align-items-center gap-2">
              {/* Vertical Capsule Track */}
              <div
                style={{
                  width: "38px",
                  height: "150px",
                  borderRadius: "20px",
                  backgroundColor: isDark ? "#334155" : "#e2e8f0",
                  position: "relative",
                  overflow: "hidden",
                  boxShadow: "inset 0 1px 3px rgba(0,0,0,0.1)",
                }}
              >
                {/* Maroon Filled Progress Portion */}
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: `${clampedPct}%`,
                    backgroundColor: "#7f1d1d",
                    borderRadius:
                      clampedPct >= 96
                        ? "20px"
                        : "0 0 20px 20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "height 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
                  }}
                >
                  {/* Inside Percentage Label */}
                  {clampedPct >= 15 && (
                    <span
                      style={{
                        color: "#ffffff",
                        fontSize: "11px",
                        fontWeight: 700,
                        letterSpacing: "0.2px",
                      }}
                    >
                      {clampedPct}%
                    </span>
                  )}
                </div>
              </div>

              {/* Outside Percentage Indicator next to fill level */}
              <div
                className="d-flex align-items-center"
                style={{
                  height: "150px",
                  position: "relative",
                  width: "30px",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    bottom: `calc(${clampedPct}% - 8px)`,
                    left: "2px",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: isDark ? "#94a3b8" : "#64748b",
                    transition: "bottom 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
                  }}
                >
                  {clampedPct}%
                </span>
              </div>
            </div>
          </div>

          {/* Vertical Divider */}
          <div
            style={{
              width: "1px",
              height: "140px",
              backgroundColor: isDark ? "#334155" : "#f1f5f9",
            }}
          />

          {/* Right Column: 3 Stacked Metrics */}
          <div
            className="flex-grow-1 ps-2 d-flex flex-column justify-content-between"
            style={{ height: "145px" }}
          >
            {/* Forecast */}
            <div>
              <span
                className="fs-12 fw-medium d-block"
                style={{
                  color: isDark ? "#94a3b8" : "#64748b",
                  marginBottom: "2px",
                }}
              >
                Forecast (₹)
              </span>
              <span
                className="fs-15 fw-bold d-block text-nowrap"
                style={{
                  color: isDark ? "#f8fafc" : "#0f172a",
                  letterSpacing: "0.2px",
                }}
              >
                {formatInr(currentForecast)}
              </span>
            </div>

            {/* Target */}
            <div>
              <span
                className="fs-12 fw-medium d-block"
                style={{
                  color: isDark ? "#94a3b8" : "#64748b",
                  marginBottom: "2px",
                }}
              >
                Target (₹)
              </span>
              <span
                className="fs-15 fw-bold d-block text-nowrap"
                style={{
                  color: isDark ? "#f8fafc" : "#0f172a",
                  letterSpacing: "0.2px",
                }}
              >
                {formatInr(target)}
              </span>
            </div>

            {/* Gap */}
            <div>
              <span
                className="fs-12 fw-medium d-block"
                style={{
                  color: isDark ? "#94a3b8" : "#64748b",
                  marginBottom: "2px",
                }}
              >
                Gap (₹)
              </span>
              <span
                className="fs-15 fw-bold d-block text-nowrap"
                style={{
                  color: gap > 0 ? "#b91c1c" : "#059669",
                  letterSpacing: "0.2px",
                }}
              >
                {formatInr(gap)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Link: View Forecast Report → */}
        <div className="pt-2 mt-2 border-top text-end">
          <Link
            to="/crm/opportunities"
            className="fs-12 fw-semibold text-decoration-none d-inline-flex align-items-center gap-1"
            style={{ color: "#7f1d1d" }}
          >
            <span>View Forecast Report</span>
            <i className="ri-arrow-right-line" />
          </Link>
        </div>
      </CardBody>
    </Card>
  );
};

export default ForecastVsTargetGauge;
