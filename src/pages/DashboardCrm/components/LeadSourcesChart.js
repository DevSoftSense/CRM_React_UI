import React, { useState } from "react";
import { Card, CardBody, CardHeader } from "reactstrap";
import { formatNumber } from "./dashboardUtils";

// Helper: Convert polar degrees to SVG cartesian coordinates
function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

// Helper: Generate exact SVG path for a donut slice arc
function describeDonutSegment(cx, cy, rOut, rIn, startAngle, endAngle) {
  const sweep = endAngle - startAngle;
  if (sweep >= 359.9) {
    // Full 360 circle donut
    return `M ${cx},${cy - rOut} A ${rOut},${rOut} 0 1,0 ${cx},${cy + rOut} A ${rOut},${rOut} 0 1,0 ${cx},${cy - rOut} M ${cx},${cy - rIn} A ${rIn},${rIn} 0 1,1 ${cx},${cy + rIn} A ${rIn},${rIn} 0 1,1 ${cx},${cy - rIn} Z`;
  }
  const outerStart = polarToCartesian(cx, cy, rOut, endAngle);
  const outerEnd = polarToCartesian(cx, cy, rOut, startAngle);
  const innerStart = polarToCartesian(cx, cy, rIn, endAngle);
  const innerEnd = polarToCartesian(cx, cy, rIn, startAngle);

  const largeArcFlag = sweep > 180 ? 1 : 0;

  return [
    `M ${outerEnd.x} ${outerEnd.y}`,
    `A ${rOut} ${rOut} 0 ${largeArcFlag} 1 ${outerStart.x} ${outerStart.y}`,
    `L ${innerStart.x} ${innerStart.y}`,
    `A ${rIn} ${rIn} 0 ${largeArcFlag} 0 ${innerEnd.x} ${innerEnd.y}`,
    "Z",
  ].join(" ");
}

// Dynamic Icon Resolver based on source metadata from database
function getSourceIcon(code = "", name = "") {
  const str = `${code} ${name}`.toUpperCase();
  if (str.includes("WEB") || str.includes("SITE") || str.includes("PORTAL") || str.includes("ONLINE")) {
    return "ri-global-line";
  }
  if (str.includes("WHATSAPP") || str.includes("CHAT") || str.includes("MSG")) {
    return "ri-whatsapp-line";
  }
  if (str.includes("REFERRAL") || str.includes("RECOMMEND") || str.includes("FRIEND") || str.includes("PARTNER")) {
    return "ri-user-smile-line";
  }
  if (str.includes("LINKEDIN") || str.includes("SOCIAL")) {
    return "ri-linkedin-box-fill";
  }
  if (str.includes("WALK") || str.includes("STORE") || str.includes("OFFICE") || str.includes("DIRECT")) {
    return "ri-walk-line";
  }
  if (str.includes("PHONE") || str.includes("CALL") || str.includes("TELE")) {
    return "ri-phone-line";
  }
  if (str.includes("EMAIL") || str.includes("MAIL") || str.includes("NEWSLETTER")) {
    return "ri-mail-line";
  }
  if (str.includes("CAMPAIGN") || str.includes("AD") || str.includes("GOOGLE") || str.includes("FACEBOOK")) {
    return "ri-advertisement-line";
  }
  return "ri-pie-chart-2-line";
}

// Dynamic fallback brand colors if database row doesn't specify
const DEFAULT_PALETTE = ["#991b1b", "#16a34a", "#ea580c", "#64748b", "#0077b5", "#7f1d1d", "#d97706", "#2563eb"];

// Snug orbital badge layout positions (tightly framing the prominent 3D donut)
const SLOT_MAP = {
  WHATSAPP: { top: "20px", right: "18px" },
  REFERRAL: { bottom: "48px", right: "18px" },
  WALK_IN: { bottom: "8px", left: "50%", transform: "translateX(-50%)" },
  LINKEDIN: { bottom: "48px", left: "18px" },
  WEBSITE: { top: "20px", left: "18px" },
};

const DEFAULT_SLOTS = [
  { top: "20px", left: "18px" },
  { top: "20px", right: "18px" },
  { bottom: "48px", right: "18px" },
  { bottom: "48px", left: "18px" },
  { bottom: "8px", left: "50%", transform: "translateX(-50%)" },
];

// Clockwise ordering matching the orbital badge positions:
// Top-Right (0°) -> Bottom-Right (90°) -> Bottom (150°) -> Bottom-Left (210°) -> Top-Left (270°)
const CLOCKWISE_ORDER = ["WHATSAPP", "REFERRAL", "WALK_IN", "LINKEDIN", "WEBSITE"];

const LeadSourcesChart = ({ data = [] }) => {
  const [hoveredId, setHoveredId] = useState(null);

  // 100% Dynamic data from PostgreSQL
  const rawSources = Array.isArray(data) ? data : [];

  // Compute total counts dynamically from actual database records
  const totalLeads = rawSources.reduce((sum, s) => sum + Number(s.count || 0), 0);

  // Sort channels in matching clockwise orbital order
  const sortedRaw = [...rawSources].sort((a, b) => {
    const codeA = (a.source_code || "").toUpperCase();
    const codeB = (b.source_code || "").toUpperCase();
    const idxA = CLOCKWISE_ORDER.indexOf(codeA);
    const idxB = CLOCKWISE_ORDER.indexOf(codeB);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return (a.sort_order || 0) - (b.sort_order || 0);
  });

  // Process sources dynamically without any hardcoding
  const sources = sortedRaw.map((s, index) => {
    const id = s.source_id || s.source_code || `src-${index}`;
    const name = s.source_name || s.source_code || `Source ${index + 1}`;
    const count = Number(s.count || 0);
    const percentage = totalLeads > 0 ? (count / totalLeads) * 100 : Number(s.percentage || 0);
    const color = s.color || DEFAULT_PALETTE[index % DEFAULT_PALETTE.length];
    const icon = getSourceIcon(s.source_code, s.source_name);
    const codeKey = (s.source_code || "").toUpperCase();
    const slotPosition = SLOT_MAP[codeKey] || DEFAULT_SLOTS[index % DEFAULT_SLOTS.length];

    return {
      id,
      code: codeKey,
      name,
      count,
      percentage,
      color,
      icon,
      position: slotPosition,
    };
  });

  // Calculate dynamic donut slice angles starting at top 12 o'clock (0°)
  const activeSources = sources.filter((s) => s.count > 0 || s.percentage > 0);
  const totalActivePct = activeSources.reduce((sum, s) => sum + s.percentage, 0);

  let currentAngle = 0; // Starts at 0° (top 12 o'clock)
  const slices = sources.map((s) => {
    let sweep = 0;
    if (totalActivePct > 0 && s.percentage > 0) {
      sweep = (s.percentage / totalActivePct) * 360;
    }
    const startAngle = currentAngle;
    const endAngle = currentAngle + sweep;
    if (sweep > 0) {
      currentAngle += sweep;
    }
    return {
      ...s,
      startAngle,
      endAngle,
      sweep,
    };
  });

  const activeSource = sources.find((s) => s.id === hoveredId);

  return (
    <Card className="crm-card-3d crm-accent-crimson h-100">
      <CardHeader
        className="bg-transparent border-bottom p-3 d-flex align-items-center justify-content-between"
        style={{ borderColor: "#f1f5f9" }}
      >
        <div className="d-flex align-items-center">
          <i className="ri-pie-chart-2-line me-2" style={{ color: "#991b1b", fontSize: "1.05rem" }} />
          <h5
            className="card-title mb-0 fw-semibold"
            style={{ fontSize: "0.9375rem", color: "#1e293b", letterSpacing: "-0.01em" }}
          >
            Lead Sources
          </h5>
        </div>
        <span
          className="rounded-0 px-2 py-1 fw-semibold crm-header-badge"
          style={{
            backgroundColor: "#f8fafc",
            color: "#64748b",
            border: "1px solid #e2e8f0",
            fontSize: "0.72rem",
            boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
          }}
        >
          {sources.length} Channels
        </span>
      </CardHeader>

      <CardBody className="p-2 position-relative d-flex align-items-center justify-content-center" style={{ minHeight: "330px" }}>
        {/* Responsive, tight-fit stage framing the 3D donut with zero excess white space */}
        <div
          style={{
            width: "100%",
            maxWidth: "460px",
            height: "320px",
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* ═════════════════════════════════════════════════════════════ */}
          {/* CENTER 3D DONUT CHART (SVG - Prominent, Rich Scale)           */}
          {/* ═════════════════════════════════════════════════════════════ */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "280px",
              height: "280px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "auto",
            }}
          >
            <svg
              viewBox="0 0 300 300"
              width="100%"
              height="100%"
              style={{ overflow: "visible", display: "block" }}
            >
              <defs>
                {/* Floor Ambient Drop Shadow */}
                <filter id="donut-shadow-blur" x="-30%" y="-30%" width="160%" height="170%">
                  <feGaussianBlur stdDeviation="9" />
                </filter>

                {/* Team Icon Drop Shadow */}
                <filter id="team-icon-shadow" x="-25%" y="-25%" width="150%" height="150%">
                  <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#0f172a" floodOpacity="0.25" />
                </filter>

                {/* Extruded Lower Depth Gradient */}
                <linearGradient id="depth-gradient-outer" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#475569" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#0f172a" stopOpacity="0.8" />
                </linearGradient>

                {/* Inner Bevel Sheen */}
                <linearGradient id="glossy-3d-sheen" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" />
                  <stop offset="50%" stopColor="#ffffff" stopOpacity="0.0" />
                  <stop offset="100%" stopColor="#000000" stopOpacity="0.24" />
                </linearGradient>

                {/* Dynamic Slice Gradients generated from DB colors */}
                {slices.map((slice, idx) => (
                  <linearGradient
                    key={`grad-${slice.id || idx}`}
                    id={`slice-grad-${slice.id || idx}`}
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor={slice.color} stopOpacity="0.94" />
                    <stop offset="100%" stopColor={slice.color} />
                  </linearGradient>
                ))}
              </defs>

              {/* 1. Floor Ambient Drop Shadow */}
              <ellipse
                cx="150"
                cy="176"
                rx="110"
                ry="30"
                fill="rgba(15, 23, 42, 0.18)"
                filter="url(#donut-shadow-blur)"
              />

              {/* 2. 3D Extruded Lower Rim (Physical Depth Side Wall) */}
              <path
                d="M 44,145 A 106,106 0 0,0 256,145 L 256,158 A 106,106 0 0,1 44,158 Z"
                fill="url(#depth-gradient-outer)"
              />

              {/* 3. Donut Slices (Dynamic PostgreSQL Data) */}
              <g>
                {slices.map((slice, idx) => {
                  if (slice.sweep <= 0.05) return null;
                  const isHovered = hoveredId === slice.id;
                  const pathData = describeDonutSegment(150, 145, 106, 72, slice.startAngle, slice.endAngle);

                  return (
                    <path
                      key={slice.id || idx}
                      d={pathData}
                      fill={`url(#slice-grad-${slice.id || idx})`}
                      stroke="#ffffff"
                      strokeWidth="2.5"
                      strokeLinejoin="round"
                      style={{
                        cursor: "pointer",
                        transition: "transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease, filter 0.2s ease",
                        transformOrigin: "150px 145px",
                        transform: isHovered ? "scale(1.05)" : "none",
                        filter: isHovered ? "drop-shadow(0 6px 12px rgba(0,0,0,0.35))" : "none",
                        opacity: hoveredId && !isHovered ? 0.75 : 1,
                      }}
                      onMouseEnter={() => setHoveredId(slice.id)}
                      onMouseLeave={() => setHoveredId(null)}
                    />
                  );
                })}
              </g>

              {/* 4. Glossy 3D Sheen Ring */}
              <circle
                cx="150"
                cy="145"
                r="89"
                fill="none"
                stroke="url(#glossy-3d-sheen)"
                strokeWidth="34"
                opacity="0.32"
                style={{ pointerEvents: "none" }}
              />

              {/* 5. Center Hollow Hole */}
              <circle
                cx="150"
                cy="145"
                r="71"
                fill="#ffffff" className="crm-lead-source-center"
                style={{
                  filter: "drop-shadow(inset 0 2px 6px rgba(15,23,42,0.12))",
                }}
              />
              <circle
                cx="150"
                cy="145"
                r="71"
                fill="none"
                stroke="#f1f5f9"
                strokeWidth="1.8"
              />

              {/* 6. Center 3-People Team / Group Icon */}
              <g className="crm-lead-source-team-icon" filter="url(#team-icon-shadow)" transform="translate(150, 145)">
                {/* Center Leader Figure */}
                <circle cx="0" cy="-9" r="7.5" fill="#0f172a" />
                <path
                  d="M -12,15 C -12,7 -6,3.8 0,3.8 C 6,3.8 12,7 12,15 Z"
                  fill="#0f172a"
                />

                {/* Left Figure */}
                <circle cx="-17" cy="-5.5" r="5.8" fill="#0f172a" opacity="0.92" />
                <path
                  d="M -26,15 C -26,9.5 -21,6.8 -15.5,6.8 C -12,6.8 -9.5,8 -8.5,10.5"
                  fill="none"
                  stroke="#0f172a"
                  strokeWidth="4.2"
                  strokeLinecap="round"
                />
                <path
                  d="M -26,15 C -26,9.5 -21,6.8 -15.5,6.8 C -12,6.8 -9.5,8 -8.5,10.5"
                  fill="#0f172a"
                  opacity="0.92"
                />

                {/* Right Figure */}
                <circle cx="17" cy="-5.5" r="5.8" fill="#0f172a" opacity="0.92" />
                <path
                  d="M 8.5,10.5 C 9.5,8 12,6.8 15.5,6.8 C 21,6.8 26,9.5 26,15"
                  fill="none"
                  stroke="#0f172a"
                  strokeWidth="4.2"
                  strokeLinecap="round"
                />
                <path
                  d="M 8.5,10.5 C 9.5,8 12,6.8 15.5,6.8 C 21,6.8 26,9.5 26,15"
                  fill="#0f172a"
                  opacity="0.92"
                />
              </g>
            </svg>
          </div>

          {/* ═════════════════════════════════════════════════════════════ */}
          {/* DYNAMIC ORBITAL BADGES (Neumorphic Callouts)                  */}
          {/* ═════════════════════════════════════════════════════════════ */}
          {sources.map((item, idx) => {
            const isHovered = hoveredId === item.id;
            const pos = item.position;

            return (
              <div
                key={item.id || idx}
                style={{
                  position: "absolute",
                  ...pos,
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  cursor: "pointer",
                  transition: "transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.18s ease",
                  transform: isHovered
                    ? `${pos.transform || ""} translateY(-3px) scale(1.06)`.trim()
                    : pos.transform || "none",
                  zIndex: isHovered ? 12 : 2,
                }}
                onMouseEnter={() => setHoveredId(item.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {/* Neumorphic Circular Icon Button */}
                <div
                  className="crm-lead-source-icon-btn"
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "50%",
                    backgroundColor: "var(--vz-card-bg-fill, #ffffff)",
                    border: `1.5px solid ${isHovered ? item.color : "var(--vz-border-color, rgba(226, 232, 240, 0.9))"}`,
                    boxShadow: isHovered
                      ? `0 6px 16px ${item.color}40, 0 2px 4px rgba(15,23,42,0.08)`
                      : "0 4px 12px rgba(15,23,42,0.08), 0 1px 3px rgba(15,23,42,0.04), inset 0 1px 1px #ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    transition: "border-color 0.18s ease, box-shadow 0.18s ease",
                  }}
                >
                  <i
                    className={item.icon}
                    style={{
                      color: item.color,
                      fontSize: "1.35rem",
                      lineHeight: 1,
                    }}
                  />
                </div>

                {/* Typography: Channel Name & Percentage */}
                <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
                  <span
                    className="crm-lead-source-name"
                    style={{
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      color: isHovered ? item.color : "var(--vz-heading-color, #1e293b)",
                      transition: "color 0.18s ease",
                      letterSpacing: "-0.01em",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.name}
                  </span>
                  <span
                    className="crm-lead-source-pct"
                    style={{
                      fontSize: "1.05rem",
                      fontWeight: 800,
                      color: "var(--vz-heading-color, #0f172a)",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {Number(item.percentage || 0).toFixed(0)}%
                  </span>
                </div>
              </div>
            );
          })}

          {/* Active Hover Detail Pill */}
          {activeSource && (
            <div
              className="text-center py-1 px-3 border rounded-0"
              style={{
                backgroundColor: "#ffffff",
                borderColor: "#cbd5e1",
                fontSize: "0.8125rem",
                boxShadow: "0 4px 12px rgba(15,23,42,0.12)",
                position: "absolute",
                bottom: "-6px",
                left: "50%",
                transform: "translateX(-50%)",
                whiteSpace: "nowrap",
                zIndex: 20,
              }}
            >
              <strong style={{ color: activeSource.color }}>{activeSource.name}:</strong>{" "}
              <span>{formatNumber(activeSource.count)} leads</span> •{" "}
              <span className="fw-semibold text-dark">
                {Number(activeSource.percentage || 0).toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
};

export default LeadSourcesChart;
