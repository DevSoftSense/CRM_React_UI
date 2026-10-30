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
} from "reactstrap";
import { Link } from "react-router-dom";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import PageHeader from "../components/PageHeader";
import {
  getOpportunityPipeline,
  moveOpportunityStage,
  createOpportunity,
  getOpportunityLookups,
} from "../../../helpers/crmOpportunityApi";
import { getCustomerDropdown } from "../../../helpers/crmCustomerApi";
import { getOwnerDropdown } from "../../../helpers/crmOwnerApi";
import { toastApiError, toastSuccess } from "../../../helpers/crmToast";

// Primary Theme Colors (SoftOnCloud Maroon)
const THEME = {
  primary: "#7f1d1d",
  primaryHover: "#991b1b",
  lightBg: "#fef2f2",
  borderTint: "#fee2e2",
  textMuted: "#64748b",
};

// Format currency as Indian Rupee (e.g. ₹ 1,25,00,000)
const formatInr = (val) => {
  if (val == null || isNaN(val)) return "₹ 0";
  const num = Number(val);
  return `₹ ${num.toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;
};

// Format short date (e.g. 20 May 2026)
const formatCloseDate = (dateStr) => {
  if (!dateStr) return "";
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

// Avatar initials from owner full name
const getInitials = (name) => {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// Stage accent colors matching SoftOnCloud theme palette
const STAGE_THEMES = {
  PROSPECTING: {
    accentColor: "#64748b", // Slate Gray
    lightBg: "#f8fafc",
    badgeBg: "rgba(100, 116, 139, 0.12)",
    badgeText: "#475569",
    defaultProb: 10,
  },
  QUALIFIED: {
    accentColor: "#7f1d1d", // SoftOnCloud Primary Maroon
    lightBg: "#fef2f2",
    badgeBg: "rgba(127, 29, 29, 0.12)",
    badgeText: "#7f1d1d",
    defaultProb: 30,
  },
  PROPOSAL: {
    accentColor: "#d97706", // Warm Amber
    lightBg: "#fffbeb",
    badgeBg: "rgba(217, 119, 6, 0.12)",
    badgeText: "#b45309",
    defaultProb: 60,
  },
  NEGOTIATION: {
    accentColor: "#9333ea", // Rich Purple
    lightBg: "#faf5ff",
    badgeBg: "rgba(147, 51, 234, 0.12)",
    badgeText: "#7e22ce",
    defaultProb: 80,
  },
  CLOSED_WON: {
    accentColor: "#16a34a", // Success Emerald Green
    lightBg: "#f0fdf4",
    badgeBg: "rgba(22, 163, 74, 0.12)",
    badgeText: "#15803d",
    defaultProb: 100,
  },
  CLOSED_LOST: {
    accentColor: "#dc2626", // Crimson Muted Red
    lightBg: "#fef2f2",
    badgeBg: "rgba(220, 38, 38, 0.12)",
    badgeText: "#b91c1c",
    defaultProb: 0,
  },
};

const getStageTheme = (code) => {
  const norm = String(code || "").toUpperCase();
  return (
    STAGE_THEMES[norm] || {
      accentColor: "#64748b",
      lightBg: "#f8fafc",
      badgeBg: "rgba(100, 116, 139, 0.12)",
      badgeText: "#475569",
      defaultProb: 10,
    }
  );
};

const Pipeline = () => {
  document.title = "Sales Pipeline | SoftOnCloud CRM";

  // Board Data
  const [stages, setStages] = useState([]);
  const [serverSummary, setServerSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [moving, setMoving] = useState(false);

  // Filters (100% Dynamic)
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [selectedOwner, setSelectedOwner] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [activeDatePreset, setActiveDatePreset] = useState("all");

  // Dropdowns data (Dynamically loaded from database)
  const [ownersList, setOwnersList] = useState([]);
  const [customersList, setCustomersList] = useState([]);
  const [lookupStages, setLookupStages] = useState([]);

  // Quick Create Opportunity Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createStageTarget, setCreateStageTarget] = useState(null);
  const [createForm, setCreateForm] = useState({
    name: "",
    accountId: "",
    amount: "",
    probability: "10",
    expectedCloseDate: "",
    ownerEmployeeId: "",
    stageId: "",
  });

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Load Owners & Customers dynamically from database
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
      })
      .catch(() => setLookupStages([]));
  }, []);

  // Fetch Pipeline Board Dynamically
  const loadBoard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getOpportunityPipeline({
        search: search || undefined,
        ownerEmployeeId: selectedOwner ? Number(selectedOwner) : undefined,
        fromDate: filterStartDate || undefined,
        toDate: filterEndDate || undefined,
      });

      const list = data?.stages || data?.Stages || [];
      const summary = data?.summary || data?.Summary || null;

      setServerSummary(summary);
      setStages(
        list.map((s) => ({
          ...s,
          stageId: s.stageId ?? s.stage_id,
          stageCode: s.stageCode ?? s.stage_code,
          stageName: s.stageName ?? s.stage_name,
          sortOrder: s.sortOrder ?? s.sort_order,
          totalCount: s.totalCount ?? s.total_count,
          totalAmount: s.totalAmount ?? s.total_amount,
          percentage: s.percentage,
          opportunities: (s.opportunities || s.Opportunities || []).map((card) => ({
            ...card,
            opportunityId: card.opportunityId ?? card.opportunity_id,
            name: card.name,
            accountId: card.accountId ?? card.account_id,
            accountName: card.accountName ?? card.account_name,
            amount: card.amount,
            currencyCode: card.currencyCode ?? card.currency_code ?? "INR",
            probability: card.probability,
            expectedCloseDate: card.expectedCloseDate ?? card.expected_close_date,
            ownerEmployeeId: card.ownerEmployeeId ?? card.owner_employee_id,
            ownerName: card.ownerName ?? card.owner_name,
            priorityId: card.priorityId ?? card.priority_id,
            priorityName: card.priorityName ?? card.priority_name,
            stageCode: card.stageCode ?? card.stage_code ?? s.stageCode ?? s.stage_code,
          })),
        }))
      );
    } catch (err) {
      setStages([]);
      const msg = err?.message || "Failed to load pipeline.";
      setError(msg);
      toastApiError(err, msg);
    } finally {
      setLoading(false);
    }
  }, [search, selectedOwner, filterStartDate, filterEndDate]);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  // Dynamic Metrics Calculation (100% computed from real data)
  const computedStats = useMemo(() => {
    let totalOpps = 0;
    let totalVal = 0;
    let weightedVal = 0;
    let probSum = 0;
    let probCount = 0;
    let wonCount = 0;
    let wonAmount = 0;
    let lostCount = 0;
    let lostAmount = 0;

    stages.forEach((st) => {
      const isWon = String(st.stageCode).toUpperCase() === "CLOSED_WON";
      const isLost = String(st.stageCode).toUpperCase() === "CLOSED_LOST";
      const opps = st.opportunities || [];

      opps.forEach((o) => {
        totalOpps += 1;
        const amt = Number(o.amount) || 0;
        const prob = Number(o.probability) || 0;
        totalVal += amt;
        weightedVal += (amt * prob) / 100.0;
        probSum += prob;
        probCount += 1;

        if (isWon) {
          wonCount += 1;
          wonAmount += amt;
        } else if (isLost) {
          lostCount += 1;
          lostAmount += amt;
        }
      });
    });

    const avgProb = probCount > 0 ? Math.round(probSum / probCount) : 0;

    return {
      totalOpportunities: serverSummary?.totalOpportunities ?? totalOpps,
      totalPipelineValue: serverSummary?.totalPipelineValue ?? totalVal,
      weightedValue: serverSummary?.weightedValue ?? weightedVal,
      weightedPipelineValue: serverSummary?.weightedValue ?? weightedVal,
      avgWinProbability: serverSummary?.avgWinProbability ?? avgProb,
      wonCount: serverSummary?.wonCount ?? wonCount,
      wonAmount: serverSummary?.wonAmount ?? wonAmount,
      lostCount: serverSummary?.lostCount ?? lostCount,
      lostAmount: serverSummary?.lostAmount ?? lostAmount,
    };
  }, [stages, serverSummary]);

  // Date Preset Helpers (Dynamic dates, never hardcoded)
  const applyDatePreset = (preset) => {
    setActiveDatePreset(preset);
    const now = new Date();

    if (preset === "all") {
      setFilterStartDate("");
      setFilterEndDate("");
    } else if (preset === "thisMonth") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setFilterStartDate(start.toISOString().slice(0, 10));
      setFilterEndDate(end.toISOString().slice(0, 10));
    } else if (preset === "last30") {
      const start = new Date();
      start.setDate(now.getDate() - 30);
      setFilterStartDate(start.toISOString().slice(0, 10));
      setFilterEndDate(now.toISOString().slice(0, 10));
    } else if (preset === "thisQuarter") {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const start = new Date(now.getFullYear(), currentQuarter * 3, 1);
      const end = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0);
      setFilterStartDate(start.toISOString().slice(0, 10));
      setFilterEndDate(end.toISOString().slice(0, 10));
    }
  };

  // Drag and Drop Card Movement
  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const opportunityId = Number(draggableId);
    const toStageId = Number(destination.droppableId);
    if (!opportunityId || !toStageId) return;

    // Snapshot previous state for rollback
    const prev = stages.map((s) => ({
      ...s,
      opportunities: [...(s.opportunities || [])],
    }));

    // Optimistic UI update
    const next = prev.map((s) => ({
      ...s,
      opportunities: [...(s.opportunities || [])],
    }));
    const fromCol = next.find((s) => String(s.stageId) === String(source.droppableId));
    const toCol = next.find((s) => String(s.stageId) === String(destination.droppableId));
    if (!fromCol || !toCol) return;

    const [moved] = fromCol.opportunities.splice(source.index, 1);
    if (!moved) return;

    // Update target card stage code
    moved.stageCode = toCol.stageCode;
    toCol.opportunities.splice(destination.index, 0, moved);
    setStages(next);

    setMoving(true);
    try {
      await moveOpportunityStage(opportunityId, toStageId);
      toastSuccess(`Moved to ${toCol.stageName}`);
      await loadBoard();
    } catch (err) {
      setStages(prev);
      toastApiError(err, "Failed to move opportunity.");
    } finally {
      setMoving(false);
    }
  };

  // Open Quick Create Modal
  const openQuickCreate = (stage = null) => {
    const targetStageId = stage?.stageId || lookupStages[0]?.masterId || "";
    const theme = getStageTheme(stage?.stageCode);
    setCreateStageTarget(stage);
    setCreateForm({
      name: "",
      accountId: customersList[0]?.accountId ? String(customersList[0].accountId) : "",
      amount: "",
      probability: String(theme.defaultProb || 10),
      expectedCloseDate: new Date().toISOString().slice(0, 10),
      ownerEmployeeId: selectedOwner || (ownersList[0]?.ownerId ? String(ownersList[0].ownerId) : ""),
      stageId: String(targetStageId),
    });
    setCreateModalOpen(true);
  };

  // Submit Quick Create Opportunity
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.name.trim()) {
      toastApiError(null, "Please enter an opportunity name.");
      return;
    }
    if (!createForm.accountId) {
      toastApiError(null, "Please select a customer account.");
      return;
    }

    setCreateSubmitting(true);
    try {
      await createOpportunity({
        name: createForm.name.trim(),
        accountId: Number(createForm.accountId),
        amount: createForm.amount ? Number(createForm.amount) : 0,
        probability: createForm.probability ? Number(createForm.probability) : 10,
        expectedCloseDate: createForm.expectedCloseDate || null,
        ownerEmployeeId: createForm.ownerEmployeeId ? Number(createForm.ownerEmployeeId) : null,
        stageId: createForm.stageId ? Number(createForm.stageId) : undefined,
      });

      toastSuccess("Opportunity created successfully.");
      setCreateModalOpen(false);
      await loadBoard();
    } catch (err) {
      toastApiError(err, "Failed to create opportunity.");
    } finally {
      setCreateSubmitting(false);
    }
  };

  return (
    <div className="page-content" style={{ backgroundColor: "#f8fafc", minHeight: "100vh" }}>
      <Container fluid className="px-4">
        {/* Top Header Section */}
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4 pt-2">
          <div>
            <h4 className="fw-bold text-dark mb-0 fs-20">Sales Pipeline</h4>
            <p className="text-muted fs-13 mb-0 mt-1">
              Drag and drop opportunities across stages to update pipeline.
            </p>
          </div>

          {/* Right Action Controls matching SoftOnCloud theme */}
          <div className="d-flex flex-wrap align-items-center gap-2">
            {/* Search Input */}
            <div className="search-box position-relative" style={{ minWidth: 200 }}>
              <Input
                type="text"
                className="form-control form-control-sm bg-white"
                placeholder="Search pipeline…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                style={{ borderRadius: 0, paddingLeft: "32px", fontSize: "13px" }}
              />
              <i
                className="ri-search-line position-absolute text-muted"
                style={{ left: 10, top: "50%", transform: "translateY(-50%)", fontSize: "14px" }}
              />
            </div>

            {/* + New Opportunity Button (SoftOnCloud Theme Maroon) */}
            <Button
              color="danger"
              size="sm"
              className="d-flex align-items-center gap-1 fw-medium"
              onClick={() => openQuickCreate(null)}
              style={{
                backgroundColor: THEME.primary,
                borderColor: THEME.primary,
                borderRadius: 0,
                padding: "6px 14px",
                fontSize: "13px",
              }}
            >
              <i className="ri-add-line fs-14" /> New Opportunity
            </Button>

            {/* Filters Toggle Button (Themed) */}
            <Button
              size="sm"
              className={`d-flex align-items-center gap-1 border ${
                showFilters ? "text-white" : "text-dark"
              }`}
              onClick={() => setShowFilters((v) => !v)}
              style={{
                backgroundColor: showFilters ? THEME.primary : "#ffffff",
                borderColor: showFilters ? THEME.primary : "#e2e8f0",
                borderRadius: 0,
                padding: "6px 12px",
                fontSize: "13px",
              }}
            >
              <i className={`ri-filter-3-line fs-14 ${showFilters ? "text-white" : "text-muted"}`} /> Filters
            </Button>

            {/* All Teams / Owner Dropdown (Dynamically Loaded) */}
            <div style={{ minWidth: 160 }}>
              <Input
                type="select"
                bsSize="sm"
                className="form-select form-select-sm bg-white border"
                value={selectedOwner}
                onChange={(e) => setSelectedOwner(e.target.value)}
                style={{ borderRadius: 0, fontSize: "13px", cursor: "pointer" }}
              >
                <option value="">All Teams / Owners</option>
                {ownersList.map((o) => (
                  <option key={o.ownerId} value={o.ownerId}>
                    {o.fullName}
                  </option>
                ))}
              </Input>
            </div>

            {/* Opportunities List View Link */}
            <Link
              to="/crm/opportunities"
              className="btn btn-sm btn-white border d-flex align-items-center gap-1"
              style={{ borderRadius: 0, padding: "6px 12px", fontSize: "13px", backgroundColor: "#fff" }}
              title="Switch to List View"
            >
              <i className="ri-list-check fs-14 text-muted" /> List View
            </Link>
          </div>
        </div>

        {/* Collapsible Dynamic Date Range Filter Strip */}
        {showFilters && (
          <Card className="border shadow-none mb-4" style={{ borderRadius: 0, backgroundColor: "#ffffff" }}>
            <CardBody className="py-2 px-3">
              <Row className="g-2 align-items-center">
                <Col md={3}>
                  <div className="d-flex align-items-center gap-2">
                    <span className="text-muted fs-12 fw-semibold text-nowrap">Close Date From:</span>
                    <Input
                      type="date"
                      bsSize="sm"
                      value={filterStartDate}
                      onChange={(e) => {
                        setFilterStartDate(e.target.value);
                        setActiveDatePreset("custom");
                      }}
                      style={{ borderRadius: 0, fontSize: "12px" }}
                    />
                  </div>
                </Col>
                <Col md={3}>
                  <div className="d-flex align-items-center gap-2">
                    <span className="text-muted fs-12 fw-semibold text-nowrap">To:</span>
                    <Input
                      type="date"
                      bsSize="sm"
                      value={filterEndDate}
                      onChange={(e) => {
                        setFilterEndDate(e.target.value);
                        setActiveDatePreset("custom");
                      }}
                      style={{ borderRadius: 0, fontSize: "12px" }}
                    />
                  </div>
                </Col>
                <Col md={6} className="d-flex flex-wrap justify-content-md-end align-items-center gap-2">
                  {/* Preset Pills */}
                  <div className="btn-group btn-group-sm" role="group">
                    <button
                      type="button"
                      className={`btn btn-sm ${activeDatePreset === "all" ? "text-white" : "btn-light border"}`}
                      onClick={() => applyDatePreset("all")}
                      style={{
                        backgroundColor: activeDatePreset === "all" ? THEME.primary : "#f8fafc",
                        borderColor: activeDatePreset === "all" ? THEME.primary : "#e2e8f0",
                        borderRadius: 0,
                        fontSize: "11px",
                      }}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${activeDatePreset === "thisMonth" ? "text-white" : "btn-light border"}`}
                      onClick={() => applyDatePreset("thisMonth")}
                      style={{
                        backgroundColor: activeDatePreset === "thisMonth" ? THEME.primary : "#f8fafc",
                        borderColor: activeDatePreset === "thisMonth" ? THEME.primary : "#e2e8f0",
                        borderRadius: 0,
                        fontSize: "11px",
                      }}
                    >
                      This Month
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${activeDatePreset === "last30" ? "text-white" : "btn-light border"}`}
                      onClick={() => applyDatePreset("last30")}
                      style={{
                        backgroundColor: activeDatePreset === "last30" ? THEME.primary : "#f8fafc",
                        borderColor: activeDatePreset === "last30" ? THEME.primary : "#e2e8f0",
                        borderRadius: 0,
                        fontSize: "11px",
                      }}
                    >
                      Last 30 Days
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${activeDatePreset === "thisQuarter" ? "text-white" : "btn-light border"}`}
                      onClick={() => applyDatePreset("thisQuarter")}
                      style={{
                        backgroundColor: activeDatePreset === "thisQuarter" ? THEME.primary : "#f8fafc",
                        borderColor: activeDatePreset === "thisQuarter" ? THEME.primary : "#e2e8f0",
                        borderRadius: 0,
                        fontSize: "11px",
                      }}
                    >
                      This Quarter
                    </button>
                  </div>

                  {(filterStartDate || filterEndDate || selectedOwner || searchInput) && (
                    <Button
                      size="sm"
                      color="light"
                      className="border text-danger py-1 px-2"
                      onClick={() => {
                        setFilterStartDate("");
                        setFilterEndDate("");
                        setSelectedOwner("");
                        setSearchInput("");
                        setSearch("");
                        setActiveDatePreset("all");
                      }}
                      style={{ borderRadius: 0, fontSize: "11px" }}
                    >
                      Reset All
                    </Button>
                  )}
                </Col>
              </Row>
            </CardBody>
          </Card>
        )}

        {/* Top 6 KPI Summary Cards Grid (Themed & 100% Dynamic) */}
        <Row className="g-3 mb-4">
          {/* Card 1: Total Opportunities */}
          <Col xl={2} md={4} sm={6}>
            <Card className="border shadow-none h-100 mb-0" style={{ borderRadius: 0, borderColor: "#e2e8f0", backgroundColor: "#ffffff" }}>
              <CardBody className="p-3">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="text-muted fw-semibold fs-12 text-uppercase letter-spacing">
                    Total Opportunities
                  </span>
                  <div
                    className="d-flex align-items-center justify-content-center"
                    style={{ width: 34, height: 34, backgroundColor: THEME.lightBg, color: THEME.primary, borderRadius: 0 }}
                  >
                    <i className="ri-briefcase-line fs-16" />
                  </div>
                </div>
                <h3 className="fw-bold text-dark mb-1 fs-22">
                  {computedStats.totalOpportunities}
                </h3>
                <div className="text-muted fs-11 fw-medium">
                  {computedStats.totalOpportunities > 0
                    ? `${computedStats.totalOpportunities} Active deals in pipeline`
                    : "No deals recorded"}
                </div>
              </CardBody>
            </Card>
          </Col>

          {/* Card 2: Total Pipeline Value */}
          <Col xl={2} md={4} sm={6}>
            <Card className="border shadow-none h-100 mb-0" style={{ borderRadius: 0, borderColor: "#e2e8f0", backgroundColor: "#ffffff" }}>
              <CardBody className="p-3">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="text-muted fw-semibold fs-12 text-uppercase letter-spacing">
                    Total Pipeline Value
                  </span>
                  <div
                    className="d-flex align-items-center justify-content-center"
                    style={{ width: 34, height: 34, backgroundColor: THEME.lightBg, color: THEME.primary, borderRadius: 0 }}
                  >
                    <i className="ri-money-dollar-circle-line fs-16" />
                  </div>
                </div>
                <h3 className="fw-bold text-dark mb-1 fs-20 text-truncate" title={formatInr(computedStats.totalPipelineValue)}>
                  {formatInr(computedStats.totalPipelineValue)}
                </h3>
                <div className="text-muted fs-11 fw-medium">
                  {computedStats.totalOpportunities > 0
                    ? `Avg: ${formatInr(Math.round(computedStats.totalPipelineValue / computedStats.totalOpportunities))}/deal`
                    : "Across all active stages"}
                </div>
              </CardBody>
            </Card>
          </Col>

          {/* Card 3: Weighted Value */}
          <Col xl={2} md={4} sm={6}>
            <Card className="border shadow-none h-100 mb-0" style={{ borderRadius: 0, borderColor: "#e2e8f0", backgroundColor: "#ffffff" }}>
              <CardBody className="p-3">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="text-muted fw-semibold fs-12 text-uppercase letter-spacing">
                    Weighted Value
                  </span>
                  <div
                    className="d-flex align-items-center justify-content-center"
                    style={{ width: 34, height: 34, backgroundColor: THEME.lightBg, color: THEME.primary, borderRadius: 0 }}
                  >
                    <i className="ri-focus-3-line fs-16" />
                  </div>
                </div>
                <h3 className="fw-bold text-dark mb-1 fs-20 text-truncate" title={formatInr(computedStats.weightedValue)}>
                  {formatInr(computedStats.weightedValue)}
                </h3>
                <div className="text-muted fs-11 fw-medium">
                  {computedStats.totalPipelineValue > 0
                    ? `${Math.round((computedStats.weightedValue / computedStats.totalPipelineValue) * 100)}% of pipeline value`
                    : "0% of pipeline"}
                </div>
              </CardBody>
            </Card>
          </Col>

          {/* Card 4: Avg. Win Probability */}
          <Col xl={2} md={4} sm={6}>
            <Card className="border shadow-none h-100 mb-0" style={{ borderRadius: 0, borderColor: "#e2e8f0", backgroundColor: "#ffffff" }}>
              <CardBody className="p-3">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="text-muted fw-semibold fs-12 text-uppercase letter-spacing">
                    Avg. Win Probability
                  </span>
                  <div
                    className="d-flex align-items-center justify-content-center"
                    style={{ width: 34, height: 34, backgroundColor: THEME.lightBg, color: THEME.primary, borderRadius: 0 }}
                  >
                    <i className="ri-bar-chart-box-line fs-16" />
                  </div>
                </div>
                <h3 className="fw-bold text-dark mb-1 fs-22">
                  {computedStats.avgWinProbability}%
                </h3>
                <div className="text-muted fs-11 fw-medium">
                  Calculated from stage probabilities
                </div>
              </CardBody>
            </Card>
          </Col>

          {/* Card 5: Won Deals */}
          <Col xl={2} md={4} sm={6}>
            <Card className="border shadow-none h-100 mb-0" style={{ borderRadius: 0, borderColor: "#e2e8f0", backgroundColor: "#ffffff" }}>
              <CardBody className="p-3">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="text-muted fw-semibold fs-12 text-uppercase letter-spacing">
                    Won Deals
                  </span>
                  <div
                    className="d-flex align-items-center justify-content-center"
                    style={{ width: 34, height: 34, backgroundColor: "#ecfdf5", color: "#059669", borderRadius: 0 }}
                  >
                    <i className="ri-trophy-line fs-16" />
                  </div>
                </div>
                <h3 className="fw-bold text-dark mb-1 fs-22">
                  {computedStats.wonCount}
                </h3>
                <div className="text-muted fs-11 fw-medium text-truncate" title={formatInr(computedStats.wonAmount)}>
                  {formatInr(computedStats.wonAmount)} revenue
                </div>
              </CardBody>
            </Card>
          </Col>

          {/* Card 6: Lost Deals */}
          <Col xl={2} md={4} sm={6}>
            <Card className="border shadow-none h-100 mb-0" style={{ borderRadius: 0, borderColor: "#e2e8f0", backgroundColor: "#ffffff" }}>
              <CardBody className="p-3">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="text-muted fw-semibold fs-12 text-uppercase letter-spacing">
                    Lost Deals
                  </span>
                  <div
                    className="d-flex align-items-center justify-content-center"
                    style={{ width: 34, height: 34, backgroundColor: THEME.borderTint, color: THEME.primary, borderRadius: 0 }}
                  >
                    <i className="ri-emotion-unhappy-line fs-16" />
                  </div>
                </div>
                <h3 className="fw-bold text-dark mb-1 fs-22">
                  {computedStats.lostCount}
                </h3>
                <div className="text-muted fs-11 fw-medium text-truncate" title={formatInr(computedStats.lostAmount)}>
                  {formatInr(computedStats.lostAmount)} revenue
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>

        {/* Global Error Banner */}
        {error && (
          <Alert color="danger" className="py-2 mb-3">
            {error}
          </Alert>
        )}

        {/* Stage Moving Indicator */}
        {moving && (
          <div
            className="alert alert-info py-2 mb-3 d-flex align-items-center gap-2"
            style={{ borderRadius: 0 }}
          >
            <Spinner size="sm" color="info" /> Updating opportunity stage…
          </div>
        )}

        {/* Kanban Board Container */}
        {loading ? (
          <div className="text-center py-5 bg-white border" style={{ borderRadius: 0 }}>
            <Spinner style={{ color: THEME.primary }} />
            <div className="mt-2 text-muted fs-13">Loading pipeline columns & deals…</div>
          </div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <div
              className="d-flex gap-3 align-items-start overflow-auto pb-4"
              style={{ minHeight: "560px" }}
            >
              {stages.map((stage) => {
                const theme = getStageTheme(stage.stageCode);
                const isWon = String(stage.stageCode).toUpperCase() === "CLOSED_WON";
                const isLost = String(stage.stageCode).toUpperCase() === "CLOSED_LOST";
                const opps = stage.opportunities || [];
                const stageTotalAmt =
                  stage.totalAmount != null
                    ? Number(stage.totalAmount)
                    : opps.reduce((acc, c) => acc + (Number(c.amount) || 0), 0);
                const stageCount = stage.totalCount != null ? stage.totalCount : opps.length;

                return (
                  <div
                    key={stage.stageId}
                    style={{
                      minWidth: "270px",
                      maxWidth: "290px",
                      flex: "0 0 280px",
                    }}
                  >
                    <Card
                      className="border shadow-none mb-0"
                      style={{
                        borderRadius: 0,
                        backgroundColor: "#f8fafc",
                        borderTop: `3px solid ${theme.accentColor}`,
                      }}
                    >
                      <CardBody className="p-3">
                        {/* Column Header */}
                        <div className="d-flex align-items-center justify-content-between mb-1">
                          <div className="d-flex align-items-center gap-1">
                            <span className="fw-bold text-dark fs-14">
                              {stage.stageName}
                            </span>
                            <span className="text-muted fs-12 fw-semibold">
                              ({stageCount})
                            </span>
                          </div>
                          <span
                            className="text-muted fs-12"
                            style={{ cursor: "pointer" }}
                            title={`${stage.stageName}: ${stageCount} deals`}
                          >
                            <i className="ri-information-line" />
                          </span>
                        </div>

                        {/* Column Subtotal Value */}
                        <div className="fw-bold text-dark fs-13 mb-3">
                          {formatInr(stageTotalAmt)}
                        </div>

                        {/* Droppable Column Area */}
                        <Droppable droppableId={String(stage.stageId)}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className="p-1"
                              style={{
                                minHeight: "380px",
                                borderRadius: 0,
                                backgroundColor: snapshot.isDraggingOver
                                  ? "rgba(254, 242, 242, 0.7)"
                                  : "transparent",
                                transition: "background-color 0.2s ease",
                              }}
                            >
                              {opps.map((card, index) => (
                                <Draggable
                                  key={String(card.opportunityId)}
                                  draggableId={String(card.opportunityId)}
                                  index={index}
                                >
                                  {(dragProvided, dragSnapshot) => (
                                    <div
                                      ref={dragProvided.innerRef}
                                      {...dragProvided.draggableProps}
                                      {...dragProvided.dragHandleProps}
                                      className="border p-3 mb-2 bg-white"
                                      style={{
                                        ...dragProvided.draggableProps.style,
                                        borderRadius: 0,
                                        boxShadow: dragSnapshot.isDragging
                                          ? "0 14px 28px rgba(0,0,0,0.15), 0 10px 10px rgba(0,0,0,0.08)"
                                          : "0 1px 3px rgba(0,0,0,0.04)",
                                        border: "1px solid #e2e8f0",
                                        cursor: "grab",
                                        transition: "box-shadow 0.15s ease",
                                      }}
                                    >
                                      {/* Row 1: Company / Customer Name & Document Icon */}
                                      <div className="d-flex align-items-start justify-content-between mb-1">
                                        <span
                                          className="fw-bold text-dark fs-13 text-truncate me-2"
                                          title={card.accountName || "Account"}
                                        >
                                          {card.accountName || "—"}
                                        </span>
                                        <i
                                          className="ri-file-text-line text-muted fs-14 flex-shrink-0"
                                          title="Deal Details"
                                        />
                                      </div>

                                      {/* Row 2: Opportunity / Deal Title */}
                                      <Link
                                        to={`/crm/opportunities/${card.opportunityId}`}
                                        className="fs-12 d-block text-truncate mb-2 text-decoration-none"
                                        title={card.name}
                                        style={{ color: "#475569" }}
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {card.name}
                                      </Link>

                                      {/* Row 3: Deal Amount & Probability Badge */}
                                      <div className="d-flex align-items-center gap-1 fs-12 mb-3">
                                        <span className="fw-bold text-dark">
                                          {formatInr(card.amount)}
                                        </span>
                                        <span className="text-muted">·</span>
                                        {isWon ? (
                                          <span
                                            className="badge fw-medium"
                                            style={{
                                              borderRadius: 0,
                                              backgroundColor: "#d1fae5",
                                              color: "#059669",
                                              fontSize: "11px",
                                              padding: "2px 8px",
                                            }}
                                          >
                                            Won
                                          </span>
                                        ) : isLost ? (
                                          <span
                                            className="badge fw-medium"
                                            style={{
                                              borderRadius: 0,
                                              backgroundColor: "#ffe4e6",
                                              color: "#e11d48",
                                              fontSize: "11px",
                                              padding: "2px 8px",
                                            }}
                                          >
                                            Lost
                                          </span>
                                        ) : (
                                          <span className="text-muted fw-medium">
                                            {card.probability != null ? `${card.probability}%` : "10%"}
                                          </span>
                                        )}
                                      </div>

                                      {/* Row 4: Owner Avatar + Name & Close Date */}
                                      <div className="d-flex align-items-center justify-content-between pt-2 border-top">
                                        <div className="d-flex align-items-center gap-2">
                                          <div
                                            className="d-flex align-items-center justify-content-center text-white fw-bold"
                                            style={{
                                              width: 22,
                                              height: 22,
                                              fontSize: "10px",
                                              backgroundColor: THEME.primary,
                                              borderRadius: 0,
                                            }}
                                            title={card.ownerName || "Unassigned"}
                                          >
                                            {getInitials(card.ownerName)}
                                          </div>
                                          <span
                                            className="text-muted fs-11 text-truncate"
                                            style={{ maxWidth: 85 }}
                                            title={card.ownerName || "Unassigned"}
                                          >
                                            {card.ownerName || "No owner"}
                                          </span>
                                        </div>
                                        <span className="text-muted fs-11">
                                          {formatCloseDate(card.expectedCloseDate)}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}

                              {opps.length === 0 && (
                                <div
                                  className="text-muted fs-12 text-center py-5 border border-dashed"
                                  style={{ backgroundColor: "#ffffff", borderRadius: 0 }}
                                >
                                  Drop deals here
                                </div>
                              )}
                            </div>
                          )}
                        </Droppable>

                        {/* Bottom Column Action Button matching SoftOnCloud theme */}
                        <div className="mt-2 text-center">
                          {isWon ? (
                            <Link
                              to="/crm/opportunities"
                              className="text-muted fs-12 fw-medium text-decoration-none py-1 d-block"
                            >
                              View All Won →
                            </Link>
                          ) : isLost ? (
                            <Link
                              to="/crm/opportunities"
                              className="text-danger fs-12 fw-medium text-decoration-none py-1 d-block"
                            >
                              View All Lost →
                            </Link>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-sm btn-link text-decoration-none fs-12 fw-medium w-100 py-1"
                              onClick={() => openQuickCreate(stage)}
                              style={{ color: THEME.primary }}
                            >
                              + Add Opportunity
                            </button>
                          )}
                        </div>
                      </CardBody>
                    </Card>
                  </div>
                );
              })}
            </div>
          </DragDropContext>
        )}

        {/* Bottom Pipeline Summary & Funnel Distribution Card */}
        <Card
          className="border shadow-none mt-3 mb-4 bg-white"
          style={{ borderRadius: 0, borderColor: "#e2e8f0" }}
        >
          <CardBody className="p-3 p-md-4">
            {/* Top Row: Title + Total Metrics */}
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3 pb-3 border-bottom">
              <div className="d-flex align-items-center gap-3">
                <div
                  className="d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{
                    width: 38,
                    height: 38,
                    backgroundColor: THEME.lightBg,
                    color: THEME.primary,
                    border: `1px solid ${THEME.borderTint}`,
                    borderRadius: 0,
                  }}
                >
                  <i className="ri-pie-chart-2-line fs-18" />
                </div>
                <div>
                  <h6 className="fw-bold text-dark mb-0 fs-14">Pipeline Summary & Stage Distribution</h6>
                  <span className="text-muted fs-12">
                    {computedStats.totalOpportunities}{" "}
                    {computedStats.totalOpportunities === 1 ? "Opportunity" : "Opportunities"} across {stages.length} Sales Stages
                  </span>
                </div>
              </div>

              <div className="d-flex align-items-center gap-3">
                <div className="text-end">
                  <span className="text-muted fs-11 text-uppercase fw-semibold d-block">
                    Total Pipeline Value
                  </span>
                  <span className="fw-bold fs-18" style={{ color: THEME.primary }}>
                    {formatInr(computedStats.totalPipelineValue)}
                  </span>
                </div>
                <div
                  className="px-3 py-1 d-flex flex-column align-items-center justify-content-center"
                  style={{ backgroundColor: THEME.lightBg, border: `1px solid ${THEME.borderTint}`, borderRadius: 0 }}
                >
                  <span className="text-muted fs-10 text-uppercase fw-semibold">Weighted</span>
                  <span className="fw-bold fs-13" style={{ color: THEME.primary }}>
                    {formatInr(computedStats.weightedValue ?? computedStats.weightedPipelineValue)}
                  </span>
                </div>
              </div>
            </div>

            {/* Visual Funnel Stacked Distribution Bar */}
            <div
              className="w-100 overflow-hidden d-flex mb-3 shadow-none"
              style={{ height: "7px", backgroundColor: "#f1f5f9", borderRadius: 0 }}
            >
              {stages.map((stage) => {
                const opps = stage.opportunities || [];
                const stageAmt =
                  stage.totalAmount != null
                    ? Number(stage.totalAmount)
                    : opps.reduce((acc, c) => acc + (Number(c.amount) || 0), 0);
                const pct =
                  computedStats.totalPipelineValue > 0
                    ? (stageAmt / computedStats.totalPipelineValue) * 100
                    : 0;
                const theme = getStageTheme(stage.stageCode);

                if (pct <= 0) return null;

                return (
                  <div
                    key={`bar-${stage.stageId}`}
                    title={`${stage.stageName}: ${formatInr(stageAmt)} (${Math.round(pct)}%)`}
                    style={{
                      width: `${pct}%`,
                      backgroundColor: theme.accentColor,
                      borderRadius: 0,
                      transition: "width 0.4s ease",
                    }}
                  />
                );
              })}
            </div>

            {/* Stages Grid (Equal Width Distributed Cards across the Full Width) */}
            <Row className="g-2">
              {stages.map((stage) => {
                const opps = stage.opportunities || [];
                const stageAmt =
                  stage.totalAmount != null
                    ? Number(stage.totalAmount)
                    : opps.reduce((acc, c) => acc + (Number(c.amount) || 0), 0);
                const stageCount = stage.totalCount != null ? stage.totalCount : opps.length;
                const pct =
                  computedStats.totalPipelineValue > 0
                    ? Math.round((stageAmt / computedStats.totalPipelineValue) * 100)
                    : 0;
                const theme = getStageTheme(stage.stageCode);

                return (
                  <Col key={stage.stageId} lg={2} md={4} sm={6}>
                    <div
                      className="p-2 px-3 border h-100 d-flex flex-column justify-content-between"
                      style={{
                        borderRadius: 0,
                        backgroundColor: stageCount > 0 ? theme.lightBg : "#ffffff",
                        borderColor:
                          stageCount > 0
                            ? theme.accentColor === THEME.primary
                              ? THEME.borderTint
                              : theme.accentColor + "40"
                            : "#e2e8f0",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <div className="d-flex align-items-center justify-content-between mb-1">
                        <div className="d-flex align-items-center gap-1 overflow-hidden">
                          <span
                            className="flex-shrink-0"
                            style={{
                              width: 8,
                              height: 8,
                              backgroundColor: theme.accentColor,
                              borderRadius: 0,
                            }}
                          />
                          <span
                            className="fw-semibold text-dark fs-12 text-truncate"
                            title={stage.stageName}
                          >
                            {stage.stageName}
                          </span>
                        </div>
                        <span
                          className="badge flex-shrink-0"
                          style={{
                            borderRadius: 0,
                            backgroundColor: theme.badgeBg,
                            color: theme.badgeText,
                            fontSize: "10px",
                            padding: "2px 6px",
                            fontWeight: 600,
                          }}
                        >
                          {stageCount}
                        </span>
                      </div>

                      <div className="d-flex align-items-baseline justify-content-between mt-1">
                        <span
                          className="fw-bold fs-13"
                          style={{
                            color:
                              stageCount > 0
                                ? theme.accentColor === THEME.primary
                                  ? THEME.primary
                                  : theme.badgeText
                                : "#0f172a",
                          }}
                        >
                          {formatInr(stageAmt)}
                        </span>
                        <span
                          className="fs-11 fw-semibold"
                          style={{
                            color:
                              stageCount > 0
                                ? theme.accentColor === THEME.primary
                                  ? THEME.primary
                                  : theme.badgeText
                                : "#64748b",
                          }}
                        >
                          {pct}%
                        </span>
                      </div>
                    </div>
                  </Col>
                );
              })}
            </Row>
          </CardBody>
        </Card>

        {/* Quick Create Opportunity Modal */}
        <Modal
          isOpen={createModalOpen}
          toggle={() => setCreateModalOpen(false)}
          centered
          size="md"
          contentClassName="rounded-0"
        >
          <ModalHeader
            toggle={() => setCreateModalOpen(false)}
            className="border-bottom rounded-0"
            style={{ backgroundColor: THEME.lightBg, borderColor: THEME.borderTint }}
          >
            <div className="fw-bold fs-15" style={{ color: THEME.primary }}>
              + New Opportunity
              {createStageTarget ? ` — ${createStageTarget.stageName}` : ""}
            </div>
          </ModalHeader>
          <Form onSubmit={handleCreateSubmit}>
            <ModalBody className="p-4">
              <FormGroup className="mb-3">
                <Label className="form-label fw-semibold fs-12">
                  Opportunity / Deal Name <span className="text-danger">*</span>
                </Label>
                <Input
                  type="text"
                  placeholder="e.g. New ERP Requirement, Cloud Migration..."
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  style={{ borderRadius: 0 }}
                  required
                />
              </FormGroup>

              <FormGroup className="mb-3">
                <Label className="form-label fw-semibold fs-12">
                  Customer / Company <span className="text-danger">*</span>
                </Label>
                <Input
                  type="select"
                  value={createForm.accountId}
                  onChange={(e) => setCreateForm({ ...createForm, accountId: e.target.value })}
                  style={{ borderRadius: 0 }}
                  required
                >
                  <option value="">Select Customer Account</option>
                  {customersList.map((c) => (
                    <option key={c.accountId} value={c.accountId}>
                      {c.displayName || c.companyName || `Account #${c.accountId}`}
                    </option>
                  ))}
                </Input>
              </FormGroup>

              <Row className="g-3 mb-3">
                <Col md={6}>
                  <Label className="form-label fw-semibold fs-12">Deal Amount (₹)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="e.g. 1850000"
                    value={createForm.amount}
                    onChange={(e) => setCreateForm({ ...createForm, amount: e.target.value })}
                    style={{ borderRadius: 0 }}
                  />
                </Col>
                <Col md={6}>
                  <Label className="form-label fw-semibold fs-12">Win Probability (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={createForm.probability}
                    onChange={(e) => setCreateForm({ ...createForm, probability: e.target.value })}
                    style={{ borderRadius: 0 }}
                  />
                </Col>
              </Row>

              <Row className="g-3 mb-3">
                <Col md={6}>
                  <Label className="form-label fw-semibold fs-12">Expected Close Date</Label>
                  <Input
                    type="date"
                    value={createForm.expectedCloseDate}
                    onChange={(e) => setCreateForm({ ...createForm, expectedCloseDate: e.target.value })}
                    style={{ borderRadius: 0 }}
                  />
                </Col>
                <Col md={6}>
                  <Label className="form-label fw-semibold fs-12">Sales Owner</Label>
                  <Input
                    type="select"
                    value={createForm.ownerEmployeeId}
                    onChange={(e) => setCreateForm({ ...createForm, ownerEmployeeId: e.target.value })}
                    style={{ borderRadius: 0 }}
                  >
                    <option value="">Select Owner</option>
                    {ownersList.map((o) => (
                      <option key={o.ownerId} value={o.ownerId}>
                        {o.fullName}
                      </option>
                    ))}
                  </Input>
                </Col>
              </Row>

              <FormGroup className="mb-0">
                <Label className="form-label fw-semibold fs-12">Target Stage</Label>
                <Input
                  type="select"
                  value={createForm.stageId}
                  onChange={(e) => setCreateForm({ ...createForm, stageId: e.target.value })}
                  style={{ borderRadius: 0 }}
                >
                  {stages.map((s) => (
                    <option key={s.stageId} value={s.stageId}>
                      {s.stageName}
                    </option>
                  ))}
                </Input>
              </FormGroup>
            </ModalBody>
            <ModalFooter className="border-top py-2 px-3 rounded-0">
              <Button
                color="light"
                size="sm"
                type="button"
                onClick={() => setCreateModalOpen(false)}
                style={{ borderRadius: 0 }}
              >
                Cancel
              </Button>
              <Button
                color="danger"
                size="sm"
                type="submit"
                disabled={createSubmitting}
                style={{ backgroundColor: THEME.primary, borderColor: THEME.primary, borderRadius: 0 }}
              >
                {createSubmitting ? <Spinner size="sm" /> : "Save Opportunity"}
              </Button>
            </ModalFooter>
          </Form>
        </Modal>
      </Container>
    </div>
  );
};

export default Pipeline;
