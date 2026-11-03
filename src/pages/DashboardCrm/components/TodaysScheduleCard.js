import React from "react";
import { Card, CardBody, CardHeader, Table } from "reactstrap";
import { Link } from "react-router-dom";

const TodaysScheduleCard = ({ activities = [] }) => {
  const getStatusBadge = (status = "") => {
    const s = String(status).toUpperCase();
    if (s === "COMPLETED") {
      return (
        <span
          className="rounded-0 px-2 py-1 fw-semibold d-inline-block text-capitalize"
          style={{
            backgroundColor: "#ecfdf5",
            color: "#047857",
            border: "1px solid #a7f3d0",
            fontSize: "0.68rem",
            letterSpacing: "0.02em",
          }}
        >
          Completed
        </span>
      );
    }
    if (s === "UPCOMING") {
      return (
        <span
          className="rounded-0 px-2 py-1 fw-semibold d-inline-block text-capitalize"
          style={{
            backgroundColor: "#f1f5f9",
            color: "#334155",
            border: "1px solid #cbd5e1",
            fontSize: "0.68rem",
            letterSpacing: "0.02em",
          }}
        >
          Upcoming
        </span>
      );
    }
    if (s === "SCHEDULED") {
      return (
        <span
          className="rounded-0 px-2 py-1 fw-semibold d-inline-block text-capitalize"
          style={{
            backgroundColor: "#fef2f2",
            color: "#7f1d1d",
            border: "1px solid #fecaca",
            fontSize: "0.68rem",
            letterSpacing: "0.02em",
          }}
        >
          Scheduled
        </span>
      );
    }
    return (
      <span
        className="rounded-0 px-2 py-1 fw-semibold d-inline-block text-capitalize"
        style={{
          backgroundColor: "#fffbeb",
          color: "#b45309",
          border: "1px solid #fde68a",
          fontSize: "0.68rem",
          letterSpacing: "0.02em",
        }}
      >
        Pending
      </span>
    );
  };

  return (
    <Card className="crm-card-3d crm-accent-amber h-100">
      <CardHeader
        className="bg-transparent border-bottom p-3 d-flex align-items-center justify-content-between"
        style={{ borderColor: "#f1f5f9" }}
      >
        <div className="d-flex align-items-center">
          <i className="ri-calendar-todo-line me-2" style={{ color: "#d97706", fontSize: "1.05rem" }} />
          <h5 className="card-title mb-0 fw-semibold" style={{ fontSize: "0.9375rem", color: "#1e293b" }}>
            Today&apos;s Schedule
          </h5>
        </div>
        <Link
          to="/crm/calendar"
          className="text-decoration-none fw-medium"
          style={{ fontSize: "0.75rem", color: "#7f1d1d" }}
        >
          View Calendar <i className="ri-arrow-right-s-line align-middle" />
        </Link>
      </CardHeader>
      <CardBody className="p-0">
        <div className="table-responsive crm-custom-scroll" style={{ maxHeight: "250px", overflowY: "auto" }}>
          <Table className="align-middle table-nowrap mb-0 table-hover">
            <thead className="table-light">
              <tr style={{ fontSize: "0.72rem", color: "#64748b" }}>
                <th scope="col" className="ps-3">Time</th>
                <th scope="col">Customer</th>
                <th scope="col">Activity</th>
                <th scope="col" className="pe-3 text-end">Status</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: "0.785rem" }}>
              {activities.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-4 text-muted">
                    <i className="ri-calendar-check-line d-block fs-3 mb-1" style={{ color: "#94a3b8" }} />
                    No meetings or calls scheduled for today.
                  </td>
                </tr>
              ) : (
                activities.map((a, idx) => (
                  <tr key={a.activity_id || idx} className="crm-table-hover-row">
                    <td className="ps-3 fw-medium text-dark">{a.time_label || "--:--"}</td>
                    <td className="text-truncate" style={{ maxWidth: "110px" }} title={a.customer_name}>
                      <span className="fw-semibold text-dark">{a.customer_name}</span>
                    </td>
                    <td>
                      <span className="text-muted text-capitalize">{a.activity_type || "Activity"}</span>
                    </td>
                    <td className="pe-3 text-end">{getStatusBadge(a.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>
      </CardBody>
    </Card>
  );
};

export default TodaysScheduleCard;
