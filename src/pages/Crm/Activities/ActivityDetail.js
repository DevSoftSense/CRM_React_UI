import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  Col,
  Container,
  Row,
  Spinner,
} from "reactstrap";
import { Link, useNavigate, useParams } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { completeActivity, getActivityById } from "../../../helpers/crmActivityApi";
import { toastApiError, toastSuccess } from "../../../helpers/crmToast";

const formatWhen = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
};

const statusBadge = (status) => {
  const v = (status || "").toUpperCase();
  if (v === "COMPLETED") return "bg-success-subtle text-success";
  if (v === "SCHEDULED") return "bg-info-subtle text-info";
  if (v === "PENDING") return "bg-warning-subtle text-warning";
  return "bg-secondary-subtle text-body";
};

const ActivityDetail = () => {
  const { activityId } = useParams();
  const navigate = useNavigate();
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [completing, setCompleting] = useState(false);

  document.title = activity?.subject
    ? `${activity.subject} | SoftOnCloud CRM`
    : "Activity details | SoftOnCloud CRM";

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getActivityById(activityId);
      if (!data) {
        setError("Activity not found.");
        setActivity(null);
        return;
      }
      setActivity(data);
    } catch (err) {
      setError(err?.message || "Failed to load activity.");
      toastApiError(err, "Failed to load activity.");
    } finally {
      setLoading(false);
    }
  }, [activityId]);

  useEffect(() => {
    load();
  }, [load]);

  const markComplete = async () => {
    setCompleting(true);
    try {
      await completeActivity(activityId);
      toastSuccess("Activity marked completed.");
      await load();
    } catch (err) {
      toastApiError(err, "Failed to complete activity.");
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="page-content">
        <Container fluid className="text-center py-5">
          <Spinner /> Loading activity…
        </Container>
      </div>
    );
  }

  const isComplete = String(activity?.activityStatus || "").toUpperCase() === "COMPLETED";

  return (
    <div className="page-content">
      <Container fluid>
        <PageHeader
          title={activity?.subject || "Activity"}
          pageTitle="CRM / Activities"
          actions={
            <div className="d-flex gap-2">
              <Button color="light" onClick={() => navigate("/crm/activities")}>
                Back to list
              </Button>
              <Button color="light" tag={Link} to="/crm/calendar">
                Calendar
              </Button>
              {activity && !isComplete ? (
                <Button color="success" onClick={markComplete} disabled={completing}>
                  {completing ? <Spinner size="sm" className="me-1" /> : null}
                  Mark completed
                </Button>
              ) : null}
            </div>
          }
        />

        {error ? <Alert color="danger">{error}</Alert> : null}

        {activity ? (
          <Row>
            <Col lg={8}>
              <Card>
                <CardBody>
                  <h5 className="card-title mb-3">Overview</h5>
                  <Row className="g-3">
                    <Col md={6}>
                      <div className="text-muted fs-12">Type</div>
                      <div className="fw-medium">{activity.actTypeName || activity.actType || "—"}</div>
                    </Col>
                    <Col md={6}>
                      <div className="text-muted fs-12">Status</div>
                      <Badge className={statusBadge(activity.activityStatus)}>
                        {activity.activityStatusName || activity.activityStatus || "—"}
                      </Badge>
                    </Col>
                    <Col md={6}>
                      <div className="text-muted fs-12">Start</div>
                      <div className="fw-medium">{formatWhen(activity.startTime)}</div>
                    </Col>
                    <Col md={6}>
                      <div className="text-muted fs-12">End</div>
                      <div className="fw-medium">{formatWhen(activity.endTime)}</div>
                    </Col>
                    <Col md={6}>
                      <div className="text-muted fs-12">Owner</div>
                      <div className="fw-medium">{activity.ownerName || "—"}</div>
                    </Col>
                    <Col md={6}>
                      <div className="text-muted fs-12">Phone</div>
                      <div className="fw-medium">{activity.callNumber || "—"}</div>
                    </Col>
                    <Col md={6}>
                      <div className="text-muted fs-12">Duration</div>
                      <div className="fw-medium">
                        {activity.durationMinutes != null ? `${activity.durationMinutes} min` : "—"}
                      </div>
                    </Col>
                    <Col md={12}>
                      <div className="text-muted fs-12">Notes</div>
                      <div className="fw-medium" style={{ whiteSpace: "pre-wrap" }}>
                        {activity.callNotes || "—"}
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

export default ActivityDetail;
