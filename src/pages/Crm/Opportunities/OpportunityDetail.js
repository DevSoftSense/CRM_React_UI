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
import { getOpportunityById } from "../../../helpers/crmOpportunityApi";
import { toastApiError } from "../../../helpers/crmToast";

const OpportunityDetail = () => {
  const { opportunityId } = useParams();
  const navigate = useNavigate();
  const [opp, setOpp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  document.title = opp?.name
    ? `${opp.name} | SoftOnCloud CRM`
    : "Opportunity details | SoftOnCloud CRM";

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getOpportunityById(opportunityId);
      if (!data) {
        setError("Opportunity not found.");
        setOpp(null);
        return;
      }
      setOpp(data);
    } catch (err) {
      setError(err?.message || "Failed to load opportunity.");
      toastApiError(err, "Failed to load opportunity.");
    } finally {
      setLoading(false);
    }
  }, [opportunityId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="page-content">
        <Container fluid className="text-center py-5">
          <Spinner /> Loading opportunity…
        </Container>
      </div>
    );
  }

  return (
    <div className="page-content">
      <Container fluid>
        <PageHeader
          title={opp?.name || "Opportunity"}
          pageTitle="CRM / Opportunities"
          description="Deal profile — tenant filtered by org + CRM app."
          actions={
            <div className="d-flex gap-2">
              <Button color="light" onClick={() => navigate("/crm/opportunities")}>
                Back to list
              </Button>
              <Button color="primary" tag={Link} to="/crm/opportunities">
                Manage opportunities
              </Button>
            </div>
          }
        />

        {error ? <Alert color="danger">{error}</Alert> : null}

        {opp ? (
          <Row>
            <Col lg={8}>
              <Card>
                <CardBody>
                  <h5 className="card-title mb-3">Overview</h5>
                  <Row className="g-3">
                    <Col md={6}>
                      <div className="text-muted fs-12">Customer</div>
                      <div className="fw-medium">
                        {opp.accountName || "—"}{" "}
                        <span className="text-muted fs-12">#{opp.accountId}</span>
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="text-muted fs-12">Primary contact ID</div>
                      <div className="fw-medium">{opp.primaryContactId || "—"}</div>
                    </Col>
                    <Col md={6}>
                      <div className="text-muted fs-12">Amount</div>
                      <div className="fw-medium">
                        {opp.currencyCode || "INR"} {opp.amount}
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="text-muted fs-12">Probability / Weighted</div>
                      <div className="fw-medium">
                        {opp.probability}% · {opp.currencyCode || "INR"}{" "}
                        {opp.weightedAmount != null ? opp.weightedAmount : "—"}
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="text-muted fs-12">Expected close</div>
                      <div className="fw-medium">
                        {opp.expectedCloseDate
                          ? String(opp.expectedCloseDate).slice(0, 10)
                          : "—"}
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="text-muted fs-12">Actual close</div>
                      <div className="fw-medium">
                        {opp.actualCloseDate ? String(opp.actualCloseDate).slice(0, 10) : "—"}
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="text-muted fs-12">Next step</div>
                      <div className="fw-medium">{opp.nextStep || "—"}</div>
                    </Col>
                    <Col md={6}>
                      <div className="text-muted fs-12">Lead / Campaign</div>
                      <div className="fw-medium">
                        Lead {opp.leadId || "—"} · Campaign {opp.campaignId || "—"}
                      </div>
                    </Col>
                    <Col xs={12}>
                      <div className="text-muted fs-12">Closed reason</div>
                      <div className="fw-medium">{opp.closedReason || "—"}</div>
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
                    <div className="text-muted fs-12">Stage</div>
                    <Badge className="bg-primary-subtle text-primary">
                      {opp.stageName || opp.stageId || "—"}
                    </Badge>
                  </div>
                  <div className="mb-3">
                    <div className="text-muted fs-12">Type</div>
                    <div className="fw-medium">{opp.opportunityTypeName || "—"}</div>
                  </div>
                  <div className="mb-3">
                    <div className="text-muted fs-12">Source</div>
                    <div className="fw-medium">{opp.sourceName || "—"}</div>
                  </div>
                  <div className="mb-3">
                    <div className="text-muted fs-12">Forecast</div>
                    <div className="fw-medium">{opp.forecastCategoryName || "—"}</div>
                  </div>
                  <div className="mb-3">
                    <div className="text-muted fs-12">Priority</div>
                    <div className="fw-medium">{opp.priorityName || "—"}</div>
                  </div>
                  <div className="mb-0 text-muted fs-12">
                    Org {opp.orgId} · App {opp.appId} · Opportunity #{opp.opportunityId}
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

export default OpportunityDetail;
