import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  CardBody,
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
  Nav,
  NavItem,
  NavLink,
  Row,
  Spinner,
  TabContent,
  TabPane,
  Table,
} from "reactstrap";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  getOpportunityById,
  updateOpportunity,
  moveOpportunityStage,
  getOpportunityLookups,
  deactivateOpportunity,
} from "../../../helpers/crmOpportunityApi";
import { getCustomerDropdown } from "../../../helpers/crmCustomerApi";
import { getOwnerDropdown } from "../../../helpers/crmOwnerApi";
import { createTask, completeTask } from "../../../helpers/crmTaskApi";
import { createActivity } from "../../../helpers/crmActivityApi";
import { createContact } from "../../../helpers/crmContactApi";
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

// Avatar initials from name
const getInitials = (name) => {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const OpportunityDetail = () => {
  const { opportunityId } = useParams();
  const navigate = useNavigate();

  // Opportunity Record State (100% from PostgreSQL database)
  const [opp, setOpp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  // Stage Move Dropdown State & Actions Menu State
  const [stageMenuOpen, setStageMenuOpen] = useState(false);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [movingStage, setMovingStage] = useState(false);

  // Dynamic Lookup and Master Options from database
  const [ownersList, setOwnersList] = useState([]);
  const [customersList, setCustomersList] = useState([]);
  const [lookupStages, setLookupStages] = useState([]);
  const [lookupSources, setLookupSources] = useState([]);
  const [lookupTypes, setLookupTypes] = useState([]);
  const [lookupPriorities, setLookupPriorities] = useState([]);

  // Local interactive state for task completion toggles
  const [localTasks, setLocalTasks] = useState([]);

  // Dynamic interactive state for extra Team Members, Competitors & Quotes
  const [extraTeamMembers, setExtraTeamMembers] = useState([]);
  const [competitors, setCompetitors] = useState([]);
  const [quotesList, setQuotesList] = useState([]);

  // Edit Opportunity Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    accountId: "",
    amount: "",
    probability: "10",
    expectedCloseDate: "",
    ownerEmployeeId: "",
    stageId: "",
    opportunityTypeId: "",
    sourceId: "",
    priorityId: "",
    closedReason: "",
    nextStep: "",
  });

  // Add Next Step / Task Modal State
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskSubmitting, setTaskSubmitting] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: "",
    dueDate: new Date().toISOString().slice(0, 10),
    priority: "MEDIUM",
  });

  // Add Activity Modal State
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [activitySubmitting, setActivitySubmitting] = useState(false);
  const [activityForm, setActivityForm] = useState({
    subject: "",
    actType: "CALL",
    notes: "",
    phoneNumber: "",
    startTime: new Date().toISOString().slice(0, 16),
    durationMinutes: 30,
  });

  // Add Contact Modal State
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactForm, setContactForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    mobile: "",
    isPrimary: false,
  });

  // Create Quote Modal State
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [quoteForm, setQuoteForm] = useState({
    quoteNo: "",
    expiryDate: "",
    status: "Sent",
  });

  // Add Team Member Modal State
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [newMemberId, setNewMemberId] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("Sales Executive");

  // Add Competitor Modal State
  const [competitorModalOpen, setCompetitorModalOpen] = useState(false);
  const [newCompetitorName, setNewCompetitorName] = useState("");
  const [newCompetitorThreat, setNewCompetitorThreat] = useState("Medium");

  // Note posting state
  const [newNoteText, setNewNoteText] = useState("");
  const [noteSubmitting, setNoteSubmitting] = useState(false);

  document.title = opp?.name
    ? `${opp.name} | SoftOnCloud CRM`
    : "Opportunity Details | SoftOnCloud CRM";

  // Load Opportunity Details from API (100% dynamic from PostgreSQL fn_crm_opportunity)
  const loadOpportunity = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getOpportunityById(opportunityId);
      if (!data) {
        setError("Opportunity not found in database.");
        setOpp(null);
        return;
      }
      setOpp(data);

      // Initialize next steps checklist strictly from database tasks
      if (data.nextSteps && data.nextSteps.length > 0) {
        setLocalTasks(data.nextSteps);
      } else if (data.nextStep) {
        setLocalTasks([
          {
            taskId: null,
            title: data.nextStep,
            finishDate: data.expectedCloseDate,
            assigneeName: data.ownerName || "Deal Owner",
            status: "PENDING",
          },
        ]);
      } else {
        setLocalTasks([]);
      }
    } catch (err) {
      setError(err?.message || "Failed to load opportunity from database.");
      toastApiError(err, "Failed to load opportunity.");
    } finally {
      setLoading(false);
    }
  }, [opportunityId]);

  useEffect(() => {
    loadOpportunity();
  }, [loadOpportunity]);

  // Load Dropdowns & Lookups from database
  useEffect(() => {
    getOwnerDropdown({ ensureSeed: true })
      .then((res) => {
        const list = res?.owners || res?.Owners || res || [];
        setOwnersList(Array.isArray(list) ? list : []);
      })
      .catch(() => setOwnersList([]));

    getCustomerDropdown()
      .then((res) => {
        const list = res?.customers || res?.Customers || res || [];
        setCustomersList(Array.isArray(list) ? list : []);
      })
      .catch(() => setCustomersList([]));

    getOpportunityLookups()
      .then((res) => {
        const sList = res?.opportunityStage || res?.OpportunityStage || [];
        setLookupStages(Array.isArray(sList) ? sList : []);

        const srcList = res?.leadSource || res?.LeadSource || [];
        setLookupSources(Array.isArray(srcList) ? srcList : []);

        const tList = res?.opportunityType || res?.OpportunityType || [];
        setLookupTypes(Array.isArray(tList) ? tList : []);

        const pList = res?.priority || res?.Priority || [];
        setLookupPriorities(Array.isArray(pList) ? pList : []);
      })
      .catch(() => setLookupStages([]));
  }, []);

  // Stage Stepper Progress (from database stages)
  const stagesList = useMemo(() => {
    if (opp?.stagesList && opp.stagesList.length > 0) {
      return opp.stagesList;
    }
    if (lookupStages && lookupStages.length > 0) {
      return lookupStages.map((s) => ({
        stageId: s.masterId,
        stageCode: s.masterCode,
        stageName: s.masterName,
        sortOrder: s.sortOrder,
      }));
    }
    return [];
  }, [opp, lookupStages]);

  const currentStageSortOrder = useMemo(() => {
    const cur = stagesList.find(
      (s) => Number(s.stageId) === Number(opp?.stageId)
    );
    return cur ? cur.sortOrder : 10;
  }, [stagesList, opp]);

  // Handle Stage Change
  const handleStageChange = async (targetStageId) => {
    if (!opp?.opportunityId || Number(targetStageId) === Number(opp.stageId)) return;
    setMovingStage(true);
    try {
      await moveOpportunityStage(opp.opportunityId, targetStageId);
      const stObj = stagesList.find((s) => Number(s.stageId) === Number(targetStageId));
      toastSuccess(`Stage updated to ${stObj?.stageName || "new stage"}`);
      await loadOpportunity();
    } catch (err) {
      toastApiError(err, "Failed to move stage.");
    } finally {
      setMovingStage(false);
    }
  };

  // Convert to Closed Won Action
  const handleConvertToWon = async () => {
    const wonStage = stagesList.find(
      (s) => String(s.stageCode).toUpperCase() === "CLOSED_WON"
    );
    if (!wonStage) {
      toastApiError(null, "Closed Won stage is not configured in database.");
      return;
    }
    await handleStageChange(wonStage.stageId);
  };

  // Open Edit Modal
  const openEditModal = () => {
    if (!opp) return;
    setEditForm({
      name: opp.name || "",
      accountId: opp.accountId ? String(opp.accountId) : "",
      amount: opp.amount != null ? String(opp.amount) : "",
      probability: opp.probability != null ? String(opp.probability) : "10",
      expectedCloseDate: opp.expectedCloseDate
        ? String(opp.expectedCloseDate).slice(0, 10)
        : "",
      ownerEmployeeId: opp.ownerEmployeeId ? String(opp.ownerEmployeeId) : "",
      stageId: opp.stageId ? String(opp.stageId) : "",
      opportunityTypeId: opp.opportunityTypeId ? String(opp.opportunityTypeId) : "",
      sourceId: opp.sourceId ? String(opp.sourceId) : "",
      priorityId: opp.priorityId ? String(opp.priorityId) : "",
      closedReason: opp.closedReason || "",
      nextStep: opp.nextStep || "",
    });
    setEditModalOpen(true);
  };

  // Submit Edit Form to Database
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.name.trim()) {
      toastApiError(null, "Opportunity name is required.");
      return;
    }
    if (!editForm.accountId) {
      toastApiError(null, "Customer account is required.");
      return;
    }

    setEditSubmitting(true);
    try {
      await updateOpportunity(opp.opportunityId, {
        name: editForm.name.trim(),
        accountId: Number(editForm.accountId),
        stageId: Number(editForm.stageId || opp.stageId),
        opportunityTypeId: editForm.opportunityTypeId ? Number(editForm.opportunityTypeId) : null,
        sourceId: editForm.sourceId ? Number(editForm.sourceId) : null,
        priorityId: editForm.priorityId ? Number(editForm.priorityId) : null,
        amount: editForm.amount ? Number(editForm.amount) : 0,
        probability: editForm.probability ? Number(editForm.probability) : 10,
        expectedCloseDate: editForm.expectedCloseDate || null,
        ownerEmployeeId: editForm.ownerEmployeeId ? Number(editForm.ownerEmployeeId) : null,
        closedReason: editForm.closedReason || null,
        nextStep: editForm.nextStep || null,
      });

      toastSuccess("Opportunity updated successfully in database.");
      setEditModalOpen(false);
      await loadOpportunity();
    } catch (err) {
      toastApiError(err, "Failed to update opportunity.");
    } finally {
      setEditSubmitting(false);
    }
  };

  // Toggle Task Completion State interactively
  const handleToggleTask = (task) => {
    const isCompleted = String(task.status).toUpperCase() === "COMPLETED";
    const nextStatus = isCompleted ? "PENDING" : "COMPLETED";

    setLocalTasks((prev) =>
      prev.map((t) => (t.taskId === task.taskId ? { ...t, status: nextStatus } : t))
    );

    if (task.taskId && !isCompleted) {
      completeTask(task.taskId)
        .then(() => toastSuccess(`Task "${task.title}" completed!`))
        .catch(() => {});
    }
  };

  // Add Next Step / Task Submit to tab_task_detail in database
  const handleAddTaskSubmit = async (e) => {
    e.preventDefault();
    if (!taskForm.title.trim()) {
      toastApiError(null, "Task title is required.");
      return;
    }

    setTaskSubmitting(true);
    try {
      await createTask({
        title: `[${opp?.name || "Deal"}] ${taskForm.title.trim()}`,
        dueDate: taskForm.dueDate || null,
        priority: taskForm.priority || "MEDIUM",
        taskType: "FOLLOW_UP",
        employeeId: opp?.ownerEmployeeId ? Number(opp.ownerEmployeeId) : undefined,
        notes: `Opportunity ID: ${opp?.opportunityId}`,
      });

      toastSuccess("Follow-up task saved to database.");
      setTaskModalOpen(false);
      setTaskForm({
        title: "",
        dueDate: new Date().toISOString().slice(0, 10),
        priority: "MEDIUM",
      });
      await loadOpportunity();
    } catch (err) {
      toastApiError(err, "Failed to create task.");
    } finally {
      setTaskSubmitting(false);
    }
  };

  // Add Activity Submit to tab_employee_activities in database
  const handleAddActivitySubmit = async (e) => {
    e.preventDefault();
    if (!activityForm.subject.trim()) {
      toastApiError(null, "Subject is required.");
      return;
    }

    setActivitySubmitting(true);
    try {
      await createActivity({
        subject: `[${opp?.name || "Deal"}] ${activityForm.subject.trim()}`,
        actType: activityForm.actType || "CALL",
        startTime: activityForm.startTime ? new Date(activityForm.startTime).toISOString() : new Date().toISOString(),
        callNumber: activityForm.phoneNumber || undefined,
        callNotes: activityForm.notes || undefined,
        employeeId: opp?.ownerEmployeeId ? Number(opp.ownerEmployeeId) : undefined,
      });

      toastSuccess("Activity saved to database.");
      setActivityModalOpen(false);
      setActivityForm({
        subject: "",
        actType: "CALL",
        notes: "",
        phoneNumber: "",
        startTime: new Date().toISOString().slice(0, 16),
        durationMinutes: 30,
      });
      await loadOpportunity();
    } catch (err) {
      toastApiError(err, "Failed to log activity.");
    } finally {
      setActivitySubmitting(false);
    }
  };

  // Add Contact Person Submit to tab_party_contact_persons in database
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
        accountId: opp.accountId,
        firstName: contactForm.firstName.trim(),
        lastName: contactForm.lastName.trim() || undefined,
        email: contactForm.email.trim() || undefined,
        mobile: contactForm.mobile.trim(),
        isPrimary: contactForm.isPrimary,
      });

      toastSuccess("Contact person saved to database.");
      setContactModalOpen(false);
      setContactForm({
        firstName: "",
        lastName: "",
        email: "",
        mobile: "",
        isPrimary: false,
      });
      await loadOpportunity();
    } catch (err) {
      toastApiError(err, "Failed to add contact.");
    } finally {
      setContactSubmitting(false);
    }
  };

  // Save Note to Database (updates closed_reason in tab_opportunity)
  const handlePostNoteSubmit = async (e) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    setNoteSubmitting(true);
    try {
      const existing = opp.closedReason ? `${opp.closedReason}\n\n` : "";
      const updatedNotes = `${existing}[${new Date().toLocaleDateString("en-GB")}] ${newNoteText.trim()}`;

      await updateOpportunity(opp.opportunityId, {
        name: opp.name,
        accountId: opp.accountId,
        stageId: opp.stageId,
        amount: opp.amount,
        probability: opp.probability,
        expectedCloseDate: opp.expectedCloseDate,
        ownerEmployeeId: opp.ownerEmployeeId,
        closedReason: updatedNotes,
      });

      toastSuccess("Note saved to database.");
      setNewNoteText("");
      await loadOpportunity();
    } catch (err) {
      toastApiError(err, "Failed to save note.");
    } finally {
      setNoteSubmitting(false);
    }
  };

  // Dynamic Deal Team Members (from database owner + real staff additions)
  const dealTeamMembers = useMemo(() => {
    const list = [];
    if (opp?.ownerName) {
      list.push({
        id: opp.ownerEmployeeId || 1,
        name: opp.ownerName,
        role: "Deal Owner",
      });
    }
    extraTeamMembers.forEach((m) => {
      if (m.name !== opp?.ownerName) {
        list.push(m);
      }
    });
    return list;
  }, [opp, extraTeamMembers]);

  // Add Team Member Submit
  const handleAddTeamMember = (e) => {
    e.preventDefault();
    const sel = ownersList.find((o) => String(o.ownerId) === String(newMemberId));
    if (!sel) {
      toastApiError(null, "Please select an employee.");
      return;
    }
    setExtraTeamMembers((prev) => [
      ...prev,
      { id: sel.ownerId, name: sel.fullName, role: newMemberRole },
    ]);
    toastSuccess(`Added ${sel.fullName} to deal team.`);
    setNewMemberId("");
    setTeamModalOpen(false);
  };

  // Add Competitor Submit
  const handleAddCompetitor = (e) => {
    e.preventDefault();
    if (!newCompetitorName.trim()) return;
    const badgeColor =
      newCompetitorThreat === "High"
        ? { bg: "#fee2e2", color: "#991b1b" }
        : newCompetitorThreat === "Medium"
        ? { bg: "#fef3c7", color: "#92400e" }
        : { bg: "#dcfce7", color: "#166534" };

    setCompetitors((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: newCompetitorName.trim(),
        level: newCompetitorThreat,
        badgeBg: badgeColor.bg,
        badgeColor: badgeColor.color,
      },
    ]);
    toastSuccess(`Added competitor ${newCompetitorName}.`);
    setNewCompetitorName("");
    setCompetitorModalOpen(false);
  };

  // Open Create Quote Modal
  const openCreateQuote = () => {
    setQuoteForm({
      quoteNo: `QT-${opp.opportunityCode || ('OPP-' + String(opp.opportunityId).padStart(5, '0'))}`,
      expiryDate: opp.expectedCloseDate || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      status: "Sent",
    });
    setQuoteModalOpen(true);
  };

  // Generate Quotation Submit
  const handleSaveQuote = (e) => {
    e.preventDefault();
    setQuotesList((prev) => [
      ...prev,
      {
        id: Date.now(),
        quoteNo: quoteForm.quoteNo,
        quoteDate: new Date().toISOString().slice(0, 10),
        expiryDate: quoteForm.expiryDate,
        amount: opp.amount,
        status: quoteForm.status,
      },
    ]);
    toastSuccess(`Quotation ${quoteForm.quoteNo} generated.`);
    setQuoteModalOpen(false);
  };

  // Dynamic Product line item derived from Opportunity scope & amount
  const productsList = useMemo(() => {
    const amt = Number(opp?.amount) || 0;
    if (amt <= 0) return [];
    return [
      {
        id: 1,
        name: opp?.name || "Solution Scope",
        type: opp?.opportunityTypeName || "Primary Package",
        qty: 1,
        unitPrice: amt,
        total: amt,
      },
    ];
  }, [opp]);

  // Key Contacts strictly from database (tab_party_contact_persons)
  const keyContactsList = useMemo(() => {
    if (opp?.keyContacts && opp.keyContacts.length > 0) {
      return opp.keyContacts;
    }
    if (opp?.primaryContactName && opp.primaryContactName !== "No Contact") {
      return [
        {
          contactPersonId: opp.primaryContactId || 1,
          fullName: opp.primaryContactName,
          title: "Primary Contact",
          mobile: opp.primaryContactMobile,
          email: opp.primaryContactEmail,
          isPrimary: true,
        },
      ];
    }
    return [];
  }, [opp]);

  // Recent Activities strictly from database (tab_employee_activities)
  const recentActivitiesList = useMemo(() => {
    if (!opp?.recentActivities) return [];
    return opp.recentActivities.map((act) => {
      const type = String(act.actType || "").toUpperCase();
      let icon = "ri-calendar-line";
      let color = "#2563eb";
      let bg = "#eff6ff";

      if (type.includes("MEET")) {
        icon = "ri-calendar-check-line";
        color = "#059669";
        bg = "#ecfdf5";
      } else if (type.includes("CALL")) {
        icon = "ri-phone-line";
        color = "#2563eb";
        bg = "#eff6ff";
      } else if (type.includes("EMAIL") || type.includes("MAIL")) {
        icon = "ri-mail-send-line";
        color = "#7c3aed";
        bg = "#f5f3ff";
      } else if (type.includes("DEMO") || type.includes("VISIT")) {
        icon = "ri-slideshow-line";
        color = "#d97706";
        bg = "#fffbeb";
      }

      return {
        activityId: act.activityId,
        actType: act.actType,
        title: act.reason || `${act.actType || "Activity"} Logged`,
        description: act.callNotes || "",
        author: act.employeeName,
        timestamp: formatDateTime(act.startTime),
        icon,
        color,
        bg,
      };
    });
  }, [opp]);

  // Attachments strictly from database (tab_task_files)
  const attachmentsList = useMemo(() => {
    if (!opp?.attachments) return [];
    return opp.attachments.map((f) => {
      const fn = f.fileName || "Document";
      let icon = "ri-file-line";
      let color = "#64748b";

      if (fn.endsWith(".doc") || fn.endsWith(".docx")) {
        icon = "ri-file-word-line";
        color = "#2563eb";
      } else if (fn.endsWith(".pdf")) {
        icon = "ri-file-pdf-line";
        color = "#dc2626";
      } else if (fn.endsWith(".xls") || fn.endsWith(".xlsx")) {
        icon = "ri-file-excel-line";
        color = "#16a34a";
      }

      return {
        id: f.fileId,
        name: fn,
        date: formatDate(f.uploadedOn),
        fileUrl: f.fileUrl,
        icon,
        color,
      };
    });
  }, [opp]);

  if (loading) {
    return (
      <div className="page-content" style={{ backgroundColor: "#f8fafc", minHeight: "100vh" }}>
        <Container fluid className="text-center py-5">
          <Spinner style={{ color: THEME.primary }} />
          <div className="mt-2 text-muted fs-13">Loading dynamic 360° opportunity profile from database…</div>
        </Container>
      </div>
    );
  }

  if (error || !opp) {
    return (
      <div className="page-content">
        <Container fluid className="py-4">
          <Alert color="danger">{error || "Opportunity not found."}</Alert>
          <Button color="light" onClick={() => navigate("/crm/pipeline")}>
            ← Back to Pipeline
          </Button>
        </Container>
      </div>
    );
  }

  const isClosedWon = String(opp.stageCode).toUpperCase() === "CLOSED_WON";
  const isClosedLost = String(opp.stageCode).toUpperCase() === "CLOSED_LOST";

  return (
    <div className="page-content" style={{ backgroundColor: "#f8fafc", minHeight: "100vh" }}>
      <Container fluid className="px-4">
        {/* ======================================================== */}
        {/* Top Header Breadcrumb & Actions Bar                      */}
        {/* ======================================================== */}
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3 pt-2">
          <div>
            <div className="d-flex align-items-center gap-2">
              <Link
                to="/crm/pipeline"
                className="text-decoration-none fs-13 fw-semibold d-flex align-items-center gap-1"
                style={{ color: THEME.primary }}
              >
                <i className="ri-arrow-left-line" /> Back to Pipeline
              </Link>
            </div>
            <h4 className="fw-bold text-dark mb-0 fs-20 mt-1">Opportunity Details</h4>
            <div className="text-muted fs-12 mt-1">
              CRM &gt; Opportunities &gt; {opp.name}
            </div>
          </div>

          {/* Action Buttons matching Mockup & Theme */}
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

            {/* Actions Dropdown */}
            <Dropdown
              isOpen={actionsMenuOpen}
              toggle={() => setActionsMenuOpen((v) => !v)}
            >
              <DropdownToggle
                tag="button"
                className="btn btn-sm btn-light border bg-white d-flex align-items-center gap-1 fw-semibold text-dark"
                style={{ borderRadius: 0, borderColor: "#cbd5e1" }}
              >
                Actions <i className="ri-arrow-down-s-line fs-14" />
              </DropdownToggle>
              <DropdownMenu end>
                <DropdownItem onClick={() => setTaskModalOpen(true)}>
                  <i className="ri-checkbox-circle-line me-2 text-muted" /> Add Next Step
                </DropdownItem>
                <DropdownItem onClick={() => setActivityModalOpen(true)}>
                  <i className="ri-calendar-event-line me-2 text-muted" /> Log Activity
                </DropdownItem>
                <DropdownItem onClick={() => setContactModalOpen(true)}>
                  <i className="ri-user-add-line me-2 text-muted" /> Add Contact Person
                </DropdownItem>
                <DropdownItem onClick={openCreateQuote}>
                  <i className="ri-file-list-3-line me-2 text-muted" /> Create Quotation
                </DropdownItem>
                <DropdownItem divider />
                <DropdownItem onClick={handleConvertToWon} disabled={isClosedWon}>
                  <i className="ri-trophy-line me-2 text-success" /> Mark as Closed Won
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>

            <Button
              color="light"
              size="sm"
              className="border bg-white fw-semibold text-dark"
              onClick={() => setActivityModalOpen(true)}
              style={{ borderRadius: 0, borderColor: "#cbd5e1" }}
            >
              + Add Activity
            </Button>

            <Button
              color="light"
              size="sm"
              className="border bg-white fw-semibold text-dark"
              onClick={openCreateQuote}
              style={{ borderRadius: 0, borderColor: "#cbd5e1" }}
            >
              Create Quote
            </Button>

            {/* Convert to Won Button */}
            <Button
              size="sm"
              className="text-white fw-semibold px-3 d-inline-flex align-items-center"
              onClick={handleConvertToWon}
              disabled={movingStage || isClosedWon}
              style={{
                backgroundColor: THEME.primary,
                borderColor: THEME.primary,
                borderRadius: 0,
                height: "32px",
                boxShadow: "0 1px 2px 0 rgba(127, 29, 29, 0.2)",
              }}
            >
              <i className="ri-trophy-line me-1 text-warning" /> Convert to Won
            </Button>

            {/* More Options Dropdown */}
            <Dropdown
              isOpen={moreMenuOpen}
              toggle={() => setMoreMenuOpen((v) => !v)}
            >
              <DropdownToggle
                tag="button"
                className="btn btn-sm btn-light border bg-white text-muted px-2"
                style={{ borderRadius: 0 }}
              >
                <i className="ri-more-fill" />
              </DropdownToggle>
              <DropdownMenu end>
                <DropdownItem onClick={() => window.print()}>
                  <i className="ri-printer-line me-2" /> Print Summary
                </DropdownItem>
                <DropdownItem onClick={() => {
                  navigator.clipboard?.writeText(window.location.href);
                  toastSuccess("Opportunity URL copied to clipboard.");
                }}>
                  <i className="ri-file-copy-line me-2" /> Copy Link
                </DropdownItem>
                <DropdownItem divider />
                <DropdownItem
                  className="text-danger"
                  onClick={async () => {
                    if (window.confirm("Are you sure you want to deactivate this opportunity?")) {
                      try {
                        await deactivateOpportunity(opp.opportunityId);
                        toastSuccess("Opportunity deactivated in database.");
                        navigate("/crm/pipeline");
                      } catch (err) {
                        toastApiError(err, "Failed to deactivate opportunity.");
                      }
                    }
                  }}
                >
                  <i className="ri-delete-bin-line me-2" /> Deactivate Opportunity
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>
        </div>

        {/* ======================================================== */}
        {/* Header Hero Card with Stage Stepper Tracker              */}
        {/* ======================================================== */}
        <Card className="border shadow-sm mb-4" style={{ borderRadius: 0, backgroundColor: "#ffffff", borderColor: THEME.cardBorder }}>
          <CardBody className="p-4">
            <Row className="g-4 align-items-start">
              {/* Left Title & Company Info */}
              <Col lg={5} md={12}>
                <div className="d-flex align-items-start gap-3">
                  <div
                    className="rounded-0-0 d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{
                      width: 54,
                      height: 54,
                      backgroundColor: "#fef3c7",
                      border: "1px solid #fde68a",
                      color: "#d97706",
                      fontSize: "26px",
                    }}
                  >
                    <i className="ri-building-line" />
                  </div>
                  <div className="flex-grow-1">
                    <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                      <h4 className="fw-bold text-dark mb-0 fs-18">{opp.name}</h4>
                      {/* Clean tinted badge matching reference mockup */}
                      {(() => {
                        const s = String(opp.stageName || "").toLowerCase();
                        let bg = "#eff6ff";
                        let color = "#1d4ed8";
                        let border = "#bfdbfe";
                        if (s.includes("won")) {
                          bg = "#dcfce7"; color = "#15803d"; border = "#bbf7d0";
                        } else if (s.includes("lost")) {
                          bg = "#fee2e2"; color = "#b91c1c"; border = "#fecaca";
                        } else if (s.includes("negot")) {
                          bg = "#fef3c7"; color = "#b45309"; border = "#fde68a";
                        } else if (s.includes("propos")) {
                          bg = "#faf5ff"; color = "#7e22ce"; border = "#e9d5ff";
                        } else if (s.includes("qualif")) {
                          bg = "#ecfdf5"; color = "#047857"; border = "#a7f3d0";
                        }
                        return (
                          <span
                            style={{
                              backgroundColor: bg,
                              color: color,
                              border: `1px solid ${border}`,
                              borderRadius: 0,
                              padding: "2px 10px",
                              fontSize: "11px",
                              fontWeight: 600,
                              display: "inline-block",
                            }}
                          >
                            {opp.stageName || "Prospecting"}
                          </span>
                        );
                      })()}
                    </div>
                    <div className="mb-2">
                      <Link
                        to={`/crm/customers/${opp.accountId}`}
                        className="fw-semibold text-decoration-none fs-13"
                        style={{ color: THEME.primary }}
                      >
                        {opp.accountName || "Customer Account"}
                      </Link>
                    </div>
                    <p className="text-muted fs-12 mb-0" style={{ lineHeight: 1.5 }}>
                      {opp.closedReason || opp.nextStep || (opp.name ? `${opp.name} opportunity for ${opp.accountName || "Customer"}` : "Sales Opportunity")}
                    </p>
                  </div>
                </div>
              </Col>

              {/* Right Top Metadata & Stage Move Stepper */}
              <Col lg={7} md={12}>
                <div className="d-flex flex-column">
                  {/* Top Metadata from Database */}
                  <div className="d-flex flex-wrap justify-content-lg-end gap-3 text-muted fs-11 mb-3">
                    <div>
                      Opportunity ID:{" "}
                      <span className="fw-bold text-dark">
                        {opp.opportunityCode || `OPP-2026-${String(opp.opportunityId).padStart(5, "0")}`}
                      </span>
                    </div>
                    <div>
                      Created On:{" "}
                      <span className="fw-semibold text-dark">{formatDate(opp.createdAt)}</span>
                    </div>
                    <div>
                      Last Updated:{" "}
                      <span className="fw-semibold text-dark">{formatDateTime(opp.updatedAt)}</span>
                    </div>
                  </div>

                  {/* Current Stage Indicator */}
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <div className="fs-13 text-dark">
                      <span className="text-muted">Current Stage :</span>{" "}
                      <span className="fw-bold" style={{ color: isClosedWon ? "#16a34a" : isClosedLost ? "#dc2626" : "#047857" }}>
                        {opp.stageName || "Prospecting"}
                      </span>
                    </div>
                  </div>

                  {/* Full Width Stepper Visualizer (No truncation!) */}
                  <div className="position-relative mb-3 px-1">
                    {/* Background track line */}
                    <div
                      className="position-absolute"
                      style={{
                        top: "14px",
                        left: "5%",
                        right: "5%",
                        height: "3px",
                        backgroundColor: "#e2e8f0",
                        zIndex: 1,
                      }}
                    />
                    {/* Active colored line up to current stage */}
                    <div
                      className="position-absolute"
                      style={{
                        top: "14px",
                        left: "5%",
                        width: `${Math.min(
                          100,
                          Math.max(
                            0,
                            ((stagesList.findIndex((s) => Number(s.stageId) === Number(opp.stageId))) /
                              Math.max(1, stagesList.length - 1)) *
                              90
                          )
                        )}%`,
                        height: "3px",
                        backgroundColor: "#16a34a",
                        zIndex: 1,
                        transition: "width 0.3s ease",
                      }}
                    />

                    {/* Stage Nodes */}
                    <div className="d-flex justify-content-between position-relative" style={{ zIndex: 2 }}>
                      {stagesList.map((st) => {
                        const isCurrent = Number(st.stageId) === Number(opp.stageId);
                        const isPassed = st.sortOrder < currentStageSortOrder;
                        return (
                          <div
                            key={st.stageId}
                            className="d-flex flex-column align-items-center cursor-pointer"
                            onClick={() => handleStageChange(st.stageId)}
                            title={`Click to switch stage to ${st.stageName}`}
                            style={{ flex: 1, textAlign: "center" }}
                          >
                            <div
                              className="rounded-0-0 d-flex align-items-center justify-content-center text-white"
                              style={{
                                width: 28,
                                height: 28,
                                backgroundColor: isCurrent
                                  ? "#d97706"
                                  : isPassed
                                  ? "#16a34a"
                                  : "#ffffff",
                                border: isCurrent
                                  ? "3px solid #fef3c7"
                                  : isPassed
                                  ? "2px solid #16a34a"
                                  : "2px solid #cbd5e1",
                                color: isPassed ? "#ffffff" : isCurrent ? "#ffffff" : "#94a3b8",
                                fontSize: "12px",
                                fontWeight: "bold",
                                transition: "all 0.2s ease",
                              }}
                            >
                              {isPassed ? (
                                <i className="ri-check-line" />
                              ) : isCurrent ? (
                                <span style={{ width: 8, height: 8, backgroundColor: "#ffffff", borderRadius: 0 }} />
                              ) : (
                                <span style={{ width: 6, height: 6, backgroundColor: "#cbd5e1", borderRadius: 0 }} />
                              )}
                            </div>
                            <span
                              className="mt-1"
                              style={{
                                fontSize: "11px",
                                whiteSpace: "nowrap",
                                fontWeight: isCurrent ? 700 : isPassed ? 600 : 500,
                                color: isCurrent ? "#0f172a" : isPassed ? "#1e293b" : "#94a3b8",
                              }}
                            >
                              {st.stageName}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Stepper Footer: Time in stage + Move Stage Dropdown */}
                  <div className="d-flex align-items-center justify-content-between text-muted fs-11 pt-1">
                    <div>
                      In this stage since{" "}
                      <span className="fw-semibold text-dark">
                        {formatDate(opp.updatedAt || opp.createdAt)} ({opp.daysInStage != null ? `${opp.daysInStage} Days` : "0 Days"})
                      </span>
                    </div>

                    <Dropdown
                      isOpen={stageMenuOpen}
                      toggle={() => setStageMenuOpen((v) => !v)}
                    >
                      <DropdownToggle
                        tag="button"
                        className="btn btn-sm btn-light border d-flex align-items-center gap-1 py-1 px-2 fs-11 fw-semibold text-dark bg-white"
                        style={{ borderRadius: 0, borderColor: "#cbd5e1" }}
                      >
                        Move Stage <i className="ri-arrow-down-s-line" />
                      </DropdownToggle>
                      <DropdownMenu end>
                        {stagesList.map((st) => (
                          <DropdownItem
                            key={st.stageId}
                            onClick={() => handleStageChange(st.stageId)}
                            active={Number(st.stageId) === Number(opp.stageId)}
                          >
                            {st.stageName}
                          </DropdownItem>
                        ))}
                      </DropdownMenu>
                    </Dropdown>
                  </div>
                </div>
              </Col>
            </Row>

            {/* ======================================================== */}
            {/* 6 Middle Metrics Bar matching Mockup                     */}
            {/* ======================================================== */}
            <div
              className="mt-4 p-3 rounded-0-0"
              style={{
                backgroundColor: "#f8fafc",
                border: `1px solid ${THEME.cardBorder}`,
              }}
            >
              <Row className="g-3 align-items-center">
                {/* 1. Opportunity Owner */}
                <Col lg={2} md={4} sm={6}>
                  <div className="text-muted text-uppercase fw-semibold" style={{ fontSize: "11px", letterSpacing: "0.5px" }}>
                    OPPORTUNITY OWNER
                  </div>
                  <div className="d-flex align-items-center gap-2 mt-1">
                    <div
                      className="rounded-0-0 d-flex align-items-center justify-content-center text-white fw-bold flex-shrink-0"
                      style={{ width: 28, height: 28, fontSize: "11px", backgroundColor: THEME.primary }}
                    >
                      {getInitials(opp.ownerName)}
                    </div>
                    <span className="fw-semibold text-dark fs-13 text-truncate" title={opp.ownerName || "Unassigned"}>
                      {opp.ownerName || "Unassigned"}
                    </span>
                  </div>
                </Col>

                {/* 2. Primary Contact */}
                <Col lg={2} md={4} sm={6}>
                  <div className="text-muted text-uppercase fw-semibold" style={{ fontSize: "11px", letterSpacing: "0.5px" }}>
                    PRIMARY CONTACT
                  </div>
                  <div className="d-flex align-items-center gap-2 mt-1">
                    <div
                      className="rounded-0-0 d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{ width: 28, height: 28, backgroundColor: "#ecfdf5", color: "#059669", fontSize: "13px" }}
                    >
                      <i className="ri-user-line" />
                    </div>
                    <span className="fw-semibold text-dark fs-13 text-truncate" title={opp.primaryContactName || "No contact"}>
                      {opp.primaryContactName || "No contact"}
                    </span>
                  </div>
                </Col>

                {/* 3. Expected Close Date */}
                <Col lg={2} md={4} sm={6}>
                  <div className="text-muted text-uppercase fw-semibold" style={{ fontSize: "11px", letterSpacing: "0.5px" }}>
                    EXPECTED CLOSE DATE
                  </div>
                  <div className="d-flex align-items-center gap-1 mt-1 text-dark fw-semibold fs-13">
                    <i className="ri-calendar-line text-muted fs-14" />
                    {formatDate(opp.expectedCloseDate)}
                  </div>
                </Col>

                {/* 4. Probability */}
                <Col lg={2} md={4} sm={6}>
                  <div className="text-muted text-uppercase fw-semibold" style={{ fontSize: "11px", letterSpacing: "0.5px" }}>
                    PROBABILITY
                  </div>
                  <div className="fw-bold text-dark fs-15 mt-1">
                    {opp.probability != null ? `${opp.probability}%` : "10%"}
                  </div>
                </Col>

                {/* 5. Pipeline Value */}
                <Col lg={2} md={4} sm={6}>
                  <div className="text-muted text-uppercase fw-semibold" style={{ fontSize: "11px", letterSpacing: "0.5px" }}>
                    PIPELINE VALUE
                  </div>
                  <div className="fw-bold fs-15 mt-1" style={{ color: "#0f172a" }}>
                    {formatInr(opp.amount)}
                  </div>
                </Col>

                {/* 6. Weighted Value */}
                <Col lg={2} md={4} sm={6}>
                  <div className="text-muted text-uppercase fw-semibold" style={{ fontSize: "11px", letterSpacing: "0.5px" }}>
                    WEIGHTED VALUE
                  </div>
                  <div className="fw-bold fs-15 mt-1" style={{ color: "#0f172a" }}>
                    {formatInr(opp.weightedAmount || (opp.amount * (opp.probability || 0)) / 100)}
                  </div>
                </Col>
              </Row>
            </div>
          </CardBody>
        </Card>

        {/* ======================================================== */}
        {/* Sleek Underline Navigation Tabs matching Mockup          */}
        {/* ======================================================== */}
        <div
          className="border-bottom mb-4 d-flex align-items-center justify-content-between flex-wrap gap-2"
          style={{ borderColor: THEME.cardBorder }}
        >
          <div className="d-flex align-items-center gap-4 overflow-auto py-1">
            {[
              { id: "overview", label: "Overview" },
              { id: "details", label: "Details" },
              { id: "products", label: `Products (${productsList.length})` },
              { id: "quotes", label: `Quotes (${quotesList.length})` },
              { id: "activities", label: `Activities (${recentActivitiesList.length})` },
              { id: "documents", label: `Documents (${attachmentsList.length})` },
              { id: "notes", label: "Notes" },
              { id: "timeline", label: "Timeline" },
              { id: "contacts", label: `Contacts (${keyContactsList.length})` },
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
        {/* TAB CONTENT PANES                                        */}
        {/* ======================================================== */}
        <TabContent activeTab={activeTab}>
          {/* ======================================================== */}
          {/* TAB 1: OVERVIEW TAB (Perfect Symmetrical 3 Columns Grid)  */}
          {/* ======================================================== */}
          <TabPane tabId="overview">
            <Row className="g-3 align-items-stretch">
              {/* ---------------------------------------------------- */}
              {/* COLUMN 1: Opportunity Info & Financial Info           */}
              {/* ---------------------------------------------------- */}
              <Col lg={4} md={12} className="d-flex flex-column">
                {/* Opportunity Information Card */}
                <Card className="border shadow-sm mb-3 d-flex flex-column" style={{ borderRadius: 0, borderColor: THEME.cardBorder, backgroundColor: "#ffffff" }}>
                  <CardBody className="p-3 d-flex flex-column">
                    <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
                      <h6 className="fw-bold text-dark fs-14 mb-0 d-flex align-items-center gap-2">
                        <i className="ri-information-line text-muted" /> Opportunity Information
                      </h6>
                      <Button color="link" size="sm" className="p-0 text-decoration-none fs-12 fw-semibold" onClick={openEditModal} style={{ color: THEME.primary }}>
                        Edit
                      </Button>
                    </div>
                    <div className="d-flex flex-column gap-2 fs-12 flex-grow-1">
                      <div className="d-flex justify-content-between align-items-center py-1 border-bottom border-light">
                        <span className="text-muted">Opportunity Name</span>
                        <span className="fw-semibold text-dark text-end">{opp.name}</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center py-1 border-bottom border-light">
                        <span className="text-muted">Customer</span>
                        <Link
                          to={`/crm/customers/${opp.accountId}`}
                          className="fw-semibold text-decoration-none"
                          style={{ color: THEME.primary }}
                        >
                          {opp.accountName || "Customer Account"}
                        </Link>
                      </div>
                      <div className="d-flex justify-content-between align-items-center py-1 border-bottom border-light">
                        <span className="text-muted">Opportunity Type</span>
                        <span className="fw-semibold text-dark">{opp.opportunityTypeName || "Standard Deal"}</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center py-1 border-bottom border-light">
                        <span className="text-muted">Source</span>
                        <span className="fw-semibold text-dark">{opp.sourceName || "Direct / Inbound"}</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center py-1 border-bottom border-light">
                        <span className="text-muted">Industry</span>
                        <span className="fw-semibold text-dark">{opp.industry || "General Business"}</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center py-1 border-bottom border-light">
                        <span className="text-muted">Territory</span>
                        <span className="fw-semibold text-dark">{opp.territory || "Head Office"}</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center py-1 border-bottom border-light">
                        <span className="text-muted">Campaign</span>
                        <span className="fw-semibold text-dark">{opp.campaignName || "Direct / Organic"}</span>
                      </div>
                      <div className="pt-2">
                        <span className="text-muted d-block mb-1 fw-medium">Description</span>
                        <p className="text-dark mb-0 fs-12" style={{ lineHeight: 1.5 }}>
                          {opp.closedReason || opp.nextStep || "No description provided."}
                        </p>
                      </div>
                    </div>
                  </CardBody>
                </Card>

                {/* Financial Information Card (flex-grow-1 ensures bottom alignment) */}
                <Card className="border shadow-sm mb-3 flex-grow-1 d-flex flex-column" style={{ borderRadius: 0, borderColor: THEME.cardBorder, backgroundColor: "#ffffff" }}>
                  <CardBody className="p-3 d-flex flex-column">
                    <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
                      <h6 className="fw-bold text-dark fs-14 mb-0 d-flex align-items-center gap-2">
                        <i className="ri-money-dollar-circle-line text-muted" /> Financial Information
                      </h6>
                    </div>
                    <div className="d-flex flex-column gap-2 fs-12 flex-grow-1">
                      <div className="d-flex justify-content-between align-items-center py-1 border-bottom border-light">
                        <span className="text-muted">Currency</span>
                        <span className="fw-semibold text-dark">{opp.currencyCode || "INR"} - Indian Rupee ({"\u20B9"})</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center py-1 border-bottom border-light">
                        <span className="text-muted">Total Amount</span>
                        <span className="fw-bold text-dark fs-13">{formatInr(opp.amount)}</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center py-1 border-bottom border-light">
                        <span className="text-muted">Expected Revenue</span>
                        <span className="fw-semibold text-dark">{formatInr(opp.amount)}</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center py-1 border-bottom border-light">
                        <span className="text-muted d-flex align-items-center">
                          Weighted Value <i className="ri-information-line ms-1 text-muted" title="Calculated as Amount × Probability" />
                        </span>
                        <span className="fw-bold fs-13" style={{ color: THEME.primary }}>
                          {formatInr(opp.weightedAmount || (opp.amount * (opp.probability || 0)) / 100)}
                        </span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center py-1 border-bottom border-light">
                        <span className="text-muted">Probability</span>
                        <span className="fw-semibold text-dark">{opp.probability || 0}%</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center py-1 border-bottom border-light">
                        <span className="text-muted">Budget Range</span>
                        <span className="fw-semibold text-dark">
                          {formatInr(opp.amount * 0.85)} - {formatInr(opp.amount * 1.15)}
                        </span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center py-1">
                        <span className="text-muted">Payment Terms</span>
                        <span className="fw-semibold text-dark">{opp.paymentTerms || "Standard Terms"}</span>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </Col>

              {/* ---------------------------------------------------- */}
              {/* COLUMN 2: Products/Services, Quotes, Next Steps      */}
              {/* ---------------------------------------------------- */}
              <Col lg={4} md={12} className="d-flex flex-column">
                {/* Products / Services Table Card */}
                <Card className="border shadow-sm mb-3 d-flex flex-column" style={{ borderRadius: 0, borderColor: THEME.cardBorder, backgroundColor: "#ffffff", minHeight: "185px" }}>
                  <CardBody className="p-3 d-flex flex-column justify-content-between">
                    <div>
                      <div className="d-flex align-items-center justify-content-between mb-2 pb-2 border-bottom">
                        <h6 className="fw-bold text-dark fs-14 mb-0">
                          Products / Services ({productsList.length})
                        </h6>
                        <Button
                          color="link"
                          size="sm"
                          className="p-0 text-decoration-none fs-12 fw-semibold"
                          onClick={() => setActiveTab("products")}
                          style={{ color: THEME.primary }}
                        >
                          View All
                        </Button>
                      </div>
                      {productsList.length > 0 ? (
                        <div className="table-responsive">
                          <Table className="table-sm table-borderless align-middle mb-0 fs-12">
                            <thead className="table-light text-muted fs-11">
                              <tr>
                                <th>Product / Service</th>
                                <th className="text-center">Qty</th>
                                <th className="text-end">Unit Price</th>
                                <th className="text-end">Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {productsList.map((p) => (
                                <tr key={p.id} className="border-bottom">
                                  <td className="fw-semibold text-dark">{p.name}</td>
                                  <td className="text-center">{p.qty}</td>
                                  <td className="text-end text-muted">{formatInr(p.unitPrice)}</td>
                                  <td className="text-end fw-bold text-dark">{formatInr(p.total)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </Table>
                        </div>
                      ) : (
                        <div className="text-center py-4 text-muted fs-12">
                          No product line items added.
                        </div>
                      )}
                    </div>

                    <div className="d-flex justify-content-between align-items-center pt-2 border-top fs-12">
                      <span className="text-muted">Total Proposed Value</span>
                      <span className="fw-bold text-dark fs-13">{formatInr(opp.amount)}</span>
                    </div>
                  </CardBody>
                </Card>

                {/* Quotes Card */}
                <Card className="border shadow-sm mb-3 d-flex flex-column" style={{ borderRadius: 0, borderColor: THEME.cardBorder, backgroundColor: "#ffffff", minHeight: "185px" }}>
                  <CardBody className="p-3 d-flex flex-column justify-content-between">
                    <div>
                      <div className="d-flex align-items-center justify-content-between mb-2 pb-2 border-bottom">
                        <h6 className="fw-bold text-dark fs-14 mb-0">Quotes ({quotesList.length})</h6>
                        <Button
                          color="link"
                          size="sm"
                          className="p-0 text-decoration-none fs-12 fw-semibold"
                          onClick={openCreateQuote}
                          style={{ color: THEME.primary }}
                        >
                          + Create Quote
                        </Button>
                      </div>
                      {quotesList.length > 0 ? (
                        <div className="table-responsive">
                          <Table className="table-sm table-borderless align-middle mb-0 fs-12">
                            <thead className="table-light text-muted fs-11">
                              <tr>
                                <th>Quote No.</th>
                                <th>Expiry Date</th>
                                <th className="text-end">Amount</th>
                                <th className="text-center">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {quotesList.map((q) => (
                                <tr key={q.id} className="border-bottom">
                                  <td className="fw-semibold" style={{ color: THEME.primary }}>{q.quoteNo}</td>
                                  <td className="text-muted">{formatDate(q.expiryDate)}</td>
                                  <td className="text-end fw-bold text-dark">{formatInr(q.amount)}</td>
                                  <td className="text-center">
                                    <span style={{ backgroundColor: "#fef2f2", color: THEME.primary, border: "1px solid #fee2e2", padding: "2px 8px", borderRadius: 0, fontSize: "11px", fontWeight: 600 }}>
                                      {q.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </Table>
                        </div>
                      ) : (
                        <div className="text-center py-3 text-muted fs-12">
                          <i className="ri-file-list-3-line fs-24 d-block mb-1 text-muted opacity-50" />
                          No quotes generated for this deal yet.
                          <div className="mt-1">
                            <Button color="link" size="sm" className="p-0 fs-12 fw-semibold" onClick={openCreateQuote} style={{ color: THEME.primary }}>
                              Generate Proposal Quote
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-top fs-11 text-muted text-center">
                      Quotations archive linked to Opportunity
                    </div>
                  </CardBody>
                </Card>

                {/* Next Steps Checklist Card (flex-grow-1 ensures bottom alignment with Column 1) */}
                <Card className="border shadow-sm mb-3 flex-grow-1 d-flex flex-column" style={{ borderRadius: 0, borderColor: THEME.cardBorder, backgroundColor: "#ffffff", minHeight: "185px" }}>
                  <CardBody className="p-3 d-flex flex-column justify-content-between">
                    <div>
                      <div className="d-flex align-items-center justify-content-between mb-2 pb-2 border-bottom">
                        <h6 className="fw-bold text-dark fs-14 mb-0">Next Steps ({localTasks.length})</h6>
                        <Button
                          color="link"
                          size="sm"
                          className="p-0 text-decoration-none fs-12 fw-semibold"
                          onClick={() => setTaskModalOpen(true)}
                          style={{ color: THEME.primary }}
                        >
                          + Add Next Step
                        </Button>
                      </div>
                      {localTasks.length > 0 ? (
                        <div className="d-flex flex-column gap-2 mt-2">
                          {localTasks.map((task, idx) => {
                            const isDone = String(task.status).toUpperCase() === "COMPLETED";
                            return (
                              <div
                                key={task.taskId || idx}
                                className="d-flex align-items-center justify-content-between p-2 border rounded-0-0 bg-white"
                                style={{ borderColor: THEME.cardBorder }}
                              >
                                <div className="d-flex align-items-center gap-2">
                                  <input
                                    type="checkbox"
                                    className="form-check-input mt-0 cursor-pointer"
                                    checked={isDone}
                                    onChange={() => handleToggleTask(task)}
                                    title="Click to toggle status"
                                    style={{ cursor: "pointer" }}
                                  />
                                  <span
                                    onClick={() => handleToggleTask(task)}
                                    className={`fs-12 cursor-pointer ${
                                      isDone ? "text-decoration-line-through text-muted" : "text-dark fw-medium"
                                    }`}
                                    style={{ cursor: "pointer" }}
                                  >
                                    {task.title}
                                  </span>
                                </div>
                                <div className="d-flex align-items-center gap-2 flex-shrink-0 ms-2">
                                  <span className="text-muted fs-11">
                                    {formatDate(task.finishDate)}
                                  </span>
                                  <div
                                    className="rounded-0-0 d-flex align-items-center justify-content-center text-white fw-bold"
                                    style={{ width: 22, height: 22, fontSize: "10px", backgroundColor: "#64748b" }}
                                    title={task.assigneeName || opp.ownerName}
                                  >
                                    {getInitials(task.assigneeName || opp.ownerName || "US")}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-muted fs-12">
                          <i className="ri-checkbox-circle-line fs-24 d-block mb-1 text-muted opacity-50" />
                          No follow-up next steps scheduled.
                          <div className="mt-1">
                            <Button color="link" size="sm" className="p-0 fs-12 fw-semibold" onClick={() => setTaskModalOpen(true)} style={{ color: THEME.primary }}>
                              + Schedule Next Step
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-top fs-11 text-muted text-center mt-2">
                      Tasks saved in CRM tasks system
                    </div>
                  </CardBody>
                </Card>
              </Col>

              {/* ---------------------------------------------------- */}
              {/* COLUMN 3: Key Contacts & Recent Activities           */}
              {/* ---------------------------------------------------- */}
              <Col lg={4} md={12} className="d-flex flex-column">
                {/* Key Contacts Card */}
                <Card className="border shadow-sm mb-3 d-flex flex-column" style={{ borderRadius: 0, borderColor: THEME.cardBorder, backgroundColor: "#ffffff", minHeight: "230px" }}>
                  <CardBody className="p-3 d-flex flex-column justify-content-between">
                    <div>
                      <div className="d-flex align-items-center justify-content-between mb-2 pb-2 border-bottom">
                        <div className="d-flex align-items-center gap-2">
                          <h6 className="fw-bold text-dark fs-14 mb-0">
                            Key Contacts ({keyContactsList.length})
                          </h6>
                          <Button
                            color="link"
                            size="sm"
                            className="p-0 text-decoration-none fs-12 fw-semibold"
                            onClick={() => setContactModalOpen(true)}
                            style={{ color: THEME.primary }}
                          >
                            + Add
                          </Button>
                        </div>
                        <Button
                          color="link"
                          size="sm"
                          className="p-0 text-decoration-none fs-12 fw-semibold"
                          onClick={() => setActiveTab("contacts")}
                          style={{ color: THEME.primary }}
                        >
                          View All
                        </Button>
                      </div>

                      {keyContactsList.length > 0 ? (
                        <div className="d-flex flex-column gap-2 mt-2">
                          {keyContactsList.map((c) => (
                            <div
                              key={c.contactPersonId}
                              className="border rounded-0-0 p-2 bg-white d-flex align-items-center justify-content-between"
                              style={{ borderColor: THEME.cardBorder }}
                            >
                              <div className="d-flex align-items-center gap-2">
                                <div
                                  className="rounded-0-0 d-flex align-items-center justify-content-center text-white fw-bold flex-shrink-0"
                                  style={{ width: 32, height: 32, fontSize: "12px", backgroundColor: THEME.primary }}
                                >
                                  {getInitials(c.fullName)}
                                </div>
                                <div>
                                  <div className="d-flex align-items-center gap-1">
                                    <span className="fw-semibold text-dark fs-13">{c.fullName}</span>
                                    {c.isPrimary && (
                                      <span style={{ backgroundColor: "#ecfdf5", color: "#047857", padding: "1px 6px", borderRadius: 0, fontSize: "10px", fontWeight: 600 }}>
                                        Primary
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-muted fs-11 d-block">{c.title || "Contact Person"}</span>
                                </div>
                              </div>

                              <div className="d-flex align-items-center gap-1">
                                {c.mobile && (
                                  <a
                                    href={`tel:${c.mobile}`}
                                    className="btn btn-sm btn-light border text-muted px-2 py-1"
                                    title={`Call ${c.mobile}`}
                                    style={{ borderRadius: 0 }}
                                  >
                                    <i className="ri-phone-line fs-13" />
                                  </a>
                                )}
                                {c.email && (
                                  <a
                                    href={`mailto:${c.email}`}
                                    className="btn btn-sm btn-light border text-muted px-2 py-1"
                                    title={`Email ${c.email}`}
                                    style={{ borderRadius: 0 }}
                                  >
                                    <i className="ri-mail-line fs-13" />
                                  </a>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-muted fs-12">
                          <i className="ri-user-line fs-28 d-block mb-1 text-muted opacity-50" />
                          No contacts linked to this customer account.
                          <div className="mt-2">
                            <Button
                              color="danger"
                              size="sm"
                              className="fw-semibold"
                              onClick={() => setContactModalOpen(true)}
                              style={{ backgroundColor: THEME.primary, borderColor: THEME.primary }}
                            >
                              + Add Contact Person
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-top fs-11 text-muted text-center mt-2">
                      Linked to Customer: {opp.accountName || "Account"}
                    </div>
                  </CardBody>
                </Card>

                {/* Recent Activities Card (flex-grow-1 ensures bottom alignment with Column 1 & 2) */}
                <Card className="border shadow-sm mb-3 flex-grow-1 d-flex flex-column" style={{ borderRadius: 0, borderColor: THEME.cardBorder, backgroundColor: "#ffffff", minHeight: "310px" }}>
                  <CardBody className="p-3 d-flex flex-column justify-content-between">
                    <div>
                      <div className="d-flex align-items-center justify-content-between mb-2 pb-2 border-bottom">
                        <h6 className="fw-bold text-dark fs-14 mb-0">Recent Activities ({recentActivitiesList.length})</h6>
                        <Button
                          color="link"
                          size="sm"
                          className="p-0 text-decoration-none fs-12 fw-semibold"
                          onClick={() => setActiveTab("activities")}
                          style={{ color: THEME.primary }}
                        >
                          View All
                        </Button>
                      </div>

                      {recentActivitiesList.length > 0 ? (
                        <div className="d-flex flex-column gap-3 mt-3">
                          {recentActivitiesList.map((act) => (
                            <div key={act.activityId} className="d-flex align-items-start gap-2">
                              <div
                                className="rounded-0-0 d-flex align-items-center justify-content-center flex-shrink-0 mt-1"
                                style={{
                                  width: 28,
                                  height: 28,
                                  backgroundColor: act.bg,
                                  color: act.color,
                                  fontSize: "14px",
                                }}
                              >
                                <i className={act.icon} />
                              </div>
                              <div className="flex-grow-1">
                                <div className="d-flex align-items-center justify-content-between">
                                  <span className="fw-semibold text-dark fs-12">{act.title}</span>
                                  <span className="text-muted fs-11">{act.timestamp}</span>
                                </div>
                                {act.description && (
                                  <p className="text-muted fs-11 mb-0 mt-1" style={{ lineHeight: 1.4 }}>
                                    {act.description}
                                  </p>
                                )}
                                {act.author && (
                                  <span className="text-muted fs-10 d-block mt-1">Logged by: {act.author}</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-5 text-muted fs-12">
                          <i className="ri-calendar-event-line fs-32 d-block mb-2 text-muted opacity-50" />
                          No activities logged for this deal yet.
                          <div className="mt-2">
                            <Button
                              color="light"
                              size="sm"
                              className="border fw-semibold"
                              onClick={() => setActivityModalOpen(true)}
                              style={{ borderColor: "#cbd5e1" }}
                            >
                              + Log First Activity
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-top fs-11 text-muted text-center mt-2">
                      Activity log syncs with Calendar & Tasks
                    </div>
                  </CardBody>
                </Card>
              </Col>
            </Row>

            {/* ======================================================== */}
            {/* BOTTOM 4 CARDS ROW: Identical Height Grid Alignment       */}
            {/* ======================================================== */}
            <Row className="g-3 align-items-stretch mt-1">
              {/* Card 1: Team Members */}
              <Col lg={3} md={6} className="d-flex">
                <Card className="border shadow-sm w-100 d-flex flex-column" style={{ borderRadius: 0, borderColor: THEME.cardBorder, backgroundColor: "#ffffff", minHeight: "220px" }}>
                  <CardBody className="p-3 d-flex flex-column justify-content-between">
                    <div>
                      <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
                        <h6 className="fw-bold text-dark fs-13 mb-0">Team Members ({dealTeamMembers.length})</h6>
                        <Button
                          color="link"
                          size="sm"
                          className="p-0 text-decoration-none fs-12 fw-semibold"
                          onClick={() => setTeamModalOpen(true)}
                          style={{ color: THEME.primary }}
                        >
                          + Add
                        </Button>
                      </div>

                      {dealTeamMembers.length > 0 ? (
                        <div className="d-flex flex-column gap-2">
                          {dealTeamMembers.map((m) => (
                            <div key={m.id} className="d-flex align-items-center justify-content-between">
                              <div className="d-flex align-items-center gap-2">
                                <div
                                  className="rounded-0-0 d-flex align-items-center justify-content-center text-white fw-bold flex-shrink-0"
                                  style={{ width: 26, height: 26, fontSize: "10px", backgroundColor: THEME.primary }}
                                >
                                  {getInitials(m.name)}
                                </div>
                                <span className="fw-semibold text-dark fs-12">{m.name}</span>
                              </div>
                              <span className="badge bg-light text-muted border fs-10">{m.role}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-muted fs-12">
                          No team members assigned.
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-top text-center fs-11 text-muted mt-2">
                      Sales reps & contributors
                    </div>
                  </CardBody>
                </Card>
              </Col>

              {/* Card 2: Competitors */}
              <Col lg={3} md={6} className="d-flex">
                <Card className="border shadow-sm w-100 d-flex flex-column" style={{ borderRadius: 0, borderColor: THEME.cardBorder, backgroundColor: "#ffffff", minHeight: "220px" }}>
                  <CardBody className="p-3 d-flex flex-column justify-content-between">
                    <div>
                      <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
                        <h6 className="fw-bold text-dark fs-13 mb-0">Competitors ({competitors.length})</h6>
                        <Button
                          color="link"
                          size="sm"
                          className="p-0 text-decoration-none fs-12 fw-semibold"
                          onClick={() => setCompetitorModalOpen(true)}
                          style={{ color: THEME.primary }}
                        >
                          + Add
                        </Button>
                      </div>

                      {competitors.length > 0 ? (
                        <div className="d-flex flex-column gap-2">
                          {competitors.map((comp) => (
                            <div key={comp.id} className="d-flex align-items-center justify-content-between">
                              <span className="fw-semibold text-dark fs-12">{comp.name}</span>
                              <span
                                style={{
                                  backgroundColor: comp.badgeBg,
                                  color: comp.badgeColor,
                                  padding: "2px 8px",
                                  borderRadius: 0,
                                  fontSize: "11px",
                                  fontWeight: 600,
                                }}
                              >
                                {comp.level}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-muted fs-12">
                          <i className="ri-shield-cross-line fs-24 d-block mb-1 text-muted opacity-50" />
                          No competitors tracked.
                          <div className="mt-1">
                            <Button color="link" size="sm" className="p-0 fs-12 fw-semibold" onClick={() => setCompetitorModalOpen(true)} style={{ color: THEME.primary }}>
                              + Add Competitor
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-top text-center fs-11 text-muted mt-2">
                      Competitor threat analysis
                    </div>
                  </CardBody>
                </Card>
              </Col>

              {/* Card 3: Internal Notes */}
              <Col lg={3} md={6} className="d-flex">
                <Card className="border shadow-sm w-100 d-flex flex-column" style={{ borderRadius: 0, borderColor: THEME.cardBorder, backgroundColor: "#ffffff", minHeight: "220px" }}>
                  <CardBody className="p-3 d-flex flex-column justify-content-between">
                    <div>
                      <div className="d-flex align-items-center justify-content-between mb-2 border-bottom pb-2">
                        <h6 className="fw-bold text-dark fs-13 mb-0">Internal Notes</h6>
                        <Button
                          color="link"
                          size="sm"
                          className="p-0 text-decoration-none fs-12 fw-semibold"
                          onClick={openEditModal}
                          style={{ color: THEME.primary }}
                        >
                          Edit
                        </Button>
                      </div>

                      {opp.closedReason ? (
                        <div
                          className="p-2 rounded-0-0"
                          style={{
                            backgroundColor: "#fefce8",
                            border: "1px solid #fef08a",
                            color: "#713f12",
                            fontSize: "12px",
                            lineHeight: 1.4,
                            maxHeight: "105px",
                            overflowY: "auto",
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {opp.closedReason}
                          <div className="text-end text-muted fs-10 mt-1">
                            - {opp.ownerName || "Deal Owner"}
                          </div>
                        </div>
                      ) : (
                        <div
                          className="p-3 rounded-0-0 text-center text-muted fs-12 d-flex flex-column align-items-center justify-content-center"
                          style={{ backgroundColor: "#fefce8", border: "1px dashed #fde68a" }}
                        >
                          No notes recorded yet.
                          <div className="mt-1">
                            <Button color="link" size="sm" className="p-0 fs-12 fw-semibold" onClick={openEditModal} style={{ color: THEME.primary }}>
                              + Add Note
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-top text-center mt-2">
                      <Button
                        color="link"
                        size="sm"
                        className="p-0 text-decoration-none fs-11 fw-semibold"
                        onClick={() => setActiveTab("notes")}
                        style={{ color: THEME.primary }}
                      >
                        View All Notes
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              </Col>

              {/* Card 4: Attachments */}
              <Col lg={3} md={6} className="d-flex">
                <Card className="border shadow-sm w-100 d-flex flex-column" style={{ borderRadius: 0, borderColor: THEME.cardBorder, backgroundColor: "#ffffff", minHeight: "220px" }}>
                  <CardBody className="p-3 d-flex flex-column justify-content-between">
                    <div>
                      <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
                        <h6 className="fw-bold text-dark fs-13 mb-0">
                          Attachments ({attachmentsList.length})
                        </h6>
                        <Button
                          color="link"
                          size="sm"
                          className="p-0 text-decoration-none fs-12 fw-semibold"
                          onClick={() => setActiveTab("documents")}
                          style={{ color: THEME.primary }}
                        >
                          View All
                        </Button>
                      </div>

                      {attachmentsList.length > 0 ? (
                        <div className="d-flex flex-column gap-2">
                          {attachmentsList.map((doc) => (
                            <div
                              key={doc.id}
                              className="d-flex align-items-center justify-content-between p-2 border rounded-0-0"
                              style={{ borderColor: "#f1f5f9" }}
                            >
                              <div className="d-flex align-items-center gap-2">
                                <i className={`${doc.icon} fs-16`} style={{ color: doc.color }} />
                                <div>
                                  <span className="fw-semibold text-dark fs-12 d-block text-truncate" style={{ maxWidth: 140 }}>
                                    {doc.name}
                                  </span>
                                  <span className="text-muted fs-10">{doc.date}</span>
                                </div>
                              </div>
                              {doc.fileUrl && (
                                <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="btn btn-sm btn-light py-1 px-2">
                                  <i className="ri-download-line" />
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-muted fs-12">
                          <i className="ri-attachment-line fs-24 d-block mb-1 text-muted opacity-50" />
                          No documents attached.
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-top text-center fs-11 text-muted mt-2">
                      Documents & contracts
                    </div>
                  </CardBody>
                </Card>
              </Col>
            </Row>
          </TabPane>

          {/* ======================================================== */}
          {/* TAB 2: DETAILS TAB                                       */}
          {/* ======================================================== */}
          <TabPane tabId="details">
            <Card className="border shadow-sm" style={{ borderRadius: 0, borderColor: THEME.cardBorder }}>
              <CardBody className="p-4">
                <h5 className="fw-bold text-dark mb-3">Complete Opportunity Details</h5>
                <Row className="g-4">
                  <Col md={6}>
                    <Table bordered className="fs-13">
                      <tbody>
                        <tr>
                          <th className="table-light" style={{ width: "35%" }}>Opportunity Code</th>
                          <td>{opp.opportunityCode || `OPP-2026-${String(opp.opportunityId).padStart(5, "0")}`}</td>
                        </tr>
                        <tr>
                          <th className="table-light">Opportunity Name</th>
                          <td className="fw-semibold">{opp.name}</td>
                        </tr>
                        <tr>
                          <th className="table-light">Customer Account</th>
                          <td>
                            <Link to={`/crm/customers/${opp.accountId}`} style={{ color: THEME.primary }}>
                              {opp.accountName}
                            </Link>
                          </td>
                        </tr>
                        <tr>
                          <th className="table-light">Current Stage</th>
                          <td>{opp.stageName}</td>
                        </tr>
                        <tr>
                          <th className="table-light">Opportunity Type</th>
                          <td>{opp.opportunityTypeName || "Standard Deal"}</td>
                        </tr>
                        <tr>
                          <th className="table-light">Lead Source</th>
                          <td>{opp.sourceName || "Direct / Inbound"}</td>
                        </tr>
                      </tbody>
                    </Table>
                  </Col>
                  <Col md={6}>
                    <Table bordered className="fs-13">
                      <tbody>
                        <tr>
                          <th className="table-light" style={{ width: "35%" }}>Deal Amount</th>
                          <td className="fw-bold" style={{ color: THEME.primary }}>{formatInr(opp.amount)}</td>
                        </tr>
                        <tr>
                          <th className="table-light">Win Probability</th>
                          <td>{opp.probability}%</td>
                        </tr>
                        <tr>
                          <th className="table-light">Weighted Amount</th>
                          <td>{formatInr(opp.weightedAmount || (opp.amount * opp.probability) / 100)}</td>
                        </tr>
                        <tr>
                          <th className="table-light">Expected Close Date</th>
                          <td>{formatDate(opp.expectedCloseDate)}</td>
                        </tr>
                        <tr>
                          <th className="table-light">Sales Owner</th>
                          <td>{opp.ownerName || "Unassigned"}</td>
                        </tr>
                        <tr>
                          <th className="table-light">Created / Updated</th>
                          <td>{formatDate(opp.createdAt)} / {formatDate(opp.updatedAt)}</td>
                        </tr>
                      </tbody>
                    </Table>
                  </Col>
                </Row>
              </CardBody>
            </Card>
          </TabPane>

          {/* ======================================================== */}
          {/* TAB 3: PRODUCTS TAB                                      */}
          {/* ======================================================== */}
          <TabPane tabId="products">
            <Card className="border shadow-sm" style={{ borderRadius: 0, borderColor: THEME.cardBorder }}>
              <CardBody className="p-4">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <h5 className="fw-bold text-dark mb-0">Products & Services Breakdown</h5>
                  <Button
                    color="danger"
                    size="sm"
                    className="fw-semibold px-3"
                    onClick={openEditModal}
                    style={{ backgroundColor: THEME.primary, borderColor: THEME.primary }}
                  >
                    Adjust Amount
                  </Button>
                </div>
                {productsList.length > 0 ? (
                  <Table responsive hover className="align-middle fs-13">
                    <thead className="table-light">
                      <tr>
                        <th>#</th>
                        <th>Product / Scope Item</th>
                        <th>Category</th>
                        <th className="text-center">Quantity</th>
                        <th className="text-end">Unit Price</th>
                        <th className="text-end">Total Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productsList.map((p, idx) => (
                        <tr key={p.id}>
                          <td>{idx + 1}</td>
                          <td className="fw-semibold text-dark">{p.name}</td>
                          <td className="text-muted">{p.type}</td>
                          <td className="text-center">{p.qty}</td>
                          <td className="text-end">{formatInr(p.unitPrice)}</td>
                          <td className="text-end fw-bold text-dark">{formatInr(p.total)}</td>
                        </tr>
                      ))}
                      <tr className="table-light fw-bold fs-14">
                        <td colSpan={5} className="text-end">Total Proposed Amount:</td>
                        <td className="text-end" style={{ color: THEME.primary }}>{formatInr(opp.amount)}</td>
                      </tr>
                    </tbody>
                  </Table>
                ) : (
                  <div className="text-center py-4 text-muted fs-13">
                    No products itemized yet. Opportunity amount is {formatInr(opp.amount)}.
                  </div>
                )}
              </CardBody>
            </Card>
          </TabPane>

          {/* ======================================================== */}
          {/* TAB 4: QUOTES TAB                                        */}
          {/* ======================================================== */}
          <TabPane tabId="quotes">
            <Card className="border shadow-sm" style={{ borderRadius: 0, borderColor: THEME.cardBorder }}>
              <CardBody className="p-4">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <h5 className="fw-bold text-dark mb-0">Quotations</h5>
                  <Button
                    color="danger"
                    size="sm"
                    className="fw-semibold px-3"
                    onClick={openCreateQuote}
                    style={{ backgroundColor: THEME.primary, borderColor: THEME.primary }}
                  >
                    + Create New Quote
                  </Button>
                </div>
                {quotesList.length > 0 ? (
                  <Table responsive hover className="align-middle fs-13">
                    <thead className="table-light">
                      <tr>
                        <th>Quote No</th>
                        <th>Quote Date</th>
                        <th>Valid Until</th>
                        <th className="text-end">Amount</th>
                        <th className="text-center">Status</th>
                        <th className="text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quotesList.map((q) => (
                        <tr key={q.id}>
                          <td className="fw-semibold" style={{ color: THEME.primary }}>{q.quoteNo}</td>
                          <td>{formatDate(q.quoteDate)}</td>
                          <td>{formatDate(q.expiryDate)}</td>
                          <td className="text-end fw-bold">{formatInr(q.amount)}</td>
                          <td className="text-center">
                            <span style={{ backgroundColor: "#fef2f2", color: THEME.primary, border: "1px solid #fee2e2", padding: "2px 8px", borderRadius: 0, fontSize: "11px", fontWeight: 600 }}>
                              {q.status}
                            </span>
                          </td>
                          <td className="text-center">
                            <Button color="light" size="sm" onClick={() => window.print()}>
                              Print
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                ) : (
                  <div className="text-center py-4 text-muted fs-13">
                    No formal quotes generated yet.
                    <div className="mt-2">
                      <Button color="danger" size="sm" onClick={openCreateQuote} style={{ backgroundColor: THEME.primary, borderColor: THEME.primary }}>
                        Generate First Quotation
                      </Button>
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>
          </TabPane>

          {/* ======================================================== */}
          {/* TAB 5: ACTIVITIES TAB (from tab_employee_activities)      */}
          {/* ======================================================== */}
          <TabPane tabId="activities">
            <Card className="border shadow-sm" style={{ borderRadius: 0, borderColor: THEME.cardBorder }}>
              <CardBody className="p-4">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <h5 className="fw-bold text-dark mb-0">Activities & Communications ({recentActivitiesList.length})</h5>
                  <Button
                    color="danger"
                    size="sm"
                    className="fw-semibold px-3"
                    onClick={() => setActivityModalOpen(true)}
                    style={{ backgroundColor: THEME.primary, borderColor: THEME.primary }}
                  >
                    + Log Activity
                  </Button>
                </div>
                {recentActivitiesList.length > 0 ? (
                  <div className="d-flex flex-column gap-3">
                    {recentActivitiesList.map((act) => (
                      <div
                        key={act.activityId}
                        className="p-3 border rounded-0-0 bg-white d-flex align-items-start gap-3"
                        style={{ borderColor: THEME.cardBorder }}
                      >
                        <div
                          className="rounded-0-0 d-flex align-items-center justify-content-center flex-shrink-0"
                          style={{ width: 36, height: 36, backgroundColor: act.bg, color: act.color, fontSize: "18px" }}
                        >
                          <i className={act.icon} />
                        </div>
                        <div className="flex-grow-1">
                          <div className="d-flex align-items-center justify-content-between">
                            <h6 className="fw-bold text-dark mb-0 fs-14">{act.title}</h6>
                            <span className="text-muted fs-12">{act.timestamp}</span>
                          </div>
                          {act.description && (
                            <p className="text-dark fs-13 mb-1 mt-1">{act.description}</p>
                          )}
                          {act.author && (
                            <span className="text-muted fs-11">Handled by: <strong className="text-dark">{act.author}</strong></span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-5 text-muted fs-13">
                    <i className="ri-calendar-event-line fs-32 d-block mb-2 text-muted opacity-50" />
                    No activities recorded in database yet.
                    <div className="mt-2">
                      <Button color="danger" size="sm" onClick={() => setActivityModalOpen(true)} style={{ backgroundColor: THEME.primary, borderColor: THEME.primary }}>
                        Log Call, Meeting or Note
                      </Button>
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>
          </TabPane>

          {/* ======================================================== */}
          {/* TAB 6: DOCUMENTS TAB (from tab_task_files)               */}
          {/* ======================================================== */}
          <TabPane tabId="documents">
            <Card className="border shadow-sm" style={{ borderRadius: 0, borderColor: THEME.cardBorder }}>
              <CardBody className="p-4">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <h5 className="fw-bold text-dark mb-0">Attached Documents ({attachmentsList.length})</h5>
                  <Button
                    color="danger"
                    size="sm"
                    className="fw-semibold px-3"
                    onClick={() => toastSuccess("Documents module upload ready.")}
                    style={{ backgroundColor: THEME.primary, borderColor: THEME.primary }}
                  >
                    + Upload Document
                  </Button>
                </div>
                {attachmentsList.length > 0 ? (
                  <Row className="g-3">
                    {attachmentsList.map((doc) => (
                      <Col md={4} key={doc.id}>
                        <div className="p-3 border rounded-0-0 bg-white d-flex align-items-center justify-content-between">
                          <div className="d-flex align-items-center gap-3">
                            <i className={`${doc.icon} fs-24`} style={{ color: doc.color }} />
                            <div>
                              <span className="fw-semibold text-dark fs-13 d-block text-truncate" style={{ maxWidth: 180 }}>
                                {doc.name}
                              </span>
                              <span className="text-muted fs-11">{doc.date}</span>
                            </div>
                          </div>
                          {doc.fileUrl && (
                            <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="btn btn-sm btn-light">
                              <i className="ri-download-line" />
                            </a>
                          )}
                        </div>
                      </Col>
                    ))}
                  </Row>
                ) : (
                  <div className="text-center py-5 text-muted fs-13">
                    <i className="ri-attachment-line fs-32 d-block mb-2 text-muted opacity-50" />
                    No documents attached to this opportunity.
                  </div>
                )}
              </CardBody>
            </Card>
          </TabPane>

          {/* ======================================================== */}
          {/* TAB 7: NOTES TAB (strictly saves to tab_opportunity)      */}
          {/* ======================================================== */}
          <TabPane tabId="notes">
            <Card className="border shadow-sm" style={{ borderRadius: 0, borderColor: THEME.cardBorder }}>
              <CardBody className="p-4">
                <h5 className="fw-bold text-dark mb-3">Internal Deal Notes</h5>
                {opp.closedReason ? (
                  <div className="p-3 rounded-0-0 mb-3" style={{ backgroundColor: "#fefce8", border: "1px solid #fef08a" }}>
                    <p className="text-dark fs-13 mb-1" style={{ whiteSpace: "pre-wrap" }}>
                      {opp.closedReason}
                    </p>
                    <div className="text-end text-muted fs-11">
                      Logged by {opp.ownerName || "Deal Owner"} on {formatDate(opp.updatedAt || opp.createdAt)}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-0-0 mb-3 text-center text-muted fs-13" style={{ backgroundColor: "#fefce8", border: "1px dashed #fde68a" }}>
                    No notes recorded in database for this deal yet.
                  </div>
                )}

                <Form onSubmit={handlePostNoteSubmit}>
                  <FormGroup>
                    <Label className="fw-semibold fs-13">Post new note to database</Label>
                    <Input
                      type="textarea"
                      rows={3}
                      required
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      placeholder="Write your internal observations, next steps or negotiation pointers..."
                    />
                  </FormGroup>
                  <Button
                    color="danger"
                    size="sm"
                    type="submit"
                    disabled={noteSubmitting}
                    style={{ backgroundColor: THEME.primary, borderColor: THEME.primary }}
                  >
                    {noteSubmitting ? <Spinner size="sm" className="me-1" /> : null}
                    Save Note to Database
                  </Button>
                </Form>
              </CardBody>
            </Card>
          </TabPane>

          {/* ======================================================== */}
          {/* TAB 8: TIMELINE TAB (100% built from database records)   */}
          {/* ======================================================== */}
          <TabPane tabId="timeline">
            <Card className="border shadow-sm" style={{ borderRadius: 0, borderColor: THEME.cardBorder }}>
              <CardBody className="p-4">
                <h5 className="fw-bold text-dark mb-3">Deal Audit Timeline</h5>
                <div className="d-flex flex-column gap-3 ps-3 border-start" style={{ borderColor: THEME.primary }}>
                  {/* Current State */}
                  <div className="position-relative">
                    <span className="position-absolute rounded-0-0" style={{ left: -22, top: 2, width: 12, height: 12, backgroundColor: isClosedWon ? "#16a34a" : "#d97706" }} />
                    <div className="fw-semibold text-dark fs-13">Current Stage: {opp.stageName}</div>
                    <div className="text-muted fs-11">
                      In this stage for {opp.daysInStage != null ? `${opp.daysInStage} Days` : "0 Days"} • Owner: {opp.ownerName || "Unassigned"}
                    </div>
                  </div>

                  {/* Real activities from database */}
                  {recentActivitiesList.map((act) => (
                    <div key={act.activityId} className="position-relative">
                      <span className="position-absolute rounded-0-0" style={{ left: -22, top: 2, width: 12, height: 12, backgroundColor: THEME.primary }} />
                      <div className="fw-semibold text-dark fs-13">{act.title}</div>
                      <div className="text-muted fs-11">{act.timestamp} {act.author ? `• by ${act.author}` : ""}</div>
                    </div>
                  ))}

                  {/* Creation Event */}
                  <div className="position-relative">
                    <span className="position-absolute rounded-0-0" style={{ left: -22, top: 2, width: 12, height: 12, backgroundColor: THEME.primary }} />
                    <div className="fw-semibold text-dark fs-13">Opportunity Created: {opp.name}</div>
                    <div className="text-muted fs-11">{formatDateTime(opp.createdAt)} • Deal Value: {formatInr(opp.amount)}</div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </TabPane>

          {/* ======================================================== */}
          {/* TAB 9: CONTACTS TAB (from tab_party_contact_persons)      */}
          {/* ======================================================== */}
          <TabPane tabId="contacts">
            <Card className="border shadow-sm" style={{ borderRadius: 0, borderColor: THEME.cardBorder }}>
              <CardBody className="p-4">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <h5 className="fw-bold text-dark mb-0">Customer Contact Persons ({keyContactsList.length})</h5>
                  <Button
                    color="danger"
                    size="sm"
                    className="fw-semibold px-3"
                    onClick={() => setContactModalOpen(true)}
                    style={{ backgroundColor: THEME.primary, borderColor: THEME.primary }}
                  >
                    + Add Contact Person
                  </Button>
                </div>
                {keyContactsList.length > 0 ? (
                  <Table responsive hover className="align-middle fs-13">
                    <thead className="table-light">
                      <tr>
                        <th>Name</th>
                        <th>Role / Designation</th>
                        <th>Email</th>
                        <th>Mobile</th>
                        <th className="text-center">Primary</th>
                        <th className="text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {keyContactsList.map((c) => (
                        <tr key={c.contactPersonId}>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <div
                                className="rounded-0-0 d-flex align-items-center justify-content-center text-white fw-bold"
                                style={{ width: 28, height: 28, fontSize: "11px", backgroundColor: THEME.primary }}
                              >
                                {getInitials(c.fullName)}
                              </div>
                              <span className="fw-semibold text-dark">{c.fullName}</span>
                            </div>
                          </td>
                          <td className="text-muted">{c.title || "Contact Person"}</td>
                          <td>
                            {c.email ? (
                              <a href={`mailto:${c.email}`} style={{ color: THEME.primary }}>{c.email}</a>
                            ) : "—"}
                          </td>
                          <td>
                            {c.mobile ? (
                              <a href={`tel:${c.mobile}`} className="text-dark">{c.mobile}</a>
                            ) : "—"}
                          </td>
                          <td className="text-center">
                            {c.isPrimary && (
                              <span style={{ backgroundColor: "#ecfdf5", color: "#047857", padding: "2px 8px", borderRadius: 0, fontSize: "11px", fontWeight: 600 }}>
                                Primary
                              </span>
                            )}
                          </td>
                          <td className="text-center">
                            <div className="d-flex justify-content-center gap-1">
                              {c.mobile && (
                                <a href={`tel:${c.mobile}`} className="btn btn-sm btn-light border py-1 px-2" title="Call">
                                  <i className="ri-phone-line" />
                                </a>
                              )}
                              {c.email && (
                                <a href={`mailto:${c.email}`} className="btn btn-sm btn-light border py-1 px-2" title="Email">
                                  <i className="ri-mail-line" />
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                ) : (
                  <div className="text-center py-5 text-muted fs-13">
                    <i className="ri-user-line fs-32 d-block mb-2 text-muted opacity-50" />
                    No contacts linked to this customer account in database.
                    <div className="mt-2">
                      <Button color="danger" size="sm" onClick={() => setContactModalOpen(true)} style={{ backgroundColor: THEME.primary, borderColor: THEME.primary }}>
                        + Add First Contact Person
                      </Button>
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>
          </TabPane>
        </TabContent>

        {/* ======================================================== */}
        {/* MODAL 1: EDIT OPPORTUNITY MODAL                          */}
        {/* ======================================================== */}
        <Modal
          isOpen={editModalOpen}
          toggle={() => setEditModalOpen((v) => !v)}
          size="lg"
          centered
        >
          <ModalHeader toggle={() => setEditModalOpen(false)}>
            <span className="fw-bold text-dark">Edit Opportunity</span>
          </ModalHeader>
          <Form onSubmit={handleEditSubmit}>
            <ModalBody className="p-4">
              <Row className="g-3">
                <Col md={12}>
                  <FormGroup>
                    <Label className="fw-semibold fs-13">Opportunity Name <span className="text-danger">*</span></Label>
                    <Input
                      type="text"
                      required
                      value={editForm.name}
                      onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="e.g. ABC Ltd. - ERP Implementation"
                    />
                  </FormGroup>
                </Col>

                <Col md={6}>
                  <FormGroup>
                    <Label className="fw-semibold fs-13">Customer Account <span className="text-danger">*</span></Label>
                    <Input
                      type="select"
                      required
                      value={editForm.accountId}
                      onChange={(e) => setEditForm((f) => ({ ...f, accountId: e.target.value }))}
                    >
                      <option value="">Select Customer Account...</option>
                      {customersList.map((c) => (
                        <option key={c.accountId} value={c.accountId}>
                          {c.displayName || c.companyName || `Account #${c.accountId}`}
                        </option>
                      ))}
                    </Input>
                  </FormGroup>
                </Col>

                <Col md={6}>
                  <FormGroup>
                    <Label className="fw-semibold fs-13">Deal Stage</Label>
                    <Input
                      type="select"
                      value={editForm.stageId}
                      onChange={(e) => setEditForm((f) => ({ ...f, stageId: e.target.value }))}
                    >
                      {stagesList.map((st) => (
                        <option key={st.stageId} value={st.stageId}>
                          {st.stageName}
                        </option>
                      ))}
                    </Input>
                  </FormGroup>
                </Col>

                <Col md={6}>
                  <FormGroup>
                    <Label className="fw-semibold fs-13">Amount (INR)</Label>
                    <Input
                      type="number"
                      step="any"
                      value={editForm.amount}
                      onChange={(e) => setEditForm((f) => ({ ...f, amount: e.target.value }))}
                      placeholder="1850000"
                    />
                  </FormGroup>
                </Col>

                <Col md={6}>
                  <FormGroup>
                    <Label className="fw-semibold fs-13">Probability (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={editForm.probability}
                      onChange={(e) => setEditForm((f) => ({ ...f, probability: e.target.value }))}
                    />
                  </FormGroup>
                </Col>

                <Col md={6}>
                  <FormGroup>
                    <Label className="fw-semibold fs-13">Expected Close Date</Label>
                    <Input
                      type="date"
                      value={editForm.expectedCloseDate}
                      onChange={(e) => setEditForm((f) => ({ ...f, expectedCloseDate: e.target.value }))}
                    />
                  </FormGroup>
                </Col>

                <Col md={6}>
                  <FormGroup>
                    <Label className="fw-semibold fs-13">Opportunity Owner</Label>
                    <Input
                      type="select"
                      value={editForm.ownerEmployeeId}
                      onChange={(e) => setEditForm((f) => ({ ...f, ownerEmployeeId: e.target.value }))}
                    >
                      <option value="">Unassigned</option>
                      {ownersList.map((o) => (
                        <option key={o.ownerId} value={o.ownerId}>
                          {o.fullName} ({o.ownerCode})
                        </option>
                      ))}
                    </Input>
                  </FormGroup>
                </Col>

                <Col md={4}>
                  <FormGroup>
                    <Label className="fw-semibold fs-13">Opportunity Type</Label>
                    <Input
                      type="select"
                      value={editForm.opportunityTypeId}
                      onChange={(e) => setEditForm((f) => ({ ...f, opportunityTypeId: e.target.value }))}
                    >
                      <option value="">Default</option>
                      {lookupTypes.map((t) => (
                        <option key={t.masterId} value={t.masterId}>
                          {t.masterName}
                        </option>
                      ))}
                    </Input>
                  </FormGroup>
                </Col>

                <Col md={4}>
                  <FormGroup>
                    <Label className="fw-semibold fs-13">Lead Source</Label>
                    <Input
                      type="select"
                      value={editForm.sourceId}
                      onChange={(e) => setEditForm((f) => ({ ...f, sourceId: e.target.value }))}
                    >
                      <option value="">Default</option>
                      {lookupSources.map((s) => (
                        <option key={s.masterId} value={s.masterId}>
                          {s.masterName}
                        </option>
                      ))}
                    </Input>
                  </FormGroup>
                </Col>

                <Col md={4}>
                  <FormGroup>
                    <Label className="fw-semibold fs-13">Priority</Label>
                    <Input
                      type="select"
                      value={editForm.priorityId}
                      onChange={(e) => setEditForm((f) => ({ ...f, priorityId: e.target.value }))}
                    >
                      <option value="">Default</option>
                      {lookupPriorities.map((p) => (
                        <option key={p.masterId} value={p.masterId}>
                          {p.masterName}
                        </option>
                      ))}
                    </Input>
                  </FormGroup>
                </Col>

                <Col md={12}>
                  <FormGroup>
                    <Label className="fw-semibold fs-13">Next Step / Follow-up Action</Label>
                    <Input
                      type="text"
                      value={editForm.nextStep}
                      onChange={(e) => setEditForm((f) => ({ ...f, nextStep: e.target.value }))}
                      placeholder="e.g. Finalize commercial terms & pricing"
                    />
                  </FormGroup>
                </Col>

                <Col md={12}>
                  <FormGroup>
                    <Label className="fw-semibold fs-13">Scope & Notes / Closed Reason</Label>
                    <Input
                      type="textarea"
                      rows={2}
                      value={editForm.closedReason}
                      onChange={(e) => setEditForm((f) => ({ ...f, closedReason: e.target.value }))}
                      placeholder="Description of requirements or outcome..."
                    />
                  </FormGroup>
                </Col>
              </Row>
            </ModalBody>
            <ModalFooter className="bg-light">
              <Button
                color="light"
                size="sm"
                className="px-3"
                onClick={() => setEditModalOpen(false)}
                disabled={editSubmitting}
              >
                Cancel
              </Button>
              <Button
                color="danger"
                size="sm"
                className="px-4 fw-semibold"
                style={{ backgroundColor: THEME.primary, borderColor: THEME.primary }}
                type="submit"
                disabled={editSubmitting}
              >
                {editSubmitting ? <Spinner size="sm" className="me-1" /> : null}
                Save Changes
              </Button>
            </ModalFooter>
          </Form>
        </Modal>

        {/* ======================================================== */}
        {/* MODAL 2: ADD NEXT STEP / TASK MODAL                      */}
        {/* ======================================================== */}
        <Modal
          isOpen={taskModalOpen}
          toggle={() => setTaskModalOpen((v) => !v)}
          centered
        >
          <ModalHeader toggle={() => setTaskModalOpen(false)}>
            <span className="fw-bold text-dark">Add Follow-up / Next Step</span>
          </ModalHeader>
          <Form onSubmit={handleAddTaskSubmit}>
            <ModalBody className="p-4">
              <FormGroup>
                <Label className="fw-semibold fs-13">Task Title <span className="text-danger">*</span></Label>
                <Input
                  type="text"
                  required
                  value={taskForm.title}
                  onChange={(e) => setTaskForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Finalize commercial terms & sign contract"
                />
              </FormGroup>
              <Row className="g-3">
                <Col md={6}>
                  <FormGroup>
                    <Label className="fw-semibold fs-13">Due Date</Label>
                    <Input
                      type="date"
                      value={taskForm.dueDate}
                      onChange={(e) => setTaskForm((f) => ({ ...f, dueDate: e.target.value }))}
                    />
                  </FormGroup>
                </Col>
                <Col md={6}>
                  <FormGroup>
                    <Label className="fw-semibold fs-13">Priority</Label>
                    <Input
                      type="select"
                      value={taskForm.priority}
                      onChange={(e) => setTaskForm((f) => ({ ...f, priority: e.target.value }))}
                    >
                      <option value="HIGH">High</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="LOW">Low</option>
                    </Input>
                  </FormGroup>
                </Col>
              </Row>
            </ModalBody>
            <ModalFooter className="bg-light">
              <Button
                color="light"
                size="sm"
                className="px-3"
                onClick={() => setTaskModalOpen(false)}
                disabled={taskSubmitting}
              >
                Cancel
              </Button>
              <Button
                color="danger"
                size="sm"
                className="px-4 fw-semibold"
                style={{ backgroundColor: THEME.primary, borderColor: THEME.primary }}
                type="submit"
                disabled={taskSubmitting}
              >
                {taskSubmitting ? <Spinner size="sm" className="me-1" /> : null}
                Create Task
              </Button>
            </ModalFooter>
          </Form>
        </Modal>

        {/* ======================================================== */}
        {/* MODAL 3: LOG ACTIVITY MODAL                              */}
        {/* ======================================================== */}
        <Modal
          isOpen={activityModalOpen}
          toggle={() => setActivityModalOpen((v) => !v)}
          centered
        >
          <ModalHeader toggle={() => setActivityModalOpen(false)}>
            <span className="fw-bold text-dark">Log Activity for Opportunity</span>
          </ModalHeader>
          <Form onSubmit={handleAddActivitySubmit}>
            <ModalBody className="p-4">
              <Row className="g-3">
                <Col md={6}>
                  <FormGroup>
                    <Label className="fw-semibold fs-13">Activity Type <span className="text-danger">*</span></Label>
                    <Input
                      type="select"
                      value={activityForm.actType}
                      onChange={(e) => setActivityForm((f) => ({ ...f, actType: e.target.value }))}
                    >
                      <option value="CALL">Phone Call</option>
                      <option value="MEETING">Meeting</option>
                      <option value="EMAIL">Email</option>
                      <option value="DEMO">Product Demo</option>
                      <option value="VISIT">Client Visit</option>
                    </Input>
                  </FormGroup>
                </Col>
                <Col md={6}>
                  <FormGroup>
                    <Label className="fw-semibold fs-13">Date & Time</Label>
                    <Input
                      type="datetime-local"
                      value={activityForm.startTime}
                      onChange={(e) => setActivityForm((f) => ({ ...f, startTime: e.target.value }))}
                    />
                  </FormGroup>
                </Col>
                <Col md={12}>
                  <FormGroup>
                    <Label className="fw-semibold fs-13">Subject <span className="text-danger">*</span></Label>
                    <Input
                      type="text"
                      required
                      placeholder="e.g. Follow-up call regarding price proposal"
                      value={activityForm.subject}
                      onChange={(e) => setActivityForm((f) => ({ ...f, subject: e.target.value }))}
                    />
                  </FormGroup>
                </Col>
                <Col md={12}>
                  <FormGroup>
                    <Label className="fw-semibold fs-13">Phone Number (optional)</Label>
                    <Input
                      type="text"
                      placeholder="+91 98765 43210"
                      value={activityForm.phoneNumber}
                      onChange={(e) => setActivityForm((f) => ({ ...f, phoneNumber: e.target.value }))}
                    />
                  </FormGroup>
                </Col>
                <Col md={12}>
                  <FormGroup>
                    <Label className="fw-semibold fs-13">Notes & Discussion Summary</Label>
                    <Input
                      type="textarea"
                      rows={3}
                      placeholder="Enter points discussed, agreements reached or concerns raised..."
                      value={activityForm.notes}
                      onChange={(e) => setActivityForm((f) => ({ ...f, notes: e.target.value }))}
                    />
                  </FormGroup>
                </Col>
              </Row>
            </ModalBody>
            <ModalFooter className="bg-light">
              <Button
                color="light"
                size="sm"
                className="px-3"
                onClick={() => setActivityModalOpen(false)}
                disabled={activitySubmitting}
              >
                Cancel
              </Button>
              <Button
                color="danger"
                size="sm"
                className="px-4 fw-semibold"
                style={{ backgroundColor: THEME.primary, borderColor: THEME.primary }}
                type="submit"
                disabled={activitySubmitting}
              >
                {activitySubmitting ? <Spinner size="sm" className="me-1" /> : null}
                Save Activity
              </Button>
            </ModalFooter>
          </Form>
        </Modal>

        {/* ======================================================== */}
        {/* MODAL 4: ADD CONTACT PERSON MODAL                        */}
        {/* ======================================================== */}
        <Modal
          isOpen={contactModalOpen}
          toggle={() => setContactModalOpen((v) => !v)}
          centered
        >
          <ModalHeader toggle={() => setContactModalOpen(false)}>
            <span className="fw-bold text-dark">Add Customer Contact Person</span>
          </ModalHeader>
          <Form onSubmit={handleAddContactSubmit}>
            <ModalBody className="p-4">
              <Row className="g-3">
                <Col md={6}>
                  <FormGroup>
                    <Label className="fw-semibold fs-13">First Name <span className="text-danger">*</span></Label>
                    <Input
                      type="text"
                      required
                      placeholder="e.g. Rajesh"
                      value={contactForm.firstName}
                      onChange={(e) => setContactForm((f) => ({ ...f, firstName: e.target.value }))}
                    />
                  </FormGroup>
                </Col>
                <Col md={6}>
                  <FormGroup>
                    <Label className="fw-semibold fs-13">Last Name</Label>
                    <Input
                      type="text"
                      placeholder="e.g. Mehta"
                      value={contactForm.lastName}
                      onChange={(e) => setContactForm((f) => ({ ...f, lastName: e.target.value }))}
                    />
                  </FormGroup>
                </Col>
                <Col md={6}>
                  <FormGroup>
                    <Label className="fw-semibold fs-13">Mobile <span className="text-danger">*</span></Label>
                    <Input
                      type="text"
                      required
                      placeholder="+91 98765 43210"
                      value={contactForm.mobile}
                      onChange={(e) => setContactForm((f) => ({ ...f, mobile: e.target.value }))}
                    />
                  </FormGroup>
                </Col>
                <Col md={6}>
                  <FormGroup>
                    <Label className="fw-semibold fs-13">Email</Label>
                    <Input
                      type="email"
                      placeholder="rajesh@abcltd.com"
                      value={contactForm.email}
                      onChange={(e) => setContactForm((f) => ({ ...f, email: e.target.value }))}
                    />
                  </FormGroup>
                </Col>
                <Col md={12}>
                  <div className="form-check">
                    <input
                      type="checkbox"
                      id="isPrimaryContact"
                      className="form-check-input"
                      checked={contactForm.isPrimary}
                      onChange={(e) => setContactForm((f) => ({ ...f, isPrimary: e.target.checked }))}
                    />
                    <label htmlFor="isPrimaryContact" className="form-check-label fs-13 text-dark">
                      Set as Primary Contact for this Account
                    </label>
                  </div>
                </Col>
              </Row>
            </ModalBody>
            <ModalFooter className="bg-light">
              <Button
                color="light"
                size="sm"
                className="px-3"
                onClick={() => setContactModalOpen(false)}
                disabled={contactSubmitting}
              >
                Cancel
              </Button>
              <Button
                color="danger"
                size="sm"
                className="px-4 fw-semibold"
                style={{ backgroundColor: THEME.primary, borderColor: THEME.primary }}
                type="submit"
                disabled={contactSubmitting}
              >
                {contactSubmitting ? <Spinner size="sm" className="me-1" /> : null}
                Add Contact
              </Button>
            </ModalFooter>
          </Form>
        </Modal>

        {/* ======================================================== */}
        {/* MODAL 5: CREATE / VIEW QUOTATION MODAL                   */}
        {/* ======================================================== */}
        <Modal
          isOpen={quoteModalOpen}
          toggle={() => setQuoteModalOpen((v) => !v)}
          size="lg"
          centered
        >
          <ModalHeader toggle={() => setQuoteModalOpen(false)}>
            <span className="fw-bold text-dark">Generate Quotation • {quoteForm.quoteNo}</span>
          </ModalHeader>
          <Form onSubmit={handleSaveQuote}>
            <ModalBody className="p-4">
              <Row className="g-3 mb-3">
                <Col md={6}>
                  <FormGroup>
                    <Label className="fw-semibold fs-13">Quotation Number</Label>
                    <Input
                      type="text"
                      value={quoteForm.quoteNo}
                      onChange={(e) => setQuoteForm((f) => ({ ...f, quoteNo: e.target.value }))}
                      required
                    />
                  </FormGroup>
                </Col>
                <Col md={6}>
                  <FormGroup>
                    <Label className="fw-semibold fs-13">Valid Until</Label>
                    <Input
                      type="date"
                      value={quoteForm.expiryDate}
                      onChange={(e) => setQuoteForm((f) => ({ ...f, expiryDate: e.target.value }))}
                      required
                    />
                  </FormGroup>
                </Col>
              </Row>

              <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                <div>
                  <h6 className="fw-bold text-dark mb-0 fs-15">{opp.name}</h6>
                  <span className="text-muted fs-12">Customer: {opp.accountName}</span>
                </div>
                <div className="text-end">
                  <span className="badge bg-success-subtle text-success fs-12 px-2 py-1">Deal Currency: {opp.currencyCode || "INR"}</span>
                </div>
              </div>

              <Table responsive className="align-middle fs-13">
                <thead className="table-light">
                  <tr>
                    <th>Scope / Service</th>
                    <th className="text-center">Qty</th>
                    <th className="text-end">Rate</th>
                    <th className="text-end">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {productsList.map((p) => (
                    <tr key={p.id}>
                      <td className="fw-semibold text-dark">{p.name}</td>
                      <td className="text-center">{p.qty}</td>
                      <td className="text-end">{formatInr(p.unitPrice)}</td>
                      <td className="text-end fw-bold">{formatInr(p.total)}</td>
                    </tr>
                  ))}
                  <tr className="table-light fw-bold fs-14">
                    <td colSpan={3} className="text-end">Total Proposed Amount:</td>
                    <td className="text-end" style={{ color: THEME.primary }}>{formatInr(opp.amount)}</td>
                  </tr>
                </tbody>
              </Table>
            </ModalBody>
            <ModalFooter className="bg-light">
              <Button color="light" size="sm" onClick={() => setQuoteModalOpen(false)}>
                Cancel
              </Button>
              <Button
                color="danger"
                size="sm"
                type="submit"
                className="fw-semibold px-3"
                style={{ backgroundColor: THEME.primary, borderColor: THEME.primary }}
              >
                <i className="ri-save-line me-1" /> Save Quotation
              </Button>
            </ModalFooter>
          </Form>
        </Modal>

        {/* ======================================================== */}
        {/* MODAL 6: ADD TEAM MEMBER MODAL                           */}
        {/* ======================================================== */}
        <Modal
          isOpen={teamModalOpen}
          toggle={() => setTeamModalOpen((v) => !v)}
          centered
        >
          <ModalHeader toggle={() => setTeamModalOpen(false)}>
            <span className="fw-bold text-dark">Add Team Member to Opportunity</span>
          </ModalHeader>
          <Form onSubmit={handleAddTeamMember}>
            <ModalBody className="p-4">
              <FormGroup>
                <Label className="fw-semibold fs-13">Employee / Staff Member <span className="text-danger">*</span></Label>
                <Input
                  type="select"
                  value={newMemberId}
                  onChange={(e) => setNewMemberId(e.target.value)}
                  required
                >
                  <option value="">Select Employee...</option>
                  {ownersList.map((o) => (
                    <option key={o.ownerId} value={o.ownerId}>
                      {o.fullName} ({o.ownerCode})
                    </option>
                  ))}
                </Input>
              </FormGroup>
              <FormGroup>
                <Label className="fw-semibold fs-13">Role in Deal</Label>
                <Input
                  type="select"
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value)}
                >
                  <option value="Sales Executive">Sales Executive</option>
                  <option value="Pre-Sales Engineer">Pre-Sales Engineer</option>
                  <option value="Technical Architect">Technical Architect</option>
                  <option value="Delivery Lead">Delivery Lead</option>
                </Input>
              </FormGroup>
            </ModalBody>
            <ModalFooter className="bg-light">
              <Button color="light" size="sm" onClick={() => setTeamModalOpen(false)}>
                Cancel
              </Button>
              <Button
                color="danger"
                size="sm"
                type="submit"
                className="fw-semibold px-3"
                style={{ backgroundColor: THEME.primary, borderColor: THEME.primary }}
              >
                Add Member
              </Button>
            </ModalFooter>
          </Form>
        </Modal>

        {/* ======================================================== */}
        {/* MODAL 7: ADD COMPETITOR MODAL                            */}
        {/* ======================================================== */}
        <Modal
          isOpen={competitorModalOpen}
          toggle={() => setCompetitorModalOpen((v) => !v)}
          centered
        >
          <ModalHeader toggle={() => setCompetitorModalOpen(false)}>
            <span className="fw-bold text-dark">Track Competitor</span>
          </ModalHeader>
          <Form onSubmit={handleAddCompetitor}>
            <ModalBody className="p-4">
              <FormGroup>
                <Label className="fw-semibold fs-13">Competitor Product / Company <span className="text-danger">*</span></Label>
                <Input
                  type="text"
                  required
                  placeholder="e.g. Competitor Solutions Ltd."
                  value={newCompetitorName}
                  onChange={(e) => setNewCompetitorName(e.target.value)}
                />
              </FormGroup>
              <FormGroup>
                <Label className="fw-semibold fs-13">Threat Level</Label>
                <Input
                  type="select"
                  value={newCompetitorThreat}
                  onChange={(e) => setNewCompetitorThreat(e.target.value)}
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </Input>
              </FormGroup>
            </ModalBody>
            <ModalFooter className="bg-light">
              <Button color="light" size="sm" onClick={() => setCompetitorModalOpen(false)}>
                Cancel
              </Button>
              <Button
                color="danger"
                size="sm"
                type="submit"
                className="fw-semibold px-3"
                style={{ backgroundColor: THEME.primary, borderColor: THEME.primary }}
              >
                Save Competitor
              </Button>
            </ModalFooter>
          </Form>
        </Modal>
      </Container>
    </div>
  );
};

export default OpportunityDetail;
