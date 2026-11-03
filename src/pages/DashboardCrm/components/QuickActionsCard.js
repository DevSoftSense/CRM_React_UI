import React from "react";
import { Card, CardBody, CardHeader, Row, Col } from "reactstrap";
import { useNavigate } from "react-router-dom";

const QuickActionsCard = ({ actions = [] }) => {
  const navigate = useNavigate();

  const defaultActions = [
    { id: "new_lead", label: "New Lead", icon: "ri-user-add-line", color: "#7f1d1d", route: "/crm/leads" },
    { id: "call_customer", label: "Call Customer", icon: "ri-phone-line", color: "#475569", route: "/crm/activities" },
    { id: "schedule_meeting", label: "Schedule Meeting", icon: "ri-calendar-event-line", color: "#d97706", route: "/crm/calendar" },
    { id: "create_quotation", label: "Create Deal", icon: "ri-file-text-line", color: "#7f1d1d", route: "/crm/opportunities" },
    { id: "add_customer", label: "New Customer", icon: "ri-building-line", color: "#059669", route: "/crm/customers" },
    { id: "add_activity", label: "Add Activity", icon: "ri-calendar-todo-line", color: "#b45309", route: "/crm/activities" },
    { id: "add_task", label: "Add Task", icon: "ri-checkbox-line", color: "#475569", route: "/crm/tasks" },
    { id: "upload_doc", label: "Upload Document", icon: "ri-upload-cloud-line", color: "#b91c1c", route: "/crm/documents" },
  ];

  const list = actions.length > 0 ? actions : defaultActions;

  return (
    <Card className="crm-card-3d crm-accent-maroon h-100">
      <CardHeader
        className="bg-transparent border-bottom p-3 d-flex align-items-center justify-content-between"
        style={{ borderColor: "#f1f5f9" }}
      >
        <div className="d-flex align-items-center">
          <i className="ri-flashlight-line me-2" style={{ color: "#7f1d1d", fontSize: "1.05rem" }} />
          <h5 className="card-title mb-0 fw-semibold" style={{ fontSize: "0.9375rem", color: "#1e293b" }}>
            Quick Actions
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
          Shortcuts
        </span>
      </CardHeader>
      <CardBody className="p-3">
        <Row className="g-2">
          {list.map((act, idx) => (
            <Col xs={6} sm={3} key={act.id || act.code || idx}>
              <button
                type="button"
                className="crm-action-tile-3d"
                onClick={() => {
                  if (act.route) navigate(act.route);
                }}
              >
                <div
                  className="crm-action-icon-box"
                  style={{
                    backgroundColor: `${act.color}15`,
                    color: act.color,
                    boxShadow: `0 2px 8px ${act.color}20`,
                  }}
                >
                  <i className={act.icon} />
                </div>
                <span
                  className="text-truncate w-100 text-dark fw-semibold"
                  style={{ fontSize: "0.72rem" }}
                  title={act.label}
                >
                  {act.label}
                </span>
              </button>
            </Col>
          ))}
        </Row>
      </CardBody>
    </Card>
  );
};

export default QuickActionsCard;
