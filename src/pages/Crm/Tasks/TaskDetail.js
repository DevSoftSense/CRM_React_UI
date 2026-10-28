import React, { useCallback, useEffect, useState } from "react";
import { Alert, Badge, Button, Card, CardBody, Col, Container, Row, Spinner } from "reactstrap";
import { useNavigate, useParams } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { completeTask, getTaskById } from "../../../helpers/crmTaskApi";
import { toastApiError, toastSuccess } from "../../../helpers/crmToast";

const statusBadge = (status) => {
  const v = (status || "").toUpperCase();
  if (v === "COMPLETED") return "bg-success-subtle text-success";
  if (v === "OVERDUE") return "bg-danger-subtle text-danger";
  if (v === "IN_PROGRESS") return "bg-info-subtle text-info";
  return "bg-warning-subtle text-warning";
};

const TaskDetail = () => {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [completing, setCompleting] = useState(false);

  document.title = task?.title ? `${task.title} | SoftOnCloud CRM` : "Task details | SoftOnCloud CRM";

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
      toastSuccess("Task marked completed.");
      await load();
    } catch (err) {
      toastApiError(err, "Failed to complete task.");
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="page-content">
        <Container fluid className="text-center py-5">
          <Spinner /> Loading task…
        </Container>
      </div>
    );
  }

  const isComplete = String(task?.taskStatus || "").toUpperCase() === "COMPLETED";

  return (
    <div className="page-content">
      <Container fluid>
        <PageHeader
          title={task?.title || "Task"}
          pageTitle="CRM / Tasks"
          actions={
            <div className="d-flex gap-2">
              <Button color="light" onClick={() => navigate("/crm/tasks")}>
                Back to list
              </Button>
              {task && !isComplete ? (
                <Button color="success" onClick={markComplete} disabled={completing}>
                  {completing ? <Spinner size="sm" className="me-1" /> : null}
                  Mark completed
                </Button>
              ) : null}
            </div>
          }
        />

        {error ? <Alert color="danger">{error}</Alert> : null}

        {task ? (
          <Row>
            <Col lg={8}>
              <Card>
                <CardBody>
                  <h5 className="card-title mb-3">Overview</h5>
                  <Row className="g-3">
                    <Col md={6}>
                      <div className="text-muted fs-12">Code</div>
                      <div className="fw-medium">{task.taskCode || "—"}</div>
                    </Col>
                    <Col md={6}>
                      <div className="text-muted fs-12">Status</div>
                      <Badge className={statusBadge(task.taskStatus)}>
                        {task.taskStatusName || task.taskStatus || "—"}
                      </Badge>
                    </Col>
                    <Col md={6}>
                      <div className="text-muted fs-12">Type</div>
                      <div className="fw-medium">{task.taskTypeName || task.taskType || "—"}</div>
                    </Col>
                    <Col md={6}>
                      <div className="text-muted fs-12">Priority</div>
                      <div className="fw-medium">{task.priorityName || task.priority || "—"}</div>
                    </Col>
                    <Col md={6}>
                      <div className="text-muted fs-12">Due</div>
                      <div className="fw-medium">{task.dueDate || "—"}</div>
                    </Col>
                    <Col md={6}>
                      <div className="text-muted fs-12">Owner</div>
                      <div className="fw-medium">{task.ownerName || "—"}</div>
                    </Col>
                    <Col md={12}>
                      <div className="text-muted fs-12">Notes</div>
                      <div className="fw-medium" style={{ whiteSpace: "pre-wrap" }}>
                        {task.notes || "—"}
                      </div>
                    </Col>
                  </Row>
                </CardBody>
              </Card>
            </Col>
          </Row>
        ) : null}
      </Container>
    </div>
  );
};

export default TaskDetail;
