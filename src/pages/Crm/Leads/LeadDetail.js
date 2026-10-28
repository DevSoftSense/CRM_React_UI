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
import { getLeadById } from "../../../helpers/crmLeadApi";
import { toastApiError } from "../../../helpers/crmToast";

const LeadDetail = () => {
  const { leadId } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  document.title = lead?.leadName
    ? `${lead.leadName} | SoftOnCloud CRM`
    : "Lead details | SoftOnCloud CRM";

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getLeadById(leadId);
      if (!data) {
        setError("Lead not found.");
        setLead(null);
        return;
      }
      setLead(data);
    } catch (err) {
      setError(err?.message || "Failed to load lead.");
      toastApiError(err, "Failed to load lead.");
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="page-content">
        <Container fluid className="text-center py-5">
          <Spinner /> Loading lead…
        </Container>
      </div>
    );
  }

  return (
    <div className="page-content">
      <Container fluid>
        <PageHeader
          title={lead?.leadName || "Lead"}
          pageTitle="CRM / Leads"
          description="Lead profile — same SoftOnCloud tenant as list (org + CRM app)."
          actions={
            <div className="d-flex gap-2">
              <Button color="light" onClick={() => navigate("/crm/leads")}>
                Back to list
              </Button>
              <Button color="primary" tag={Link} to="/crm/leads">
                Manage leads
              </Button>
            </div>
          }
        />

        {error ? <Alert color="danger">{error}</Alert> : null}

        {lead ? (
          <Row>
            <Col lg={8}>
              <Card>
                <CardBody>
                  <h5 className="card-title mb-3">Overview</h5>
                  <Row className="g-3">
                    <Col md={6}>
                      <div className="text-muted fs-12">Company</div>
                      <div className="fw-medium">{lead.companyName || "—"}</div>
                    </Col>
                    <Col md={6}>
                      <div className="text-muted fs-12">Designation</div>
                      <div className="fw-medium">{lead.designation || "—"}</div>
                    </Col>
                    <Col md={6}>
                      <div className="text-muted fs-12">Mobile</div>
                      <div className="fw-medium">{lead.mobile || "—"}</div>
                    </Col>
                    <Col md={6}>
                      <div className="text-muted fs-12">Email</div>
                      <div className="fw-medium">{lead.email || "—"}</div>
                    </Col>
                    <Col md={6}>
                      <div className="text-muted fs-12">Phone</div>
                      <div className="fw-medium">{lead.phone || "—"}</div>
                    </Col>
                    <Col md={6}>
                      <div className="text-muted fs-12">Website</div>
                      <div className="fw-medium">{lead.website || "—"}</div>
                    </Col>
                    <Col md={6}>
                      <div className="text-muted fs-12">Industry</div>
                      <div className="fw-medium">{lead.industry || "—"}</div>
                    </Col>
                    <Col md={6}>
                      <div className="text-muted fs-12">Expected close</div>
                      <div className="fw-medium">
                        {lead.expectedCloseDate
                          ? String(lead.expectedCloseDate).slice(0, 10)
                          : "—"}
                      </div>
                    </Col>
                    <Col xs={12}>
                      <div className="text-muted fs-12">Description</div>
                      <div className="fw-medium">{lead.description || "—"}</div>
                    </Col>
                  </Row>
                </CardBody>
              </Card>
            </Col>
            <Col lg={4}>
              <Card>
                <CardBody>
                  <h5 className="card-title mb-3">Pipeline fields</h5>
                  <div className="mb-3">
                    <div className="text-muted fs-12">Status</div>
                    <Badge className="bg-primary-subtle text-primary">
                      {lead.statusName || lead.statusId || "—"}
                    </Badge>
                  </div>
                  <div className="mb-3">
                    <div className="text-muted fs-12">Source</div>
                    <div className="fw-medium">{lead.sourceName || "—"}</div>
                  </div>
                  <div className="mb-3">
                    <div className="text-muted fs-12">Rating</div>
                    <div className="fw-medium">{lead.ratingName || "—"}</div>
                  </div>
                  <div className="mb-3">
                    <div className="text-muted fs-12">Estimated value</div>
                    <div className="fw-medium">
                      {lead.estimatedValue != null
                        ? `${lead.currencyCode || "INR"} ${lead.estimatedValue}`
                        : "—"}
                    </div>
                  </div>
                  <div className="mb-0 text-muted fs-12">
                    Org {lead.orgId} · App {lead.appId} · Lead #{lead.leadId}
                  </div>
                </CardBody>
              </Card>
            </Col>
          </Row>
        ) : null}
      </Container>
    </div>
  );
};

export default LeadDetail;
