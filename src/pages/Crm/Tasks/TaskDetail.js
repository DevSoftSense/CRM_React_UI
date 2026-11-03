import React, { useCallback, useEffect, useState } from "react";
import { Alert, Badge, Button, Card, CardBody, CardHeader, Col, Container, Row, Spinner } from "reactstrap";
import { useNavigate, useParams, Link } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { completeTask, getTaskById } from "../../../helpers/crmTaskApi";
import { toastApiError, toastSuccess } from "../../../helpers/crmToast";

const getStatusBadge = (status) => {
  const v = (status || "").toUpperCase();
  if (v === "COMPLETED") {
    return (
      <span
        className="rounded-0 px-2 py-1 fw-semibold d-inline-block"
        style={{ backgroundColor: "#ecfdf5", color: "#047857", border: "1px solid #a7f3d0", fontSize: "0.72rem" }}
      >
        <i className="ri-checkbox-circle-line me-1 align-middle" />
        Completed
      </span>
    );
  }
  if (v === "OVERDUE") {
    return (
      <span
        className="rounded-0 px-2 py-1 fw-semibold d-inline-block"
        style={{ backgroundColor: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca", fontSize: "0.72rem" }}
      >
        <i className="ri-error-warning-line me-1 align-middle" />
        Overdue
      </span>
    );
  }
  if (v === "IN_PROGRESS" || v === "IN_PROGRES") {
    return (
      <span
        className="rounded-0 px-2 py-1 fw-semibold d-inline-block"
        style={{ backgroundColor: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", fontSize: "0.72rem" }}
      >
        <i className="ri-loader-4-line me-1 align-middle" />
        In Progress
      </span>
    );
  }
  return (
    <span
      className="rounded-0 px-2 py-1 fw-semibold d-inline-block"
      style={{ backgroundColor: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0", fontSize: "0.72rem" }}
    >
      <i className="ri-time-line me-1 align-middle" />
      To Do
    </span>
  );
};

const getPriorityBadge = (priority) => {
  const p = (priority || "").toUpperCase();
  if (p === "HIGH" || p === "URGENT") {
    return (
      <span
        className="rounded-0 px-2 py-1 fw-semibold d-inline-block"
        style={{ backgroundColor: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca", fontSize: "0.72rem" }}
      >
        High
      </span>
    );
  }
  if (p === "MEDIUM") {
    return (
      <span
        className="rounded-0 px-2 py-1 fw-semibold d-inline-block"
        style={{ backgroundColor: "#fffbeb", color: "#b45309", border: "1px solid #fde68a", fontSize: "0.72rem" }}
      >
        Medium
      </span>
    );
  }
  return (
    <span
      className="rounded-0 px-2 py-1 fw-semibold d-inline-block"
      style={{ backgroundColor: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0", fontSize: "0.72rem" }}
    >
      Low
    </span>
  );
};

const TaskDetail = () => {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [completing, setCompleting] = useState(false);

  document.title = task?.title ? `${task.title} | SoftOnCloud CRM` : "Task Details | SoftOnCloud CRM";

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getTaskById(taskId);
      if (!data) {
        setError("Task not found.");
        setTask(null);
        return;
      }
      setTask(data);
    } catch (err) {
      setError(err?.message || "Failed to load task.");
      toastApiError(err, "Failed to load task.");
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    load();
  }, [load]);

  const markComplete = async () => {
    setCompleting(true);
    try {
      await completeTask(taskId);
      toastSuccess("Task marked completed successfully.");
      await load();
    } catch (err) {
      toastApiError(err, "Failed to complete task.");
    } finally {
      setCompleting(false);
    }
  };

  const handleCall = () => {
    const phone = task?.contactPersonPhone || task?.phone || "";
    if (phone) {
      window.open(`tel:${phone}`);
    } else {
      alert(`No direct phone registered for ${task?.company || "this customer"}.`);
    }
  };

  const handleWhatsApp = () => {
    const phone = (task?.contactPersonPhone || task?.phone || "").replace(/[^0-9]/g, "");
    if (phone) {
      window.open(`https://wa.me/${phone}`, "_blank");
    } else {
      alert(`No WhatsApp number registered for ${task?.company || "this customer"}.`);
    }
  };

  const handleEmail = () => {
    const email = task?.email || "";
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(`Follow-up: ${task?.title || "CRM Task"}`)}`;
  };

  if (loading) {
    return (
      <div className="page-content">
        <Container fluid className="text-center py-5">
          <Spinner style={{ color: "#7f1d1d" }} />
          <p className="text-muted mt-2">Loading task details...</p>
        </Container>
      </div>
    );
  }

  const isComplete = String(task?.taskStatus || "").toUpperCase() === "COMPLETED";

  return (
    <div className="page-content">
      <Container fluid>
        <PageHeader
          title={task?.title || "Task Details"}
          pageTitle="CRM / Tasks"
          description={
            task
              ? `Task Code: ${task.taskCode || "—"} • Linked Customer: ${task.company || "General Client"}`
              : "Review task details and update status"
          }
          actions={
            <div className="d-flex align-items-center gap-2">
              <Button
                color="light"
                className="rounded-0 border d-inline-flex align-items-center"
                onClick={() => navigate(-1)}
                title="Go back to previous page"
              >
                <i className="ri-arrow-left-line me-1" />
                Back
              </Button>
              {task && !isComplete && (
                <Button
                  color="success"
                  className="rounded-0 d-inline-flex align-items-center"
                  style={{ backgroundColor: "#059669", borderColor: "#059669" }}
                  onClick={markComplete}
                  disabled={completing}
                >
                  {completing ? (
                    <Spinner size="sm" className="me-1" />
                  ) : (
                    <i className="ri-checkbox-circle-line me-1" />
                  )}
                  Mark Completed
                </Button>
              )}
            </div>
          }
        />

        {error && <Alert color="danger" className="rounded-0">{error}</Alert>}

        {task && (
          <Row className="g-3">
            {/* Left Column (8 cols): Task Details & History */}
            <Col lg={8} md={12}>
              {/* Card 1: Task Specifications */}
              <Card className="rounded-0 border shadow-sm mb-3" style={{ borderTop: "3.5px solid #7f1d1d" }}>
                <CardHeader className="bg-transparent border-bottom p-3 d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center">
                    <i className="ri-task-line me-2" style={{ color: "#7f1d1d", fontSize: "1.05rem" }} />
                    <h5 className="card-title mb-0 fw-semibold" style={{ fontSize: "0.9375rem", color: "#1e293b" }}>
                      Task Overview
                    </h5>
                  </div>
                  <span
                    className="rounded-0 px-2 py-1 fw-bold text-monospace"
                    style={{ backgroundColor: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0", fontSize: "0.75rem" }}
                  >
                    {task.taskCode || "TSK-CRM"}
                  </span>
                </CardHeader>
                <CardBody className="p-3">
                  <Row className="g-3">
                    <Col md={4} sm={6}>
                      <div className="text-muted text-uppercase fw-semibold" style={{ fontSize: "0.6875rem", letterSpacing: "0.03em" }}>
                        Task Title
                      </div>
                      <div className="fw-bold text-dark mt-1" style={{ fontSize: "0.9rem" }}>
                        {task.title || "—"}
                      </div>
                    </Col>

                    <Col md={4} sm={6}>
                      <div className="text-muted text-uppercase fw-semibold" style={{ fontSize: "0.6875rem", letterSpacing: "0.03em" }}>
                        Status
                      </div>
                      <div className="mt-1">{getStatusBadge(task.taskStatus)}</div>
                    </Col>

                    <Col md={4} sm={6}>
                      <div className="text-muted text-uppercase fw-semibold" style={{ fontSize: "0.6875rem", letterSpacing: "0.03em" }}>
                        Priority
                      </div>
                      <div className="mt-1">{getPriorityBadge(task.priority)}</div>
                    </Col>

                    <Col md={4} sm={6}>
                      <div className="text-muted text-uppercase fw-semibold" style={{ fontSize: "0.6875rem", letterSpacing: "0.03em" }}>
                        Task Type
                      </div>
                      <div className="fw-semibold text-dark mt-1 d-flex align-items-center" style={{ fontSize: "0.85rem" }}>
                        <i className="ri-calendar-event-line me-1 text-muted" />
                        {task.taskTypeName || task.taskType || "Follow-up"}
                      </div>
                    </Col>

                    <Col md={4} sm={6}>
                      <div className="text-muted text-uppercase fw-semibold" style={{ fontSize: "0.6875rem", letterSpacing: "0.03em" }}>
                        Due Date
                      </div>
                      <div
                        className={`fw-semibold mt-1 ${task.isOverdue ? "text-danger" : "text-dark"}`}
                        style={{ fontSize: "0.85rem" }}
                      >
                        <i className="ri-time-line me-1 align-middle" />
                        {task.dueDate || "—"} {task.isOverdue && <span className="badge bg-danger-subtle text-danger ms-1">Overdue</span>}
                      </div>
                    </Col>

                    <Col md={4} sm={6}>
                      <div className="text-muted text-uppercase fw-semibold" style={{ fontSize: "0.6875rem", letterSpacing: "0.03em" }}>
                        Start Date
                      </div>
                      <div className="fw-semibold text-dark mt-1" style={{ fontSize: "0.85rem" }}>
                        {task.startDate || "—"}
                      </div>
                    </Col>

                    <Col md={6} sm={12}>
                      <div className="text-muted text-uppercase fw-semibold" style={{ fontSize: "0.6875rem", letterSpacing: "0.03em" }}>
                        Assigned Owner
                      </div>
                      <div className="fw-semibold text-dark mt-1 d-flex align-items-center" style={{ fontSize: "0.85rem" }}>
                        <div
                          className="rounded-circle bg-light d-flex align-items-center justify-content-center me-2 border text-muted fw-bold"
                          style={{ width: "28px", height: "28px", fontSize: "0.75rem" }}
                        >
                          {(task.ownerName || "U").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div>{task.ownerName || "Unassigned"}</div>
                          {task.username && (
                            <small className="text-muted d-block" style={{ fontSize: "0.72rem" }}>
                              {task.username}
                            </small>
                          )}
                        </div>
                      </div>
                    </Col>

                    <Col md={6} sm={12}>
                      <div className="text-muted text-uppercase fw-semibold" style={{ fontSize: "0.6875rem", letterSpacing: "0.03em" }}>
                        Customer / Company
                      </div>
                      <div className="fw-bold text-dark mt-1 d-flex align-items-center" style={{ fontSize: "0.875rem" }}>
                        <i className="ri-building-line me-1 text-primary" />
                        {task.company || "General Client"}
                      </div>
                    </Col>

                    <Col md={12}>
                      <div className="text-muted text-uppercase fw-semibold mb-1" style={{ fontSize: "0.6875rem", letterSpacing: "0.03em" }}>
                        Notes & Follow-up Agenda
                      </div>
                      <div
                        className="p-3 border rounded-0 bg-light"
                        style={{ whiteSpace: "pre-wrap", fontSize: "0.85rem", color: "#334155", lineHeight: 1.6 }}
                      >
                        {task.notes || "No notes provided for this task."}
                      </div>
                    </Col>
                  </Row>
                </CardBody>
              </Card>

              {/* Card 2: Status & Audit History Timeline */}
              <Card className="rounded-0 border shadow-sm">
                <CardHeader className="bg-transparent border-bottom p-3 d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center">
                    <i className="ri-history-line me-2 text-muted" style={{ fontSize: "1.05rem" }} />
                    <h5 className="card-title mb-0 fw-semibold" style={{ fontSize: "0.9375rem", color: "#1e293b" }}>
                      Status & Audit Timeline
                    </h5>
                  </div>
                  <span className="badge bg-light text-muted border rounded-0">
                    {task.history?.length || 0} Events
                  </span>
                </CardHeader>
                <CardBody className="p-3">
                  {!task.history || task.history.length === 0 ? (
                    <div className="text-muted text-center py-3" style={{ fontSize: "0.8125rem" }}>
                      No previous activity recorded.
                    </div>
                  ) : (
                    <div className="timeline-2">
                      {task.history.map((h, i) => (
                        <div key={h.tranId || i} className="d-flex align-items-start mb-3">
                          <div
                            className="rounded-circle d-flex align-items-center justify-content-center me-3 border"
                            style={{
                              width: "28px",
                              height: "28px",
                              backgroundColor: h.status === "COMPLETED" ? "#ecfdf5" : "#f1f5f9",
                              color: h.status === "COMPLETED" ? "#047857" : "#475569",
                              flexShrink: 0,
                            }}
                          >
                            <i
                              className={h.status === "COMPLETED" ? "ri-check-line" : "ri-git-commit-line"}
                              style={{ fontSize: "0.8rem" }}
                            />
                          </div>
                          <div className="flex-grow-1">
                            <div className="d-flex align-items-center justify-content-between">
                              <span className="fw-semibold text-dark" style={{ fontSize: "0.8125rem" }}>
                                {h.remarks || "Status updated"}
                              </span>
                              <small className="text-muted" style={{ fontSize: "0.72rem" }}>
                                {h.dateTime ? new Date(h.dateTime).toLocaleString() : "—"}
                              </small>
                            </div>
                            <div className="mt-1">
                              <span
                                className="badge rounded-0"
                                style={{ backgroundColor: "#f1f5f9", color: "#334155", fontSize: "0.68rem" }}
                              >
                                {h.status || "TO_DO"}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardBody>
              </Card>
            </Col>

            {/* Right Column (4 cols): Customer Context & Quick Actions */}
            <Col lg={4} md={12}>
              {/* Customer & Contact Person Card */}
              <Card className="rounded-0 border shadow-sm mb-3" style={{ borderTop: "3.5px solid #059669" }}>
                <CardHeader className="bg-transparent border-bottom p-3">
                  <div className="d-flex align-items-center">
                    <i className="ri-building-line me-2" style={{ color: "#059669", fontSize: "1.05rem" }} />
                    <h5 className="card-title mb-0 fw-semibold" style={{ fontSize: "0.9375rem", color: "#1e293b" }}>
                      Customer & Contact
                    </h5>
                  </div>
                </CardHeader>
                <CardBody className="p-3">
                  <div className="mb-3">
                    <div className="text-muted text-uppercase fw-semibold" style={{ fontSize: "0.6875rem" }}>
                      Customer Company
                    </div>
                    <div className="fw-bold text-dark mt-1" style={{ fontSize: "1rem" }}>
                      {task.company || "General Client"}
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="text-muted text-uppercase fw-semibold" style={{ fontSize: "0.6875rem" }}>
                      Contact Person
                    </div>
                    <div className="fw-semibold text-dark mt-1 d-flex align-items-center" style={{ fontSize: "0.875rem" }}>
                      <i className="ri-user-line me-1 text-muted" />
                      {task.contactPerson || "Not specified"}
                    </div>
                  </div>

                  <hr style={{ borderColor: "#f1f5f9" }} />

                  {/* Quick Action Contact Buttons */}
                  <div className="d-flex flex-column gap-2">
                    <Button
                      color="light"
                      className="rounded-0 border text-start d-flex align-items-center justify-content-between p-2"
                      onClick={handleCall}
                    >
                      <span className="d-flex align-items-center">
                        <i className="ri-phone-line me-2 text-danger" />
                        Call Customer
                      </span>
                      <i className="ri-arrow-right-s-line text-muted" />
                    </Button>

                    <Button
                      color="light"
                      className="rounded-0 border text-start d-flex align-items-center justify-content-between p-2"
                      onClick={handleWhatsApp}
                    >
                      <span className="d-flex align-items-center">
                        <i className="ri-whatsapp-line me-2 text-success" />
                        Send WhatsApp
                      </span>
                      <i className="ri-arrow-right-s-line text-muted" />
                    </Button>

                    <Button
                      color="light"
                      className="rounded-0 border text-start d-flex align-items-center justify-content-between p-2"
                      onClick={handleEmail}
                    >
                      <span className="d-flex align-items-center">
                        <i className="ri-mail-line me-2 text-primary" />
                        Send Email
                      </span>
                      <i className="ri-arrow-right-s-line text-muted" />
                    </Button>
                  </div>
                </CardBody>
              </Card>

              {/* Navigation Shortcuts Card */}
              <Card className="rounded-0 border shadow-sm">
                <CardHeader className="bg-transparent border-bottom p-3">
                  <div className="d-flex align-items-center">
                    <i className="ri-compass-3-line me-2" style={{ color: "#d97706", fontSize: "1.05rem" }} />
                    <h5 className="card-title mb-0 fw-semibold" style={{ fontSize: "0.9375rem", color: "#1e293b" }}>
                      CRM Navigation
                    </h5>
                  </div>
                </CardHeader>
                <CardBody className="p-3">
                  <div className="d-flex flex-column gap-2">
                    <Link
                      to="/crm/dashboard"
                      className="btn btn-light rounded-0 border text-start d-flex align-items-center justify-content-between p-2 text-dark"
                    >
                      <span className="d-flex align-items-center">
                        <i className="ri-dashboard-line me-2 text-danger" />
                        CRM Unified Dashboard
                      </span>
                      <i className="ri-arrow-right-s-line text-muted" />
                    </Link>

                    <Link
                      to="/crm/tasks"
                      className="btn btn-light rounded-0 border text-start d-flex align-items-center justify-content-between p-2 text-dark"
                    >
                      <span className="d-flex align-items-center">
                        <i className="ri-list-check-2 me-2 text-primary" />
                        Tasks Management
                      </span>
                      <i className="ri-arrow-right-s-line text-muted" />
                    </Link>

                    <Link
                      to="/crm/calendar"
                      className="btn btn-light rounded-0 border text-start d-flex align-items-center justify-content-between p-2 text-dark"
                    >
                      <span className="d-flex align-items-center">
                        <i className="ri-calendar-line me-2 text-warning" />
                        Activity Calendar
                      </span>
                      <i className="ri-arrow-right-s-line text-muted" />
                    </Link>
                  </div>
                </CardBody>
              </Card>
            </Col>
          </Row>
        )}
      </Container>
    </div>
  );
};

export default TaskDetail;
