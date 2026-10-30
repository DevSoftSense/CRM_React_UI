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
  getCustomerById,
  updateCustomer,
  getCustomerLookups,
} from "../../../helpers/crmCustomerApi";
import { getOpportunities } from "../../../helpers/crmOpportunityApi";
import { getContacts, createContact } from "../../../helpers/crmContactApi";
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

const CustomerDetail = () => {
  const { accountId } = useParams();
  const navigate = useNavigate();

  // Core Data States
  const [customer, setCustomer] = useState(null);
  const [opportunities, setOpportunities] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [activities, setActivities] = useState([]);
  const [accountTypes, setAccountTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  // Edit Customer Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editForm, setEditForm] = useState({
    displayName: "",
    companyName: "",
    firstName: "",
    lastName: "",
    email: "",
    phoneMobile: "",
    phoneWork: "",
    websiteUrl: "",
    accountTypeId: "",
    remarks: "",
    status: "active",
  });

  // Add Contact Modal State
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactForm, setContactForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    mobile: "",
    workPhone: "",
    salutation: "Mr.",
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

  document.title = customer?.displayName
    ? `${customer.displayName} | SoftOnCloud CRM`
    : "Customer Details | SoftOnCloud CRM";

  // Load all 360° customer data dynamically from database
  const loadCustomerData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [custData, oppsRes, contactsRes, actsRes] = await Promise.all([
        getCustomerById(accountId),
        getOpportunities({ accountId: Number(accountId), limit: 100 }).catch(() => null),
        getContacts({ accountId: Number(accountId), limit: 100 }).catch(() => null),
        getActivities({ limit: 100 }).catch(() => null),
      ]);

      if (!custData) {
        setError("Customer account not found in database.");
        setCustomer(null);
        return;
      }

      setCustomer(custData);

      // Map opportunities
      const oppsList = Array.isArray(oppsRes)
        ? oppsRes
        : oppsRes?.opportunities || oppsRes?.data || [];
      setOpportunities(oppsList);

      // Map contacts
      const contList = Array.isArray(contactsRes)
        ? contactsRes
        : contactsRes?.contacts || contactsRes?.data || [];
      setContacts(contList);

      // Map customer activities (filtered by company or customer name)
      const allActs = Array.isArray(actsRes)
        ? actsRes
        : actsRes?.activities || actsRes?.data || [];
      const searchKey = String(custData.companyName || custData.displayName || "").toLowerCase();
      const filteredActs = allActs.filter((a) => {
        const text = `${a.subject || ""} ${a.notes || ""} ${a.callNotes || ""}`.toLowerCase();
        return text.includes(searchKey) || String(a.accountId) === String(accountId);
      });
      setActivities(filteredActs);
    } catch (err) {
      setError(err?.message || "Failed to load customer profile.");
      toastApiError(err, "Failed to load customer profile.");
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    loadCustomerData();
  }, [loadCustomerData]);

  // Load Account Types for Edit Modal
  useEffect(() => {
    getCustomerLookups()
      .then((res) => {
        const types = res?.accountTypes || res?.data?.accountTypes || [];
        setAccountTypes(Array.isArray(types) ? types : []);
      })
      .catch(() => setAccountTypes([]));
  }, []);

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
    const totalContactsCount = contacts.length;

    return {
      totalDeals,
      totalPipeline,
      wonDealsCount: wonDeals.length,
      wonValue,
      totalContactsCount,
    };
  }, [opportunities, contacts]);

  // Open Edit Customer Modal
  const openEditModal = () => {
    if (!customer) return;
    setEditForm({
      displayName: customer.displayName || "",
      companyName: customer.companyName || "",
      firstName: customer.firstName || "",
      lastName: customer.lastName || "",
      email: customer.email || "",
      phoneMobile: customer.phoneMobile || "",
      phoneWork: customer.phoneWork || "",
      websiteUrl: customer.websiteUrl || "",
      accountTypeId: customer.accountTypeId ? String(customer.accountTypeId) : "",
      remarks: customer.remarks || "",
      status: customer.status || "active",
    });
    setEditModalOpen(true);
  };

  // Submit Customer Updates
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.phoneMobile.trim()) {
      toastApiError(null, "Mobile number is required.");
      return;
    }

    setEditSubmitting(true);
    try {
      await updateCustomer(accountId, {
        displayName: editForm.displayName.trim() || null,
        companyName: editForm.companyName.trim() || null,
        firstName: editForm.firstName.trim() || null,
        lastName: editForm.lastName.trim() || null,
        email: editForm.email.trim() || null,
        phoneMobile: editForm.phoneMobile.trim(),
        phoneWork: editForm.phoneWork.trim() || null,
        websiteUrl: editForm.websiteUrl.trim() || null,
        accountTypeId: editForm.accountTypeId ? Number(editForm.accountTypeId) : null,
        remarks: editForm.remarks.trim() || null,
        status: editForm.status || "active",
      });

      toastSuccess("Customer profile updated in database.");
      setEditModalOpen(false);
      await loadCustomerData();
    } catch (err) {
      toastApiError(err, "Failed to update customer.");
    } finally {
      setEditSubmitting(false);
    }
  };

  // Submit New Contact Person
  const handleAddContactSubmit = async (e) => {
    e.preventDefault();
    if (!contactForm.firstName.trim()) {
      toastApiError(null, "First name is required.");
      return;
    }
    if (!contactForm.mobile.trim()) {
      toastApiError(null, "Mobile number is required.");
      return;
    }

    setContactSubmitting(true);
    try {
      await createContact({
        accountId: Number(accountId),
        salutation: contactForm.salutation || "Mr.",
        firstName: contactForm.firstName.trim(),
        lastName: contactForm.lastName.trim() || null,
        email: contactForm.email.trim() || null,
        mobile: contactForm.mobile.trim(),
        workPhone: contactForm.workPhone.trim() || null,
        isPrimary: contactForm.isPrimary,
      });

      toastSuccess("Contact person added to customer.");
      setContactModalOpen(false);
      setContactForm({
        firstName: "",
        lastName: "",
        email: "",
        mobile: "",
        workPhone: "",
        salutation: "Mr.",
        isPrimary: false,
      });
      await loadCustomerData();
    } catch (err) {
      toastApiError(err, "Failed to add contact person.");
    } finally {
      setContactSubmitting(false);
    }
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
        subject: `[${customer?.companyName || customer?.displayName || "Customer"}] ${activityForm.subject.trim()}`,
        actType: activityForm.actType || "CALL",
        startTime: activityForm.startTime
          ? new Date(activityForm.startTime).toISOString()
          : new Date().toISOString(),
        callNumber: activityForm.phoneNumber || undefined,
        callNotes: activityForm.notes || undefined,
      });

      toastSuccess("Activity logged in database.");
      setActivityModalOpen(false);
      setActivityForm({
        subject: "",
        actType: "CALL",
        notes: "",
        phoneNumber: "",
        startTime: new Date().toISOString().slice(0, 16),
      });
      await loadCustomerData();
    } catch (err) {
      toastApiError(err, "Failed to log activity.");
    } finally {
      setActivitySubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="page-content" style={{ backgroundColor: "#f8fafc", minHeight: "100vh" }}>
        <Container fluid className="text-center py-5">
          <Spinner style={{ color: THEME.primary }} />
          <div className="mt-2 text-muted fs-13">Loading customer 360° profile from database…</div>
        </Container>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="page-content">
        <Container fluid className="py-4">
          <Alert color="danger">{error || "Customer not found."}</Alert>
          <Button color="light" onClick={() => navigate("/crm/customers")}>
            ← Back to Customers
          </Button>
        </Container>
      </div>
    );
  }

  return (
    <div className="page-content" style={{ backgroundColor: "#f8fafc", minHeight: "100vh" }}>
      <Container fluid className="px-4">
        {/* ======================================================== */}
        {/* Top Header Breadcrumb & Actions Bar                      */}
        {/* ======================================================== */}
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3 pt-2">
          <div>
            <Link
              to="/crm/customers"
              className="text-decoration-none fs-13 fw-semibold d-inline-flex align-items-center gap-1"
              style={{ color: THEME.primary }}
            >
              <i className="ri-arrow-left-line" /> Back to Customers
            </Link>
            <h4 className="fw-bold text-dark mb-0 fs-20 mt-1">Customer Details</h4>
            <div className="text-muted fs-12 mt-1">
              CRM &gt; Customers &gt; {customer.displayName || customer.companyName}
            </div>
          </div>

          <div className="d-flex flex-wrap align-items-center gap-2">
            <Button
              color="light"
              size="sm"
              className="border bg-white fw-semibold text-dark px-3 d-inline-flex align-items-center"
              onClick={openEditModal}
              style={{ borderRadius: 0, borderColor: "#cbd5e1", height: "32px" }}
            >
              <i className="ri-pencil-line me-1 text-muted" /> Edit
            </Button>

            <Button
              color="light"
              size="sm"
              className="border bg-white fw-semibold text-dark d-inline-flex align-items-center"
              onClick={() => setContactModalOpen(true)}
              style={{ borderRadius: 0, borderColor: "#cbd5e1", height: "32px" }}
            >
              <i className="ri-user-add-line me-1 text-muted" /> + Add Contact
            </Button>

            <Button
              color="light"
              size="sm"
              className="border bg-white fw-semibold text-dark d-inline-flex align-items-center"
              onClick={() => setActivityModalOpen(true)}
              style={{ borderRadius: 0, borderColor: "#cbd5e1", height: "32px" }}
            >
              <i className="ri-calendar-event-line me-1 text-muted" /> + Log Activity
            </Button>

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
        {/* Hero Customer Profile Card                               */}
        {/* ======================================================== */}
        <Card
          className="border shadow-none mb-4 bg-white"
          style={{ borderRadius: 0, borderColor: "#e2e8f0" }}
        >
          <CardBody className="p-3 p-md-4">
            <Row className="align-items-center g-3">
              {/* Left: Avatar with Status Indicator + Company & Contact */}
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
                      {getInitials(customer.displayName || customer.companyName || "CU")}
                    </div>
                    <span
                      className="position-absolute bg-success border border-white"
                      style={{ width: "10px", height: "10px", bottom: "1px", right: "1px", borderRadius: 0 }}
                      title="Active Customer"
                    />
                  </div>

                  <div className="flex-grow-1 min-w-0">
                    <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                      <h4 className="fw-bold mb-0 text-dark fs-17 text-truncate">
                        {customer.displayName || customer.companyName}
                      </h4>
                      <span
                        className="badge bg-success-subtle text-success border border-success-subtle"
                        style={{
                          borderRadius: 0,
                          padding: "2px 7px",
                          fontSize: "11px",
                          fontWeight: 600,
                          textTransform: "capitalize",
                        }}
                      >
                        {customer.status || "Active"}
                      </span>
                      <span className="badge bg-light text-muted border fs-11" style={{ borderRadius: 0 }}>
                        {customer.partyCode || `CUS-${customer.accountId}`}
                      </span>
                    </div>

                    <div className="fw-semibold text-dark fs-13 mb-1">
                      {[customer.firstName, customer.lastName].filter(Boolean).join(" ") || "Direct Organization"}
                      <span className="text-muted fw-normal ms-2">· Primary Contact</span>
                    </div>

                    <div className="text-muted fs-12 d-flex align-items-center gap-3 flex-wrap">
                      {customer.phoneMobile && (
                        <a href={`tel:${customer.phoneMobile}`} className="text-muted text-decoration-none">
                          <i className="ri-phone-line text-success me-1" />
                          {customer.phoneMobile}
                        </a>
                      )}
                      {customer.email && (
                        <a href={`mailto:${customer.email}`} className="text-muted text-decoration-none">
                          <i className="ri-mail-line me-1" style={{ color: THEME.primary }} />
                          {customer.email}
                        </a>
                      )}
                      {customer.websiteUrl && (
                        <a
                          href={customer.websiteUrl.startsWith("http") ? customer.websiteUrl : `https://${customer.websiteUrl}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-muted text-decoration-none"
                        >
                          <i className="ri-global-line text-info me-1" />
                          {customer.websiteUrl}
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
                      Account Owner
                    </div>
                    <div className="fs-12 fw-bold text-dark mt-1 text-truncate d-flex align-items-center justify-content-center justify-content-lg-start gap-1">
                      <div
                        className="text-white d-inline-flex align-items-center justify-content-center fs-10 fw-bold"
                        style={{ width: "20px", height: "20px", backgroundColor: THEME.primary, borderRadius: 0, flexShrink: 0 }}
                      >
                        {(opportunities[0]?.ownerName || "A")[0]}
                      </div>
                      <span className="text-truncate">{opportunities[0]?.ownerName || "Amit Kumar"}</span>
                    </div>
                  </Col>

                  <Col xs={4} sm={2}>
                    <div className="text-muted fs-11 text-uppercase fw-bold" style={{ letterSpacing: "0.5px" }}>
                      Account Type
                    </div>
                    <div className="fs-12 fw-bold text-dark mt-1 text-truncate">
                      {customer.accountTypeName || "Customer"}
                    </div>
                  </Col>

                  <Col xs={4} sm={2}>
                    <div className="text-muted fs-11 text-uppercase fw-bold" style={{ letterSpacing: "0.5px" }}>
                      Status
                    </div>
                    <div className="mt-1">
                      <span
                        className="badge bg-success-subtle text-success border border-success-subtle"
                        style={{ borderRadius: 0, fontSize: "10px", fontWeight: 600 }}
                      >
                        {customer.status || "Active"}
                      </span>
                    </div>
                  </Col>

                  <Col xs={4} sm={2}>
                    <div className="text-muted fs-11 text-uppercase fw-bold" style={{ letterSpacing: "0.5px" }}>
                      Pipeline Deals
                    </div>
                    <div className="fs-12 fw-bold text-dark mt-1 text-truncate">
                      {opportunities.length} ({formatInr(computedStats.totalPipeline)})
                    </div>
                  </Col>

                  <Col xs={4} sm={2}>
                    <div className="text-muted fs-11 text-uppercase fw-bold" style={{ letterSpacing: "0.5px" }}>
                      Customer Since
                    </div>
                    <div className="fs-12 fw-bold text-dark mt-1 text-truncate">
                      {formatDate(customer.customerSince || customer.createdOn)}
                    </div>
                  </Col>

                  <Col xs={4} sm={2}>
                    <div className="text-muted fs-11 text-uppercase fw-bold" style={{ letterSpacing: "0.5px" }}>
                      Last Updated
                    </div>
                    <div className="fs-12 fw-bold text-dark mt-1 text-truncate">
                      {formatDate(customer.modifiedOn || customer.createdOn)}
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
          {/* Metric 1: Total Deals */}
          <Col lg={3} sm={6}>
            <Card className="border shadow-sm h-100" style={{ borderRadius: 0, borderColor: THEME.cardBorder, backgroundColor: "#ffffff" }}>
              <CardBody className="p-3">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="text-muted fw-semibold fs-11 text-uppercase letter-spacing">
                    Total Opportunities
                  </span>
                  <div
                    className="d-flex align-items-center justify-content-center rounded-0-0"
                    style={{ width: 32, height: 32, backgroundColor: THEME.lightBg, color: THEME.primary }}
                  >
                    <i className="ri-briefcase-line fs-16" />
                  </div>
                </div>
                <h4 className="fw-bold text-dark mb-0 fs-20">{computedStats.totalDeals}</h4>
                <div className="text-muted fs-11 mt-1">Active customer deals</div>
              </CardBody>
            </Card>
          </Col>

          {/* Metric 2: Pipeline Value */}
          <Col lg={3} sm={6}>
            <Card className="border shadow-sm h-100" style={{ borderRadius: 0, borderColor: THEME.cardBorder, backgroundColor: "#ffffff" }}>
              <CardBody className="p-3">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="text-muted fw-semibold fs-11 text-uppercase letter-spacing">
                    Pipeline Value
                  </span>
                  <div
                    className="d-flex align-items-center justify-content-center rounded-0-0"
                    style={{ width: 32, height: 32, backgroundColor: THEME.lightBg, color: THEME.primary }}
                  >
                    <i className="ri-money-dollar-circle-line fs-16" />
                  </div>
                </div>
                <h4 className="fw-bold text-dark mb-0 fs-20" style={{ color: THEME.primary }}>
                  {formatInr(computedStats.totalPipeline)}
                </h4>
                <div className="text-muted fs-11 mt-1">Total prospective deal value</div>
              </CardBody>
            </Card>
          </Col>

          {/* Metric 3: Won Value */}
          <Col lg={3} sm={6}>
            <Card className="border shadow-sm h-100" style={{ borderRadius: 0, borderColor: THEME.cardBorder, backgroundColor: "#ffffff" }}>
              <CardBody className="p-3">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="text-muted fw-semibold fs-11 text-uppercase letter-spacing">
                    Won Deals Revenue
                  </span>
                  <div
                    className="d-flex align-items-center justify-content-center rounded-0-0"
                    style={{ width: 32, height: 32, backgroundColor: "#ecfdf5", color: "#16a34a" }}
                  >
                    <i className="ri-trophy-line fs-16" />
                  </div>
                </div>
                <h4 className="fw-bold text-dark mb-0 fs-20">{formatInr(computedStats.wonValue)}</h4>
                <div className="text-muted fs-11 mt-1">{computedStats.wonDealsCount} Closed Won Deals</div>
              </CardBody>
            </Card>
          </Col>

          {/* Metric 4: Key Contacts */}
          <Col lg={3} sm={6}>
            <Card className="border shadow-sm h-100" style={{ borderRadius: 0, borderColor: THEME.cardBorder, backgroundColor: "#ffffff" }}>
              <CardBody className="p-3">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="text-muted fw-semibold fs-11 text-uppercase letter-spacing">
                    Key Contacts
                  </span>
                  <div
                    className="d-flex align-items-center justify-content-center rounded-0-0"
                    style={{ width: 32, height: 32, backgroundColor: THEME.lightBg, color: THEME.primary }}
                  >
                    <i className="ri-contacts-book-line fs-16" />
                  </div>
                </div>
                <h4 className="fw-bold text-dark mb-0 fs-20">{computedStats.totalContactsCount}</h4>
                <div className="text-muted fs-11 mt-1">Registered contact persons</div>
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
              { id: "opportunities", label: `Opportunities (${opportunities.length})` },
              { id: "contacts", label: `Contacts (${contacts.length})` },
              { id: "activities", label: `Activities (${activities.length})` },
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
                    borderBottom: isActive ? `2.5px solid ${THEME.primary}` : "2.5px solid transparent",
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
              {/* Column 1: Customer Profile Details */}
              <Col lg={7}>
                <Card className="border shadow-sm mb-3 h-100" style={{ borderRadius: 0, borderColor: THEME.cardBorder, backgroundColor: "#ffffff" }}>
                  <CardBody className="p-4">
                    <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
                      <h6 className="fw-bold text-dark fs-14 mb-0 d-flex align-items-center gap-2">
                        <i className="ri-information-line text-muted" /> Company & Contact Information
                      </h6>
                      <Button color="link" size="sm" className="p-0 text-decoration-none fs-12 fw-semibold" onClick={openEditModal} style={{ color: THEME.primary }}>
                        Edit Profile
                      </Button>
                    </div>

                    <div className="d-flex flex-column gap-2 fs-13">
                      <div className="d-flex justify-content-between align-items-center py-2 border-bottom border-light">
                        <span className="text-muted">Display Name</span>
                        <span className="fw-semibold text-dark">{customer.displayName || "—"}</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center py-2 border-bottom border-light">
                        <span className="text-muted">Company Name</span>
                        <span className="fw-semibold text-dark">{customer.companyName || "—"}</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center py-2 border-bottom border-light">
                        <span className="text-muted">Primary Contact Person</span>
                        <span className="fw-semibold text-dark">
                          {[customer.salutation, customer.firstName, customer.lastName].filter(Boolean).join(" ") || "—"}
                        </span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center py-2 border-bottom border-light">
                        <span className="text-muted">Mobile Phone</span>
                        <span className="fw-semibold text-dark">{customer.phoneMobile || "—"}</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center py-2 border-bottom border-light">
                        <span className="text-muted">Work / Office Phone</span>
                        <span className="fw-semibold text-dark">{customer.phoneWork || "—"}</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center py-2 border-bottom border-light">
                        <span className="text-muted">Email Address</span>
                        <span className="fw-semibold text-dark">{customer.email || "—"}</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center py-2 border-bottom border-light">
                        <span className="text-muted">Corporate Website</span>
                        <span className="fw-semibold text-dark">
                          {customer.websiteUrl ? (
                            <a
                              href={customer.websiteUrl.startsWith("http") ? customer.websiteUrl : `https://${customer.websiteUrl}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: THEME.primary }}
                            >
                              {customer.websiteUrl} <i className="ri-external-link-line fs-12" />
                            </a>
                          ) : (
                            "—"
                          )}
                        </span>
                      </div>
                      <div className="pt-2">
                        <span className="text-muted d-block mb-1 fw-medium fs-12">Remarks & Internal Notes</span>
                        <p className="text-dark mb-0 fs-12" style={{ lineHeight: 1.5 }}>
                          {customer.remarks || "No remarks noted for this customer account."}
                        </p>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </Col>

              {/* Column 2: Account Master Details */}
              <Col lg={5}>
                <Card className="border shadow-sm mb-3 h-100" style={{ borderRadius: 0, borderColor: THEME.cardBorder, backgroundColor: "#ffffff" }}>
                  <CardBody className="p-4">
                    <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
                      <h6 className="fw-bold text-dark fs-14 mb-0 d-flex align-items-center gap-2">
                        <i className="ri-shield-user-line text-muted" /> Account Master Record
                      </h6>
                    </div>

                    <div className="d-flex flex-column gap-2 fs-13">
                      <div className="d-flex justify-content-between align-items-center py-2 border-bottom border-light">
                        <span className="text-muted">Account Status</span>
                        <Badge className="bg-success-subtle text-success fs-12 px-2 py-1">
                          {customer.status || "Active"}
                        </Badge>
                      </div>
                      <div className="d-flex justify-content-between align-items-center py-2 border-bottom border-light">
                        <span className="text-muted">Party Code</span>
                        <span className="fw-bold text-dark">{customer.partyCode || `CUS-${customer.accountId}`}</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center py-2 border-bottom border-light">
                        <span className="text-muted">Party Type</span>
                        <span className="fw-semibold text-dark">{customer.partyType || "CUSTOMER"}</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center py-2 border-bottom border-light">
                        <span className="text-muted">Account Classification</span>
                        <span className="fw-semibold text-dark">{customer.accountTypeName || "Standard Customer"}</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center py-2 border-bottom border-light">
                        <span className="text-muted">Acquisition Source</span>
                        <span className="fw-semibold text-dark">{customer.acquisitionSource || "Direct / Inbound"}</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center py-2 border-bottom border-light">
                        <span className="text-muted">Customer Since</span>
                        <span className="fw-semibold text-dark">{formatDate(customer.customerSince || customer.createdOn)}</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center py-2 border-bottom border-light">
                        <span className="text-muted">System Record</span>
                        <span className="text-muted fs-12">
                          Org {customer.orgId} • App {customer.appId} • ID #{customer.accountId}
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
            <Card className="border shadow-sm mb-4" style={{ borderRadius: 0, borderColor: THEME.cardBorder }}>
              <CardBody className="p-4">
                <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-3">
                  <div>
                    <h5 className="fw-bold text-dark mb-0 fs-15">Opportunities & Deals ({opportunities.length})</h5>
                    <span className="text-muted fs-12">Active sales deals associated with this customer</span>
                  </div>
                  <Button
                    size="sm"
                    className="text-white fw-semibold px-3"
                    onClick={() => navigate("/crm/pipeline")}
                    style={{ backgroundColor: THEME.primary, borderColor: THEME.primary }}
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
                              <td className="text-end fw-bold text-dark">{formatInr(opp.amount)}</td>
                              <td className="text-center fw-semibold text-muted">{opp.probability || 10}%</td>
                              <td className="text-muted">{formatDate(opp.expectedCloseDate)}</td>
                              <td>
                                <div className="d-flex align-items-center gap-1">
                                  <div
                                    className="rounded-0-0 d-flex align-items-center justify-content-center text-white fw-bold"
                                    style={{ width: 22, height: 22, fontSize: "9px", backgroundColor: THEME.primary }}
                                  >
                                    {getInitials(opp.ownerName || "US")}
                                  </div>
                                  <span className="fs-12 text-dark">{opp.ownerName || "Unassigned"}</span>
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
                    No opportunities recorded for this customer yet.
                    <div className="mt-2">
                      <Button
                        size="sm"
                        className="text-white fw-semibold"
                        onClick={() => navigate("/crm/pipeline")}
                        style={{ backgroundColor: THEME.primary, borderColor: THEME.primary }}
                      >
                        + Create First Opportunity
                      </Button>
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>
          </TabPane>

          {/* TAB 3: CONTACT PERSONS */}
          <TabPane tabId="contacts">
            <Card className="border shadow-sm mb-4" style={{ borderRadius: 0, borderColor: THEME.cardBorder }}>
              <CardBody className="p-4">
                <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-3">
                  <div>
                    <h5 className="fw-bold text-dark mb-0 fs-15">Customer Contact Persons ({contacts.length})</h5>
                    <span className="text-muted fs-12">Authorized contacts and stakeholders from this company</span>
                  </div>
                  <Button
                    size="sm"
                    className="text-white fw-semibold px-3"
                    onClick={() => setContactModalOpen(true)}
                    style={{ backgroundColor: THEME.primary, borderColor: THEME.primary }}
                  >
                    + Add Contact Person
                  </Button>
                </div>

                {contacts.length > 0 ? (
                  <Row className="g-3">
                    {contacts.map((c) => (
                      <Col lg={4} md={6} key={c.contactPersonId}>
                        <div className="p-3 border rounded-0-0 bg-white h-100 d-flex flex-column justify-content-between" style={{ borderColor: THEME.cardBorder }}>
                          <div>
                            <div className="d-flex align-items-start justify-content-between mb-2">
                              <div className="d-flex align-items-center gap-2">
                                <div
                                  className="rounded-0-0 d-flex align-items-center justify-content-center text-white fw-bold flex-shrink-0"
                                  style={{ width: 36, height: 36, fontSize: "12px", backgroundColor: THEME.primary }}
                                >
                                  {getInitials(c.fullName || `${c.firstName || ""} ${c.lastName || ""}`)}
                                </div>
                                <div>
                                  <div className="fw-bold text-dark fs-13">
                                    {c.fullName || `${c.firstName || ""} ${c.lastName || ""}`}
                                  </div>
                                  <span className="text-muted fs-11">{c.title || "Contact Person"}</span>
                                </div>
                              </div>
                              {c.isPrimary && (
                                <span style={{ backgroundColor: "#ecfdf5", color: "#047857", padding: "1px 6px", borderRadius: 0, fontSize: "10px", fontWeight: 600 }}>
                                  Primary
                                </span>
                              )}
                            </div>

                            <div className="d-flex flex-column gap-1 fs-12 mt-2 pt-2 border-top border-light">
                              {c.mobile && (
                                <div className="d-flex align-items-center gap-2">
                                  <i className="ri-phone-line text-muted" />
                                  <a href={`tel:${c.mobile}`} className="text-dark text-decoration-none">
                                    {c.mobile}
                                  </a>
                                </div>
                              )}
                              {c.email && (
                                <div className="d-flex align-items-center gap-2">
                                  <i className="ri-mail-line text-muted" />
                                  <a href={`mailto:${c.email}`} className="text-decoration-none" style={{ color: THEME.primary }}>
                                    {c.email}
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="d-flex align-items-center gap-2 mt-3 pt-2 border-top">
                            {c.mobile && (
                              <a
                                href={`tel:${c.mobile}`}
                                className="btn btn-sm btn-light border flex-grow-1 text-center py-1 fs-12"
                                title={`Call ${c.mobile}`}
                              >
                                <i className="ri-phone-line me-1" /> Call
                              </a>
                            )}
                            {c.email && (
                              <a
                                href={`mailto:${c.email}`}
                                className="btn btn-sm btn-light border flex-grow-1 text-center py-1 fs-12"
                                title={`Email ${c.email}`}
                              >
                                <i className="ri-mail-line me-1" /> Email
                              </a>
                            )}
                          </div>
                        </div>
                      </Col>
                    ))}
                  </Row>
                ) : (
                  <div className="text-center py-5 text-muted fs-13">
                    <i className="ri-user-line fs-32 d-block mb-2 text-muted opacity-50" />
                    No contact persons added to this customer yet.
                    <div className="mt-2">
                      <Button
                        size="sm"
                        className="text-white fw-semibold"
                        onClick={() => setContactModalOpen(true)}
                        style={{ backgroundColor: THEME.primary, borderColor: THEME.primary }}
                      >
                        + Add First Contact Person
                      </Button>
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>
          </TabPane>

          {/* TAB 4: ACTIVITIES */}
          <TabPane tabId="activities">
            <Card className="border shadow-sm mb-4" style={{ borderRadius: 0, borderColor: THEME.cardBorder }}>
              <CardBody className="p-4">
                <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-3">
                  <div>
                    <h5 className="fw-bold text-dark mb-0 fs-15">Communications & Activities ({activities.length})</h5>
                    <span className="text-muted fs-12">Calls, meetings, and interactions logged for this customer</span>
                  </div>
                  <Button
                    size="sm"
                    className="text-white fw-semibold px-3"
                    onClick={() => setActivityModalOpen(true)}
                    style={{ backgroundColor: THEME.primary, borderColor: THEME.primary }}
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
                          style={{ width: 36, height: 36, backgroundColor: THEME.lightBg, color: THEME.primary, fontSize: "16px" }}
                        >
                          <i className="ri-calendar-check-line" />
                        </div>
                        <div className="flex-grow-1">
                          <div className="d-flex align-items-center justify-content-between">
                            <h6 className="fw-bold text-dark mb-0 fs-13">{act.subject || act.reason || "Customer Activity"}</h6>
                            <span className="text-muted fs-11">{formatDateTime(act.startTime)}</span>
                          </div>
                          {(act.notes || act.callNotes) && (
                            <p className="text-muted fs-12 mb-1 mt-1">{act.notes || act.callNotes}</p>
                          )}
                          {act.phoneNumber && (
                            <span className="text-muted fs-11 d-block">Phone: {act.phoneNumber}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-5 text-muted fs-13">
                    <i className="ri-calendar-event-line fs-32 d-block mb-2 text-muted opacity-50" />
                    No communications logged for this customer yet.
                    <div className="mt-2">
                      <Button
                        size="sm"
                        className="text-white fw-semibold"
                        onClick={() => setActivityModalOpen(true)}
                        style={{ backgroundColor: THEME.primary, borderColor: THEME.primary }}
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
        {/* MODAL 1: EDIT CUSTOMER MODAL                             */}
        {/* ======================================================== */}
        <Modal isOpen={editModalOpen} toggle={() => setEditModalOpen(false)} centered size="lg">
          <Form onSubmit={handleEditSubmit}>
            <ModalHeader toggle={() => setEditModalOpen(false)} className="border-bottom">
              <h5 className="fw-bold text-dark mb-0 fs-16">Edit Customer Profile</h5>
            </ModalHeader>
            <ModalBody className="p-4">
              <Row className="g-3">
                <Col md={6}>
                  <FormGroup>
                    <Label className="fw-semibold fs-12">Display Name *</Label>
                    <Input
                      type="text"
                      bsSize="sm"
                      required
                      value={editForm.displayName}
                      onChange={(e) => setEditForm((p) => ({ ...p, displayName: e.target.value }))}
                    />
                  </FormGroup>
                </Col>
                <Col md={6}>
                  <FormGroup>
                    <Label className="fw-semibold fs-12">Company Name</Label>
                    <Input
                      type="text"
                      bsSize="sm"
                      value={editForm.companyName}
                      onChange={(e) => setEditForm((p) => ({ ...p, companyName: e.target.value }))}
                    />
                  </FormGroup>
                </Col>
                <Col md={6}>
                  <FormGroup>
                    <Label className="fw-semibold fs-12">First Name</Label>
                    <Input
                      type="text"
                      bsSize="sm"
                      value={editForm.firstName}
                      onChange={(e) => setEditForm((p) => ({ ...p, firstName: e.target.value }))}
                    />
                  </FormGroup>
                </Col>
                <Col md={6}>
                  <FormGroup>
                    <Label className="fw-semibold fs-12">Last Name</Label>
                    <Input
                      type="text"
                      bsSize="sm"
                      value={editForm.lastName}
                      onChange={(e) => setEditForm((p) => ({ ...p, lastName: e.target.value }))}
                    />
                  </FormGroup>
                </Col>
                <Col md={6}>
                  <FormGroup>
                    <Label className="fw-semibold fs-12">Mobile Phone *</Label>
                    <Input
                      type="text"
                      bsSize="sm"
                      required
                      value={editForm.phoneMobile}
                      onChange={(e) => setEditForm((p) => ({ ...p, phoneMobile: e.target.value }))}
                    />
                  </FormGroup>
                </Col>
                <Col md={6}>
                  <FormGroup>
                    <Label className="fw-semibold fs-12">Work Phone</Label>
                    <Input
                      type="text"
                      bsSize="sm"
                      value={editForm.phoneWork}
                      onChange={(e) => setEditForm((p) => ({ ...p, phoneWork: e.target.value }))}
                    />
                  </FormGroup>
                </Col>
                <Col md={6}>
                  <FormGroup>
                    <Label className="fw-semibold fs-12">Email Address</Label>
                    <Input
                      type="email"
                      bsSize="sm"
                      value={editForm.email}
                      onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                    />
                  </FormGroup>
                </Col>
                <Col md={6}>
                  <FormGroup>
                    <Label className="fw-semibold fs-12">Corporate Website</Label>
                    <Input
                      type="text"
                      bsSize="sm"
                      placeholder="https://..."
                      value={editForm.websiteUrl}
                      onChange={(e) => setEditForm((p) => ({ ...p, websiteUrl: e.target.value }))}
                    />
                  </FormGroup>
                </Col>
                <Col md={6}>
                  <FormGroup>
                    <Label className="fw-semibold fs-12">Account Classification</Label>
                    <Input
                      type="select"
                      bsSize="sm"
                      value={editForm.accountTypeId}
                      onChange={(e) => setEditForm((p) => ({ ...p, accountTypeId: e.target.value }))}
                    >
                      <option value="">Select Account Type...</option>
                      {accountTypes.map((t) => (
                        <option key={t.accountTypeId} value={t.accountTypeId}>
                          {t.accountTypeName}
                        </option>
                      ))}
                    </Input>
                  </FormGroup>
                </Col>
                <Col md={6}>
                  <FormGroup>
                    <Label className="fw-semibold fs-12">Status</Label>
                    <Input
                      type="select"
                      bsSize="sm"
                      value={editForm.status}
                      onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value }))}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </Input>
                  </FormGroup>
                </Col>
                <Col xs={12}>
                  <FormGroup>
                    <Label className="fw-semibold fs-12">Remarks / Notes</Label>
                    <Input
                      type="textarea"
                      rows={2}
                      value={editForm.remarks}
                      onChange={(e) => setEditForm((p) => ({ ...p, remarks: e.target.value }))}
                    />
                  </FormGroup>
                </Col>
              </Row>
            </ModalBody>
            <ModalFooter className="bg-light">
              <Button color="light" size="sm" onClick={() => setEditModalOpen(false)}>
                Cancel
              </Button>
              <Button
                color="danger"
                size="sm"
                type="submit"
                disabled={editSubmitting}
                className="fw-semibold px-3"
                style={{ backgroundColor: THEME.primary, borderColor: THEME.primary }}
              >
                {editSubmitting ? <Spinner size="sm" className="me-1" /> : null}
                Save Changes
              </Button>
            </ModalFooter>
          </Form>
        </Modal>

        {/* ======================================================== */}
        {/* MODAL 2: ADD CONTACT PERSON MODAL                        */}
        {/* ======================================================== */}
        <Modal isOpen={contactModalOpen} toggle={() => setContactModalOpen(false)} centered>
          <Form onSubmit={handleAddContactSubmit}>
            <ModalHeader toggle={() => setContactModalOpen(false)} className="border-bottom">
              <h5 className="fw-bold text-dark mb-0 fs-16">+ Add Contact Person</h5>
            </ModalHeader>
            <ModalBody className="p-4">
              <Row className="g-3">
                <Col md={4}>
                  <FormGroup>
                    <Label className="fw-semibold fs-12">Salutation</Label>
                    <Input
                      type="select"
                      bsSize="sm"
                      value={contactForm.salutation}
                      onChange={(e) => setContactForm((p) => ({ ...p, salutation: e.target.value }))}
                    >
                      <option>Mr.</option>
                      <option>Ms.</option>
                      <option>Mrs.</option>
                      <option>Dr.</option>
                    </Input>
                  </FormGroup>
                </Col>
                <Col md={8}>
                  <FormGroup>
                    <Label className="fw-semibold fs-12">First Name *</Label>
                    <Input
                      type="text"
                      bsSize="sm"
                      required
                      value={contactForm.firstName}
                      onChange={(e) => setContactForm((p) => ({ ...p, firstName: e.target.value }))}
                    />
                  </FormGroup>
                </Col>
                <Col md={12}>
                  <FormGroup>
                    <Label className="fw-semibold fs-12">Last Name</Label>
                    <Input
                      type="text"
                      bsSize="sm"
                      value={contactForm.lastName}
                      onChange={(e) => setContactForm((p) => ({ ...p, lastName: e.target.value }))}
                    />
                  </FormGroup>
                </Col>
                <Col md={6}>
                  <FormGroup>
                    <Label className="fw-semibold fs-12">Mobile Phone *</Label>
                    <Input
                      type="text"
                      bsSize="sm"
                      required
                      placeholder="+91..."
                      value={contactForm.mobile}
                      onChange={(e) => setContactForm((p) => ({ ...p, mobile: e.target.value }))}
                    />
                  </FormGroup>
                </Col>
                <Col md={6}>
                  <FormGroup>
                    <Label className="fw-semibold fs-12">Work Phone</Label>
                    <Input
                      type="text"
                      bsSize="sm"
                      value={contactForm.workPhone}
                      onChange={(e) => setContactForm((p) => ({ ...p, workPhone: e.target.value }))}
                    />
                  </FormGroup>
                </Col>
                <Col md={12}>
                  <FormGroup>
                    <Label className="fw-semibold fs-12">Email Address</Label>
                    <Input
                      type="email"
                      bsSize="sm"
                      placeholder="name@company.com"
                      value={contactForm.email}
                      onChange={(e) => setContactForm((p) => ({ ...p, email: e.target.value }))}
                    />
                  </FormGroup>
                </Col>
                <Col xs={12}>
                  <div className="form-check">
                    <Input
                      type="checkbox"
                      id="isPrimaryCheck"
                      checked={contactForm.isPrimary}
                      onChange={(e) => setContactForm((p) => ({ ...p, isPrimary: e.target.checked }))}
                    />
                    <Label check htmlFor="isPrimaryCheck" className="fs-13 fw-semibold">
                      Set as Primary Contact for this Customer Account
                    </Label>
                  </div>
                </Col>
              </Row>
            </ModalBody>
            <ModalFooter className="bg-light">
              <Button color="light" size="sm" onClick={() => setContactModalOpen(false)}>
                Cancel
              </Button>
              <Button
                color="danger"
                size="sm"
                type="submit"
                disabled={contactSubmitting}
                className="fw-semibold px-3"
                style={{ backgroundColor: THEME.primary, borderColor: THEME.primary }}
              >
                {contactSubmitting ? <Spinner size="sm" className="me-1" /> : null}
                Save Contact
              </Button>
            </ModalFooter>
          </Form>
        </Modal>

        {/* ======================================================== */}
        {/* MODAL 3: LOG ACTIVITY MODAL                              */}
        {/* ======================================================== */}
        <Modal isOpen={activityModalOpen} toggle={() => setActivityModalOpen(false)} centered>
          <Form onSubmit={handleAddActivitySubmit}>
            <ModalHeader toggle={() => setActivityModalOpen(false)} className="border-bottom">
              <h5 className="fw-bold text-dark mb-0 fs-16">+ Log Customer Activity</h5>
            </ModalHeader>
            <ModalBody className="p-4">
              <Row className="g-3">
                <Col md={8}>
                  <FormGroup>
                    <Label className="fw-semibold fs-12">Activity Subject *</Label>
                    <Input
                      type="text"
                      bsSize="sm"
                      required
                      placeholder="e.g. Intro discovery call with customer"
                      value={activityForm.subject}
                      onChange={(e) => setActivityForm((p) => ({ ...p, subject: e.target.value }))}
                    />
                  </FormGroup>
                </Col>
                <Col md={4}>
                  <FormGroup>
                    <Label className="fw-semibold fs-12">Type</Label>
                    <Input
                      type="select"
                      bsSize="sm"
                      value={activityForm.actType}
                      onChange={(e) => setActivityForm((p) => ({ ...p, actType: e.target.value }))}
                    >
                      <option value="CALL">Call</option>
                      <option value="MEETING">Meeting</option>
                      <option value="EMAIL">Email</option>
                      <option value="DEMO">Demo</option>
                    </Input>
                  </FormGroup>
                </Col>
                <Col md={6}>
                  <FormGroup>
                    <Label className="fw-semibold fs-12">Phone Number</Label>
                    <Input
                      type="text"
                      bsSize="sm"
                      value={activityForm.phoneNumber}
                      onChange={(e) => setActivityForm((p) => ({ ...p, phoneNumber: e.target.value }))}
                    />
                  </FormGroup>
                </Col>
                <Col md={6}>
                  <FormGroup>
                    <Label className="fw-semibold fs-12">Timestamp</Label>
                    <Input
                      type="datetime-local"
                      bsSize="sm"
                      value={activityForm.startTime}
                      onChange={(e) => setActivityForm((p) => ({ ...p, startTime: e.target.value }))}
                    />
                  </FormGroup>
                </Col>
                <Col xs={12}>
                  <FormGroup>
                    <Label className="fw-semibold fs-12">Discussion Notes</Label>
                    <Input
                      type="textarea"
                      rows={3}
                      placeholder="Key discussion points, customer feedback, next steps..."
                      value={activityForm.notes}
                      onChange={(e) => setActivityForm((p) => ({ ...p, notes: e.target.value }))}
                    />
                  </FormGroup>
                </Col>
              </Row>
            </ModalBody>
            <ModalFooter className="bg-light">
              <Button color="light" size="sm" onClick={() => setActivityModalOpen(false)}>
                Cancel
              </Button>
              <Button
                color="danger"
                size="sm"
                type="submit"
                disabled={activitySubmitting}
                className="fw-semibold px-3"
                style={{ backgroundColor: THEME.primary, borderColor: THEME.primary }}
              >
                {activitySubmitting ? <Spinner size="sm" className="me-1" /> : null}
                Save Activity
              </Button>
            </ModalFooter>
          </Form>
        </Modal>
      </Container>
    </div>
  );
};

export default CustomerDetail;
