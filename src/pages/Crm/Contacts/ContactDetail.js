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
import { getContactById } from "../../../helpers/crmContactApi";
import { toastApiError } from "../../../helpers/crmToast";

const ContactDetail = () => {
  const { contactPersonId } = useParams();
  const navigate = useNavigate();
  const [contact, setContact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const titleName =
    contact?.displayName ||
    [contact?.firstName, contact?.lastName].filter(Boolean).join(" ");

  document.title = titleName
    ? `${titleName} | SoftOnCloud CRM`
    : "Contact details | SoftOnCloud CRM";

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getContactById(contactPersonId);
      if (!data) {
        setError("Contact not found.");
        setContact(null);
        return;
      }
      setContact(data);
    } catch (err) {
      setError(err?.message || "Failed to load contact.");
      toastApiError(err, "Failed to load contact.");
    } finally {
      setLoading(false);
    }
  }, [contactPersonId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="page-content">
        <Container fluid className="text-center py-5">
          <Spinner /> Loading contact…
        </Container>
      </div>
    );
  }

  return (
    <div className="page-content">
      <Container fluid>
        <PageHeader
          title={titleName || "Contact"}
          pageTitle="CRM / Contacts"
          actions={
            <div className="d-flex gap-2">
              <Button color="light" onClick={() => navigate("/crm/contacts")}>
                Back to list
              </Button>
              <Button color="primary" tag={Link} to="/crm/opportunities">
                Opportunities
              </Button>
            </div>
          }
        />

        {error ? <Alert color="danger">{error}</Alert> : null}

        {contact ? (
          <Row>
            <Col lg={8}>
              <Card>
                <CardBody>
                  <h5 className="card-title mb-3">Overview</h5>
                  <Row className="g-3">
                    <Col md={6}>
                      <div className="text-muted fs-12">Customer</div>
                      <div className="fw-medium">
                        {contact.accountId ? (
                          <Link to={`/crm/customers/${contact.accountId}`}>
                            {contact.accountName || `Customer #${contact.accountId}`}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="text-muted fs-12">Name</div>
                      <div className="fw-medium">
                        {[contact.salutation, contact.firstName, contact.lastName]
                          .filter(Boolean)
                          .join(" ") || "—"}
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="text-muted fs-12">Mobile</div>
                      <div className="fw-medium">{contact.mobile || "—"}</div>
                    </Col>
                    <Col md={6}>
                      <div className="text-muted fs-12">Email</div>
                      <div className="fw-medium">{contact.email || "—"}</div>
                    </Col>
                    <Col md={6}>
                      <div className="text-muted fs-12">Work phone</div>
                      <div className="fw-medium">{contact.workPhone || "—"}</div>
                    </Col>
                  </Row>
                </CardBody>
              </Card>
            </Col>
            <Col lg={4}>
              <Card>
                <CardBody>
                  <h5 className="card-title mb-3">Flags</h5>
                  <div className="mb-3">
                    <div className="text-muted fs-12">Primary</div>
                    {contact.isPrimary ? (
                      <Badge className="bg-success-subtle text-success">Yes</Badge>
                    ) : (
                      <span className="text-muted">No</span>
                    )}
                  </div>
                  <div className="mb-0 text-muted fs-12">
                    Org {contact.orgId} · App {contact.appId} · Contact #
                    {contact.contactPersonId}
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

export default ContactDetail;
