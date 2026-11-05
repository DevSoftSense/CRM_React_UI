import React, { useState } from "react";
import { Card, CardBody, CardHeader } from "reactstrap";
import { useSelector } from "react-redux";

const formatInr = (val) => {
  const num = Number(val) || 0;
  return "₹ " + num.toLocaleString("en-IN");
};

/**
 * 5 Canonical Funnel Stages with exact mockup colors, 3D gradients, and dots
 */
const CANONICAL_STAGES = [
  {
    code: "PROSPECTING",
    name: "Prospecting",
    dotColor: "#991b1b", // Red/Burgundy
    gradStart: "#650e1f",
    gradEnd: "#8c152d",
    highlight: "#a51d38",
    path: "M 10 4 L 150 4 Q 155 4 153.5 8 L 142.5 31 Q 141.5 33 139 33 L 21 33 Q 18.5 33 17.5 31 L 6.5 8 Q 5 4 10 4 Z",
  },
  {
    code: "QUALIFIED",
    name: "Qualified",
    dotColor: "#0284c7", // Slate / Sky Blue
    gradStart: "#b32241",
    gradEnd: "#d7395f",
    highlight: "#f43f5e",
    path: "M 23 38 L 137 38 Q 141 38 139.5 42 L 128.5 64 Q 127.5 66 125 66 L 35 66 Q 32.5 66 31.5 64 L 20.5 42 Q 19 38 23 38 Z",
  },
  {
    code: "PROPOSAL",
    name: "Proposal",
    dotColor: "#65a30d", // Olive / Lime Green
    gradStart: "#74af2c",
    gradEnd: "#95ce44",
    highlight: "#bef264",
    path: "M 37 71 L 123 71 Q 127 71 125.5 75 L 114.5 97 Q 113.5 99 111 99 L 49 99 Q 46.5 99 45.5 97 L 34.5 75 Q 33 71 37 71 Z",
  },
  {
    code: "NEGOTIATION",
    name: "Negotiation",
    dotColor: "#ea580c", // Orange
    gradStart: "#047857",
    gradEnd: "#10b981",
    highlight: "#34d399",
    path: "M 51 104 L 109 104 Q 113 104 111.5 108 L 101.5 129 Q 100.5 131 98 131 L 62 131 Q 59.5 131 58.5 129 L 48.5 108 Q 47 104 51 104 Z",
  },
  {
    code: "CLOSED_WON",
    name: "Closed Won",
    dotColor: "#10b981", // Emerald Green
    gradStart: "#260610",
    gradEnd: "#450b1d",
    highlight: "#5f1129",
    path: "M 64 136 L 96 136 Q 100 136 98.5 140 L 91.5 158 Q 90.5 160 88 160 L 72 160 Q 69.5 160 68.5 158 L 61.5 140 Q 60 136 64 136 Z",
  },
];

const DealsByStageFunnel = ({ data = {} }) => {
  const layoutModeType = useSelector((state) => state.Layout?.layoutModeType);
  const isDark =
    layoutModeType === "dark" ||
    (typeof document !== "undefined" &&
      (document.documentElement.getAttribute("data-bs-theme") === "dark" ||
        document.documentElement.getAttribute("data-layout-mode") === "dark"));

  const [activeStage, setActiveStage] = useState(null);
  const [filterMode, setFilterMode] = useState("pipeline");

  // Map incoming stages from API
  const incomingStages = Array.isArray(data.stages) ? data.stages : [];
  const stageMap = {};
  incomingStages.forEach((st) => {
    const key = (st.stage_code || st.stage_name || "")
      .toUpperCase()
      .replace(/[\s-]+/g, "_");
    stageMap[key] = st;
  });

  // Calculate canonical stage data
  let computedTotalRevenue = 0;
  const canonicalData = CANONICAL_STAGES.map((c) => {
    const matched = stageMap[c.code] || {};
    const dealCount = Number(matched.deal_count ?? 0);
    const amount = Number(matched.stage_amount ?? 0);
    computedTotalRevenue += amount;
    return {
      ...c,
      dealCount,
      amount,
    };
  });

  const totalRevenue =
    data.total_pipeline_value && Number(data.total_pipeline_value) > 0
      ? Number(data.total_pipeline_value)
      : computedTotalRevenue;

  return (
    <Card
      className="border shadow-none h-100 mb-0 bg-white"
      style={{
        borderRadius: "12px",
        borderColor: isDark ? "#334155" : "#e2e8f0",
        backgroundColor: isDark ? "#1e293b" : "#ffffff",
      }}
    >
      {/* Top Header: Title + Filter Pill */}
      <CardHeader className="bg-transparent border-0 pt-3 pb-1 px-3 d-flex align-items-center justify-content-between">
        <h6
          className="fw-bold fs-14 mb-0"
          style={{ color: isDark ? "#f8fafc" : "#0f172a" }}
        >
          Deals by Stage
        </h6>
        <div style={{ width: 95 }}>
          <select
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value)}
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
            <option value="pipeline">Pipeline</option>
            <option value="all">All Deals</option>
          </select>
        </div>
      </CardHeader>

      <CardBody className="p-3 pt-2 d-flex flex-column justify-content-between">
        {/* Main Content Area: Left Funnel SVG + Right Stage Breakdown */}
        <div className="d-flex align-items-center justify-content-between gap-3 my-auto pb-2">
          {/* Left Column: 3D Glossy Layered Funnel */}
          <div
            className="d-flex align-items-center justify-content-center position-relative"
            style={{ width: "42%", minWidth: "125px" }}
          >
            <svg
              viewBox="0 0 160 174"
              width="100%"
              height="195"
              style={{ overflow: "visible" }}
            >
              <defs>
                {/* 3D Tier Gradients */}
                {CANONICAL_STAGES.map((s, idx) => (
                  <linearGradient
                    key={idx}
                    id={`funnelTierGrad_${idx}`}
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor={s.highlight} stopOpacity="1" />
                    <stop offset="35%" stopColor={s.gradEnd} stopOpacity="1" />
                    <stop offset="100%" stopColor={s.gradStart} stopOpacity="1" />
                  </linearGradient>
                ))}

                {/* Drop shadow filter for 3D realism */}
                <filter
                  id="funnelTierShadow"
                  x="-20%"
                  y="-10%"
                  width="140%"
                  height="140%"
                >
                  <feDropShadow
                    dx="0"
                    dy="2.5"
                    stdDeviation="2"
                    floodColor="#000000"
                    floodOpacity={isDark ? "0.3" : "0.18"}
                  />
                </filter>

                {/* Soft ground reflection / shadow under bottom tier */}
                <radialGradient
                  id="funnelGroundShadow"
                  cx="50%"
                  cy="50%"
                  r="50%"
                >
                  <stop
                    offset="0%"
                    stopColor="#000000"
                    stopOpacity={isDark ? "0.45" : "0.22"}
                  />
                  <stop offset="60%" stopColor="#000000" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#000000" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Ground Shadow */}
              <ellipse
                cx="80"
                cy="168"
                rx="22"
                ry="4"
                fill="url(#funnelGroundShadow)"
              />

              {/* 5 Funnel Segments */}
              {canonicalData.map((tier, idx) => {
                const isHovered = activeStage === tier.code;
                return (
                  <g
                    key={idx}
                    style={{
                      cursor: "pointer",
                      transition: "transform 0.2s ease, filter 0.2s ease",
                      transformOrigin: "center",
                      transform: isHovered ? "scale(1.03)" : "scale(1)",
                    }}
                    onMouseEnter={() => setActiveStage(tier.code)}
                    onMouseLeave={() => setActiveStage(null)}
                  >
                    <title>{`${tier.name}: ${tier.dealCount} deals (${formatInr(
                      tier.amount
                    )})`}</title>
                    <path
                      d={tier.path}
                      fill={`url(#funnelTierGrad_${idx})`}
                      filter="url(#funnelTierShadow)"
                      stroke={
                        isHovered
                          ? "#ffffff"
                          : isDark
                          ? "rgba(255,255,255,0.15)"
                          : "rgba(255,255,255,0.3)"
                      }
                      strokeWidth={isHovered ? "1.5" : "0.8"}
                    />
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Right Column: Stage Breakdown List */}
          <div className="flex-grow-1 d-flex flex-column justify-content-center">
            {canonicalData.map((item, idx) => {
              const isHovered = activeStage === item.code;
              const isLast = idx === canonicalData.length - 1;
              return (
                <div
                  key={idx}
                  className="d-flex align-items-center justify-content-between py-2"
                  style={{
                    borderBottom: isLast
                      ? "none"
                      : `1px solid ${isDark ? "#334155" : "#f1f5f9"}`,
                    cursor: "pointer",
                    backgroundColor: isHovered
                      ? isDark
                        ? "rgba(255,255,255,0.04)"
                        : "rgba(0,0,0,0.02)"
                      : "transparent",
                    transition: "background-color 0.15s ease",
                    paddingLeft: "6px",
                    paddingRight: "6px",
                    borderRadius: "4px",
                  }}
                  onMouseEnter={() => setActiveStage(item.code)}
                  onMouseLeave={() => setActiveStage(null)}
                  title={`${item.name}: ${item.dealCount} deals (${formatInr(
                    item.amount
                  )})`}
                >
                  {/* Left: Dot + Stage Name */}
                  <div className="d-flex align-items-center gap-2">
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        backgroundColor: item.dotColor,
                        borderRadius: "50%",
                        display: "inline-block",
                        flexShrink: 0,
                      }}
                    />
                    <span
                      className="fs-12 fw-semibold"
                      style={{
                        color: isDark ? "#e2e8f0" : "#1e293b",
                        letterSpacing: "0.1px",
                      }}
                    >
                      {item.name}
                    </span>
                  </div>

                  {/* Right: Deal Count */}
                  <span
                    className="fs-13 fw-bold"
                    style={{
                      color: isDark ? "#f8fafc" : "#0f172a",
                      minWidth: "20px",
                      textAlign: "right",
                    }}
                  >
                    {item.dealCount}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Banner: Total Revenue */}
        <div
          className="d-flex align-items-center justify-content-between px-3 py-2 mt-2"
          style={{
            backgroundColor: isDark ? "#0f172a" : "#f8fafc",
            borderRadius: "10px",
            border: `1px solid ${isDark ? "#334155" : "#f1f5f9"}`,
          }}
        >
          <span
            className="fs-12 fw-bold"
            style={{ color: isDark ? "#f1f5f9" : "#0f172a" }}
          >
            Total Revenue
          </span>
          <span
            className="fs-13 fw-bold"
            style={{
              color: isDark ? "#f8fafc" : "#0f172a",
              letterSpacing: "0.2px",
            }}
          >
            {formatInr(totalRevenue)}
          </span>
        </div>
      </CardBody>
    </Card>
  );
};

export default DealsByStageFunnel;
