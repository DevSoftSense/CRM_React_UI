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
      className="rounded-circle d-flex align-items-center justify-content-center"
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

// Illustrated SVG Avatar matching mockup
const RepAvatar = ({ name = "", index = 0 }) => {
  const isFemale = ["neha", "priya", "pooja", "ananya", "sneha", "kavita", "ritu", "sunita", "anita"].some(
    (n) => name.toLowerCase().includes(n)
  );

  if (isFemale) {
    return (
      <svg
        width="34"
        height="34"
        viewBox="0 0 36 36"
        style={{ borderRadius: "50%", flexShrink: 0, display: "block" }}
      >
        <circle cx="18" cy="18" r="17" fill="#ffe4e6" stroke="#f87171" strokeWidth="1.8" />
        <path d="M 10,18 C 9,28 10,32 12,34 L 24,34 C 26,32 27,28 26,18 Z" fill="#1c1917" />
        <path d="M 8,36 C 10,29 14,27 18,27 C 22,27 26,29 28,36 Z" fill="#be123c" />
        <rect x="15.5" y="21" width="5" height="7" fill="#fed7aa" rx="1.5" />
        <ellipse cx="18" cy="17" rx="6.5" ry="7.5" fill="#fde68a" />
        <path
          d="M 11.5,16 C 11.5,10 14,8 18,8 C 22,8 24.5,10 24.5,16 C 23,13 20,11 18,12 C 16,11 13,13 11.5,16 Z"
          fill="#1c1917"
        />
        <circle cx="15.5" cy="16.5" r="1" fill="#1c1917" />
        <circle cx="20.5" cy="16.5" r="1" fill="#1c1917" />
        <path d="M 16.5,20 Q 18,21.5 19.5,20" fill="none" stroke="#b91c1c" strokeWidth="0.8" strokeLinecap="round" />
      </svg>
    );
  }

  const hasFullBeard = index % 2 === 1 || name.toLowerCase().includes("vikram");

  return (
    <svg
      width="34"
      height="34"
      viewBox="0 0 36 36"
      style={{ borderRadius: "50%", flexShrink: 0, display: "block" }}
    >
      <circle cx="18" cy="18" r="17" fill="#ffedd5" stroke="#f87171" strokeWidth="1.8" />
      <path d="M 7,36 C 9,28 13,26 18,26 C 23,26 27,28 29,36 Z" fill={hasFullBeard ? "#1e293b" : "#0f766e"} />
      <rect x="15.5" y="21" width="5" height="6" fill="#fed7aa" rx="1" />
      <ellipse cx="18" cy="16.5" rx="6.5" ry="7.5" fill="#fde68a" />
      <path
        d="M 11.5,15 C 11.5,9 14,7 18,7 C 22,7 24.5,9 24.5,15 C 23,12 21,11 18,11 C 15,11 13,12 11.5,15 Z"
        fill="#451a03"
      />
      <circle cx="15.5" cy="16" r="1" fill="#1c1917" />
      <circle cx="20.5" cy="16" r="1" fill="#1c1917" />
      {hasFullBeard ? (
        <path d="M 13.5,18 C 14.5,23.5 21.5,23.5 22.5,18 C 21,20 15,20 13.5,18 Z" fill="#451a03" />
      ) : (
        <path
          d="M 14.5,19 C 15.5,22.5 20.5,22.5 21.5,19 C 20,20.2 16,20.2 14.5,19 Z"
          fill="#78350f"
          opacity="0.6"
        />
      )}
      <path d="M 16.5,19.5 Q 18,20.8 19.5,19.5" fill="none" stroke="#451a03" strokeWidth="0.8" strokeLinecap="round" />
    </svg>
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
            className="rounded-circle d-flex align-items-center justify-content-center me-2"
            style={{ width: "28px", height: "28px", backgroundColor: "#fff1f2", color: "#991b1b" }}
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
            backgroundColor: "#ffffff",
            border: "1px solid #fee2e2",
            borderRadius: "20px",
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
                              borderRadius: "10px",
                              overflow: "hidden",
                              flexShrink: 0,
                            }}
                          >
                            <div
                              style={{
                                width: `${pct}%`,
                                height: "100%",
                                backgroundColor: progressColor,
                                borderRadius: "10px",
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
