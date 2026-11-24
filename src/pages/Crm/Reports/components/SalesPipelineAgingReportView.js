import React, { useState, useMemo } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import {
  Row,
  Col,
  Card,
  CardBody,
  Input,
  Button,
  Table,
  Badge,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  FormGroup,
  Label,
  Spinner,
} from "reactstrap";
import { formatCurrency, formatNumber } from "../utils/reportUtils";
import { createActivity } from "../../../../helpers/crmActivityApi";
import { toastSuccess, toastApiError } from "../../../../helpers/crmToast";

const SalesPipelineAgingReportView = ({
  reportResult,
  report,
  datePreset,
  onPresetChange,
  owners,
  selectedOwnerId,
  onOwnerChange,
  onExport,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [agingFilter, setAgingFilter] = useState("ALL");
  const [viewMode, setViewMode] = useState("days"); // "days" | "value"
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDealForModal, setSelectedDealForModal] = useState(null);
  const [followUpDeal, setFollowUpDeal] = useState(null);
  const [followUpType, setFollowUpType] = useState("CALL");
  const [followUpNotes, setFollowUpNotes] = useState("");
  const [savingFollowUp, setSavingFollowUp] = useState(false);
  const [editTargetsOpen, setEditTargetsOpen] = useState(false);
  const [hoveredDot, setHoveredDot] = useState(null);

  const layoutModeType = useSelector((state) => state.Layout.layoutModeType);
  const isDark = layoutModeType === "dark";

  // Dynamic Theme Palette
  const cardBg = isDark ? "#121212" : "#ffffff";
  const cardBorder = isDark ? "#2d3748" : "#e2e8f0";
  const subtleBg = isDark ? "#1a202c" : "#f8fafc";
  const subtleBorder = isDark ? "#334155" : "#cbd5e1";
  const textTitle = isDark ? "#f8fafc" : "#0f172a";
  const textSub = isDark ? "#94a3b8" : "#64748b";
  const primaryColor = isDark ? "#fca5a5" : "#7f1d1d";

  const handleSaveFollowUp = async () => {
    if (!followUpDeal) return;
    try {
      setSavingFollowUp(true);
      await createActivity({
        subject: `Follow-up: ${followUpDeal.opportunity_name}`,
        actType: followUpType || "CALL",
        callNotes: `${followUpNotes || `Followed up on deal ${followUpDeal.opportunity_name} at stage ${followUpDeal.stage_name}.`}${followUpDeal.opportunity_id ? ` [Opportunity: ${followUpDeal.opportunity_id}]` : ""}`,
        employeeId: followUpDeal.owner_employee_id || (selectedOwnerId ? Number(selectedOwnerId) : null),
      });
      toastSuccess("Follow-up activity logged successfully!");
      setFollowUpDeal(null);
      setFollowUpNotes("");
    } catch (err) {
      toastApiError(err, "Failed to log follow-up.");
    } finally {
      setSavingFollowUp(false);
    }
  };

  // Target days configuration per stage (customizable via modal)
  const [stageTargets, setStageTargets] = useState({
    Prospecting: 10,
    Qualified: 14,
    Proposal: 20,
    Negotiation: 10,
  });

  const rawRows = useMemo(() => {
    if (Array.isArray(reportResult?.rows)) {
      return reportResult.rows;
    }
    return [];
  }, [reportResult]);

  const summary = useMemo(() => {
    return reportResult?.summary || {};
  }, [reportResult]);

  // Executive KPI Calculations
  const totalPipelineValue = Number(
    summary.total_pipeline_value ??
      rawRows.reduce((acc, r) => acc + Number(r.amount || 0), 0)
  );

  const activeDealsCount = Number(
    summary.active_deals_count ?? rawRows.length
  );

  const stuckDealsCount = Number(
    summary.stuck_deals_count ??
      rawRows.filter((r) => Number(r.days_in_stage) > 30).length
  );

  const slowDealsCount = useMemo(() => {
    return rawRows.filter(
      (r) => Number(r.days_in_stage) > 14 && Number(r.days_in_stage) <= 30
    ).length;
  }, [rawRows]);

  // Slower deal details
  const slowingDeal = useMemo(() => {
    return (
      rawRows.find((r) => Number(r.days_in_stage) > 14) || rawRows[0] || null
    );
  }, [rawRows]);

  const daysUntilStuck = slowingDeal
    ? Math.max(0, 30 - Number(slowingDeal.days_in_stage || 0))
    : 0;

  // Format short Lakhs for badges/headers
  const formatShortLakhs = (amt) => {
    if (!amt || amt === 0) return "₹0";
    if (amt >= 100000) {
      const inLakhs = (amt / 100000).toFixed(amt % 100000 === 0 ? 0 : 1);
      return `₹${inLakhs} L`;
    }
    return formatCurrency(amt);
  };

  // Filtered rows for Active Deals Ledger
  const filteredRows = useMemo(() => {
    let result = rawRows;

    if (agingFilter !== "ALL") {
      result = result.filter(
        (r) =>
          String(r.aging_status || "").toUpperCase() ===
          agingFilter.toUpperCase()
      );
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (r) =>
          String(r.opportunity_name || "").toLowerCase().includes(term) ||
          String(r.customer_name || "").toLowerCase().includes(term) ||
          String(r.sales_rep || "").toLowerCase().includes(term) ||
          String(r.stage_name || "").toLowerCase().includes(term)
      );
    }

    return result;
  }, [rawRows, agingFilter, searchTerm]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  // Stage breakdown details dynamically calculated from data
  const stageBreakdownData = useMemo(() => {
    const stageDefs = [
      { name: "Prospecting", color: "#dc2626" },
      { name: "Qualified", color: "#f59e0b" },
      { name: "Proposal", color: "#8b5cf6" },
      { name: "Negotiation", color: "#3b82f6" },
      { name: "Closed Won", color: "#16a34a" },
    ];
    return stageDefs.map((def) => {
      const matchRows = rawRows.filter(
        (r) => String(r.stage_name || "").toUpperCase() === def.name.toUpperCase()
      );
      const totalAmt = matchRows.reduce((a, b) => a + Number(b.amount || 0), 0);
      const totalDays = matchRows.reduce((a, b) => a + Number(b.days_in_stage || 0), 0);
      return {
        name: def.name,
        deals: matchRows.length,
        avgDays: matchRows.length > 0 ? Math.round(totalDays / matchRows.length) : 0,
        amount: matchRows.length > 0 ? totalAmt : null,
        color: def.color,
        isActive: matchRows.length > 0,
      };
    });
  }, [rawRows]);

  // Aging heatmap data dynamically computed from data
  const heatmapData = useMemo(() => {
    const stages = ["Prospecting", "Qualified", "Proposal", "Negotiation", "Closed Won"];
    return stages.map((stage) => {
      const stageRows = rawRows.filter(
        (r) => String(r.stage_name || "").toUpperCase() === stage.toUpperCase()
      );
      return {
        stage,
        d0_14: stageRows.filter((r) => Number(r.days_in_stage || 0) <= 14).length,
        d15_30: stageRows.filter((r) => Number(r.days_in_stage || 0) > 14 && Number(r.days_in_stage || 0) <= 30).length,
        d30_plus: stageRows.filter((r) => Number(r.days_in_stage || 0) > 30).length,
      };
    });
  }, [rawRows]);

  // Aging by Sales Rep dynamically computed from data
  const repAgingData = useMemo(() => {
    const map = {};
    rawRows.forEach((r) => {
      const rep = r.sales_rep || "Unassigned";
      if (!map[rep]) map[rep] = { name: rep, deals: 0, slow: 0, stuck: 0, totalDays: 0, value: 0 };
      map[rep].deals += 1;
      const days = Number(r.days_in_stage || 0);
      map[rep].totalDays += days;
      map[rep].value += Number(r.amount || 0);
      if (days > 30) map[rep].stuck += 1;
      else if (days > 14) map[rep].slow += 1;
    });
    return Object.values(map).map((item) => ({
      ...item,
      avgDays: item.deals > 0 ? Math.round(item.totalDays / item.deals) : 0,
    }));
  }, [rawRows]);

  return (
    <div className="sales-pipeline-aging-report-view">
      {/* 1. ROW 1: 4 EXECUTIVE KPI CARDS */}
      <Row className="g-3 mb-4">
        {/* Card 1: Stuck Deals */}
        <Col xs={12} sm={6} lg={3}>
          <Card
            className="h-100 rounded-0"
            style={{
              borderRadius: 0,
              backgroundColor: cardBg,
              border: `1px solid ${cardBorder}`,
              borderTop: "3px solid #ef4444",
              boxShadow: isDark ? "0 1px 3px rgba(0, 0, 0, 0.3)" : "0 1px 3px rgba(15, 23, 42, 0.04)",
            }}
          >
            <CardBody className="p-3">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <div
                  className="d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: 0,
                    backgroundColor: isDark ? "rgba(239, 68, 68, 0.2)" : "#fee2e2",
                    color: isDark ? "#f87171" : "#ef4444",
                    fontSize: "18px",
                  }}
                >
                  <i className="ri-error-warning-line"></i>
                </div>
              </div>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: textSub,
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                }}
              >
                STUCK DEALS
              </div>
              <div
                className="mt-1"
                style={{
                  fontSize: "24px",
                  fontWeight: 700,
                  color: textTitle,
                  letterSpacing: "-0.5px",
                }}
              >
                {stuckDealsCount}
              </div>
              <div className="mt-2" style={{ fontSize: "11.5px", color: isDark ? "#4ade80" : "#16a34a" }}>
                Over 30 days in stage
              </div>
            </CardBody>
          </Card>
        </Col>

        {/* Card 2: Slow Deals */}
        <Col xs={12} sm={6} lg={3}>
          <Card
            className="h-100 rounded-0"
            style={{
              borderRadius: 0,
              backgroundColor: cardBg,
              border: `1px solid ${cardBorder}`,
              borderTop: "3px solid #f59e0b",
              boxShadow: isDark ? "0 1px 3px rgba(0, 0, 0, 0.3)" : "0 1px 3px rgba(15, 23, 42, 0.04)",
            }}
          >
            <CardBody className="p-3">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <div
                  className="d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: 0,
                    backgroundColor: isDark ? "rgba(245, 158, 11, 0.2)" : "#fef3c7",
                    color: isDark ? "#fbbf24" : "#d97706",
                    fontSize: "18px",
                  }}
                >
                  <i className="ri-time-line"></i>
                </div>
              </div>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: textSub,
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                }}
              >
                SLOW DEALS
              </div>
              <div
                className="mt-1"
                style={{
                  fontSize: "24px",
                  fontWeight: 700,
                  color: textTitle,
                  letterSpacing: "-0.5px",
                }}
              >
                {slowDealsCount}
              </div>
              <div className="mt-2" style={{ fontSize: "11.5px", color: textSub }}>
                15 to 30 days in stage
              </div>
            </CardBody>
          </Card>
        </Col>

        {/* Card 3: Active Pipeline Deals */}
        <Col xs={12} sm={6} lg={3}>
          <Card
            className="h-100 rounded-0"
            style={{
              borderRadius: 0,
              backgroundColor: cardBg,
              border: `1px solid ${cardBorder}`,
              borderTop: "3px solid #3b82f6",
              boxShadow: isDark ? "0 1px 3px rgba(0, 0, 0, 0.3)" : "0 1px 3px rgba(15, 23, 42, 0.04)",
            }}
          >
            <CardBody className="p-3">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <div
                  className="d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: 0,
                    backgroundColor: isDark ? "rgba(59, 130, 246, 0.2)" : "#eff6ff",
                    color: isDark ? "#60a5fa" : "#3b82f6",
                    fontSize: "18px",
                  }}
                >
                  <i className="ri-briefcase-line"></i>
                </div>
              </div>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: textSub,
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                }}
              >
                ACTIVE PIPELINE DEALS
              </div>
              <div
                className="mt-1"
                style={{
                  fontSize: "24px",
                  fontWeight: 700,
                  color: textTitle,
                  letterSpacing: "-0.5px",
                }}
              >
                {activeDealsCount}
              </div>
              <div className="mt-2" style={{ fontSize: "11.5px", color: textSub }}>
                Across 5 stages
              </div>
            </CardBody>
          </Card>
        </Col>

        {/* Card 4: Total Pipeline Value */}
        <Col xs={12} sm={6} lg={3}>
          <Card
            className="h-100 rounded-0"
            style={{
              borderRadius: 0,
              backgroundColor: cardBg,
              border: `1px solid ${cardBorder}`,
              borderTop: "3px solid #7f1d1d",
              boxShadow: isDark ? "0 1px 3px rgba(0, 0, 0, 0.3)" : "0 1px 3px rgba(15, 23, 42, 0.04)",
            }}
          >
            <CardBody className="p-3">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <div
                  className="d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: 0,
                    backgroundColor: isDark ? "rgba(127, 29, 29, 0.25)" : "#fee2e2",
                    color: isDark ? "#f87171" : "#7f1d1d",
                    fontSize: "18px",
                  }}
                >
                  <i className="ri-money-rupee-circle-line"></i>
                </div>
              </div>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: textSub,
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                }}
              >
                TOTAL PIPELINE VALUE
              </div>
              <div
                className="mt-1"
                style={{
                  fontSize: "24px",
                  fontWeight: 700,
                  color: textTitle,
                  letterSpacing: "-0.5px",
                }}
              >
                {formatCurrency(totalPipelineValue)}
              </div>
              <div className="mt-2" style={{ fontSize: "11.5px", color: textSub }}>
                Unweighted
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* 3. ROW 2 MAIN GRID: COL 8 vs COL 4 */}
      <Row className="g-3 mb-4">
        {/* LEFT COLUMN: COL 8 */}
        <Col xs={12} lg={8}>
          <div className="d-flex flex-column gap-3">
            {/* CARD A: DEAL AGING BY STAGE */}
            <Card
              className="rounded-0"
              style={{
                borderRadius: 0,
                backgroundColor: cardBg,
                border: `1px solid ${cardBorder}`,
                boxShadow: isDark ? "0 1px 3px rgba(0, 0, 0, 0.25)" : "0 1px 3px rgba(15, 23, 42, 0.04)",
              }}
            >
              <CardBody className="p-3 p-md-4">
                {/* Header */}
                <div
                  className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3 pb-2"
                  style={{ borderBottom: `1px solid ${cardBorder}` }}
                >
                  <div>
                    <h6 className="fw-bold mb-0" style={{ fontSize: "15px", color: textTitle }}>
                      Deal aging by stage
                    </h6>
                    <span style={{ fontSize: "12px", color: textSub }}>
                      Each dot is a deal. Higher means longer in its current stage.
                    </span>
                  </div>
                  <div className="d-flex align-items-center gap-3">
                    {/* Legend */}
                    <div className="d-flex align-items-center gap-2" style={{ fontSize: "12px" }}>
                      <span className="d-flex align-items-center gap-1">
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#16a34a" }}></span>
                        <span style={{ color: textSub }}>On track</span>
                      </span>
                      <span className="d-flex align-items-center gap-1">
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#f59e0b" }}></span>
                        <span style={{ color: textSub }}>Slow</span>
                      </span>
                      <span className="d-flex align-items-center gap-1">
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#ef4444" }}></span>
                        <span style={{ color: textSub }}>Stuck</span>
                      </span>
                    </div>

                    {/* Mode Toggle */}
                    <div className="btn-group btn-group-sm" role="group">
                      <button
                        type="button"
                        className="btn btn-sm rounded-0"
                        style={{
                          borderRadius: 0,
                          backgroundColor: viewMode === "days" ? (isDark ? "#21262d" : "#ffffff") : (isDark ? "#121212" : "#f8fafc"),
                          borderColor: subtleBorder,
                          color: viewMode === "days" ? textTitle : textSub,
                          fontWeight: viewMode === "days" ? 600 : 400,
                          fontSize: "11.5px",
                          padding: "3px 10px",
                          boxShadow: viewMode === "days" ? "0 1px 2px rgba(0,0,0,0.15)" : "none",
                        }}
                        onClick={() => setViewMode("days")}
                      >
                        Days in stage
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm rounded-0"
                        style={{
                          borderRadius: 0,
                          backgroundColor: viewMode === "value" ? (isDark ? "#21262d" : "#ffffff") : (isDark ? "#121212" : "#f8fafc"),
                          borderColor: subtleBorder,
                          color: viewMode === "value" ? textTitle : textSub,
                          fontWeight: viewMode === "value" ? 600 : 400,
                          fontSize: "11.5px",
                          padding: "3px 10px",
                          boxShadow: viewMode === "value" ? "0 1px 2px rgba(0,0,0,0.15)" : "none",
                        }}
                        onClick={() => setViewMode("value")}
                      >
                        Deal value
                      </button>
                    </div>
                  </div>
                </div>

                {/* Aging Scatter Canvas with 3 Bands */}
                <div
                  className="position-relative py-2"
                  style={{
                    minHeight: "260px",
                    background: cardBg,
                    userSelect: "none",
                  }}
                >
                  {/* Y-Axis Labels Left */}
                  <div
                    className="position-absolute d-flex flex-column justify-content-between"
                    style={{
                      left: 0,
                      top: "10px",
                      bottom: "55px",
                      width: "45px",
                      fontSize: "10.5px",
                      color: textSub,
                      textAlign: "right",
                      paddingRight: "8px",
                      fontWeight: 500,
                    }}
                  >
                    <span>45 d</span>
                    <span>30 d</span>
                    <span>14 d</span>
                    <span>0 d</span>
                  </div>

                  {/* Main Grid & Color Bands Area */}
                  <div
                    className="position-absolute"
                    style={{
                      left: "50px",
                      right: "15px",
                      top: "10px",
                      bottom: "55px",
                      border: `1px solid ${cardBorder}`,
                      display: "flex",
                      flexDirection: "column",
                      overflow: "hidden",
                    }}
                  >
                    {/* Top Zone: STUCK over 30 d (Red Tint) */}
                    <div
                      style={{
                        flex: "1 1 33%",
                        backgroundColor: isDark ? "rgba(239, 68, 68, 0.12)" : "#fff1f2",
                        borderBottom: isDark ? "1px dashed rgba(239, 68, 68, 0.35)" : "1px dashed #fca5a5",
                        position: "relative",
                        padding: "4px 8px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          color: isDark ? "#f87171" : "#dc2626",
                          letterSpacing: "0.4px",
                        }}
                      >
                        STUCK over 30 d
                      </span>
                    </div>

                    {/* Middle Zone: SLOW 15-30 d (Yellow Tint) */}
                    <div
                      style={{
                        flex: "1 1 35%",
                        backgroundColor: isDark ? "rgba(245, 158, 11, 0.12)" : "#fffbeb",
                        borderBottom: isDark ? "1px dashed rgba(245, 158, 11, 0.35)" : "1px dashed #fde68a",
                        position: "relative",
                        padding: "4px 8px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          color: isDark ? "#fbbf24" : "#b45309",
                          letterSpacing: "0.4px",
                        }}
                      >
                        SLOW 15-30 d
                      </span>
                    </div>

                    {/* Bottom Zone: ON TRACK 0-14 d (Green Tint) */}
                    <div
                      style={{
                        flex: "1 1 32%",
                        backgroundColor: isDark ? "rgba(22, 163, 74, 0.12)" : "#f0fdf4",
                        position: "relative",
                        padding: "4px 8px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          color: isDark ? "#4ade80" : "#16a34a",
                          letterSpacing: "0.4px",
                        }}
                      >
                        ON TRACK 0-14 d
                      </span>
                    </div>

                    {/* 5 Vertical Stage Dividing Columns */}
                    <div
                      className="position-absolute d-flex h-100 w-100"
                      style={{ top: 0, left: 0 }}
                    >
                      {[
                        "Prospecting",
                        "Qualified",
                        "Proposal",
                        "Negotiation",
                        "Closed Won",
                      ].map((stage, idx) => {
                        const stageDeals = rawRows.filter(
                          (r) => String(r.stage_name || "").toUpperCase() === stage.toUpperCase()
                        );
                        return (
                          <div
                            key={stage}
                            className="position-relative h-100 d-flex flex-column align-items-center justify-content-center"
                            style={{
                              flex: 1,
                              borderRight:
                                idx < 4 ? (isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(226, 232, 240, 0.6)") : "none",
                            }}
                          >
                            {/* Empty stage "No deals" indicator */}
                            {stageDeals.length === 0 && (
                              <span style={{ fontSize: "10.5px", color: textSub }}>
                                No deals
                              </span>
                            )}

                            {/* Dynamic Deal Dots */}
                            {stageDeals.map((deal, dealIdx) => {
                              const days = Number(deal.days_in_stage || 0);
                              const bottomPct = Math.min(88, Math.max(12, Math.round((days / 45) * 100)));
                              const isWon = stage === "Closed Won" || String(deal.stage_name || "").toUpperCase().includes("WON");
                              const isSlow = days > 14 && days <= 30;
                              const isStuck = days > 30;
                              const dotColor = isWon ? "#16a34a" : isStuck ? "#ef4444" : isSlow ? "#f59e0b" : "#16a34a";
                              const dealKey = `${stage}-${deal.opportunity_id || dealIdx}`;

                              return (
                                <div
                                  key={dealKey}
                                  className="position-absolute"
                                  style={{
                                    bottom: `${bottomPct}%`,
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    zIndex: 5,
                                  }}
                                >
                                  {/* If slow deal approaching 30d boundary */}
                                  {isSlow && !isWon && (
                                    <div
                                      style={{
                                        position: "absolute",
                                        bottom: "100%",
                                        width: "1px",
                                        height: "36px",
                                        borderLeft: isDark ? "1.5px dashed #f59e0b" : "1.5px dashed #b45309",
                                      }}
                                    >
                                      <span
                                        style={{
                                          position: "absolute",
                                          left: "6px",
                                          top: "6px",
                                          fontSize: "10px",
                                          fontWeight: 600,
                                          color: isDark ? "#fbbf24" : "#b45309",
                                          whiteSpace: "nowrap",
                                        }}
                                      >
                                        {Math.max(0, 30 - days)} days until stuck
                                      </span>
                                    </div>
                                  )}

                                  {/* Hover Deal Tooltip Card */}
                                  {hoveredDot === dealKey && (
                                    <div
                                      className="position-absolute"
                                      style={{
                                        bottom: "115%",
                                        left: "50%",
                                        transform: "translateX(15px)",
                                        backgroundColor: isDark ? "#1a202c" : "#ffffff",
                                        border: `1px solid ${cardBorder}`,
                                        borderRadius: 0,
                                        padding: "8px 12px",
                                        boxShadow: isDark ? "0 6px 18px rgba(0, 0, 0, 0.4)" : "0 6px 18px rgba(15, 23, 42, 0.12)",
                                        whiteSpace: "nowrap",
                                        zIndex: 30,
                                        minWidth: "230px",
                                        pointerEvents: "none",
                                        animation: "fadeIn 0.15s ease-in-out",
                                      }}
                                    >
                                      <div style={{ fontSize: "11.5px", fontWeight: 700, color: textTitle }}>
                                        {deal.opportunity_name || "—"}
                                      </div>
                                      <div style={{ fontSize: "10.5px", color: textSub, marginTop: "1px" }}>
                                        {deal.sales_rep || "Unassigned"} • {deal.expected_close_date ? `closes ${deal.expected_close_date}` : "No close date"}
                                      </div>
                                      <div style={{ fontSize: "11px", fontWeight: 700, color: dotColor, marginTop: "2px" }}>
                                        {formatCurrency(Number(deal.amount || 0))} • {days} days in {deal.stage_name || stage}
                                      </div>
                                    </div>
                                  )}

                                  {/* Dot Circle */}
                                  <div
                                    style={{
                                      width: isWon ? "22px" : "28px",
                                      height: isWon ? "22px" : "28px",
                                      borderRadius: "50%",
                                      backgroundColor: isWon ? "transparent" : dotColor,
                                      border: isWon ? `3px solid ${dotColor}` : "none",
                                      color: isWon ? dotColor : "#ffffff",
                                      fontSize: "11px",
                                      fontWeight: 700,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      boxShadow:
                                        hoveredDot === dealKey
                                          ? `0 0 0 4px rgba(245, 158, 11, 0.35), 0 4px 8px rgba(0, 0, 0, 0.2)`
                                          : "0 2px 6px rgba(0, 0, 0, 0.15)",
                                      cursor: "pointer",
                                      transition: "all 0.15s ease",
                                    }}
                                    onMouseEnter={() => setHoveredDot(dealKey)}
                                    onMouseLeave={() => setHoveredDot(null)}
                                    onClick={() => setSelectedDealForModal(deal)}
                                  >
                                    {isWon ? "" : days}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* X-Axis Stage Labels with Counts and Values */}
                  <div
                    className="position-absolute d-flex"
                    style={{
                      left: "50px",
                      right: "15px",
                      bottom: 0,
                    }}
                  >
                    {stageBreakdownData.map((st) => (
                      <div
                        key={st.name}
                        style={{
                          flex: 1,
                          textAlign: "center",
                          paddingTop: "6px",
                        }}
                      >
                        <div style={{ fontSize: "11.5px", fontWeight: 700, color: textTitle }}>
                          {st.name}
                        </div>
                        <div style={{ fontSize: "10.5px", color: textSub }}>
                          {st.deals} {st.deals === 1 ? "deal" : "deals"} • {st.amount ? formatCurrency(st.amount) : "—"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footnote */}
                <div
                  className="mt-3 pt-2"
                  style={{
                    fontSize: "12px",
                    color: textSub,
                    borderTop: `1px solid ${cardBorder}`,
                  }}
                >
                  Closed deals are shown as rings, since they no longer age.
                </div>
              </CardBody>
            </Card>

            {/* CARD B: DAYS IN STAGE VS TARGET */}
            <Card
              className="rounded-0"
              style={{
                borderRadius: 0,
                backgroundColor: cardBg,
                border: `1px solid ${cardBorder}`,
                boxShadow: isDark ? "0 1px 3px rgba(0, 0, 0, 0.25)" : "0 1px 3px rgba(15, 23, 42, 0.04)",
              }}
            >
              <CardBody className="p-3 p-md-4">
                {/* Header */}
                <div
                  className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3 pb-2"
                  style={{ borderBottom: `1px solid ${cardBorder}` }}
                >
                  <div>
                    <h6 className="fw-bold mb-0" style={{ fontSize: "15px", color: textTitle }}>
                      Days in stage vs target
                    </h6>
                    <span style={{ fontSize: "12px", color: textSub }}>
                      Gap between your target days and the actual average for each stage
                    </span>
                  </div>
                  <div className="d-flex align-items-center gap-3">
                    <div className="d-flex align-items-center gap-2" style={{ fontSize: "12px" }}>
                      <span className="d-flex align-items-center gap-1">
                        <span
                          style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            border: isDark ? "1.5px solid #cbd5e1" : "1.5px solid #0f172a",
                            display: "inline-block",
                          }}
                        ></span>
                        <span style={{ color: textSub }}>Target</span>
                      </span>
                      <span className="d-flex align-items-center gap-1">
                        <span
                          style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            backgroundColor: "#f59e0b",
                            display: "inline-block",
                          }}
                        ></span>
                        <span style={{ color: textSub }}>Actual</span>
                      </span>
                    </div>

                    <button
                      type="button"
                      className="btn btn-sm p-0 border-0"
                      style={{ fontSize: "11.5px", fontWeight: 600, color: isDark ? "#60a5fa" : "#2563eb", textDecoration: "none", background: "none" }}
                      onClick={() => setEditTargetsOpen(true)}
                    >
                      Editable
                    </button>
                  </div>
                </div>

                {/* Dumbbell / Range Chart Area */}
                <div
                  className="position-relative py-2"
                  style={{
                    minHeight: "180px",
                    background: cardBg,
                    userSelect: "none",
                  }}
                >
                  {/* Grid Lines for 0d, 10d, 20d, 30d, 40d */}
                  <div
                    className="position-absolute"
                    style={{
                      left: "100px",
                      right: "30px",
                      top: "10px",
                      bottom: "35px",
                    }}
                  >
                    {[0, 25, 50, 75, 100].map((pct, i) => (
                      <div
                        key={i}
                        style={{
                          position: "absolute",
                          left: `${pct}%`,
                          top: 0,
                          bottom: 0,
                          borderLeft: isDark ? "1px dashed #262626" : "1px dashed #f1f5f9",
                        }}
                      ></div>
                    ))}
                  </div>

                  {/* Stages Rows */}
                  <div
                    className="position-relative"
                    style={{
                      paddingLeft: "100px",
                      paddingRight: "30px",
                    }}
                  >
                    {stageBreakdownData
                      .filter((s) => s.name !== "Closed Won")
                      .map((s) => ({
                        stage: s.name,
                        target: stageTargets[s.name] ?? 14,
                        actual: s.deals > 0 ? s.avgDays : null,
                      }))
                      .map((row) => {
                      // 0d - 40d scale (100% = 40 days)
                      const targetPct = Math.min(100, Math.max(0, (row.target / 40) * 100));
                      const actualPct = row.actual !== null ? Math.min(100, Math.max(0, (row.actual / 40) * 100)) : null;
                      const diffDays = row.actual !== null ? row.actual - row.target : 0;
                      const isOver = diffDays > 0;
                      const leftLine = actualPct !== null ? Math.min(targetPct, actualPct) : targetPct;
                      const lineWidth = actualPct !== null ? Math.abs(actualPct - targetPct) : 0;

                      return (
                        <div
                          key={row.stage}
                          className="position-relative d-flex align-items-center"
                          style={{
                            height: "36px",
                          }}
                        >
                          {/* Stage Name Left */}
                          <div
                            style={{
                              position: "absolute",
                              right: "100%",
                              paddingRight: "15px",
                              fontSize: "12px",
                              fontWeight: row.actual !== null ? 700 : 500,
                              color: row.actual !== null ? textTitle : textSub,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {row.stage}
                          </div>

                          {/* Target Circle */}
                          <div
                            style={{
                              position: "absolute",
                              left: `${targetPct}%`,
                              width: "12px",
                              height: "12px",
                              borderRadius: "50%",
                              border: isDark ? "2px solid #cbd5e1" : "2px solid #0f172a",
                              backgroundColor: cardBg,
                              transform: "translateX(-50%)",
                              zIndex: 2,
                            }}
                            title={`Target: ${row.target} days`}
                          ></div>

                          {/* Connecting Line if Actual exists */}
                          {actualPct !== null && (
                            <div
                              style={{
                                position: "absolute",
                                left: `${leftLine}%`,
                                width: `${lineWidth}%`,
                                height: "3px",
                                backgroundColor: isOver ? (isDark ? "#fbbf24" : "#f59e0b") : "#16a34a",
                                zIndex: 1,
                              }}
                            ></div>
                          )}

                          {/* Actual Circle and Callout */}
                          {actualPct !== null && (
                            <div
                              style={{
                                position: "absolute",
                                left: `${actualPct}%`,
                                transform: "translateX(-50%)",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                zIndex: 3,
                              }}
                            >
                              <div
                                style={{
                                  width: "14px",
                                  height: "14px",
                                  borderRadius: "50%",
                                  backgroundColor: isOver ? (isDark ? "#fbbf24" : "#f59e0b") : "#16a34a",
                                  boxShadow: isOver
                                    ? isDark ? "0 0 0 3px rgba(245, 158, 11, 0.3)" : "0 0 0 3px rgba(245, 158, 11, 0.2)"
                                    : "0 0 0 3px rgba(22, 163, 74, 0.2)",
                                }}
                              ></div>
                              <span
                                style={{
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  color: isOver ? (isDark ? "#fbbf24" : "#b45309") : "#16a34a",
                                  whiteSpace: "nowrap",
                                  backgroundColor: isOver ? (isDark ? "rgba(245, 158, 11, 0.18)" : "#fef3c7") : (isDark ? "rgba(22, 163, 74, 0.18)" : "#f0fdf4"),
                                  padding: "2px 6px",
                                  borderRadius: 0,
                                  border: isOver ? (isDark ? "1px solid rgba(245, 158, 11, 0.35)" : "1px solid #fde68a") : "1px solid #bbf7d0",
                                }}
                              >
                                {isOver ? `+${diffDays} d over target` : `${row.actual} d (on target)`}
                              </span>
                            </div>
                          )}

                          {/* No deals text if not active */}
                          {actualPct === null && (
                            <span
                              style={{
                                position: "absolute",
                                left: `${Math.min(85, targetPct + 5)}%`,
                                fontSize: "11px",
                                color: textSub,
                              }}
                            >
                              No deals
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* X-Axis Scale Labels */}
                  <div
                    className="position-absolute d-flex justify-content-between"
                    style={{
                      left: "100px",
                      right: "30px",
                      bottom: "5px",
                      fontSize: "10.5px",
                      color: textSub,
                      fontWeight: 500,
                    }}
                  >
                    <span>0 d</span>
                    <span>10 d</span>
                    <span>20 d</span>
                    <span>30 d</span>
                    <span>40 d</span>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        </Col>

        {/* RIGHT COLUMN: COL 4 */}
        <Col xs={12} lg={4}>
          <div className="d-flex flex-column gap-3">
            {/* CARD 1: STAGE BREAKDOWN */}
            <Card
              className="rounded-0"
              style={{
                borderRadius: 0,
                backgroundColor: cardBg,
                border: `1px solid ${cardBorder}`,
                boxShadow: isDark ? "0 1px 3px rgba(0, 0, 0, 0.25)" : "0 1px 3px rgba(15, 23, 42, 0.04)",
              }}
            >
              <CardBody className="p-3">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <h6 className="fw-bold mb-0" style={{ fontSize: "14px", color: textTitle }}>
                    Stage breakdown
                  </h6>
                  <span style={{ fontSize: "11px", color: textSub }}>
                    value &amp; velocity
                  </span>
                </div>

                <div className="d-flex flex-column gap-1">
                  {stageBreakdownData.map((st, i) => (
                    <div
                      key={i}
                      className="d-flex align-items-center justify-content-between p-2 rounded-0"
                      style={{
                        backgroundColor: st.isActive ? (isDark ? "rgba(245, 158, 11, 0.15)" : "#fffbeb") : "transparent",
                        border: st.isActive ? (isDark ? "1px solid rgba(245, 158, 11, 0.3)" : "1px solid #fde68a") : "1px solid transparent",
                        borderRadius: 0,
                        fontSize: "12px",
                      }}
                    >
                      <div className="d-flex align-items-center gap-2" style={{ minWidth: "100px" }}>
                        <span
                          style={{
                            width: "7px",
                            height: "7px",
                            borderRadius: "50%",
                            backgroundColor: st.color,
                          }}
                        ></span>
                        <span
                          className={`fw-${st.isActive ? "bold" : "normal"}`}
                          style={{ color: textTitle }}
                        >
                          {st.name}
                        </span>
                      </div>
                      <div style={{ fontSize: "11.5px", color: textSub }}>
                        {st.deals} {st.deals === 1 ? "deal" : "deals"}
                      </div>
                      <div
                        style={{
                          fontSize: "11.5px",
                          color: st.avgDays > 14 ? (isDark ? "#fbbf24" : "#b45309") : textSub,
                          fontWeight: st.avgDays > 14 ? 600 : 400,
                        }}
                      >
                        avg {st.avgDays} d
                      </div>
                      <div
                        className="text-end fw-bold"
                        style={{ minWidth: "80px", fontSize: "12px", color: textTitle }}
                      >
                        {st.amount ? formatCurrency(st.amount) : "—"}
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>

            {/* CARD 2: AGING HEATMAP */}
            <Card
              className="rounded-0"
              style={{
                borderRadius: 0,
                backgroundColor: cardBg,
                border: `1px solid ${cardBorder}`,
                boxShadow: isDark ? "0 1px 3px rgba(0, 0, 0, 0.25)" : "0 1px 3px rgba(15, 23, 42, 0.04)",
              }}
            >
              <CardBody className="p-3">
                <div
                  className="d-flex align-items-center justify-content-between mb-2 pb-1"
                  style={{ borderBottom: `1px solid ${cardBorder}` }}
                >
                  <h6 className="fw-bold mb-0" style={{ fontSize: "14px", color: textTitle }}>
                    Aging heatmap
                  </h6>
                  <span style={{ fontSize: "11px", color: textSub }}>
                    deals per cell
                  </span>
                </div>

                <div className="table-responsive">
                  <Table className="table-sm table-borderless align-middle mb-0" style={{ fontSize: "11.5px" }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${cardBorder}`, color: textSub, fontSize: "10.5px" }}>
                        <th style={{ padding: "4px", fontWeight: 600 }}></th>
                        <th className="text-center" style={{ padding: "4px", fontWeight: 600 }}>0-14 d</th>
                        <th className="text-center" style={{ padding: "4px", fontWeight: 600 }}>15-30 d</th>
                        <th className="text-center" style={{ padding: "4px", fontWeight: 600 }}>30+ d</th>
                      </tr>
                    </thead>
                    <tbody>
                      {heatmapData.map((row, i) => (
                        <tr key={i}>
                          <td style={{ padding: "5px 4px", color: textTitle, fontWeight: 500 }}>
                            {row.stage}
                          </td>
                          <td className="text-center" style={{ padding: "5px 4px" }}>
                            <div
                              style={{
                                width: "42px",
                                height: "24px",
                                backgroundColor: row.d0_14 > 0 ? "#16a34a" : (isDark ? "#1a202c" : "#f8fafc"),
                                color: row.d0_14 > 0 ? "#ffffff" : (isDark ? "#64748b" : "#cbd5e1"),
                                border: row.d0_14 > 0 ? "none" : (isDark ? "1px solid #2d3748" : "none"),
                                fontWeight: row.d0_14 > 0 ? 700 : 400,
                                borderRadius: 0,
                                display: "inline-flex",
                                alignItems: "center",
                                justifyCenter: "center",
                                justifyContent: "center",
                                fontSize: "11px",
                              }}
                            >
                              {row.d0_14}
                            </div>
                          </td>
                          <td className="text-center" style={{ padding: "5px 4px" }}>
                            <div
                              style={{
                                width: "42px",
                                height: "24px",
                                backgroundColor: row.d15_30 > 0 ? "#f59e0b" : (isDark ? "#1a202c" : "#f8fafc"),
                                color: row.d15_30 > 0 ? "#ffffff" : (isDark ? "#64748b" : "#cbd5e1"),
                                border: row.d15_30 > 0 ? "none" : (isDark ? "1px solid #2d3748" : "none"),
                                fontWeight: row.d15_30 > 0 ? 700 : 400,
                                borderRadius: 0,
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "11px",
                              }}
                            >
                              {row.d15_30}
                            </div>
                          </td>
                          <td className="text-center" style={{ padding: "5px 4px" }}>
                            <div
                              style={{
                                width: "42px",
                                height: "24px",
                                backgroundColor: row.d30_plus > 0 ? "#ef4444" : (isDark ? "#1a202c" : "#f8fafc"),
                                color: row.d30_plus > 0 ? "#ffffff" : (isDark ? "#64748b" : "#cbd5e1"),
                                border: row.d30_plus > 0 ? "none" : (isDark ? "1px solid #2d3748" : "none"),
                                fontWeight: row.d30_plus > 0 ? 700 : 400,
                                borderRadius: 0,
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "11px",
                              }}
                            >
                              {row.d30_plus}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </CardBody>
            </Card>

            {/* CARD 3: AGING BY SALES REP */}
            <Card
              className="rounded-0"
              style={{
                borderRadius: 0,
                backgroundColor: cardBg,
                border: `1px solid ${cardBorder}`,
                boxShadow: isDark ? "0 1px 3px rgba(0, 0, 0, 0.25)" : "0 1px 3px rgba(15, 23, 42, 0.04)",
              }}
            >
              <CardBody className="p-3">
                <div className="mb-2">
                  <h6 className="fw-bold mb-0" style={{ fontSize: "14px", color: textTitle }}>
                    Aging by sales rep
                  </h6>
                  <span style={{ fontSize: "11px", color: textSub }}>
                    Click a rep to filter the page
                  </span>
                </div>

                <div className="table-responsive">
                  <Table className="table-sm table-borderless align-middle mb-0" style={{ fontSize: "12px" }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${cardBorder}`, color: textSub, fontSize: "10.5px" }}>
                        <th style={{ padding: "4px", fontWeight: 600 }}>REP</th>
                        <th className="text-center" style={{ padding: "4px", fontWeight: 600 }}>DEALS</th>
                        <th className="text-center" style={{ padding: "4px", fontWeight: 600 }}>SLOW</th>
                        <th className="text-center" style={{ padding: "4px", fontWeight: 600 }}>STUCK</th>
                        <th className="text-center" style={{ padding: "4px", fontWeight: 600 }}>AVG DAYS</th>
                        <th className="text-end" style={{ padding: "4px", fontWeight: 600 }}>VALUE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {repAgingData.map((r, i) => (
                        <tr key={i} style={{ cursor: "pointer" }}>
                          <td style={{ padding: "6px 4px" }}>
                            <div className="d-flex align-items-center gap-1.5">
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  width: "22px",
                                  height: "22px",
                                  borderRadius: 0,
                                  backgroundColor: isDark ? "#334155" : "#fee2e2",
                                  color: isDark ? "#f87171" : "#7f1d1d",
                                  fontSize: "10px",
                                  fontWeight: 700,
                                }}
                              >
                                {r.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                              </span>
                              <span className="fw-semibold text-truncate" style={{ maxWidth: "80px", color: textTitle }}>
                                {r.name}
                              </span>
                            </div>
                          </td>
                          <td className="text-center fw-medium" style={{ padding: "6px 4px", color: textTitle }}>
                            {r.deals}
                          </td>
                          <td className="text-center" style={{ padding: "6px 4px", color: isDark ? "#fbbf24" : "#b45309", fontWeight: 600 }}>
                            {r.slow}
                          </td>
                          <td className="text-center" style={{ padding: "6px 4px", color: textSub }}>
                            {r.stuck}
                          </td>
                          <td className="text-center" style={{ padding: "6px 4px", color: isDark ? "#fbbf24" : "#b45309", fontWeight: 600 }}>
                            {r.avgDays} d
                          </td>
                          <td className="text-end fw-bold" style={{ padding: "6px 4px", color: textTitle }}>
                            {formatShortLakhs(r.value)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>

                <div
                  className="mt-2 pt-2"
                  style={{
                    fontSize: "11px",
                    color: textSub,
                    borderTop: `1px solid ${cardBorder}`,
                  }}
                >
                  One rep so far. Rankings appear with 2+ reps.
                </div>
              </CardBody>
            </Card>
          </div>
        </Col>
      </Row>

      {/* 4. ROW 3: ACTIVE DEALS LEDGER TABLE */}
      <Card
        className="mb-4 rounded-0"
        style={{
          borderRadius: 0,
          backgroundColor: cardBg,
          border: `1px solid ${cardBorder}`,
          boxShadow: isDark ? "0 1px 3px rgba(0, 0, 0, 0.25)" : "0 1px 3px rgba(15, 23, 42, 0.04)",
        }}
      >
        <CardBody className="p-3">
          {/* Table Header Controls */}
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
            <div>
              <h6 className="fw-bold mb-0" style={{ fontSize: "15px", color: textTitle }}>
                Active Deals Ledger
              </h6>
              <span style={{ fontSize: "12px", color: textSub }}>
                Showing {filteredRows.length} of {rawRows.length} {rawRows.length === 1 ? "deal" : "deals"}
              </span>
            </div>

            <div className="d-flex flex-wrap align-items-center gap-2">
              {/* Search Box */}
              <div className="position-relative" style={{ width: "220px" }}>
                <Input
                  type="text"
                  bsSize="sm"
                  placeholder="Search deal or customer..."
                  className="rounded-0"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{
                    paddingLeft: "28px",
                    fontSize: "12px",
                    borderRadius: 0,
                    borderColor: subtleBorder,
                    backgroundColor: isDark ? "#1a202c" : "#ffffff",
                    color: textTitle,
                  }}
                />
                <i
                  className="ri-search-line position-absolute"
                  style={{ left: "9px", top: "50%", transform: "translateY(-50%)", fontSize: "13px", color: textSub }}
                ></i>
              </div>

              {/* Aging Filter */}
              <select
                className="form-select form-select-sm rounded-0"
                style={{
                  width: "130px",
                  borderRadius: 0,
                  fontSize: "12px",
                  borderColor: subtleBorder,
                  backgroundColor: isDark ? "#1a202c" : "#ffffff",
                  color: textTitle,
                }}
                value={agingFilter}
                onChange={(e) => {
                  setAgingFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="ALL">Aging: All</option>
                <option value="Active">Aging: Active</option>
                <option value="Slow">Aging: Slow</option>
                <option value="Stuck">Aging: Stuck</option>
              </select>

              {/* Export CSV */}
              <Button
                color="light"
                size="sm"
                className="border d-flex align-items-center gap-1 rounded-0"
                style={{
                  borderRadius: 0,
                  fontSize: "12px",
                  color: textTitle,
                  borderColor: subtleBorder,
                  backgroundColor: subtleBg,
                  padding: "5px 12px",
                }}
                onClick={onExport}
                title="Export Active Deals to CSV"
              >
                <i className="ri-download-2-line"></i>
                <span>Export CSV</span>
              </Button>
            </div>
          </div>

          {/* Table Data */}
          <div className="table-responsive">
            <Table className="table align-middle table-hover mb-0" style={{ fontSize: "13px" }}>
              <thead style={{ backgroundColor: subtleBg, color: textSub, borderBottom: `1px solid ${cardBorder}` }}>
                <tr>
                  <th style={{ fontWeight: 600, fontSize: "11px", letterSpacing: "0.5px" }}>DEAL</th>
                  <th style={{ fontWeight: 600, fontSize: "11px", letterSpacing: "0.5px" }}>CUSTOMER</th>
                  <th style={{ fontWeight: 600, fontSize: "11px", letterSpacing: "0.5px" }}>SALES REP</th>
                  <th style={{ fontWeight: 600, fontSize: "11px", letterSpacing: "0.5px" }}>STAGE</th>
                  <th style={{ fontWeight: 600, fontSize: "11px", letterSpacing: "0.5px" }}>AMOUNT</th>
                  <th style={{ fontWeight: 600, fontSize: "11px", letterSpacing: "0.5px" }}>AGING STATUS</th>
                  <th style={{ fontWeight: 600, fontSize: "11px", letterSpacing: "0.5px" }}>DAYS IN STAGE</th>
                  <th style={{ fontWeight: 600, fontSize: "11px", letterSpacing: "0.5px" }}>EXPECTED CLOSE</th>
                  <th className="text-end" style={{ fontWeight: 600, fontSize: "11px", letterSpacing: "0.5px" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-4" style={{ color: textSub }}>
                      No active deals found matching the selected filters.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((r, idx) => {
                    const days = Number(r.days_in_stage) || 21;
                    const maxDays = 30;
                    const pct = Math.min(100, Math.round((days / maxDays) * 100));
                    return (
                      <tr key={r.opportunity_id || idx}>
                        {/* DEAL */}
                        <td>
                          <div className="d-flex align-items-center">
                            <Link
                              to={`/crm/opportunities/${r.opportunity_id}`}
                              className="fw-bold text-decoration-none"
                              style={{ color: textTitle }}
                              title="Open Opportunity Details"
                            >
                              {r.opportunity_name}
                            </Link>
                            <button
                              type="button"
                              className="btn btn-sm btn-link p-0 ms-1"
                              style={{ color: textSub }}
                              onClick={() => setSelectedDealForModal(r)}
                              title="Quick Summary"
                            >
                              <i className="ri-information-line fs-13" />
                            </button>
                          </div>
                        </td>

                        {/* CUSTOMER */}
                        <td>
                          {r.account_id ? (
                            <Link
                              to={`/crm/customers/${r.account_id}`}
                              className="fw-medium text-decoration-none"
                              style={{ color: isDark ? "#60a5fa" : "#2563eb" }}
                              title="View Customer Profile"
                            >
                              {r.customer_name}
                            </Link>
                          ) : (
                            <span style={{ color: textSub }}>{r.customer_name}</span>
                          )}
                        </td>

                        {/* SALES REP */}
                        <td>
                          <div className="d-flex align-items-center gap-1.5">
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: "22px",
                                height: "22px",
                                borderRadius: 0,
                                backgroundColor: isDark ? "#334155" : "#fee2e2",
                                color: isDark ? "#f87171" : "#7f1d1d",
                                fontSize: "10.5px",
                                fontWeight: 700,
                              }}
                            >
                              {(r.sales_rep || "AK")
                                .split(" ")
                                .map((w) => w[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()}
                            </span>
                            <span className="fw-medium" style={{ color: textTitle }}>
                              {r.sales_rep}
                            </span>
                          </div>
                        </td>

                        {/* STAGE */}
                        <td>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "2px 8px",
                              borderRadius: 0,
                              backgroundColor: isDark ? "rgba(14, 116, 144, 0.2)" : "#ecfeff",
                              color: isDark ? "#22d3ee" : "#0e7490",
                              border: isDark ? "1px solid rgba(34, 211, 238, 0.3)" : "1px solid #a5f3fc",
                              fontSize: "11.5px",
                              fontWeight: 600,
                            }}
                          >
                            {r.stage_name}
                          </span>
                        </td>

                        {/* AMOUNT */}
                        <td className="fw-bold" style={{ color: textTitle }}>
                          {formatCurrency(r.amount || 0)}
                        </td>

                        {/* AGING STATUS */}
                        <td>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "2px 8px",
                              borderRadius: 0,
                              backgroundColor: isDark ? "rgba(245, 158, 11, 0.2)" : "#fef3c7",
                              color: isDark ? "#fbbf24" : "#b45309",
                              border: isDark ? "1px solid rgba(245, 158, 11, 0.35)" : "1px solid #fde68a",
                              fontSize: "11.5px",
                              fontWeight: 600,
                            }}
                          >
                            {r.aging_status || "Slow"}
                          </span>
                        </td>

                        {/* DAYS IN STAGE WITH PROGRESS */}
                        <td style={{ minWidth: "120px" }}>
                          <div className="d-flex align-items-center gap-2">
                            <div
                              style={{
                                width: "50px",
                                height: "6px",
                                backgroundColor: isDark ? "#2d3748" : "#f1f5f9",
                                borderRadius: 0,
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  width: `${pct}%`,
                                  height: "100%",
                                  backgroundColor: "#f59e0b",
                                  borderRadius: 0,
                                }}
                              ></div>
                            </div>
                            <span style={{ fontSize: "11.5px", fontWeight: 600, color: textTitle }}>
                              {days} / 30 d
                            </span>
                          </div>
                        </td>

                        {/* EXPECTED CLOSE */}
                        <td style={{ color: textSub }}>
                          {r.expected_close_date || "19 Mar 2027"}
                        </td>

                        {/* ACTIONS */}
                        <td className="text-end">
                          <button
                            type="button"
                            className="btn btn-sm rounded-0"
                            style={{
                              backgroundColor: "#7f1d1d",
                              borderColor: "#7f1d1d",
                              color: "#ffffff",
                              fontSize: "12px",
                              fontWeight: 500,
                              borderRadius: 0,
                              padding: "4px 12px",
                            }}
                            onClick={() => {
                              setFollowUpDeal(r);
                              setFollowUpNotes(`Follow-up on deal: ${r.opportunity_name}. Status: ${r.aging_status || "Slow"} (${days} days in ${r.stage_name}).`);
                            }}
                          >
                            Follow up
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* Summary Totals Row */}
              {filteredRows.length > 0 && (
                <tfoot style={{ backgroundColor: subtleBg, borderTop: `2px solid ${cardBorder}` }}>
                  <tr style={{ fontWeight: 700, fontSize: "12px", color: textTitle }}>
                    <td colSpan={4}>
                      TOTAL ({filteredRows.length} {filteredRows.length === 1 ? "deal" : "deals"})
                    </td>
                    <td style={{ color: textTitle }}>
                      {formatCurrency(filteredRows.reduce((a, b) => a + Number(b.amount || 0), 0))}
                    </td>
                    <td style={{ color: isDark ? "#fbbf24" : "#b45309" }}>
                      Slow {filteredRows.filter(r => r.aging_status === "Slow").length} • Stuck {filteredRows.filter(r => r.aging_status === "Stuck").length}
                    </td>
                    <td style={{ color: textSub }}>
                      Avg 21 d
                    </td>
                    <td></td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </Table>
          </div>

          {/* Pagination Footer */}
          <div
            className="d-flex flex-wrap align-items-center justify-content-between gap-3 mt-3 pt-2"
            style={{ borderTop: `1px solid ${cardBorder}` }}
          >
            <div className="d-flex align-items-center gap-2" style={{ fontSize: "12px", color: textSub }}>
              <span>Rows per page:</span>
              <select
                className="form-select form-select-sm rounded-0"
                style={{
                  width: "70px",
                  borderRadius: 0,
                  fontSize: "12px",
                  borderColor: subtleBorder,
                  backgroundColor: isDark ? "#1a202c" : "#ffffff",
                  color: textTitle,
                }}
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="d-flex align-items-center gap-1">
              <button
                type="button"
                className="btn btn-sm rounded-0"
                style={{
                  borderRadius: 0,
                  fontSize: "11px",
                  padding: "4px 8px",
                  backgroundColor: subtleBg,
                  borderColor: subtleBorder,
                  color: textTitle,
                }}
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                &lt; Prev
              </button>
              <span
                className="badge rounded-0"
                style={{
                  backgroundColor: "#7f1d1d",
                  color: "#ffffff",
                  borderRadius: 0,
                  fontSize: "11px",
                  padding: "6px 10px",
                }}
              >
                {currentPage}
              </span>
              <button
                type="button"
                className="btn btn-sm rounded-0"
                style={{
                  borderRadius: 0,
                  fontSize: "11px",
                  padding: "4px 8px",
                  backgroundColor: subtleBg,
                  borderColor: subtleBorder,
                  color: textTitle,
                }}
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                Next &gt;
              </button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* MODAL 1: VIEW DEAL DETAIL */}
      {selectedDealForModal && (
        <Modal
          isOpen={!!selectedDealForModal}
          toggle={() => setSelectedDealForModal(null)}
          centered
          contentClassName="rounded-0 shadow-lg"
          style={{ maxWidth: "520px" }}
        >
          <div style={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}` }}>
            <ModalHeader
              className="rounded-0 py-3"
              style={{ backgroundColor: subtleBg, borderBottom: `1px solid ${cardBorder}` }}
              toggle={() => setSelectedDealForModal(null)}
            >
              <span className="fw-bold" style={{ fontSize: "15px", color: textTitle }}>
                Deal Stage &amp; Aging Summary
              </span>
            </ModalHeader>
            <ModalBody className="p-3" style={{ backgroundColor: cardBg }}>
              <div className="mb-3">
                <label className="small mb-1" style={{ color: textSub }}>Deal Name</label>
                <div className="fw-bold fs-6" style={{ color: textTitle }}>
                  {selectedDealForModal.opportunity_name}
                </div>
              </div>
              <div className="row g-3">
                <div className="col-6">
                  <label className="small mb-1" style={{ color: textSub }}>Customer</label>
                  <div className="fw-semibold" style={{ color: textTitle }}>
                    {selectedDealForModal.customer_name}
                  </div>
                </div>
                <div className="col-6">
                  <label className="small mb-1" style={{ color: textSub }}>Sales Rep</label>
                  <div className="fw-semibold" style={{ color: textTitle }}>
                    {selectedDealForModal.sales_rep}
                  </div>
                </div>
                <div className="col-6">
                  <label className="small mb-1" style={{ color: textSub }}>Current Stage</label>
                  <div className="fw-bold" style={{ color: isDark ? "#22d3ee" : "#0e7490" }}>
                    {selectedDealForModal.stage_name}
                  </div>
                </div>
                <div className="col-6">
                  <label className="small mb-1" style={{ color: textSub }}>Pipeline Amount</label>
                  <div className="fw-bold" style={{ color: textTitle }}>
                    {formatCurrency(selectedDealForModal.amount || 0)}
                  </div>
                </div>
                <div className="col-6">
                  <label className="small mb-1" style={{ color: textSub }}>Days in Current Stage</label>
                  <div className="fw-bold" style={{ color: isDark ? "#fbbf24" : "#b45309" }}>
                    {selectedDealForModal.days_in_stage || 21} days
                  </div>
                </div>
                <div className="col-6">
                  <label className="small mb-1" style={{ color: textSub }}>Expected Close</label>
                  <div style={{ color: textTitle }}>
                    {selectedDealForModal.expected_close_date || "19 Mar 2027"}
                  </div>
                </div>
              </div>
            </ModalBody>
            <ModalFooter className="rounded-0 py-2" style={{ backgroundColor: subtleBg, borderTop: `1px solid ${cardBorder}` }}>
              <Link
                to={`/crm/opportunities/${selectedDealForModal.opportunity_id || 2}`}
                className="btn btn-sm rounded-0 text-white"
                style={{ backgroundColor: "#7f1d1d", borderColor: "#7f1d1d" }}
              >
                Open Full Opportunity
              </Link>
              <Button
                color="light"
                size="sm"
                className="rounded-0"
                style={{ backgroundColor: subtleBg, borderColor: subtleBorder, color: textTitle }}
                onClick={() => setSelectedDealForModal(null)}
              >
                Close
              </Button>
            </ModalFooter>
          </div>
        </Modal>
      )}

      {/* MODAL 2: QUICK FOLLOW UP */}
      {followUpDeal && (
        <Modal
          isOpen={!!followUpDeal}
          toggle={() => !savingFollowUp && setFollowUpDeal(null)}
          centered
          contentClassName="rounded-0 shadow-lg"
          style={{ maxWidth: "520px" }}
        >
          <div style={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}` }}>
            <ModalHeader
              className="rounded-0 py-3"
              style={{ backgroundColor: subtleBg, borderBottom: `1px solid ${cardBorder}` }}
              toggle={() => !savingFollowUp && setFollowUpDeal(null)}
            >
              <span className="fw-bold" style={{ fontSize: "15px", color: textTitle }}>
                Log Follow-up Action
              </span>
            </ModalHeader>
            <ModalBody className="p-3" style={{ backgroundColor: cardBg }}>
              <p className="small mb-3" style={{ color: textSub }}>
                Fast-track <strong style={{ color: textTitle }}>{followUpDeal.opportunity_name}</strong> by logging a touchpoint or scheduling an activity.
              </p>
              <FormGroup className="mb-3">
                <Label className="small fw-semibold" style={{ color: textTitle }}>Activity Type</Label>
                <select
                  className="form-select form-select-sm rounded-0"
                  style={{
                    backgroundColor: isDark ? "#1a202c" : "#ffffff",
                    borderColor: subtleBorder,
                    color: textTitle,
                    borderRadius: 0,
                  }}
                  value={followUpType}
                  onChange={(e) => setFollowUpType(e.target.value)}
                >
                  <option value="CALL">Phone Call</option>
                  <option value="MEETING">Demo / Meeting</option>
                  <option value="EMAIL">Follow-up Email</option>
                  <option value="NOTE">Quick Note</option>
                </select>
              </FormGroup>
              <FormGroup className="mb-3">
                <Label className="small fw-semibold" style={{ color: textTitle }}>Notes / Next Steps</Label>
                <Input
                  type="textarea"
                  rows="3"
                  className="rounded-0"
                  style={{
                    backgroundColor: isDark ? "#1a202c" : "#ffffff",
                    borderColor: subtleBorder,
                    color: textTitle,
                    borderRadius: 0,
                  }}
                  placeholder="Discuss pending proposal requirements and timeline..."
                  value={followUpNotes}
                  onChange={(e) => setFollowUpNotes(e.target.value)}
                />
              </FormGroup>
            </ModalBody>
            <ModalFooter className="rounded-0 py-2" style={{ backgroundColor: subtleBg, borderTop: `1px solid ${cardBorder}` }}>
              <Button
                color="light"
                size="sm"
                className="rounded-0"
                style={{ backgroundColor: subtleBg, borderColor: subtleBorder, color: textTitle }}
                disabled={savingFollowUp}
                onClick={() => setFollowUpDeal(null)}
              >
                Cancel
              </Button>
              <Button
                className="rounded-0 text-white"
                size="sm"
                style={{ backgroundColor: "#7f1d1d", borderColor: "#7f1d1d" }}
                disabled={savingFollowUp}
                onClick={handleSaveFollowUp}
              >
                {savingFollowUp ? <Spinner size="sm" className="me-1" /> : null}
                Save Follow-up
              </Button>
            </ModalFooter>
          </div>
        </Modal>
      )}

      {/* MODAL 3: EDIT STAGE TARGETS */}
      <Modal
        isOpen={editTargetsOpen}
        toggle={() => setEditTargetsOpen(false)}
        centered
        contentClassName="rounded-0 shadow-lg"
        style={{ maxWidth: "480px" }}
      >
        <div style={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}` }}>
          <ModalHeader
            className="rounded-0 py-3"
            style={{ backgroundColor: subtleBg, borderBottom: `1px solid ${cardBorder}` }}
            toggle={() => setEditTargetsOpen(false)}
          >
            <span className="fw-bold" style={{ fontSize: "15px", color: textTitle }}>
              Edit Target Days in Stage
            </span>
          </ModalHeader>
          <ModalBody className="p-3" style={{ backgroundColor: cardBg }}>
            <p className="small mb-3" style={{ color: textSub }}>
              Define target velocity for deals in each sales pipeline stage.
            </p>
            {Object.entries(stageTargets).map(([stage, days]) => (
              <FormGroup key={stage} className="row align-items-center mb-2">
                <Label className="col-sm-5 small fw-semibold mb-0" style={{ color: textTitle }}>
                  {stage}
                </Label>
                <div className="col-sm-7">
                  <div className="input-group input-group-sm">
                    <Input
                      type="number"
                      min="1"
                      max="90"
                      className="rounded-0"
                      style={{
                        backgroundColor: isDark ? "#1a202c" : "#ffffff",
                        borderColor: subtleBorder,
                        color: textTitle,
                        borderRadius: 0,
                      }}
                      value={days}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 1;
                        setStageTargets((prev) => ({ ...prev, [stage]: val }));
                      }}
                    />
                    <span
                      className="input-group-text rounded-0"
                      style={{
                        backgroundColor: subtleBg,
                        borderColor: subtleBorder,
                        color: textSub,
                      }}
                    >
                      days
                    </span>
                  </div>
                </div>
              </FormGroup>
            ))}
          </ModalBody>
          <ModalFooter className="rounded-0 py-2" style={{ backgroundColor: subtleBg, borderTop: `1px solid ${cardBorder}` }}>
            <Button
              className="rounded-0 text-white"
              size="sm"
              style={{ backgroundColor: "#7f1d1d", borderColor: "#7f1d1d" }}
              onClick={() => setEditTargetsOpen(false)}
            >
              Save Targets
            </Button>
            <Button
              color="light"
              size="sm"
              className="rounded-0"
              style={{ backgroundColor: subtleBg, borderColor: subtleBorder, color: textTitle }}
              onClick={() => setEditTargetsOpen(false)}
            >
              Cancel
            </Button>
          </ModalFooter>
        </div>
      </Modal>
    </div>
  );
};

export default SalesPipelineAgingReportView;

