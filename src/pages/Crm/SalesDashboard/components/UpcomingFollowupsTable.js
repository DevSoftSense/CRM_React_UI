import React from "react";
import { Card, CardBody, CardHeader } from "reactstrap";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";

const parseDateBadge = (dateStr) => {
  if (!dateStr) return { day: "--", month: "---" };
  const str = String(dateStr).trim();
  const parts = str.split(/[\s-]+/);

  if (parts.length >= 2) {
    if (isNaN(parts[0])) {
      return { day: parts[1].padStart(2, "0"), month: parts[0].slice(0, 3) };
    }
    if (parts[0].length === 4) {
      const d = new Date(str);
      if (!isNaN(d.getTime())) {
        return {
          day: String(d.getDate()).padStart(2, "0"),
          month: d.toLocaleString("en-US", { month: "short" }),
        };
      }
    }
    return { day: parts[0].padStart(2, "0"), month: parts[1].slice(0, 3) };
  }
  return { day: str.slice(0, 2), month: str.slice(3, 6) || "---" };
};

const getPriorityStyle = (priority, isDark) => {
  const p = (priority || "").toUpperCase();
  if (p.includes("HIGH")) {
    return {
      label: "High",
      bg: isDark ? "rgba(239, 68, 68, 0.2)" : "#fee2e2",
      color: isDark ? "#fca5a5" : "#dc2626",
      border: isDark ? "1px solid rgba(239, 68, 68, 0.3)" : "1px solid #fca5a5",
    };
  }
  if (p.includes("LOW")) {
    return {
      label: "Low",
      bg: isDark ? "rgba(34, 197, 94, 0.2)" : "#dcfce7",
      color: isDark ? "#86efac" : "#16a34a",
      border: isDark ? "1px solid rgba(34, 197, 94, 0.3)" : "1px solid #86efac",
    };
  }
  return {
    label: "Med",
    bg: isDark ? "rgba(249, 115, 22, 0.2)" : "#ffedd5",
    color: isDark ? "#fdba74" : "#ea580c",
    border: isDark ? "1px solid rgba(249, 115, 22, 0.3)" : "1px solid #fdba74",
  };
};

const UpcomingFollowupsTable = ({ followups = [] }) => {
  const layoutModeType = useSelector((state) => state.Layout?.layoutModeType);
  const isDark =
    layoutModeType === "dark" ||
    (typeof document !== "undefined" &&
      (document.documentElement.getAttribute("data-bs-theme") === "dark" ||
        document.documentElement.getAttribute("data-layout-mode") === "dark"));

  const list = Array.isArray(followups) ? followups : [];

  return (
    <Card
      className="border shadow-none h-100 mb-0 bg-white"
      style={{
        borderRadius: "12px",
        borderColor: isDark ? "#334155" : "#e2e8f0",
        backgroundColor: isDark ? "#1e293b" : "#ffffff",
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
              borderRadius: "50%",
              display: "inline-block",
            }}
          />
          <h6
            className="fw-bold fs-14 mb-0"
            style={{ color: isDark ? "#f8fafc" : "#0f172a" }}
          >
            Upcoming Follow-ups
          </h6>
        </div>
      </CardHeader>

      <CardBody className="p-3 pt-1 d-flex flex-column">
        {list.length === 0 ? (
          <div className="d-flex flex-column align-items-center justify-content-center text-muted my-auto py-5">
            <i className="ri-calendar-check-line fs-32 text-muted mb-2" />
            <span className="fs-13">No upcoming follow-ups scheduled.</span>
          </div>
        ) : (
          <div className="d-flex flex-column gap-1 mb-2">
            {list.map((f, idx) => {
              const isLast = idx === list.length - 1;
              const dateBadge = parseDateBadge(f.followup_date);
              const prioStyle = getPriorityStyle(f.priority, isDark);

              return (
                <div
                  key={idx}
                  className="d-flex align-items-center justify-content-between p-2 rounded-2"
                  style={{
                    borderBottom: isLast
                      ? "none"
                      : `1px solid ${isDark ? "#334155" : "#f1f5f9"}`,
                    transition: "background-color 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = isDark
                      ? "rgba(255,255,255,0.03)"
                      : "#f8fafc";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  {/* Left: Circular Pink Date Badge + Title & Company */}
                  <div className="d-flex align-items-center gap-3 min-w-0">
                    {/* Pink Coin Circular Date Badge */}
                    <div
                      className="d-flex flex-column align-items-center justify-content-center flex-shrink-0"
                      style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "50%",
                        background: isDark
                          ? "radial-gradient(circle at 35% 35%, rgba(244, 63, 94, 0.25), #1e293b)"
                          : "radial-gradient(circle at 35% 35%, #fff1f2 0%, #ffe4e6 70%, #fecdd3 100%)",
                        border: `1.5px solid ${isDark ? "#881337" : "#fecdd3"}`,
                        boxShadow: isDark
                          ? "0 2px 8px rgba(0,0,0,0.3)"
                          : "0 2px 8px rgba(244, 63, 94, 0.14)",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "15px",
                          fontWeight: 800,
                          lineHeight: 1,
                          color: isDark ? "#fca5a5" : "#881337",
                        }}
                      >
                        {dateBadge.day}
                      </span>
                      <span
                        style={{
                          fontSize: "10.5px",
                          fontWeight: 700,
                          lineHeight: 1,
                          marginTop: "2px",
                          color: isDark ? "#fca5a5" : "#881337",
                          textTransform: "capitalize",
                          letterSpacing: "0.2px",
                        }}
                      >
                        {dateBadge.month}
                      </span>
                    </div>

                    {/* Subject Title & Company Subtitle */}
                    <div className="min-w-0">
                      <Link
                        to={f.task_id ? `/crm/tasks/${f.task_id}` : "/crm/tasks"}
                        className="fw-bold fs-13 text-decoration-none d-block mb-0 text-truncate"
                        style={{
                          color: isDark ? "#f8fafc" : "#0f172a",
                          maxWidth: "260px",
                          letterSpacing: "-0.1px",
                        }}
                        title={f.subject}
                      >
                        {f.subject}
                      </Link>
                      <span
                        className="fs-12 fw-medium d-block text-truncate mt-1"
                        style={{
                          color: isDark ? "#94a3b8" : "#475569",
                          maxWidth: "240px",
                        }}
                        title={f.related_to}
                      >
                        {f.related_to}
                      </span>
                    </div>
                  </div>

                  {/* Right: Priority Pill Badge + Chevron Arrow */}
                  <div className="d-flex align-items-center gap-2 flex-shrink-0 ps-2">
                    <span
                      className="fw-bold text-center d-inline-block"
                      style={{
                        fontSize: "11px",
                        backgroundColor: prioStyle.bg,
                        color: prioStyle.color,
                        borderRadius: "14px",
                        padding: "3px 12px",
                        minWidth: "48px",
                        lineHeight: "1.4",
                        border: prioStyle.border,
                      }}
                    >
                      {prioStyle.label}
                    </span>

                    <Link
                      to={f.task_id ? `/crm/tasks/${f.task_id}` : "/crm/tasks"}
                      className="d-inline-flex align-items-center text-decoration-none"
                      style={{ color: isDark ? "#64748b" : "#94a3b8" }}
                      title="View Task Details"
                    >
                      <i className="ri-arrow-right-s-line fs-18" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Link: View Follow-up Center → */}
        <div className="mt-auto pt-2 border-top d-flex align-items-center justify-content-between">
          <span className="fs-12 text-muted fw-medium">
            {list.length > 0
              ? `${list.length} upcoming ${list.length === 1 ? "follow-up" : "follow-ups"}`
              : ""}
          </span>
          <Link
            to="/crm/tasks"
            className="fs-12 fw-semibold text-decoration-none d-inline-flex align-items-center gap-1"
            style={{ color: "#7f1d1d" }}
          >
            <span>View Follow-up Center</span>
            <i className="ri-arrow-right-line" />
          </Link>
        </div>
      </CardBody>
    </Card>
  );
};

export default UpcomingFollowupsTable;
