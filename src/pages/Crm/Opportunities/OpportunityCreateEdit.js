import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Card,
  CardBody,
  Row,
  Col,
  Input,
  Label,
  Button,
  Badge,
  Spinner,
  Alert,
  Table,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Form,
} from "reactstrap";
import { Link } from "react-router-dom";
import { toastSuccess, toastApiError } from "../../../helpers/crmToast";
import { createContact } from "../../../helpers/crmContactApi";
import { createActivity } from "../../../helpers/crmActivityApi";
import { createTask } from "../../../helpers/crmTaskApi";

const THEME = {
  primary: "#7f1d1d",
  primaryHover: "#991b1b",
  lightBg: "#fef2f2",
  borderTint: "#fee2e2",
  grayBorder: "#e2e8f0",
  textMuted: "#64748b",
  textHeading: "#0f172a",
};

// Stage default probabilities
const STAGE_DEFAULTS = {
  PROSPECTING: 10,
  QUALIFIED: 30,
  PROPOSAL: 60,
  NEGOTIATION: 80,
  CLOSED_WON: 100,
  CLOSED_LOST: 0,
};

const OpportunityCreateEdit = ({
  isEdit = false,
  opportunityId = null,
  initialData = null,
  lookups = {},
  accountOptions = [],
  ownerOptions = [],
  contactOptions = [],
  onLoadContacts = () => {},
  onSave = async () => {},
  onCancel = () => {},
  saving = false,
}) => {
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    accountId: "",
    primaryContactId: "",
    ownerEmployeeId: "",
    pipelineId: "1",
    stageId: "",
    probability: 10,
    expectedCloseDate: "",
    opportunityTypeId: "",
    sourceId: "",
    campaignId: "",
    leadId: "",
    currencyCode: "INR",
    amount: "",
    forecastCategoryId: "",
    territory: "Head Office",
    priorityId: "",
    nextStep: "",
    followupDate: "",
    description: "",
    budget: "",
    competitor: "",
    expectedRevenue: "",
    decisionMaker: "",
    reasonNeed: "",
    proposalSolution: "",
    notes: "",
    reminderEnabled: false,
    reminderTime: "10:00",
    reminderNotes: "",
  });

  const [products, setProducts] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");

  // Refs for smooth scroll & focus
  const fileInputRef = useRef(null);
  const productsSectionRef = useRef(null);
  const notesTextareaRef = useRef(null);

  // Quick Add Modals State
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [newContact, setNewContact] = useState({ firstName: "", lastName: "", mobile: "", email: "", isPrimary: true });

  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [activitySubmitting, setActivitySubmitting] = useState(false);
  const [newActivity, setNewActivity] = useState({
    subject: "",
    actType: "CALL",
    startTime: new Date().toISOString().slice(0, 16),
    phoneNumber: "",
    notes: "",
  });

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskSubmitting, setTaskSubmitting] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    dueDate: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10),
    priority: "MEDIUM",
    taskType: "FOLLOW_UP",
    notes: "",
  });

  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [newQuote, setNewQuote] = useState({
    quoteNumber: `QUO-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`,
    validUntil: new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10),
    discountPercent: 0,
    notes: "Payment due within 30 days of quotation acceptance.",
  });

  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [emailDraft, setEmailDraft] = useState({
    to: "",
    subject: "",
    body: "",
  });

  // Sync initialData if editing
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || "",
        accountId: initialData.accountId ? String(initialData.accountId) : "",
        primaryContactId: initialData.primaryContactId ? String(initialData.primaryContactId) : "",
        ownerEmployeeId: initialData.ownerEmployeeId ? String(initialData.ownerEmployeeId) : "",
        pipelineId: initialData.pipelineId ? String(initialData.pipelineId) : "1",
        stageId: initialData.stageId ? String(initialData.stageId) : "",
        probability: initialData.probability != null ? Number(initialData.probability) : 10,
        expectedCloseDate: initialData.expectedCloseDate ? String(initialData.expectedCloseDate).slice(0, 10) : "",
        opportunityTypeId: initialData.opportunityTypeId ? String(initialData.opportunityTypeId) : "",
        sourceId: initialData.sourceId ? String(initialData.sourceId) : "",
        campaignId: initialData.campaignId ? String(initialData.campaignId) : "",
        leadId: initialData.leadId ? String(initialData.leadId) : "",
        currencyCode: initialData.currencyCode || "INR",
        amount: initialData.amount != null ? String(initialData.amount) : "",
        forecastCategoryId: initialData.forecastCategoryId ? String(initialData.forecastCategoryId) : "",
        territory: initialData.territory || "Head Office",
        priorityId: initialData.priorityId ? String(initialData.priorityId) : "",
        nextStep: initialData.nextStep || "",
        followupDate: initialData.followupDate ? String(initialData.followupDate).slice(0, 10) : "",
        description: initialData.closedReason || initialData.description || "",
        budget: initialData.budget != null ? String(initialData.budget) : "",
        competitor: initialData.competitor || "",
        expectedRevenue: initialData.expectedRevenue != null ? String(initialData.expectedRevenue) : "",
        decisionMaker: initialData.decisionMaker || "",
        reasonNeed: initialData.reasonNeed || "",
        proposalSolution: initialData.proposalSolution || "",
        notes: initialData.closedReason || initialData.notes || "",
        reminderEnabled: !!(initialData.followupDate || initialData.reminderTime || initialData.reminderNotes),
        reminderTime: initialData.reminderTime || "10:00",
        reminderNotes: initialData.reminderNotes || "",
      });

      if (initialData.products) {
        try {
          const parsed = typeof initialData.products === "string" ? JSON.parse(initialData.products) : initialData.products;
          if (Array.isArray(parsed)) setProducts(parsed);
        } catch {
          setProducts([]);
        }
      }
    } else {
      // Default to Prospecting stage and default owner if available
      const stages = lookups.opportunityStage || lookups.opportunity_stage || [];
      const prospecting = stages.find(s => String(s.masterCode || s.master_code || "").toUpperCase() === "PROSPECTING") || stages[0];
      if (prospecting && !formData.stageId) {
        setFormData(prev => ({
          ...prev,
          stageId: String(prospecting.masterId || prospecting.master_id || ""),
          probability: 10,
        }));
      }
      if (ownerOptions.length > 0 && !formData.ownerEmployeeId) {
        const firstOwner = ownerOptions[0];
        setFormData(prev => ({
          ...prev,
          ownerEmployeeId: String(firstOwner.ownerId || firstOwner.employeeId || ""),
        }));
      }
    }
  }, [initialData, lookups, ownerOptions]);

  // Handle Account Change & load contacts
  const handleAccountChange = (accId) => {
    setFormData(prev => ({ ...prev, accountId: accId, primaryContactId: "" }));
    if (accId) {
      onLoadContacts(accId);
    }
  };

  // Stepper stages list (5 pipeline stages)
  const stageList = useMemo(() => {
    const list = lookups.opportunityStage || lookups.opportunity_stage || [];
    return list.slice(0, 5); // Prospecting, Qualified, Proposal, Negotiation, Closed Won
  }, [lookups]);

  // Active step index for timeline progress fill
  const activeStageIndex = useMemo(() => {
    if (!formData.stageId || !stageList.length) return 0;
    const idx = stageList.findIndex(s => String(s.masterId || s.master_id) === String(formData.stageId));
    return idx >= 0 ? idx : 0;
  }, [formData.stageId, stageList]);

  // Handle Stage select from dropdown or stepper
  const handleStageSelect = (stage) => {
    const sId = String(stage.masterId || stage.master_id || "");
    const sCode = String(stage.masterCode || stage.master_code || "").toUpperCase();
    const defaultProb = STAGE_DEFAULTS[sCode] != null ? STAGE_DEFAULTS[sCode] : 10;
    setFormData(prev => ({
      ...prev,
      stageId: sId,
      probability: defaultProb,
    }));
  };

  // Weighted Value Calculation
  const weightedValue = useMemo(() => {
    const amt = Number(formData.amount) || 0;
    const prob = Number(formData.probability) || 0;
    return (amt * prob / 100).toFixed(2);
  }, [formData.amount, formData.probability]);

  // Currency symbol helper
  const currencySymbol = useMemo(() => {
    switch (formData.currencyCode) {
      case "USD": return "$";
      case "EUR": return "€";
      case "GBP": return "£";
      case "AED": return "AED ";
      default: return "₹";
    }
  }, [formData.currencyCode]);

  // Add Product Row
  const handleAddProduct = () => {
    setProducts(prev => [
      ...prev,
      { id: Date.now(), name: "", quantity: 1, unitPrice: 0, amount: 0 },
    ]);
    setTimeout(() => {
      productsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  // Update Product Row
  const handleProductChange = (index, field, value) => {
    setProducts(prev => {
      const next = [...prev];
      const row = { ...next[index], [field]: value };
      if (field === "quantity" || field === "unitPrice") {
        const q = Number(field === "quantity" ? value : row.quantity) || 0;
        const p = Number(field === "unitPrice" ? value : row.unitPrice) || 0;
        row.amount = q * p;
      }
      next[index] = row;
      return next;
    });
  };

  // Remove Product Row
  const handleRemoveProduct = (index) => {
    setProducts(prev => prev.filter((_, i) => i !== index));
  };

  // Sync Products Total into Estimated Value
  const handleSyncProductTotal = () => {
    const total = products.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    setFormData(prev => ({ ...prev, amount: total > 0 ? String(total) : prev.amount }));
    toastSuccess(`Synced total ${currencySymbol} ${total.toLocaleString()} to Estimated Value`);
  };

  // File Upload Handlers
  const handleFileDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer?.files || []);
    if (files.length) {
      addFiles(files);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length) {
      addFiles(files);
    }
  };

  const addFiles = (files) => {
    const formatted = files.map(f => ({
      name: f.name,
      size: (f.size / (1024 * 1024)).toFixed(2) + " MB",
      type: f.name.split(".").pop().toUpperCase(),
    }));
    setAttachments(prev => [...prev, ...formatted]);
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Quick Action: Add Contact
  const handleQuickAddContactSubmit = async (e) => {
    e.preventDefault();
    if (!formData.accountId) {
      toastApiError(null, "Select a Customer Account first.");
      return;
    }
    if (!newContact.firstName.trim()) {
      toastApiError(null, "First name is required.");
      return;
    }
    if (!newContact.mobile.trim()) {
      toastApiError(null, "Mobile number is required.");
      return;
    }

    setContactSubmitting(true);
    try {
      const res = await createContact({
        accountId: Number(formData.accountId),
        firstName: newContact.firstName.trim(),
        lastName: newContact.lastName.trim() || undefined,
        mobile: newContact.mobile.trim(),
        email: newContact.email.trim() || undefined,
        isPrimary: newContact.isPrimary,
      });
      toastSuccess("New contact created and linked.");
      setContactModalOpen(false);
      setNewContact({ firstName: "", lastName: "", mobile: "", email: "", isPrimary: true });
      const refreshed = await onLoadContacts(formData.accountId);
      const createdId = res?.contactPersonId || (Array.isArray(refreshed) ? refreshed[refreshed.length - 1]?.contactPersonId : null);
      if (createdId) {
        setFormData(prev => ({ ...prev, primaryContactId: String(createdId) }));
      }
    } catch (err) {
      toastApiError(err, "Failed to create contact.");
    } finally {
      setContactSubmitting(false);
    }
  };

  // Quick Action: Schedule Activity
  const handleQuickScheduleActivitySubmit = async (e) => {
    e.preventDefault();
    if (!newActivity.subject.trim()) {
      toastApiError(null, "Activity subject is required.");
      return;
    }

    setActivitySubmitting(true);
    try {
      await createActivity({
        subject: `[${formData.name || "Opportunity"}] ${newActivity.subject.trim()}`,
        actType: newActivity.actType || "CALL",
        startTime: newActivity.startTime ? new Date(newActivity.startTime).toISOString() : new Date().toISOString(),
        callNumber: newActivity.phoneNumber.trim() || undefined,
        callNotes: newActivity.notes.trim() || undefined,
        employeeId: formData.ownerEmployeeId ? Number(formData.ownerEmployeeId) : undefined,
      });
      toastSuccess("Activity scheduled successfully.");
      setActivityModalOpen(false);
      setNewActivity({
        subject: "",
        actType: "CALL",
        startTime: new Date().toISOString().slice(0, 16),
        phoneNumber: "",
        notes: "",
      });
    } catch (err) {
      toastApiError(err, "Failed to schedule activity.");
    } finally {
      setActivitySubmitting(false);
    }
  };

  // Quick Action: Add Task
  const handleQuickAddTaskSubmit = async (e) => {
    e.preventDefault();
    if (!newTask.title.trim()) {
      toastApiError(null, "Task title is required.");
      return;
    }

    setTaskSubmitting(true);
    try {
      await createTask({
        title: `[${formData.name || "Deal"}] ${newTask.title.trim()}`,
        dueDate: newTask.dueDate || null,
        priority: newTask.priority || "MEDIUM",
        taskType: newTask.taskType || "FOLLOW_UP",
        employeeId: formData.ownerEmployeeId ? Number(formData.ownerEmployeeId) : undefined,
        notes: newTask.notes.trim() || undefined,
      });
      toastSuccess("Task created successfully.");
      setTaskModalOpen(false);
      setNewTask({
        title: "",
        dueDate: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10),
        priority: "MEDIUM",
        taskType: "FOLLOW_UP",
        notes: "",
      });
    } catch (err) {
      toastApiError(err, "Failed to create task.");
    } finally {
      setTaskSubmitting(false);
    }
  };

  // Quick Action: Open Create Quote Modal
  const handleOpenQuoteModal = () => {
    setNewQuote(prev => ({
      ...prev,
      quoteNumber: `QUO-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`,
      validUntil: new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10),
    }));
    setQuoteModalOpen(true);
  };

  const handleQuickAddQuoteSubmit = (e) => {
    e.preventDefault();
    const discount = Number(newQuote.discountPercent) || 0;
    const baseAmt = Number(formData.amount || 0);
    const finalAmt = (baseAmt * (1 - discount / 100)).toFixed(2);
    toastSuccess(`Quotation ${newQuote.quoteNumber} prepared for ${currencySymbol} ${Number(finalAmt).toLocaleString()} (Valid until ${newQuote.validUntil})`);
    setQuoteModalOpen(false);
  };

  // Quick Action: Open Compose Email Modal
  const handleOpenEmailModal = () => {
    const selectedContact = contactOptions.find(c => String(c.contactPersonId) === String(formData.primaryContactId));
    const recipient = selectedContact?.email || "";
    setEmailDraft({
      to: recipient,
      subject: `Proposal: ${formData.name || "SoftOnCloud Solution"}`,
      body: `Dear ${selectedContact ? (selectedContact.fullName || selectedContact.firstName) : "Client"},\n\nThank you for considering SoftOnCloud CRM. Following our discussion, we have prepared our solution proposal for "${formData.name || "this opportunity"}".\n\nEstimated Value: ${currencySymbol} ${Number(formData.amount || 0).toLocaleString()}\nStage: ${stageList.find(s => String(s.masterId || s.master_id) === String(formData.stageId))?.masterName || "Prospecting"}\n\nPlease review and let us know if you have any questions.\n\nWarm regards,\nSoftOnCloud CRM Sales Team`,
    });
    setEmailModalOpen(true);
  };

  const handleQuickSendEmailSubmit = async (e) => {
    e.preventDefault();
    if (!emailDraft.to.trim()) {
      toastApiError(null, "Recipient email address is required.");
      return;
    }
    setEmailSubmitting(true);
    try {
      await createActivity({
        subject: `[Email] ${emailDraft.subject}`,
        actType: "EMAIL",
        startTime: new Date().toISOString(),
        callNotes: emailDraft.body,
        employeeId: formData.ownerEmployeeId ? Number(formData.ownerEmployeeId) : undefined,
      });
      toastSuccess("Email logged to activities and dispatched.");
      setEmailModalOpen(false);
    } catch (err) {
      toastApiError(err, "Failed to log email activity.");
    } finally {
      setEmailSubmitting(false);
    }
  };

  // Submit Handler
  const handleSubmit = (saveAndNew = false) => {
    setErrorMsg("");
    if (!formData.name.trim()) {
      setErrorMsg("Opportunity Name is required.");
      return;
    }
    if (!formData.accountId) {
      setErrorMsg("Please select a Customer / Account.");
      return;
    }

    const payload = {
      name: formData.name.trim(),
      accountId: Number(formData.accountId),
      primaryContactId: formData.primaryContactId ? Number(formData.primaryContactId) : null,
      ownerEmployeeId: formData.ownerEmployeeId ? Number(formData.ownerEmployeeId) : null,
      pipelineId: formData.pipelineId ? Number(formData.pipelineId) : 1,
      stageId: formData.stageId ? Number(formData.stageId) : null,
      probability: Number(formData.probability) || 0,
      expectedCloseDate: formData.expectedCloseDate || null,
      opportunityTypeId: formData.opportunityTypeId ? Number(formData.opportunityTypeId) : null,
      sourceId: formData.sourceId ? Number(formData.sourceId) : null,
      campaignId: formData.campaignId ? Number(formData.campaignId) : null,
      leadId: formData.leadId ? Number(formData.leadId) : null,
      currencyCode: formData.currencyCode || "INR",
      amount: formData.amount ? Number(formData.amount) : 0,
      forecastCategoryId: formData.forecastCategoryId ? Number(formData.forecastCategoryId) : null,
      territory: formData.territory.trim() || null,
      priorityId: formData.priorityId ? Number(formData.priorityId) : null,
      nextStep: formData.nextStep.trim() || null,
      followupDate: formData.followupDate || null,
      description: formData.description.trim() || null,
      notes: formData.notes.trim() || null,
      closedReason: formData.notes.trim() || formData.description.trim() || null,
      budget: formData.budget ? Number(formData.budget) : null,
      competitor: formData.competitor.trim() || null,
      expectedRevenue: formData.expectedRevenue ? Number(formData.expectedRevenue) : null,
      decisionMaker: formData.decisionMaker.trim() || null,
      reasonNeed: formData.reasonNeed.trim() || null,
      proposalSolution: formData.proposalSolution.trim() || null,
      productsJson: products.length > 0 ? JSON.stringify(products) : "[]",
      reminderTime: formData.reminderEnabled ? formData.reminderTime : null,
      reminderNotes: formData.reminderEnabled ? formData.reminderNotes : null,
    };

    onSave(payload, saveAndNew);
  };

  return (
    <div className="pb-5">
      <style>{`
        .maroon-range {
          accent-color: #7f1d1d !important;
        }
        .maroon-range::-webkit-slider-thumb {
          background-color: #7f1d1d !important;
          border-color: #7f1d1d !important;
        }
        .maroon-range::-moz-range-thumb {
          background-color: #7f1d1d !important;
          border-color: #7f1d1d !important;
        }
      `}</style>

      {/* Header Bar */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3">
        <div>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-1 text-muted small">
              <li className="breadcrumb-item">
                <Link to="/crm/dashboard" style={{ color: THEME.textMuted }}>CRM</Link>
              </li>
              <li className="breadcrumb-item">
                <button
                  type="button"
                  className="btn btn-link p-0 text-decoration-none small"
                  style={{ color: THEME.textMuted }}
                  onClick={onCancel}
                >
                  Opportunities
                </button>
              </li>
              <li className="breadcrumb-item active text-dark fw-semibold" aria-current="page">
                {isEdit ? "Edit Opportunity" : "Create New Opportunity"}
              </li>
            </ol>
          </nav>
          <h4 className="fw-bold mb-0" style={{ color: THEME.textHeading }}>
            {isEdit ? `Edit Opportunity #${opportunityId}` : "Create New Opportunity"}
          </h4>
        </div>
        <div className="d-flex gap-2">
          <Button
            type="button"
            className="rounded-0 px-3 fw-medium"
            style={{
              backgroundColor: "#ffffff",
              color: THEME.textHeading,
              border: `1px solid ${THEME.grayBorder}`,
            }}
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </Button>
          {!isEdit && (
            <Button
              type="button"
              className="rounded-0 px-3 fw-medium"
              style={{
                backgroundColor: "#ffffff",
                color: THEME.primary,
                border: `1px solid ${THEME.primary}`,
              }}
              onClick={() => handleSubmit(true)}
              disabled={saving}
            >
              {saving ? <Spinner size="sm" /> : "Save & New"}
            </Button>
          )}
          <Button
            type="button"
            className="rounded-0 px-4 fw-medium text-white shadow-sm"
            style={{
              backgroundColor: THEME.primary,
              borderColor: THEME.primary,
            }}
            onClick={() => handleSubmit(false)}
            disabled={saving}
          >
            {saving ? (
              <>
                <Spinner size="sm" className="me-2" />
                Saving...
              </>
            ) : isEdit ? (
              "Update Opportunity"
            ) : (
              "Save Opportunity"
            )}
          </Button>
        </div>
      </div>

      {errorMsg && (
        <Alert color="danger" className="rounded-0 mb-3 py-2 small">
          <i className="ri-error-warning-line me-1" />
          {errorMsg}
        </Alert>
      )}

      {/* Main 2-Column Content */}
      <Row>
        {/* Left Column (Forms & Details) */}
        <Col xl={8} lg={8}>
          {/* Card 1: Opportunity Information */}
          <Card className="rounded-0 border shadow-none mb-3" style={{ borderColor: THEME.grayBorder }}>
            <div
              className="px-3 py-2 border-bottom d-flex align-items-center"
              style={{ backgroundColor: "#f8fafc", borderColor: THEME.grayBorder }}
            >
              <i className="ri-shield-star-line me-2" style={{ color: THEME.primary }} />
              <h6 className="mb-0 fw-bold" style={{ color: THEME.textHeading }}>
                Opportunity Information
              </h6>
            </div>
            <CardBody className="p-3">
              <Row className="g-3">
                <Col md={6}>
                  <Label className="form-label small fw-semibold mb-1">
                    Opportunity Name <span className="text-danger">*</span>
                  </Label>
                  <Input
                    type="text"
                    className="rounded-0 form-control-sm"
                    placeholder="Enter opportunity name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </Col>

                <Col md={6}>
                  <Label className="form-label small fw-semibold mb-1">
                    Customer / Account <span className="text-danger">*</span>
                  </Label>
                  <Input
                    type="select"
                    className="rounded-0 form-control-sm"
                    value={formData.accountId}
                    onChange={(e) => handleAccountChange(e.target.value)}
                  >
                    <option value="">Search customer / account...</option>
                    {accountOptions.map((acc) => (
                      <option key={acc.accountId} value={acc.accountId}>
                        {acc.displayName || acc.companyName || `#${acc.accountId}`}
                      </option>
                    ))}
                  </Input>
                </Col>

                <Col md={6}>
                  <Label className="form-label small fw-semibold mb-1">Contact</Label>
                  <Input
                    type="select"
                    className="rounded-0 form-control-sm"
                    value={formData.primaryContactId}
                    onChange={(e) => setFormData({ ...formData, primaryContactId: e.target.value })}
                    disabled={!formData.accountId}
                  >
                    <option value="">
                      {!formData.accountId
                        ? "Select a customer first"
                        : contactOptions.length === 0
                        ? "No contacts found"
                        : "Select contact"}
                    </option>
                    {contactOptions.map((c) => (
                      <option key={c.contactPersonId} value={c.contactPersonId}>
                        {c.fullName || `${c.firstName || ""} ${c.lastName || ""}`.trim()} {c.isPrimary ? "(Primary)" : ""}
                      </option>
                    ))}
                  </Input>
                </Col>

                <Col md={6}>
                  <Label className="form-label small fw-semibold mb-1">
                    Opportunity Owner <span className="text-danger">*</span>
                  </Label>
                  <Input
                    type="select"
                    className="rounded-0 form-control-sm"
                    value={formData.ownerEmployeeId}
                    onChange={(e) => setFormData({ ...formData, ownerEmployeeId: e.target.value })}
                  >
                    <option value="">Select owner...</option>
                    {ownerOptions.map((o) => (
                      <option key={o.ownerId || o.employeeId} value={o.ownerId || o.employeeId}>
                        {o.fullName || o.ownerName}
                      </option>
                    ))}
                  </Input>
                </Col>

                <Col md={4}>
                  <Label className="form-label small fw-semibold mb-1">
                    Pipeline <span className="text-danger">*</span>
                  </Label>
                  <Input
                    type="select"
                    className="rounded-0 form-control-sm"
                    value={formData.pipelineId}
                    onChange={(e) => setFormData({ ...formData, pipelineId: e.target.value })}
                  >
                    {(lookups.pipeline || [{ masterId: 1, masterName: "Default Pipeline" }]).map((p) => (
                      <option key={p.masterId} value={p.masterId}>
                        {p.masterName}
                      </option>
                    ))}
                  </Input>
                </Col>

                <Col md={4}>
                  <Label className="form-label small fw-semibold mb-1">
                    Stage <span className="text-danger">*</span>
                  </Label>
                  <Input
                    type="select"
                    className="rounded-0 form-control-sm"
                    value={formData.stageId}
                    onChange={(e) => {
                      const stages = lookups.opportunityStage || lookups.opportunity_stage || [];
                      const st = stages.find(s => String(s.masterId || s.master_id) === e.target.value);
                      if (st) handleStageSelect(st);
                      else setFormData({ ...formData, stageId: e.target.value });
                    }}
                  >
                    {(lookups.opportunityStage || lookups.opportunity_stage || []).map((s) => (
                      <option key={s.masterId} value={s.masterId}>
                        {s.masterName}
                      </option>
                    ))}
                  </Input>
                </Col>

                <Col md={4}>
                  <Label className="form-label small fw-semibold mb-1">
                    Probability (%) <span className="text-danger">*</span>
                  </Label>
                  <div className="input-group input-group-sm">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      className="rounded-0"
                      value={formData.probability}
                      onChange={(e) => setFormData({ ...formData, probability: e.target.value })}
                    />
                    <span className="input-group-text rounded-0 bg-light text-muted">%</span>
                  </div>
                </Col>

                <Col md={4}>
                  <Label className="form-label small fw-semibold mb-1">
                    Expected Close Date <span className="text-danger">*</span>
                  </Label>
                  <Input
                    type="date"
                    className="rounded-0 form-control-sm"
                    value={formData.expectedCloseDate}
                    onChange={(e) => setFormData({ ...formData, expectedCloseDate: e.target.value })}
                  />
                </Col>

                <Col md={4}>
                  <Label className="form-label small fw-semibold mb-1">Opportunity Type</Label>
                  <Input
                    type="select"
                    className="rounded-0 form-control-sm"
                    value={formData.opportunityTypeId}
                    onChange={(e) => setFormData({ ...formData, opportunityTypeId: e.target.value })}
                  >
                    <option value="">Select opportunity type</option>
                    {(lookups.opportunityType || lookups.opportunity_type || []).map((t) => (
                      <option key={t.masterId} value={t.masterId}>
                        {t.masterName}
                      </option>
                    ))}
                  </Input>
                </Col>

                <Col md={4}>
                  <Label className="form-label small fw-semibold mb-1">Source</Label>
                  <Input
                    type="select"
                    className="rounded-0 form-control-sm"
                    value={formData.sourceId}
                    onChange={(e) => setFormData({ ...formData, sourceId: e.target.value })}
                  >
                    <option value="">Select source</option>
                    {(lookups.leadSource || lookups.lead_source || []).map((s) => (
                      <option key={s.masterId} value={s.masterId}>
                        {s.masterName}
                      </option>
                    ))}
                  </Input>
                </Col>

                <Col md={4}>
                  <Label className="form-label small fw-semibold mb-1">Campaign</Label>
                  <Input
                    type="select"
                    className="rounded-0 form-control-sm"
                    value={formData.campaignId}
                    onChange={(e) => setFormData({ ...formData, campaignId: e.target.value })}
                  >
                    <option value="">Select campaign</option>
                  </Input>
                </Col>

                <Col md={4}>
                  <Label className="form-label small fw-semibold mb-1">Lead (Converted From)</Label>
                  <Input
                    type="text"
                    className="rounded-0 form-control-sm"
                    placeholder="Search lead or ID"
                    value={formData.leadId}
                    onChange={(e) => setFormData({ ...formData, leadId: e.target.value })}
                  />
                </Col>

                <Col md={4}>
                  <Label className="form-label small fw-semibold mb-1">Currency</Label>
                  <Input
                    type="select"
                    className="rounded-0 form-control-sm"
                    value={formData.currencyCode}
                    onChange={(e) => setFormData({ ...formData, currencyCode: e.target.value })}
                  >
                    {(lookups.currency || [
                      { masterCode: "INR", masterName: "INR - Indian Rupee (₹)" },
                      { masterCode: "USD", masterName: "USD - US Dollar ($)" },
                      { masterCode: "EUR", masterName: "EUR - Euro (€)" },
                      { masterCode: "GBP", masterName: "GBP - British Pound (£)" },
                      { masterCode: "AED", masterName: "AED - UAE Dirham (د.إ)" },
                    ]).map((c) => (
                      <option key={c.masterCode} value={c.masterCode}>
                        {c.masterName}
                      </option>
                    ))}
                  </Input>
                </Col>

                <Col md={4}>
                  <Label className="form-label small fw-semibold mb-1">
                    Estimated Value <span className="text-danger">*</span>
                  </Label>
                  <div className="input-group input-group-sm">
                    <span className="input-group-text rounded-0 bg-light text-muted">
                      {currencySymbol}
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      className="rounded-0"
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    />
                  </div>
                </Col>

                <Col md={4}>
                  <Label className="form-label small fw-semibold mb-1">Weighted Value</Label>
                  <div className="input-group input-group-sm">
                    <span className="input-group-text rounded-0 bg-light text-muted">
                      {currencySymbol}
                    </span>
                    <Input
                      type="text"
                      readOnly
                      className="rounded-0 bg-light fw-medium"
                      value={weightedValue}
                    />
                  </div>
                </Col>

                <Col md={4}>
                  <Label className="form-label small fw-semibold mb-1">Forecast Category</Label>
                  <Input
                    type="select"
                    className="rounded-0 form-control-sm"
                    value={formData.forecastCategoryId}
                    onChange={(e) => setFormData({ ...formData, forecastCategoryId: e.target.value })}
                  >
                    <option value="">Select category</option>
                    {(lookups.forecastCategory || lookups.forecast_category || []).map((f) => (
                      <option key={f.masterId} value={f.masterId}>
                        {f.masterName}
                      </option>
                    ))}
                  </Input>
                </Col>

                <Col md={4}>
                  <Label className="form-label small fw-semibold mb-1">Territory</Label>
                  <Input
                    type="text"
                    className="rounded-0 form-control-sm"
                    placeholder="Enter territory"
                    value={formData.territory}
                    onChange={(e) => setFormData({ ...formData, territory: e.target.value })}
                  />
                </Col>

                <Col md={4}>
                  <Label className="form-label small fw-semibold mb-1">Priority</Label>
                  <Input
                    type="select"
                    className="rounded-0 form-control-sm"
                    value={formData.priorityId}
                    onChange={(e) => setFormData({ ...formData, priorityId: e.target.value })}
                  >
                    <option value="">Select priority</option>
                    {(lookups.priority || []).map((p) => (
                      <option key={p.masterId} value={p.masterId}>
                        {p.masterName}
                      </option>
                    ))}
                  </Input>
                </Col>

                <Col md={4}>
                  <Label className="form-label small fw-semibold mb-1">Next Step</Label>
                  <Input
                    type="text"
                    className="rounded-0 form-control-sm"
                    placeholder="Enter next step"
                    value={formData.nextStep}
                    onChange={(e) => setFormData({ ...formData, nextStep: e.target.value })}
                  />
                </Col>

                <Col md={4}>
                  <Label className="form-label small fw-semibold mb-1">Follow-up Date</Label>
                  <Input
                    type="date"
                    className="rounded-0 form-control-sm"
                    value={formData.followupDate}
                    onChange={(e) => setFormData({ ...formData, followupDate: e.target.value })}
                  />
                </Col>
              </Row>
            </CardBody>
          </Card>

          {/* Card 2: Details & Description */}
          <Card className="rounded-0 border shadow-none mb-3" style={{ borderColor: THEME.grayBorder }}>
            <div
              className="px-3 py-2 border-bottom d-flex align-items-center"
              style={{ backgroundColor: "#f8fafc", borderColor: THEME.grayBorder }}
            >
              <i className="ri-file-text-line me-2" style={{ color: THEME.primary }} />
              <h6 className="mb-0 fw-bold" style={{ color: THEME.textHeading }}>
                Details & Description
              </h6>
            </div>
            <CardBody className="p-3">
              <div className="mb-3">
                <Label className="form-label small fw-semibold mb-1">Description</Label>
                {/* Editor-like Toolbar */}
                <div
                  className="d-flex align-items-center gap-1 p-1 border border-bottom-0 bg-light"
                  style={{ borderColor: THEME.grayBorder }}
                >
                  <button type="button" className="btn btn-sm btn-light border-0 py-0 px-2 fw-bold">B</button>
                  <button type="button" className="btn btn-sm btn-light border-0 py-0 px-2 fst-italic">I</button>
                  <button type="button" className="btn btn-sm btn-light border-0 py-0 px-2 text-decoration-underline">U</button>
                  <div className="vr my-1" />
                  <button type="button" className="btn btn-sm btn-light border-0 py-0 px-2"><i className="ri-list-unordered" /></button>
                  <button type="button" className="btn btn-sm btn-light border-0 py-0 px-2"><i className="ri-list-ordered" /></button>
                  <div className="vr my-1" />
                  <button type="button" className="btn btn-sm btn-light border-0 py-0 px-2"><i className="ri-link" /></button>
                  <button type="button" className="btn btn-sm btn-light border-0 py-0 px-2"><i className="ri-image-line" /></button>
                </div>
                <Input
                  type="textarea"
                  rows="4"
                  className="rounded-0 form-control-sm"
                  placeholder="Enter detailed description of the deal or customer requirements..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
                />
              </div>

              {/* Products / Services Section */}
              <div className="mt-3" ref={productsSectionRef}>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <Label className="form-label small fw-semibold mb-0">
                    Products / Services (Optional)
                  </Label>
                  <div className="d-flex gap-2">
                    {products.length > 0 && (
                      <Button
                        type="button"
                        size="sm"
                        color="light"
                        className="rounded-0 text-muted border py-0 px-2 small"
                        onClick={handleSyncProductTotal}
                        title="Copy products sum to Estimated Value"
                      >
                        <i className="ri-calculator-line me-1" />
                        Sync to Est. Value
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      className="rounded-0 text-white py-0 px-2 small"
                      style={{ backgroundColor: THEME.primary, borderColor: THEME.primary }}
                      onClick={handleAddProduct}
                    >
                      <i className="ri-add-line me-1" />
                      Add Product / Service
                    </Button>
                  </div>
                </div>

                {products.length === 0 ? (
                  <div
                    className="p-3 text-center border text-muted small"
                    style={{ backgroundColor: "#fdfdfd", borderColor: THEME.grayBorder }}
                  >
                    No products added yet. Click <strong>+ Add Product / Service</strong> above to add line items.
                  </div>
                ) : (
                  <div className="table-responsive border" style={{ borderColor: THEME.grayBorder }}>
                    <Table size="sm" className="mb-0 align-middle">
                      <thead className="bg-light text-muted small">
                        <tr>
                          <th style={{ width: 40 }}>#</th>
                          <th>Product / Service</th>
                          <th style={{ width: 100 }}>Quantity</th>
                          <th style={{ width: 130 }}>Unit Price ({currencySymbol})</th>
                          <th style={{ width: 130 }}>Amount ({currencySymbol})</th>
                          <th style={{ width: 40 }} />
                        </tr>
                      </thead>
                      <tbody>
                        {products.map((item, index) => (
                          <tr key={item.id || index}>
                            <td className="text-muted small">{index + 1}</td>
                            <td>
                              <Input
                                type="text"
                                className="rounded-0 form-control-sm"
                                placeholder="Product name or SKU"
                                value={item.name}
                                onChange={(e) => handleProductChange(index, "name", e.target.value)}
                              />
                            </td>
                            <td>
                              <Input
                                type="number"
                                min="1"
                                className="rounded-0 form-control-sm"
                                value={item.quantity}
                                onChange={(e) => handleProductChange(index, "quantity", e.target.value)}
                              />
                            </td>
                            <td>
                              <Input
                                type="number"
                                step="0.01"
                                className="rounded-0 form-control-sm"
                                value={item.unitPrice}
                                onChange={(e) => handleProductChange(index, "unitPrice", e.target.value)}
                              />
                            </td>
                            <td className="fw-semibold small">
                              {currencySymbol} {Number(item.amount || 0).toLocaleString()}
                            </td>
                            <td>
                              <button
                                type="button"
                                className="btn btn-sm btn-link text-danger p-0"
                                onClick={() => handleRemoveProduct(index)}
                              >
                                <i className="ri-delete-bin-line" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>

          {/* Card 3: Additional Information */}
          <Card className="rounded-0 border shadow-none mb-3" style={{ borderColor: THEME.grayBorder }}>
            <div
              className="px-3 py-2 border-bottom d-flex align-items-center"
              style={{ backgroundColor: "#f8fafc", borderColor: THEME.grayBorder }}
            >
              <i className="ri-information-line me-2" style={{ color: THEME.primary }} />
              <h6 className="mb-0 fw-bold" style={{ color: THEME.textHeading }}>
                Additional Information
              </h6>
            </div>
            <CardBody className="p-3">
              <Row className="g-3">
                <Col md={3}>
                  <Label className="form-label small fw-semibold mb-1">Budget</Label>
                  <div className="input-group input-group-sm">
                    <span className="input-group-text rounded-0 bg-light text-muted">{currencySymbol}</span>
                    <Input
                      type="number"
                      step="0.01"
                      className="rounded-0"
                      placeholder="Enter budget"
                      value={formData.budget}
                      onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    />
                  </div>
                </Col>

                <Col md={3}>
                  <Label className="form-label small fw-semibold mb-1">Competitor</Label>
                  <Input
                    type="text"
                    className="rounded-0 form-control-sm"
                    placeholder="Enter competitor"
                    value={formData.competitor}
                    onChange={(e) => setFormData({ ...formData, competitor: e.target.value })}
                  />
                </Col>

                <Col md={3}>
                  <Label className="form-label small fw-semibold mb-1">Expected Revenue</Label>
                  <div className="input-group input-group-sm">
                    <span className="input-group-text rounded-0 bg-light text-muted">{currencySymbol}</span>
                    <Input
                      type="number"
                      step="0.01"
                      className="rounded-0"
                      placeholder="0.00"
                      value={formData.expectedRevenue}
                      onChange={(e) => setFormData({ ...formData, expectedRevenue: e.target.value })}
                    />
                  </div>
                </Col>

                <Col md={3}>
                  <Label className="form-label small fw-semibold mb-1">Decision Maker</Label>
                  <Input
                    type="text"
                    className="rounded-0 form-control-sm"
                    placeholder="Enter decision maker"
                    value={formData.decisionMaker}
                    onChange={(e) => setFormData({ ...formData, decisionMaker: e.target.value })}
                  />
                </Col>

                <Col md={6}>
                  <Label className="form-label small fw-semibold mb-1">Reason / Need</Label>
                  <Input
                    type="text"
                    className="rounded-0 form-control-sm"
                    placeholder="Enter customer need or reason"
                    value={formData.reasonNeed}
                    onChange={(e) => setFormData({ ...formData, reasonNeed: e.target.value })}
                  />
                </Col>

                <Col md={6}>
                  <Label className="form-label small fw-semibold mb-1">Proposal / Solution</Label>
                  <Input
                    type="text"
                    className="rounded-0 form-control-sm"
                    placeholder="Enter proposed solution"
                    value={formData.proposalSolution}
                    onChange={(e) => setFormData({ ...formData, proposalSolution: e.target.value })}
                  />
                </Col>

                <Col md={12}>
                  <Label className="form-label small fw-semibold mb-1">Notes</Label>
                  <Input
                    type="textarea"
                    rows="3"
                    innerRef={notesTextareaRef}
                    className="rounded-0 form-control-sm"
                    placeholder="Enter internal notes..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </Col>
              </Row>
            </CardBody>
          </Card>

          {/* Card 4: Attachments (Optional) */}
          <Card className="rounded-0 border shadow-none mb-3" style={{ borderColor: THEME.grayBorder }}>
            <div
              className="px-3 py-2 border-bottom d-flex align-items-center"
              style={{ backgroundColor: "#f8fafc", borderColor: THEME.grayBorder }}
            >
              <i className="ri-attachment-line me-2" style={{ color: THEME.primary }} />
              <h6 className="mb-0 fw-bold" style={{ color: THEME.textHeading }}>
                Attachments (Optional)
              </h6>
            </div>
            <CardBody className="p-3">
              <input
                type="file"
                multiple
                ref={fileInputRef}
                style={{ display: "none" }}
                onChange={handleFileSelect}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png"
              />
              <div
                className="p-4 text-center border border-dashed rounded-0"
                style={{
                  backgroundColor: "#fafafa",
                  borderColor: THEME.grayBorder,
                  cursor: "pointer",
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <i className="ri-upload-cloud-2-line fs-2 mb-2 d-block" style={{ color: THEME.primary }} />
                <p className="mb-1 fw-medium" style={{ color: THEME.textHeading }}>
                  Drag & drop files here or <span className="text-decoration-underline" style={{ color: THEME.primary }}>Choose Files</span>
                </p>
                <span className="text-muted small">
                  Allowed: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, JPG, PNG (Max 10MB each)
                </span>
              </div>

              {attachments.length > 0 && (
                <div className="mt-3">
                  <Label className="form-label small fw-semibold mb-2">Attached Files ({attachments.length})</Label>
                  <div className="d-flex flex-wrap gap-2">
                    {attachments.map((file, i) => (
                      <div
                        key={i}
                        className="d-flex align-items-center gap-2 p-2 border bg-light small"
                        style={{ borderColor: THEME.grayBorder }}
                      >
                        <i className="ri-file-3-line" style={{ color: THEME.primary }} />
                        <span className="fw-medium text-truncate" style={{ maxWidth: 160 }}>{file.name}</span>
                        <span className="text-muted">({file.size})</span>
                        <button
                          type="button"
                          className="btn btn-sm btn-link text-danger p-0 ms-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeAttachment(i);
                          }}
                        >
                          <i className="ri-close-line" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </Col>

        {/* Right Column (Sidebar Tools & Stepper) */}
        <Col xl={4} lg={4}>
          {/* Card 1: Stage & Probability */}
          <Card className="rounded-0 border shadow-none mb-3" style={{ borderColor: THEME.grayBorder }}>
            <div
              className="px-3 py-2 border-bottom d-flex align-items-center"
              style={{ backgroundColor: "#f8fafc", borderColor: THEME.grayBorder }}
            >
              <i className="ri-line-chart-line me-2" style={{ color: THEME.primary }} />
              <h6 className="mb-0 fw-bold" style={{ color: THEME.textHeading }}>
                Stage & Probability
              </h6>
            </div>
            <CardBody className="p-3">
              <Label className="form-label small fw-semibold mb-2 text-muted">Current Stage</Label>
              {/* Stepper Chevron / Timeline with Progress Line & Non-truncated Labels */}
              <div className="position-relative mb-4 px-1">
                {/* Background Line */}
                <div
                  className="position-absolute w-100"
                  style={{
                    height: 3,
                    backgroundColor: THEME.grayBorder,
                    top: "14px",
                    left: 0,
                    zIndex: 0,
                  }}
                />
                {/* Active Progress Fill Line */}
                <div
                  className="position-absolute"
                  style={{
                    height: 3,
                    backgroundColor: THEME.primary,
                    top: "14px",
                    left: 0,
                    width: stageList.length > 1 ? `${(activeStageIndex / (stageList.length - 1)) * 100}%` : "0%",
                    zIndex: 0,
                    transition: "width 0.3s ease",
                  }}
                />

                <div className="d-flex justify-content-between position-relative" style={{ zIndex: 1 }}>
                  {stageList.map((stage, idx) => {
                    const sId = String(stage.masterId || stage.master_id);
                    const isSelected = sId === String(formData.stageId);
                    const isPassed = idx <= activeStageIndex;

                    return (
                      <div
                        key={sId}
                        className="text-center"
                        style={{ cursor: "pointer", flex: "1 1 0", minWidth: 0, padding: "0 1px" }}
                        onClick={() => handleStageSelect(stage)}
                      >
                        <div
                          className="d-flex align-items-center justify-content-center mx-auto mb-1 rounded-circle"
                          style={{
                            width: 28,
                            height: 28,
                            backgroundColor: isPassed ? THEME.primary : "#ffffff",
                            border: `2px solid ${isPassed ? THEME.primary : THEME.grayBorder}`,
                            color: isPassed ? "#ffffff" : THEME.textMuted,
                            fontSize: 12,
                            fontWeight: "bold",
                            transition: "all 0.2s ease",
                          }}
                        >
                          {isPassed ? <i className="ri-check-line" /> : <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: THEME.grayBorder }} />}
                        </div>
                        <span
                          className="d-block text-center"
                          style={{
                            fontSize: 11,
                            color: isSelected ? THEME.primary : THEME.textMuted,
                            fontWeight: isSelected ? 700 : 500,
                            lineHeight: "1.2",
                            whiteSpace: "nowrap",
                            letterSpacing: "-0.2px",
                          }}
                          title={stage.masterName}
                        >
                          {stage.masterName}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Probability Slider with SoftOnCloud Maroon Theme */}
              <div className="mt-3 pt-2">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <Label className="form-label small fw-semibold mb-0 text-muted">Probability</Label>
                  <div className="d-flex align-items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="form-control form-control-sm text-end rounded-0 py-0 px-1 border"
                      style={{ width: 50, height: 26, fontSize: 12, borderColor: "#cbd5e1" }}
                      value={formData.probability}
                      onChange={(e) => setFormData({ ...formData, probability: e.target.value })}
                    />
                    <span className="small text-muted">%</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  className="form-range w-100 maroon-range"
                  value={formData.probability}
                  onChange={(e) => setFormData({ ...formData, probability: e.target.value })}
                  style={{
                    accentColor: THEME.primary,
                    cursor: "pointer",
                    background: `linear-gradient(to right, #7f1d1d 0%, #7f1d1d ${formData.probability}%, #e2e8f0 ${formData.probability}%, #e2e8f0 100%)`,
                    height: "6px",
                    borderRadius: 0,
                  }}
                />
              </div>
            </CardBody>
          </Card>

          {/* Card 2: Quick Add with Working Actions */}
          <Card className="rounded-0 border shadow-none mb-3" style={{ borderColor: THEME.grayBorder }}>
            <div
              className="px-3 py-2 border-bottom d-flex align-items-center"
              style={{ backgroundColor: "#f8fafc", borderColor: THEME.grayBorder }}
            >
              <i className="ri-flashlight-line me-2" style={{ color: THEME.primary }} />
              <h6 className="mb-0 fw-bold" style={{ color: THEME.textHeading }}>
                Quick Add
              </h6>
            </div>
            <CardBody className="p-3">
              <Row className="g-2 text-center">
                <Col xs={6}>
                  <button
                    type="button"
                    className="btn btn-light w-100 p-2 rounded-0 border text-start d-flex align-items-center gap-2"
                    style={{ borderColor: THEME.grayBorder }}
                    onClick={() => {
                      if (!formData.accountId) {
                        toastApiError(null, "Select a Customer Account first before adding a contact.");
                        return;
                      }
                      setContactModalOpen(true);
                    }}
                  >
                    <div
                      className="d-flex align-items-center justify-content-center p-2 rounded-0"
                      style={{ backgroundColor: "#eff6ff", color: "#2563eb" }}
                    >
                      <i className="ri-user-add-line fs-5" />
                    </div>
                    <div>
                      <div className="fw-semibold small" style={{ color: THEME.textHeading }}>Add Contact</div>
                      <div className="text-muted" style={{ fontSize: 10 }}>Link decision maker</div>
                    </div>
                  </button>
                </Col>

                <Col xs={6}>
                  <button
                    type="button"
                    className="btn btn-light w-100 p-2 rounded-0 border text-start d-flex align-items-center gap-2"
                    style={{ borderColor: THEME.grayBorder }}
                    onClick={handleAddProduct}
                  >
                    <div
                      className="d-flex align-items-center justify-content-center p-2 rounded-0"
                      style={{ backgroundColor: "#f0fdf4", color: "#16a34a" }}
                    >
                      <i className="ri-shopping-bag-3-line fs-5" />
                    </div>
                    <div>
                      <div className="fw-semibold small" style={{ color: THEME.textHeading }}>Add Product</div>
                      <div className="text-muted" style={{ fontSize: 10 }}>Line item estimate</div>
                    </div>
                  </button>
                </Col>

                <Col xs={6}>
                  <button
                    type="button"
                    className="btn btn-light w-100 p-2 rounded-0 border text-start d-flex align-items-center gap-2"
                    style={{ borderColor: THEME.grayBorder }}
                    onClick={() => setActivityModalOpen(true)}
                  >
                    <div
                      className="d-flex align-items-center justify-content-center p-2 rounded-0"
                      style={{ backgroundColor: "#fff7ed", color: "#ea580c" }}
                    >
                      <i className="ri-calendar-event-line fs-5" />
                    </div>
                    <div>
                      <div className="fw-semibold small" style={{ color: THEME.textHeading }}>Schedule Activity</div>
                      <div className="text-muted" style={{ fontSize: 10 }}>Call or demo</div>
                    </div>
                  </button>
                </Col>

                <Col xs={6}>
                  <button
                    type="button"
                    className="btn btn-light w-100 p-2 rounded-0 border text-start d-flex align-items-center gap-2"
                    style={{ borderColor: THEME.grayBorder }}
                    onClick={() => setTaskModalOpen(true)}
                  >
                    <div
                      className="d-flex align-items-center justify-content-center p-2 rounded-0"
                      style={{ backgroundColor: "#faf5ff", color: "#9333ea" }}
                    >
                      <i className="ri-checkbox-circle-line fs-5" />
                    </div>
                    <div>
                      <div className="fw-semibold small" style={{ color: THEME.textHeading }}>Add Task</div>
                      <div className="text-muted" style={{ fontSize: 10 }}>Action item follow-up</div>
                    </div>
                  </button>
                </Col>

                <Col xs={6}>
                  <button
                    type="button"
                    className="btn btn-light w-100 p-2 rounded-0 border text-start d-flex align-items-center gap-2"
                    style={{ borderColor: THEME.grayBorder }}
                    onClick={handleOpenQuoteModal}
                  >
                    <div
                      className="d-flex align-items-center justify-content-center p-2 rounded-0"
                      style={{ backgroundColor: "#f0fdfa", color: "#0d9488" }}
                    >
                      <i className="ri-file-list-3-line fs-5" />
                    </div>
                    <div>
                      <div className="fw-semibold small" style={{ color: THEME.textHeading }}>Create Quote</div>
                      <div className="text-muted" style={{ fontSize: 10 }}>Official proposal</div>
                    </div>
                  </button>
                </Col>

                <Col xs={6}>
                  <button
                    type="button"
                    className="btn btn-light w-100 p-2 rounded-0 border text-start d-flex align-items-center gap-2"
                    style={{ borderColor: THEME.grayBorder }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div
                      className="d-flex align-items-center justify-content-center p-2 rounded-0"
                      style={{ backgroundColor: "#fdf2f8", color: "#db2777" }}
                    >
                      <i className="ri-file-upload-line fs-5" />
                    </div>
                    <div>
                      <div className="fw-semibold small" style={{ color: THEME.textHeading }}>Upload Document</div>
                      <div className="text-muted" style={{ fontSize: 10 }}>Attach files</div>
                    </div>
                  </button>
                </Col>

                <Col xs={6}>
                  <button
                    type="button"
                    className="btn btn-light w-100 p-2 rounded-0 border text-start d-flex align-items-center gap-2"
                    style={{ borderColor: THEME.grayBorder }}
                    onClick={() => {
                      notesTextareaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                      notesTextareaRef.current?.focus();
                    }}
                  >
                    <div
                      className="d-flex align-items-center justify-content-center p-2 rounded-0"
                      style={{ backgroundColor: "#fffbeb", color: "#d97706" }}
                    >
                      <i className="ri-edit-line fs-5" />
                    </div>
                    <div>
                      <div className="fw-semibold small" style={{ color: THEME.textHeading }}>Add Note</div>
                      <div className="text-muted" style={{ fontSize: 10 }}>Meeting takeaways</div>
                    </div>
                  </button>
                </Col>

                <Col xs={6}>
                  <button
                    type="button"
                    className="btn btn-light w-100 p-2 rounded-0 border text-start d-flex align-items-center gap-2"
                    style={{ borderColor: THEME.grayBorder }}
                    onClick={handleOpenEmailModal}
                  >
                    <div
                      className="d-flex align-items-center justify-content-center p-2 rounded-0"
                      style={{ backgroundColor: "#f1f5f9", color: "#475569" }}
                    >
                      <i className="ri-mail-send-line fs-5" />
                    </div>
                    <div>
                      <div className="fw-semibold small" style={{ color: THEME.textHeading }}>Send Email</div>
                      <div className="text-muted" style={{ fontSize: 10 }}>Direct outreach</div>
                    </div>
                  </button>
                </Col>
              </Row>
            </CardBody>
          </Card>

          {/* Card 3: AI Assistant (Beta) */}
          <Card className="rounded-0 border shadow-none mb-3" style={{ borderColor: THEME.grayBorder }}>
            <div
              className="px-3 py-2 border-bottom d-flex align-items-center justify-content-between"
              style={{ backgroundColor: "#f8fafc", borderColor: THEME.grayBorder }}
            >
              <div className="d-flex align-items-center">
                <i className="ri-sparkling-fill me-2" style={{ color: "#7c3aed" }} />
                <h6 className="mb-0 fw-bold" style={{ color: THEME.textHeading }}>
                  AI Assistant
                </h6>
              </div>
              <Badge color="light" className="rounded-0 text-muted border small">
                Beta
              </Badge>
            </div>
            <CardBody className="p-3">
              <div className="d-flex align-items-start gap-2 mb-2">
                <i className="ri-checkbox-circle-fill text-success mt-1" />
                <span className="small text-muted">
                  Similar opportunities in this stage usually close in <strong>18 days</strong>.
                </span>
              </div>
              <div className="d-flex align-items-start gap-2 mb-2">
                <i className="ri-checkbox-circle-fill text-success mt-1" />
                <span className="small text-muted">
                  Recommended probability for this stage is <strong>{formData.probability}%</strong>.
                </span>
              </div>
              <div className="d-flex align-items-start gap-2 mb-3">
                <i className="ri-checkbox-circle-fill text-success mt-1" />
                <span className="small text-muted">
                  Add at least one product/service line item to get accurate pipeline forecasts.
                </span>
              </div>
              <button
                type="button"
                className="btn btn-link p-0 small text-decoration-none fw-semibold"
                style={{ color: THEME.primary }}
                onClick={() => toastSuccess("Viewing more AI pipeline insights")}
              >
                View More Insights →
              </button>
            </CardBody>
          </Card>

          {/* Card 4: Reminder */}
          <Card className="rounded-0 border shadow-none mb-3" style={{ borderColor: THEME.grayBorder }}>
            <div
              className="px-3 py-2 border-bottom d-flex align-items-center justify-content-between"
              style={{ backgroundColor: "#f8fafc", borderColor: THEME.grayBorder }}
            >
              <div className="d-flex align-items-center">
                <i className="ri-notification-3-line me-2" style={{ color: THEME.primary }} />
                <h6 className="mb-0 fw-bold" style={{ color: THEME.textHeading }}>
                  Reminder
                </h6>
              </div>
              <div className="form-check form-switch mb-0">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="reminderToggle"
                  checked={formData.reminderEnabled}
                  onChange={(e) => setFormData({ ...formData, reminderEnabled: e.target.checked })}
                  style={{ cursor: "pointer", accentColor: THEME.primary }}
                />
              </div>
            </div>
            {formData.reminderEnabled && (
              <CardBody className="p-3">
                <Row className="g-2">
                  <Col xs={6}>
                    <Label className="form-label small fw-semibold mb-1">Follow-up Date</Label>
                    <Input
                      type="date"
                      className="rounded-0 form-control-sm"
                      value={formData.followupDate}
                      onChange={(e) => setFormData({ ...formData, followupDate: e.target.value })}
                    />
                  </Col>
                  <Col xs={6}>
                    <Label className="form-label small fw-semibold mb-1">Time</Label>
                    <Input
                      type="time"
                      className="rounded-0 form-control-sm"
                      value={formData.reminderTime}
                      onChange={(e) => setFormData({ ...formData, reminderTime: e.target.value })}
                    />
                  </Col>
                  <Col xs={12}>
                    <Label className="form-label small fw-semibold mb-1">Reminder Notes</Label>
                    <Input
                      type="textarea"
                      rows="2"
                      className="rounded-0 form-control-sm"
                      placeholder="Enter reminder notes..."
                      value={formData.reminderNotes}
                      onChange={(e) => setFormData({ ...formData, reminderNotes: e.target.value })}
                    />
                  </Col>
                </Row>
              </CardBody>
            )}
          </Card>
        </Col>
      </Row>

      {/* Quick Add Modal: Contact */}
      <Modal isOpen={contactModalOpen} toggle={() => setContactModalOpen(false)} centered className="rounded-0">
        <ModalHeader toggle={() => setContactModalOpen(false)} className="rounded-0 bg-light border-bottom">
          <span className="fw-bold" style={{ color: THEME.textHeading }}>Add Contact Person</span>
        </ModalHeader>
        <Form onSubmit={handleQuickAddContactSubmit}>
          <ModalBody className="p-3">
            <div className="mb-2">
              <Label className="form-label small fw-semibold mb-1">First Name <span className="text-danger">*</span></Label>
              <Input
                type="text"
                className="rounded-0 form-control-sm"
                required
                value={newContact.firstName}
                onChange={(e) => setNewContact({ ...newContact, firstName: e.target.value })}
              />
            </div>
            <div className="mb-2">
              <Label className="form-label small fw-semibold mb-1">Last Name</Label>
              <Input
                type="text"
                className="rounded-0 form-control-sm"
                value={newContact.lastName}
                onChange={(e) => setNewContact({ ...newContact, lastName: e.target.value })}
              />
            </div>
            <div className="mb-2">
              <Label className="form-label small fw-semibold mb-1">Mobile Number <span className="text-danger">*</span></Label>
              <Input
                type="text"
                className="rounded-0 form-control-sm"
                required
                value={newContact.mobile}
                onChange={(e) => setNewContact({ ...newContact, mobile: e.target.value })}
              />
            </div>
            <div className="mb-2">
              <Label className="form-label small fw-semibold mb-1">Email</Label>
              <Input
                type="email"
                className="rounded-0 form-control-sm"
                value={newContact.email}
                onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
              />
            </div>
            <div className="form-check mt-2">
              <input
                type="checkbox"
                className="form-check-input"
                id="isPrimaryContact"
                checked={newContact.isPrimary}
                onChange={(e) => setNewContact({ ...newContact, isPrimary: e.target.checked })}
              />
              <label className="form-check-label small" htmlFor="isPrimaryContact">
                Set as Primary Contact for this Account
              </label>
            </div>
          </ModalBody>
          <ModalFooter className="border-top p-2">
            <Button type="button" color="light" className="rounded-0 small" onClick={() => setContactModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="rounded-0 small text-white"
              style={{ backgroundColor: THEME.primary, borderColor: THEME.primary }}
              disabled={contactSubmitting}
            >
              {contactSubmitting ? <Spinner size="sm" /> : "Save Contact"}
            </Button>
          </ModalFooter>
        </Form>
      </Modal>

      {/* Quick Add Modal: Schedule Activity */}
      <Modal isOpen={activityModalOpen} toggle={() => setActivityModalOpen(false)} centered className="rounded-0">
        <ModalHeader toggle={() => setActivityModalOpen(false)} className="rounded-0 bg-light border-bottom">
          <span className="fw-bold" style={{ color: THEME.textHeading }}>Schedule Activity</span>
        </ModalHeader>
        <Form onSubmit={handleQuickScheduleActivitySubmit}>
          <ModalBody className="p-3">
            <div className="mb-2">
              <Label className="form-label small fw-semibold mb-1">Subject <span className="text-danger">*</span></Label>
              <Input
                type="text"
                className="rounded-0 form-control-sm"
                required
                placeholder="e.g. Discuss pricing and scope"
                value={newActivity.subject}
                onChange={(e) => setNewActivity({ ...newActivity, subject: e.target.value })}
              />
            </div>
            <Row className="g-2 mb-2">
              <Col xs={6}>
                <Label className="form-label small fw-semibold mb-1">Activity Type</Label>
                <Input
                  type="select"
                  className="rounded-0 form-control-sm"
                  value={newActivity.actType}
                  onChange={(e) => setNewActivity({ ...newActivity, actType: e.target.value })}
                >
                  <option value="CALL">Call</option>
                  <option value="MEETING">Meeting</option>
                  <option value="EMAIL">Email</option>
                  <option value="DEMO">Demo</option>
                  <option value="VISIT">Visit</option>
                </Input>
              </Col>
              <Col xs={6}>
                <Label className="form-label small fw-semibold mb-1">Date & Time</Label>
                <Input
                  type="datetime-local"
                  className="rounded-0 form-control-sm"
                  value={newActivity.startTime}
                  onChange={(e) => setNewActivity({ ...newActivity, startTime: e.target.value })}
                />
              </Col>
            </Row>
            <div className="mb-2">
              <Label className="form-label small fw-semibold mb-1">Phone Number</Label>
              <Input
                type="text"
                className="rounded-0 form-control-sm"
                placeholder="Customer contact number"
                value={newActivity.phoneNumber}
                onChange={(e) => setNewActivity({ ...newActivity, phoneNumber: e.target.value })}
              />
            </div>
            <div className="mb-2">
              <Label className="form-label small fw-semibold mb-1">Notes</Label>
              <Input
                type="textarea"
                rows="2"
                className="rounded-0 form-control-sm"
                placeholder="Call notes / agenda..."
                value={newActivity.notes}
                onChange={(e) => setNewActivity({ ...newActivity, notes: e.target.value })}
              />
            </div>
          </ModalBody>
          <ModalFooter className="border-top p-2">
            <Button type="button" color="light" className="rounded-0 small" onClick={() => setActivityModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="rounded-0 small text-white"
              style={{ backgroundColor: THEME.primary, borderColor: THEME.primary }}
              disabled={activitySubmitting}
            >
              {activitySubmitting ? <Spinner size="sm" /> : "Save Activity"}
            </Button>
          </ModalFooter>
        </Form>
      </Modal>

      {/* Quick Add Modal: Task */}
      <Modal isOpen={taskModalOpen} toggle={() => setTaskModalOpen(false)} centered className="rounded-0">
        <ModalHeader toggle={() => setTaskModalOpen(false)} className="rounded-0 bg-light border-bottom">
          <span className="fw-bold" style={{ color: THEME.textHeading }}>Add Follow-up Task</span>
        </ModalHeader>
        <Form onSubmit={handleQuickAddTaskSubmit}>
          <ModalBody className="p-3">
            <div className="mb-2">
              <Label className="form-label small fw-semibold mb-1">Task Title <span className="text-danger">*</span></Label>
              <Input
                type="text"
                className="rounded-0 form-control-sm"
                required
                placeholder="e.g. Send revised commercial proposal"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              />
            </div>
            <Row className="g-2 mb-2">
              <Col xs={6}>
                <Label className="form-label small fw-semibold mb-1">Due Date</Label>
                <Input
                  type="date"
                  className="rounded-0 form-control-sm"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                />
              </Col>
              <Col xs={6}>
                <Label className="form-label small fw-semibold mb-1">Priority</Label>
                <Input
                  type="select"
                  className="rounded-0 form-control-sm"
                  value={newTask.priority}
                  onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                >
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </Input>
              </Col>
            </Row>
            <div className="mb-2">
              <Label className="form-label small fw-semibold mb-1">Notes</Label>
              <Input
                type="textarea"
                rows="2"
                className="rounded-0 form-control-sm"
                placeholder="Action items / notes..."
                value={newTask.notes}
                onChange={(e) => setNewTask({ ...newTask, notes: e.target.value })}
              />
            </div>
          </ModalBody>
          <ModalFooter className="border-top p-2">
            <Button type="button" color="light" className="rounded-0 small" onClick={() => setTaskModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="rounded-0 small text-white"
              style={{ backgroundColor: THEME.primary, borderColor: THEME.primary }}
              disabled={taskSubmitting}
            >
              {taskSubmitting ? <Spinner size="sm" /> : "Save Task"}
            </Button>
          </ModalFooter>
        </Form>
      </Modal>

      {/* Quick Add Modal: Create Quote */}
      <Modal isOpen={quoteModalOpen} toggle={() => setQuoteModalOpen(false)} centered className="rounded-0">
        <ModalHeader toggle={() => setQuoteModalOpen(false)} className="rounded-0 bg-light border-bottom">
          <span className="fw-bold" style={{ color: THEME.textHeading }}>Prepare Draft Quotation</span>
        </ModalHeader>
        <Form onSubmit={handleQuickAddQuoteSubmit}>
          <ModalBody className="p-3">
            <Row className="g-2 mb-2">
              <Col xs={6}>
                <Label className="form-label small fw-semibold mb-1">Quote Reference</Label>
                <Input
                  type="text"
                  className="rounded-0 form-control-sm bg-light"
                  readOnly
                  value={newQuote.quoteNumber}
                />
              </Col>
              <Col xs={6}>
                <Label className="form-label small fw-semibold mb-1">Valid Until</Label>
                <Input
                  type="date"
                  className="rounded-0 form-control-sm"
                  value={newQuote.validUntil}
                  onChange={(e) => setNewQuote({ ...newQuote, validUntil: e.target.value })}
                />
              </Col>
            </Row>
            <Row className="g-2 mb-2">
              <Col xs={6}>
                <Label className="form-label small fw-semibold mb-1">Base Deal Value</Label>
                <div className="input-group input-group-sm">
                  <span className="input-group-text rounded-0 bg-light text-muted">{currencySymbol}</span>
                  <Input
                    type="text"
                    readOnly
                    className="rounded-0 bg-light"
                    value={Number(formData.amount || 0).toLocaleString()}
                  />
                </div>
              </Col>
              <Col xs={6}>
                <Label className="form-label small fw-semibold mb-1">Special Discount (%)</Label>
                <div className="input-group input-group-sm">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    className="rounded-0"
                    value={newQuote.discountPercent}
                    onChange={(e) => setNewQuote({ ...newQuote, discountPercent: e.target.value })}
                  />
                  <span className="input-group-text rounded-0 bg-light text-muted">%</span>
                </div>
              </Col>
            </Row>
            <div className="p-2 border bg-light mb-2 small text-muted">
              <strong>Quotation Net Total:</strong> {currencySymbol}{" "}
              {(Number(formData.amount || 0) * (1 - (Number(newQuote.discountPercent) || 0) / 100)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="mb-2">
              <Label className="form-label small fw-semibold mb-1">Payment & Scope Terms</Label>
              <Input
                type="textarea"
                rows="2"
                className="rounded-0 form-control-sm"
                value={newQuote.notes}
                onChange={(e) => setNewQuote({ ...newQuote, notes: e.target.value })}
              />
            </div>
          </ModalBody>
          <ModalFooter className="border-top p-2">
            <Button type="button" color="light" className="rounded-0 small" onClick={() => setQuoteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="rounded-0 small text-white"
              style={{ backgroundColor: THEME.primary, borderColor: THEME.primary }}
            >
              Generate Draft Quote
            </Button>
          </ModalFooter>
        </Form>
      </Modal>

      {/* Quick Add Modal: Send Email */}
      <Modal isOpen={emailModalOpen} toggle={() => setEmailModalOpen(false)} centered size="lg" className="rounded-0">
        <ModalHeader toggle={() => setEmailModalOpen(false)} className="rounded-0 bg-light border-bottom">
          <span className="fw-bold" style={{ color: THEME.textHeading }}>Compose Client Outreach Email</span>
        </ModalHeader>
        <Form onSubmit={handleQuickSendEmailSubmit}>
          <ModalBody className="p-3">
            <div className="mb-2">
              <Label className="form-label small fw-semibold mb-1">Recipient Email (To) <span className="text-danger">*</span></Label>
              <Input
                type="email"
                className="rounded-0 form-control-sm"
                required
                placeholder="client@example.com"
                value={emailDraft.to}
                onChange={(e) => setEmailDraft({ ...emailDraft, to: e.target.value })}
              />
            </div>
            <div className="mb-2">
              <Label className="form-label small fw-semibold mb-1">Subject <span className="text-danger">*</span></Label>
              <Input
                type="text"
                className="rounded-0 form-control-sm"
                required
                value={emailDraft.subject}
                onChange={(e) => setEmailDraft({ ...emailDraft, subject: e.target.value })}
              />
            </div>
            <div className="mb-2">
              <Label className="form-label small fw-semibold mb-1">Email Body</Label>
              <Input
                type="textarea"
                rows="6"
                className="rounded-0 form-control-sm"
                value={emailDraft.body}
                onChange={(e) => setEmailDraft({ ...emailDraft, body: e.target.value })}
              />
            </div>
          </ModalBody>
          <ModalFooter className="border-top p-2 d-flex justify-content-between">
            <Button
              type="button"
              color="light"
              className="rounded-0 small border"
              onClick={() => {
                window.open(`mailto:${emailDraft.to}?subject=${encodeURIComponent(emailDraft.subject)}&body=${encodeURIComponent(emailDraft.body)}`);
              }}
            >
              <i className="ri-external-link-line me-1" />
              Open in Mail App (Outlook)
            </Button>
            <div className="d-flex gap-2">
              <Button type="button" color="light" className="rounded-0 small" onClick={() => setEmailModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="rounded-0 small text-white"
                style={{ backgroundColor: THEME.primary, borderColor: THEME.primary }}
                disabled={emailSubmitting}
              >
                {emailSubmitting ? <Spinner size="sm" /> : "Send & Log Activity"}
              </Button>
            </div>
          </ModalFooter>
        </Form>
      </Modal>
    </div>
  );
};

export default OpportunityCreateEdit;
