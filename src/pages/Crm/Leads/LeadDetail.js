import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Badge,
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
  Nav,
  NavItem,
  NavLink,
  Row,
  Spinner,
  TabContent,
  TabPane,
} from "reactstrap";
import { Link, useNavigate, useParams } from "react-router-dom";
import classnames from "classnames";
import DeleteModal from "../../../Components/Common/DeleteModal";
import {
  deactivateLead,
  getLeadById,
  getLeadLookups,
  updateLead,
} from "../../../helpers/crmLeadApi";
import { getOwnerDropdown } from "../../../helpers/crmOwnerApi";
import { getOpportunities, createOpportunity } from "../../../helpers/crmOpportunityApi";
import { getActivities, createActivity } from "../../../helpers/crmActivityApi";
import { getContacts, createContact } from "../../../helpers/crmContactApi";
import { createCustomer } from "../../../helpers/crmCustomerApi";
import { toastApiError, toastSuccess } from "../../../helpers/crmToast";

const statusBadge = (name) => {
  const v = (name || "").toLowerCase();
  if (v.includes("new")) return "bg-primary-subtle text-primary border border-primary-subtle";
  if (v.includes("contacted")) return "bg-info-subtle text-info border border-info-subtle";
  if (v.includes("qualified") || v.includes("converted"))
    return "bg-success-subtle text-success border border-success-subtle";
  if (v.includes("proposal") || v.includes("negotiation"))
    return "bg-warning-subtle text-warning border border-warning-subtle";
  if (v.includes("lost")) return "bg-danger-subtle text-danger border border-danger-subtle";
  return "bg-secondary-subtle text-secondary border border-secondary-subtle";
};

const renderRating = (ratingName) => {
  if (!ratingName) return <span className="text-muted">—</span>;
  const r = String(ratingName).toUpperCase();
  let stars = 3;
  if (r.includes("HOT")) stars = 5;
  else if (r.includes("WARM")) stars = 4;
  else if (r.includes("COLD")) stars = 2;
  return (
    <span className="text-warning fs-13 text-nowrap">
      {[1, 2, 3, 4, 5].map((s) => (
        <i
          key={s}
          className={s <= stars ? "ri-star-fill text-warning me-1" : "ri-star-line text-muted opacity-40 me-1"}
        />
      ))}
    </span>
  );
};

const formatDate = (val) => {
  if (!val) return "—";
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
};

const formatTimeOrDate = (val) => {
  if (!val) return "—";
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return d.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(val);
  }
};

const formatFollowUpFriendly = (raw) => {
  if (!raw) return null;
  const clean = String(raw).split("(")[0].trim();
  if (!clean) return null;
  const lower = clean.toLowerCase();
  if (lower.startsWith("today") || lower.startsWith("tomorrow")) {
    return clean;
  }
  try {
    const isoLike = clean.includes(" ") ? clean.replace(" ", "T") : clean;
    const d = new Date(isoLike);
    if (isNaN(d.getTime())) return clean;
    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow =
      d.getDate() === tomorrow.getDate() &&
      d.getMonth() === tomorrow.getMonth() &&
      d.getFullYear() === tomorrow.getFullYear();
    const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (isToday) return `Today, ${timeStr}`;
    if (isTomorrow) return `Tomorrow, ${timeStr}`;
    return `${d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}, ${timeStr}`;
  } catch {
    return clean;
  }
};

/** Circular SVG Progress Gauge Component for AI Score & Engagement matching SoftOnCloud theme */
const CircularGauge = ({ value, max = 100, label, color = "#7f1d1d", size = 68 }) => {
  const strokeWidth = 6;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(value, 0), max);
  const strokeDashoffset = circumference - (progress / max) * circumference;

  return (
    <div className="position-relative d-inline-flex align-items-center justify-content-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        {/* Warm theme background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#fee2e2"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Dynamic theme progress stroke */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
      </svg>
      <div className="position-absolute text-center" style={{ lineHeight: 1 }}>
        <div className="fw-bold fs-14" style={{ color: color }}>{value}</div>
        {label ? <div className="text-muted" style={{ fontSize: "9px" }}>{label}</div> : null}
      </div>
    </div>
  );
};

/** Parses structured lead metadata cleanly from description */
const parseLeadContent = (description) => {
  if (!description) {
    return { notes: "", extras: {}, followUp: null, address: "" };
  }

  let notes = description;
  const extras = {};
  let address = "";
  let followUp = null;

  if (description.includes("--- Additional Info ---")) {
    const parts = description.split("--- Additional Info ---");
    notes = parts[0].trim();
    const extraLines = parts[1].split("\n").map((l) => l.trim()).filter(Boolean);

    extraLines.forEach((line) => {
      const colonIdx = line.indexOf(":");
      if (colonIdx > -1) {
        const key = line.slice(0, colonIdx).trim();
        const val = line.slice(colonIdx + 1).trim();
        if (key === "Billing Address") {
          address = val;
        } else if (key === "Next Follow-up Reminder") {
          followUp = val;
        } else {
          extras[key] = val;
        }
      }
    });
  }

  return { notes, extras, followUp, address };
};

/** Dynamic AI Lead Score computed strictly from actual lead database attributes using theme colors */
const computeLeadScore = (lead) => {
  if (!lead) return { score: 0, label: "Unscored", color: "#64748b", desc: "No data available" };
  let score = 20;
  if (lead.leadName) score += 10;
  if (lead.companyName) score += 15;
  if (lead.mobile) score += 15;
  if (lead.email) score += 15;
  if (lead.website) score += 10;
  if (lead.estimatedValue && Number(lead.estimatedValue) > 0) score += 15;
  const rating = (lead.ratingName || "").toUpperCase();
  if (rating.includes("HOT")) score += 20;
  else if (rating.includes("WARM")) score += 10;
  else if (rating.includes("COLD")) score += 5;

  score = Math.min(score, 100);

  if (score >= 80) return { score, label: "Excellent", color: "#7f1d1d", desc: "High chance of conversion" };
  if (score >= 60) return { score, label: "Good", color: "#991b1b", desc: "Actively progressing" };
  if (score >= 40) return { score, label: "Moderate", color: "#c2410c", desc: "Requires follow-up" };
  return { score, label: "Low", color: "#64748b", desc: "Needs qualification" };
};

/** Dynamic Engagement Level computed from actual activities count in database using theme colors */
const computeEngagementLevel = (actCount) => {
  if (!actCount || actCount === 0) {
    return { percent: 15, label: "Initial", color: "#64748b", desc: "No recent activity logged" };
  }
  if (actCount === 1) {
    return { percent: 40, label: "Fair", color: "#c2410c", desc: "Initial contact made" };
  }
  if (actCount === 2) {
    return { percent: 65, label: "Active", color: "#991b1b", desc: "Ongoing discussions" };
  }
  const percent = Math.min(95, 65 + (actCount - 2) * 10);
  return { percent, label: "Good", color: "#7f1d1d", desc: "Actively Engaged" };
};

const LeadDetail = () => {
  const { leadId } = useParams();
  const navigate = useNavigate();

  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  // Dynamic real data fetched from database
  const [opportunities, setOpportunities] = useState([]);
  const [activities, setActivities] = useState([]);
  const [contacts, setContacts] = useState([]);

  // Modals state
  const [editModal, setEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({});
  const [lookups, setLookups] = useState({ leadSource: [], leadStatus: [], leadRating: [] });
  const [ownerOptions, setOwnerOptions] = useState([]);

  const [deleteModal, setDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Workflow Modals
  const [convertModal, setConvertModal] = useState(false);
  const [converting, setConverting] = useState(false);
  const [convertForm, setConvertForm] = useState({
    companyName: "",
    contactName: "",
    email: "",
    mobile: "",
    createOpportunity: false,
    opportunityName: "",
    opportunityAmount: "",
  });

  const [activityModal, setActivityModal] = useState(false);
  const [savingActivity, setSavingActivity] = useState(false);
  const [activityForm, setActivityForm] = useState({
    actType: "CALL",
    reason: "",
    callNotes: "",
    startTime: new Date().toISOString().slice(0, 16),
  });

  const [addContactModal, setAddContactModal] = useState(false);
  const [savingContact, setSavingContact] = useState(false);
  const [newContactForm, setNewContactForm] = useState({
    salutation: "Mr.",
    firstName: "",
    lastName: "",
    email: "",
    mobile: "",
    workPhone: "",
  });

  const [emailModal, setEmailModal] = useState(false);
  const [emailForm, setEmailForm] = useState({ to: "", subject: "", message: "" });

  const [noteModal, setNoteModal] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const [rescheduleModal, setRescheduleModal] = useState(false);
  const [newFollowUpDate, setNewFollowUpDate] = useState("");
  const [savingReschedule, setSavingReschedule] = useState(false);

  const [moreDropdown, setMoreDropdown] = useState(false);
  const [attachingDoc, setAttachingDoc] = useState(false);

  // Dynamic session notes & tags state
  const [notesList, setNotesList] = useState([]);
  const [tagsList, setTagsList] = useState([]);
  const [newTagInput, setNewTagInput] = useState("");
  const [showAddTag, setShowAddTag] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getLeadById(leadId);
      setLead(data);

      // Prepopulate convert form
      setConvertForm({
        companyName: data.companyName || data.leadName || "",
        contactName: data.leadName || "",
        email: data.email || "",
        mobile: data.mobile || "",
        createOpportunity: Boolean(data.estimatedValue && Number(data.estimatedValue) > 0),
        opportunityName: `${data.companyName || data.leadName} - Deal`,
        opportunityAmount: data.estimatedValue ? String(data.estimatedValue) : "",
      });

      // Parse structured description from DB
      const parsed = parseLeadContent(data.description);

      // Initialize notes from actual database description
      const initialNotes = [];
      if (parsed.notes && parsed.notes.trim()) {
        initialNotes.push({
          id: 1,
          text: parsed.notes.trim(),
          author: data.leadName || "Lead Contact",
          date: formatDate(data.createdAt),
          bg: "#fef9c3",
          border: "#fef08a",
          textColor: "#713f12",
        });
      }
      setNotesList(initialNotes);

      // Initialize tags dynamically from parsed description or lead metadata
      if (parsed.extras["Tags"]) {
        const parsedTags = parsed.extras["Tags"].split(",").map((t) => t.trim()).filter(Boolean);
        setTagsList(parsedTags);
      } else {
        const derived = [data.ratingName, data.sourceName, data.industry].filter(Boolean);
        setTagsList(derived.length > 0 ? derived : []);
      }

      // Initialize primary contact from lead record
      const primaryContact = {
        id: "primary",
        name: data.leadName,
        title: data.designation || "Primary Contact",
        isPrimary: true,
        phone: data.mobile,
        email: data.email || "—",
      };

      // Load related Opportunities from database
      try {
        const oppsRes = await getOpportunities({
          accountId: data.convertedAccountId || undefined,
        });
        const oppList = Array.isArray(oppsRes) ? oppsRes : oppsRes?.items || [];
        setOpportunities(oppList);
      } catch {
        setOpportunities([]);
      }

      // Load related Activities from database
      try {
        const actRes = await getActivities({
          employeeId: data.ownerEmployeeId || undefined,
          limit: 15,
        });
        const actList = Array.isArray(actRes) ? actRes : actRes?.items || [];
        setActivities(actList);
      } catch {
        setActivities([]);
      }

      // Load related Contacts from database if converted, or use lead primary
      if (data.convertedAccountId) {
        try {
          const contactRes = await getContacts({ accountId: data.convertedAccountId });
          const contactList = Array.isArray(contactRes) ? contactRes : contactRes?.items || [];
          if (contactList.length > 0) {
            setContacts(
              contactList.map((c) => ({
                id: c.contactPersonId || c.contact_person_id,
                name: `${c.firstName || ""} ${c.lastName || ""}`.trim() || data.leadName,
                title: c.salutation || "Contact Person",
                isPrimary: Boolean(c.isPrimary ?? c.is_primary),
                phone: c.mobile || c.workPhone || "—",
                email: c.email || "—",
              }))
            );
          } else {
            setContacts([primaryContact]);
          }
        } catch {
          setContacts([primaryContact]);
        }
      } else {
        setContacts([primaryContact]);
      }
    } catch (err) {
      setError(err?.message || "Failed to load lead profile from database.");
      toastApiError(err, "Failed to load lead profile.");
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    load();
  }, [load]);

  const openEdit = async () => {
    if (!lead) return;
    setFormError("");
    setForm({
      leadName: lead.leadName || "",
      companyName: lead.companyName || "",
      designation: lead.designation || "",
      industry: lead.industry || "",
      mobile: lead.mobile || "",
      phone: lead.phone || "",
      email: lead.email || "",
      website: lead.website || "",
      sourceId: lead.sourceId ? String(lead.sourceId) : "",
      statusId: lead.statusId ? String(lead.statusId) : "",
      ratingId: lead.ratingId ? String(lead.ratingId) : "",
      estimatedValue: lead.estimatedValue != null ? String(lead.estimatedValue) : "",
      expectedCloseDate: lead.expectedCloseDate || "",
      description: lead.description || "",
      ownerEmployeeId: lead.ownerEmployeeId ? String(lead.ownerEmployeeId) : "",
    });

    try {
      const [lk, owners] = await Promise.all([
        getLeadLookups().catch(() => ({ leadSource: [], leadStatus: [], leadRating: [] })),
        getOwnerDropdown().catch(() => []),
      ]);
      setLookups(lk || { leadSource: [], leadStatus: [], leadRating: [] });
      setOwnerOptions(owners || []);
    } catch {
      // ignore
    }
    setEditModal(true);
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!form.leadName?.trim()) {
      setFormError("Lead Name is required.");
      return;
    }
    if (!form.mobile?.trim()) {
      setFormError("Mobile is required.");
      return;
    }
    if (!form.statusId) {
      setFormError("Status is required.");
      return;
    }

    setSaving(true);
    setFormError("");
    try {
      await updateLead(leadId, {
        leadName: form.leadName.trim(),
        companyName: form.companyName?.trim() || null,
        designation: form.designation?.trim() || null,
        industry: form.industry?.trim() || null,
        email: form.email?.trim() || null,
        mobile: form.mobile.trim(),
        phone: form.phone?.trim() || null,
        website: form.website?.trim() || null,
        sourceId: form.sourceId ? Number(form.sourceId) : null,
        statusId: Number(form.statusId),
        ratingId: form.ratingId ? Number(form.ratingId) : null,
        estimatedValue: form.estimatedValue ? Number(form.estimatedValue) : null,
        expectedCloseDate: form.expectedCloseDate || null,
        description: form.description?.trim() || null,
        ownerEmployeeId: form.ownerEmployeeId ? Number(form.ownerEmployeeId) : null,
      });
      toastSuccess("Lead updated successfully in database.");
      setEditModal(false);
      await load();
    } catch (err) {
      setFormError(err?.message || "Update failed.");
      toastApiError(err, "Failed to update lead.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await deactivateLead(leadId);
      toastSuccess("Lead deactivated successfully.");
      setDeleteModal(false);
      navigate("/crm/leads");
    } catch (err) {
      toastApiError(err, "Failed to delete lead.");
    } finally {
      setDeleting(false);
    }
  };

  // Real Database Lead Conversion Workflow
  const handleConvertLead = async () => {
    setConverting(true);
    try {
      // 1. Create official Customer record in tab_account_master
      const custRes = await createCustomer({
        displayName: convertForm.companyName.trim(),
        companyName: convertForm.companyName.trim(),
        email: convertForm.email?.trim() || null,
        phoneMobile: convertForm.mobile.trim(),
        partyType: "CUSTOMER",
      });
      const newAccountId = custRes?.accountId || custRes?.account_id;

      let newContactId = null;
      if (newAccountId && convertForm.contactName?.trim()) {
        // 2. Create primary contact person in tab_party_contact_persons
        const nameParts = convertForm.contactName.trim().split(" ");
        const contactRes = await createContact({
          accountId: newAccountId,
          firstName: nameParts[0] || convertForm.contactName,
          lastName: nameParts.slice(1).join(" ") || "",
          email: convertForm.email?.trim() || null,
          mobile: convertForm.mobile.trim(),
          isPrimary: true,
        });
        newContactId = contactRes?.contactPersonId || contactRes?.contact_person_id || null;
      }

      // 3. Optionally create Opportunity deal in tab_opportunity
      if (newAccountId && convertForm.createOpportunity && convertForm.opportunityName?.trim()) {
        await createOpportunity({
          name: convertForm.opportunityName.trim(),
          accountId: newAccountId,
          primaryContactId: newContactId,
          leadId: Number(leadId),
          amount: convertForm.opportunityAmount ? Number(convertForm.opportunityAmount) : null,
          ownerEmployeeId: lead?.ownerEmployeeId || null,
        });
      }

      // 4. Update tab_lead status & link foreign keys
      const [lk] = await Promise.all([getLeadLookups().catch(() => ({}))]);
      const statusList = lk?.leadStatus || lk?.lead_status || [];
      const convStatus = statusList.find((s) =>
        (s.masterName || s.masterCode || "").toLowerCase().includes("convert")
      );

      await updateLead(leadId, {
        leadName: lead.leadName,
        mobile: lead.mobile,
        statusId: convStatus?.masterId || lead.statusId,
        convertedAccountId: newAccountId || null,
        convertedContactId: newContactId || null,
      });

      toastSuccess(`Lead converted into Customer Account "${convertForm.companyName}".`);
      setConvertModal(false);
      await load();
    } catch (err) {
      toastApiError(err, "Failed to convert lead.");
    } finally {
      setConverting(false);
    }
  };

  // Add Activity to database
  const handleAddActivity = async (e) => {
    e.preventDefault();
    if (!activityForm.reason.trim()) return;
    setSavingActivity(true);
    try {
      await createActivity({
        actType: activityForm.actType,
        reason: activityForm.reason.trim(),
        callNotes: activityForm.callNotes?.trim() || null,
        startTime: activityForm.startTime || new Date().toISOString(),
        employeeId: lead?.ownerEmployeeId || null,
      });
      toastSuccess("Activity saved to database.");
      setActivityModal(false);
      setActivityForm({
        actType: "CALL",
        reason: "",
        callNotes: "",
        startTime: new Date().toISOString().slice(0, 16),
      });
      await load();
    } catch (err) {
      toastApiError(err, "Failed to record activity.");
    } finally {
      setSavingActivity(false);
    }
  };

  // Save new contact person
  const handleSaveContact = async (e) => {
    e.preventDefault();
    if (!newContactForm.firstName.trim()) return;
    setSavingContact(true);
    try {
      if (lead?.convertedAccountId) {
        await createContact({
          accountId: lead.convertedAccountId,
          salutation: newContactForm.salutation,
          firstName: newContactForm.firstName.trim(),
          lastName: newContactForm.lastName?.trim() || "",
          email: newContactForm.email?.trim() || null,
          mobile: newContactForm.mobile?.trim() || null,
          workPhone: newContactForm.workPhone?.trim() || null,
          isPrimary: false,
        });
        toastSuccess("Contact person added to customer account.");
      } else {
        // Prospect contact session addition
        const newC = {
          id: Date.now(),
          name: `${newContactForm.firstName} ${newContactForm.lastName}`.trim(),
          title: newContactForm.salutation || "Contact",
          isPrimary: false,
          phone: newContactForm.mobile || newContactForm.workPhone || "—",
          email: newContactForm.email || "—",
        };
        setContacts((prev) => [...prev, newC]);
        toastSuccess("Contact person added.");
      }
      setAddContactModal(false);
      setNewContactForm({
        salutation: "Mr.",
        firstName: "",
        lastName: "",
        email: "",
        mobile: "",
        workPhone: "",
      });
      await load();
    } catch (err) {
      toastApiError(err, "Failed to add contact person.");
    } finally {
      setSavingContact(false);
    }
  };

  // Start activity from next follow-up card
  const handleStartFollowUpActivity = () => {
    const parsed = parseLeadContent(lead?.description);
    setActivityForm({
      actType: "CALL",
      reason: parsed.followUp ? `Follow-up: ${parsed.followUp}` : `Call ${lead?.leadName}`,
      callNotes: "",
      startTime: new Date().toISOString().slice(0, 16),
    });
    setActivityModal(true);
  };

  // Mark follow-up as completed in database
  const handleMarkFollowUpDone = async () => {
    const parsed = parseLeadContent(lead?.description);
    try {
      await createActivity({
        actType: "CALL",
        reason: parsed.followUp ? `Completed: ${parsed.followUp}` : `Completed follow-up with ${lead?.leadName}`,
        callNotes: "Follow-up marked as completed by user.",
        startTime: new Date().toISOString(),
        employeeId: lead?.ownerEmployeeId || null,
      });

      // Clear follow-up reminder from lead description in database
      if (lead?.description && lead.description.includes("Next Follow-up Reminder:")) {
        const lines = lead.description.split("\n");
        const updatedDesc = lines.filter((l) => !l.startsWith("Next Follow-up Reminder:")).join("\n");
        await updateLead(leadId, {
          leadName: lead.leadName,
          mobile: lead.mobile,
          statusId: lead.statusId,
          description: updatedDesc,
        });
      }

      toastSuccess("Follow-up marked as completed and recorded in activities.");
      await load();
    } catch (err) {
      toastApiError(err, "Failed to complete follow-up.");
    }
  };

  // Reschedule follow-up in database
  const handleConfirmReschedule = async () => {
    if (!newFollowUpDate) return;
    setSavingReschedule(true);
    try {
      const parsed = parseLeadContent(lead?.description);
      const reminderLine = `Next Follow-up Reminder: ${newFollowUpDate.replace("T", " ")} (Call ${lead?.leadName || "prospect"})`;

      let updatedDesc = lead?.description || "";
      if (updatedDesc.includes("Next Follow-up Reminder:")) {
        const lines = updatedDesc.split("\n");
        updatedDesc = lines
          .map((l) => (l.startsWith("Next Follow-up Reminder:") ? reminderLine : l))
          .join("\n");
      } else if (updatedDesc.includes("--- Additional Info ---")) {
        updatedDesc = updatedDesc + "\n" + reminderLine;
      } else {
        updatedDesc = (updatedDesc ? updatedDesc + "\n\n" : "") + "--- Additional Info ---\n" + reminderLine;
      }

      await updateLead(leadId, {
        leadName: lead.leadName,
        mobile: lead.mobile,
        statusId: lead.statusId,
        description: updatedDesc,
      });

      toastSuccess("Follow-up successfully rescheduled in database.");
      setRescheduleModal(false);
      setNewFollowUpDate("");
      await load();
    } catch (err) {
      toastApiError(err, "Failed to reschedule follow-up.");
    } finally {
      setSavingReschedule(false);
    }
  };

  const handleSendEmail = (e) => {
    e.preventDefault();
    window.location.href = `mailto:${lead?.email || emailForm.to}?subject=${encodeURIComponent(emailForm.subject)}&body=${encodeURIComponent(emailForm.message)}`;
    setEmailModal(false);
    toastSuccess("Email client opened.");
  };

  // Persist discussion note to database
  const handleAddNote = async () => {
    if (!newNoteText.trim()) return;
    setSavingNote(true);
    try {
      const noteEntry = `${newNoteText.trim()} (${lead?.ownerName || "Current User"} - ${formatDate(new Date())})`;
      let updatedDesc = lead?.description || "";
      if (updatedDesc.includes("--- Additional Info ---")) {
        const parts = updatedDesc.split("--- Additional Info ---");
        const existingNotes = parts[0].trim();
        const nextNotes = existingNotes ? `${existingNotes}\n\n• ${noteEntry}` : `• ${noteEntry}`;
        updatedDesc = `${nextNotes}\n\n--- Additional Info ---${parts[1]}`;
      } else {
        updatedDesc = updatedDesc ? `${updatedDesc}\n\n• ${noteEntry}` : `• ${noteEntry}`;
      }

      await updateLead(leadId, {
        leadName: lead.leadName,
        mobile: lead.mobile,
        statusId: lead.statusId,
        description: updatedDesc,
      });

      toastSuccess("Discussion note saved to database.");
      setNewNoteText("");
      setNoteModal(false);
      await load();
    } catch (err) {
      toastApiError(err, "Failed to save note.");
    } finally {
      setSavingNote(false);
    }
  };

  // Persist new tag to database
  const handleAddTag = async () => {
    if (!newTagInput.trim()) return;
    const cleanTag = newTagInput.trim();
    if (!tagsList.includes(cleanTag)) {
      const nextTags = [...tagsList, cleanTag];
      setTagsList(nextTags);

      try {
        let updatedDesc = lead?.description || "";
        const tagLine = `Tags: ${nextTags.join(", ")}`;
        if (updatedDesc.includes("Tags:")) {
          const lines = updatedDesc.split("\n");
          updatedDesc = lines.map((l) => (l.startsWith("Tags:") ? tagLine : l)).join("\n");
        } else if (updatedDesc.includes("--- Additional Info ---")) {
          updatedDesc = updatedDesc + "\n" + tagLine;
        } else {
          updatedDesc = (updatedDesc ? updatedDesc + "\n\n" : "") + "--- Additional Info ---\n" + tagLine;
        }

        await updateLead(leadId, {
          leadName: lead.leadName,
          mobile: lead.mobile,
          statusId: lead.statusId,
          description: updatedDesc,
        });
        toastSuccess(`Tag "${cleanTag}" saved to database.`);
      } catch (err) {
        toastApiError(err, "Failed to save tag.");
      }
    }
    setNewTagInput("");
    setShowAddTag(false);
  };

  const handleAttachDocument = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachingDoc(true);
    try {
      const parsedDesc = parseLeadContent(lead?.description);
      const currentDocs = parsedDesc.extras["Staged Documents"]
        ? parsedDesc.extras["Staged Documents"].split(",").map((d) => d.trim()).filter(Boolean)
        : [];
      const nextDocs = [...currentDocs, file.name];
      const docLine = `Staged Documents: ${nextDocs.join(", ")}`;

      let updatedDesc = lead?.description || "";
      if (updatedDesc.includes("Staged Documents:")) {
        const lines = updatedDesc.split("\n");
        updatedDesc = lines.map((l) => (l.startsWith("Staged Documents:") ? docLine : l)).join("\n");
      } else if (updatedDesc.includes("--- Additional Info ---")) {
        updatedDesc = updatedDesc + "\n" + docLine;
      } else {
        updatedDesc = (updatedDesc ? updatedDesc + "\n\n" : "") + "--- Additional Info ---\n" + docLine;
      }

      await updateLead(leadId, {
        leadName: lead.leadName,
        mobile: lead.mobile,
        statusId: lead.statusId,
        description: updatedDesc,
      });

      toastSuccess(`Document "${file.name}" attached successfully to database.`);
      await load();
    } catch (err) {
      toastApiError(err, "Failed to attach document.");
    } finally {
      setAttachingDoc(false);
    }
  };

  const handleRemoveDocument = async (docName) => {
    if (!window.confirm(`Are you sure you want to remove document "${docName}"?`)) return;
    try {
      const parsedDesc = parseLeadContent(lead?.description);
      const currentDocs = parsedDesc.extras["Staged Documents"]
        ? parsedDesc.extras["Staged Documents"].split(",").map((d) => d.trim()).filter(Boolean)
        : [];
      const nextDocs = currentDocs.filter((d) => d !== docName);

      let updatedDesc = lead?.description || "";
      if (nextDocs.length > 0) {
        const docLine = `Staged Documents: ${nextDocs.join(", ")}`;
        const lines = updatedDesc.split("\n");
        updatedDesc = lines.map((l) => (l.startsWith("Staged Documents:") ? docLine : l)).join("\n");
      } else {
        const lines = updatedDesc.split("\n");
        updatedDesc = lines.filter((l) => !l.startsWith("Staged Documents:")).join("\n");
      }

      await updateLead(leadId, {
        leadName: lead.leadName,
        mobile: lead.mobile,
        statusId: lead.statusId,
        description: updatedDesc,
      });

      toastSuccess(`Document "${docName}" removed from database.`);
      await load();
    } catch (err) {
      toastApiError(err, "Failed to remove document.");
    }
  };

  if (loading) {
    return (
      <div className="page-content">
        <Container fluid className="text-center py-5">
          <Spinner color="primary" /> <span className="ms-2">Loading 360° lead profile from database…</span>
        </Container>
      </div>
    );
  }

  const parsed = lead ? parseLeadContent(lead.description) : { extras: {} };
  const stagedDocs = parsed.extras["Staged Documents"]
    ? parsed.extras["Staged Documents"].split(",").map((d) => d.trim()).filter(Boolean)
    : [];

  // Calculate dynamic metrics strictly from database state
  const aiScoreData = computeLeadScore(lead);
  const engagementData = computeEngagementLevel(activities.length);

  const totalOppValue = opportunities.reduce((acc, o) => acc + (Number(o.amount) || 0), 0);
  const wonOpps = opportunities.filter((o) => (o.stageName || "").toLowerCase().includes("won"));
  const wonOppValue = wonOpps.reduce((acc, o) => acc + (Number(o.amount) || 0), 0);

  return (
    <div className="page-content">
      <Container fluid>
        {/* Top Header Action Bar matching CRM_03_Lead Details.png */}
        <div className="d-flex align-items-center justify-content-between mb-3 pb-1 flex-wrap gap-2">
          <Link
            to="/crm/leads"
            className="text-decoration-none fw-semibold fs-13 d-inline-flex align-items-center"
            style={{ color: "#7f1d1d" }}
          >
            <i className="ri-arrow-left-s-line me-1 fs-16" />
            Back to Leads
          </Link>

          <div className="d-flex align-items-center gap-2 flex-wrap">
            <Button
              color="light"
              size="sm"
              className="px-3 border bg-white d-inline-flex align-items-center"
              style={{ borderRadius: "3px", fontWeight: 500, height: "34px" }}
              onClick={openEdit}
            >
              <i className="ri-pencil-line me-1 text-muted" />
              Edit
            </Button>
            <Button
              color="primary"
              size="sm"
              className="px-3 fw-semibold d-inline-flex align-items-center"
              style={{ borderRadius: "3px", backgroundColor: "#7f1d1d", borderColor: "#7f1d1d", height: "34px" }}
              onClick={() => setConvertModal(true)}
            >
              <i className="ri-user-follow-line me-1" />
              Convert Lead
            </Button>
            <Button
              color="light"
              size="sm"
              className="px-3 border bg-white d-inline-flex align-items-center"
              style={{ borderRadius: "3px", fontWeight: 500, height: "34px" }}
              onClick={() => setActivityModal(true)}
            >
              <i className="ri-calendar-event-line me-1 text-primary" />
              Add Activity
            </Button>
            <Button
              color="light"
              size="sm"
              className="px-3 border bg-white d-inline-flex align-items-center"
              style={{ borderRadius: "3px", fontWeight: 500, height: "34px" }}
              onClick={() => {
                setEmailForm({
                  to: lead?.email || "",
                  subject: `Update regarding ${lead?.companyName || lead?.leadName || "CRM"}`,
                  message: "",
                });
                setEmailModal(true);
              }}
            >
              <i className="ri-mail-send-line me-1 text-info" />
              Send Email
            </Button>

            <Dropdown isOpen={moreDropdown} toggle={() => setMoreDropdown(!moreDropdown)}>
              <DropdownToggle
                color="light"
                size="sm"
                className="px-2 border bg-white d-inline-flex align-items-center justify-content-center"
                style={{ borderRadius: "3px", width: "34px", height: "34px" }}
              >
                <i className="ri-more-2-fill text-muted fs-14" />
              </DropdownToggle>
              <DropdownMenu end container="body">
                <DropdownItem onClick={() => setDeleteModal(true)} className="text-danger fs-12 py-1 px-3">
                  <i className="ri-delete-bin-line me-2" />
                  Delete Lead
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>
        </div>

        {error ? <Alert color="danger" className="mb-3">{error}</Alert> : null}

        {lead && (
          <>
            {/* Top Summary Banner Card (Pixel-perfect Aligned Header) */}
            <Card className="mb-3 border bg-white" style={{ borderRadius: "4px", borderColor: "#e2e8f0" }}>
              <CardBody className="p-3">
                <Row className="align-items-center g-3">
                  {/* Left: Avatar with Status Indicator + Company & Contact */}
                  <Col xl={5} lg={5}>
                    <div className="d-flex align-items-center gap-3">
                      <div className="position-relative">
                        <div
                          className="d-flex align-items-center justify-content-center text-primary fw-bold fs-18"
                          style={{
                            width: "52px",
                            height: "52px",
                            borderRadius: "50%",
                            backgroundColor: "#fef2f2",
                            color: "#7f1d1d",
                            border: "1px solid #fee2e2",
                            flexShrink: 0,
                          }}
                        >
                          {(lead.companyName || lead.leadName || "L")
                            .split(" ")
                            .filter(Boolean)
                            .map((w) => w[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()}
                        </div>
                        <span
                          className="position-absolute bg-success rounded-circle border border-white"
                          style={{ width: "12px", height: "12px", bottom: "2px", right: "2px" }}
                          title="Active Record"
                        />
                      </div>

                      <div className="flex-grow-1 min-w-0">
                        <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                          <h4 className="fw-bold mb-0 text-dark fs-17 text-truncate">
                            {lead.companyName || lead.leadName}
                          </h4>
                          <span
                            className={`badge ${statusBadge(lead.statusName)}`}
                            style={{ borderRadius: "3px", padding: "2px 7px", fontSize: "11px", fontWeight: 600 }}
                          >
                            {lead.statusName || "New Lead"}
                          </span>
                        </div>

                        <div className="fw-semibold text-dark fs-13 mb-1">
                          {lead.leadName}
                          {lead.designation ? (
                            <span className="text-muted fw-normal ms-2">· {lead.designation}</span>
                          ) : null}
                        </div>

                        <div className="text-muted fs-12 d-flex align-items-center gap-3 flex-wrap">
                          {lead.mobile ? (
                            <a href={`tel:${lead.mobile}`} className="text-muted text-decoration-none">
                              <i className="ri-phone-line text-success me-1" />
                              {lead.mobile}
                            </a>
                          ) : null}
                          {lead.email ? (
                            <a href={`mailto:${lead.email}`} className="text-muted text-decoration-none">
                              <i className="ri-mail-line text-primary me-1" />
                              {lead.email}
                            </a>
                          ) : null}
                          {lead.website ? (
                            <a
                              href={`https://${lead.website.replace(/^https?:\/\//, "")}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-muted text-decoration-none"
                            >
                              <i className="ri-global-line text-info me-1" />
                              {lead.website}
                            </a>
                          ) : null}
                          {parsed.address ? (
                            <span>
                              <i className="ri-map-pin-line text-danger me-1" />
                              {parsed.address}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </Col>

                  {/* Right: 6 Aligned Metadata Columns */}
                  <Col xl={7} lg={7}>
                    <Row className="g-2 text-center text-lg-start">
                      <Col xs={4} sm={2}>
                        <div className="text-muted fs-11 text-uppercase fw-bold" style={{ letterSpacing: "0.5px" }}>
                          Lead Owner
                        </div>
                        <div className="fs-12 fw-bold text-dark mt-1 text-truncate d-flex align-items-center justify-content-center justify-content-lg-start gap-1">
                          <div
                            className="bg-primary text-white rounded-circle d-inline-flex align-items-center justify-content-center fs-10 fw-bold"
                            style={{ width: "20px", height: "20px", backgroundColor: "#7f1d1d", flexShrink: 0 }}
                          >
                            {(lead.ownerName || "U")[0]}
                          </div>
                          <span className="text-truncate">{lead.ownerName || "Unassigned"}</span>
                        </div>
                      </Col>

                      <Col xs={4} sm={2}>
                        <div className="text-muted fs-11 text-uppercase fw-bold" style={{ letterSpacing: "0.5px" }}>
                          Lead Source
                        </div>
                        <div className="fs-12 fw-bold text-dark mt-1 text-truncate">
                          {lead.sourceName || "—"}
                        </div>
                      </Col>

                      <Col xs={4} sm={2}>
                        <div className="text-muted fs-11 text-uppercase fw-bold" style={{ letterSpacing: "0.5px" }}>
                          Status
                        </div>
                        <div className="mt-1">
                          <span className={`badge ${statusBadge(lead.statusName)}`} style={{ borderRadius: "2px", fontSize: "10px" }}>
                            {lead.statusName || "New"}
                          </span>
                        </div>
                      </Col>

                      <Col xs={4} sm={2}>
                        <div className="text-muted fs-11 text-uppercase fw-bold" style={{ letterSpacing: "0.5px" }}>
                          Rating
                        </div>
                        <div className="mt-1">{renderRating(lead.ratingName)}</div>
                      </Col>

                      <Col xs={4} sm={2}>
                        <div className="text-muted fs-11 text-uppercase fw-bold" style={{ letterSpacing: "0.5px" }}>
                          Created On
                        </div>
                        <div className="fs-12 fw-bold text-dark mt-1">
                          {formatDate(lead.createdAt)}
                        </div>
                      </Col>

                      <Col xs={4} sm={2}>
                        <div className="text-muted fs-11 text-uppercase fw-bold" style={{ letterSpacing: "0.5px" }}>
                          Next Follow-up
                        </div>
                        <div className="mt-1">
                          {parsed.followUp ? (
                            <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1 fs-11 text-truncate">
                              <i className="ri-calendar-check-line me-1" />
                              {formatFollowUpFriendly(parsed.followUp)}
                            </span>
                          ) : (
                            <span className="text-muted fs-11">—</span>
                          )}
                        </div>
                      </Col>
                    </Row>
                  </Col>
                </Row>
              </CardBody>
            </Card>

            {/* Navigation Tabs (Clean Modern Underline Tabs matching Mockup) */}
            <div className="mb-3">
              <Nav tabs className="nav-tabs-custom border-bottom" style={{ borderColor: "#e2e8f0" }}>
                {[
                  { key: "overview", label: "360° View" },
                  { key: "details", label: "Details" },
                  { key: "contacts", label: `Contacts (${contacts.length})` },
                  { key: "activities", label: `Activities (${activities.length})` },
                  { key: "opportunities", label: `Opportunities (${opportunities.length})` },
                  { key: "quotes", label: "Quotes (0)" },
                  { key: "invoices", label: "Invoices (0)" },
                  { key: "documents", label: `Documents (${stagedDocs.length})` },
                  { key: "notes", label: `Notes (${notesList.length})` },
                  { key: "timeline", label: "Timeline" },
                ].map((t) => {
                  const isActive = activeTab === t.key;
                  return (
                    <NavItem key={t.key}>
                      <NavLink
                        style={{
                          cursor: "pointer",
                          fontWeight: isActive ? 600 : 500,
                          color: isActive ? "#7f1d1d" : "#64748b",
                          border: "none",
                          borderBottom: isActive ? "3px solid #7f1d1d" : "3px solid transparent",
                          backgroundColor: "transparent",
                          padding: "8px 14px",
                          fontSize: "13px",
                        }}
                        className={classnames({ active: isActive })}
                        onClick={() => setActiveTab(t.key)}
                      >
                        {t.label}
                      </NavLink>
                    </NavItem>
                  );
                })}
              </Nav>
            </div>

            {/* Tab Contents */}
            <TabContent activeTab={activeTab}>
              {/* Tab 1: 360° View */}
              <TabPane tabId="overview">
                {/* Dynamic Top 4 KPI Metrics Row */}
                <Row className="g-3 mb-3">
                  {/* KPI 1: AI Lead Score */}
                  <Col xs={12} sm={6} md={3}>
                    <Card className="mb-0 h-100 border bg-white" style={{ borderRadius: "4px", borderColor: "#e2e8f0", minHeight: "140px" }}>
                      <CardBody className="p-3 d-flex flex-column justify-content-between">
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <span className="text-muted fs-11 text-uppercase fw-bold" style={{ letterSpacing: "0.5px" }}>
                            Lead Score (AI)
                          </span>
                        </div>
                        <div className="d-flex align-items-center gap-3">
                          <CircularGauge
                            value={aiScoreData.score}
                            max={100}
                            label="/100"
                            color={aiScoreData.color}
                          />
                          <div>
                            <div className="fw-bold fs-15" style={{ color: aiScoreData.color }}>
                              {aiScoreData.label}
                            </div>
                            <div className="text-muted fs-11">{aiScoreData.desc}</div>
                          </div>
                        </div>
                        <div className="mt-3 pt-2 border-top">
                          <span className="text-primary fs-11 fw-semibold" style={{ cursor: "pointer", color: "#7f1d1d" }} onClick={() => setActiveTab("details")}>
                            View Score Factors &rarr;
                          </span>
                        </div>
                      </CardBody>
                    </Card>
                  </Col>

                  {/* KPI 2: Dynamic Engagement Level */}
                  <Col xs={12} sm={6} md={3}>
                    <Card className="mb-0 h-100 border bg-white" style={{ borderRadius: "4px", borderColor: "#e2e8f0", minHeight: "140px" }}>
                      <CardBody className="p-3 d-flex flex-column justify-content-between">
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <span className="text-muted fs-11 text-uppercase fw-bold" style={{ letterSpacing: "0.5px" }}>
                            Engagement Level
                          </span>
                        </div>
                        <div className="d-flex align-items-center gap-3">
                          <CircularGauge
                            value={engagementData.percent}
                            max={100}
                            label="%"
                            color={engagementData.color}
                          />
                          <div>
                            <div className="fw-bold fs-15" style={{ color: engagementData.color }}>
                              {engagementData.label}
                            </div>
                            <div className="text-muted fs-11">{engagementData.desc}</div>
                          </div>
                        </div>
                        <div className="mt-3 pt-2 border-top">
                          <span className="text-primary fs-11 fw-semibold" style={{ cursor: "pointer", color: "#7f1d1d" }} onClick={() => setActiveTab("activities")}>
                            View Activities &rarr;
                          </span>
                        </div>
                      </CardBody>
                    </Card>
                  </Col>

                  {/* KPI 3: Total Opportunities */}
                  <Col xs={12} sm={6} md={3}>
                    <Card className="mb-0 h-100 border bg-white" style={{ borderRadius: "4px", borderColor: "#e2e8f0", minHeight: "140px" }}>
                      <CardBody className="p-3 d-flex flex-column justify-content-between">
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <span className="text-muted fs-11 text-uppercase fw-bold" style={{ letterSpacing: "0.5px" }}>
                            Total Opportunities
                          </span>
                          <div
                            className="rounded d-flex align-items-center justify-content-center"
                            style={{ width: "32px", height: "32px", backgroundColor: "#fef2f2", color: "#7f1d1d" }}
                          >
                            <i className="ri-folder-shared-line fs-16" />
                          </div>
                        </div>
                        <div>
                          <div className="fw-bold text-dark fs-22 mb-1">{opportunities.length}</div>
                          <div className="text-dark fw-semibold fs-12">
                            {(lead.currencyCode === "USD" ? "$" : "₹") + (totalOppValue || 0).toLocaleString("en-IN")} Total Value
                          </div>
                        </div>
                        <div className="mt-3 pt-2 border-top">
                          <span
                            className="text-primary fs-11 fw-semibold"
                            style={{ cursor: "pointer", color: "#7f1d1d" }}
                            onClick={() => setActiveTab("opportunities")}
                          >
                            View Opportunities &rarr;
                          </span>
                        </div>
                      </CardBody>
                    </Card>
                  </Col>

                  {/* KPI 4: Total Business */}
                  <Col xs={12} sm={6} md={3}>
                    <Card className="mb-0 h-100 border bg-white" style={{ borderRadius: "4px", borderColor: "#e2e8f0", minHeight: "140px" }}>
                      <CardBody className="p-3 d-flex flex-column justify-content-between">
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <span className="text-muted fs-11 text-uppercase fw-bold" style={{ letterSpacing: "0.5px" }}>
                            Total Business
                          </span>
                          <div
                            className="rounded d-flex align-items-center justify-content-center"
                            style={{ width: "32px", height: "32px", backgroundColor: "#fef2f2", color: "#7f1d1d" }}
                          >
                            <span className="fs-15 fw-bold">₹</span>
                          </div>
                        </div>
                        <div>
                          <div className="fw-bold text-dark fs-22 mb-1">
                            {(lead.currencyCode === "USD" ? "$" : "₹") + (wonOppValue || 0).toLocaleString("en-IN")}
                          </div>
                          <div className="text-muted fs-11">
                            {wonOpps.length} Won Deals
                          </div>
                        </div>
                        <div className="mt-3 pt-2 border-top">
                          <span
                            className="text-primary fs-11 fw-semibold"
                            style={{ cursor: "pointer", color: "#7f1d1d" }}
                            onClick={() => setActiveTab("invoices")}
                          >
                            View Business &rarr;
                          </span>
                        </div>
                      </CardBody>
                    </Card>
                  </Col>
                </Row>

                {/* Main Unified Grid (Left 8 cols, Continuous Right Sidebar 4 cols) */}
                <Row className="g-3">
                  {/* Left Column (8 cols): Upper Row (Company + Contacts) & Lower Row (ERP + Activities + Opps + Notes) */}
                  <Col xl={8} lg={8}>
                    {/* Row 1: About Company & Key People (Equal flex height) */}
                    <Row className="g-3 mb-3">
                      {/* About Company Card */}
                      <Col md={6}>
                        <Card className="mb-0 h-100 border bg-white" style={{ borderRadius: "4px", borderColor: "#e2e8f0" }}>
                          <CardHeader className="bg-white py-2 px-3 border-bottom d-flex align-items-center justify-content-between">
                            <h6 className="fw-bold text-dark fs-12 mb-0 text-uppercase" style={{ letterSpacing: "0.5px" }}>
                              About Company
                            </h6>
                            <span
                              className="text-primary fs-11 fw-semibold"
                              style={{ cursor: "pointer", color: "#7f1d1d" }}
                              onClick={openEdit}
                            >
                              Edit Info
                            </span>
                          </CardHeader>
                          <CardBody className="p-3 position-relative d-flex flex-column justify-content-between">
                            <table className="table table-sm table-borderless align-middle mb-0" style={{ position: "relative", zIndex: 2 }}>
                              <tbody>
                                <tr>
                                  <td className="text-muted fs-11 py-1" style={{ width: "42%" }}>Company Name</td>
                                  <td className="text-dark fs-12 fw-semibold py-1">{lead.companyName || "—"}</td>
                                </tr>
                                <tr>
                                  <td className="text-muted fs-11 py-1">Industry</td>
                                  <td className="text-dark fs-12 fw-semibold py-1">{lead.industry || "—"}</td>
                                </tr>
                                <tr>
                                  <td className="text-muted fs-11 py-1">Company Size</td>
                                  <td className="text-dark fs-12 fw-semibold py-1">
                                    {parsed.extras["No. of Employees"] ? `${parsed.extras["No. of Employees"]} Employees` : (parsed.extras["Company Size"] || "—")}
                                  </td>
                                </tr>
                                <tr>
                                  <td className="text-muted fs-11 py-1">Annual Revenue</td>
                                  <td className="text-dark fs-12 fw-semibold py-1">
                                    {parsed.extras["Annual Revenue"] || "—"}
                                  </td>
                                </tr>
                                <tr>
                                  <td className="text-muted fs-11 py-1">Website</td>
                                  <td className="text-dark fs-12 fw-semibold py-1">
                                    {lead.website ? (
                                      <a
                                        href={`https://${lead.website.replace(/^https?:\/\//, "")}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-primary text-decoration-none"
                                      >
                                        {lead.website}
                                      </a>
                                    ) : (
                                      "—"
                                    )}
                                  </td>
                                </tr>
                                <tr>
                                  <td className="text-muted fs-11 py-1">Established Year</td>
                                  <td className="text-dark fs-12 fw-semibold py-1">{parsed.extras["Established Year"] || "—"}</td>
                                </tr>
                                <tr>
                                  <td className="text-muted fs-11 py-1">GST No.</td>
                                  <td className="text-dark fs-12 fw-semibold py-1">{parsed.extras["GST No"] || parsed.extras["GST No."] || "—"}</td>
                                </tr>
                                <tr>
                                  <td className="text-muted fs-11 py-1">PAN No.</td>
                                  <td className="text-dark fs-12 fw-semibold py-1">{parsed.extras["PAN No"] || parsed.extras["PAN No."] || "—"}</td>
                                </tr>
                                <tr>
                                  <td className="text-muted fs-11 py-1 align-top">Address</td>
                                  <td className="text-dark fs-11 fw-medium py-1">
                                    {parsed.address || "—"}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </CardBody>
                        </Card>
                      </Col>

                      {/* Key People (Contacts) Card */}
                      <Col md={6}>
                        <Card className="mb-0 h-100 border bg-white" style={{ borderRadius: "4px", borderColor: "#e2e8f0" }}>
                          <CardHeader className="bg-white py-2 px-3 border-bottom d-flex align-items-center justify-content-between">
                            <h6 className="fw-bold text-dark fs-12 mb-0 text-uppercase" style={{ letterSpacing: "0.5px" }}>
                              Key People (Contacts)
                            </h6>
                            <span
                              className="text-primary fs-11 fw-semibold"
                              style={{ cursor: "pointer", color: "#7f1d1d" }}
                              onClick={() => setActiveTab("contacts")}
                            >
                              View All
                            </span>
                          </CardHeader>
                          <CardBody className="p-3 d-flex flex-column justify-content-between">
                            <div className="d-flex flex-column gap-3">
                              {contacts.map((c) => (
                                <div key={c.id} className="d-flex align-items-center justify-content-between pb-2 border-bottom border-light">
                                  <div className="d-flex align-items-center gap-2">
                                    <div
                                      className="rounded-circle d-flex align-items-center justify-content-center text-primary fw-bold fs-12"
                                      style={{ width: "36px", height: "36px", backgroundColor: "#fef2f2", color: "#7f1d1d", flexShrink: 0 }}
                                    >
                                      {(c.name || "C").split(" ").filter(Boolean).map((n) => n[0]).slice(0, 2).join("")}
                                    </div>
                                    <div>
                                      <div className="d-flex align-items-center gap-1">
                                        <span className="fw-bold text-dark fs-12">{c.name}</span>
                                        {c.isPrimary && (
                                          <span className="badge bg-success-subtle text-success border border-success-subtle" style={{ fontSize: "9px", padding: "1px 5px", borderRadius: "2px" }}>
                                            Primary
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-muted fs-11">{c.title}</div>
                                      <div className="text-muted fs-11 mt-1">
                                        <span>{c.phone || "—"}</span> {c.email !== "—" ? `· ${c.email}` : ""}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="d-flex align-items-center gap-1">
                                    {c.phone && c.phone !== "—" ? (
                                      <a
                                        href={`tel:${c.phone}`}
                                        className="btn btn-sm btn-light border p-1"
                                        style={{ width: "28px", height: "28px", borderRadius: "3px" }}
                                        title="Call"
                                      >
                                        <i className="ri-phone-line text-success" />
                                      </a>
                                    ) : null}
                                    {c.email && c.email !== "—" ? (
                                      <a
                                        href={`mailto:${c.email}`}
                                        className="btn btn-sm btn-light border p-1"
                                        style={{ width: "28px", height: "28px", borderRadius: "3px" }}
                                        title="Email"
                                      >
                                        <i className="ri-mail-line text-primary" />
                                      </a>
                                    ) : null}
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div className="mt-3 pt-2">
                              <Button
                                color="light"
                                size="sm"
                                className="w-100 border border-dashed py-2 fs-11 fw-semibold"
                                style={{ borderRadius: "3px", color: "#7f1d1d", backgroundColor: "#fef2f2", borderColor: "#fecdd3" }}
                                onClick={() => setAddContactModal(true)}
                              >
                                <i className="ri-user-add-line me-1" />
                                + Add Contact Person
                              </Button>
                            </div>
                          </CardBody>
                        </Card>
                      </Col>
                    </Row>

                    {/* Row 2: 4 Multi-Module Enterprise Cards */}
                    <Row className="g-3">
                      {/* Card 1: Business Summary */}
                      <Col md={6} xl={3}>
                        <Card className="mb-0 h-100 border bg-white" style={{ borderRadius: "4px", borderColor: "#e2e8f0" }}>
                          <CardHeader className="bg-white py-2 px-3 border-bottom">
                            <h6 className="fw-bold text-dark fs-12 mb-0 text-uppercase" style={{ letterSpacing: "0.5px" }}>
                              Business Summary <span className="text-muted fs-10 fw-normal">(ERP)</span>
                            </h6>
                          </CardHeader>
                          <CardBody className="p-3 d-flex flex-column justify-content-between">
                            <div className="d-flex flex-column gap-2">
                              <div className="d-flex align-items-center justify-content-between fs-11">
                                <span className="text-muted"><i className="ri-file-text-line text-primary me-1" /> Invoices</span>
                                <span className="text-dark fw-bold">0 <span className="text-muted fw-normal ms-1">₹0</span></span>
                              </div>
                              <div className="d-flex align-items-center justify-content-between fs-11">
                                <span className="text-muted"><i className="ri-alert-line text-danger me-1" /> Outstanding</span>
                                <span className="text-danger fw-bold">₹0</span>
                              </div>
                              <div className="d-flex align-items-center justify-content-between fs-11">
                                <span className="text-muted"><i className="ri-checkbox-circle-line text-success me-1" /> Payments Rec.</span>
                                <span className="text-success fw-bold">₹0</span>
                              </div>
                              <div className="d-flex align-items-center justify-content-between fs-11">
                                <span className="text-muted"><i className="ri-file-list-line text-info me-1" /> Quotes</span>
                                <span className="text-dark fw-bold">0 <span className="text-muted fw-normal ms-1">₹0</span></span>
                              </div>
                              <div className="d-flex align-items-center justify-content-between fs-11">
                                <span className="text-muted"><i className="ri-shopping-cart-2-line text-warning me-1" /> PO / Order</span>
                                <span className="text-dark fw-bold">0 <span className="text-muted fw-normal ms-1">₹0</span></span>
                              </div>
                            </div>
                            <div className="mt-2 text-center">
                              {!lead.convertedAccountId && (
                                <span className="badge bg-light text-muted border" style={{ fontSize: "10px", fontWeight: 500 }}>
                                  Pre-conversion (Links on conversion)
                                </span>
                              )}
                            </div>
                            <div className="mt-2 pt-2 border-top text-center">
                              <span
                                className="text-primary fs-11 fw-semibold"
                                style={{ cursor: "pointer", color: "#7f1d1d" }}
                                onClick={() => setActiveTab("invoices")}
                              >
                                View Full Business &rarr;
                              </span>
                            </div>
                          </CardBody>
                        </Card>
                      </Col>

                      {/* Card 2: Recent Activities */}
                      <Col md={6} xl={3}>
                        <Card className="mb-0 h-100 border bg-white" style={{ borderRadius: "4px", borderColor: "#e2e8f0" }}>
                          <CardHeader className="bg-white py-2 px-3 border-bottom d-flex align-items-center justify-content-between">
                            <h6 className="fw-bold text-dark fs-12 mb-0 text-uppercase" style={{ letterSpacing: "0.5px" }}>
                              Recent Activities
                            </h6>
                            <span
                              className="text-primary fs-11 fw-semibold"
                              style={{ cursor: "pointer", color: "#7f1d1d" }}
                              onClick={() => setActiveTab("activities")}
                            >
                              View All
                            </span>
                          </CardHeader>
                          <CardBody className="p-2 d-flex flex-column justify-content-between">
                            {activities.length > 0 ? (
                              <div className="d-flex flex-column gap-2">
                                {activities.slice(0, 3).map((act) => (
                                  <div key={act.activityId || act.act_id || Math.random()} className="d-flex align-items-start gap-2 p-1">
                                    <i className="ri-phone-line text-primary mt-1 fs-13" />
                                    <div>
                                      <div className="text-muted fs-10">{formatTimeOrDate(act.startTime || act.start_time)}</div>
                                      <div className="text-dark fs-11 fw-medium text-truncate">{act.reason || act.subject || "Activity"}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-3 text-muted fs-11">
                                <i className="ri-calendar-line fs-20 d-block mb-1 text-muted" />
                                No activities recorded yet.
                              </div>
                            )}
                            <div className="mt-2 pt-1 border-top text-center">
                              <Button
                                color="light"
                                size="sm"
                                className="w-100 border border-dashed fs-11 py-1 fw-semibold"
                                style={{ borderRadius: "3px", color: "#7f1d1d", backgroundColor: "#fef2f2", borderColor: "#fecdd3" }}
                                onClick={() => setActivityModal(true)}
                              >
                                <i className="ri-calendar-event-line me-1" />
                                + Log Activity
                              </Button>
                            </div>
                          </CardBody>
                        </Card>
                      </Col>

                      {/* Card 3: Open Opportunities */}
                      <Col md={6} xl={3}>
                        <Card className="mb-0 h-100 border bg-white" style={{ borderRadius: "4px", borderColor: "#e2e8f0" }}>
                          <CardHeader className="bg-white py-2 px-3 border-bottom d-flex align-items-center justify-content-between">
                            <h6 className="fw-bold text-dark fs-12 mb-0 text-uppercase" style={{ letterSpacing: "0.5px" }}>
                              Opportunities
                            </h6>
                            <span
                              className="text-primary fs-11 fw-semibold"
                              style={{ cursor: "pointer", color: "#7f1d1d" }}
                              onClick={() => setActiveTab("opportunities")}
                            >
                              View All
                            </span>
                          </CardHeader>
                          <CardBody className="p-2 d-flex flex-column justify-content-between">
                            {opportunities.length > 0 ? (
                              <div className="d-flex flex-column gap-2">
                                {opportunities.slice(0, 2).map((opp) => (
                                  <div
                                    key={opp.opportunityId || opp.opportunity_id || Math.random()}
                                    className="p-2 border rounded bg-light"
                                    style={{ borderRadius: "3px" }}
                                  >
                                    <div className="d-flex align-items-center justify-content-between mb-1">
                                      <span className="fw-bold text-dark fs-11 text-truncate">{opp.name}</span>
                                      <span className="badge bg-primary-subtle text-primary" style={{ fontSize: "9px" }}>
                                        {opp.stageName || "Open"}
                                      </span>
                                    </div>
                                    <div className="d-flex align-items-center justify-content-between fs-11">
                                      <span className="fw-bold text-dark">₹{Number(opp.amount || 0).toLocaleString("en-IN")}</span>
                                      <span className="text-muted fs-10">{opp.probability ? `${opp.probability}%` : ""}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-3 text-muted fs-11">
                                <i className="ri-folder-open-line fs-20 d-block mb-1 text-muted" />
                                No opportunities linked yet.
                              </div>
                            )}
                            <div className="mt-2 pt-1 border-top text-center">
                              <span
                                className="text-primary fs-11 fw-semibold"
                                style={{ cursor: "pointer", color: "#7f1d1d" }}
                                onClick={() => setActiveTab("opportunities")}
                              >
                                View Opportunities &rarr;
                              </span>
                            </div>
                          </CardBody>
                        </Card>
                      </Col>

                      {/* Card 4: Discussion Notes */}
                      <Col md={6} xl={3}>
                        <Card className="mb-0 h-100 border bg-white" style={{ borderRadius: "4px", borderColor: "#e2e8f0" }}>
                          <CardHeader className="bg-white py-2 px-3 border-bottom d-flex align-items-center justify-content-between">
                            <h6 className="fw-bold text-dark fs-12 mb-0 text-uppercase" style={{ letterSpacing: "0.5px" }}>
                              Notes
                            </h6>
                            <span
                              className="text-primary fs-11 fw-semibold"
                              style={{ cursor: "pointer", color: "#7f1d1d" }}
                              onClick={() => setActiveTab("notes")}
                            >
                              View All
                            </span>
                          </CardHeader>
                          <CardBody className="p-2 d-flex flex-column justify-content-between">
                            {notesList.length > 0 ? (
                              <div className="d-flex flex-column gap-2">
                                {notesList.slice(0, 2).map((n) => (
                                  <div
                                    key={n.id}
                                    className="p-2 border rounded"
                                    style={{
                                      backgroundColor: n.bg,
                                      borderColor: n.border,
                                      color: n.textColor,
                                      borderRadius: "3px",
                                    }}
                                  >
                                    <div className="fs-11 fw-medium lh-sm mb-1 text-truncate">{n.text}</div>
                                    <div className="fs-10 opacity-75">{n.author} - {n.date}</div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-3 text-muted fs-11">
                                <i className="ri-sticky-note-line fs-20 d-block mb-1 text-muted" />
                                No notes recorded yet.
                              </div>
                            )}
                            <div className="mt-2 pt-1 border-top text-center">
                              <Button
                                color="light"
                                size="sm"
                                className="w-100 border border-dashed fs-11 py-1 fw-semibold"
                                style={{ borderRadius: "3px", color: "#7f1d1d", backgroundColor: "#fef2f2", borderColor: "#fecdd3" }}
                                onClick={() => setNoteModal(true)}
                              >
                                <i className="ri-add-line me-1" />
                                + Add New Note
                              </Button>
                            </div>
                          </CardBody>
                        </Card>
                      </Col>
                    </Row>
                  </Col>

                  {/* Right Sidebar Column (4 cols - Continuous Single Flow) */}
                  <Col xl={4} lg={4}>
                    <div className="d-flex flex-column gap-3">
                      {/* Card 1: Last Activity (Timeline) */}
                      <Card className="mb-0 border bg-white" style={{ borderRadius: "4px", borderColor: "#e2e8f0" }}>
                        <CardHeader className="bg-white py-2 px-3 border-bottom d-flex align-items-center justify-content-between">
                          <h6 className="fw-bold text-dark fs-12 mb-0 text-uppercase" style={{ letterSpacing: "0.5px" }}>
                            Last Activity
                          </h6>
                          <span
                            className="text-primary fs-11 fw-semibold"
                            style={{ cursor: "pointer", color: "#7f1d1d" }}
                            onClick={() => setActiveTab("timeline")}
                          >
                            View All
                          </span>
                        </CardHeader>
                        <CardBody className="p-3">
                          <div className="d-flex flex-column gap-3">
                            {/* Milestone 1: Lead Created */}
                            <div className="d-flex align-items-start gap-2">
                              <div className="bg-primary text-white rounded-circle p-1 d-flex align-items-center justify-content-center" style={{ width: "24px", height: "24px", backgroundColor: "#7f1d1d", flexShrink: 0 }}>
                                <i className="ri-user-add-line fs-12" />
                              </div>
                              <div>
                                <div className="text-muted fs-10">{formatDate(lead.createdAt)}</div>
                                <div className="text-dark fs-12 fw-semibold">Lead Created</div>
                                <div className="text-muted fs-11">Assigned to {lead.ownerName || "Unassigned"}</div>
                              </div>
                            </div>

                            {/* Dynamic Activities from DB */}
                            {activities.slice(0, 3).map((act) => (
                              <div key={act.activityId || act.act_id || Math.random()} className="d-flex align-items-start gap-2">
                                <div className="bg-info text-white rounded-circle p-1 d-flex align-items-center justify-content-center" style={{ width: "24px", height: "24px", flexShrink: 0 }}>
                                  <i className="ri-calendar-line fs-12" />
                                </div>
                                <div>
                                  <div className="text-muted fs-10">{formatTimeOrDate(act.startTime || act.start_time)}</div>
                                  <div className="text-dark fs-12 fw-semibold">{act.actType || act.act_type || "Activity"}</div>
                                  <div className="text-muted fs-11 text-truncate">{act.reason || act.subject || "Logged activity"}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardBody>
                      </Card>

                      {/* Card 2: Next Follow-up Card */}
                      <Card className="mb-0 border bg-white" style={{ borderRadius: "4px", borderColor: "#e2e8f0" }}>
                        <CardHeader className="bg-white py-2 px-3 border-bottom d-flex align-items-center justify-content-between">
                          <h6 className="fw-bold text-dark fs-12 mb-0 text-uppercase" style={{ letterSpacing: "0.5px" }}>
                            Next Follow-up
                          </h6>
                          <span
                            className="text-primary fs-11 fw-semibold"
                            style={{ cursor: "pointer", color: "#7f1d1d" }}
                            onClick={() => setRescheduleModal(true)}
                          >
                            Edit
                          </span>
                        </CardHeader>
                        <CardBody className="p-3">
                          {parsed.followUp ? (
                            <>
                              <div className="d-flex align-items-center justify-content-between mb-3">
                                <div className="d-flex align-items-center gap-2">
                                  <i className="ri-calendar-event-fill text-danger fs-20" />
                                  <div>
                                    <div className="text-dark fw-bold fs-13">
                                      {formatFollowUpFriendly(parsed.followUp)}
                                    </div>
                                    <div className="text-muted fs-11">
                                      {parsed.followUp.includes("(")
                                        ? parsed.followUp.slice(parsed.followUp.indexOf("(") + 1, parsed.followUp.lastIndexOf(")"))
                                        : `Call ${lead.leadName}`}
                                    </div>
                                  </div>
                                </div>
                                <span className="badge bg-success-subtle text-success border border-success-subtle" style={{ borderRadius: "2px", fontSize: "10px" }}>
                                  High
                                </span>
                              </div>

                              <Button
                                color="primary"
                                size="sm"
                                className="w-100 mb-2 py-2 fw-semibold text-white d-inline-flex align-items-center justify-content-center"
                                style={{ borderRadius: "3px", backgroundColor: "#7f1d1d", borderColor: "#7f1d1d" }}
                                onClick={handleStartFollowUpActivity}
                              >
                                <i className="ri-phone-line me-1 fs-14" />
                                Start Activity
                              </Button>

                              <div className="d-flex gap-2">
                                <Button
                                  color="light"
                                  size="sm"
                                  className="w-50 border fs-11 fw-medium"
                                  style={{ borderRadius: "3px", backgroundColor: "#fff", borderColor: "#e2e8f0", color: "#334155" }}
                                  onClick={() => setRescheduleModal(true)}
                                >
                                  Reschedule
                                </Button>
                                <Button
                                  color="light"
                                  size="sm"
                                  className="w-50 border fs-11 fw-medium"
                                  style={{ borderRadius: "3px", backgroundColor: "#fff", borderColor: "#e2e8f0", color: "#334155" }}
                                  onClick={handleMarkFollowUpDone}
                                >
                                  <i className="ri-check-line text-success me-1" />
                                  Mark Done
                                </Button>
                              </div>
                            </>
                          ) : (
                            <div className="text-center py-3 text-muted fs-11">
                              <i className="ri-alarm-line fs-22 d-block mb-1 text-muted" />
                              No follow-up reminder scheduled.
                              <div className="mt-2">
                                <Button
                                  color="light"
                                  size="sm"
                                  className="border fs-11 fw-semibold"
                                  style={{ borderRadius: "3px", color: "#7f1d1d", backgroundColor: "#fef2f2", borderColor: "#fecdd3" }}
                                  onClick={() => setRescheduleModal(true)}
                                >
                                  + Schedule Follow-up
                                </Button>
                              </div>
                            </div>
                          )}
                        </CardBody>
                      </Card>

                      {/* Card 3: Dynamic Tags Card */}
                      <Card className="mb-0 border bg-white" style={{ borderRadius: "4px", borderColor: "#e2e8f0" }}>
                        <CardHeader className="bg-white py-2 px-3 border-bottom d-flex align-items-center justify-content-between">
                          <h6 className="fw-bold text-dark fs-12 mb-0 text-uppercase" style={{ letterSpacing: "0.5px" }}>
                            Tags
                          </h6>
                          <span
                            className="text-primary fs-11 fw-semibold"
                            style={{ cursor: "pointer", color: "#7f1d1d" }}
                            onClick={() => setShowAddTag(!showAddTag)}
                          >
                            Edit
                          </span>
                        </CardHeader>
                        <CardBody className="p-3">
                          <div className="d-flex flex-wrap gap-2 align-items-center">
                            {tagsList.map((tag) => (
                              <span
                                key={tag}
                                className="badge bg-light text-dark border px-2 py-1"
                                style={{ borderRadius: "3px", fontSize: "11px", fontWeight: 500 }}
                              >
                                {tag}
                              </span>
                            ))}
                            {showAddTag ? (
                              <div className="d-inline-flex align-items-center gap-1 mt-1">
                                <Input
                                  bsSize="sm"
                                  placeholder="New tag…"
                                  style={{ width: "110px", height: "26px", fontSize: "11px", borderRadius: "3px" }}
                                  value={newTagInput}
                                  onChange={(e) => setNewTagInput(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handleAddTag();
                                  }}
                                />
                                <Button color="primary" size="sm" className="p-0 px-2" style={{ height: "26px", backgroundColor: "#7f1d1d", borderColor: "#7f1d1d" }} onClick={handleAddTag}>
                                  <i className="ri-check-line" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                color="light"
                                size="sm"
                                className="border px-2 py-0 text-muted"
                                style={{ borderRadius: "3px", fontSize: "11px", height: "26px" }}
                                onClick={() => setShowAddTag(true)}
                              >
                                + Add Tag
                              </Button>
                            )}
                          </div>
                        </CardBody>
                      </Card>

                      {/* Card 4: Social Links Card */}
                      <Card className="mb-0 border bg-white" style={{ borderRadius: "4px", borderColor: "#e2e8f0" }}>
                        <CardHeader className="bg-white py-2 px-3 border-bottom">
                          <h6 className="fw-bold text-dark fs-12 mb-0 text-uppercase" style={{ letterSpacing: "0.5px" }}>
                            Social Links
                          </h6>
                        </CardHeader>
                        <CardBody className="p-3">
                          <div className="d-flex align-items-center justify-content-start gap-2">
                            <a
                              href={lead.website ? `https://${lead.website.replace(/^https?:\/\//, "")}` : "#"}
                              target="_blank"
                              rel="noreferrer"
                              className={`btn btn-sm btn-light border d-flex align-items-center justify-content-center ${lead.website ? "text-dark" : "text-muted disabled"}`}
                              style={{ width: "34px", height: "34px", borderRadius: "3px" }}
                              title="Website"
                            >
                              <i className="ri-global-line fs-16" />
                            </a>
                            <span
                              className="btn btn-sm btn-light border d-flex align-items-center justify-content-center text-muted opacity-50"
                              style={{ width: "34px", height: "34px", borderRadius: "3px" }}
                              title="LinkedIn"
                            >
                              <i className="ri-linkedin-fill fs-16" />
                            </span>
                            <span
                              className="btn btn-sm btn-light border d-flex align-items-center justify-content-center text-muted opacity-50"
                              style={{ width: "34px", height: "34px", borderRadius: "3px" }}
                              title="Twitter / X"
                            >
                              <i className="ri-twitter-x-fill fs-16" />
                            </span>
                            <span
                              className="btn btn-sm btn-light border d-flex align-items-center justify-content-center text-muted opacity-50"
                              style={{ width: "34px", height: "34px", borderRadius: "3px" }}
                              title="Facebook"
                            >
                              <i className="ri-facebook-fill fs-16" />
                            </span>
                          </div>
                        </CardBody>
                      </Card>
                    </div>
                  </Col>
                </Row>
              </TabPane>

              {/* Tab 2: Details */}
              <TabPane tabId="details">
                <Card className="border bg-white" style={{ borderRadius: "4px", borderColor: "#e2e8f0" }}>
                  <CardHeader className="bg-light py-2 px-3 border-bottom d-flex align-items-center justify-content-between">
                    <h6 className="fw-bold text-dark fs-12 mb-0 text-uppercase">Full Lead Specification</h6>
                    <Button color="primary" size="sm" style={{ borderRadius: "3px", backgroundColor: "#7f1d1d", borderColor: "#7f1d1d" }} onClick={openEdit}>
                      <i className="ri-pencil-line me-1" />
                      Edit Details
                    </Button>
                  </CardHeader>
                  <CardBody className="p-3">
                    <Row className="g-3">
                      <Col md={6}>
                        <table className="table table-sm table-borderless">
                          <tbody>
                            <tr><td className="text-muted" style={{ width: "40%" }}>Lead Name</td><td className="fw-bold text-dark">{lead.leadName}</td></tr>
                            <tr><td className="text-muted">Company Name</td><td className="fw-bold text-dark">{lead.companyName || "—"}</td></tr>
                            <tr><td className="text-muted">Designation</td><td className="fw-bold text-dark">{lead.designation || "—"}</td></tr>
                            <tr><td className="text-muted">Industry</td><td className="fw-bold text-dark">{lead.industry || "—"}</td></tr>
                            <tr><td className="text-muted">Lead Source</td><td className="fw-bold text-dark">{lead.sourceName || "—"}</td></tr>
                            <tr><td className="text-muted">Rating / Urgency</td><td className="fw-bold text-dark">{lead.ratingName || "—"}</td></tr>
                          </tbody>
                        </table>
                      </Col>
                      <Col md={6}>
                        <table className="table table-sm table-borderless">
                          <tbody>
                            <tr><td className="text-muted" style={{ width: "40%" }}>Mobile Phone</td><td className="fw-bold text-dark">{lead.mobile}</td></tr>
                            <tr><td className="text-muted">Work Email</td><td className="fw-bold text-dark">{lead.email || "—"}</td></tr>
                            <tr><td className="text-muted">Website</td><td className="fw-bold text-dark">{lead.website || "—"}</td></tr>
                            <tr><td className="text-muted">Estimated Value</td><td className="fw-bold text-dark">{lead.estimatedValue != null ? `₹${Number(lead.estimatedValue).toLocaleString("en-IN")}` : "—"}</td></tr>
                            <tr><td className="text-muted">Target Close Date</td><td className="fw-bold text-dark">{formatDate(lead.expectedCloseDate)}</td></tr>
                            <tr><td className="text-muted">Owner</td><td className="fw-bold text-dark">{lead.ownerName || "Unassigned"}</td></tr>
                          </tbody>
                        </table>
                      </Col>
                    </Row>
                  </CardBody>
                </Card>
              </TabPane>

              {/* Tab 3: Contacts */}
              <TabPane tabId="contacts">
                <Card className="border bg-white" style={{ borderRadius: "4px", borderColor: "#e2e8f0" }}>
                  <CardHeader className="bg-light py-2 px-3 border-bottom d-flex align-items-center justify-content-between">
                    <h6 className="fw-bold text-dark fs-12 mb-0 text-uppercase">Key Contacts ({contacts.length})</h6>
                    <Button color="primary" size="sm" style={{ borderRadius: "3px", backgroundColor: "#7f1d1d", borderColor: "#7f1d1d" }} onClick={() => setAddContactModal(true)}>
                      + Add Contact
                    </Button>
                  </CardHeader>
                  <CardBody className="p-3">
                    <div className="table-responsive">
                      <table className="table table-sm table-hover align-middle mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Contact Name</th>
                            <th>Role / Title</th>
                            <th>Mobile</th>
                            <th>Email</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {contacts.map((c) => (
                            <tr key={c.id}>
                              <td className="fw-bold text-dark">{c.name}</td>
                              <td>{c.title}</td>
                              <td>{c.phone}</td>
                              <td>{c.email}</td>
                              <td>
                                {c.isPrimary ? (
                                  <span className="badge bg-success-subtle text-success">Primary</span>
                                ) : (
                                  <span className="badge bg-light text-dark">Secondary</span>
                                )}
                              </td>
                              <td>
                                {c.phone && c.phone !== "—" ? <a href={`tel:${c.phone}`} className="btn btn-sm btn-light border me-1"><i className="ri-phone-line text-success" /></a> : null}
                                {c.email && c.email !== "—" ? <a href={`mailto:${c.email}`} className="btn btn-sm btn-light border"><i className="ri-mail-line text-primary" /></a> : null}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardBody>
                </Card>
              </TabPane>

              {/* Tab 4: Activities */}
              <TabPane tabId="activities">
                <Card className="border bg-white" style={{ borderRadius: "4px", borderColor: "#e2e8f0" }}>
                  <CardHeader className="bg-light py-2 px-3 border-bottom d-flex align-items-center justify-content-between">
                    <h6 className="fw-bold text-dark fs-12 mb-0 text-uppercase">Activities Log ({activities.length})</h6>
                    <Button color="primary" size="sm" style={{ borderRadius: "3px", backgroundColor: "#7f1d1d", borderColor: "#7f1d1d" }} onClick={() => setActivityModal(true)}>
                      + Log Activity
                    </Button>
                  </CardHeader>
                  <CardBody className="p-3">
                    {activities.length > 0 ? (
                      <div className="d-flex flex-column gap-3">
                        {activities.map((act) => (
                          <div key={act.activityId || act.act_id || Math.random()} className="p-3 border rounded bg-light">
                            <div className="d-flex align-items-center justify-content-between mb-1">
                              <span className="fw-bold text-dark">
                                <i className="ri-calendar-line text-primary me-2" />
                                {act.reason || act.subject || "Activity"}
                              </span>
                              <span className="badge bg-primary-subtle text-primary">
                                {act.actType || act.act_type || "CALL"}
                              </span>
                            </div>
                            <div className="text-muted fs-12">{act.callNotes || act.call_notes || "No notes recorded"}</div>
                            <div className="text-muted fs-11 mt-2">{formatTimeOrDate(act.startTime || act.start_time)}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted fs-12">
                        <i className="ri-calendar-line fs-28 d-block mb-1 text-muted" />
                        No activities logged yet for this lead.
                      </div>
                    )}
                  </CardBody>
                </Card>
              </TabPane>

              {/* Tab 5: Opportunities */}
              <TabPane tabId="opportunities">
                <Card className="border bg-white" style={{ borderRadius: "4px", borderColor: "#e2e8f0" }}>
                  <CardHeader className="bg-light py-2 px-3 border-bottom d-flex align-items-center justify-content-between">
                    <h6 className="fw-bold text-dark fs-12 mb-0 text-uppercase">Linked Deals &amp; Opportunities ({opportunities.length})</h6>
                    <Button color="primary" size="sm" style={{ borderRadius: "3px", backgroundColor: "#7f1d1d", borderColor: "#7f1d1d" }} tag={Link} to="/crm/opportunities">
                      + New Opportunity
                    </Button>
                  </CardHeader>
                  <CardBody className="p-3">
                    {opportunities.length > 0 ? (
                      <div className="table-responsive">
                        <table className="table table-sm table-hover align-middle mb-0">
                          <thead className="table-light">
                            <tr>
                              <th>Deal Name</th>
                              <th>Stage</th>
                              <th>Amount</th>
                              <th>Probability</th>
                              <th>Expected Close</th>
                            </tr>
                          </thead>
                          <tbody>
                            {opportunities.map((o) => (
                              <tr key={o.opportunityId || o.opportunity_id}>
                                <td className="fw-bold text-dark">{o.name}</td>
                                <td><span className="badge bg-primary-subtle text-primary">{o.stageName || "Open"}</span></td>
                                <td className="fw-bold">₹{Number(o.amount || 0).toLocaleString("en-IN")}</td>
                                <td>{o.probability ? `${o.probability}%` : "—"}</td>
                                <td>{formatDate(o.expectedCloseDate)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted fs-12">
                        <i className="ri-folder-open-line fs-28 d-block mb-1 text-muted" />
                        No opportunities linked to this lead yet.
                      </div>
                    )}
                  </CardBody>
                </Card>
              </TabPane>

              {/* Tab 6: Quotes */}
              <TabPane tabId="quotes">
                <Card className="border bg-white" style={{ borderRadius: "4px", borderColor: "#e2e8f0" }}>
                  <CardHeader className="bg-light py-2 px-3 border-bottom">
                    <h6 className="fw-bold text-dark fs-12 mb-0 text-uppercase">Quotation History (ERP)</h6>
                  </CardHeader>
                  <CardBody className="p-3 text-center py-4 text-muted fs-12">
                    <i className="ri-file-text-line fs-28 d-block mb-1 text-muted" />
                    No quotations generated yet. Quotes created in ERP will synchronize here automatically.
                  </CardBody>
                </Card>
              </TabPane>

              {/* Tab 7: Invoices */}
              <TabPane tabId="invoices">
                <Card className="border bg-white" style={{ borderRadius: "4px", borderColor: "#e2e8f0" }}>
                  <CardHeader className="bg-light py-2 px-3 border-bottom">
                    <h6 className="fw-bold text-dark fs-12 mb-0 text-uppercase">Invoices &amp; Billing (ERP)</h6>
                  </CardHeader>
                  <CardBody className="p-3 text-center py-4 text-muted fs-12">
                    <i className="ri-file-list-3-line fs-28 d-block mb-1 text-muted" />
                    No invoices issued yet.
                  </CardBody>
                </Card>
              </TabPane>

              {/* Tab 8: Documents */}
              <TabPane tabId="documents">
                <Card className="border bg-white" style={{ borderRadius: "4px", borderColor: "#e2e8f0" }}>
                  <CardHeader className="bg-light py-2 px-3 border-bottom d-flex align-items-center justify-content-between">
                    <h6 className="fw-bold text-dark fs-12 mb-0 text-uppercase">
                      Attachments &amp; Files ({stagedDocs.length})
                    </h6>
                    <div>
                      <Button
                        color="primary"
                        size="sm"
                        style={{ borderRadius: "3px", backgroundColor: "#7f1d1d", borderColor: "#7f1d1d" }}
                        onClick={() => document.getElementById("leadDetailDocUpload")?.click()}
                      >
                        <i className="ri-upload-2-line me-1" />
                        Attach Document
                      </Button>
                      <input
                        id="leadDetailDocUpload"
                        type="file"
                        className="d-none"
                        onChange={handleAttachDocument}
                      />
                    </div>
                  </CardHeader>
                  <CardBody className="p-3">
                    <div
                      role="button"
                      tabIndex={0}
                      className="p-4 text-center border border-dashed rounded bg-light mb-3 cursor-pointer"
                      onClick={() => document.getElementById("leadDetailDocUpload")?.click()}
                    >
                      <i className="ri-upload-cloud-line fs-28 text-primary d-block mb-1" />
                      <span className="fw-semibold text-dark fs-13">Click or drag &amp; drop files here to attach</span>
                      <div className="text-muted fs-11 mt-1">PDF, DOC, XLSX, JPG, PNG up to 10MB</div>
                      {attachingDoc && <Spinner size="sm" className="mt-2 text-primary" />}
                    </div>

                    {stagedDocs.length > 0 ? (
                      <div className="table-responsive">
                        <table className="table table-sm table-hover align-middle mb-0">
                          <thead className="table-light">
                            <tr>
                              <th>Document Name</th>
                              <th>Type</th>
                              <th>Uploaded On</th>
                              <th className="text-end">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {stagedDocs.map((doc, idx) => {
                              const ext = doc.split(".").pop()?.toUpperCase() || "FILE";
                              return (
                                <tr key={doc + idx}>
                                  <td className="fw-semibold text-dark">
                                    <i className="ri-file-text-line text-primary me-2" />
                                    {doc}
                                  </td>
                                  <td><span className="badge bg-light text-dark border">{ext}</span></td>
                                  <td className="text-muted fs-11">{formatDate(lead.createdAt)}</td>
                                  <td className="text-end">
                                    <Button
                                      color="light"
                                      size="sm"
                                      className="border me-1 py-0 px-2"
                                      style={{ height: "26px" }}
                                      onClick={() => toastSuccess(`Document preview: ${doc}`)}
                                      title="Preview"
                                    >
                                      <i className="ri-eye-line text-primary" />
                                    </Button>
                                    <Button
                                      color="light"
                                      size="sm"
                                      className="border py-0 px-2"
                                      style={{ height: "26px" }}
                                      onClick={() => handleRemoveDocument(doc)}
                                      title="Delete"
                                    >
                                      <i className="ri-delete-bin-line text-danger" />
                                    </Button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-2 text-muted fs-11">
                        No documents attached to this lead yet. Click &quot;Attach Document&quot; above to add files.
                      </div>
                    )}
                  </CardBody>
                </Card>
              </TabPane>

              {/* Tab 9: Notes */}
              <TabPane tabId="notes">
                <Card className="border bg-white" style={{ borderRadius: "4px", borderColor: "#e2e8f0" }}>
                  <CardHeader className="bg-light py-2 px-3 border-bottom d-flex align-items-center justify-content-between">
                    <h6 className="fw-bold text-dark fs-12 mb-0 text-uppercase">Discussion Notes ({notesList.length})</h6>
                    <Button color="primary" size="sm" style={{ borderRadius: "3px", backgroundColor: "#7f1d1d", borderColor: "#7f1d1d" }} onClick={() => setNoteModal(true)}>
                      + Add Note
                    </Button>
                  </CardHeader>
                  <CardBody className="p-3">
                    {notesList.length > 0 ? (
                      <Row className="g-3">
                        {notesList.map((n) => (
                          <Col key={n.id} md={4}>
                            <div
                              className="p-3 border rounded h-100"
                              style={{ backgroundColor: n.bg, borderColor: n.border, color: n.textColor }}
                            >
                              <div className="fs-13 fw-medium mb-3">{n.text}</div>
                              <div className="fs-11 opacity-75 d-flex justify-content-between">
                                <span>{n.author}</span>
                                <span>{n.date}</span>
                              </div>
                            </div>
                          </Col>
                        ))}
                      </Row>
                    ) : (
                      <div className="text-center py-4 text-muted fs-12">
                        <i className="ri-sticky-note-line fs-28 d-block mb-1 text-muted" />
                        No discussion notes recorded yet. Click &quot;+ Add Note&quot; to write one.
                      </div>
                    )}
                  </CardBody>
                </Card>
              </TabPane>

              {/* Tab 10: Timeline */}
              <TabPane tabId="timeline">
                <Card className="border bg-white" style={{ borderRadius: "4px", borderColor: "#e2e8f0" }}>
                  <CardHeader className="bg-light py-2 px-3 border-bottom">
                    <h6 className="fw-bold text-dark fs-12 mb-0 text-uppercase">Relationship &amp; Communication Timeline</h6>
                  </CardHeader>
                  <CardBody className="p-4">
                    <div className="position-relative ps-4 border-start border-2 border-primary-subtle">
                      <div className="mb-4 position-relative">
                        <span className="position-absolute bg-primary rounded-circle" style={{ width: "10px", height: "10px", left: "-21px", top: "5px", backgroundColor: "#7f1d1d" }} />
                        <div className="text-muted fs-11">{formatDate(lead.createdAt)}</div>
                        <div className="fw-bold text-dark fs-13">Lead Created</div>
                        <div className="text-muted fs-12">Record initialized and assigned to {lead.ownerName || "Unassigned"}.</div>
                      </div>

                      {activities.map((act) => (
                        <div key={act.activityId || act.act_id || Math.random()} className="mb-4 position-relative">
                          <span className="position-absolute bg-info rounded-circle" style={{ width: "10px", height: "10px", left: "-21px", top: "5px" }} />
                          <div className="text-muted fs-11">{formatTimeOrDate(act.startTime || act.start_time)}</div>
                          <div className="fw-bold text-dark fs-13">{act.actType || act.act_type || "Activity"}</div>
                          <div className="text-muted fs-12">{act.reason || act.subject || "Logged activity"}</div>
                        </div>
                      ))}
                    </div>
                  </CardBody>
                </Card>
              </TabPane>
            </TabContent>
          </>
        )}

        {/* MODAL 1: Convert Lead Modal (Direct DB Conversion) */}
        <Modal isOpen={convertModal} toggle={() => setConvertModal(!convertModal)} centered>
          <ModalHeader toggle={() => setConvertModal(!convertModal)} className="bg-light">
            <i className="ri-user-follow-line text-primary me-2" />
            Convert Lead to Customer Account
          </ModalHeader>
          <ModalBody>
            <Alert color="info" className="fs-12 mb-3">
              Converting will create a new Customer in <strong>tab_account_master</strong> and a Primary Contact in <strong>tab_party_contact_persons</strong>.
            </Alert>
            <Form onSubmit={(e) => { e.preventDefault(); handleConvertLead(); }}>
              <FormGroup>
                <Label className="fs-12 fw-medium">Customer Account Name *</Label>
                <Input
                  bsSize="sm"
                  style={{ borderRadius: "3px" }}
                  value={convertForm.companyName}
                  onChange={(e) => setConvertForm({ ...convertForm, companyName: e.target.value })}
                  required
                />
              </FormGroup>
              <FormGroup>
                <Label className="fs-12 fw-medium">Primary Contact Person *</Label>
                <Input
                  bsSize="sm"
                  style={{ borderRadius: "3px" }}
                  value={convertForm.contactName}
                  onChange={(e) => setConvertForm({ ...convertForm, contactName: e.target.value })}
                  required
                />
              </FormGroup>
              <Row className="g-2 mb-3">
                <Col sm={6}>
                  <Label className="fs-12 fw-medium">Email</Label>
                  <Input
                    bsSize="sm"
                    style={{ borderRadius: "3px" }}
                    value={convertForm.email}
                    onChange={(e) => setConvertForm({ ...convertForm, email: e.target.value })}
                  />
                </Col>
                <Col sm={6}>
                  <Label className="fs-12 fw-medium">Mobile</Label>
                  <Input
                    bsSize="sm"
                    style={{ borderRadius: "3px" }}
                    value={convertForm.mobile}
                    onChange={(e) => setConvertForm({ ...convertForm, mobile: e.target.value })}
                  />
                </Col>
              </Row>

              <div className="form-check form-switch mb-3">
                <Input
                  type="switch"
                  id="createOppSwitch"
                  checked={convertForm.createOpportunity}
                  onChange={(e) => setConvertForm({ ...convertForm, createOpportunity: e.target.checked })}
                />
                <Label className="form-check-label fs-12 fw-semibold" htmlFor="createOppSwitch">
                  Also create a Sales Opportunity in Pipeline
                </Label>
              </div>

              {convertForm.createOpportunity && (
                <Row className="g-2 p-2 border rounded bg-light mb-3">
                  <Col sm={8}>
                    <Label className="fs-11 fw-medium">Deal / Opportunity Name</Label>
                    <Input
                      bsSize="sm"
                      style={{ borderRadius: "3px" }}
                      value={convertForm.opportunityName}
                      onChange={(e) => setConvertForm({ ...convertForm, opportunityName: e.target.value })}
                    />
                  </Col>
                  <Col sm={4}>
                    <Label className="fs-11 fw-medium">Deal Amount (₹)</Label>
                    <Input
                      bsSize="sm"
                      style={{ borderRadius: "3px" }}
                      value={convertForm.opportunityAmount}
                      onChange={(e) => setConvertForm({ ...convertForm, opportunityAmount: e.target.value })}
                    />
                  </Col>
                </Row>
              )}

              <div className="d-flex justify-content-end gap-2">
                <Button color="light" size="sm" onClick={() => setConvertModal(false)}>Cancel</Button>
                <Button color="primary" size="sm" type="submit" disabled={converting} style={{ backgroundColor: "#7f1d1d", borderColor: "#7f1d1d" }}>
                  {converting ? <Spinner size="sm" className="me-1" /> : <i className="ri-check-line me-1" />}
                  Confirm Convert
                </Button>
              </div>
            </Form>
          </ModalBody>
        </Modal>

        {/* MODAL 2: Add Activity Modal */}
        <Modal isOpen={activityModal} toggle={() => setActivityModal(!activityModal)} centered>
          <ModalHeader toggle={() => setActivityModal(!activityModal)} className="bg-light">
            <i className="ri-calendar-event-line text-primary me-2" />
            Log Lead Activity
          </ModalHeader>
          <ModalBody>
            <Form onSubmit={handleAddActivity}>
              <FormGroup>
                <Label className="fs-12 fw-medium">Activity Type</Label>
                <Input
                  type="select"
                  bsSize="sm"
                  style={{ borderRadius: "3px" }}
                  value={activityForm.actType}
                  onChange={(e) => setActivityForm({ ...activityForm, actType: e.target.value })}
                >
                  <option value="CALL">Phone Call</option>
                  <option value="MEETING">Meeting</option>
                  <option value="EMAIL">Email</option>
                  <option value="DEMO">Product Demo</option>
                  <option value="VISIT">Client Visit</option>
                </Input>
              </FormGroup>

              <FormGroup>
                <Label className="fs-12 fw-medium">Subject / Reason *</Label>
                <Input
                  bsSize="sm"
                  placeholder="e.g. Discuss proposal terms"
                  style={{ borderRadius: "3px" }}
                  value={activityForm.reason}
                  onChange={(e) => setActivityForm({ ...activityForm, reason: e.target.value })}
                  required
                />
              </FormGroup>

              <FormGroup>
                <Label className="fs-12 fw-medium">Scheduled / Start Date &amp; Time</Label>
                <Input
                  type="datetime-local"
                  bsSize="sm"
                  style={{ borderRadius: "3px" }}
                  value={activityForm.startTime}
                  onChange={(e) => setActivityForm({ ...activityForm, startTime: e.target.value })}
                />
              </FormGroup>

              <FormGroup>
                <Label className="fs-12 fw-medium">Notes &amp; Outcomes</Label>
                <Input
                  type="textarea"
                  rows={3}
                  placeholder="Enter call notes or outcome discussion…"
                  style={{ borderRadius: "3px" }}
                  value={activityForm.callNotes}
                  onChange={(e) => setActivityForm({ ...activityForm, callNotes: e.target.value })}
                />
              </FormGroup>

              <div className="d-flex justify-content-end gap-2">
                <Button color="light" size="sm" onClick={() => setActivityModal(false)}>Cancel</Button>
                <Button color="primary" size="sm" type="submit" disabled={savingActivity} style={{ backgroundColor: "#7f1d1d", borderColor: "#7f1d1d" }}>
                  {savingActivity ? <Spinner size="sm" className="me-1" /> : null}
                  Save Activity
                </Button>
              </div>
            </Form>
          </ModalBody>
        </Modal>

        {/* MODAL 3: Add Contact Person Modal */}
        <Modal isOpen={addContactModal} toggle={() => setAddContactModal(!addContactModal)} centered>
          <ModalHeader toggle={() => setAddContactModal(!addContactModal)} className="bg-light">
            <i className="ri-user-add-line text-primary me-2" />
            Add Key Contact Person
          </ModalHeader>
          <ModalBody>
            <Form onSubmit={handleSaveContact}>
              <Row className="g-2 mb-2">
                <Col sm={3}>
                  <Label className="fs-12 fw-medium">Salutation</Label>
                  <Input
                    type="select"
                    bsSize="sm"
                    style={{ borderRadius: "3px" }}
                    value={newContactForm.salutation}
                    onChange={(e) => setNewContactForm({ ...newContactForm, salutation: e.target.value })}
                  >
                    <option value="Mr.">Mr.</option>
                    <option value="Ms.">Ms.</option>
                    <option value="Mrs.">Mrs.</option>
                    <option value="Dr.">Dr.</option>
                  </Input>
                </Col>
                <Col sm={5}>
                  <Label className="fs-12 fw-medium">First Name *</Label>
                  <Input
                    bsSize="sm"
                    style={{ borderRadius: "3px" }}
                    value={newContactForm.firstName}
                    onChange={(e) => setNewContactForm({ ...newContactForm, firstName: e.target.value })}
                    required
                  />
                </Col>
                <Col sm={4}>
                  <Label className="fs-12 fw-medium">Last Name</Label>
                  <Input
                    bsSize="sm"
                    style={{ borderRadius: "3px" }}
                    value={newContactForm.lastName}
                    onChange={(e) => setNewContactForm({ ...newContactForm, lastName: e.target.value })}
                  />
                </Col>
              </Row>

              <Row className="g-2 mb-2">
                <Col sm={6}>
                  <Label className="fs-12 fw-medium">Mobile Phone</Label>
                  <Input
                    bsSize="sm"
                    style={{ borderRadius: "3px" }}
                    value={newContactForm.mobile}
                    onChange={(e) => setNewContactForm({ ...newContactForm, mobile: e.target.value })}
                  />
                </Col>
                <Col sm={6}>
                  <Label className="fs-12 fw-medium">Work Phone</Label>
                  <Input
                    bsSize="sm"
                    style={{ borderRadius: "3px" }}
                    value={newContactForm.workPhone}
                    onChange={(e) => setNewContactForm({ ...newContactForm, workPhone: e.target.value })}
                  />
                </Col>
              </Row>

              <FormGroup>
                <Label className="fs-12 fw-medium">Email Address</Label>
                <Input
                  bsSize="sm"
                  style={{ borderRadius: "3px" }}
                  value={newContactForm.email}
                  onChange={(e) => setNewContactForm({ ...newContactForm, email: e.target.value })}
                />
              </FormGroup>

              <div className="d-flex justify-content-end gap-2">
                <Button color="light" size="sm" onClick={() => setAddContactModal(false)}>Cancel</Button>
                <Button color="primary" size="sm" type="submit" disabled={savingContact} style={{ backgroundColor: "#7f1d1d", borderColor: "#7f1d1d" }}>
                  {savingContact ? <Spinner size="sm" className="me-1" /> : null}
                  Save Contact
                </Button>
              </div>
            </Form>
          </ModalBody>
        </Modal>

        {/* MODAL 4: Send Email Modal */}
        <Modal isOpen={emailModal} toggle={() => setEmailModal(!emailModal)} centered>
          <ModalHeader toggle={() => setEmailModal(!emailModal)} className="bg-light">
            <i className="ri-mail-send-line text-primary me-2" />
            Send Email to Lead
          </ModalHeader>
          <ModalBody>
            <Form onSubmit={handleSendEmail}>
              <FormGroup>
                <Label className="fs-12 fw-medium">Recipient</Label>
                <Input
                  bsSize="sm"
                  style={{ borderRadius: "3px" }}
                  value={emailForm.to}
                  onChange={(e) => setEmailForm({ ...emailForm, to: e.target.value })}
                  required
                />
              </FormGroup>
              <FormGroup>
                <Label className="fs-12 fw-medium">Subject</Label>
                <Input
                  bsSize="sm"
                  style={{ borderRadius: "3px" }}
                  value={emailForm.subject}
                  onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                  required
                />
              </FormGroup>
              <FormGroup>
                <Label className="fs-12 fw-medium">Message</Label>
                <Input
                  type="textarea"
                  rows={4}
                  style={{ borderRadius: "3px" }}
                  placeholder="Compose message…"
                  value={emailForm.message}
                  onChange={(e) => setEmailForm({ ...emailForm, message: e.target.value })}
                />
              </FormGroup>
              <div className="d-flex justify-content-end gap-2">
                <Button color="light" size="sm" onClick={() => setEmailModal(false)}>Cancel</Button>
                <Button color="primary" size="sm" type="submit" style={{ backgroundColor: "#7f1d1d", borderColor: "#7f1d1d" }}>
                  Open in Email Client
                </Button>
              </div>
            </Form>
          </ModalBody>
        </Modal>

        {/* MODAL 5: Add Note Modal */}
        <Modal isOpen={noteModal} toggle={() => setNoteModal(!noteModal)} centered>
          <ModalHeader toggle={() => setNoteModal(!noteModal)} className="bg-light">
            <i className="ri-sticky-note-line text-primary me-2" />
            Add Discussion Note
          </ModalHeader>
          <ModalBody>
            <FormGroup>
              <Label className="fs-12 fw-medium">Note Content *</Label>
              <Input
                type="textarea"
                rows={4}
                style={{ borderRadius: "3px" }}
                placeholder="Enter discussion notes, budget updates, or key client requests…"
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                autoFocus
              />
            </FormGroup>
            <div className="d-flex justify-content-end gap-2">
              <Button color="light" size="sm" onClick={() => setNoteModal(false)}>Cancel</Button>
              <Button color="primary" size="sm" onClick={handleAddNote} disabled={savingNote} style={{ backgroundColor: "#7f1d1d", borderColor: "#7f1d1d" }}>
                {savingNote ? <Spinner size="sm" className="me-1" /> : null}
                Save Note to DB
              </Button>
            </div>
          </ModalBody>
        </Modal>

        {/* MODAL 6: Reschedule Follow-up Modal */}
        <Modal isOpen={rescheduleModal} toggle={() => setRescheduleModal(!rescheduleModal)} centered>
          <ModalHeader toggle={() => setRescheduleModal(!rescheduleModal)} className="bg-light">
            <i className="ri-time-line text-primary me-2" />
            Reschedule Next Follow-up
          </ModalHeader>
          <ModalBody>
            <FormGroup>
              <Label className="fs-12 fw-medium">New Date &amp; Time *</Label>
              <Input
                type="datetime-local"
                bsSize="sm"
                style={{ borderRadius: "3px" }}
                value={newFollowUpDate}
                onChange={(e) => setNewFollowUpDate(e.target.value)}
              />
            </FormGroup>
            <div className="d-flex justify-content-end gap-2">
              <Button color="light" size="sm" onClick={() => setRescheduleModal(false)}>Cancel</Button>
              <Button
                color="primary"
                size="sm"
                disabled={savingReschedule}
                style={{ backgroundColor: "#7f1d1d", borderColor: "#7f1d1d" }}
                onClick={handleConfirmReschedule}
              >
                {savingReschedule ? <Spinner size="sm" className="me-1" /> : null}
                Save Reschedule to DB
              </Button>
            </div>
          </ModalBody>
        </Modal>

        {/* MODAL 7: Edit Lead Modal */}
        <Modal isOpen={editModal} toggle={() => setEditModal(!editModal)} size="lg" centered>
          <ModalHeader toggle={() => setEditModal(!editModal)} className="bg-light">
            <i className="ri-pencil-line text-primary me-2" />
            Edit Lead Profile
          </ModalHeader>
          <Form onSubmit={saveEdit}>
            <ModalBody>
              {formError && <Alert color="danger" className="mb-3">{formError}</Alert>}
              <Row className="g-3">
                <Col md={6}>
                  <Label className="fs-12 fw-medium">Lead Name *</Label>
                  <Input
                    bsSize="sm"
                    style={{ borderRadius: "3px" }}
                    value={form.leadName || ""}
                    onChange={(e) => setForm({ ...form, leadName: e.target.value })}
                    required
                  />
                </Col>
                <Col md={6}>
                  <Label className="fs-12 fw-medium">Company Name</Label>
                  <Input
                    bsSize="sm"
                    style={{ borderRadius: "3px" }}
                    value={form.companyName || ""}
                    onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                  />
                </Col>
                <Col md={6}>
                  <Label className="fs-12 fw-medium">Designation</Label>
                  <Input
                    bsSize="sm"
                    style={{ borderRadius: "3px" }}
                    value={form.designation || ""}
                    onChange={(e) => setForm({ ...form, designation: e.target.value })}
                  />
                </Col>
                <Col md={6}>
                  <Label className="fs-12 fw-medium">Industry</Label>
                  <Input
                    bsSize="sm"
                    style={{ borderRadius: "3px" }}
                    value={form.industry || ""}
                    onChange={(e) => setForm({ ...form, industry: e.target.value })}
                  />
                </Col>
                <Col md={6}>
                  <Label className="fs-12 fw-medium">Mobile *</Label>
                  <Input
                    bsSize="sm"
                    style={{ borderRadius: "3px" }}
                    value={form.mobile || ""}
                    onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                    required
                  />
                </Col>
                <Col md={6}>
                  <Label className="fs-12 fw-medium">Email</Label>
                  <Input
                    bsSize="sm"
                    style={{ borderRadius: "3px" }}
                    value={form.email || ""}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </Col>
                <Col md={4}>
                  <Label className="fs-12 fw-medium">Status *</Label>
                  <Input
                    type="select"
                    bsSize="sm"
                    style={{ borderRadius: "3px" }}
                    value={form.statusId || ""}
                    onChange={(e) => setForm({ ...form, statusId: e.target.value })}
                    required
                  >
                    <option value="">Select status…</option>
                    {(lookups.leadStatus || []).map((s) => (
                      <option key={s.masterId} value={s.masterId}>{s.masterName}</option>
                    ))}
                  </Input>
                </Col>
                <Col md={4}>
                  <Label className="fs-12 fw-medium">Source</Label>
                  <Input
                    type="select"
                    bsSize="sm"
                    style={{ borderRadius: "3px" }}
                    value={form.sourceId || ""}
                    onChange={(e) => setForm({ ...form, sourceId: e.target.value })}
                  >
                    <option value="">Select source…</option>
                    {(lookups.leadSource || []).map((s) => (
                      <option key={s.masterId} value={s.masterId}>{s.masterName}</option>
                    ))}
                  </Input>
                </Col>
                <Col md={4}>
                  <Label className="fs-12 fw-medium">Rating</Label>
                  <Input
                    type="select"
                    bsSize="sm"
                    style={{ borderRadius: "3px" }}
                    value={form.ratingId || ""}
                    onChange={(e) => setForm({ ...form, ratingId: e.target.value })}
                  >
                    <option value="">Select rating…</option>
                    {(lookups.leadRating || []).map((r) => (
                      <option key={r.masterId} value={r.masterId}>{r.masterName}</option>
                    ))}
                  </Input>
                </Col>
                <Col md={6}>
                  <Label className="fs-12 fw-medium">Estimated Value (₹)</Label>
                  <Input
                    type="number"
                    bsSize="sm"
                    style={{ borderRadius: "3px" }}
                    value={form.estimatedValue || ""}
                    onChange={(e) => setForm({ ...form, estimatedValue: e.target.value })}
                  />
                </Col>
                <Col md={6}>
                  <Label className="fs-12 fw-medium">Owner</Label>
                  <Input
                    type="select"
                    bsSize="sm"
                    style={{ borderRadius: "3px" }}
                    value={form.ownerEmployeeId || ""}
                    onChange={(e) => setForm({ ...form, ownerEmployeeId: e.target.value })}
                  >
                    <option value="">Select owner…</option>
                    {(ownerOptions || []).map((o) => (
                      <option key={o.ownerId} value={o.ownerId}>{o.fullName}</option>
                    ))}
                  </Input>
                </Col>
              </Row>
            </ModalBody>
            <ModalFooter>
              <Button color="light" size="sm" onClick={() => setEditModal(false)}>Cancel</Button>
              <Button color="primary" size="sm" type="submit" disabled={saving} style={{ backgroundColor: "#7f1d1d", borderColor: "#7f1d1d" }}>
                {saving ? <Spinner size="sm" className="me-1" /> : null}
                Save Changes
              </Button>
            </ModalFooter>
          </Form>
        </Modal>

        {/* MODAL 8: Delete Confirmation Modal */}
        <DeleteModal
          show={deleteModal}
          onDeleteClick={confirmDelete}
          onCloseClick={() => setDeleteModal(false)}
          isLoading={deleting}
        />
      </Container>
    </div>
  );
};

export default LeadDetail;
