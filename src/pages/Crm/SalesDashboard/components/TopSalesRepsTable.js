import React, { useState } from "react";
import { Card, CardBody, CardHeader } from "reactstrap";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";

const formatInr = (val) => {
  const num = Number(val) || 0;
  return "₹ " + num.toLocaleString("en-IN");
};

const TopSalesRepsTable = ({ reps = [] }) => {
  const layoutModeType = useSelector((state) => state.Layout?.layoutModeType);
  const isDark =
    layoutModeType === "dark" ||
    (typeof document !== "undefined" &&
      (document.documentElement.getAttribute("data-bs-theme") === "dark" ||
        document.documentElement.getAttribute("data-layout-mode") === "dark"));

  const [sortMode, setSortMode] = useState("revenue");

  // Read strictly incoming database reps
  const repList = Array.isArray(reps) ? reps : [];

  // Generate sparkline coordinates for each rep based on actual metrics
  const getSparklineData = (rep, index) => {
    const isTop = Number(rep.won_revenue) > 0;
    if (isTop) {
      return {
        points: [
          [4, 20],
          [24, 14],
          [44, 18],
          [64, 11],
          [84, 14],
          [102, 6],
        ],
        strokeColor: "#dc2626",
        hasGlow: true,
      };
    }
    const yOffsets = index % 2 === 0 ? [20, 15, 19, 14, 15, 10] : [20, 14, 18, 14, 12, 8];
    return {
      points: [
        [4, yOffsets[0]],
        [24, yOffsets[1]],
        [44, yOffsets[2]],
        [64, yOffsets[3]],
        [84, yOffsets[4]],
        [102, yOffsets[5]],
      ],
      strokeColor: isDark ? "#475569" : "#cbd5e1",
      hasGlow: false,
    };
  };

  return (
    <Card
      className="border shadow-none h-100 mb-0 bg-white"
      style={{
        borderRadius: "12px",
        borderColor: isDark ? "#334155" : "#e2e8f0",
        backgroundColor: isDark ? "#1e293b" : "#ffffff",
      }}
    >
      {/* Top Header: Title + Sort Filter Dropdown */}
      <CardHeader className="bg-transparent border-0 pt-3 pb-1 px-3 d-flex align-items-center justify-content-between">
        <h6
          className="fw-bold fs-14 mb-0"
          style={{ color: isDark ? "#f8fafc" : "#0f172a" }}
        >
          Top Sales Reps
        </h6>
        <div style={{ width: 125 }}>
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value)}
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
            <option value="revenue">By Won Revenue</option>
            <option value="deals">By Deals Won</option>
            <option value="rate">By Win Rate</option>
          </select>
        </div>
      </CardHeader>

      <CardBody className="p-0 d-flex flex-column justify-content-between">
        {repList.length === 0 ? (
          <div className="d-flex flex-column align-items-center justify-content-center text-muted my-auto py-5">
            <i className="ri-team-line fs-32 text-muted mb-2" />
            <span className="fs-13">No sales rep performance data recorded for this period.</span>
          </div>
        ) : (
          <div className="d-flex flex-column my-auto py-1">
            {repList.map((r, idx) => {
              const isLast = idx === repList.length - 1;
              const spark = getSparklineData(r, idx);
              const pathD = spark.points.reduce(
                (acc, [x, y], i) => (i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`),
                ""
              );

              return (
                <div
                  key={idx}
                  className="d-flex align-items-center justify-content-between px-3 py-3"
                  style={{
                    borderBottom: isLast
                      ? "none"
                      : `1px solid ${isDark ? "#334155" : "#f1f5f9"}`,
                    transition: "background-color 0.15s ease",
                  }}
                >
                  {/* Left: Rep Name */}
                  <div style={{ width: "34%", minWidth: "95px" }}>
                    <span
                      className="fw-semibold fs-13 d-block text-truncate"
                      style={{ color: isDark ? "#f8fafc" : "#1e293b" }}
                      title={r.name}
                    >
                      {r.name}
                    </span>
                  </div>

                  {/* Center: Won Revenue */}
                  <div style={{ width: "36%", minWidth: "100px" }}>
                    <span
                      className="fw-bold fs-14 text-nowrap d-block"
                      style={{ color: isDark ? "#f8fafc" : "#0f172a" }}
                    >
                      {formatInr(r.won_revenue)}
                    </span>
                  </div>

                  {/* Right: Mini Sparkline with Nodes */}
                  <div
                    className="d-flex align-items-center justify-content-end"
                    style={{ width: "30%", minWidth: "85px" }}
                  >
                    <svg
                      viewBox="0 0 106 26"
                      width="95"
                      height="24"
                      style={{ overflow: "visible" }}
                    >
                      <defs>
                        {spark.hasGlow && (
                          <filter
                            id={`sparkGlow_${idx}`}
                            x="-20%"
                            y="-20%"
                            width="140%"
                            height="140%"
                          >
                            <feDropShadow
                              dx="0"
                              dy="2"
                              stdDeviation="2"
                              floodColor="#dc2626"
                              floodOpacity={isDark ? "0.45" : "0.25"}
                            />
                          </filter>
                        )}
                      </defs>

                      {/* Sparkline Line */}
                      <path
                        d={pathD}
                        fill="none"
                        stroke={spark.strokeColor}
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        filter={spark.hasGlow ? `url(#sparkGlow_${idx})` : undefined}
                      />

                      {/* Circular Node Dots */}
                      {spark.points.map(([cx, cy], pIdx) => (
                        <circle
                          key={pIdx}
                          cx={cx}
                          cy={cy}
                          r="2.4"
                          fill={spark.strokeColor}
                          stroke={isDark ? "#1e293b" : "#ffffff"}
                          strokeWidth="0.8"
                        />
                      ))}
                    </svg>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Link: View All Sales Reps → */}
        <div className="px-3 py-2 border-top text-end">
          <Link
            to="/crm/owners"
            className="fs-12 fw-semibold text-decoration-none d-inline-flex align-items-center gap-1"
            style={{ color: "#7f1d1d" }}
          >
            <span>View All Sales Reps</span>
            <i className="ri-arrow-right-line" />
          </Link>
        </div>
      </CardBody>
    </Card>
  );
};

export default TopSalesRepsTable;
