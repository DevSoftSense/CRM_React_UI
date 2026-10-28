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
import { getCustomerById } from "../../../helpers/crmCustomerApi";
import { toastApiError } from "../../../helpers/crmToast";

const CustomerDetail = () => {
  const { accountId } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  document.title = customer?.displayName
    ? `${customer.displayName} | SoftOnCloud CRM`
    : "Customer details | SoftOnCloud CRM";

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getCustomerById(accountId);
      if (!data) {
        setError("Customer not found.");
        setCustomer(null);
        return;
      }
      setCustomer(data);
    } catch (err) {
      setError(err?.message || "Failed to load customer.");
      toastApiError(err, "Failed to load customer.");
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="page-content">
        <Container fluid className="text-center py-5">
          <Spinner /> Loading customer…
        </Container>
      </div>
    );
  }

  return (
    <div className="page-content">
      <Container fluid>
        <PageHeader
          title={customer?.displayName || "Customer"}
          pageTitle="CRM / Customers"
          actions={
            <div className="d-flex gap-2">
              <Button color="light" onClick={() => navigate("/crm/customers")}>
                Back to list
              </Button>
              <Button color="primary" tag={Link} to="/crm/opportunities">
                New Opportunity
              </Button>
            </div>
          }
        />

        {error ? <Alert color="danger">{error}</Alert> : null}

        {customer ? (
          <Row>
            <Col lg={8}>
              <Card>
                <CardBody>
                  <h5 className="card-title mb-3">Overview</h5>
                  <Row className="g-3">
                    <Col md={6}>
                      <div className="text-muted fs-12">Company</div>
                      <div className="fw-medium">{customer.companyName || "—"}</div>
                    </Col>
                    <Col md={6}>
                      <div className="text-muted fs-12">Contact person</div>
                      <div className="fw-medium">
                        {[customer.firstName, customer.lastName].filter(Boolean).join(" ") || "—"}
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="text-muted fs-12">Mobile</div>
                      <div className="fw-medium">{customer.phoneMobile || "—"}</div>
                    </Col>
                    <Col md={6}>
                      <div className="text-muted fs-12">Email</div>
                      <div className="fw-medium">{customer.email || "—"}</div>
                    </Col>
                    <Col md={6}>
                      <div className="text-muted fs-12">Work phone</div>
                      <div className="fw-medium">{customer.phoneWork || "—"}</div>
                    </Col>
                    <Col md={6}>
                      <div className="text-muted fs-12">Website</div>
                      <div className="fw-medium">{customer.websiteUrl || "—"}</div>
                    </Col>
                    <Col xs={12}>
                      <div className="text-muted fs-12">Remarks</div>
                      <div className="fw-medium">{customer.remarks || "—"}</div>
                    </Col>
                  </Row>
                </CardBody>
              </Card>
            </Col>
            <Col lg={4}>
              <Card>
                <CardBody>
                  <h5 className="card-title mb-3">Account</h5>
                  <div className="mb-3">
                    <div className="text-muted fs-12">Status</div>
                    <Badge className="bg-success-subtle text-success">
                      {customer.status || "—"}
                    </Badge>
                  </div>
                  <div className="mb-3">
                    <div className="text-muted fs-12">Type</div>
                    <div className="fw-medium">{customer.accountTypeName || "—"}</div>
                  </div>
                  <div className="mb-3">
                    <div className="text-muted fs-12">Party code</div>
                    <div className="fw-medium">{customer.partyCode || "—"}</div>
                  </div>
                  <div className="mb-0 text-muted fs-12">
                    Org {customer.orgId} · App {customer.appId} · Account #{customer.accountId}
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

export default CustomerDetail;
