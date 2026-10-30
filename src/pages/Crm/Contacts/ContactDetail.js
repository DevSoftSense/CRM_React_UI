import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  Col,
  Container,
  Form,
  FormGroup,
  Input,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Row,
  Spinner,
  TabContent,
  TabPane,
  Table,
} from "reactstrap";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  getContactById,
  updateContact,
} from "../../../helpers/crmContactApi";
import { getCustomerById } from "../../../helpers/crmCustomerApi";
import { getOpportunities } from "../../../helpers/crmOpportunityApi";
import { getActivities, createActivity } from "../../../helpers/crmActivityApi";
import { toastApiError, toastSuccess } from "../../../helpers/crmToast";

// SoftOnCloud Primary Maroon Theme
const THEME = {
  primary: "#7f1d1d",
  primaryHover: "#991b1b",
  lightBg: "#fef2f2",
  borderTint: "#fee2e2",
  textDark: "#0f172a",
  textMuted: "#64748b",
  cardBorder: "#e2e8f0",
};

// Formats number to Indian Rupee (e.g. ₹ 18,50,000)
const formatInr = (val) => {
  if (val == null || isNaN(val)) return "\u20B9 0";
  const num = Number(val);
  return `\u20B9 ${num.toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;
};

// Date Formatter (e.g. 20 May 2026)
const formatDate = (dateStr) => {
  if (!dateStr) return "\u2014";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr).slice(0, 10);
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(dateStr).slice(0, 10);
  }
};

// DateTime Formatter (e.g. 30 Apr 2026, 10:15 AM)
const formatDateTime = (dateStr) => {
  if (!dateStr) return "\u2014";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr).slice(0, 16);
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(dateStr).slice(0, 16);
  }
};

// Avatar initials helper
const getInitials = (name) => {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// Stage badge styling helper
const getStageBadgeStyle = (stageName) => {
  const s = String(stageName || "").toLowerCase();
  if (s.includes("won")) {
    return { bg: "#dcfce7", color: "#15803d", border: "#bbf7d0" };
  }
  if (s.includes("lost")) {
    return { bg: "#fee2e2", color: "#b91c1c", border: "#fecaca" };
  }
  if (s.includes("negot")) {
    return { bg: "#fef3c7", color: "#b45309", border: "#fde68a" };
  }
  if (s.includes("propos")) {
    return { bg: "#faf5ff", color: "#7e22ce", border: "#e9d5ff" };
  }
  if (s.includes("qualif")) {
    return { bg: "#ecfdf5", color: "#047857", border: "#a7f3d0" };
  }
  return { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" };
};

const ContactDetail = () => {
  const { contactPersonId } = useParams();
  const navigate = useNavigate();

  // Core Data States
  const [contact, setContact] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [opportunities, setOpportunities] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  // Edit Contact Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editForm, setEditForm] = useState({
    salutation: "Mr.",
    firstName: "",
    lastName: "",
    email: "",
    mobile: "",
    workPhone: "",
    isPrimary: false,
  });

  // Log Activity Modal State
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [activitySubmitting, setActivitySubmitting] = useState(false);
  const [activityForm, setActivityForm] = useState({
    subject: "",
    actType: "CALL",
    notes: "",
    phoneNumber: "",
    startTime: new Date().toISOString().slice(0, 16),
  });

  const titleName =
    contact?.displayName ||
    [contact?.salutation, contact?.firstName, contact?.lastName]
      .filter(Boolean)
      .join(" ");

  document.title = titleName
    ? `${titleName} | SoftOnCloud CRM`
    : "Contact Details | SoftOnCloud CRM";

  // Load all 360° contact data dynamically from database
  const loadContactData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const contactData = await getContactById(contactPersonId);
      if (!contactData) {
        setError("Contact person not found in database.");
        setContact(null);
        return;
      }

      setContact(contactData);

      // Concurrently fetch customer, opportunities, and activities
      const promises = [];

      // 1. Customer record
      if (contactData.accountId) {
        promises.push(
          getCustomerById(contactData.accountId).catch(() => null)
        );
        promises.push(
          getOpportunities({
            accountId: Number(contactData.accountId),
            limit: 100,
          }).catch(() => null)
        );
      } else {
        promises.push(Promise.resolve(null));
        promises.push(Promise.resolve(null));
      }

      // 2. Activities
      promises.push(getActivities({ limit: 100 }).catch(() => null));

      const [custRes, oppsRes, actsRes] = await Promise.all(promises);

      if (custRes) {
        setCustomer(custRes);
      }

      // Map opportunities
      const oppsList = Array.isArray(oppsRes)
        ? oppsRes
        : oppsRes?.opportunities || oppsRes?.data || [];
      setOpportunities(oppsList);

      // Filter activities for this contact
      const allActs = Array.isArray(actsRes)
        ? actsRes
        : actsRes?.activities || actsRes?.data || [];
      const contactMobileDigits = String(contactData.mobile || "").replace(/\D/g, "");
      const contactNameLower = String(contactData.firstName || "").toLowerCase();

      const filteredActs = allActs.filter((a) => {
        const actPhone = String(a.phoneNumber || a.callNumber || "").replace(/\D/g, "");
        if (contactMobileDigits && actPhone && (contactMobileDigits.includes(actPhone) || actPhone.includes(contactMobileDigits))) {
          return true;
        }
        const text = `${a.subject || ""} ${a.notes || ""} ${a.callNotes || ""}`.toLowerCase();
        if (contactNameLower && text.includes(contactNameLower)) {
          return true;
        }
        if (contactData.accountId && String(a.accountId) === String(contactData.accountId)) {
          return true;
        }
        return false;
      });
      setActivities(filteredActs);
    } catch (err) {
      setError(err?.message || "Failed to load contact details.");
      toastApiError(err, "Failed to load contact details.");
    } finally {
      setLoading(false);
    }
  }, [contactPersonId]);

  useEffect(() => {
    loadContactData();
  }, [loadContactData]);

  // Computed KPI Metrics
  const computedStats = useMemo(() => {
    const totalDeals = opportunities.length;
    const totalPipeline = opportunities.reduce(
      (sum, o) => sum + (Number(o.amount) || 0),
      0
    );
    const wonDeals = opportunities.filter(
      (o) => String(o.stageCode).toUpperCase() === "CLOSED_WON"
    );
    const wonValue = wonDeals.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
    const totalActivities = activities.length;

    return {
      totalDeals,
      totalPipeline,
      wonDealsCount: wonDeals.length,
      wonValue,
      totalActivities,
    };
  }, [opportunities, activities]);

  // Open Edit Contact Modal
  const openEditModal = () => {
    if (!contact) return;
    setEditForm({
      salutation: contact.salutation || "Mr.",
      firstName: contact.firstName || "",
      lastName: contact.lastName || "",
      email: contact.email || "",
      mobile: contact.mobile || "",
      workPhone: contact.workPhone || "",
      isPrimary: Boolean(contact.isPrimary),
    });
    setEditModalOpen(true);
  };

  // Submit Contact Updates
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.firstName.trim()) {
      toastApiError(null, "First name is required.");
      return;
    }
    if (!editForm.mobile.trim()) {
      toastApiError(null, "Mobile number is required.");
      return;
    }

    setEditSubmitting(true);
    try {
      await updateContact(contactPersonId, {
        accountId: contact.accountId,
        salutation: editForm.salutation || "Mr.",
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim() || null,
        email: editForm.email.trim() || null,
        mobile: editForm.mobile.trim(),
        workPhone: editForm.workPhone.trim() || null,
        isPrimary: editForm.isPrimary,
      });

      toastSuccess("Contact details updated in database.");
      setEditModalOpen(false);
      await loadContactData();
    } catch (err) {
      toastApiError(err, "Failed to update contact.");
    } finally {
      setEditSubmitting(false);
    }
  };

  // Open Log Activity Modal
  const openActivityModal = () => {
    setActivityForm({
      subject: `Follow-up with ${contact?.displayName || contact?.firstName || "contact"}`,
      actType: "CALL",
      notes: "",
      phoneNumber: contact?.mobile || "",
      startTime: new Date().toISOString().slice(0, 16),
    });
    setActivityModalOpen(true);
  };

  // Submit New Activity
  const handleAddActivitySubmit = async (e) => {
    e.preventDefault();
    if (!activityForm.subject.trim()) {
      toastApiError(null, "Subject is required.");
      return;
    }

    setActivitySubmitting(true);
    try {
      await createActivity({
        subject: `[${titleName || "Contact"}] ${activityForm.subject.trim()}`,
        actType: activityForm.actType || "CALL",
        startTime: activityForm.startTime
          ? new Date(activityForm.startTime).toISOString()
          : new Date().toISOString(),
        callNumber: activityForm.phoneNumber || contact?.mobile || undefined,
        callNotes: activityForm.notes || undefined,
      });

      toastSuccess("Activity logged in database.");
      setActivityModalOpen(false);
      await loadContactData();
    } catch (err) {
      toastApiError(err, "Failed to log activity.");
    } finally {
      setActivitySubmitting(false);
    }
  };

  if (loading) {
    return (
      <div
        className="page-content"
        style={{ backgroundColor: "#f8fafc", minHeight: "100vh" }}
      >
        <Container fluid className="text-center py-5">
          <Spinner style={{ color: THEME.primary }} />
          <div className="mt-2 text-muted fs-13">
            Loading contact 360° profile from database…
          </div>
        </Container>
      </div>
    );
  }

  if (error || !contact) {
    return (
      <div className="page-content">
        <Container fluid className="py-4">
          <Alert color="danger">{error || "Contact not found."}</Alert>
          <Button color="light" onClick={() => navigate("/crm/contacts")}>
            ← Back to Contacts
          </Button>
        </Container>
      </div>
    );
  }

  const cleanMobile = (contact.mobile || "").replace(/\D/g, "");
  const companyDisplayName =
    contact.accountName || contact.accountCompany || customer?.displayName || customer?.companyName;

  return (
    <div
      className="page-content"
      style={{ backgroundColor: "#f8fafc", minHeight: "100vh" }}
    >
      <Container fluid className="px-4">
        {/* ======================================================== */}
        {/* Top Header Breadcrumb & Actions Bar                      */}
        {/* ======================================================== */}
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3 pt-2">
          <div>
            <Link
              to="/crm/contacts"
              className="text-decoration-none fs-13 fw-semibold d-inline-flex align-items-center gap-1"
              style={{ color: THEME.primary }}
            >
              <i className="ri-arrow-left-line" /> Back to Contacts
            </Link>
            <h4 className="fw-bold text-dark mb-0 fs-20 mt-1">Contact Details</h4>
            <div className="text-muted fs-12 mt-1">
              CRM &gt; Contacts &gt; {titleName || `Contact #${contactPersonId}`}
            </div>
          </div>

          <div className="d-flex flex-wrap align-items-center gap-2">
            <Button
              color="light"
              size="sm"
              className="border bg-white fw-semibold text-dark px-3 d-inline-flex align-items-center"
              onClick={openEditModal}
              style={{
                borderRadius: 0,
                borderColor: "#cbd5e1",
                height: "32px",
              }}
            >
              <i className="ri-pencil-line me-1 text-muted" /> Edit Contact
            </Button>

            <Button
              color="light"
              size="sm"
              className="border bg-white fw-semibold text-dark d-inline-flex align-items-center"
              onClick={openActivityModal}
              style={{
                borderRadius: 0,
                borderColor: "#cbd5e1",
                height: "32px",
              }}
            >
              <i className="ri-calendar-event-line me-1 text-muted" /> + Log Activity
            </Button>

            {contact.accountId && (
              <Button
                color="light"
                size="sm"
                className="border bg-white fw-semibold text-dark d-inline-flex align-items-center"
                tag={Link}
                to={`/crm/customers/${contact.accountId}`}
                style={{
                  borderRadius: 0,
                  borderColor: "#cbd5e1",
                  height: "32px",
                }}
              >
                <i className="ri-building-line me-1 text-muted" /> View Customer
              </Button>
            )}

            <Button
              size="sm"
              className="text-white fw-semibold px-3 d-inline-flex align-items-center"
              onClick={() => navigate("/crm/pipeline")}
              style={{
                backgroundColor: THEME.primary,
                borderColor: THEME.primary,
                borderRadius: 0,
                height: "32px",
                boxShadow: "0 1px 2px 0 rgba(127, 29, 29, 0.2)",
              }}
            >
              <i className="ri-add-line me-1" /> + New Opportunity
            </Button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* Hero Contact Profile Card                                */}
        {/* ======================================================== */}
        <Card
          className="border shadow-none mb-4 bg-white"
          style={{
            borderRadius: 0,
            borderColor: "#e2e8f0",
          }}
        >
          <CardBody className="p-3 p-md-4">
            <Row className="align-items-center g-3">
              {/* Left: Avatar with Status Indicator + Contact & Company */}
              <Col xl={5} lg={5}>
                <div className="d-flex align-items-center gap-3">
                  <div className="position-relative flex-shrink-0">
                    <div
                      className="d-flex align-items-center justify-content-center fw-bold fs-18"
                      style={{
                        width: "52px",
                        height: "52px",
                        borderRadius: 0,
                        backgroundColor: "#fef2f2",
                        color: THEME.primary,
                        border: `1px solid ${THEME.borderTint}`,
                      }}
                    >
                      {getInitials(titleName || contact.firstName || "CT")}
                    </div>
                    <span
                      className="position-absolute bg-success border border-white"
                      style={{ width: "10px", height: "10px", bottom: "1px", right: "1px", borderRadius: 0 }}
                      title="Active Contact"
                    />
                  </div>

                  <div className="flex-grow-1 min-w-0">
                    <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                      <h4 className="fw-bold mb-0 text-dark fs-17 text-truncate">
                        {titleName || "Unnamed Contact"}
                      </h4>
                      {contact.isPrimary ? (
                        <span
                          className="badge bg-success-subtle text-success border border-success-subtle"
                          style={{
                            borderRadius: 0,
                            padding: "2px 7px",
                            fontSize: "11px",
                            fontWeight: 600,
                          }}
                        >
                          <i className="ri-star-fill me-1 fs-10" /> Primary Contact
                        </span>
                      ) : (
                        <span className="badge bg-light text-muted border fs-11" style={{ borderRadius: 0 }}>
                          Secondary Contact
                        </span>
                      )}
                      <span className="badge bg-light text-muted border fs-11" style={{ borderRadius: 0 }}>
                        ID: #{contact.contactPersonId}
                      </span>
                    </div>

                    <div className="fw-semibold text-dark fs-13 mb-1">
                      {contact.accountId ? (
                        <Link
                          to={`/crm/customers/${contact.accountId}`}
                          className="text-decoration-none"
                          style={{ color: THEME.primary }}
                        >
                          <i className="ri-building-line text-muted me-1" />
                          {companyDisplayName || `Customer #${contact.accountId}`}
                        </Link>
                      ) : (
                        <span className="text-muted">Independent Contact</span>
                      )}
                    </div>

                    <div className="text-muted fs-12 d-flex align-items-center gap-3 flex-wrap">
                      {contact.mobile && (
                        <a href={`tel:${contact.mobile}`} className="text-muted text-decoration-none">
                          <i className="ri-phone-line text-success me-1" />
                          {contact.mobile}
                        </a>
                      )}
                      {contact.workPhone && (
                        <a href={`tel:${contact.workPhone}`} className="text-muted text-decoration-none">
                          <i className="ri-building-2-line text-muted me-1" />
                          {contact.workPhone}
                        </a>
                      )}
                      {contact.email && (
                        <a href={`mailto:${contact.email}`} className="text-muted text-decoration-none">
                          <i className="ri-mail-line me-1" style={{ color: THEME.primary }} />
                          {contact.email}
                        </a>
                      )}
                      {cleanMobile && (
                        <a
                          href={`https://wa.me/91${cleanMobile.slice(-10)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-decoration-none text-success fw-medium"
                        >
                          <i className="ri-whatsapp-line me-1" /> WhatsApp
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </Col>

              {/* Right: 6 Aligned Metadata Columns */}
              <Col xl={7} lg={7}>
                <Row className="g-2 text-center text-lg-start">
                  <Col xs={4} sm={2}>
                    <div className="text-muted fs-11 text-uppercase fw-bold" style={{ letterSpacing: "0.5px" }}>
                      Affiliated Account
                    </div>
                    <div className="fs-12 fw-bold text-dark mt-1 text-truncate">
                      {contact.accountId ? (
                        <Link
                          to={`/crm/customers/${contact.accountId}`}
                          style={{ color: THEME.primary }}
                          className="text-decoration-none text-truncate d-block"
                        >
                          {companyDisplayName || `Customer #${contact.accountId}`}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </div>
                  </Col>

                  <Col xs={4} sm={2}>
                    <div className="text-muted fs-11 text-uppercase fw-bold" style={{ letterSpacing: "0.5px" }}>
                      Role
                    </div>
                    <div className="fs-12 fw-bold text-dark mt-1 text-truncate">
                      {contact.isPrimary ? "Primary Lead" : "Contact Person"}
                    </div>
                  </Col>

                  <Col xs={4} sm={2}>
                    <div className="text-muted fs-11 text-uppercase fw-bold" style={{ letterSpacing: "0.5px" }}>
                      Account Status
                    </div>
                    <div className="mt-1">
                      <span
                        className="badge bg-success-subtle text-success border border-success-subtle"
                        style={{ borderRadius: 0, fontSize: "10px", fontWeight: 600 }}
                      >
                        {customer?.status || "Active"}
                      </span>
                    </div>
                  </Col>

                  <Col xs={4} sm={2}>
                    <div className="text-muted fs-11 text-uppercase fw-bold" style={{ letterSpacing: "0.5px" }}>
                      Deals Linked
                    </div>
                    <div className="fs-12 fw-bold text-dark mt-1 text-truncate">
                      {opportunities.length} ({formatInr(computedStats.totalPipeline)})
                    </div>
                  </Col>

                  <Col xs={4} sm={2}>
                    <div className="text-muted fs-11 text-uppercase fw-bold" style={{ letterSpacing: "0.5px" }}>
                      Contact Since
                    </div>
                    <div className="fs-12 fw-bold text-dark mt-1 text-truncate">
                      {formatDate(contact.createdOn)}
                    </div>
                  </Col>

                  <Col xs={4} sm={2}>
                    <div className="text-muted fs-11 text-uppercase fw-bold" style={{ letterSpacing: "0.5px" }}>
                      Tenant Record
                    </div>
                    <div className="fs-12 fw-bold text-dark mt-1 text-truncate">
                      Org {contact.orgId} · #{contact.contactPersonId}
                    </div>
                  </Col>
                </Row>
              </Col>
            </Row>
          </CardBody>
        </Card>

        {/* ======================================================== */}
        {/* 4 KPI Metrics Summary Bar                                */}
        {/* ======================================================== */}
        <Row className="g-3 mb-4">
          {/* Metric 1: Total Opportunities */}
          <Col lg={3} sm={6}>
            <Card
              className="border shadow-sm h-100"
              style={{
                borderRadius: 0,
                borderColor: THEME.cardBorder,
                backgroundColor: "#ffffff",
              }}
            >
              <CardBody className="p-3">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="text-muted fw-semibold fs-11 text-uppercase letter-spacing">
                    Account Opportunities
                  </span>
                  <div
                    className="d-flex align-items-center justify-content-center rounded-0-0"
                    style={{
                      width: 32,
                      height: 32,
                      backgroundColor: THEME.lightBg,
                      color: THEME.primary,
                    }}
                  >
                    <i className="ri-briefcase-line fs-16" />
                  </div>
                </div>
                <h4 className="fw-bold text-dark mb-0 fs-20">
                  {computedStats.totalDeals}
                </h4>
                <div className="text-muted fs-11 mt-1">Deals linked to account</div>
              </CardBody>
            </Card>
          </Col>

          {/* Metric 2: Total Pipeline Value */}
          <Col lg={3} sm={6}>
            <Card
              className="border shadow-sm h-100"
              style={{
                borderRadius: 0,
                borderColor: THEME.cardBorder,
                backgroundColor: "#ffffff",
              }}
            >
              <CardBody className="p-3">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="text-muted fw-semibold fs-11 text-uppercase letter-spacing">
                    Pipeline Value
                  </span>
                  <div
                    className="d-flex align-items-center justify-content-center rounded-0-0"
                    style={{
                      width: 32,
                      height: 32,
                      backgroundColor: THEME.lightBg,
                      color: THEME.primary,
                    }}
                  >
                    <i className="ri-money-dollar-circle-line fs-16" />
                  </div>
                </div>
                <h4
                  className="fw-bold text-dark mb-0 fs-20"
                  style={{ color: THEME.primary }}
                >
                  {formatInr(computedStats.totalPipeline)}
                </h4>
                <div className="text-muted fs-11 mt-1">Total account deal value</div>
              </CardBody>
            </Card>
          </Col>

          {/* Metric 3: Won Deals Revenue */}
          <Col lg={3} sm={6}>
            <Card
              className="border shadow-sm h-100"
              style={{
                borderRadius: 0,
                borderColor: THEME.cardBorder,
                backgroundColor: "#ffffff",
              }}
            >
              <CardBody className="p-3">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="text-muted fw-semibold fs-11 text-uppercase letter-spacing">
                    Closed Won Value
                  </span>
                  <div
                    className="d-flex align-items-center justify-content-center rounded-0-0"
                    style={{
                      width: 32,
                      height: 32,
                      backgroundColor: "#ecfdf5",
                      color: "#16a34a",
                    }}
                  >
                    <i className="ri-trophy-line fs-16" />
                  </div>
                </div>
                <h4 className="fw-bold text-dark mb-0 fs-20">
                  {formatInr(computedStats.wonValue)}
                </h4>
                <div className="text-muted fs-11 mt-1">
                  {computedStats.wonDealsCount} Closed Won Deals
                </div>
              </CardBody>
            </Card>
          </Col>

          {/* Metric 4: Activities & Touchpoints */}
          <Col lg={3} sm={6}>
            <Card
              className="border shadow-sm h-100"
              style={{
                borderRadius: 0,
                borderColor: THEME.cardBorder,
                backgroundColor: "#ffffff",
              }}
            >
              <CardBody className="p-3">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="text-muted fw-semibold fs-11 text-uppercase letter-spacing">
                    Communications
                  </span>
                  <div
                    className="d-flex align-items-center justify-content-center rounded-0-0"
                    style={{
                      width: 32,
                      height: 32,
                      backgroundColor: THEME.lightBg,
                      color: THEME.primary,
                    }}
                  >
                    <i className="ri-chat-voice-line fs-16" />
                  </div>
                </div>
                <h4 className="fw-bold text-dark mb-0 fs-20">
                  {computedStats.totalActivities}
                </h4>
                <div className="text-muted fs-11 mt-1">Logged touchpoints</div>
              </CardBody>
            </Card>
          </Col>
        </Row>

        {/* ======================================================== */}
        {/* Navigation Tabs                                          */}
        {/* ======================================================== */}
        <div
          className="border-bottom mb-4 d-flex align-items-center justify-content-between flex-wrap gap-2"
          style={{ borderColor: THEME.cardBorder }}
        >
          <div className="d-flex align-items-center gap-4 overflow-auto py-1">
            {[
              { id: "overview", label: "Overview" },
              {
                id: "opportunities",
                label: `Opportunities (${opportunities.length})`,
              },
              {
                id: "activities",
                label: `Communications (${activities.length})`,
              },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className="btn btn-link p-0 text-decoration-none position-relative pb-2"
                  style={{
                    color: isActive ? THEME.primary : "#64748b",
                    fontWeight: isActive ? 600 : 500,
                    fontSize: "14px",
                    borderBottom: isActive
                      ? `2.5px solid ${THEME.primary}`
                      : "2.5px solid transparent",
                    borderRadius: 0,
                    transition: "all 0.15s ease",
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ======================================================== */}
        {/* Tab Content Panes                                        */}
        {/* ======================================================== */}
        <TabContent activeTab={activeTab}>
          {/* TAB 1: OVERVIEW */}
          <TabPane tabId="overview">
            <Row className="g-3">
              {/* Column 1: Personal & Contact Information */}
              <Col lg={7}>
                <Card
                  className="border shadow-sm mb-3 h-100"
                  style={{
                    borderRadius: 0,
                    borderColor: THEME.cardBorder,
                    backgroundColor: "#ffffff",
                  }}
                >
                  <CardBody className="p-4">
                    <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
                      <h6 className="fw-bold text-dark fs-14 mb-0 d-flex align-items-center gap-2">
                        <i className="ri-user-line text-muted" /> Personal & Contact Information
                      </h6>
                      <Button
                        color="link"
                        size="sm"
                        className="p-0 text-decoration-none fs-12 fw-semibold"
                        onClick={openEditModal}
                        style={{ color: THEME.primary }}
                      >
                        Edit Contact
                      </Button>
                    </div>

                    <div className="d-flex flex-column gap-2 fs-13">
                      <div className="d-flex justify-content-between align-items-center py-2 border-bottom border-light">
                        <span className="text-muted">Salutation</span>
                        <span className="fw-semibold text-dark">
                          {contact.salutation || "—"}
                        </span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center py-2 border-bottom border-light">
                        <span className="text-muted">First Name</span>
                        <span className="fw-semibold text-dark">
                          {contact.firstName || "—"}
                        </span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center py-2 border-bottom border-light">
                        <span className="text-muted">Last Name</span>
                        <span className="fw-semibold text-dark">
                          {contact.lastName || "—"}
                        </span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center py-2 border-bottom border-light">
                        <span className="text-muted">Primary Mobile Number</span>
                        <span className="fw-bold text-dark">
                          {contact.mobile ? (
                            <a
                              href={`tel:${contact.mobile}`}
                              className="text-decoration-none"
                              style={{ color: THEME.primary }}
                            >
                              {contact.mobile}
                            </a>
                          ) : (
                            "—"
                          )}
                        </span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center py-2 border-bottom border-light">
                        <span className="text-muted">Work / Office Phone</span>
                        <span className="fw-semibold text-dark">
                          {contact.workPhone ? (
                            <a
                              href={`tel:${contact.workPhone}`}
                              className="text-decoration-none text-dark"
                            >
                              {contact.workPhone}
                            </a>
                          ) : (
                            "—"
                          )}
                        </span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center py-2 border-bottom border-light">
                        <span className="text-muted">Email Address</span>
                        <span className="fw-semibold text-dark">
                          {contact.email ? (
                            <a
                              href={`mailto:${contact.email}`}
                              className="text-decoration-none"
                              style={{ color: THEME.primary }}
                            >
                              {contact.email}
                            </a>
                          ) : (
                            "—"
                          )}
                        </span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center py-2 border-bottom border-light">
                        <span className="text-muted">Direct WhatsApp Chat</span>
                        <span>
                          {cleanMobile ? (
                            <a
                              href={`https://wa.me/91${cleanMobile.slice(-10)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-decoration-none fw-semibold text-success fs-12 d-inline-flex align-items-center gap-1"
                            >
                              <i className="ri-whatsapp-line" /> Open Chat
                            </a>
                          ) : (
                            "—"
                          )}
                        </span>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </Col>

              {/* Column 2: Account Affiliation & System Record */}
              <Col lg={5}>
                {/* Card 2A: Company Affiliation */}
                <Card
                  className="border shadow-sm mb-3"
                  style={{
                    borderRadius: 0,
                    borderColor: THEME.cardBorder,
                    backgroundColor: "#ffffff",
                  }}
                >
                  <CardBody className="p-4">
                    <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
                      <h6 className="fw-bold text-dark fs-14 mb-0 d-flex align-items-center gap-2">
                        <i className="ri-building-line text-muted" /> Company Affiliation
                      </h6>
                      {contact.accountId && (
                        <Link
                          to={`/crm/customers/${contact.accountId}`}
                          className="fs-12 fw-semibold text-decoration-none"
                          style={{ color: THEME.primary }}
                        >
                          View 360° Profile →
                        </Link>
                      )}
                    </div>

                    <div className="d-flex flex-column gap-2 fs-13">
                      <div className="d-flex justify-content-between align-items-center py-2 border-bottom border-light">
                        <span className="text-muted">Account Name</span>
                        <span className="fw-bold text-dark">
                          {contact.accountId ? (
                            <Link
                              to={`/crm/customers/${contact.accountId}`}
                              style={{ color: THEME.primary }}
                              className="text-decoration-none"
                            >
                              {companyDisplayName || `Customer #${contact.accountId}`}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center py-2 border-bottom border-light">
                        <span className="text-muted">Company Legal Name</span>
                        <span className="fw-semibold text-dark">
                          {contact.accountCompany || customer?.companyName || "—"}
                        </span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center py-2 border-bottom border-light">
                        <span className="text-muted">Primary Contact</span>
                        <span>
                          {contact.isPrimary ? (
                            <Badge className="bg-success-subtle text-success fs-11 px-2 py-1">
                              Yes (Account Lead)
                            </Badge>
                          ) : (
                            <span className="text-muted">No</span>
                          )}
                        </span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center py-2 border-bottom border-light">
                        <span className="text-muted">Customer Party Code</span>
                        <span className="fw-bold text-dark">
                          {customer?.partyCode || (contact.accountId ? `CUS-${contact.accountId}` : "—")}
                        </span>
                      </div>
                    </div>
                  </CardBody>
                </Card>

                {/* Card 2B: CRM System Record */}
                <Card
                  className="border shadow-sm mb-3"
                  style={{
                    borderRadius: 0,
                    borderColor: THEME.cardBorder,
                    backgroundColor: "#ffffff",
                  }}
                >
                  <CardBody className="p-4">
                    <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
                      <h6 className="fw-bold text-dark fs-14 mb-0 d-flex align-items-center gap-2">
                        <i className="ri-shield-keyhole-line text-muted" /> System & Multi-tenant Record
                      </h6>
                    </div>

                    <div className="d-flex flex-column gap-2 fs-13">
                      <div className="d-flex justify-content-between align-items-center py-2 border-bottom border-light">
                        <span className="text-muted">Contact Person ID</span>
                        <span className="fw-bold text-dark">#{contact.contactPersonId}</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center py-2 border-bottom border-light">
                        <span className="text-muted">Organisation Tenant ID</span>
                        <span className="fw-semibold text-dark">Org {contact.orgId}</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center py-2 border-bottom border-light">
                        <span className="text-muted">Application Product ID</span>
                        <span className="fw-semibold text-dark">App {contact.appId} (CRM)</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center py-2 border-bottom border-light">
                        <span className="text-muted">Database Storage</span>
                        <span className="text-muted fs-12 font-monospace">
                          public.tab_party_contact_persons
                        </span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center py-2 border-bottom border-light">
                        <span className="text-muted">Record Created On</span>
                        <span className="fw-semibold text-dark">
                          {formatDateTime(contact.createdOn)}
                        </span>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </Col>
            </Row>
          </TabPane>

          {/* TAB 2: OPPORTUNITIES & DEALS */}
          <TabPane tabId="opportunities">
            <Card
              className="border shadow-sm mb-4"
              style={{
                borderRadius: 0,
                borderColor: THEME.cardBorder,
              }}
            >
              <CardBody className="p-4">
                <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-3">
                  <div>
                    <h5 className="fw-bold text-dark mb-0 fs-15">
                      Account Opportunities & Deals ({opportunities.length})
                    </h5>
                    <span className="text-muted fs-12">
                      Sales pipeline deals associated with this contact's account
                    </span>
                  </div>
                  <Button
                    size="sm"
                    className="text-white fw-semibold px-3"
                    onClick={() => navigate("/crm/pipeline")}
                    style={{
                      backgroundColor: THEME.primary,
                      borderColor: THEME.primary,
                    }}
                  >
                    + New Opportunity
                  </Button>
                </div>

                {opportunities.length > 0 ? (
                  <div className="table-responsive">
                    <Table className="table-hover align-middle mb-0 fs-13">
                      <thead className="table-light text-muted fs-11">
                        <tr>
                          <th>Opportunity Name</th>
                          <th>Stage</th>
                          <th className="text-end">Amount</th>
                          <th className="text-center">Probability</th>
                          <th>Expected Close</th>
                          <th>Sales Owner</th>
                          <th className="text-end">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {opportunities.map((opp) => {
                          const badge = getStageBadgeStyle(opp.stageName);
                          return (
                            <tr key={opp.opportunityId}>
                              <td>
                                <Link
                                  to={`/crm/opportunities/${opp.opportunityId}`}
                                  className="fw-bold text-decoration-none"
                                  style={{ color: THEME.primary }}
                                >
                                  {opp.name}
                                </Link>
                                <span className="text-muted fs-11 d-block">
                                  {opp.opportunityCode || `OPP-${opp.opportunityId}`}
                                </span>
                              </td>
                              <td>
                                <span
                                  style={{
                                    backgroundColor: badge.bg,
                                    color: badge.color,
                                    border: `1px solid ${badge.border}`,
                                    borderRadius: 0,
                                    padding: "2px 8px",
                                    fontSize: "11px",
                                    fontWeight: 600,
                                  }}
                                >
                                  {opp.stageName || "Prospecting"}
                                </span>
                              </td>
                              <td className="text-end fw-bold text-dark">
                                {formatInr(opp.amount)}
                              </td>
                              <td className="text-center fw-semibold text-muted">
                                {opp.probability || 10}%
                              </td>
                              <td className="text-muted">
                                {formatDate(opp.expectedCloseDate)}
                              </td>
                              <td>
                                <div className="d-flex align-items-center gap-1">
                                  <div
                                    className="rounded-0-0 d-flex align-items-center justify-content-center text-white fw-bold"
                                    style={{
                                      width: 22,
                                      height: 22,
                                      fontSize: "9px",
                                      backgroundColor: THEME.primary,
                                    }}
                                  >
                                    {getInitials(opp.ownerName || "US")}
                                  </div>
                                  <span className="fs-12 text-dark">
                                    {opp.ownerName || "Unassigned"}
                                  </span>
                                </div>
                              </td>
                              <td className="text-end">
                                <Link
                                  to={`/crm/opportunities/${opp.opportunityId}`}
                                  className="btn btn-sm btn-light border py-1 px-2 fs-12 fw-semibold"
                                  style={{ color: THEME.primary }}
                                >
                                  View 360° Profile →
                                </Link>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-5 text-muted fs-13">
                    <i className="ri-briefcase-line fs-32 d-block mb-2 text-muted opacity-50" />
                    No opportunities recorded for this customer account yet.
                    <div className="mt-2">
                      <Button
                        size="sm"
                        className="text-white fw-semibold"
                        onClick={() => navigate("/crm/pipeline")}
                        style={{
                          backgroundColor: THEME.primary,
                          borderColor: THEME.primary,
                        }}
                      >
                        + Create First Opportunity
                      </Button>
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>
          </TabPane>

          {/* TAB 3: COMMUNICATIONS & ACTIVITIES */}
          <TabPane tabId="activities">
            <Card
              className="border shadow-sm mb-4"
              style={{
                borderRadius: 0,
                borderColor: THEME.cardBorder,
              }}
            >
              <CardBody className="p-4">
                <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-3">
                  <div>
                    <h5 className="fw-bold text-dark mb-0 fs-15">
                      Communications & Activities ({activities.length})
                    </h5>
                    <span className="text-muted fs-12">
                      Calls, meetings, emails, and touchpoints logged for this contact
                    </span>
                  </div>
                  <Button
                    size="sm"
                    className="text-white fw-semibold px-3"
                    onClick={openActivityModal}
                    style={{
                      backgroundColor: THEME.primary,
                      borderColor: THEME.primary,
                    }}
                  >
                    + Log Activity
                  </Button>
                </div>

                {activities.length > 0 ? (
                  <div className="d-flex flex-column gap-3">
                    {activities.map((act) => (
                      <div
                        key={act.activityId}
                        className="p-3 border rounded-0-0 bg-white d-flex align-items-start gap-3"
                        style={{ borderColor: THEME.cardBorder }}
                      >
                        <div
                          className="rounded-0-0 d-flex align-items-center justify-content-center flex-shrink-0"
                          style={{
                            width: 36,
                            height: 36,
                            backgroundColor: THEME.lightBg,
                            color: THEME.primary,
                            fontSize: "16px",
                          }}
                        >
                          <i className="ri-calendar-check-line" />
                        </div>
                        <div className="flex-grow-1">
                          <div className="d-flex align-items-center justify-content-between">
                            <h6 className="fw-bold text-dark mb-0 fs-13">
                              {act.subject || act.reason || "Contact Touchpoint"}
                            </h6>
                            <span className="text-muted fs-11">
                              {formatDateTime(act.startTime)}
                            </span>
                          </div>
                          {(act.notes || act.callNotes) && (
                            <p className="text-muted fs-12 mb-1 mt-1">
                              {act.notes || act.callNotes}
                            </p>
                          )}
                          {act.phoneNumber && (
                            <span className="text-muted fs-11 d-block">
                              <i className="ri-phone-line me-1" />
                              Phone: {act.phoneNumber}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-5 text-muted fs-13">
                    <i className="ri-calendar-event-line fs-32 d-block mb-2 text-muted opacity-50" />
                    No communications logged for this contact yet.
                    <div className="mt-2">
                      <Button
                        size="sm"
                        className="text-white fw-semibold"
                        onClick={openActivityModal}
                        style={{
                          backgroundColor: THEME.primary,
                          borderColor: THEME.primary,
                        }}
                      >
                        + Log First Activity
                      </Button>
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>
          </TabPane>
        </TabContent>

        {/* ======================================================== */}
        {/* EDIT CONTACT MODAL                                       */}
        {/* ======================================================== */}
        <Modal
          isOpen={editModalOpen}
          toggle={() => setEditModalOpen(false)}
          centered
          size="lg"
        >
          <ModalHeader
            toggle={() => setEditModalOpen(false)}
            className="border-bottom"
          >
            <span className="fw-bold text-dark fs-16">Edit Contact Person</span>
          </ModalHeader>
          <Form onSubmit={handleEditSubmit}>
            <ModalBody className="p-4">
              <Row className="g-3">
                <Col md={3}>
                  <FormGroup>
                    <Label className="fs-12 fw-semibold text-dark">Salutation</Label>
                    <Input
                      type="select"
                      className="form-select-sm"
                      value={editForm.salutation}
                      onChange={(e) =>
                        setEditForm({ ...editForm, salutation: e.target.value })
                      }
                    >
                      <option value="Mr.">Mr.</option>
                      <option value="Ms.">Ms.</option>
                      <option value="Mrs.">Mrs.</option>
                      <option value="Dr.">Dr.</option>
                      <option value="Prof.">Prof.</option>
                    </Input>
                  </FormGroup>
                </Col>

                <Col md={4}>
                  <FormGroup>
                    <Label className="fs-12 fw-semibold text-dark">
                      First Name <span className="text-danger">*</span>
                    </Label>
                    <Input
                      type="text"
                      className="form-control-sm"
                      placeholder="e.g. Rajesh"
                      value={editForm.firstName}
                      onChange={(e) =>
                        setEditForm({ ...editForm, firstName: e.target.value })
                      }
                      required
                    />
                  </FormGroup>
                </Col>

                <Col md={5}>
                  <FormGroup>
                    <Label className="fs-12 fw-semibold text-dark">Last Name</Label>
                    <Input
                      type="text"
                      className="form-control-sm"
                      placeholder="e.g. Mehta"
                      value={editForm.lastName}
                      onChange={(e) =>
                        setEditForm({ ...editForm, lastName: e.target.value })
                      }
                    />
                  </FormGroup>
                </Col>

                <Col md={6}>
                  <FormGroup>
                    <Label className="fs-12 fw-semibold text-dark">
                      Mobile Number <span className="text-danger">*</span>
                    </Label>
                    <Input
                      type="tel"
                      className="form-control-sm"
                      placeholder="e.g. 9876543210"
                      value={editForm.mobile}
                      onChange={(e) =>
                        setEditForm({ ...editForm, mobile: e.target.value })
                      }
                      required
                    />
                  </FormGroup>
                </Col>

                <Col md={6}>
                  <FormGroup>
                    <Label className="fs-12 fw-semibold text-dark">
                      Work / Office Phone
                    </Label>
                    <Input
                      type="tel"
                      className="form-control-sm"
                      placeholder="e.g. 022-28495000"
                      value={editForm.workPhone}
                      onChange={(e) =>
                        setEditForm({ ...editForm, workPhone: e.target.value })
                      }
                    />
                  </FormGroup>
                </Col>

                <Col md={12}>
                  <FormGroup>
                    <Label className="fs-12 fw-semibold text-dark">Email Address</Label>
                    <Input
                      type="email"
                      className="form-control-sm"
                      placeholder="e.g. rajesh@company.com"
                      value={editForm.email}
                      onChange={(e) =>
                        setEditForm({ ...editForm, email: e.target.value })
                      }
                    />
                  </FormGroup>
                </Col>

                <Col md={12}>
                  <div className="form-check form-switch mt-2">
                    <Input
                      type="checkbox"
                      className="form-check-input"
                      id="isPrimaryContact"
                      checked={editForm.isPrimary}
                      onChange={(e) =>
                        setEditForm({ ...editForm, isPrimary: e.target.checked })
                      }
                    />
                    <Label
                      className="form-check-label fs-13 fw-semibold text-dark"
                      htmlFor="isPrimaryContact"
                    >
                      Designate as Primary Contact for this Customer
                    </Label>
                    <div className="text-muted fs-11">
                      If checked, this contact person will be shown as the primary representative for the account.
                    </div>
                  </div>
                </Col>
              </Row>
            </ModalBody>
            <ModalFooter className="border-top">
              <Button
                color="light"
                size="sm"
                onClick={() => setEditModalOpen(false)}
                disabled={editSubmitting}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="text-white fw-semibold px-4"
                type="submit"
                disabled={editSubmitting}
                style={{
                  backgroundColor: THEME.primary,
                  borderColor: THEME.primary,
                }}
              >
                {editSubmitting ? (
                  <>
                    <Spinner size="sm" className="me-1" /> Saving…
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </ModalFooter>
          </Form>
        </Modal>

        {/* ======================================================== */}
        {/* LOG ACTIVITY MODAL                                       */}
        {/* ======================================================== */}
        <Modal
          isOpen={activityModalOpen}
          toggle={() => setActivityModalOpen(false)}
          centered
        >
          <ModalHeader
            toggle={() => setActivityModalOpen(false)}
            className="border-bottom"
          >
            <span className="fw-bold text-dark fs-16">
              Log Activity with {titleName || "Contact"}
            </span>
          </ModalHeader>
          <Form onSubmit={handleAddActivitySubmit}>
            <ModalBody className="p-4">
              <FormGroup className="mb-3">
                <Label className="fs-12 fw-semibold text-dark">
                  Activity Type <span className="text-danger">*</span>
                </Label>
                <Input
                  type="select"
                  className="form-select-sm"
                  value={activityForm.actType}
                  onChange={(e) =>
                    setActivityForm({ ...activityForm, actType: e.target.value })
                  }
                >
                  <option value="CALL">Phone Call</option>
                  <option value="MEETING">Meeting</option>
                  <option value="EMAIL">Email</option>
                  <option value="DEMO">Demo / Presentation</option>
                  <option value="NOTE">Quick Note</option>
                </Input>
              </FormGroup>

              <FormGroup className="mb-3">
                <Label className="fs-12 fw-semibold text-dark">
                  Subject / Summary <span className="text-danger">*</span>
                </Label>
                <Input
                  type="text"
                  className="form-control-sm"
                  placeholder="e.g. Discussed proposal pricing and SLA"
                  value={activityForm.subject}
                  onChange={(e) =>
                    setActivityForm({ ...activityForm, subject: e.target.value })
                  }
                  required
                />
              </FormGroup>

              <Row className="g-3 mb-3">
                <Col md={6}>
                  <FormGroup>
                    <Label className="fs-12 fw-semibold text-dark">Date & Time</Label>
                    <Input
                      type="datetime-local"
                      className="form-control-sm"
                      value={activityForm.startTime}
                      onChange={(e) =>
                        setActivityForm({
                          ...activityForm,
                          startTime: e.target.value,
                        })
                      }
                    />
                  </FormGroup>
                </Col>

                <Col md={6}>
                  <FormGroup>
                    <Label className="fs-12 fw-semibold text-dark">Phone Number</Label>
                    <Input
                      type="tel"
                      className="form-control-sm"
                      placeholder="e.g. 9876543210"
                      value={activityForm.phoneNumber}
                      onChange={(e) =>
                        setActivityForm({
                          ...activityForm,
                          phoneNumber: e.target.value,
                        })
                      }
                    />
                  </FormGroup>
                </Col>
              </Row>

              <FormGroup className="mb-0">
                <Label className="fs-12 fw-semibold text-dark">
                  Detailed Notes / Outcome
                </Label>
                <Input
                  type="textarea"
                  rows="3"
                  className="form-control-sm"
                  placeholder="Record what was discussed or next action steps…"
                  value={activityForm.notes}
                  onChange={(e) =>
                    setActivityForm({ ...activityForm, notes: e.target.value })
                  }
                />
              </FormGroup>
            </ModalBody>
            <ModalFooter className="border-top">
              <Button
                color="light"
                size="sm"
                onClick={() => setActivityModalOpen(false)}
                disabled={activitySubmitting}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="text-white fw-semibold px-4"
                type="submit"
                disabled={activitySubmitting}
                style={{
                  backgroundColor: THEME.primary,
                  borderColor: THEME.primary,
                }}
              >
                {activitySubmitting ? (
                  <>
                    <Spinner size="sm" className="me-1" /> Logging…
                  </>
                ) : (
                  "Log Activity"
                )}
              </Button>
            </ModalFooter>
          </Form>
        </Modal>
      </Container>
    </div>
  );
};

export default ContactDetail;
