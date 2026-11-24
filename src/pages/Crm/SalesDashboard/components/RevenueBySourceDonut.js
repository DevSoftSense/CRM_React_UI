import React, { useState } from "react";
import { Card, CardBody, CardHeader } from "reactstrap";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";

const formatInr = (val) => {
  const num = Number(val) || 0;
  return "₹ " + num.toLocaleString("en-IN");
};

const SOURCE_PALETTE = [
  { dotColor: "#701a1e", gradId: "gradSourceWebsite", gradStart: "#4c0519", gradEnd: "#701a1e" },
  { dotColor: "#991b1b", gradId: "gradSourceLinkedIn", gradStart: "#9f1239", gradEnd: "#be123c" },
  { dotColor: "#881337", gradId: "gradSourceWhatsApp", gradStart: "#88637b", gradEnd: "#a57c96" },
  { dotColor: "#f97316", gradId: "gradSourceWalkin", gradStart: "#c2410c", gradEnd: "#ea580c" },
  { dotColor: "#475569", gradId: "gradSourceReferral", gradStart: "#334155", gradEnd: "#64748b" },
];

const polarToCartesian = (cx, cy, r, angleInDegrees) => {
  const rad = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
};

const describeArc = (cx, cy, rOuter, rInner, startAngle, endAngle) => {
  const swept = Math.min(Math.max(endAngle - startAngle, 0), 359.999);
  const effectiveEnd = startAngle + swept;

  const startOuter = polarToCartesian(cx, cy, rOuter, startAngle);
  const endOuter = polarToCartesian(cx, cy, rOuter, effectiveEnd);
  const startInner = polarToCartesian(cx, cy, rInner, startAngle);
  const endInner = polarToCartesian(cx, cy, rInner, effectiveEnd);

  const largeArcFlag = swept > 180 ? 1 : 0;

  return [
    `M ${startOuter.x.toFixed(2)} ${startOuter.y.toFixed(2)}`,
    `A ${rOuter} ${rOuter} 0 ${largeArcFlag} 1 ${endOuter.x.toFixed(2)} ${endOuter.y.toFixed(2)}`,
    `L ${endInner.x.toFixed(2)} ${endInner.y.toFixed(2)}`,
    `A ${rInner} ${rInner} 0 ${largeArcFlag} 0 ${startInner.x.toFixed(2)} ${startInner.y.toFixed(2)}`,
    "Z",
  ].join(" ");
};

const describeShineArc = (cx, cy, r, startAngle, endAngle) => {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const swept = endAngle - startAngle;
  const largeArcFlag = swept > 180 ? 1 : 0;
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
};

const RevenueBySourceDonut = ({ data = {} }) => {
  const layoutModeType = useSelector((state) => state.Layout?.layoutModeType);
  const isDark =
    layoutModeType === "dark" ||
    (typeof document !== "undefined" &&
      (document.documentElement.getAttribute("data-bs-theme") === "dark" ||
        document.documentElement.getAttribute("data-layout-mode") === "dark"));

  const [hoveredSource, setHoveredSource] = useState(null);

  // Incoming dynamic sources from API (supports any tenant-configured sources)
  const incomingSources = Array.isArray(data.sources) ? data.sources : [];
  const computedTotal = incomingSources.reduce((sum, s) => sum + (Number(s.revenue) || 0), 0);
  const totalRevenue =
    data.total_won_revenue !== undefined && data.total_won_revenue !== null
      ? Number(data.total_won_revenue)
      : computedTotal;

  const angleDenom = computedTotal > 0 ? computedTotal : 0;
  let runningAngle = 0;

  const sources = incomingSources.map((s, idx) => {
    const palette = SOURCE_PALETTE[idx % SOURCE_PALETTE.length];
    const code = String(s.source_code || s.source_name || `SRC_${idx}`)
      .toUpperCase()
      .replace(/[\s-]+/g, "_");
    const revenue = Number(s.revenue) || 0;
    const percentage =
      s.percentage !== undefined && s.percentage !== null
        ? Number(s.percentage)
        : angleDenom > 0
          ? Number(((revenue / angleDenom) * 100).toFixed(1))
          : 0;
    const sweep = angleDenom > 0 ? (revenue / angleDenom) * 360 : 0;
    const startAngle = runningAngle;
    const endAngle = runningAngle + sweep;
    runningAngle = endAngle;
    return {
      code,
      name: s.source_name || s.source_code || "Other",
      dotColor: palette.dotColor,
      gradId: palette.gradId,
      revenue,
      percentage,
      startAngle,
      endAngle,
    };
  });

  const activeCount = sources.filter((s) => s.revenue > 0).length;

  return (
    <Card
      className="border shadow-none h-100 mb-0"
      style={{
        borderRadius: 0,
        borderColor: isDark ? "#21262d" : "#e2e8f0",
        backgroundColor: isDark ? "#161b22" : "#ffffff",
      }}
    >
      {/* Top Header: Indicator + Title */}
      <CardHeader className="bg-transparent border-0 pt-3 pb-1 px-3 d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center gap-2">
          <span
            style={{
              width: 8,
              height: 8,
              backgroundColor: "#b91c1c",
              borderRadius: 0,
              display: "inline-block",
            }}
          />
          <h6
            className="fw-bold fs-14 mb-0"
            style={{ color: isDark ? "#f8fafc" : "#0f172a" }}
          >
            Revenue by Source
          </h6>
        </div>
      </CardHeader>

      <CardBody className="p-3 pt-1 d-flex flex-column">
        {/* Main 2-Column Content: Left 3D Donut Ring | Right 5 Source Pills */}
        <div className="row g-2 align-items-center my-auto py-2">
          {/* Left: 3D Glossy Torus Donut with Central Revenue */}
          <div className="col-5 d-flex align-items-center justify-content-center">
            <div
              style={{
                width: "100%",
                maxWidth: "165px",
                aspectRatio: "1 / 1",
                position: "relative",
                margin: "0 auto",
              }}
            >
              <svg
                viewBox="0 0 200 200"
                style={{ width: "100%", height: "100%", overflow: "visible" }}
              >
                <defs>
                  {/* Ambient Floor Shadow Filter */}
                  <filter id="donutFloorBlur" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="8" />
                  </filter>

                  {/* Shine Blur Filter */}
                  <filter id="donutShineBlur" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="1.5" />
                  </filter>

                  {/* Center Disc Shadow */}
                  <filter id="centerDiscShadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#000000" floodOpacity={isDark ? "0.4" : "0.08"} />
                  </filter>

                  {/* Gradients for each 3D Torus Donut Segment */}
                  <linearGradient id="gradSourceWebsite" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#4c0519" />
                    <stop offset="100%" stopColor="#701a1e" />
                  </linearGradient>

                  <linearGradient id="gradSourceWhatsApp" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#88637b" />
                    <stop offset="100%" stopColor="#a57c96" />
                  </linearGradient>

                  <linearGradient id="gradSourceReferral" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fce7f3" />
                    <stop offset="100%" stopColor="#fbcfe8" />
                  </linearGradient>

                  <linearGradient id="gradSourceLinkedIn" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#9f1239" />
                    <stop offset="50%" stopColor="#be123c" />
                    <stop offset="100%" stopColor="#881337" />
                  </linearGradient>

                  <linearGradient id="gradSourceWalkin" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#7c4d5a" />
                    <stop offset="100%" stopColor="#9f6b78" />
                  </linearGradient>

                  {/* 3D Tubular Lighting Overlay */}
                  <radialGradient id="torusCrestGloss" cx="35%" cy="35%" r="65%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
                    <stop offset="50%" stopColor="#ffffff" stopOpacity="0" />
                    <stop offset="100%" stopColor="#000000" stopOpacity="0.35" />
                  </radialGradient>
                </defs>

                {/* 1. Ambient Floor Shadow beneath Donut Ring */}
                <ellipse
                  cx="100"
                  cy="162"
                  rx="68"
                  ry="13"
                  fill={isDark ? "rgba(0, 0, 0, 0.55)" : "rgba(136, 19, 55, 0.22)"}
                  filter="url(#donutFloorBlur)"
                />

                {/* 2. Donut Ring Segments (Dynamic Proportional Arcs or Empty State Ring) */}
                <g>
                  {angleDenom <= 0 ? (
                    <path
                      d={describeArc(100, 96, 73, 44, 0, 359.99)}
                      fill={isDark ? "#262626" : "#e2e8f0"}
                      stroke={isDark ? "#121212" : "#ffffff"}
                      strokeWidth="1.2"
                    >
                      <title>No won revenue recorded for this period</title>
                    </path>
                  ) : (
                    sources
                      .filter((s) => s.revenue > 0 && s.endAngle > s.startAngle)
                      .map((s) => {
                        const isHovered = hoveredSource === s.code;
                        const pathD = describeArc(100, 96, 73, 44, s.startAngle, s.endAngle);

                        return (
                          <path
                            key={s.code}
                            d={pathD}
                            fill={`url(#${s.gradId})`}
                            stroke={isDark ? "#121212" : "#ffffff"}
                            strokeWidth="1.2"
                            style={{
                              cursor: "pointer",
                              transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                              transformOrigin: "100px 96px",
                              transform: isHovered ? "scale(1.04)" : "scale(1)",
                              filter: isHovered
                                ? "drop-shadow(0 0 8px rgba(225, 29, 72, 0.5))"
                                : "none",
                            }}
                            onMouseEnter={() => setHoveredSource(s.code)}
                            onMouseLeave={() => setHoveredSource(null)}
                          >
                            <title>{`${s.name}: ${s.percentage}% (${formatInr(s.revenue)})`}</title>
                          </path>
                        );
                      })
                  )}
                </g>

                {/* 3. 3D Specular Highlight on Crest of Tube */}
                <path
                  d={describeShineArc(100, 96, 62, 195, 335)}
                  stroke="rgba(255, 255, 255, 0.72)"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  fill="none"
                  filter="url(#donutShineBlur)"
                  style={{ pointerEvents: "none" }}
                />

                {/* Secondary subtle rim highlight */}
                <path
                  d={describeShineArc(100, 96, 60, 20, 80)}
                  stroke="rgba(255, 255, 255, 0.35)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  fill="none"
                  style={{ pointerEvents: "none" }}
                />

                {/* 4. Center Hole Disc */}
                <circle
                  cx="100"
                  cy="96"
                  r="43"
                  fill={isDark ? "#121212" : "#ffffff"}
                  filter="url(#centerDiscShadow)"
                />
                <circle
                  cx="100"
                  cy="96"
                  r="43"
                  stroke={isDark ? "#262626" : "#f1f5f9"}
                  strokeWidth="1"
                  fill="none"
                />

                {/* 5. Center Text: Revenue Amount + "Total Revenue" */}
                <text
                  x="100"
                  y="93"
                  textAnchor="middle"
                  style={{
                    fontSize: "15.5px",
                    fontWeight: 800,
                    fill: isDark ? "#f8fafc" : "#0f172a",
                    letterSpacing: "-0.2px",
                  }}
                >
                  {formatInr(totalRevenue)}
                </text>
                <text
                  x="100"
                  y="108"
                  textAnchor="middle"
                  style={{
                    fontSize: "10.5px",
                    fontWeight: 600,
                    fill: isDark ? "#94a3b8" : "#475569",
                    letterSpacing: "0.2px",
                  }}
                >
                  Total Revenue
                </text>
              </svg>
            </div>
          </div>

          {/* Right: 5 Stacked Rounded Source Pill Cards */}
          <div className="col-7 ps-1 ps-sm-2">
            <div className="d-flex flex-column gap-1">
              {sources.map((s) => {
                const isHovered = hoveredSource === s.code;

                return (
                  <div
                    key={s.code}
                    className="d-flex align-items-center justify-content-between px-2 px-sm-3 py-1.5"
                    style={{
                      borderRadius: 0,
                      backgroundColor: isHovered
                        ? isDark
                          ? "rgba(244, 63, 94, 0.16)"
                          : "#fff1f2"
                        : isDark
                        ? "#1a1a1a"
                        : "#ffffff",
                      border: isHovered
                        ? `1px solid ${isDark ? "#f43f5e" : "#fecdd3"}`
                        : `1px solid ${isDark ? "#262626" : "#f1f5f9"}`,
                      boxShadow: isHovered
                        ? "0 4px 12px rgba(244, 63, 94, 0.12)"
                        : "0 1px 3px rgba(0, 0, 0, 0.03)",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      transform: isHovered ? "translateX(3px)" : "translateX(0)",
                    }}
                    onMouseEnter={() => setHoveredSource(s.code)}
                    onMouseLeave={() => setHoveredSource(null)}
                  >
                    {/* Left: Colored Bullet Dot + Source Name */}
                    <div className="d-flex align-items-center gap-1 gap-sm-2 min-w-0">
                      <span
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: 0,
                          backgroundColor: s.dotColor,
                          display: "inline-block",
                          flexShrink: 0,
                          boxShadow: `0 0 6px ${s.dotColor}55`,
                        }}
                      />
                      <span
                        className="fw-bold fs-12 text-truncate"
                        style={{ color: isDark ? "#f8fafc" : "#0f172a" }}
                        title={s.name}
                      >
                        {s.name}
                      </span>
                    </div>

                    {/* Right: Percentage + Revenue Amount */}
                    <div className="d-flex align-items-center gap-1 gap-sm-2 flex-shrink-0 text-nowrap ps-1">
                      <span
                        className="fs-11 fw-medium text-end"
                        style={{
                          color: isDark ? "#94a3b8" : "#475569",
                          minWidth: "26px",
                        }}
                      >
                        {s.percentage}%
                      </span>
                      <span
                        className="fs-12 fw-bold text-end"
                        style={{
                          color: isDark ? "#f8fafc" : "#0f172a",
                          minWidth: "55px",
                        }}
                      >
                        {formatInr(s.revenue)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Link: View Full Report → */}
        <div className="mt-auto pt-2 border-top d-flex align-items-center justify-content-between">
          <span className="fs-12 text-muted fw-medium">
            {activeCount > 0 ? `${activeCount} active channel` : "All channels"}
          </span>
          <Link
            to="/crm/opportunities"
            className="fs-12 fw-semibold text-decoration-none d-inline-flex align-items-center gap-1"
            style={{ color: "#7f1d1d" }}
          >
            <span>View Full Report</span>
            <i className="ri-arrow-right-line" />
          </Link>
        </div>
      </CardBody>
    </Card>
  );
};

export default RevenueBySourceDonut;
