import React from "react";
import { Card, CardBody, CardHeader } from "reactstrap";
import { Link } from "react-router-dom";
import { formatCurrency, formatNumber } from "./dashboardUtils";

// 12-point scalloped rosette prize medal SVG
const RosetteMedal = ({ rank = 1 }) => {
  const pathD =
    "M 14.0,1.0 L 16.8,3.4 L 20.5,2.7 L 21.8,6.2 L 25.3,7.5 L 24.6,11.2 L 27.0,14.0 L 24.6,16.8 L 25.3,20.5 L 21.8,21.8 L 20.5,25.3 L 16.8,24.6 L 14.0,27.0 L 11.2,24.6 L 7.5,25.3 L 6.2,21.8 L 2.7,20.5 L 3.4,16.8 L 1.0,14.0 L 3.4,11.2 L 2.7,7.5 L 6.2,6.2 L 7.5,2.7 L 11.2,3.4 Z";

  if (rank === 1) {
    // Gold Medal
    return (
      <svg
        width="26"
        height="26"
        viewBox="0 0 28 28"
        style={{ flexShrink: 0, filter: "drop-shadow(0 2px 4px rgba(217, 119, 6, 0.4))" }}
      >
        <defs>
          <linearGradient id="gold-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
        </defs>
        <path d={pathD} fill="url(#gold-grad)" />
        <circle cx="14" cy="14" r="9" fill="#f59e0b" />
        <text
          x="14"
          y="17.5"
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#ffffff"
          style={{ fontSize: "11px", fontWeight: "800", fontFamily: "inherit" }}
        >
          1
        </text>
      </svg>
    );
  }

  if (rank === 2) {
    // Silver Medal
    return (
      <svg
        width="26"
        height="26"
        viewBox="0 0 28 28"
        style={{ flexShrink: 0, filter: "drop-shadow(0 2px 4px rgba(148, 163, 184, 0.4))" }}
      >
        <defs>
          <linearGradient id="silver-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#94a3b8" />
          </linearGradient>
        </defs>
        <path d={pathD} fill="url(#silver-grad)" />
        <circle cx="14" cy="14" r="9" fill="#94a3b8" />
        <text
          x="14"
          y="17.5"
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#1e293b"
          style={{ fontSize: "11px", fontWeight: "800", fontFamily: "inherit" }}
        >
          2
        </text>
      </svg>
    );
  }

  if (rank === 3) {
    // Bronze Medal
    return (
      <svg
        width="26"
        height="26"
        viewBox="0 0 28 28"
        style={{ flexShrink: 0, filter: "drop-shadow(0 2px 4px rgba(180, 83, 9, 0.4))" }}
      >
        <defs>
          <linearGradient id="bronze-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#92400e" />
          </linearGradient>
        </defs>
        <path d={pathD} fill="url(#bronze-grad)" />
        <circle cx="14" cy="14" r="9" fill="#b45309" />
        <text
          x="14"
          y="17.5"
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#ffffff"
          style={{ fontSize: "11px", fontWeight: "800", fontFamily: "inherit" }}
        >
          3
        </text>
      </svg>
    );
  }

  return (
    <div
      className="rounded-0 d-flex align-items-center justify-content-center"
      style={{
        width: "24px",
        height: "24px",
        backgroundColor: "#f1f5f9",
        color: "#64748b",
        fontWeight: 700,
        fontSize: "0.75rem",
      }}
    >
      {rank}
    </div>
  );
};

// Neutral square monogram avatar (no hardcoded name/gender heuristics)
const AVATAR_PALETTES = [
  { bg: "#fee2e2", border: "#fca5a5", color: "#991b1b" },
  { bg: "#e0f2fe", border: "#7dd3fc", color: "#0369a1" },
  { bg: "#ecfdf5", border: "#6ee7b7", color: "#047857" },
  { bg: "#fef3c7", border: "#fcd34d", color: "#92400e" },
  { bg: "#f1f5f9", border: "#cbd5e1", color: "#334155" },
];

const RepAvatar = ({ name = "", index = 0 }) => {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  const initials =
    parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : (parts[0] ? parts[0].slice(0, 2).toUpperCase() : "UN");
  const palette = AVATAR_PALETTES[index % AVATAR_PALETTES.length];

  return (
    <div
      className="d-flex align-items-center justify-content-center fw-bold flex-shrink-0"
      style={{
        width: "32px",
        height: "32px",
        borderRadius: 0,
        backgroundColor: palette.bg,
        border: `1.5px solid ${palette.border}`,
        color: palette.color,
        fontSize: "0.72rem",
        letterSpacing: "0.02em",
      }}
    >
      {initials}
    </div>
  );
};

const TeamPerformanceCard = ({ reps = [] }) => {
  const list = Array.isArray(reps) ? reps : [];

  return (
    <Card className="crm-card-3d crm-accent-maroon h-100">
      <CardHeader
        className="bg-transparent border-bottom p-3 d-flex align-items-center justify-content-between"
        style={{ borderColor: "#f1f5f9" }}
      >
        <div className="d-flex align-items-center">
          <div
            className="rounded-0 d-flex align-items-center justify-content-center me-2"
            style={{ width: "28px", height: "28px", backgroundColor: "rgba(153, 27, 27, 0.15)", color: "#991b1b" }}
          >
            <i className="ri-trophy-fill" style={{ fontSize: "0.95rem" }} />
          </div>
          <h5
            className="card-title mb-0 fw-bold"
            style={{ fontSize: "0.9375rem", color: "#1e293b", letterSpacing: "-0.01em" }}
          >
            Team Performance
          </h5>
        </div>
        <Link
          to="/crm/reports"
          className="text-decoration-none fw-semibold d-inline-flex align-items-center crm-card-header-btn"
          style={{
            fontSize: "0.72rem",
            color: "#991b1b",
            border: "1px solid #fee2e2",
            borderRadius: 0,
            padding: "3px 10px",
            transition: "all 0.15s ease",
          }}
        >
          View Report <i className="ri-arrow-right-line ms-1" style={{ fontSize: "0.75rem" }} />
        </Link>
      </CardHeader>

      <CardBody className="p-3 d-flex flex-column justify-content-between">
        <div className="table-responsive" style={{ overflowX: "auto" }}>
          <table className="w-100 align-middle mb-0" style={{ borderCollapse: "collapse" }}>
            <thead style={{ borderBottom: "1px solid #f1f5f9" }}>
              <tr style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>
                <th scope="col" style={{ width: "36px", textAlign: "center", border: "none", paddingBottom: "10px" }}>
                  #
                </th>
                <th scope="col" style={{ border: "none", paddingBottom: "10px" }}></th>
                <th scope="col" style={{ textAlign: "center", border: "none", paddingBottom: "10px" }}>
                  Leads
                </th>
                <th scope="col" style={{ textAlign: "center", border: "none", paddingBottom: "10px" }}>
                  Won
                </th>
                <th scope="col" style={{ textAlign: "center", border: "none", paddingBottom: "10px" }}>
                  Revenue
                </th>
                <th
                  scope="col"
                  style={{ textAlign: "left", border: "none", paddingBottom: "10px", paddingLeft: "12px" }}
                >
                  Target %
                </th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-4 text-muted" style={{ border: "none" }}>
                    No team performance records available.
                  </td>
                </tr>
              ) : (
                list.map((r, idx) => {
                  const rank = idx + 1;
                  const isFirst = idx === 0;
                  const isLast = idx === list.length - 1;
                  const pct = Math.min(100, Math.max(0, Number(r.target_pct || 0)));
                  const progressColor = pct >= 75 ? "#10b981" : pct >= 40 ? "#f59e0b" : "#ef4444";

                  return (
                    <tr
                      key={r.employee_id || idx}
                      style={{
                        borderBottom: idx < list.length - 1 ? "1px solid #f1f5f9" : "none",
                        transition: "background-color 0.15s ease",
                      }}
                      className="crm-table-hover-row"
                    >
                      {/* Rank column with connected vertical track */}
                      <td
                        style={{
                          width: "36px",
                          position: "relative",
                          padding: "10px 0",
                          textAlign: "center",
                          verticalAlign: "middle",
                          border: "none",
                        }}
                      >
                        {/* Connecting vertical line segment */}
                        {list.length > 1 && (
                          <div
                            style={{
                              position: "absolute",
                              left: "50%",
                              transform: "translateX(-50%)",
                              top: isFirst ? "50%" : 0,
                              bottom: isLast ? "50%" : 0,
                              width: "2px",
                              backgroundColor: "#991b1b",
                              zIndex: 1,
                            }}
                          />
                        )}
                        {/* Rosette Medal Badge */}
                        <div
                          style={{
                            position: "relative",
                            zIndex: 2,
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                          }}
                        >
                          <RosetteMedal rank={rank} />
                        </div>
                      </td>

                      {/* Sales Person Avatar & Name */}
                      <td style={{ padding: "10px 0 10px 8px", verticalAlign: "middle", border: "none" }}>
                        <div className="d-flex align-items-center">
                          <RepAvatar name={r.employee_name} index={idx} />
                          <span
                            className="fw-bold text-dark text-truncate ms-2"
                            style={{ fontSize: "0.8125rem", maxWidth: "110px", letterSpacing: "-0.01em" }}
                            title={r.employee_name}
                          >
                            {r.employee_name}
                          </span>
                        </div>
                      </td>

                      {/* Leads Count (highlighted red for Rank 1 / active) */}
                      <td
                        style={{
                          textAlign: "center",
                          verticalAlign: "middle",
                          border: "none",
                          padding: "10px 4px",
                        }}
                      >
                        <span
                          className="fw-bold"
                          style={{
                            fontSize: "0.8125rem",
                            color: Number(r.leads_count) > 0 ? "#991b1b" : "var(--vz-heading-color, #1e293b)",
                          }}
                        >
                          {formatNumber(r.leads_count)}
                        </span>
                      </td>

                      {/* Won Count */}
                      <td
                        style={{
                          textAlign: "center",
                          verticalAlign: "middle",
                          border: "none",
                          padding: "10px 4px",
                        }}
                      >
                        <span className="fw-semibold text-dark" style={{ fontSize: "0.8125rem" }}>
                          {formatNumber(r.won_count)}
                        </span>
                      </td>

                      {/* Revenue */}
                      <td
                        style={{
                          textAlign: "center",
                          verticalAlign: "middle",
                          border: "none",
                          padding: "10px 4px",
                        }}
                      >
                        <span className="fw-semibold text-dark" style={{ fontSize: "0.8125rem" }}>
                          {formatCurrency(r.revenue)}
                        </span>
                      </td>

                      {/* Target % Progress Bar + Label */}
                      <td
                        style={{
                          textAlign: "left",
                          verticalAlign: "middle",
                          border: "none",
                          padding: "10px 12px 10px 12px",
                        }}
                      >
                        <div className="d-flex align-items-center gap-2">
                          <div
                            style={{
                              width: "55px",
                              height: "6px",
                              backgroundColor: "#e2e8f0",
                              borderRadius: 0,
                              overflow: "hidden",
                              flexShrink: 0,
                            }}
                          >
                            <div
                              style={{
                                width: `${pct}%`,
                                height: "100%",
                                backgroundColor: progressColor,
                                borderRadius: 0,
                                transition: "width 0.3s ease",
                              }}
                            />
                          </div>
                          <span
                            className="fw-bold text-dark"
                            style={{ fontSize: "0.75rem", minWidth: "26px", textAlign: "right" }}
                          >
                            {pct.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  );
};

export default TeamPerformanceCard;
