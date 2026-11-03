import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  Col,
  Container,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownToggle,
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
  deactivateContact,
} from "../../../helpers/crmContactApi";
import { createActivity } from "../../../helpers/crmActivityApi";
import { toastApiError, toastSuccess } from "../../../helpers/crmToast";

// ============================================================================
// SOFTONCLOUD ENTERPRISE MAROON THEME PALETTE (ZERO HARDCODED BLUE BADGES)
// ============================================================================
const THEME = {
  primary: "#7f1d1d", // SoftOnCloud Deep Maroon
  primaryHover: "#991b1b",
  primaryActive: "#631717",
  lightBg: "#fef2f2",
  borderTint: "#fecaca",
  cardBorder: "#e2e8f0",
  headerBg: "#f8fafc",
  pageBg: "#f8fafc",
  textDark: "#0f172a",
  textBody: "#334155",
  textMuted: "#64748b",
};

// Formats number to Indian Rupee (e.g. ₹ 18,45,000)
const formatInr = (val) => {
  if (val == null || isNaN(val) || Number(val) === 0) return "\u20B9 0";
  const num = Number(val);
  return `\u20B9 ${num.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
};

// Formats date string to DD Mon YYYY (e.g. 10 Apr 2026)
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

// Avatar initials helper
const getInitials = (name) => {
  if (!name) return "CT";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// Stage badge CSS classes (Subtle enterprise palette - NO HARSH BLUE)
const getStageBadgeClass = (stageName) => {
  const s = String(stageName || "").toLowerCase();
  if (s.includes("won") || s.includes("qualif")) {
    return "bg-success-subtle text-success border border-success-subtle";
  }
  if (s.includes("lost")) {
    return "bg-danger-subtle text-danger border border-danger-subtle";
  }
  if (s.includes("negot")) {
    return "bg-warning-subtle text-warning border border-warning-subtle";
  }
  if (s.includes("propos")) {
    return "bg-info-subtle text-info border border-info-subtle";
  }
  return "bg-secondary-subtle text-secondary border border-secondary-subtle";
};

// Priority badge CSS classes
const getPriorityBadgeClass = (priority) => {
  const p = String(priority || "").toUpperCase();
  if (p === "HIGH") return "bg-danger-subtle text-danger border border-danger-subtle";
  if (p === "MEDIUM") return "bg-warning-subtle text-warning border border-warning-subtle";
  return "bg-secondary-subtle text-secondary border border-secondary-subtle";
};

// Activity type icons & badges
const getActivityTypeMeta = (actType) => {
  const t = String(actType || "").toUpperCase();
  if (t === "EMAIL") {
    return { label: "Email Sent", icon: "ri-mail-send-line", color: "#6b21a8", bg: "#faf5ff" };
  }
  if (t === "MEETING") {
    return { label: "Meeting", icon: "ri-calendar-check-line", color: "#047857", bg: "#ecfdf5" };
  }
  if (t === "DEMO") {
    return { label: "Product Demo", icon: "ri-slideshow-line", color: "#b45309", bg: "#fffbeb" };
  }
  if (t === "NOTE") {
    return { label: "Note Added", icon: "ri-sticky-note-line", color: "#ea580c", bg: "#fff7ed" };
  }
  return { label: "Phone Call", icon: "ri-phone-line", color: "#1e40af", bg: "#eff6ff" };
};

const ContactDetail = () => {
  const { contactPersonId } = useParams();
  const navigate = useNavigate();

  // Core Dynamic Data State (ZERO HARDCODED MOCKS)
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  // Dynamic Interactive Tasks list
  const [tasksList, setTasksList] = useState([]);

  // Dropdown & Modals State
  const [moreActionsOpen, setMoreActionsOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [activitySubmitting, setActivitySubmitting] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);

  // Edit Contact Form State
  const [editForm, setEditForm] = useState({
    salutation: "Mr.",
    firstName: "",
    lastName: "",
    email: "",
    mobile: "",
    workPhone: "",
    isPrimary: false,
  });

  // Log Activity Form State
  const [activityForm, setActivityForm] = useState({
    subject: "",
    actType: "CALL",
    notes: "",
    phoneNumber: "",
    startTime: new Date().toISOString().slice(0, 16),
  });

  // Email Form State
  const [emailForm, setEmailForm] = useState({
    to: "",
    subject: "",
    message: "",
  });

  // Fetch Contact 360° Data dynamically from backend
  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getContactById(contactPersonId);
      if (!res) {
        setError("Contact record not found in database.");
        setData(null);
        return;
      }

      // Structure real data directly from backend
      const contactObj = res.contact || {
        contactPersonId: res.contactPersonId || Number(contactPersonId),
        contactCode: `CON-${new Date().getFullYear()}-${String(contactPersonId).padStart(5, "0")}`,
        salutation: res.salutation,
        firstName: res.firstName,
        lastName: res.lastName,
        displayName: res.displayName || [res.salutation, res.firstName, res.lastName].filter(Boolean).join(" "),
        email: res.email,
        mobile: res.mobile,
        workPhone: res.workPhone,
        isPrimary: Boolean(res.isPrimary),
        status: "Active",
      };

      const orgObj = res.organization || {
        accountId: res.accountId,
        companyName: res.accountName || res.accountCompany,
        accountName: res.accountName,
      };

      const keyInfoObj = res.keyInformation || res.key_information || {};
      const oppsList = Array.isArray(res.opportunities) ? res.opportunities : [];
      const invsList = Array.isArray(res.invoices) ? res.invoices : [];
      const actsList = Array.isArray(res.activities) ? res.activities : [];
      const tasksRes = Array.isArray(res.recentTasks || res.recent_tasks) ? (res.recentTasks || res.recent_tasks) : [];
      const kpisObj = res.kpis || {};

      setData({
        contact: contactObj,
        organization: orgObj,
        keyInformation: keyInfoObj,
        opportunities: oppsList,
        invoices: invsList,
        activities: actsList,
        recentTasks: tasksRes,
        kpis: {
          activitiesCount: kpisObj.activitiesCount ?? kpisObj.activities_count ?? actsList.length,
          opportunitiesCount: kpisObj.opportunitiesCount ?? kpisObj.opportunities_count ?? oppsList.length,
          quotesCount: kpisObj.quotesCount ?? kpisObj.quotes_count ?? 0,
          invoicesCount: kpisObj.invoicesCount ?? kpisObj.invoices_count ?? invsList.length,
          totalInvoiced: kpisObj.totalInvoiced ?? kpisObj.total_invoiced ?? 0,
          totalOutstanding: kpisObj.totalOutstanding ?? kpisObj.total_outstanding ?? 0,
          ticketsCount: kpisObj.ticketsCount ?? kpisObj.tickets_count ?? 0,
          documentsCount: kpisObj.documentsCount ?? kpisObj.documents_count ?? 0,
          notesCount: kpisObj.notesCount ?? kpisObj.notes_count ?? 0,
        },
      });

      setTasksList(tasksRes);
    } catch (err) {
      console.error("Failed to load contact:", err);
      setError(err?.message || "Failed to load contact record from database.");
    } finally {
      setLoading(false);
    }
  }, [contactPersonId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const titleName = useMemo(() => {
    if (!data?.contact) return `Contact #${contactPersonId}`;
    return (
      data.contact.displayName ||
      [data.contact.salutation, data.contact.firstName, data.contact.lastName].filter(Boolean).join(" ") ||
      `Contact #${contactPersonId}`
    );
  }, [data, contactPersonId]);

  document.title = `${titleName} | Contact Details (360°) | SoftOnCloud CRM`;

  // Compute Opps total and Invoices total outstanding
  const totalOpportunityValue = useMemo(() => {
    if (!data?.opportunities || data.opportunities.length === 0) return 0;
    return data.opportunities.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
  }, [data]);

  const totalOutstandingValue = useMemo(() => {
    if (!data?.invoices || data.invoices.length === 0) return data?.kpis?.totalOutstanding || 0;
    const pendingInvs = data.invoices.filter((inv) => String(inv.status).toLowerCase() !== "paid");
    if (pendingInvs.length > 0) {
      return pendingInvs.reduce((sum, inv) => sum + (Number(inv.amount || inv.outstanding) || 0), 0);
    }
    return 0;
  }, [data]);

  // Copy text to clipboard
  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
    toastSuccess("Copied to clipboard!");
  };

  // Toggle checklist item
  const toggleTask = (id) => {
    setTasksList((prev) =>
      prev.map((t) => (t.taskId === id || t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  // Open Edit Modal
  const openEditModal = () => {
    const c = data?.contact || {};
    setEditForm({
      salutation: c.salutation || "Mr.",
      firstName: c.firstName || "",
      lastName: c.lastName || "",
      email: c.email || "",
      mobile: c.mobile || "",
      workPhone: c.workPhone || "",
      isPrimary: Boolean(c.isPrimary),
    });
    setEditModalOpen(true);
  };

  // Handle Edit Submit
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
        accountId: data?.organization?.accountId,
        salutation: editForm.salutation,
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim() || null,
        email: editForm.email.trim() || null,
        mobile: editForm.mobile.trim(),
        workPhone: editForm.workPhone.trim() || null,
        isPrimary: editForm.isPrimary,
      });
      toastSuccess("Contact details updated successfully.");
      setEditModalOpen(false);
      await loadData();
    } catch (err) {
      toastApiError(err, "Failed to update contact.");
    } finally {
      setEditSubmitting(false);
    }
  };

  // Open Log Activity Modal
  const openActivityModal = () => {
    setActivityForm({
      subject: `Follow-up with ${titleName}`,
      actType: "CALL",
      notes: "",
      phoneNumber: data?.contact?.mobile || "",
      startTime: new Date().toISOString().slice(0, 16),
    });
    setActivityModalOpen(true);
  };

  // Handle Activity Submit
  const handleActivitySubmit = async (e) => {
    e.preventDefault();
    if (!activityForm.subject.trim()) {
      toastApiError(null, "Subject is required.");
      return;
    }
    setActivitySubmitting(true);
    try {
      await createActivity({
        subject: `[${titleName}] ${activityForm.subject.trim()}`,
        actType: activityForm.actType,
        startTime: new Date(activityForm.startTime).toISOString(),
        callNumber: activityForm.phoneNumber || undefined,
        callNotes: activityForm.notes || undefined,
      });
      toastSuccess("Activity logged successfully.");
      setActivityModalOpen(false);
      await loadData();
    } catch (err) {
      toastApiError(err, "Failed to log activity.");
    } finally {
      setActivitySubmitting(false);
    }
  };

  // Open Send Email Modal
  const openEmailModal = () => {
    setEmailForm({
      to: data?.contact?.email || "",
      subject: `Business Discussion regarding ${data?.organization?.companyName || "SoftOnCloud"}`,
      message: `Dear ${data?.contact?.firstName || titleName},\n\nHope you are having a productive day.\n\nBest regards,\n${data?.contact?.ownerName || ""}`,
    });
    setEmailModalOpen(true);
  };

  const handleSendEmailSubmit = (e) => {
    e.preventDefault();
    if (!emailForm.to) {
      toastApiError(null, "Recipient email is required.");
      return;
    }
    window.location.href = `mailto:${encodeURIComponent(emailForm.to)}?subject=${encodeURIComponent(
      emailForm.subject
    )}&body=${encodeURIComponent(emailForm.message)}`;
    setEmailModalOpen(false);
    toastSuccess("Email client opened.");
  };

  // Set as primary contact action
  const handleSetPrimary = async () => {
    try {
      await updateContact(contactPersonId, {
        accountId: data?.organization?.accountId,
        salutation: data?.contact?.salutation,
        firstName: data?.contact?.firstName,
        lastName: data?.contact?.lastName,
        email: data?.contact?.email,
        mobile: data?.contact?.mobile,
        workPhone: data?.contact?.workPhone,
        isPrimary: true,
      });
      toastSuccess(`${titleName} set as Primary Contact.`);
      await loadData();
    } catch (err) {
      toastApiError(err, "Failed to set as primary contact.");
    }
  };

  if (loading) {
    return (
      <div className="page-content" style={{ backgroundColor: THEME.pageBg, minHeight: "100vh" }}>
        <Container fluid className="text-center py-5">
          <Spinner style={{ color: THEME.primary, width: "2.5rem", height: "2.5rem" }} />
          <div className="mt-3 fs-14 fw-semibold text-dark">Loading 360° Contact Profile...</div>
          <div className="text-muted fs-12 mt-1">Retrieving live records from PostgreSQL</div>
        </Container>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="page-content" style={{ backgroundColor: THEME.pageBg, minHeight: "100vh" }}>
        <Container fluid className="py-4">
          <Alert color="danger" className="rounded-0 border-0 shadow-sm" style={{ borderRadius: 0 }}>
            <h6 className="fw-bold mb-1">Error Loading Contact</h6>
            <div className="fs-13">{error || "Contact person record not found."}</div>
          </Alert>
          <Button
            color="light"
            size="sm"
            className="border bg-white fw-semibold rounded-0"
            onClick={() => navigate("/crm/contacts")}
            style={{ borderRadius: 0 }}
          >
            &larr; Back to Contacts List
          </Button>
        </Container>
      </div>
    );
  }

  const { contact, organization, keyInformation, opportunities, invoices, activities, kpis } = data;

  return (
    <div className="page-content" style={{ backgroundColor: THEME.pageBg, minHeight: "100vh" }}>
      <Container fluid className="px-4 pb-4">
        {/* ======================================================== */}
        {/* TOP HEADER & ACTION BUTTONS BAR                          */}
        {/* ======================================================== */}
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3 pt-2">
          <div>
            <h4 className="fw-bold text-dark mb-0 fs-20" style={{ letterSpacing: "-0.3px" }}>
              Contact Details (360°)
            </h4>
            <div className="text-muted fs-12 mt-1 d-flex align-items-center gap-1">
              <Link to="/crm/leads" className="text-muted text-decoration-none hover-primary">
                CRM
              </Link>
              <span>&gt;</span>
              <Link to="/crm/contacts" className="text-muted text-decoration-none hover-primary">
                Contacts
              </Link>
              <span>&gt;</span>
              <span className="fw-semibold text-dark">{titleName}</span>
            </div>
          </div>

          <div className="d-flex flex-wrap align-items-center gap-2">
            {/* Edit Button */}
            <Button
              color="light"
              size="sm"
              className="border bg-white fw-semibold text-dark px-3 d-inline-flex align-items-center rounded-0"
              onClick={openEditModal}
              style={{
                borderColor: "#cbd5e1",
                height: "34px",
                borderRadius: 0,
                fontSize: "12px",
              }}
            >
              <i className="ri-pencil-line me-1.5 text-muted" /> Edit
            </Button>

            {/* More Actions Dropdown */}
            <Dropdown isOpen={moreActionsOpen} toggle={() => setMoreActionsOpen(!moreActionsOpen)}>
              <DropdownToggle
                color="light"
                size="sm"
                className="border bg-white fw-semibold text-dark px-3 d-inline-flex align-items-center rounded-0"
                style={{
                  borderColor: "#cbd5e1",
                  height: "34px",
                  borderRadius: 0,
                  fontSize: "12px",
                }}
              >
                More Actions <i className="ri-arrow-down-s-line ms-1 text-muted" />
              </DropdownToggle>
              <DropdownMenu className="rounded-0 shadow-sm border" style={{ borderRadius: 0 }}>
                <DropdownItem onClick={handleSetPrimary}>
                  <i className="ri-star-line me-2 text-warning" /> Set as Primary Contact
                </DropdownItem>
                <DropdownItem onClick={() => handleCopy(window.location.href, "contactLink")}>
                  <i className="ri-file-copy-line me-2 text-muted" /> Copy Contact Link
                </DropdownItem>
                <DropdownItem divider />
                <DropdownItem
                  className="text-danger"
                  onClick={async () => {
                    if (window.confirm(`Are you sure you want to delete contact ${titleName}?`)) {
                      try {
                        await deactivateContact(contactPersonId);
                        toastSuccess("Contact deleted.");
                        navigate("/crm/contacts");
                      } catch (e) {
                        toastApiError(e, "Cannot delete contact linked to active records.");
                      }
                    }
                  }}
                >
                  <i className="ri-delete-bin-line me-2" /> Deactivate Contact
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>

            {/* + Add Activity Button (SoftOnCloud Deep Maroon) */}
            <Button
              size="sm"
              className="text-white fw-semibold px-3 d-inline-flex align-items-center rounded-0 shadow-sm"
              onClick={openActivityModal}
              style={{
                backgroundColor: THEME.primary,
                borderColor: THEME.primary,
                height: "34px",
                borderRadius: 0,
                fontSize: "12px",
              }}
            >
              <i className="ri-add-line me-1 fs-14" /> Add Activity
            </Button>

            {/* Send Email Button */}
            <Button
              color="light"
              size="sm"
              className="border bg-white fw-semibold text-dark px-3 d-inline-flex align-items-center rounded-0"
              onClick={openEmailModal}
              style={{
                borderColor: "#cbd5e1",
                height: "34px",
                borderRadius: 0,
                fontSize: "12px",
              }}
            >
              <i className="ri-mail-line me-1.5 text-muted" /> Send Email
            </Button>

            {/* More Options / Copy URL Button */}
            <Button
              color="light"
              size="sm"
              className="border bg-white text-muted px-2 d-inline-flex align-items-center justify-content-center rounded-0"
              onClick={() => handleCopy(window.location.href, "url")}
              title="Copy Profile URL"
              style={{
                borderColor: "#cbd5e1",
                height: "34px",
                width: "34px",
                borderRadius: 0,
              }}
            >
              <i className={copiedKey === "url" ? "ri-check-line text-success" : "ri-more-fill"} />
            </Button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* HERO PROFILE CARD (100% SQUARE GEOMETRY, CLEAN THEME)   */}
        {/* ======================================================== */}
        <Card
          className="border shadow-none mb-3 bg-white rounded-0"
          style={{ borderColor: THEME.cardBorder, borderRadius: 0 }}
        >
          <CardBody className="p-3 p-md-4">
            <Row className="g-3 align-items-center">
              {/* Left Column: Avatar + Profile Name + Subtitle + Direct Contacts */}
              <Col xl={5} lg={5} md={12}>
                <div className="d-flex align-items-start gap-3">
                  {/* Square Avatar with Status Indicator */}
                  <div className="position-relative flex-shrink-0">
                    <div
                      className="d-flex align-items-center justify-content-center fw-bold fs-18 text-white rounded-0 shadow-sm"
                      style={{
                        width: "60px",
                        height: "60px",
                        borderRadius: 0,
                        backgroundColor: THEME.primary,
                        letterSpacing: "0.5px",
                      }}
                    >
                      {getInitials(titleName)}
                    </div>
                    {/* Square Active Status Dot */}
                    <span
                      className="position-absolute bg-success border border-white"
                      style={{
                        width: "12px",
                        height: "12px",
                        bottom: "-2px",
                        right: "-2px",
                        borderRadius: 0,
                      }}
                      title="Active Contact"
                    />
                  </div>

                  {/* Profile Details */}
                  <div className="flex-grow-1 min-w-0">
                    <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                      <h4 className="fw-bold mb-0 text-dark fs-18 text-truncate">{titleName}</h4>
                      <span
                        className="badge bg-success-subtle text-success border border-success-subtle px-2 py-0.5 rounded-0 fs-11 fw-semibold"
                        style={{ borderRadius: 0 }}
                      >
                        {contact.status || "Active"}
                      </span>
                    </div>

                    <div className="fs-13 text-muted mb-2">
                      <span className="fw-medium text-dark">{contact.designation || "Contact Person"}</span>
                      {organization?.companyName && (
                        <>
                          <span className="mx-1">•</span>
                          {organization?.accountId ? (
                            <Link
                              to={`/crm/customers/${organization.accountId}`}
                              className="fw-semibold text-decoration-none"
                              style={{ color: THEME.primary }}
                            >
                              {organization.companyName}
                            </Link>
                          ) : (
                            <span className="fw-semibold text-dark">{organization.companyName}</span>
                          )}
                        </>
                      )}
                    </div>

                    {/* Phone & Email line */}
                    <div className="text-muted fs-12 d-flex align-items-center gap-3 flex-wrap mb-2">
                      {contact.mobile && (
                        <a href={`tel:${contact.mobile}`} className="text-muted text-decoration-none d-inline-flex align-items-center">
                          <i className="ri-phone-line text-success me-1" /> {contact.mobile}
                        </a>
                      )}
                      {contact.email && (
                        <a href={`mailto:${contact.email}`} className="text-muted text-decoration-none d-inline-flex align-items-center">
                          <i className="ri-mail-line me-1" style={{ color: THEME.primary }} /> {contact.email}
                        </a>
                      )}
                    </div>

                    {/* Location line */}
                    <div className="text-muted fs-12 d-flex align-items-center gap-1 mb-2">
                      <i className="ri-map-pin-line text-muted" />
                      <span>{contact.location || "Location not recorded"}</span>
                    </div>

                    {/* Tags row */}
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      {contact.isPrimary && (
                        <span
                          className="badge bg-warning-subtle text-warning border border-warning-subtle px-2 py-0.5 rounded-0 fs-11 fw-semibold"
                          style={{ borderRadius: 0 }}
                        >
                          Primary Contact
                        </span>
                      )}
                      <span
                        className="badge px-2 py-0.5 rounded-0 fs-11 fw-semibold"
                        style={{
                          backgroundColor: "#fef2f2",
                          color: "#7f1d1d",
                          border: "1px solid #fecaca",
                          borderRadius: 0,
                        }}
                      >
                        Key Decision Maker
                      </span>
                    </div>
                  </div>
                </div>
              </Col>

              {/* Middle Column: Department, Direct Phone, DOB, Lead Source, Owner */}
              <Col xl={4} lg={4} md={6}>
                <div className="d-flex flex-column gap-2 fs-12 px-lg-3 border-start border-end border-light">
                  <div className="d-flex justify-content-between py-1 border-bottom border-light">
                    <span className="text-muted fw-medium">Department</span>
                    <span className="fw-semibold text-dark">{contact.department || "—"}</span>
                  </div>
                  <div className="d-flex justify-content-between py-1 border-bottom border-light">
                    <span className="text-muted fw-medium">Direct Phone</span>
                    <span className="fw-semibold text-dark">{contact.workPhone || "—"}</span>
                  </div>
                  <div className="d-flex justify-content-between py-1 border-bottom border-light">
                    <span className="text-muted fw-medium">Date of Birth</span>
                    <span className="fw-semibold text-dark">{formatDate(contact.dateOfBirth)}</span>
                  </div>
                  <div className="d-flex justify-content-between py-1 border-bottom border-light">
                    <span className="text-muted fw-medium">Lead Source</span>
                    <span className="fw-semibold text-dark">{contact.leadSource || "—"}</span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center py-1">
                    <span className="text-muted fw-medium">Owner</span>
                    {contact.ownerName ? (
                      <div className="d-flex align-items-center gap-1.5">
                        <div
                          className="d-flex align-items-center justify-content-center text-white fw-bold fs-10 rounded-0"
                          style={{ width: "20px", height: "20px", backgroundColor: THEME.primary, borderRadius: 0 }}
                        >
                          {getInitials(contact.ownerName)}
                        </div>
                        <span className="fw-semibold text-dark">{contact.ownerName}</span>
                      </div>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </div>
                </div>
              </Col>

              {/* Right Column: Customer Since, Last Activity, Next Follow-up, Contact ID, Tags */}
              <Col xl={3} lg={3} md={6}>
                <div className="d-flex flex-column gap-2 fs-12">
                  <div className="d-flex justify-content-between py-1 border-bottom border-light">
                    <span className="text-muted fw-medium">Customer Since</span>
                    <span className="fw-semibold text-dark">{formatDate(contact.customerSince)}</span>
                  </div>
                  <div className="d-flex justify-content-between py-1 border-bottom border-light">
                    <span className="text-muted fw-medium">Last Activity</span>
                    <span className="fw-semibold text-dark">{contact.lastActivity || "No recorded activity"}</span>
                  </div>
                  <div className="d-flex justify-content-between py-1 border-bottom border-light">
                    <span className="text-muted fw-medium">Next Follow-up</span>
                    <span className="fw-bold text-success">{contact.nextFollowUp || "None scheduled"}</span>
                  </div>
                  <div className="d-flex justify-content-between py-1 border-bottom border-light">
                    <span className="text-muted fw-medium">Contact ID</span>
                    <span className="fw-bold text-dark">{contact.contactCode || `CON-2026-${contactPersonId}`}</span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center py-1">
                    <span className="text-muted fw-medium">Tags</span>
                    <div className="d-flex align-items-center gap-1">
                      {contact.tags && contact.tags.length > 0 ? (
                        contact.tags.map((t, idx) => (
                          <span
                            key={idx}
                            className="badge bg-light text-dark border rounded-0 px-2 py-1"
                            style={{ borderRadius: 0, fontSize: "10px" }}
                          >
                            {t}
                          </span>
                        ))
                      ) : (
                        <span className="text-muted fs-11">—</span>
                      )}
                      <button
                        type="button"
                        className="btn btn-sm btn-light border p-0 d-flex align-items-center justify-content-center rounded-0 ms-1"
                        style={{ width: "20px", height: "20px", borderRadius: 0 }}
                        onClick={openEditModal}
                        title="Add Tag"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </Col>
            </Row>
          </CardBody>
        </Card>

        {/* ======================================================== */}
        {/* TABS NAVIGATION BAR (SQUARE GEOMETRY, CLEAN MAROON LINE) */}
        {/* ======================================================== */}
        <div
          className="border-bottom mb-3 d-flex align-items-center overflow-auto bg-white px-2"
          style={{ borderColor: THEME.cardBorder, borderRadius: 0 }}
        >
          {[
            { id: "overview", label: "Overview" },
            { id: "activities", label: `Activities (${kpis.activitiesCount || activities.length})` },
            { id: "opportunities", label: `Opportunities (${kpis.opportunitiesCount || opportunities.length})` },
            { id: "quotes", label: `Quotes (${kpis.quotesCount || 0})` },
            { id: "invoices", label: `Invoices (${kpis.invoicesCount || invoices.length})` },
            { id: "tickets", label: `Tickets (${kpis.ticketsCount || 0})` },
            { id: "documents", label: `Documents (${kpis.documentsCount || 0})` },
            { id: "notes", label: `Notes (${kpis.notesCount || 0})` },
            { id: "timeline", label: "Timeline" },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className="btn btn-link px-3 py-2.5 text-decoration-none text-nowrap rounded-0"
                style={{
                  color: isActive ? THEME.primary : "#475569",
                  fontWeight: isActive ? 700 : 500,
                  fontSize: "13px",
                  borderBottom: isActive ? `3px solid ${THEME.primary}` : "3px solid transparent",
                  backgroundColor: "transparent",
                  borderRadius: 0,
                  transition: "all 0.15s ease",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ======================================================== */}
        {/* TAB PANES                                                */}
        {/* ======================================================== */}
        <TabContent activeTab={activeTab}>
          {/* TAB 1: OVERVIEW */}
          <TabPane tabId="overview">
            {/* ROW 1: TOP 4 CARDS (ABOUT, ORG, KEY INFO, TIMELINE) */}
            <Row className="g-3 mb-3">
              {/* Card 1: About Contact */}
              <Col xl={3} lg={6} md={6}>
                <Card className="border shadow-none h-100 bg-white rounded-0" style={{ borderColor: THEME.cardBorder, borderRadius: 0 }}>
                  <CardHeader
                    className="py-2.5 px-3 d-flex align-items-center justify-content-between rounded-0 border-bottom bg-white"
                    style={{ borderColor: THEME.cardBorder, borderRadius: 0 }}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <div
                        className="d-flex align-items-center justify-content-center rounded-0"
                        style={{ width: "24px", height: "24px", backgroundColor: "#fef2f2", color: "#7f1d1d" }}
                      >
                        <i className="ri-user-3-line fs-13" />
                      </div>
                      <span className="fw-bold text-dark fs-12 text-uppercase" style={{ letterSpacing: "0.5px" }}>
                        About {contact.firstName || "Contact"}
                      </span>
                    </div>
                    <Button
                      color="link"
                      size="sm"
                      className="p-0 text-decoration-none fs-12 fw-semibold"
                      onClick={openEditModal}
                      style={{ color: THEME.primary }}
                    >
                      Edit
                    </Button>
                  </CardHeader>
                  <CardBody className="p-3">
                    <div className="d-flex flex-column gap-2 fs-12">
                      <div className="d-flex justify-content-between py-1 border-bottom border-light">
                        <span className="text-muted fw-medium">Full Name</span>
                        <span className="fw-semibold text-dark">{titleName}</span>
                      </div>
                      <div className="d-flex justify-content-between py-1 border-bottom border-light">
                        <span className="text-muted fw-medium">Designation</span>
                        <span className="fw-semibold text-dark">{contact.designation || "—"}</span>
                      </div>
                      <div className="d-flex justify-content-between py-1 border-bottom border-light">
                        <span className="text-muted fw-medium">Department</span>
                        <span className="fw-semibold text-dark">{contact.department || "—"}</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center py-1 border-bottom border-light">
                        <span className="text-muted fw-medium">Mobile</span>
                        <div className="d-flex align-items-center gap-1.5">
                          <span className="fw-semibold text-dark">{contact.mobile || "—"}</span>
                          {contact.mobile && (
                            <>
                              <a href={`tel:${contact.mobile}`} className="text-success" title="Call">
                                <i className="ri-phone-fill fs-13" />
                              </a>
                              <a
                                href={`https://wa.me/91${String(contact.mobile).replace(/\D/g, "").slice(-10)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-success"
                                title="WhatsApp"
                              >
                                <i className="ri-whatsapp-fill fs-13" />
                              </a>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="d-flex justify-content-between py-1 border-bottom border-light">
                        <span className="text-muted fw-medium">Email</span>
                        <span className="fw-semibold text-truncate" style={{ maxWidth: "160px" }}>
                          {contact.email ? (
                            <a href={`mailto:${contact.email}`} style={{ color: THEME.primary }} className="text-decoration-none">
                              {contact.email}
                            </a>
                          ) : (
                            "—"
                          )}
                        </span>
                      </div>
                      <div className="d-flex justify-content-between py-1 border-bottom border-light">
                        <span className="text-muted fw-medium">Direct Phone</span>
                        <span className="fw-semibold text-dark">{contact.workPhone || "—"}</span>
                      </div>
                      <div className="d-flex justify-content-between py-1 border-bottom border-light">
                        <span className="text-muted fw-medium">Assistant</span>
                        <span className="fw-semibold text-dark">{contact.assistantName || "—"}</span>
                      </div>
                      <div className="d-flex justify-content-between py-1 border-bottom border-light">
                        <span className="text-muted fw-medium">Assistant Phone</span>
                        <span className="fw-semibold text-dark">{contact.assistantPhone || "—"}</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center py-1 border-bottom border-light">
                        <span className="text-muted fw-medium">Preferred Contact</span>
                        <div className="d-flex align-items-center gap-2">
                          <i className="ri-mail-line text-muted fs-14" title="Email" />
                          <i className="ri-phone-line text-muted fs-14" title="Phone" />
                          <i className="ri-whatsapp-line text-success fs-14" title="WhatsApp" />
                        </div>
                      </div>
                      <div className="d-flex justify-content-between py-1">
                        <span className="text-muted fw-medium">Communication</span>
                        <span className="fw-semibold text-dark">{contact.communicationLanguages || "—"}</span>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </Col>

              {/* Card 2: Organization Details */}
              <Col xl={3} lg={6} md={6}>
                <Card className="border shadow-none h-100 bg-white rounded-0" style={{ borderColor: THEME.cardBorder, borderRadius: 0 }}>
                  <CardHeader
                    className="py-2.5 px-3 d-flex align-items-center justify-content-between rounded-0 border-bottom bg-white"
                    style={{ borderColor: THEME.cardBorder, borderRadius: 0 }}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <div
                        className="d-flex align-items-center justify-content-center rounded-0"
                        style={{ width: "24px", height: "24px", backgroundColor: "#fef2f2", color: "#7f1d1d" }}
                      >
                        <i className="ri-building-line fs-13" />
                      </div>
                      <span className="fw-bold text-dark fs-12 text-uppercase" style={{ letterSpacing: "0.5px" }}>
                        Organization Details
                      </span>
                    </div>
                  </CardHeader>
                  <CardBody className="p-3 d-flex flex-column">
                    <div className="d-flex flex-column gap-2 fs-12 flex-grow-1">
                      <div className="d-flex justify-content-between py-1 border-bottom border-light">
                        <span className="text-muted fw-medium">Company</span>
                        <span className="fw-bold" style={{ color: THEME.primary }}>
                          {organization.companyName || "—"}
                        </span>
                      </div>
                      <div className="d-flex justify-content-between py-1 border-bottom border-light">
                        <span className="text-muted fw-medium">Industry</span>
                        <span className="fw-semibold text-dark">{organization.industry || "—"}</span>
                      </div>
                      <div className="d-flex justify-content-between py-1 border-bottom border-light">
                        <span className="text-muted fw-medium">Website</span>
                        {organization.websiteUrl ? (
                          <a
                            href={
                              organization.websiteUrl.startsWith("http")
                                ? organization.websiteUrl
                                : `https://${organization.websiteUrl}`
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="fw-semibold text-decoration-none text-truncate"
                            style={{ color: THEME.primary, maxWidth: "160px" }}
                          >
                            {organization.websiteUrl}
                          </a>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </div>
                      <div className="d-flex justify-content-between py-1 border-bottom border-light">
                        <span className="text-muted fw-medium">Company Size</span>
                        <span className="fw-semibold text-dark">{organization.companySize || "—"}</span>
                      </div>
                      <div className="py-1 border-bottom border-light">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <span className="text-muted fw-medium">Billing Address</span>
                          {organization.billingAddress && (
                            <button
                              type="button"
                              className="btn btn-sm btn-link p-0 text-muted"
                              onClick={() => handleCopy(organization.billingAddress, "billing")}
                              title="Copy Billing Address"
                            >
                              <i className={copiedKey === "billing" ? "ri-check-line text-success" : "ri-file-copy-line"} />
                            </button>
                          )}
                        </div>
                        <div className="text-dark fs-11" style={{ lineHeight: "1.4" }}>
                          {organization.billingAddress || (
                            <span className="text-muted fst-italic">No billing address recorded</span>
                          )}
                        </div>
                      </div>
                      <div className="py-1">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <span className="text-muted fw-medium">Shipping Address</span>
                          {organization.shippingAddress && (
                            <button
                              type="button"
                              className="btn btn-sm btn-link p-0 text-muted"
                              onClick={() => handleCopy(organization.shippingAddress, "shipping")}
                              title="Copy Shipping Address"
                            >
                              <i className={copiedKey === "shipping" ? "ri-check-line text-success" : "ri-file-copy-line"} />
                            </button>
                          )}
                        </div>
                        <div className="text-dark fs-11" style={{ lineHeight: "1.4" }}>
                          {organization.shippingAddress || (
                            <span className="text-muted fst-italic">No shipping address recorded</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-top mt-auto">
                      {organization.accountId ? (
                        <Link
                          to={`/crm/customers/${organization.accountId}`}
                          className="fw-semibold fs-12 text-decoration-none d-inline-flex align-items-center gap-1"
                          style={{ color: THEME.primary }}
                        >
                          View Company Details &rarr;
                        </Link>
                      ) : (
                        <span className="text-muted fs-12">No linked customer account</span>
                      )}
                    </div>
                  </CardBody>
                </Card>
              </Col>

              {/* Card 3: Key Information */}
              <Col xl={3} lg={6} md={6}>
                <Card className="border shadow-none h-100 bg-white rounded-0" style={{ borderColor: THEME.cardBorder, borderRadius: 0 }}>
                  <CardHeader
                    className="py-2.5 px-3 d-flex align-items-center justify-content-between rounded-0 border-bottom bg-white"
                    style={{ borderColor: THEME.cardBorder, borderRadius: 0 }}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <div
                        className="d-flex align-items-center justify-content-center rounded-0"
                        style={{ width: "24px", height: "24px", backgroundColor: "#fef2f2", color: "#7f1d1d" }}
                      >
                        <i className="ri-key-2-line fs-13" />
                      </div>
                      <span className="fw-bold text-dark fs-12 text-uppercase" style={{ letterSpacing: "0.5px" }}>
                        Key Information
                      </span>
                    </div>
                    <Button
                      color="link"
                      size="sm"
                      className="p-0 text-decoration-none fs-12 fw-semibold"
                      onClick={openEditModal}
                      style={{ color: THEME.primary }}
                    >
                      Edit
                    </Button>
                  </CardHeader>
                  <CardBody className="p-3">
                    <div className="d-flex flex-column gap-2 fs-12">
                      <div className="d-flex justify-content-between py-1 border-bottom border-light">
                        <span className="text-muted fw-medium">Role in Purchase</span>
                        <span className="fw-semibold text-dark">
                          {keyInformation.roleInPurchase || (contact.isPrimary ? "Key Decision Maker" : "Contact Person")}
                        </span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center py-1 border-bottom border-light">
                        <span className="text-muted fw-medium">Buying Influence</span>
                        <div className="text-warning fs-13">
                          {keyInformation.buyingInfluence && keyInformation.buyingInfluence > 0 ? (
                            "★".repeat(Math.min(keyInformation.buyingInfluence, 5))
                          ) : (
                            <span className="text-muted fs-11">Not Rated</span>
                          )}
                        </div>
                      </div>
                      <div className="d-flex justify-content-between py-1 border-bottom border-light">
                        <span className="text-muted fw-medium">Budget Authority</span>
                        <span className="fw-bold text-dark">
                          {keyInformation.budgetAuthority ? formatInr(keyInformation.budgetAuthority) : "—"}
                        </span>
                      </div>
                      <div className="d-flex justify-content-between py-1 border-bottom border-light">
                        <span className="text-muted fw-medium">Preferred Product</span>
                        <span className="fw-semibold text-dark text-truncate" style={{ maxWidth: "160px" }}>
                          {keyInformation.preferredProduct || "—"}
                        </span>
                      </div>
                      <div className="d-flex justify-content-between py-1 border-bottom border-light">
                        <span className="text-muted fw-medium">Interest Area</span>
                        <span className="fw-semibold text-dark">{keyInformation.interestArea || "—"}</span>
                      </div>
                      <div className="d-flex justify-content-between py-1 border-bottom border-light">
                        <span className="text-muted fw-medium">Pain Points</span>
                        <span className="fw-semibold text-dark text-end" style={{ maxWidth: "160px" }}>
                          {keyInformation.painPoints || "—"}
                        </span>
                      </div>
                      <div className="py-1">
                        <span className="text-muted fw-medium d-block mb-1">Notes</span>
                        <p className="text-dark fs-11 mb-0" style={{ lineHeight: "1.4" }}>
                          {keyInformation.notes || <span className="text-muted fst-italic">No relationship notes recorded.</span>}
                        </p>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </Col>

              {/* Card 4: Activity Timeline */}
              <Col xl={3} lg={6} md={6}>
                <Card className="border shadow-none h-100 bg-white rounded-0" style={{ borderColor: THEME.cardBorder, borderRadius: 0 }}>
                  <CardHeader
                    className="py-2.5 px-3 d-flex align-items-center justify-content-between rounded-0 border-bottom bg-white"
                    style={{ borderColor: THEME.cardBorder, borderRadius: 0 }}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <div
                        className="d-flex align-items-center justify-content-center rounded-0"
                        style={{ width: "24px", height: "24px", backgroundColor: "#fef2f2", color: "#7f1d1d" }}
                      >
                        <i className="ri-history-line fs-13" />
                      </div>
                      <span className="fw-bold text-dark fs-12 text-uppercase" style={{ letterSpacing: "0.5px" }}>
                        Activity Timeline
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-link p-0 text-decoration-none fs-12 fw-semibold"
                      onClick={() => setActiveTab("timeline")}
                      style={{ color: THEME.primary }}
                    >
                      View All
                    </button>
                  </CardHeader>
                  <CardBody className="p-3 d-flex flex-column">
                    {activities.length === 0 ? (
                      <div className="text-center py-4 my-auto">
                        <div
                          className="d-inline-flex align-items-center justify-content-center mb-2 rounded-0"
                          style={{ width: "42px", height: "42px", backgroundColor: "#fef2f2", color: "#7f1d1d" }}
                        >
                          <i className="ri-calendar-event-line fs-20" />
                        </div>
                        <div className="fw-semibold text-dark fs-13 mb-1">No Activities Logged Yet</div>
                        <div className="text-muted fs-11 mb-3" style={{ maxWidth: "220px", margin: "0 auto" }}>
                          Interactions, calls, and meetings with this contact will appear here.
                        </div>
                        <Button
                          size="sm"
                          className="text-white fw-semibold rounded-0 px-3"
                          onClick={openActivityModal}
                          style={{ backgroundColor: THEME.primary, borderColor: THEME.primary, borderRadius: 0, fontSize: "11px" }}
                        >
                          <i className="ri-add-line me-1" /> Log First Activity
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="flex-grow-1 position-relative pe-1">
                          <div
                            className="position-absolute"
                            style={{
                              left: "14px",
                              top: "10px",
                              bottom: "10px",
                              width: "2px",
                              backgroundColor: "#f1f5f9",
                            }}
                          />
                          <div className="d-flex flex-column gap-3">
                            {activities.slice(0, 5).map((act, idx) => {
                              const meta = getActivityTypeMeta(act.actType);
                              return (
                                <div key={idx} className="d-flex align-items-start gap-2 position-relative">
                                  <div
                                    className="d-flex align-items-center justify-content-center flex-shrink-0 z-1 rounded-0"
                                    style={{
                                      width: "28px",
                                      height: "28px",
                                      backgroundColor: meta.bg,
                                      color: meta.color,
                                      border: `1px solid ${meta.bg}`,
                                      borderRadius: 0,
                                    }}
                                  >
                                    <i className={`${meta.icon} fs-13`} />
                                  </div>
                                  <div className="flex-grow-1 min-w-0 fs-11">
                                    <div className="text-muted fs-10">{formatDate(act.startTime)}</div>
                                    <div className="fw-bold text-dark">{meta.label}</div>
                                    <div className="text-muted text-truncate" title={act.subject}>
                                      {act.subject} {act.employeeName ? `by ${act.employeeName}` : ""}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="pt-2 border-top mt-auto">
                          <button
                            type="button"
                            className="btn btn-link p-0 fw-semibold fs-12 text-decoration-none"
                            onClick={() => setActiveTab("timeline")}
                            style={{ color: THEME.primary }}
                          >
                            View Full Timeline &rarr;
                          </button>
                        </div>
                      </>
                    )}
                  </CardBody>
                </Card>
              </Col>
            </Row>

            {/* ROW 2: LOWER 3 CARDS (OPEN OPPORTUNITIES, RECENT INVOICES, RECENT ACTIVITIES) */}
            <Row className="g-3 mb-3">
              {/* Card 1: Open Opportunities */}
              <Col xl={4} lg={4} md={12}>
                <Card className="border shadow-none h-100 bg-white rounded-0" style={{ borderColor: THEME.cardBorder, borderRadius: 0 }}>
                  <CardHeader
                    className="py-2.5 px-3 d-flex align-items-center justify-content-between rounded-0 border-bottom bg-white"
                    style={{ borderColor: THEME.cardBorder, borderRadius: 0 }}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <div
                        className="d-flex align-items-center justify-content-center rounded-0"
                        style={{ width: "24px", height: "24px", backgroundColor: "#fef2f2", color: "#7f1d1d" }}
                      >
                        <i className="ri-briefcase-line fs-13" />
                      </div>
                      <span className="fw-bold text-dark fs-12 text-uppercase" style={{ letterSpacing: "0.5px" }}>
                        Open Opportunities ({opportunities.length})
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-link p-0 text-decoration-none fs-12 fw-semibold"
                      onClick={() => setActiveTab("opportunities")}
                      style={{ color: THEME.primary }}
                    >
                      View All
                    </button>
                  </CardHeader>
                  <CardBody className="p-3 d-flex flex-column">
                    {opportunities.length === 0 ? (
                      <div className="text-center py-4 my-auto">
                        <div
                          className="d-inline-flex align-items-center justify-content-center mb-2 rounded-0"
                          style={{ width: "42px", height: "42px", backgroundColor: "#f8fafc", color: "#64748b" }}
                        >
                          <i className="ri-briefcase-line fs-20" />
                        </div>
                        <div className="fw-semibold text-dark fs-13 mb-1">No Active Deals</div>
                        <div className="text-muted fs-11 mb-3" style={{ maxWidth: "220px", margin: "0 auto" }}>
                          No ongoing deals or pipeline opportunities linked.
                        </div>
                        <Button
                          size="sm"
                          className="text-white fw-semibold rounded-0 px-3"
                          onClick={() => navigate("/crm/pipeline")}
                          style={{ backgroundColor: THEME.primary, borderColor: THEME.primary, borderRadius: 0, fontSize: "11px" }}
                        >
                          + New Opportunity
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="table-responsive flex-grow-1">
                          <Table className="table-sm table-borderless align-middle mb-0 fs-12">
                            <thead>
                              <tr className="text-muted border-bottom" style={{ fontSize: "11px" }}>
                                <th className="fw-semibold ps-0">Opportunity Name</th>
                                <th className="fw-semibold">Stage</th>
                                <th className="fw-semibold text-center">Prob (%)</th>
                                <th className="fw-semibold text-end pe-0">Value</th>
                              </tr>
                            </thead>
                            <tbody>
                              {opportunities.map((opp, idx) => {
                                return (
                                  <tr key={idx} className="border-bottom border-light">
                                    <td className="ps-0 fw-semibold text-truncate" style={{ maxWidth: "140px" }}>
                                      <Link
                                        to={`/crm/opportunities/${opp.opportunityId || ""}`}
                                        className="text-dark text-decoration-none hover-primary"
                                        title={opp.name}
                                      >
                                        {opp.name}
                                      </Link>
                                    </td>
                                    <td>
                                      <span
                                        className={`badge ${getStageBadgeClass(opp.stage)} px-2.5 py-1 rounded-0 fs-11 fw-semibold`}
                                        style={{ borderRadius: 0 }}
                                      >
                                        {opp.stage || "New"}
                                      </span>
                                    </td>
                                    <td className="text-center text-muted">{opp.probability || 0}%</td>
                                    <td className="text-end pe-0 fw-bold text-dark">{formatInr(opp.amount)}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </Table>
                        </div>

                        {/* Total Value Footer */}
                        <div className="d-flex justify-content-between align-items-center pt-2 border-top mt-auto fs-12">
                          <span className="fw-bold text-dark">Total Value</span>
                          <span className="fw-bold fs-13" style={{ color: THEME.primary }}>
                            {formatInr(totalOpportunityValue)}
                          </span>
                        </div>
                      </>
                    )}
                  </CardBody>
                </Card>
              </Col>

              {/* Card 2: Recent Invoices */}
              <Col xl={4} lg={4} md={12}>
                <Card className="border shadow-none h-100 bg-white rounded-0" style={{ borderColor: THEME.cardBorder, borderRadius: 0 }}>
                  <CardHeader
                    className="py-2.5 px-3 d-flex align-items-center justify-content-between rounded-0 border-bottom bg-white"
                    style={{ borderColor: THEME.cardBorder, borderRadius: 0 }}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <div
                        className="d-flex align-items-center justify-content-center rounded-0"
                        style={{ width: "24px", height: "24px", backgroundColor: "#fef2f2", color: "#7f1d1d" }}
                      >
                        <i className="ri-bill-line fs-13" />
                      </div>
                      <span className="fw-bold text-dark fs-12 text-uppercase" style={{ letterSpacing: "0.5px" }}>
                        Recent Invoices ({invoices.length})
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-link p-0 text-decoration-none fs-12 fw-semibold"
                      onClick={() => setActiveTab("invoices")}
                      style={{ color: THEME.primary }}
                    >
                      View All
                    </button>
                  </CardHeader>
                  <CardBody className="p-3 d-flex flex-column">
                    {invoices.length === 0 ? (
                      <div className="text-center py-4 my-auto">
                        <div
                          className="d-inline-flex align-items-center justify-content-center mb-2 rounded-0"
                          style={{ width: "42px", height: "42px", backgroundColor: "#f8fafc", color: "#64748b" }}
                        >
                          <i className="ri-bill-line fs-20" />
                        </div>
                        <div className="fw-semibold text-dark fs-13 mb-1">No Invoices on File</div>
                        <div className="text-muted fs-11" style={{ maxWidth: "220px", margin: "0 auto" }}>
                          No billing statements recorded for this account.
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="table-responsive flex-grow-1">
                          <Table className="table-sm table-borderless align-middle mb-0 fs-12">
                            <thead>
                              <tr className="text-muted border-bottom" style={{ fontSize: "11px" }}>
                                <th className="fw-semibold ps-0">Invoice No.</th>
                                <th className="fw-semibold">Date</th>
                                <th className="fw-semibold text-end">Amount</th>
                                <th className="fw-semibold text-center pe-0">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {invoices.map((inv, idx) => {
                                const isPaid = String(inv.status).toLowerCase() === "paid";
                                return (
                                  <tr key={idx} className="border-bottom border-light">
                                    <td className="ps-0 fw-semibold">
                                      <span style={{ color: THEME.primary }}>{inv.invoiceNo}</span>
                                    </td>
                                    <td className="text-muted">{formatDate(inv.invoiceDate)}</td>
                                    <td className="text-end fw-bold text-dark">{formatInr(inv.amount)}</td>
                                    <td className="text-center pe-0">
                                      <span
                                        className={`badge ${
                                          isPaid
                                            ? "bg-success-subtle text-success border border-success-subtle"
                                            : "bg-danger-subtle text-danger border border-danger-subtle"
                                        } px-2.5 py-1 rounded-0 fs-11 fw-semibold`}
                                        style={{ borderRadius: 0 }}
                                      >
                                        {inv.status || (isPaid ? "Paid" : "Pending")}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </Table>
                        </div>

                        {/* Total Outstanding Footer */}
                        <div className="d-flex justify-content-between align-items-center pt-2 border-top mt-auto fs-12">
                          <span className="fw-bold text-dark">Total Outstanding</span>
                          <span
                            className={`fw-bold fs-13 ${totalOutstandingValue > 0 ? "text-danger" : "text-success"}`}
                          >
                            {formatInr(totalOutstandingValue)}
                          </span>
                        </div>
                      </>
                    )}
                  </CardBody>
                </Card>
              </Col>

              {/* Card 3: Recent Activities Interactive Checklist */}
              <Col xl={4} lg={4} md={12}>
                <Card className="border shadow-none h-100 bg-white rounded-0" style={{ borderColor: THEME.cardBorder, borderRadius: 0 }}>
                  <CardHeader
                    className="py-2.5 px-3 d-flex align-items-center justify-content-between rounded-0 border-bottom bg-white"
                    style={{ borderColor: THEME.cardBorder, borderRadius: 0 }}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <div
                        className="d-flex align-items-center justify-content-center rounded-0"
                        style={{ width: "24px", height: "24px", backgroundColor: "#fef2f2", color: "#7f1d1d" }}
                      >
                        <i className="ri-task-line fs-13" />
                      </div>
                      <span className="fw-bold text-dark fs-12 text-uppercase" style={{ letterSpacing: "0.5px" }}>
                        Recent Tasks & Follow-ups
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-link p-0 text-decoration-none fs-12 fw-semibold"
                      onClick={() => setActiveTab("activities")}
                      style={{ color: THEME.primary }}
                    >
                      View All
                    </button>
                  </CardHeader>
                  <CardBody className="p-3 d-flex flex-column">
                    {tasksList.length === 0 ? (
                      <div className="text-center py-4 my-auto">
                        <div
                          className="d-inline-flex align-items-center justify-content-center mb-2 rounded-0"
                          style={{ width: "42px", height: "42px", backgroundColor: "#fef2f2", color: "#7f1d1d" }}
                        >
                          <i className="ri-checkbox-circle-line fs-20" />
                        </div>
                        <div className="fw-semibold text-dark fs-13 mb-1">All Caught Up</div>
                        <div className="text-muted fs-11 mb-3" style={{ maxWidth: "220px", margin: "0 auto" }}>
                          No pending tasks or follow-ups scheduled.
                        </div>
                        <Button
                          size="sm"
                          className="text-white fw-semibold rounded-0 px-3"
                          onClick={openActivityModal}
                          style={{ backgroundColor: THEME.primary, borderColor: THEME.primary, borderRadius: 0, fontSize: "11px" }}
                        >
                          + Log Follow-up
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="d-flex flex-column gap-2 flex-grow-1">
                          {tasksList.map((task, idx) => {
                            const taskId = task.taskId || task.id || idx;
                            return (
                              <div
                                key={taskId}
                                className="d-flex align-items-center justify-content-between p-2 border border-light"
                                style={{
                                  backgroundColor: task.completed ? "#f8fafc" : "#ffffff",
                                  borderRadius: 0,
                                }}
                              >
                                <div className="d-flex align-items-center gap-2 min-w-0">
                                  <input
                                    type="checkbox"
                                    className="form-check-input mt-0 rounded-0"
                                    checked={Boolean(task.completed)}
                                    onChange={() => toggleTask(taskId)}
                                    style={{ borderRadius: 0, cursor: "pointer" }}
                                  />
                                  <div className="min-w-0">
                                    <div
                                      className={`fs-12 fw-medium text-truncate ${
                                        task.completed ? "text-decoration-line-through text-muted" : "text-dark"
                                      }`}
                                      style={{ maxWidth: "180px" }}
                                      title={task.title}
                                    >
                                      {task.title}
                                    </div>
                                    <div className="text-muted fs-10">{task.dueDate || "No due date"}</div>
                                  </div>
                                </div>
                                <span
                                  className={`badge ${getPriorityBadgeClass(task.priority)} px-2 py-0.5 rounded-0 fs-10 fw-semibold`}
                                  style={{ borderRadius: 0 }}
                                >
                                  {task.priority || "MEDIUM"}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        <div className="pt-2 border-top mt-auto">
                          <Button
                            color="light"
                            size="sm"
                            className="w-100 border bg-white fw-semibold text-dark rounded-0"
                            onClick={openActivityModal}
                            style={{ borderColor: "#cbd5e1", borderRadius: 0 }}
                          >
                            + Log New Activity / Task
                          </Button>
                        </div>
                      </>
                    )}
                  </CardBody>
                </Card>
              </Col>
            </Row>

            {/* ROW 3: 360° RELATIONSHIP OVERVIEW STRIP (9 SQUARE METRIC CARDS) */}
            <div className="mt-4 mb-2">
              <div className="d-flex align-items-center gap-2 mb-3">
                <div
                  className="d-flex align-items-center justify-content-center rounded-0"
                  style={{ width: "24px", height: "24px", backgroundColor: "#fef2f2", color: "#7f1d1d" }}
                >
                  <i className="ri-dashboard-line fs-13" />
                </div>
                <h6 className="fw-bold text-dark fs-14 mb-0" style={{ letterSpacing: "-0.2px" }}>
                  360° Relationship Overview
                </h6>
              </div>
              <Row className="g-2">
                {/* 1. Activities */}
                <Col xl={true} lg={3} sm={4} xs={6}>
                  <Card className="border shadow-none bg-white rounded-0 h-100" style={{ borderColor: THEME.cardBorder, borderRadius: 0 }}>
                    <CardBody className="p-2.5 text-center">
                      <div className="text-muted fs-11 fw-semibold mb-1 d-flex align-items-center justify-content-center gap-1">
                        <i className="ri-calendar-event-line" style={{ color: THEME.primary }} /> Activities
                      </div>
                      <div className="fw-bold fs-16 text-dark">{kpis.activitiesCount || 0}</div>
                      <button
                        type="button"
                        onClick={() => setActiveTab("activities")}
                        className="btn btn-link p-0 fs-11 text-decoration-none mt-1 fw-medium"
                        style={{ color: THEME.primary }}
                      >
                        View All &rarr;
                      </button>
                    </CardBody>
                  </Card>
                </Col>

                {/* 2. Opportunities */}
                <Col xl={true} lg={3} sm={4} xs={6}>
                  <Card className="border shadow-none bg-white rounded-0 h-100" style={{ borderColor: THEME.cardBorder, borderRadius: 0 }}>
                    <CardBody className="p-2.5 text-center">
                      <div className="text-muted fs-11 fw-semibold mb-1 d-flex align-items-center justify-content-center gap-1">
                        <i className="ri-focus-3-line" style={{ color: "#7c3aed" }} /> Opportunities
                      </div>
                      <div className="fw-bold fs-16 text-dark">{kpis.opportunitiesCount || 0}</div>
                      <button
                        type="button"
                        onClick={() => setActiveTab("opportunities")}
                        className="btn btn-link p-0 fs-11 text-decoration-none mt-1 fw-medium"
                        style={{ color: THEME.primary }}
                      >
                        View All &rarr;
                      </button>
                    </CardBody>
                  </Card>
                </Col>

                {/* 3. Quotes */}
                <Col xl={true} lg={3} sm={4} xs={6}>
                  <Card className="border shadow-none bg-white rounded-0 h-100" style={{ borderColor: THEME.cardBorder, borderRadius: 0 }}>
                    <CardBody className="p-2.5 text-center">
                      <div className="text-muted fs-11 fw-semibold mb-1 d-flex align-items-center justify-content-center gap-1">
                        <i className="ri-file-text-line" style={{ color: "#0284c7" }} /> Quotes
                      </div>
                      <div className="fw-bold fs-16 text-dark">{kpis.quotesCount || 0}</div>
                      <button
                        type="button"
                        onClick={() => setActiveTab("quotes")}
                        className="btn btn-link p-0 fs-11 text-decoration-none mt-1 fw-medium"
                        style={{ color: THEME.primary }}
                      >
                        View All &rarr;
                      </button>
                    </CardBody>
                  </Card>
                </Col>

                {/* 4. Invoices */}
                <Col xl={true} lg={3} sm={4} xs={6}>
                  <Card className="border shadow-none bg-white rounded-0 h-100" style={{ borderColor: THEME.cardBorder, borderRadius: 0 }}>
                    <CardBody className="p-2.5 text-center">
                      <div className="text-muted fs-11 fw-semibold mb-1 d-flex align-items-center justify-content-center gap-1">
                        <i className="ri-bill-line" style={{ color: "#059669" }} /> Invoices
                      </div>
                      <div className="fw-bold fs-16 text-dark">{kpis.invoicesCount || 0}</div>
                      <button
                        type="button"
                        onClick={() => setActiveTab("invoices")}
                        className="btn btn-link p-0 fs-11 text-decoration-none mt-1 fw-medium"
                        style={{ color: THEME.primary }}
                      >
                        View All &rarr;
                      </button>
                    </CardBody>
                  </Card>
                </Col>

                {/* 5. Total Invoiced */}
                <Col xl={true} lg={3} sm={4} xs={6}>
                  <Card className="border shadow-none bg-white rounded-0 h-100" style={{ borderColor: THEME.cardBorder, borderRadius: 0 }}>
                    <CardBody className="p-2.5 text-center">
                      <div className="text-muted fs-11 fw-semibold mb-1 d-flex align-items-center justify-content-center gap-1">
                        <i className="ri-money-rupee-circle-line" style={{ color: "#059669" }} /> Total Invoiced
                      </div>
                      <div className="fw-bold fs-14 text-dark text-truncate">{formatInr(kpis.totalInvoiced)}</div>
                      <button
                        type="button"
                        onClick={() => setActiveTab("invoices")}
                        className="btn btn-link p-0 fs-11 text-decoration-none mt-1 fw-medium"
                        style={{ color: THEME.primary }}
                      >
                        View All &rarr;
                      </button>
                    </CardBody>
                  </Card>
                </Col>

                {/* 6. Outstanding */}
                <Col xl={true} lg={3} sm={4} xs={6}>
                  <Card className="border shadow-none bg-white rounded-0 h-100" style={{ borderColor: THEME.cardBorder, borderRadius: 0 }}>
                    <CardBody className="p-2.5 text-center">
                      <div className="text-muted fs-11 fw-semibold mb-1 d-flex align-items-center justify-content-center gap-1">
                        <i className="ri-alarm-warning-line" style={{ color: "#be123c" }} /> Outstanding
                      </div>
                      <div
                        className={`fw-bold fs-14 text-truncate ${
                          (kpis.totalOutstanding || 0) > 0 ? "text-danger" : "text-success"
                        }`}
                      >
                        {formatInr(kpis.totalOutstanding)}
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab("invoices")}
                        className="btn btn-link p-0 fs-11 text-decoration-none mt-1 fw-medium"
                        style={{ color: THEME.primary }}
                      >
                        View All &rarr;
                      </button>
                    </CardBody>
                  </Card>
                </Col>

                {/* 7. Tickets */}
                <Col xl={true} lg={3} sm={4} xs={6}>
                  <Card className="border shadow-none bg-white rounded-0 h-100" style={{ borderColor: THEME.cardBorder, borderRadius: 0 }}>
                    <CardBody className="p-2.5 text-center">
                      <div className="text-muted fs-11 fw-semibold mb-1 d-flex align-items-center justify-content-center gap-1">
                        <i className="ri-customer-service-2-line" style={{ color: "#2563eb" }} /> HelpDesk
                      </div>
                      <div className="fw-bold fs-16 text-dark">{kpis.ticketsCount || 0}</div>
                      <button
                        type="button"
                        onClick={() => setActiveTab("tickets")}
                        className="btn btn-link p-0 fs-11 text-decoration-none mt-1 fw-medium"
                        style={{ color: THEME.primary }}
                      >
                        View All &rarr;
                      </button>
                    </CardBody>
                  </Card>
                </Col>

                {/* 8. Documents */}
                <Col xl={true} lg={3} sm={4} xs={6}>
                  <Card className="border shadow-none bg-white rounded-0 h-100" style={{ borderColor: THEME.cardBorder, borderRadius: 0 }}>
                    <CardBody className="p-2.5 text-center">
                      <div className="text-muted fs-11 fw-semibold mb-1 d-flex align-items-center justify-content-center gap-1">
                        <i className="ri-folder-2-line" style={{ color: "#d97706" }} /> Documents
                      </div>
                      <div className="fw-bold fs-16 text-dark">{kpis.documentsCount || 0}</div>
                      <button
                        type="button"
                        onClick={() => setActiveTab("documents")}
                        className="btn btn-link p-0 fs-11 text-decoration-none mt-1 fw-medium"
                        style={{ color: THEME.primary }}
                      >
                        View All &rarr;
                      </button>
                    </CardBody>
                  </Card>
                </Col>

                {/* 9. Notes */}
                <Col xl={true} lg={3} sm={4} xs={6}>
                  <Card className="border shadow-none bg-white rounded-0 h-100" style={{ borderColor: THEME.cardBorder, borderRadius: 0 }}>
                    <CardBody className="p-2.5 text-center">
                      <div className="text-muted fs-11 fw-semibold mb-1 d-flex align-items-center justify-content-center gap-1">
                        <i className="ri-sticky-note-line" style={{ color: "#475569" }} /> Notes
                      </div>
                      <div className="fw-bold fs-16 text-dark">{kpis.notesCount || 0}</div>
                      <button
                        type="button"
                        onClick={() => setActiveTab("notes")}
                        className="btn btn-link p-0 fs-11 text-decoration-none mt-1 fw-medium"
                        style={{ color: THEME.primary }}
                      >
                        View All &rarr;
                      </button>
                    </CardBody>
                  </Card>
                </Col>
              </Row>
            </div>
          </TabPane>

          {/* TAB 2: ACTIVITIES */}
          <TabPane tabId="activities">
            <Card className="border shadow-none bg-white rounded-0" style={{ borderColor: THEME.cardBorder, borderRadius: 0 }}>
              <CardHeader
                className="py-3 px-3 d-flex justify-content-between align-items-center rounded-0 border-bottom"
                style={{ backgroundColor: THEME.headerBg, borderColor: THEME.cardBorder, borderRadius: 0 }}
              >
                <span className="fw-bold text-dark fs-13 text-uppercase">Communications & Activities Log</span>
                <Button
                  size="sm"
                  className="text-white fw-semibold rounded-0"
                  onClick={openActivityModal}
                  style={{ backgroundColor: THEME.primary, borderColor: THEME.primary, borderRadius: 0 }}
                >
                  + Log Activity
                </Button>
              </CardHeader>
              <CardBody className="p-3">
                {activities.length === 0 ? (
                  <div className="text-center py-5">
                    <i className="ri-chat-voice-line fs-32 text-muted mb-2 d-block" />
                    <div className="text-muted fs-13">No logged activities or communications found.</div>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <Table className="table-sm table-hover align-middle mb-0 fs-12">
                      <thead className="table-light">
                        <tr>
                          <th>Type</th>
                          <th>Subject</th>
                          <th>Employee</th>
                          <th>Date & Time</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activities.map((a, idx) => {
                          const meta = getActivityTypeMeta(a.actType);
                          return (
                            <tr key={idx}>
                              <td>
                                <span
                                  className="badge px-2 py-0.5 rounded-0 fs-11 fw-semibold"
                                  style={{ backgroundColor: meta.bg, color: meta.color, border: `1px solid ${meta.bg}`, borderRadius: 0 }}
                                >
                                  {meta.label}
                                </span>
                              </td>
                              <td className="fw-semibold text-dark">{a.subject}</td>
                              <td>{a.employeeName || "—"}</td>
                              <td className="text-muted">{formatDate(a.startTime)}</td>
                              <td>
                                <span
                                  className="badge bg-success-subtle text-success border border-success-subtle px-2 py-0.5 rounded-0 fs-11 fw-semibold"
                                  style={{ borderRadius: 0 }}
                                >
                                  {a.status || "Completed"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </Table>
                  </div>
                )}
              </CardBody>
            </Card>
          </TabPane>

          {/* TAB 3: OPPORTUNITIES */}
          <TabPane tabId="opportunities">
            <Card className="border shadow-none bg-white rounded-0" style={{ borderColor: THEME.cardBorder, borderRadius: 0 }}>
              <CardHeader
                className="py-3 px-3 d-flex justify-content-between align-items-center rounded-0 border-bottom"
                style={{ backgroundColor: THEME.headerBg, borderColor: THEME.cardBorder, borderRadius: 0 }}
              >
                <span className="fw-bold text-dark fs-13 text-uppercase">Opportunities & Deals</span>
                <Button
                  size="sm"
                  className="text-white fw-semibold rounded-0"
                  onClick={() => navigate("/crm/pipeline")}
                  style={{ backgroundColor: THEME.primary, borderColor: THEME.primary, borderRadius: 0 }}
                >
                  + New Opportunity
                </Button>
              </CardHeader>
              <CardBody className="p-3">
                {opportunities.length === 0 ? (
                  <div className="text-center py-5">
                    <i className="ri-briefcase-line fs-32 text-muted mb-2 d-block" />
                    <div className="text-muted fs-13">No opportunities found for this contact.</div>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <Table className="table-sm table-hover align-middle mb-0 fs-12">
                      <thead className="table-light">
                        <tr>
                          <th>Opportunity Name</th>
                          <th>Stage</th>
                          <th>Probability</th>
                          <th>Amount</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {opportunities.map((opp, idx) => {
                          return (
                            <tr key={idx}>
                              <td className="fw-semibold text-dark">{opp.name}</td>
                              <td>
                                <span
                                  className={`badge ${getStageBadgeClass(opp.stage)} px-2.5 py-1 rounded-0 fs-11 fw-semibold`}
                                  style={{ borderRadius: 0 }}
                                >
                                  {opp.stage || "New"}
                                </span>
                              </td>
                              <td>{opp.probability || 0}%</td>
                              <td className="fw-bold text-dark">{formatInr(opp.amount)}</td>
                              <td>
                                <Link
                                  to={`/crm/opportunities/${opp.opportunityId || ""}`}
                                  className="btn btn-sm btn-light border py-0 px-2 rounded-0 fs-11"
                                  style={{ borderRadius: 0 }}
                                >
                                  View Deal
                                </Link>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </Table>
                  </div>
                )}
              </CardBody>
            </Card>
          </TabPane>

          {/* TAB 4: QUOTES */}
          <TabPane tabId="quotes">
            <Card className="border shadow-none bg-white rounded-0" style={{ borderColor: THEME.cardBorder, borderRadius: 0 }}>
              <CardHeader
                className="py-3 px-3 d-flex justify-content-between align-items-center rounded-0 border-bottom"
                style={{ backgroundColor: THEME.headerBg, borderColor: THEME.cardBorder, borderRadius: 0 }}
              >
                <span className="fw-bold text-dark fs-13 text-uppercase">Quotations & Proposals</span>
              </CardHeader>
              <CardBody className="p-3">
                <div className="text-center py-5">
                  <i className="ri-file-text-line fs-32 text-muted mb-2 d-block" />
                  <div className="text-muted fs-13">No formal quotes currently generated.</div>
                </div>
              </CardBody>
            </Card>
          </TabPane>

          {/* TAB 5: INVOICES */}
          <TabPane tabId="invoices">
            <Card className="border shadow-none bg-white rounded-0" style={{ borderColor: THEME.cardBorder, borderRadius: 0 }}>
              <CardHeader
                className="py-3 px-3 d-flex justify-content-between align-items-center rounded-0 border-bottom"
                style={{ backgroundColor: THEME.headerBg, borderColor: THEME.cardBorder, borderRadius: 0 }}
              >
                <span className="fw-bold text-dark fs-13 text-uppercase">Account Invoices</span>
              </CardHeader>
              <CardBody className="p-3">
                {invoices.length === 0 ? (
                  <div className="text-center py-5">
                    <i className="ri-bill-line fs-32 text-muted mb-2 d-block" />
                    <div className="text-muted fs-13">No invoices generated for this customer account.</div>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <Table className="table-sm table-hover align-middle mb-0 fs-12">
                      <thead className="table-light">
                        <tr>
                          <th>Invoice No</th>
                          <th>Date</th>
                          <th>Amount</th>
                          <th>Outstanding</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.map((inv, idx) => {
                          const isPaid = String(inv.status).toLowerCase() === "paid";
                          return (
                            <tr key={idx}>
                              <td className="fw-semibold" style={{ color: THEME.primary }}>{inv.invoiceNo}</td>
                              <td>{formatDate(inv.invoiceDate)}</td>
                              <td className="fw-bold text-dark">{formatInr(inv.amount)}</td>
                              <td className={isPaid ? "text-muted" : "text-danger fw-bold"}>
                                {isPaid ? "₹ 0" : formatInr(inv.outstanding || inv.amount)}
                              </td>
                              <td>
                                <span
                                  className={`badge ${
                                    isPaid
                                      ? "bg-success-subtle text-success border border-success-subtle"
                                      : "bg-danger-subtle text-danger border border-danger-subtle"
                                  } px-2.5 py-1 rounded-0 fs-11 fw-semibold`}
                                  style={{ borderRadius: 0 }}
                                >
                                  {inv.status || (isPaid ? "Paid" : "Pending")}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </Table>
                  </div>
                )}
              </CardBody>
            </Card>
          </TabPane>

          {/* TAB 6: TICKETS */}
          <TabPane tabId="tickets">
            <Card className="border shadow-none bg-white rounded-0" style={{ borderColor: THEME.cardBorder, borderRadius: 0 }}>
              <CardHeader
                className="py-3 px-3 d-flex justify-content-between align-items-center rounded-0 border-bottom"
                style={{ backgroundColor: THEME.headerBg, borderColor: THEME.cardBorder, borderRadius: 0 }}
              >
                <span className="fw-bold text-dark fs-13 text-uppercase">Support & HelpDesk Tickets</span>
              </CardHeader>
              <CardBody className="p-3">
                <div className="text-center py-5">
                  <i className="ri-customer-service-2-line fs-32 text-muted mb-2 d-block" />
                  <div className="text-muted fs-13">No open support tickets for this contact.</div>
                </div>
              </CardBody>
            </Card>
          </TabPane>

          {/* TAB 7: DOCUMENTS */}
          <TabPane tabId="documents">
            <Card className="border shadow-none bg-white rounded-0" style={{ borderColor: THEME.cardBorder, borderRadius: 0 }}>
              <CardHeader
                className="py-3 px-3 d-flex justify-content-between align-items-center rounded-0 border-bottom"
                style={{ backgroundColor: THEME.headerBg, borderColor: THEME.cardBorder, borderRadius: 0 }}
              >
                <span className="fw-bold text-dark fs-13 text-uppercase">Attached Documents & Files</span>
                <Button
                  size="sm"
                  className="text-white fw-semibold rounded-0"
                  onClick={() => navigate("/crm/documents")}
                  style={{ backgroundColor: THEME.primary, borderColor: THEME.primary, borderRadius: 0 }}
                >
                  Manage Documents
                </Button>
              </CardHeader>
              <CardBody className="p-3">
                <div className="text-center py-5">
                  <i className="ri-folder-2-line fs-32 text-muted mb-2 d-block" />
                  <div className="text-muted fs-13">No document attachments uploaded for this contact.</div>
                </div>
              </CardBody>
            </Card>
          </TabPane>

          {/* TAB 8: NOTES */}
          <TabPane tabId="notes">
            <Card className="border shadow-none bg-white rounded-0" style={{ borderColor: THEME.cardBorder, borderRadius: 0 }}>
              <CardHeader
                className="py-3 px-3 d-flex justify-content-between align-items-center rounded-0 border-bottom"
                style={{ backgroundColor: THEME.headerBg, borderColor: THEME.cardBorder, borderRadius: 0 }}
              >
                <span className="fw-bold text-dark fs-13 text-uppercase">Meeting Memos & Relationship Notes</span>
              </CardHeader>
              <CardBody className="p-3">
                {keyInformation.notes ? (
                  <div className="p-3 border border-light" style={{ backgroundColor: "#fafaf9", borderRadius: 0 }}>
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="fw-bold text-dark fs-13">{contact.ownerName || "Assigned Rep"}</span>
                      <span className="text-muted fs-11">{formatDate(contact.createdOn)}</span>
                    </div>
                    <p className="text-muted fs-12 mb-0">{keyInformation.notes}</p>
                  </div>
                ) : (
                  <div className="text-center py-5">
                    <i className="ri-sticky-note-line fs-32 text-muted mb-2 d-block" />
                    <div className="text-muted fs-13">No relationship memos recorded.</div>
                  </div>
                )}
              </CardBody>
            </Card>
          </TabPane>

          {/* TAB 9: FULL TIMELINE */}
          <TabPane tabId="timeline">
            <Card className="border shadow-none bg-white rounded-0" style={{ borderColor: THEME.cardBorder, borderRadius: 0 }}>
              <CardHeader
                className="py-3 px-3 rounded-0 border-bottom"
                style={{ backgroundColor: THEME.headerBg, borderColor: THEME.cardBorder, borderRadius: 0 }}
              >
                <span className="fw-bold text-dark fs-13 text-uppercase">Complete Activity Timeline</span>
              </CardHeader>
              <CardBody className="p-4">
                {activities.length === 0 ? (
                  <div className="text-center py-5">
                    <i className="ri-time-line fs-32 text-muted mb-2 d-block" />
                    <div className="text-muted fs-13">No historical activity timeline available.</div>
                  </div>
                ) : (
                  <div className="position-relative ps-4">
                    <div
                      className="position-absolute"
                      style={{
                        left: "14px",
                        top: "8px",
                        bottom: "8px",
                        width: "2px",
                        backgroundColor: "#e2e8f0",
                      }}
                    />
                    <div className="d-flex flex-column gap-4">
                      {activities.map((act, idx) => {
                        const meta = getActivityTypeMeta(act.actType);
                        return (
                          <div key={idx} className="position-relative">
                            <div
                              className="position-absolute d-flex align-items-center justify-content-center rounded-0"
                              style={{
                                left: "-28px",
                                top: "0",
                                width: "28px",
                                height: "28px",
                                backgroundColor: meta.bg,
                                color: meta.color,
                                border: `1px solid ${meta.bg}`,
                                borderRadius: 0,
                              }}
                            >
                              <i className={meta.icon} />
                            </div>
                            <div className="ps-2">
                              <span className="text-muted fs-11">{formatDate(act.startTime)}</span>
                              <h6 className="fw-bold text-dark fs-13 mb-1 mt-1">
                                {meta.label}: {act.subject}
                              </h6>
                              <p className="text-muted fs-12 mb-0">
                                {act.employeeName ? `Logged by ${act.employeeName}` : "Activity logged"}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>
          </TabPane>
        </TabContent>
      </Container>

      {/* ======================================================== */}
      {/* MODAL 1: EDIT CONTACT MODAL (SQUARE GEOMETRY)            */}
      {/* ======================================================== */}
      <Modal
        isOpen={editModalOpen}
        toggle={() => setEditModalOpen(!editModalOpen)}
        centered
        className="rounded-0"
        contentClassName="rounded-0"
      >
        <ModalHeader
          toggle={() => setEditModalOpen(false)}
          className="border-bottom rounded-0"
          style={{ borderRadius: 0 }}
        >
          <span className="fw-bold text-dark fs-15">Edit Contact Details</span>
        </ModalHeader>
        <Form onSubmit={handleEditSubmit}>
          <ModalBody className="p-3">
            <Row className="g-2">
              <Col md={4}>
                <FormGroup>
                  <Label className="fs-12 fw-semibold text-muted">Salutation</Label>
                  <Input
                    type="select"
                    className="form-select-sm rounded-0"
                    value={editForm.salutation}
                    onChange={(e) => setEditForm({ ...editForm, salutation: e.target.value })}
                    style={{ borderRadius: 0 }}
                  >
                    <option value="Mr.">Mr.</option>
                    <option value="Ms.">Ms.</option>
                    <option value="Mrs.">Mrs.</option>
                    <option value="Dr.">Dr.</option>
                  </Input>
                </FormGroup>
              </Col>
              <Col md={8}>
                <FormGroup>
                  <Label className="fs-12 fw-semibold text-muted">First Name *</Label>
                  <Input
                    type="text"
                    className="form-control-sm rounded-0"
                    required
                    value={editForm.firstName}
                    onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                    style={{ borderRadius: 0 }}
                  />
                </FormGroup>
              </Col>
              <Col md={12}>
                <FormGroup>
                  <Label className="fs-12 fw-semibold text-muted">Last Name</Label>
                  <Input
                    type="text"
                    className="form-control-sm rounded-0"
                    value={editForm.lastName}
                    onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                    style={{ borderRadius: 0 }}
                  />
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label className="fs-12 fw-semibold text-muted">Mobile Number *</Label>
                  <Input
                    type="text"
                    className="form-control-sm rounded-0"
                    required
                    value={editForm.mobile}
                    onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
                    style={{ borderRadius: 0 }}
                  />
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label className="fs-12 fw-semibold text-muted">Work / Office Phone</Label>
                  <Input
                    type="text"
                    className="form-control-sm rounded-0"
                    value={editForm.workPhone}
                    onChange={(e) => setEditForm({ ...editForm, workPhone: e.target.value })}
                    style={{ borderRadius: 0 }}
                  />
                </FormGroup>
              </Col>
              <Col md={12}>
                <FormGroup>
                  <Label className="fs-12 fw-semibold text-muted">Email Address</Label>
                  <Input
                    type="email"
                    className="form-control-sm rounded-0"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    style={{ borderRadius: 0 }}
                  />
                </FormGroup>
              </Col>
              <Col md={12}>
                <div className="form-check mt-1">
                  <Input
                    type="checkbox"
                    className="form-check-input rounded-0"
                    id="editIsPrimary"
                    checked={editForm.isPrimary}
                    onChange={(e) => setEditForm({ ...editForm, isPrimary: e.target.checked })}
                    style={{ borderRadius: 0 }}
                  />
                  <Label htmlFor="editIsPrimary" className="form-check-label fs-12 fw-semibold text-dark">
                    Set as Primary Contact for this Customer Account
                  </Label>
                </div>
              </Col>
            </Row>
          </ModalBody>
          <ModalFooter className="border-top rounded-0" style={{ borderRadius: 0 }}>
            <Button
              color="light"
              size="sm"
              className="border rounded-0"
              onClick={() => setEditModalOpen(false)}
              disabled={editSubmitting}
              style={{ borderRadius: 0 }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              type="submit"
              className="text-white fw-semibold rounded-0"
              disabled={editSubmitting}
              style={{ backgroundColor: THEME.primary, borderColor: THEME.primary, borderRadius: 0 }}
            >
              {editSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </ModalFooter>
        </Form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 2: LOG ACTIVITY MODAL (SQUARE GEOMETRY)            */}
      {/* ======================================================== */}
      <Modal
        isOpen={activityModalOpen}
        toggle={() => setActivityModalOpen(!activityModalOpen)}
        centered
        className="rounded-0"
        contentClassName="rounded-0"
      >
        <ModalHeader
          toggle={() => setActivityModalOpen(false)}
          className="border-bottom rounded-0"
          style={{ borderRadius: 0 }}
        >
          <span className="fw-bold text-dark fs-15">+ Log New Activity</span>
        </ModalHeader>
        <Form onSubmit={handleActivitySubmit}>
          <ModalBody className="p-3">
            <FormGroup>
              <Label className="fs-12 fw-semibold text-muted">Activity Type *</Label>
              <Input
                type="select"
                className="form-select-sm rounded-0"
                value={activityForm.actType}
                onChange={(e) => setActivityForm({ ...activityForm, actType: e.target.value })}
                style={{ borderRadius: 0 }}
              >
                <option value="CALL">Phone Call</option>
                <option value="MEETING">Meeting</option>
                <option value="EMAIL">Email</option>
                <option value="DEMO">Product Demo</option>
                <option value="VISIT">Client Visit</option>
              </Input>
            </FormGroup>
            <FormGroup>
              <Label className="fs-12 fw-semibold text-muted">Subject / Summary *</Label>
              <Input
                type="text"
                className="form-control-sm rounded-0"
                required
                value={activityForm.subject}
                onChange={(e) => setActivityForm({ ...activityForm, subject: e.target.value })}
                placeholder="e.g. Discussed pricing proposal"
                style={{ borderRadius: 0 }}
              />
            </FormGroup>
            <Row className="g-2">
              <Col md={6}>
                <FormGroup>
                  <Label className="fs-12 fw-semibold text-muted">Date & Time</Label>
                  <Input
                    type="datetime-local"
                    className="form-control-sm rounded-0"
                    value={activityForm.startTime}
                    onChange={(e) => setActivityForm({ ...activityForm, startTime: e.target.value })}
                    style={{ borderRadius: 0 }}
                  />
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label className="fs-12 fw-semibold text-muted">Phone Number</Label>
                  <Input
                    type="text"
                    className="form-control-sm rounded-0"
                    value={activityForm.phoneNumber}
                    onChange={(e) => setActivityForm({ ...activityForm, phoneNumber: e.target.value })}
                    style={{ borderRadius: 0 }}
                  />
                </FormGroup>
              </Col>
            </Row>
            <FormGroup className="mb-0">
              <Label className="fs-12 fw-semibold text-muted">Detailed Notes</Label>
              <Input
                type="textarea"
                rows={3}
                className="form-control-sm rounded-0"
                value={activityForm.notes}
                onChange={(e) => setActivityForm({ ...activityForm, notes: e.target.value })}
                placeholder="Notes on client requirements, objections, or next steps..."
                style={{ borderRadius: 0 }}
              />
            </FormGroup>
          </ModalBody>
          <ModalFooter className="border-top rounded-0" style={{ borderRadius: 0 }}>
            <Button
              color="light"
              size="sm"
              className="border rounded-0"
              onClick={() => setActivityModalOpen(false)}
              disabled={activitySubmitting}
              style={{ borderRadius: 0 }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              type="submit"
              className="text-white fw-semibold rounded-0"
              disabled={activitySubmitting}
              style={{ backgroundColor: THEME.primary, borderColor: THEME.primary, borderRadius: 0 }}
            >
              {activitySubmitting ? "Logging..." : "Log Activity"}
            </Button>
          </ModalFooter>
        </Form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 3: SEND EMAIL MODAL (SQUARE GEOMETRY)              */}
      {/* ======================================================== */}
      <Modal
        isOpen={emailModalOpen}
        toggle={() => setEmailModalOpen(!emailModalOpen)}
        centered
        className="rounded-0"
        contentClassName="rounded-0"
      >
        <ModalHeader
          toggle={() => setEmailModalOpen(false)}
          className="border-bottom rounded-0"
          style={{ borderRadius: 0 }}
        >
          <span className="fw-bold text-dark fs-15">Send Email to {titleName}</span>
        </ModalHeader>
        <Form onSubmit={handleSendEmailSubmit}>
          <ModalBody className="p-3">
            <FormGroup>
              <Label className="fs-12 fw-semibold text-muted">To *</Label>
              <Input
                type="email"
                className="form-control-sm rounded-0"
                required
                value={emailForm.to}
                onChange={(e) => setEmailForm({ ...emailForm, to: e.target.value })}
                style={{ borderRadius: 0 }}
              />
            </FormGroup>
            <FormGroup>
              <Label className="fs-12 fw-semibold text-muted">Subject *</Label>
              <Input
                type="text"
                className="form-control-sm rounded-0"
                required
                value={emailForm.subject}
                onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                style={{ borderRadius: 0 }}
              />
            </FormGroup>
            <FormGroup className="mb-0">
              <Label className="fs-12 fw-semibold text-muted">Message Body</Label>
              <Input
                type="textarea"
                rows={5}
                className="form-control-sm rounded-0"
                value={emailForm.message}
                onChange={(e) => setEmailForm({ ...emailForm, message: e.target.value })}
                style={{ borderRadius: 0 }}
              />
            </FormGroup>
          </ModalBody>
          <ModalFooter className="border-top rounded-0" style={{ borderRadius: 0 }}>
            <Button
              color="light"
              size="sm"
              className="border rounded-0"
              onClick={() => setEmailModalOpen(false)}
              style={{ borderRadius: 0 }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              type="submit"
              className="text-white fw-semibold rounded-0"
              style={{ backgroundColor: THEME.primary, borderColor: THEME.primary, borderRadius: 0 }}
            >
              <i className="ri-send-plane-fill me-1" /> Send via Mail Client
            </Button>
          </ModalFooter>
        </Form>
      </Modal>
    </div>
  );
};

export default ContactDetail;
