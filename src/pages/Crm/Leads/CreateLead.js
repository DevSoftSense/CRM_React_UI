import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  Col,
  Container,
  Input,
  InputGroup,
  InputGroupText,
  Label,
  Row,
  Spinner,
} from "reactstrap";
import { Link, useNavigate } from "react-router-dom";
import { createLead, getLeadLookups } from "../../../helpers/crmLeadApi";
import { getOwnerDropdown } from "../../../helpers/crmOwnerApi";
import { toastApiError, toastSuccess } from "../../../helpers/crmToast";

const INDUSTRY_OPTIONS = [
  "Manufacturing",
  "Retail & Wholesale",
  "IT & Software Services",
  "Healthcare & Pharma",
  "Construction & Real Estate",
  "Banking & Financial Services",
  "Education & EdTech",
  "Automotive & Transportation",
  "Hospitality & Tourism",
  "Logistics & Supply Chain",
  "Agriculture & Food Processing",
  "Other",
];

const EMPLOYEE_COUNT_OPTIONS = [
  "1 - 10 Employees",
  "11 - 50 Employees",
  "51 - 200 Employees",
  "201 - 500 Employees",
  "500+ Employees",
];

const ANNUAL_REVENUE_OPTIONS = [
  "Under ₹1 Crore",
  "₹1 Crore - ₹5 Crore",
  "₹5 Crore - ₹25 Crore",
  "₹25 Crore - ₹100 Crore",
  "Above ₹100 Crore",
];

const PRODUCT_INTEREST_OPTIONS = [
  "ERP Software Implementation",
  "CRM Software & Pipeline",
  "Cloud POS & SuperStore",
  "Supply Chain & Inventory Management",
  "Accounting & Invoicing (SoftOnCloud Book)",
  "Custom SaaS / App Development",
  "AMC & Cloud Support Services",
];

const TERRITORY_OPTIONS = [
  "Gujarat",
  "Maharashtra",
  "Delhi NCR",
  "Karnataka",
  "Tamil Nadu",
  "North India",
  "South India",
  "West India",
  "East India",
  "International (Export)",
];

const CAMPAIGN_OPTIONS = [
  "Direct Inbound / Organic",
  "Google Ads Campaign (Q4)",
  "Trade Expo 2026",
  "Email Marketing & Newsletter",
  "Referral Program",
  "Social Media / LinkedIn Outreach",
  "WhatsApp Campaign",
];

const CURRENCY_OPTIONS = [
  { code: "INR", label: "INR - Indian Rupee (₹)" },
  { code: "USD", label: "USD - US Dollar ($)" },
  { code: "EUR", label: "EUR - Euro (€)" },
  { code: "GBP", label: "GBP - British Pound (£)" },
  { code: "AED", label: "AED - UAE Dirham (د.إ)" },
];

const emptyForm = () => ({
  leadName: "",
  companyName: "",
  designation: "",
  industry: "",
  email: "",
  mobile: "",
  phone: "",
  website: "",
  annualRevenue: "",
  employeeCount: "",
  sourceId: "",
  statusId: "",
  ratingId: "",
  ratingScore: 0,
  ownerEmployeeId: "",
  estimatedValue: "",
  currencyCode: "INR",
  expectedCloseDate: "",
  productInterest: "",
  territory: "",
  campaign: "",
  description: "",

  // Address
  billingAddress: "",
  billingCity: "",
  billingState: "",
  billingCountry: "India",
  billingPin: "",
  sameAsBilling: true,
  shippingAddress: "",
  shippingCity: "",
  shippingState: "",
  shippingCountry: "India",
  shippingPin: "",

  // Follow-up reminder
  enableReminder: false,
  reminderDate: "",
  reminderTime: "11:30",
  reminderNotes: "",
});

const CreateLead = () => {
  document.title = "Create New Lead | SoftOnCloud CRM";
  const navigate = useNavigate();

  const [form, setForm] = useState(emptyForm);
  const [lookups, setLookups] = useState({
    leadSource: [],
    leadStatus: [],
    leadRating: [],
  });
  const [ownerOptions, setOwnerOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [hoverRating, setHoverRating] = useState(0);

  // Staged Documents upload state
  const [stagedFiles, setStagedFiles] = useState([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [lu, owners] = await Promise.all([
        getLeadLookups(),
        getOwnerDropdown({ limit: 200 }),
      ]);
      const leadSource = lu?.leadSource || lu?.lead_source || [];
      const leadStatus = lu?.leadStatus || lu?.lead_status || [];
      const leadRating = lu?.leadRating || lu?.lead_rating || [];
      setLookups({ leadSource, leadStatus, leadRating });

      const ownerList = Array.isArray(owners) ? owners : owners?.items || [];
      setOwnerOptions(ownerList);

      // Default status to 'NEW' from database lookups
      const newStatus = leadStatus.find(
        (s) => String(s.masterCode || s.master_code || "").toUpperCase() === "NEW"
      );

      setForm((prev) => ({
        ...prev,
        statusId: newStatus?.masterId ? String(newStatus.masterId) : prev.statusId,
        ownerEmployeeId: ownerList.length > 0 ? String(ownerList[0].ownerId) : prev.ownerEmployeeId,
      }));
    } catch (err) {
      toastApiError(err, "Failed to load form options.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onFormChange = (key, value) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (prev.sameAsBilling) {
        if (key === "billingAddress") next.shippingAddress = value;
        if (key === "billingCity") next.shippingCity = value;
        if (key === "billingState") next.shippingState = value;
        if (key === "billingCountry") next.shippingCountry = value;
        if (key === "billingPin") next.shippingPin = value;
      }
      return next;
    });
  };

  const handleStarClick = (starValue) => {
    setForm((prev) => {
      let matchedRatingId = prev.ratingId;
      if (lookups.leadRating && lookups.leadRating.length > 0) {
        if (starValue >= 5) {
          const hot = lookups.leadRating.find((r) => (r.masterCode || "").toUpperCase() === "HOT");
          matchedRatingId = hot?.masterId ? String(hot.masterId) : prev.ratingId;
        } else if (starValue >= 4) {
          const warm = lookups.leadRating.find((r) => (r.masterCode || "").toUpperCase() === "WARM");
          matchedRatingId = warm?.masterId ? String(warm.masterId) : prev.ratingId;
        } else {
          const cold = lookups.leadRating.find((r) => (r.masterCode || "").toUpperCase() === "COLD");
          matchedRatingId = cold?.masterId ? String(cold.masterId) : prev.ratingId;
        }
      }
      return { ...prev, ratingScore: starValue, ratingId: matchedRatingId };
    });
  };

  const handleSameAsBilling = (e) => {
    const checked = e.target.checked;
    setForm((prev) => ({
      ...prev,
      sameAsBilling: checked,
      shippingAddress: checked ? prev.billingAddress : prev.shippingAddress,
      shippingCity: checked ? prev.billingCity : prev.shippingCity,
      shippingState: checked ? prev.billingState : prev.shippingState,
      shippingCountry: checked ? prev.billingCountry : prev.shippingCountry,
      shippingPin: checked ? prev.billingPin : prev.shippingPin,
    }));
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setStagedFiles((prev) => [...prev, ...files]);
      toastSuccess(`${files.length} document(s) staged.`);
    }
  };

  const handleRemoveFile = (index) => {
    setStagedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const compileDescription = () => {
    const parts = [];
    if (form.description.trim()) parts.push(form.description.trim());

    const extras = [];
    if (form.employeeCount) extras.push(`Company Size: ${form.employeeCount}`);
    if (form.annualRevenue) extras.push(`Annual Revenue: ${form.annualRevenue}`);
    if (form.productInterest) extras.push(`Product Interest: ${form.productInterest}`);
    if (form.territory) extras.push(`Territory: ${form.territory}`);
    if (form.campaign) extras.push(`Campaign: ${form.campaign}`);

    if (form.billingAddress || form.billingCity) {
      const addr = [
        form.billingAddress,
        form.billingCity,
        form.billingState,
        form.billingPin,
        form.billingCountry,
      ]
        .filter(Boolean)
        .join(", ");
      extras.push(`Billing Address: ${addr}`);
    }

    if (form.shippingAddress || form.shippingCity) {
      const sAddr = [
        form.shippingAddress,
        form.shippingCity,
        form.shippingState,
        form.shippingPin,
        form.shippingCountry,
      ]
        .filter(Boolean)
        .join(", ");
      extras.push(`Shipping Address: ${sAddr}`);
    }

    if (form.enableReminder && form.reminderDate) {
      extras.push(
        `Next Follow-up Reminder: ${form.reminderDate} ${form.reminderTime || "11:30"} (${form.reminderNotes || "Call " + form.leadName})`
      );
    }

    if (stagedFiles.length > 0) {
      extras.push(`Staged Documents: ${stagedFiles.map((f) => f.name).join(", ")}`);
    }

    if (extras.length > 0) {
      parts.push("--- Additional Info ---\n" + extras.join("\n"));
    }

    return parts.join("\n\n");
  };

  const toPayload = () => ({
    leadName: form.leadName.trim(),
    companyName: form.companyName.trim() || null,
    designation: form.designation.trim() || null,
    industry: form.industry.trim() || null,
    email: form.email.trim() || null,
    mobile: form.mobile.trim(),
    phone: form.phone.trim() || null,
    website: form.website.trim() || null,
    sourceId: form.sourceId ? Number(form.sourceId) : null,
    statusId: form.statusId ? Number(form.statusId) : null,
    ratingId: form.ratingId ? Number(form.ratingId) : null,
    estimatedValue: form.estimatedValue !== "" ? Number(form.estimatedValue) : null,
    currencyCode: form.currencyCode || "INR",
    expectedCloseDate: form.expectedCloseDate || form.reminderDate || null,
    description: compileDescription() || null,
    ownerEmployeeId: form.ownerEmployeeId ? Number(form.ownerEmployeeId) : null,
  });

  const handleSubmit = async (saveAndNew = false) => {
    setFormError("");
    if (!form.leadName.trim()) {
      setFormError("Lead Name is required.");
      return;
    }
    if (!form.mobile.trim()) {
      setFormError("Mobile number is required.");
      return;
    }
    if (!form.statusId) {
      setFormError("Lead Status is required.");
      return;
    }

    setSaving(true);
    try {
      const res = await createLead(toPayload());
      toastSuccess(`Lead "${form.leadName}" created successfully.`);

      if (saveAndNew) {
        setForm(emptyForm());
        setStagedFiles([]);
        loadData();
      } else {
        const createdId = res?.leadId || res?.lead_id;
        if (createdId) {
          navigate(`/crm/leads/${createdId}`);
        } else {
          navigate("/crm/leads");
        }
      }
    } catch (err) {
      setFormError(err?.message || "Failed to create lead.");
      toastApiError(err, "Failed to create lead.");
    } finally {
      setSaving(false);
    }
  };

  // Dynamic AI Suggestions derived strictly from live form input
  const sourceObj = (lookups.leadSource || []).find((s) => String(s.masterId) === String(form.sourceId));
  const sourceName = sourceObj?.masterName || "Website";
  const revenuePotential =
    Number(form.estimatedValue) >= 1000000
      ? "High"
      : Number(form.estimatedValue) > 0
      ? "Good"
      : "Standard";

  return (
    <div className="page-content">
      <Container fluid>
        {/* Top Header: Title, Breadcrumb & Action Buttons matching Mockup */}
        <div className="d-flex align-items-center justify-content-between mb-3 pb-1 flex-wrap gap-2">
          <div>
            <h4 className="fw-bold fs-18 mb-1 text-dark">Create New Lead</h4>
            <div className="text-muted fs-12 d-flex align-items-center gap-1">
              <span>CRM</span>
              <span className="text-muted opacity-50">&gt;</span>
              <Link to="/crm/leads" className="text-decoration-none text-muted">
                Leads
              </Link>
              <span className="text-muted opacity-50">&gt;</span>
              <span className="text-dark fw-medium">Create New Lead</span>
            </div>
          </div>

          <div className="d-flex align-items-center gap-2">
            <Button
              color="light"
              size="sm"
              className="px-3 border bg-white"
              style={{ borderRadius: "3px", fontWeight: 500, height: "34px" }}
              disabled={saving}
              onClick={() => navigate("/crm/leads")}
            >
              Cancel
            </Button>
            <Button
              color="light"
              size="sm"
              className="px-3 border bg-white text-primary fw-medium"
              style={{ borderRadius: "3px", height: "34px" }}
              disabled={saving}
              onClick={() => handleSubmit(true)}
            >
              Save &amp; New
            </Button>
            <Button
              color="primary"
              size="sm"
              className="px-3 fw-semibold d-inline-flex align-items-center"
              style={{ borderRadius: "3px", backgroundColor: "#7f1d1d", borderColor: "#7f1d1d", height: "34px" }}
              disabled={saving}
              onClick={() => handleSubmit(false)}
            >
              {saving ? <Spinner size="sm" className="me-1" /> : null}
              Save Lead
            </Button>
          </div>
        </div>

        {formError ? <Alert color="danger" className="mb-3">{formError}</Alert> : null}

        {loading ? (
          <div className="text-center py-5">
            <Spinner color="primary" /> <span className="ms-2">Loading form lookups from database…</span>
          </div>
        ) : (
          <Row className="g-3">
            {/* Left 8 Columns — Main Form Information */}
            <Col lg={8}>
              {/* Section 1: Basic Information */}
              <Card className="mb-3 border bg-white" style={{ borderRadius: "4px", borderColor: "#e2e8f0" }}>
                <CardBody className="p-4">
                  <h6 className="fw-bold text-primary fs-14 mb-3 pb-2 border-bottom">
                    Basic Information
                  </h6>
                  <Row className="g-3">
                    {/* Row 1 */}
                    <Col md={4}>
                      <Label className="form-label fs-12 fw-medium mb-1">
                        Lead Name <span className="text-danger">*</span>
                      </Label>
                      <Input
                        bsSize="sm"
                        style={{ borderRadius: "3px" }}
                        value={form.leadName}
                        onChange={(e) => onFormChange("leadName", e.target.value)}
                        placeholder="Enter lead name"
                        required
                      />
                    </Col>
                    <Col md={4}>
                      <Label className="form-label fs-12 fw-medium mb-1">
                        Lead Owner <span className="text-danger">*</span>
                      </Label>
                      <Input
                        type="select"
                        bsSize="sm"
                        style={{ borderRadius: "3px" }}
                        value={form.ownerEmployeeId}
                        onChange={(e) => onFormChange("ownerEmployeeId", e.target.value)}
                      >
                        <option value="">Select Lead Owner</option>
                        {ownerOptions.map((e) => (
                          <option key={e.ownerId} value={e.ownerId}>
                            {e.fullName}
                          </option>
                        ))}
                      </Input>
                    </Col>
                    <Col md={4}>
                      <Label className="form-label fs-12 fw-medium mb-1">
                        Lead Status <span className="text-danger">*</span>
                      </Label>
                      <Input
                        type="select"
                        bsSize="sm"
                        style={{ borderRadius: "3px" }}
                        value={form.statusId}
                        onChange={(e) => onFormChange("statusId", e.target.value)}
                      >
                        {(lookups.leadStatus || []).map((s) => (
                          <option key={s.masterId} value={s.masterId}>
                            {s.masterName}
                          </option>
                        ))}
                      </Input>
                    </Col>

                    {/* Row 2 */}
                    <Col md={4}>
                      <Label className="form-label fs-12 fw-medium mb-1">Company Name</Label>
                      <Input
                        bsSize="sm"
                        style={{ borderRadius: "3px" }}
                        value={form.companyName}
                        onChange={(e) => onFormChange("companyName", e.target.value)}
                        placeholder="Enter company name"
                      />
                    </Col>
                    <Col md={4}>
                      <Label className="form-label fs-12 fw-medium mb-1">Designation</Label>
                      <Input
                        bsSize="sm"
                        style={{ borderRadius: "3px" }}
                        value={form.designation}
                        onChange={(e) => onFormChange("designation", e.target.value)}
                        placeholder="Enter designation"
                      />
                    </Col>
                    <Col md={4}>
                      <Label className="form-label fs-12 fw-medium mb-1">Rating</Label>
                      <div className="d-flex align-items-center gap-1 pt-1">
                        {[1, 2, 3, 4, 5].map((star) => {
                          const active = (hoverRating || form.ratingScore) >= star;
                          return (
                            <i
                              key={star}
                              className={`ri-star-${active ? "fill text-warning" : "line text-muted opacity-40"} fs-18`}
                              style={{ cursor: "pointer" }}
                              onClick={() => handleStarClick(star)}
                              onMouseEnter={() => setHoverRating(star)}
                              onMouseLeave={() => setHoverRating(0)}
                              title={`Rate ${star} Star${star > 1 ? "s" : ""}`}
                            />
                          );
                        })}
                      </div>
                    </Col>

                    {/* Row 3 */}
                    <Col md={4}>
                      <Label className="form-label fs-12 fw-medium mb-1">Industry</Label>
                      <Input
                        type="select"
                        bsSize="sm"
                        style={{ borderRadius: "3px" }}
                        value={form.industry}
                        onChange={(e) => onFormChange("industry", e.target.value)}
                      >
                        <option value="">Select Industry</option>
                        {INDUSTRY_OPTIONS.map((ind) => (
                          <option key={ind} value={ind}>
                            {ind}
                          </option>
                        ))}
                      </Input>
                    </Col>
                    <Col md={4}>
                      <Label className="form-label fs-12 fw-medium mb-1">Email</Label>
                      <Input
                        type="email"
                        bsSize="sm"
                        style={{ borderRadius: "3px" }}
                        value={form.email}
                        onChange={(e) => onFormChange("email", e.target.value)}
                        placeholder="Enter email address"
                      />
                    </Col>
                    <Col md={4}>
                      <Label className="form-label fs-12 fw-medium mb-1">No. of Employees</Label>
                      <Input
                        type="select"
                        bsSize="sm"
                        style={{ borderRadius: "3px" }}
                        value={form.employeeCount}
                        onChange={(e) => onFormChange("employeeCount", e.target.value)}
                      >
                        <option value="">Select No. of Employees</option>
                        {EMPLOYEE_COUNT_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </Input>
                    </Col>

                    {/* Row 4 */}
                    <Col md={4}>
                      <Label className="form-label fs-12 fw-medium mb-1">
                        Lead Source <span className="text-danger">*</span>
                      </Label>
                      <Input
                        type="select"
                        bsSize="sm"
                        style={{ borderRadius: "3px" }}
                        value={form.sourceId}
                        onChange={(e) => onFormChange("sourceId", e.target.value)}
                      >
                        <option value="">Select Lead Source</option>
                        {(lookups.leadSource || []).map((s) => (
                          <option key={s.masterId} value={s.masterId}>
                            {s.masterName}
                          </option>
                        ))}
                      </Input>
                    </Col>
                    <Col md={4}>
                      <Label className="form-label fs-12 fw-medium mb-1">
                        Mobile <span className="text-danger">*</span>
                      </Label>
                      <InputGroup size="sm">
                        <InputGroupText className="bg-light px-2" style={{ borderRadius: "3px 0 0 3px", fontSize: "12px" }}>
                          🇮🇳 +91
                        </InputGroupText>
                        <Input
                          style={{ borderRadius: "0 3px 3px 0" }}
                          value={form.mobile}
                          onChange={(e) => onFormChange("mobile", e.target.value)}
                          placeholder="Enter mobile number"
                          required
                        />
                      </InputGroup>
                    </Col>
                    <Col md={4}>
                      <Label className="form-label fs-12 fw-medium mb-1">Annual Revenue</Label>
                      <Input
                        type="select"
                        bsSize="sm"
                        style={{ borderRadius: "3px" }}
                        value={form.annualRevenue}
                        onChange={(e) => onFormChange("annualRevenue", e.target.value)}
                      >
                        <option value="">Select Annual Revenue</option>
                        {ANNUAL_REVENUE_OPTIONS.map((rev) => (
                          <option key={rev} value={rev}>
                            {rev}
                          </option>
                        ))}
                      </Input>
                    </Col>

                    {/* Row 5 */}
                    <Col md={4}>
                      <Label className="form-label fs-12 fw-medium mb-1">Website</Label>
                      <Input
                        bsSize="sm"
                        style={{ borderRadius: "3px" }}
                        value={form.website}
                        onChange={(e) => onFormChange("website", e.target.value)}
                        placeholder="www.example.com"
                      />
                    </Col>
                    <Col md={4}>
                      <Label className="form-label fs-12 fw-medium mb-1">Phone</Label>
                      <InputGroup size="sm">
                        <InputGroupText className="bg-light px-2" style={{ borderRadius: "3px 0 0 3px", fontSize: "12px" }}>
                          🇮🇳 +91
                        </InputGroupText>
                        <Input
                          style={{ borderRadius: "0 3px 3px 0" }}
                          value={form.phone}
                          onChange={(e) => onFormChange("phone", e.target.value)}
                          placeholder="Enter phone number"
                        />
                      </InputGroup>
                    </Col>
                    <Col md={4}>
                      <Label className="form-label fs-12 fw-medium mb-1">Currency</Label>
                      <Input
                        type="select"
                        bsSize="sm"
                        style={{ borderRadius: "3px" }}
                        value={form.currencyCode}
                        onChange={(e) => onFormChange("currencyCode", e.target.value)}
                      >
                        {CURRENCY_OPTIONS.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.label}
                          </option>
                        ))}
                      </Input>
                    </Col>
                  </Row>
                </CardBody>
              </Card>

              {/* Section 2: Address Information */}
              <Card className="mb-3 border bg-white" style={{ borderRadius: "4px", borderColor: "#e2e8f0" }}>
                <CardBody className="p-4">
                  <div className="d-flex justify-content-between align-items-center pb-2 border-bottom mb-3 flex-wrap gap-2">
                    <h6 className="fw-bold text-primary fs-14 mb-0">
                      Address Information
                    </h6>
                    <div className="form-check">
                      <Input
                        type="checkbox"
                        className="form-check-input"
                        id="sameAsBilling"
                        checked={form.sameAsBilling}
                        onChange={handleSameAsBilling}
                      />
                      <Label htmlFor="sameAsBilling" className="form-check-label fs-12 text-muted">
                        Same as Billing Address
                      </Label>
                    </div>
                  </div>

                  <Row className="g-4">
                    {/* Billing Address Card */}
                    <Col md={6}>
                      <div className="p-3 border rounded bg-white" style={{ borderRadius: "4px", borderColor: "#f1f5f9" }}>
                        <div className="d-flex align-items-center gap-1 mb-2">
                          <i className="ri-map-pin-2-line text-primary fs-15" />
                          <span className="fw-bold text-dark fs-13">Billing Address</span>
                        </div>
                        <div className="mb-2">
                          <Input
                            type="textarea"
                            rows={2}
                            bsSize="sm"
                            style={{ borderRadius: "3px" }}
                            placeholder="Enter billing address"
                            value={form.billingAddress}
                            onChange={(e) => onFormChange("billingAddress", e.target.value)}
                          />
                        </div>
                        <Row className="g-2 mb-2">
                          <Col sm={6}>
                            <Label className="form-label fs-11 text-muted mb-1">City</Label>
                            <Input
                              bsSize="sm"
                              style={{ borderRadius: "3px" }}
                              placeholder="Select City"
                              value={form.billingCity}
                              onChange={(e) => onFormChange("billingCity", e.target.value)}
                            />
                          </Col>
                          <Col sm={6}>
                            <Label className="form-label fs-11 text-muted mb-1">State</Label>
                            <Input
                              bsSize="sm"
                              style={{ borderRadius: "3px" }}
                              placeholder="Select State"
                              value={form.billingState}
                              onChange={(e) => onFormChange("billingState", e.target.value)}
                            />
                          </Col>
                        </Row>
                        <Row className="g-2">
                          <Col sm={6}>
                            <Label className="form-label fs-11 text-muted mb-1">Country</Label>
                            <Input
                              type="select"
                              bsSize="sm"
                              style={{ borderRadius: "3px" }}
                              value={form.billingCountry}
                              onChange={(e) => onFormChange("billingCountry", e.target.value)}
                            >
                              <option value="India">India</option>
                              <option value="United States">United States</option>
                              <option value="United Kingdom">United Kingdom</option>
                              <option value="UAE">UAE</option>
                              <option value="Canada">Canada</option>
                              <option value="Australia">Australia</option>
                            </Input>
                          </Col>
                          <Col sm={6}>
                            <Label className="form-label fs-11 text-muted mb-1">PIN / Zip Code</Label>
                            <Input
                              bsSize="sm"
                              style={{ borderRadius: "3px" }}
                              placeholder="Enter PIN / Zip Code"
                              value={form.billingPin}
                              onChange={(e) => onFormChange("billingPin", e.target.value)}
                            />
                          </Col>
                        </Row>
                      </div>
                    </Col>

                    {/* Shipping Address Card */}
                    <Col md={6}>
                      <div className="p-3 border rounded bg-white" style={{ borderRadius: "4px", borderColor: "#f1f5f9" }}>
                        <div className="d-flex align-items-center gap-1 mb-2">
                          <i className="ri-truck-line text-info fs-15" />
                          <span className="fw-bold text-dark fs-13">Shipping Address</span>
                        </div>
                        <div className="mb-2">
                          <Input
                            type="textarea"
                            rows={2}
                            bsSize="sm"
                            style={{ borderRadius: "3px" }}
                            placeholder="Enter shipping address"
                            disabled={form.sameAsBilling}
                            value={form.sameAsBilling ? form.billingAddress : form.shippingAddress}
                            onChange={(e) => onFormChange("shippingAddress", e.target.value)}
                          />
                        </div>
                        <Row className="g-2 mb-2">
                          <Col sm={6}>
                            <Label className="form-label fs-11 text-muted mb-1">City</Label>
                            <Input
                              bsSize="sm"
                              style={{ borderRadius: "3px" }}
                              placeholder="Select City"
                              disabled={form.sameAsBilling}
                              value={form.sameAsBilling ? form.billingCity : form.shippingCity}
                              onChange={(e) => onFormChange("shippingCity", e.target.value)}
                            />
                          </Col>
                          <Col sm={6}>
                            <Label className="form-label fs-11 text-muted mb-1">State</Label>
                            <Input
                              bsSize="sm"
                              style={{ borderRadius: "3px" }}
                              placeholder="Select State"
                              disabled={form.sameAsBilling}
                              value={form.sameAsBilling ? form.billingState : form.shippingState}
                              onChange={(e) => onFormChange("shippingState", e.target.value)}
                            />
                          </Col>
                        </Row>
                        <Row className="g-2">
                          <Col sm={6}>
                            <Label className="form-label fs-11 text-muted mb-1">Country</Label>
                            <Input
                              type="select"
                              bsSize="sm"
                              style={{ borderRadius: "3px" }}
                              disabled={form.sameAsBilling}
                              value={form.sameAsBilling ? form.billingCountry : form.shippingCountry}
                              onChange={(e) => onFormChange("shippingCountry", e.target.value)}
                            >
                              <option value="India">India</option>
                              <option value="United States">United States</option>
                              <option value="United Kingdom">United Kingdom</option>
                              <option value="UAE">UAE</option>
                              <option value="Canada">Canada</option>
                              <option value="Australia">Australia</option>
                            </Input>
                          </Col>
                          <Col sm={6}>
                            <Label className="form-label fs-11 text-muted mb-1">PIN / Zip Code</Label>
                            <Input
                              bsSize="sm"
                              style={{ borderRadius: "3px" }}
                              placeholder="Enter PIN / Zip Code"
                              disabled={form.sameAsBilling}
                              value={form.sameAsBilling ? form.billingPin : form.shippingPin}
                              onChange={(e) => onFormChange("shippingPin", e.target.value)}
                            />
                          </Col>
                        </Row>
                      </div>
                    </Col>
                  </Row>
                </CardBody>
              </Card>

              {/* Section 3: Additional Information */}
              <Card className="mb-3 border bg-white" style={{ borderRadius: "4px", borderColor: "#e2e8f0" }}>
                <CardBody className="p-4">
                  <h6 className="fw-bold text-primary fs-14 mb-3 pb-2 border-bottom">
                    Additional Information
                  </h6>
                  <Row className="g-3">
                    {/* Row 1 */}
                    <Col md={4}>
                      <Label className="form-label fs-12 fw-medium mb-1">Product Interest</Label>
                      <Input
                        type="select"
                        bsSize="sm"
                        style={{ borderRadius: "3px" }}
                        value={form.productInterest}
                        onChange={(e) => onFormChange("productInterest", e.target.value)}
                      >
                        <option value="">Select Product Interest</option>
                        {PRODUCT_INTEREST_OPTIONS.map((prod) => (
                          <option key={prod} value={prod}>
                            {prod}
                          </option>
                        ))}
                      </Input>
                    </Col>
                    <Col md={4}>
                      <Label className="form-label fs-12 fw-medium mb-1">Estimated Value</Label>
                      <InputGroup size="sm">
                        <InputGroupText className="bg-light" style={{ borderRadius: "3px 0 0 3px" }}>
                          ₹
                        </InputGroupText>
                        <Input
                          type="number"
                          style={{ borderRadius: "0 3px 3px 0" }}
                          value={form.estimatedValue}
                          onChange={(e) => onFormChange("estimatedValue", e.target.value)}
                          placeholder="Enter estimated value"
                        />
                      </InputGroup>
                    </Col>
                    <Col md={4}>
                      <Label className="form-label fs-12 fw-medium mb-1">Expected Close Date</Label>
                      <Input
                        type="date"
                        bsSize="sm"
                        style={{ borderRadius: "3px" }}
                        value={form.expectedCloseDate}
                        onChange={(e) => onFormChange("expectedCloseDate", e.target.value)}
                      />
                    </Col>

                    {/* Row 2 */}
                    <Col md={4}>
                      <Label className="form-label fs-12 fw-medium mb-1">Description / Notes</Label>
                      <Input
                        type="textarea"
                        rows={2}
                        bsSize="sm"
                        style={{ borderRadius: "3px" }}
                        value={form.description}
                        onChange={(e) => onFormChange("description", e.target.value)}
                        placeholder="Enter description or notes"
                      />
                    </Col>
                    <Col md={4}>
                      <Label className="form-label fs-12 fw-medium mb-1">Territory</Label>
                      <Input
                        type="select"
                        bsSize="sm"
                        style={{ borderRadius: "3px" }}
                        value={form.territory}
                        onChange={(e) => onFormChange("territory", e.target.value)}
                      >
                        <option value="">Select Territory</option>
                        {TERRITORY_OPTIONS.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </Input>
                    </Col>
                    <Col md={4}>
                      <Label className="form-label fs-12 fw-medium mb-1">Campaign</Label>
                      <Input
                        type="select"
                        bsSize="sm"
                        style={{ borderRadius: "3px" }}
                        value={form.campaign}
                        onChange={(e) => onFormChange("campaign", e.target.value)}
                      >
                        <option value="">Select Campaign</option>
                        {CAMPAIGN_OPTIONS.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </Input>
                    </Col>
                  </Row>

                  <div className="mt-3 text-muted fs-11">
                    <span className="text-danger">*</span> Required Fields
                  </div>
                </CardBody>
              </Card>
            </Col>

            {/* Right 4 Columns — Quick Add, AI Assistant, Uploads & Reminder */}
            <Col lg={4}>
              {/* Card 1: Quick Add Shortcuts matching Mockup */}
              <Card className="mb-3 border bg-white" style={{ borderRadius: "4px", borderColor: "#e2e8f0" }}>
                <CardBody className="p-3">
                  <h6 className="fw-bold text-dark fs-13 mb-3">Quick Add</h6>
                  {/* Row 1: 4 Quick Actions */}
                  <Row className="g-2 mb-2 text-center">
                    <Col xs={3}>
                      <div
                        role="button"
                        className="p-2 border rounded bg-light hover-shadow d-flex flex-column align-items-center justify-content-center"
                        style={{ minHeight: "68px", borderRadius: "3px", cursor: "pointer" }}
                        onClick={() => navigate("/crm/contacts")}
                        title="Add Contact"
                      >
                        <i className="ri-user-add-line fs-18 text-primary mb-1" />
                        <span className="fs-10 fw-medium text-dark text-nowrap">Add Contact</span>
                      </div>
                    </Col>
                    <Col xs={3}>
                      <div
                        role="button"
                        className="p-2 border rounded bg-light hover-shadow d-flex flex-column align-items-center justify-content-center"
                        style={{ minHeight: "68px", borderRadius: "3px", cursor: "pointer" }}
                        onClick={() => navigate("/crm/activities")}
                        title="Add Activity"
                      >
                        <i className="ri-calendar-event-line fs-18 text-success mb-1" />
                        <span className="fs-10 fw-medium text-dark text-nowrap">Add Activity</span>
                      </div>
                    </Col>
                    <Col xs={3}>
                      <div
                        role="button"
                        className="p-2 border rounded bg-light hover-shadow d-flex flex-column align-items-center justify-content-center"
                        style={{ minHeight: "68px", borderRadius: "3px", cursor: "pointer" }}
                        onClick={() => navigate("/crm/calendar")}
                        title="Schedule Meeting"
                      >
                        <i className="ri-calendar-line fs-18 text-info mb-1" />
                        <span className="fs-10 fw-medium text-dark text-nowrap">Schedule Meeting</span>
                      </div>
                    </Col>
                    <Col xs={3}>
                      <div
                        role="button"
                        className="p-2 border rounded bg-light hover-shadow d-flex flex-column align-items-center justify-content-center"
                        style={{ minHeight: "68px", borderRadius: "3px", cursor: "pointer" }}
                        onClick={() => navigate("/crm/tasks")}
                        title="Add Task"
                      >
                        <i className="ri-checkbox-circle-line fs-18 text-warning mb-1" />
                        <span className="fs-10 fw-medium text-dark text-nowrap">Add Task</span>
                      </div>
                    </Col>
                  </Row>

                  {/* Row 2: 3 Quick Actions */}
                  <Row className="g-2 text-center">
                    <Col xs={4}>
                      <div
                        role="button"
                        className="p-2 border rounded bg-light hover-shadow d-flex flex-column align-items-center justify-content-center"
                        style={{ minHeight: "68px", borderRadius: "3px", cursor: "pointer" }}
                        onClick={() => navigate("/crm/opportunities")}
                        title="Create Quote"
                      >
                        <i className="ri-file-text-line fs-18 text-primary mb-1" />
                        <span className="fs-10 fw-medium text-dark text-nowrap">Create Quote</span>
                      </div>
                    </Col>
                    <Col xs={4}>
                      <div
                        role="button"
                        className="p-2 border rounded bg-light hover-shadow d-flex flex-column align-items-center justify-content-center"
                        style={{ minHeight: "68px", borderRadius: "3px", cursor: "pointer" }}
                        onClick={() => navigate("/crm/opportunities")}
                        title="Create Opportunity"
                      >
                        <i className="ri-shake-hands-line fs-18 text-warning mb-1" />
                        <span className="fs-10 fw-medium text-dark text-nowrap">Create Opportunity</span>
                      </div>
                    </Col>
                    <Col xs={4}>
                      <div
                        role="button"
                        className="p-2 border rounded bg-light hover-shadow d-flex flex-column align-items-center justify-content-center"
                        style={{ minHeight: "68px", borderRadius: "3px", cursor: "pointer" }}
                        onClick={() => document.getElementById("documentUploadInput")?.click()}
                        title="Upload Document"
                      >
                        <i className="ri-upload-cloud-2-line fs-18 text-info mb-1" />
                        <span className="fs-10 fw-medium text-dark text-nowrap">Upload Document</span>
                      </div>
                    </Col>
                  </Row>
                </CardBody>
              </Card>

              {/* Card 2: AI Assistant (Beta) matching Mockup */}
              <Card className="mb-3 border bg-white" style={{ borderRadius: "4px", borderColor: "#e2e8f0" }}>
                <CardBody className="p-3">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <div className="d-flex align-items-center gap-1">
                      <i className="ri-sparkling-fill text-primary fs-15" />
                      <span className="fw-bold text-dark fs-13">AI Assistant</span>
                      <Badge color="primary" className="ms-1 px-1" style={{ fontSize: "9px" }}>
                        Beta
                      </Badge>
                    </div>
                  </div>
                  <p className="text-muted fs-11 mb-2">
                    AI suggestions based on lead information
                  </p>

                  <div className="d-flex flex-column gap-2 p-2 bg-light rounded" style={{ borderRadius: "3px" }}>
                    <div className="d-flex align-items-start gap-2 fs-11 text-dark">
                      <i className={`ri-${form.sourceId ? "checkbox-circle-fill text-success" : "information-line text-muted"} fs-13 mt-0 flex-shrink-0`} />
                      <span>
                        {form.sourceId ? (
                          <>
                            This lead from <strong className="text-primary">{sourceName}</strong> has high conversion rate.
                          </>
                        ) : (
                          "Select a lead source to evaluate conversion likelihood."
                        )}
                      </span>
                    </div>
                    <div className="d-flex align-items-start gap-2 fs-11 text-dark">
                      <i className={`ri-${form.industry ? "checkbox-circle-fill text-success" : "information-line text-muted"} fs-13 mt-0 flex-shrink-0`} />
                      <span>
                        {form.industry ? (
                          <>
                            Company is from <strong className="text-dark">{form.industry}</strong> industry.
                          </>
                        ) : (
                          "Select company industry to profile business sector."
                        )}
                      </span>
                    </div>
                    <div className="d-flex align-items-start gap-2 fs-11 text-dark">
                      <i className={`ri-${form.estimatedValue ? "checkbox-circle-fill text-success" : "information-line text-muted"} fs-13 mt-0 flex-shrink-0`} />
                      <span>
                        {form.estimatedValue ? (
                          <>
                            Revenue potential looks <strong className="text-success">{revenuePotential}</strong> (₹{Number(form.estimatedValue).toLocaleString("en-IN")}).
                          </>
                        ) : (
                          "Enter estimated value to score deal potential."
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 text-end">
                    <span
                      role="button"
                      className="text-primary fs-11 fw-semibold text-decoration-none"
                      onClick={() => toastSuccess("AI relationship model synced with lead criteria.")}
                    >
                      Get More Insights &gt;
                    </span>
                  </div>
                </CardBody>
              </Card>

              {/* Card 3: Upload Documents Dropzone matching Mockup */}
              <Card className="mb-3 border bg-white" style={{ borderRadius: "4px", borderColor: "#e2e8f0" }}>
                <CardBody className="p-3">
                  <h6 className="fw-bold text-dark fs-13 mb-2">Upload Documents</h6>
                  <div
                    role="button"
                    tabIndex={0}
                    className="p-3 text-center border border-dashed bg-light d-block mb-2 cursor-pointer"
                    style={{ borderRadius: "4px", borderColor: "#cbd5e1" }}
                    onClick={() => document.getElementById("documentUploadInput")?.click()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        document.getElementById("documentUploadInput")?.click();
                      }
                    }}
                  >
                    <i className="ri-upload-cloud-2-line fs-26 text-primary d-block mb-1" />
                    <span className="fs-12 fw-medium text-dark d-block">
                      Drag &amp; drop files here
                    </span>
                    <span className="fs-11 text-muted d-block my-1">or</span>
                    <Button
                      color="light"
                      size="sm"
                      className="px-3 border bg-white fs-11"
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        document.getElementById("documentUploadInput")?.click();
                      }}
                    >
                      Choose Files
                    </Button>
                    <input
                      id="documentUploadInput"
                      type="file"
                      multiple
                      className="d-none"
                      onChange={handleFileChange}
                    />
                  </div>
                  <small className="text-muted fs-10 d-block text-center">
                    Allowed: PDF, DOC, DOCX, JPG, PNG (Max 5MB)
                  </small>

                  {/* Staged files list */}
                  {stagedFiles.length > 0 && (
                    <div className="mt-2 d-flex flex-column gap-1">
                      {stagedFiles.map((file, idx) => (
                        <div
                          key={file.name + idx}
                          className="d-flex align-items-center justify-content-between p-1 px-2 border rounded bg-white fs-11"
                        >
                          <span className="text-truncate" style={{ maxWidth: "200px" }}>
                            <i className="ri-file-text-line text-primary me-1" />
                            {file.name}
                          </span>
                          <i
                            className="ri-close-line text-danger cursor-pointer fs-13"
                            onClick={() => handleRemoveFile(idx)}
                            title="Remove file"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </CardBody>
              </Card>

              {/* Card 4: Follow-up Reminder matching Mockup */}
              <Card className="mb-0 border bg-white" style={{ borderRadius: "4px", borderColor: "#e2e8f0" }}>
                <CardBody className="p-3">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="fw-bold text-dark fs-13 mb-0">Follow-up Reminder</h6>
                    <div className="form-check form-switch mb-0">
                      <Input
                        type="switch"
                        id="reminderSwitch"
                        checked={form.enableReminder}
                        onChange={(e) => onFormChange("enableReminder", e.target.checked)}
                      />
                    </div>
                  </div>

                  {form.enableReminder ? (
                    <div className="d-flex flex-column gap-2">
                      <Row className="g-2">
                        <Col xs={7}>
                          <Label className="form-label fs-11 text-muted mb-1">Follow-up Date</Label>
                          <Input
                            type="date"
                            bsSize="sm"
                            style={{ borderRadius: "3px" }}
                            value={form.reminderDate}
                            onChange={(e) => onFormChange("reminderDate", e.target.value)}
                          />
                        </Col>
                        <Col xs={5}>
                          <Label className="form-label fs-11 text-muted mb-1">Time</Label>
                          <Input
                            type="time"
                            bsSize="sm"
                            style={{ borderRadius: "3px" }}
                            value={form.reminderTime}
                            onChange={(e) => onFormChange("reminderTime", e.target.value)}
                          />
                        </Col>
                      </Row>

                      <div>
                        <Label className="form-label fs-11 text-muted mb-1">Reminder Notes</Label>
                        <Input
                          type="textarea"
                          rows={2}
                          bsSize="sm"
                          style={{ borderRadius: "3px" }}
                          placeholder="Enter reminder notes"
                          value={form.reminderNotes}
                          onChange={(e) => onFormChange("reminderNotes", e.target.value)}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-muted fs-11 text-center py-2">
                      Follow-up reminder is turned off.
                    </div>
                  )}
                </CardBody>
              </Card>
            </Col>
          </Row>
        )}
      </Container>
    </div>
  );
};

export default CreateLead;
