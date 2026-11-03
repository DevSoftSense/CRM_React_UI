import React from "react";
import { Card, CardBody, CardHeader } from "reactstrap";

const NotificationsCard = ({ notifications = {} }) => {
  const items = [
    {
      id: "todays_birthdays",
      label: "Today's Birthdays",
      count: notifications?.todays_birthdays || 0,
      icon: "ri-cake-2-line",
      color: "#7f1d1d",
      bg: "#fef2f2",
      border: "#fecaca",
    },
    {
      id: "pending_quotations",
      label: "Pending Quotations",
      count: notifications?.pending_quotations || 0,
      icon: "ri-file-text-line",
      color: "#d97706",
      bg: "#fffbeb",
      border: "#fde68a",
    },
    {
      id: "approval_pending",
      label: "Approval Pending",
      count: notifications?.approval_pending || 0,
      icon: "ri-time-line",
      color: "#b45309",
      bg: "#fff7ed",
      border: "#fed7aa",
    },
    {
      id: "high_priority_customers",
      label: "High Priority Customers",
      count: notifications?.high_priority_customers || 0,
      icon: "ri-vip-crown-line",
      color: "#991b1b",
      bg: "#fef2f2",
      border: "#fecaca",
    },
    {
      id: "overdue_payments",
      label: "Overdue Follow-ups",
      count: notifications?.overdue_payments || 0,
      icon: "ri-alarm-warning-line",
      color: "#dc2626",
      bg: "#fee2e2",
      border: "#fca5a5",
    },
    {
      id: "new_website_leads",
      label: "New Website Leads",
      count: notifications?.new_website_leads || 0,
      icon: "ri-global-line",
      color: "#059669",
      bg: "#ecfdf5",
      border: "#a7f3d0",
    },
  ];

  return (
    <Card className="crm-card-3d crm-accent-slate h-100">
      <CardHeader
        className="bg-transparent border-bottom p-3 d-flex align-items-center justify-content-between"
        style={{ borderColor: "#f1f5f9" }}
      >
        <div className="d-flex align-items-center">
          <i className="ri-notification-3-line me-2" style={{ color: "#475569", fontSize: "1.05rem" }} />
          <h5 className="card-title mb-0 fw-semibold" style={{ fontSize: "0.9375rem", color: "#1e293b" }}>
            Notifications
          </h5>
        </div>
        <span
          className="rounded-0 px-2 py-1 fw-semibold"
          style={{
            backgroundColor: "#f8fafc",
            color: "#64748b",
            border: "1px solid #e2e8f0",
            fontSize: "0.72rem",
            boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
          }}
        >
          Summary
        </span>
      </CardHeader>
      <CardBody className="p-3">
        <div className="d-flex flex-column gap-2 crm-custom-scroll" style={{ maxHeight: "250px", overflowY: "auto" }}>
          {items.map((item, idx) => (
            <div
              key={item.id || idx}
              className="crm-notif-item-3d d-flex align-items-center justify-content-between p-2 rounded-0"
            >
              <div className="d-flex align-items-center">
                <div
                  className="d-flex align-items-center justify-content-center me-2"
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    backgroundColor: item.bg,
                    color: item.color,
                    fontSize: "0.9rem",
                    border: `1px solid ${item.border}`,
                    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                  }}
                >
                  <i className={item.icon} />
                </div>
                <span className="text-secondary fw-medium" style={{ fontSize: "0.8125rem" }}>
                  {item.label}
                </span>
              </div>

              <span
                className="rounded-0 px-2 py-1 fw-bold d-inline-block"
                style={{
                  backgroundColor: item.count > 0 ? item.bg : "#f8fafc",
                  color: item.count > 0 ? item.color : "#94a3b8",
                  border: item.count > 0 ? `1px solid ${item.border}` : "1px solid #e2e8f0",
                  fontSize: "0.75rem",
                  minWidth: "28px",
                  textAlign: "center",
                  boxShadow: item.count > 0 ? "0 1px 2px rgba(0,0,0,0.04)" : "none",
                }}
              >
                {item.count > 0 ? String(item.count).padStart(2, "0") : "0"}
              </span>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
};

export default NotificationsCard;
