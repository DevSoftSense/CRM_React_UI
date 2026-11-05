import React, { useMemo, useState } from "react";
import {
  Card,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Badge,
} from "reactstrap";
import { useNavigate } from "react-router-dom";

/**
 * 3D Yellow Bell Illustration SVG matching Image 1 ("11. With Illustrations")
 * Includes specular highlights, curved bell flare, golden clapper,
 * soft floating ground shadow, and a red notification bubble badge.
 */
const Bell3DIllustration = ({ totalCount = 0 }) => (
  <div
    className="d-flex align-items-center justify-content-center position-relative w-100 h-100 p-2 crm-notif-bell-box"
    style={{
      background: "linear-gradient(145deg, #fff1f2 0%, #fee2e2 50%, #fdf2f8 100%)",
      borderRight: "1px solid #fee2e2",
      minHeight: "220px",
    }}
  >
    <svg
      width="105"
      height="125"
      viewBox="0 0 140 150"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        filter: "drop-shadow(0 12px 20px rgba(180, 83, 9, 0.2))",
        overflow: "visible",
      }}
    >
      <defs>
        {/* Bell Body 3D Radial Highlights */}
        <radialGradient id="notifBellHighlight" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="35%" stopColor="#facc15" />
          <stop offset="70%" stopColor="#eab308" />
          <stop offset="100%" stopColor="#ca8a04" />
        </radialGradient>

        {/* Bell Rim Gradient */}
        <linearGradient id="notifBellRim" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="40%" stopColor="#eab308" />
          <stop offset="100%" stopColor="#a16207" />
        </linearGradient>

        {/* Clapper 3D Gradient */}
        <radialGradient id="notifClapperGrad" cx="38%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="45%" stopColor="#ca8a04" />
          <stop offset="100%" stopColor="#713f12" />
        </radialGradient>

        {/* Top Handle Loop Gradient */}
        <linearGradient id="notifHandleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="50%" stopColor="#eab308" />
          <stop offset="100%" stopColor="#a16207" />
        </linearGradient>

        {/* Red Badge 3D Gradient */}
        <linearGradient id="notifBadgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="65%" stopColor="#b91c1c" />
          <stop offset="100%" stopColor="#7f1d1d" />
        </linearGradient>

        {/* Soft Ground Shadow Filter */}
        <filter id="notifGroundShadow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4.5" />
        </filter>
      </defs>

      {/* Floating Ground Shadow */}
      <ellipse cx="68" cy="142" rx="38" ry="6" fill="rgba(180, 83, 9, 0.25)" filter="url(#notifGroundShadow)" />

      {/* Top Handle Loop */}
      <path
        d="M57 32 C57 18, 79 18, 79 32"
        stroke="url(#notifHandleGrad)"
        strokeWidth="6.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Golden Clapper (bottom ball) */}
      <circle cx="68" cy="116" r="13" fill="url(#notifClapperGrad)" />

      {/* Bell Main Body with 3D flare */}
      <path
        d="M68 30
           C52 30, 44 46, 42 66
           C40 82, 34 96, 22 106
           C20 108, 22 113, 26 113
           L110 113
           C114 113, 116 108, 114 106
           C102 96, 96 82, 94 66
           C92 46, 84 30, 68 30 Z"
        fill="url(#notifBellHighlight)"
      />

      {/* Specular White Sheen Reflection */}
      <path
        d="M56 36
           C48 46, 45 60, 44 74
           C43 86, 38 96, 30 104"
        stroke="#ffffff"
        strokeWidth="3.5"
        strokeLinecap="round"
        opacity="0.6"
        fill="none"
      />

      {/* Bell Flared Rim (Bottom Lip) */}
      <ellipse cx="68" cy="113" rx="46" ry="9" fill="url(#notifBellRim)" />
      <ellipse cx="68" cy="113" rx="41" ry="6" fill="#ca8a04" opacity="0.65" />

      {/* Red Notification Badge */}
      <g style={{ filter: "drop-shadow(0 4px 6px rgba(185, 28, 28, 0.45))" }}>
        <circle cx="106" cy="38" r="16" fill="url(#notifBadgeGrad)" stroke="#ffffff" strokeWidth="2.5" />
        <text
          x="106"
          y="43.5"
          textAnchor="middle"
          fill="#ffffff"
          fontSize="13"
          fontWeight="bold"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          {totalCount > 99 ? "99+" : totalCount > 0 ? totalCount : "0"}
        </text>
      </g>
    </svg>
  </div>
);

const NotificationsCard = ({ notifications = {} }) => {
  const navigate = useNavigate();
  const [summaryOpen, setSummaryOpen] = useState(false);

  // 5 Canonical Notification Items matching the design
  const items = useMemo(() => [
    {
      id: "todays_birthdays",
      label: "Today's Birthdays",
      count: Number(notifications?.todays_birthdays || 0),
      icon: "ri-cake-2-line",
      color: "#b91c1c",
      bg: "#fef2f2",
      border: "#fecaca",
      route: "/crm/customers",
      desc: "Client contacts celebrating their birthday today",
    },
    {
      id: "pending_quotations",
      label: "Pending Quotations",
      count: Number(notifications?.pending_quotations || 0),
      icon: "ri-file-text-line",
      color: "#d97706",
      bg: "#fffbeb",
      border: "#fde68a",
      route: "/crm/opportunities?stage=PROPOSAL",
      desc: "Deals in Proposal stage awaiting customer response",
    },
    {
      id: "approval_pending",
      label: "Approval Pending",
      count: Number(notifications?.approval_pending || 0),
      icon: "ri-time-line",
      color: "#ea580c",
      bg: "#fff7ed",
      border: "#fed7aa",
      route: "/crm/opportunities?stage=NEGOTIATION",
      desc: "Deals under negotiation or internal sign-off review",
    },
    {
      id: "high_priority_customers",
      label: "High Priority Customers",
      count: Number(notifications?.high_priority_customers || 0),
      icon: "ri-vip-crown-line",
      color: "#991b1b",
      bg: "#fef2f2",
      border: "#fecaca",
      route: "/crm/customers",
      desc: "High-value key client accounts (deals ≥ ₹5,00,000)",
    },
    {
      id: "overdue_followups",
      label: "Overdue Follow-ups",
      count: Number(notifications?.overdue_payments || notifications?.overdue_followups || 0),
      icon: "ri-alarm-warning-line",
      color: "#dc2626",
      bg: "#fee2e2",
      border: "#fca5a5",
      route: "/crm/tasks",
      desc: "Action items with due date before today requiring urgent follow-up",
    },
  ], [notifications]);

  // Aggregate active notification count
  const totalNotifications = useMemo(() => {
    return items.reduce((acc, curr) => acc + curr.count, 0);
  }, [items]);

  return (
    <>
      <Card
        className="border shadow-none mb-0 h-100 position-relative overflow-hidden"
        style={{
          borderRadius: 0,
          borderColor: "#e2e8f0",
          boxShadow: "0 2px 8px -2px rgba(15, 23, 42, 0.05)",
        }}
      >
        <div className="row g-0 h-100 align-items-stretch">
          {/* Left Column: 3D Yellow Bell Illustration */}
          <div className="col-sm-5 col-12 d-flex flex-column justify-content-center">
            <Bell3DIllustration totalCount={totalNotifications} />
          </div>

          {/* Right Column: Notifications List */}
          <div className="col-sm-7 col-12 p-3 d-flex flex-column justify-content-between">
            {/* Header */}
            <div className="d-flex align-items-center justify-content-between mb-2 pb-1 border-bottom border-light">
              <h5 className="fw-bold mb-0" style={{ fontSize: "0.9375rem", letterSpacing: "-0.2px" }}>
                Notifications
              </h5>
              <button
                type="button"
                className="btn btn-link p-0 text-decoration-none d-inline-flex align-items-center gap-1 crm-card-header-link"
                style={{ fontWeight: 700, fontSize: "0.78rem" }}
                onClick={() => setSummaryOpen(true)}
                title="View complete notifications summary"
              >
                Summary <i className="ri-arrow-right-s-line fs-14" />
              </button>
            </div>

            {/* Items List */}
            <div className="d-flex flex-column gap-1">
              {items.map((item) => {
                const hasAlert = item.count > 0;
                return (
                  <div
                    key={item.id}
                    className="d-flex align-items-center justify-content-between py-1 px-1 rounded-0 crm-notif-row"
                    style={{
                      cursor: "pointer",
                      transition: "all 0.18s ease",
                    }}
                    onClick={() => navigate(item.route)}
                    title={`${item.label}: ${item.desc}`}
                  >
                    <div className="d-flex align-items-center gap-2 overflow-hidden me-2">
                      <div
                        className="d-flex align-items-center justify-content-center flex-shrink-0"
                        style={{
                          width: "26px",
                          height: "26px",
                          borderRadius: "50%",
                          backgroundColor: item.bg,
                          color: item.color,
                          fontSize: "0.85rem",
                          border: `1px solid ${item.border}`,
                          boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                        }}
                      >
                        <i className={item.icon} />
                      </div>
                      <span
                        className="fw-medium text-truncate crm-notif-label"
                        style={{ fontSize: "0.78rem" }}
                      >
                        {item.label}
                      </span>
                    </div>

                    {/* Number Badge */}
                    <span
                      className={`fw-bold d-inline-block flex-shrink-0 text-center rounded-0 crm-notif-badge ${hasAlert ? "has-alert" : ""}`}
                      style={{
                        backgroundColor: hasAlert ? "#fef2f2" : "#f8fafc",
                        color: hasAlert ? "#991b1b" : "#64748b",
                        border: hasAlert ? "1px solid #fca5a5" : "1px solid #e2e8f0",
                        fontSize: "0.72rem",
                        minWidth: "26px",
                        height: "22px",
                        lineHeight: "20px",
                        padding: "0 5px",
                      }}
                    >
                      {hasAlert ? String(item.count).padStart(2, "0") : "0"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      {/* ─── Notification Summary Details Modal ────────────────────────────── */}
      <Modal
        isOpen={summaryOpen}
        toggle={() => setSummaryOpen(!summaryOpen)}
        centered
        style={{ maxWidth: "560px" }}
      >
        <ModalHeader
          toggle={() => setSummaryOpen(!summaryOpen)}
          className="border-bottom py-3 rounded-0"
          style={{ backgroundColor: "#f8fafc" }}
        >
          <div className="d-flex align-items-center gap-2">
            <div
              className="d-flex align-items-center justify-content-center rounded-0"
              style={{ width: "28px", height: "28px", backgroundColor: "#fef2f2", color: "#7f1d1d" }}
            >
              <i className="ri-notification-3-line fs-16" />
            </div>
            <div>
              <h5 className="modal-title fw-bold fs-15 text-dark mb-0">Notifications Summary</h5>
              <div className="text-muted fs-11">
                {totalNotifications} active alert{totalNotifications === 1 ? "" : "s"} across CRM operations
              </div>
            </div>
          </div>
        </ModalHeader>

        <ModalBody className="p-3">
          <div className="d-flex flex-column gap-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="d-flex align-items-center justify-content-between p-3 border rounded-0"
                style={{
                  backgroundColor: item.count > 0 ? "#fffafb" : "#ffffff",
                  borderColor: item.count > 0 ? item.border : "#e2e8f0",
                }}
              >
                <div className="d-flex align-items-center gap-3">
                  <div
                    className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                    style={{
                      width: "36px",
                      height: "36px",
                      backgroundColor: item.bg,
                      color: item.color,
                      fontSize: "1rem",
                      border: `1px solid ${item.border}`,
                    }}
                  >
                    <i className={item.icon} />
                  </div>
                  <div>
                    <div className="fw-semibold text-dark fs-13">{item.label}</div>
                    <div className="text-muted fs-11">{item.desc}</div>
                  </div>
                </div>

                <div className="d-flex align-items-center gap-2">
                  <Badge
                    className="rounded-0 px-2 py-1 fs-12 fw-bold"
                    style={{
                      backgroundColor: item.count > 0 ? "#fef2f2" : "#f1f5f9",
                      color: item.count > 0 ? "#991b1b" : "#64748b",
                      border: item.count > 0 ? "1px solid #fecaca" : "1px solid #cbd5e1",
                    }}
                  >
                    {item.count > 0 ? String(item.count).padStart(2, "0") : "0"}
                  </Badge>
                  <Button
                    color="light"
                    size="sm"
                    className="border rounded-0 p-1"
                    title={`Open ${item.label}`}
                    onClick={() => {
                      setSummaryOpen(false);
                      navigate(item.route);
                    }}
                  >
                    <i className="ri-arrow-right-line" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ModalBody>

        <ModalFooter className="border-top py-2 bg-light rounded-0">
          <Button
            color="light"
            size="sm"
            className="rounded-0 px-3"
            onClick={() => setSummaryOpen(false)}
          >
            Close
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
};

export default NotificationsCard;
