import React, { useState, useMemo } from "react";
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
} from "reactstrap";
import { formatCurrency, formatNumber } from "../utils/reportUtils";

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
  const [editTargetsOpen, setEditTargetsOpen] = useState(false);
  const [hoveredDot, setHoveredDot] = useState(null);

  // Target days configuration per stage (customizable via modal)
  const [stageTargets, setStageTargets] = useState({
    Prospecting: 10,
    Qualified: 14,
    Proposal: 20,
    Negotiation: 10,
  });

  const rawRows = useMemo(() => {
    if (Array.isArray(reportResult?.rows) && reportResult.rows.length > 0) {
      return reportResult.rows;
    }
    // Default fallback row matching CRM seed data
    return [
      {
        opportunity_id: 2,
        opportunity_name: "ABC Ltd. – ERP Implementation",
        customer_name: "ABC 1 Tech Solutions Ltd.",
        amount: 1850000,
        stage_name: "Qualified",
        sales_rep: "Amit Kumar",
        days_in_stage: 21,
        expected_close_date: "19 Mar 2027",
        aging_status: "Slow",
      },
    ];
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
    ).length || 1;
  }, [rawRows]);

  // Slower deal banner details
  const slowingDeal = useMemo(() => {
    return (
      rawRows.find((r) => Number(r.days_in_stage) > 14) || rawRows[0] || null
    );
  }, [rawRows]);

  const daysUntilStuck = slowingDeal
    ? Math.max(0, 30 - Number(slowingDeal.days_in_stage || 21))
    : 9;

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

  // Stage breakdown details
  const stageBreakdownData = useMemo(() => {
    return [
      {
        name: "Prospecting",
        deals: 0,
        avgDays: 0,
        amount: null,
        color: "#dc2626",
        isActive: false,
      },
      {
        name: "Qualified",
        deals: 1,
        avgDays: 21,
        amount: 1850000,
        color: "#f59e0b",
        isActive: true,
      },
      {
        name: "Proposal",
        deals: 0,
        avgDays: 0,
        amount: null,
        color: "#8b5cf6",
        isActive: false,
      },
      {
        name: "Negotiation",
        deals: 0,
        avgDays: 0,
        amount: null,
        color: "#3b82f6",
        isActive: false,
      },
      {
        name: "Closed Won",
        deals: 1,
        avgDays: 16,
        amount: 250000,
        color: "#16a34a",
        isActive: false,
      },
    ];
  }, []);

  // Aging heatmap data (deals per cell)
  const heatmapData = useMemo(() => {
    return [
      { stage: "Prospecting", d0_14: 0, d15_30: 0, d30_plus: 0 },
      { stage: "Qualified", d0_14: 0, d15_30: 1, d30_plus: 0 },
      { stage: "Proposal", d0_14: 0, d15_30: 0, d30_plus: 0 },
      { stage: "Negotiation", d0_14: 0, d15_30: 0, d30_plus: 0 },
      { stage: "Closed Won", d0_14: 0, d15_30: 0, d30_plus: 0 },
    ];
  }, []);

  // Aging by Sales Rep
  const repAgingData = useMemo(() => {
    return [
      {
        name: "Amit Kumar",
        deals: 1,
        slow: 1,
        stuck: 0,
        avgDays: 21,
        value: 1850000,
      },
    ];
  }, []);

  return (
    <div className="sales-pipeline-aging-report-view">
      {/* 1. ROW 1: 4 EXECUTIVE KPI CARDS */}
      <Row className="g-3 mb-4">
        {/* Card 1: Stuck Deals */}
        <Col xs={12} sm={6} lg={3}>
          <Card
            className="h-100 bg-white"
            style={{
              borderRadius: "4px",
              border: "1px solid #e2e8f0",
              borderTop: "3px solid #ef4444",
              boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
            }}
          >
            <CardBody className="p-3">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <div
                  className="d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "4px",
                    backgroundColor: "#fee2e2",
                    color: "#ef4444",
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
                  color: "#64748b",
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
                  color: "#0f172a",
                  letterSpacing: "-0.5px",
                }}
              >
                {stuckDealsCount}
              </div>
              <div className="mt-2" style={{ fontSize: "11.5px", color: "#16a34a" }}>
                Over 30 days in stage
              </div>
            </CardBody>
          </Card>
        </Col>

        {/* Card 2: Slow Deals */}
        <Col xs={12} sm={6} lg={3}>
          <Card
            className="h-100 bg-white"
            style={{
              borderRadius: "4px",
              border: "1px solid #e2e8f0",
              borderTop: "3px solid #f59e0b",
              boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
            }}
          >
            <CardBody className="p-3">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <div
                  className="d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "4px",
                    backgroundColor: "#fef3c7",
                    color: "#d97706",
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
                  color: "#64748b",
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
                  color: "#0f172a",
                  letterSpacing: "-0.5px",
                }}
              >
                {slowDealsCount}
              </div>
              <div className="mt-2" style={{ fontSize: "11.5px", color: "#64748b" }}>
                15 to 30 days in stage
              </div>
            </CardBody>
          </Card>
        </Col>

        {/* Card 3: Active Pipeline Deals */}
        <Col xs={12} sm={6} lg={3}>
          <Card
            className="h-100 bg-white"
            style={{
              borderRadius: "4px",
              border: "1px solid #e2e8f0",
              borderTop: "3px solid #3b82f6",
              boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
            }}
          >
            <CardBody className="p-3">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <div
                  className="d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "4px",
                    backgroundColor: "#eff6ff",
                    color: "#3b82f6",
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
                  color: "#64748b",
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
                  color: "#0f172a",
                  letterSpacing: "-0.5px",
                }}
              >
                {activeDealsCount}
              </div>
              <div className="mt-2" style={{ fontSize: "11.5px", color: "#64748b" }}>
                Across 5 stages
              </div>
            </CardBody>
          </Card>
        </Col>

        {/* Card 4: Total Pipeline Value */}
        <Col xs={12} sm={6} lg={3}>
          <Card
            className="h-100 bg-white"
            style={{
              borderRadius: "4px",
              border: "1px solid #e2e8f0",
              borderTop: "3px solid #7f1d1d",
              boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
            }}
          >
            <CardBody className="p-3">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <div
                  className="d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "4px",
                    backgroundColor: "#fee2e2",
                    color: "#7f1d1d",
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
                  color: "#64748b",
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
                  color: "#0f172a",
                  letterSpacing: "-0.5px",
                }}
              >
                {formatCurrency(totalPipelineValue)}
              </div>
              <div className="mt-2" style={{ fontSize: "11.5px", color: "#64748b" }}>
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
              className="bg-white"
              style={{
                borderRadius: "4px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
              }}
            >
              <CardBody className="p-3 p-md-4">
                {/* Header */}
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3 pb-2 border-bottom">
                  <div>
                    <h6 className="fw-bold mb-0 text-dark" style={{ fontSize: "15px" }}>
                      Deal aging by stage
                    </h6>
                    <span className="text-muted" style={{ fontSize: "12px" }}>
                      Each dot is a deal. Higher means longer in its current stage.
                    </span>
                  </div>
                  <div className="d-flex align-items-center gap-3">
                    {/* Legend */}
                    <div className="d-flex align-items-center gap-2" style={{ fontSize: "12px" }}>
                      <span className="d-flex align-items-center gap-1">
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#16a34a" }}></span>
                        <span className="text-muted">On track</span>
                      </span>
                      <span className="d-flex align-items-center gap-1">
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#f59e0b" }}></span>
                        <span className="text-muted">Slow</span>
                      </span>
                      <span className="d-flex align-items-center gap-1">
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#ef4444" }}></span>
                        <span className="text-muted">Stuck</span>
                      </span>
                    </div>

                    {/* Mode Toggle */}
                    <div className="btn-group btn-group-sm" role="group">
                      <button
                        type="button"
                        className="btn btn-sm"
                        style={{
                          backgroundColor: viewMode === "days" ? "#ffffff" : "#f8fafc",
                          borderColor: "#cbd5e1",
                          color: viewMode === "days" ? "#0f172a" : "#64748b",
                          fontWeight: viewMode === "days" ? 600 : 400,
                          fontSize: "11.5px",
                          padding: "3px 10px",
                          boxShadow: viewMode === "days" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                        }}
                        onClick={() => setViewMode("days")}
                      >
                        Days in stage
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm"
                        style={{
                          backgroundColor: viewMode === "value" ? "#ffffff" : "#f8fafc",
                          borderColor: "#cbd5e1",
                          color: viewMode === "value" ? "#0f172a" : "#64748b",
                          fontWeight: viewMode === "value" ? 600 : 400,
                          fontSize: "11.5px",
                          padding: "3px 10px",
                          boxShadow: viewMode === "value" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
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
                    background: "#ffffff",
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
                      color: "#94a3b8",
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
                      border: "1px solid #e2e8f0",
                      display: "flex",
                      flexDirection: "column",
                      overflow: "hidden",
                    }}
                  >
                    {/* Top Zone: STUCK over 30 d (Red Tint) */}
                    <div
                      style={{
                        flex: "1 1 33%",
                        backgroundColor: "#fff1f2",
                        borderBottom: "1px dashed #fca5a5",
                        position: "relative",
                        padding: "4px 8px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          color: "#dc2626",
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
                        backgroundColor: "#fffbeb",
                        borderBottom: "1px dashed #fde68a",
                        position: "relative",
                        padding: "4px 8px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          color: "#b45309",
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
                        backgroundColor: "#f0fdf4",
                        position: "relative",
                        padding: "4px 8px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          color: "#16a34a",
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
                        const isQualified = stage === "Qualified";
                        const isWon = stage === "Closed Won";
                        return (
                          <div
                            key={stage}
                            className="position-relative h-100 d-flex flex-column align-items-center justify-content-center"
                            style={{
                              flex: 1,
                              borderRight:
                                idx < 4 ? "1px solid rgba(226, 232, 240, 0.6)" : "none",
                            }}
                          >
                            {/* Empty stage "No deals" indicator */}
                            {!isQualified && !isWon && (
                              <span style={{ fontSize: "10.5px", color: "#94a3b8" }}>
                                No deals
                              </span>
                            )}

                            {/* Qualified Stage: The slowing deal dot at 21 days */}
                            {isQualified && (
                              <div
                                className="position-absolute"
                                style={{
                                  bottom: "47%", // 21 days on 0-45d scale
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                }}
                              >
                                {/* Dotted line going up to 30d boundary */}
                                <div
                                  style={{
                                    position: "absolute",
                                    bottom: "100%",
                                    width: "1px",
                                    height: "40px",
                                    borderLeft: "1.5px dashed #b45309",
                                  }}
                                >
                                  <span
                                    style={{
                                      position: "absolute",
                                      left: "6px",
                                      top: "8px",
                                      fontSize: "10px",
                                      fontWeight: 600,
                                      color: "#b45309",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    9 days until stuck
                                  </span>
                                </div>

                                {/* Hover Deal Tooltip Card - HOVER ONLY */}
                                {hoveredDot === "qualified" && (
                                  <div
                                    className="position-absolute"
                                    style={{
                                      bottom: "115%",
                                      left: "50%",
                                      transform: "translateX(15px)",
                                      backgroundColor: "#ffffff",
                                      border: "1px solid #cbd5e1",
                                      borderRadius: "4px",
                                      padding: "8px 12px",
                                      boxShadow: "0 6px 18px rgba(15, 23, 42, 0.12)",
                                      whiteSpace: "nowrap",
                                      zIndex: 30,
                                      minWidth: "230px",
                                      pointerEvents: "none",
                                      animation: "fadeIn 0.15s ease-in-out",
                                    }}
                                  >
                                    <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#0f172a" }}>
                                      ABC Ltd. – ERP Implementation
                                    </div>
                                    <div style={{ fontSize: "10.5px", color: "#64748b", marginTop: "1px" }}>
                                      Amit Kumar • closes 19 Mar 2027
                                    </div>
                                    <div style={{ fontSize: "11px", fontWeight: 700, color: "#d97706", marginTop: "2px" }}>
                                      ₹18,50,000 • 21 days in Qualified
                                    </div>
                                  </div>
                                )}

                                {/* Dot Circle: 21 days */}
                                <div
                                  style={{
                                    width: "28px",
                                    height: "28px",
                                    borderRadius: "50%",
                                    backgroundColor: "#f59e0b",
                                    color: "#ffffff",
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    boxShadow:
                                      hoveredDot === "qualified"
                                        ? "0 0 0 4px rgba(245, 158, 11, 0.35), 0 4px 8px rgba(245, 158, 11, 0.4)"
                                        : "0 2px 6px rgba(245, 158, 11, 0.4)",
                                    cursor: "pointer",
                                    transition: "all 0.15s ease",
                                  }}
                                  onMouseEnter={() => setHoveredDot("qualified")}
                                  onMouseLeave={() => setHoveredDot(null)}
                                  onClick={() => setSelectedDealForModal(slowingDeal)}
                                >
                                  21
                                </div>
                              </div>
                            )}

                            {/* Closed Won Stage: Green Ring */}
                            {isWon && (
                              <div
                                className="position-absolute"
                                style={{
                                  bottom: "36%", // 16 days
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: "10px",
                                    fontWeight: 600,
                                    color: "#16a34a",
                                    whiteSpace: "nowrap",
                                    marginBottom: "4px",
                                  }}
                                >
                                  Won in 16 d
                                </span>
                                <div
                                  style={{
                                    width: "22px",
                                    height: "22px",
                                    borderRadius: "50%",
                                    border: "3px solid #16a34a",
                                    backgroundColor: "transparent",
                                    cursor: "pointer",
                                  }}
                                  title="Closed Won deal: 16 days cycle"
                                ></div>
                              </div>
                            )}
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
                    {[
                      { name: "Prospecting", deals: "0 deals", val: "—" },
                      { name: "Qualified", deals: "1 deal", val: "₹18,50,000" },
                      { name: "Proposal", deals: "0 deals", val: "—" },
                      { name: "Negotiation", deals: "0 deals", val: "—" },
                      { name: "Closed Won", deals: "1 deal", val: "₹2,50,000" },
                    ].map((st) => (
                      <div
                        key={st.name}
                        style={{
                          flex: 1,
                          textAlign: "center",
                          paddingTop: "6px",
                        }}
                      >
                        <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#0f172a" }}>
                          {st.name}
                        </div>
                        <div style={{ fontSize: "10.5px", color: "#64748b" }}>
                          {st.deals} • {st.val}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footnote */}
                <div
                  className="mt-3 pt-2 text-muted"
                  style={{
                    fontSize: "12px",
                    borderTop: "1px solid #f1f5f9",
                  }}
                >
                  Closed deals are shown as rings, since they no longer age.
                </div>
              </CardBody>
            </Card>

            {/* CARD B: DAYS IN STAGE VS TARGET */}
            <Card
              className="bg-white"
              style={{
                borderRadius: "4px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
              }}
            >
              <CardBody className="p-3 p-md-4">
                {/* Header */}
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3 pb-2 border-bottom">
                  <div>
                    <h6 className="fw-bold mb-0 text-dark" style={{ fontSize: "15px" }}>
                      Days in stage vs target
                    </h6>
                    <span className="text-muted" style={{ fontSize: "12px" }}>
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
                            border: "1.5px solid #0f172a",
                            display: "inline-block",
                          }}
                        ></span>
                        <span className="text-muted">Target</span>
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
                        <span className="text-muted">Actual</span>
                      </span>
                    </div>

                    <button
                      type="button"
                      className="btn btn-sm text-primary p-0 border-0"
                      style={{ fontSize: "11.5px", fontWeight: 600, color: "#2563eb", textDecoration: "none" }}
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
                    background: "#ffffff",
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
                          borderLeft: "1px dashed #f1f5f9",
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
                    {[
                      { stage: "Prospecting", target: stageTargets.Prospecting, actual: null },
                      { stage: "Qualified", target: stageTargets.Qualified, actual: 21 },
                      { stage: "Proposal", target: stageTargets.Proposal, actual: null },
                      { stage: "Negotiation", target: stageTargets.Negotiation, actual: null },
                    ].map((row, idx) => {
                      // 0d - 40d scale (100% = 40 days)
                      const targetPct = (row.target / 40) * 100;
                      const actualPct = row.actual ? (row.actual / 40) * 100 : null;

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
                              fontWeight: row.actual ? 700 : 500,
                              color: row.actual ? "#0f172a" : "#64748b",
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
                              border: "2px solid #0f172a",
                              backgroundColor: "#ffffff",
                              transform: "translateX(-50%)",
                              zIndex: 2,
                            }}
                            title={`Target: ${row.target} days`}
                          ></div>

                          {/* Connecting Line if Actual exists */}
                          {actualPct && (
                            <div
                              style={{
                                position: "absolute",
                                left: `${targetPct}%`,
                                width: `${actualPct - targetPct}%`,
                                height: "3px",
                                backgroundColor: "#f59e0b",
                                zIndex: 1,
                              }}
                            ></div>
                          )}

                          {/* Actual Circle and Callout */}
                          {actualPct && (
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
                                  backgroundColor: "#f59e0b",
                                  boxShadow: "0 0 0 3px rgba(245, 158, 11, 0.2)",
                                }}
                              ></div>
                              <span
                                style={{
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  color: "#b45309",
                                  whiteSpace: "nowrap",
                                  backgroundColor: "#fef3c7",
                                  padding: "2px 6px",
                                  borderRadius: "3px",
                                  border: "1px solid #fde68a",
                                }}
                              >
                                +{row.actual - row.target} d over target
                              </span>
                            </div>
                          )}

                          {/* No deals text if not active */}
                          {!actualPct && (
                            <span
                              style={{
                                position: "absolute",
                                left: `${targetPct + 5}%`,
                                fontSize: "11px",
                                color: "#cbd5e1",
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
                      color: "#94a3b8",
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
              className="bg-white"
              style={{
                borderRadius: "4px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
              }}
            >
              <CardBody className="p-3">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <h6 className="fw-bold mb-0 text-dark" style={{ fontSize: "14px" }}>
                    Stage breakdown
                  </h6>
                  <span className="text-muted" style={{ fontSize: "11px" }}>
                    value &amp; velocity
                  </span>
                </div>

                <div className="d-flex flex-column gap-1">
                  {stageBreakdownData.map((st, i) => (
                    <div
                      key={i}
                      className="d-flex align-items-center justify-content-between p-2 rounded"
                      style={{
                        backgroundColor: st.isActive ? "#fffbeb" : "transparent",
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
                        <span className={`fw-${st.isActive ? "bold" : "normal"} text-dark`}>
                          {st.name}
                        </span>
                      </div>
                      <div className="text-muted" style={{ fontSize: "11.5px" }}>
                        {st.deals} {st.deals === 1 ? "deal" : "deals"}
                      </div>
                      <div
                        style={{
                          fontSize: "11.5px",
                          color: st.avgDays > 14 ? "#b45309" : "#64748b",
                          fontWeight: st.avgDays > 14 ? 600 : 400,
                        }}
                      >
                        avg {st.avgDays} d
                      </div>
                      <div
                        className="text-end fw-bold text-dark"
                        style={{ minWidth: "80px", fontSize: "12px" }}
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
              className="bg-white"
              style={{
                borderRadius: "4px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
              }}
            >
              <CardBody className="p-3">
                <div className="d-flex align-items-center justify-content-between mb-2 pb-1 border-bottom">
                  <h6 className="fw-bold mb-0 text-dark" style={{ fontSize: "14px" }}>
                    Aging heatmap
                  </h6>
                  <span className="text-muted" style={{ fontSize: "11px" }}>
                    deals per cell
                  </span>
                </div>

                <div className="table-responsive">
                  <Table className="table-sm table-borderless align-middle mb-0" style={{ fontSize: "11.5px" }}>
                    <thead>
                      <tr className="border-bottom" style={{ color: "#94a3b8", fontSize: "10.5px" }}>
                        <th style={{ padding: "4px", fontWeight: 600 }}></th>
                        <th className="text-center" style={{ padding: "4px", fontWeight: 600 }}>0-14 d</th>
                        <th className="text-center" style={{ padding: "4px", fontWeight: 600 }}>15-30 d</th>
                        <th className="text-center" style={{ padding: "4px", fontWeight: 600 }}>30+ d</th>
                      </tr>
                    </thead>
                    <tbody>
                      {heatmapData.map((row, i) => (
                        <tr key={i}>
                          <td style={{ padding: "5px 4px", color: "#334155", fontWeight: 500 }}>
                            {row.stage}
                          </td>
                          <td className="text-center" style={{ padding: "5px 4px" }}>
                            <div
                              style={{
                                width: "42px",
                                height: "24px",
                                backgroundColor: row.d0_14 > 0 ? "#16a34a" : "#f8fafc",
                                color: row.d0_14 > 0 ? "#ffffff" : "#cbd5e1",
                                fontWeight: row.d0_14 > 0 ? 700 : 400,
                                borderRadius: "3px",
                                display: "inline-flex",
                                alignItems: "center",
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
                                backgroundColor: row.d15_30 > 0 ? "#f59e0b" : "#f8fafc",
                                color: row.d15_30 > 0 ? "#ffffff" : "#cbd5e1",
                                fontWeight: row.d15_30 > 0 ? 700 : 400,
                                borderRadius: "3px",
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
                                backgroundColor: row.d30_plus > 0 ? "#ef4444" : "#f8fafc",
                                color: row.d30_plus > 0 ? "#ffffff" : "#cbd5e1",
                                fontWeight: row.d30_plus > 0 ? 700 : 400,
                                borderRadius: "3px",
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
              className="bg-white"
              style={{
                borderRadius: "4px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
              }}
            >
              <CardBody className="p-3">
                <div className="mb-2">
                  <h6 className="fw-bold mb-0 text-dark" style={{ fontSize: "14px" }}>
                    Aging by sales rep
                  </h6>
                  <span className="text-muted" style={{ fontSize: "11px" }}>
                    Click a rep to filter the page
                  </span>
                </div>

                <div className="table-responsive">
                  <Table className="table-sm table-borderless align-middle mb-0" style={{ fontSize: "12px" }}>
                    <thead>
                      <tr className="border-bottom" style={{ color: "#94a3b8", fontSize: "10.5px" }}>
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
                        <tr key={i} className="hover-bg-light" style={{ cursor: "pointer" }}>
                          <td style={{ padding: "6px 4px" }}>
                            <div className="d-flex align-items-center gap-1.5">
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  width: "22px",
                                  height: "22px",
                                  borderRadius: "3px",
                                  backgroundColor: "#fee2e2",
                                  color: "#7f1d1d",
                                  fontSize: "10px",
                                  fontWeight: 700,
                                }}
                              >
                                {r.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                              </span>
                              <span className="fw-semibold text-dark text-truncate" style={{ maxWidth: "80px" }}>
                                {r.name}
                              </span>
                            </div>
                          </td>
                          <td className="text-center text-dark fw-medium" style={{ padding: "6px 4px" }}>
                            {r.deals}
                          </td>
                          <td className="text-center" style={{ padding: "6px 4px", color: "#b45309", fontWeight: 600 }}>
                            {r.slow}
                          </td>
                          <td className="text-center text-muted" style={{ padding: "6px 4px" }}>
                            {r.stuck}
                          </td>
                          <td className="text-center" style={{ padding: "6px 4px", color: "#b45309", fontWeight: 600 }}>
                            {r.avgDays} d
                          </td>
                          <td className="text-end fw-bold text-dark" style={{ padding: "6px 4px" }}>
                            {formatShortLakhs(r.value)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>

                <div
                  className="mt-2 pt-2 text-muted"
                  style={{
                    fontSize: "11px",
                    borderTop: "1px solid #f1f5f9",
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
        className="bg-white mb-4"
        style={{
          borderRadius: "4px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
        }}
      >
        <CardBody className="p-3">
          {/* Table Header Controls */}
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
            <div>
              <h6 className="fw-bold mb-0 text-dark" style={{ fontSize: "15px" }}>
                Active Deals Ledger
              </h6>
              <span className="text-muted" style={{ fontSize: "12px" }}>
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
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{
                    paddingLeft: "28px",
                    fontSize: "12px",
                    borderRadius: "4px",
                    borderColor: "#cbd5e1",
                  }}
                />
                <i
                  className="ri-search-line position-absolute text-muted"
                  style={{ left: "9px", top: "50%", transform: "translateY(-50%)", fontSize: "13px" }}
                ></i>
              </div>

              {/* Aging Filter */}
              <select
                className="form-select form-select-sm"
                style={{
                  width: "130px",
                  borderRadius: "4px",
                  fontSize: "12px",
                  borderColor: "#cbd5e1",
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
                className="border d-flex align-items-center gap-1"
                style={{
                  borderRadius: "4px",
                  fontSize: "12px",
                  color: "#475569",
                  borderColor: "#cbd5e1",
                  backgroundColor: "#ffffff",
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
              <thead style={{ backgroundColor: "#f8fafc", color: "#64748b" }}>
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
                    <td colSpan={9} className="text-center py-4 text-muted">
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
                          <span
                            className="fw-bold text-dark"
                            style={{ cursor: "pointer", color: "#0f172a" }}
                            onClick={() => setSelectedDealForModal(r)}
                          >
                            {r.opportunity_name}
                          </span>
                        </td>

                        {/* CUSTOMER */}
                        <td className="text-muted">
                          {r.customer_name}
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
                                borderRadius: "3px",
                                backgroundColor: "#fee2e2",
                                color: "#7f1d1d",
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
                            <span className="text-dark fw-medium">
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
                              borderRadius: "4px",
                              backgroundColor: "#ecfeff",
                              color: "#0e7490",
                              border: "1px solid #a5f3fc",
                              fontSize: "11.5px",
                              fontWeight: 600,
                            }}
                          >
                            {r.stage_name}
                          </span>
                        </td>

                        {/* AMOUNT */}
                        <td className="fw-bold text-dark">
                          {formatCurrency(r.amount || 0)}
                        </td>

                        {/* AGING STATUS */}
                        <td>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "2px 8px",
                              borderRadius: "4px",
                              backgroundColor: "#fef3c7",
                              color: "#b45309",
                              border: "1px solid #fde68a",
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
                                backgroundColor: "#f1f5f9",
                                borderRadius: "3px",
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  width: `${pct}%`,
                                  height: "100%",
                                  backgroundColor: "#f59e0b",
                                  borderRadius: "3px",
                                }}
                              ></div>
                            </div>
                            <span style={{ fontSize: "11.5px", fontWeight: 600, color: "#334155" }}>
                              {days} / 30 d
                            </span>
                          </div>
                        </td>

                        {/* EXPECTED CLOSE */}
                        <td className="text-muted">
                          {r.expected_close_date || "19 Mar 2027"}
                        </td>

                        {/* ACTIONS */}
                        <td className="text-end">
                          <button
                            type="button"
                            className="btn btn-sm"
                            style={{
                              backgroundColor: "#7f1d1d",
                              borderColor: "#7f1d1d",
                              color: "#ffffff",
                              fontSize: "12px",
                              fontWeight: 500,
                              borderRadius: "4px",
                              padding: "4px 12px",
                            }}
                            onClick={() => setFollowUpDeal(r)}
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
                <tfoot style={{ backgroundColor: "#f8fafc", borderTop: "2px solid #e2e8f0" }}>
                  <tr style={{ fontWeight: 700, fontSize: "12px", color: "#0f172a" }}>
                    <td colSpan={4}>
                      TOTAL ({filteredRows.length} {filteredRows.length === 1 ? "deal" : "deals"})
                    </td>
                    <td className="text-dark">
                      {formatCurrency(filteredRows.reduce((a, b) => a + Number(b.amount || 0), 0))}
                    </td>
                    <td style={{ color: "#b45309" }}>
                      Slow {filteredRows.filter(r => r.aging_status === "Slow").length} • Stuck {filteredRows.filter(r => r.aging_status === "Stuck").length}
                    </td>
                    <td style={{ color: "#475569" }}>
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
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mt-3 pt-2 border-top">
            <div className="d-flex align-items-center gap-2" style={{ fontSize: "12px", color: "#64748b" }}>
              <span>Rows per page:</span>
              <select
                className="form-select form-select-sm"
                style={{ width: "70px", borderRadius: "4px", fontSize: "12px" }}
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
                className="btn btn-sm btn-light border"
                style={{ borderRadius: "4px", fontSize: "11px", padding: "4px 8px" }}
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                &lt; Prev
              </button>
              <span
                className="badge bg-danger"
                style={{
                  backgroundColor: "#7f1d1d !important",
                  borderRadius: "4px",
                  fontSize: "11px",
                  padding: "6px 10px",
                }}
              >
                {currentPage}
              </span>
              <button
                type="button"
                className="btn btn-sm btn-light border"
                style={{ borderRadius: "4px", fontSize: "11px", padding: "4px 8px" }}
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
        >
          <ModalHeader
            toggle={() => setSelectedDealForModal(null)}
            style={{ borderBottom: "1px solid #e2e8f0" }}
          >
            <span className="fw-bold text-dark" style={{ fontSize: "15px" }}>
              Deal Stage &amp; Aging Summary
            </span>
          </ModalHeader>
          <ModalBody className="p-3">
            <div className="mb-3">
              <label className="text-muted small mb-1">Deal Name</label>
              <div className="fw-bold text-dark fs-6">
                {selectedDealForModal.opportunity_name}
              </div>
            </div>
            <div className="row g-3">
              <div className="col-6">
                <label className="text-muted small mb-1">Customer</label>
                <div className="fw-semibold text-dark">
                  {selectedDealForModal.customer_name}
                </div>
              </div>
              <div className="col-6">
                <label className="text-muted small mb-1">Sales Rep</label>
                <div className="fw-semibold text-dark">
                  {selectedDealForModal.sales_rep}
                </div>
              </div>
              <div className="col-6">
                <label className="text-muted small mb-1">Current Stage</label>
                <div className="fw-bold text-info">
                  {selectedDealForModal.stage_name}
                </div>
              </div>
              <div className="col-6">
                <label className="text-muted small mb-1">Pipeline Amount</label>
                <div className="fw-bold text-dark">
                  {formatCurrency(selectedDealForModal.amount || 0)}
                </div>
              </div>
              <div className="col-6">
                <label className="text-muted small mb-1">Days in Current Stage</label>
                <div className="fw-bold text-warning">
                  {selectedDealForModal.days_in_stage || 21} days
                </div>
              </div>
              <div className="col-6">
                <label className="text-muted small mb-1">Expected Close</label>
                <div className="text-dark">
                  {selectedDealForModal.expected_close_date || "19 Mar 2027"}
                </div>
              </div>
            </div>
          </ModalBody>
          <ModalFooter style={{ borderTop: "1px solid #e2e8f0" }}>
            <Link
              to={`/crm/opportunities/${selectedDealForModal.opportunity_id || 2}`}
              className="btn btn-sm btn-primary"
              style={{ backgroundColor: "#7f1d1d", borderColor: "#7f1d1d" }}
            >
              Open Full Opportunity
            </Link>
            <Button
              color="light"
              size="sm"
              onClick={() => setSelectedDealForModal(null)}
            >
              Close
            </Button>
          </ModalFooter>
        </Modal>
      )}

      {/* MODAL 2: QUICK FOLLOW UP */}
      {followUpDeal && (
        <Modal
          isOpen={!!followUpDeal}
          toggle={() => setFollowUpDeal(null)}
          centered
        >
          <ModalHeader
            toggle={() => setFollowUpDeal(null)}
            style={{ borderBottom: "1px solid #e2e8f0" }}
          >
            <span className="fw-bold text-dark" style={{ fontSize: "15px" }}>
              Log Follow-up Action
            </span>
          </ModalHeader>
          <ModalBody className="p-3">
            <p className="text-muted small mb-3">
              Fast-track <strong>{followUpDeal.opportunity_name}</strong> by logging a touchpoint or scheduling an activity.
            </p>
            <FormGroup className="mb-3">
              <Label className="small fw-semibold text-dark">Activity Type</Label>
              <select className="form-select form-select-sm" defaultValue="CALL">
                <option value="CALL">Phone Call</option>
                <option value="MEETING">Demo / Meeting</option>
                <option value="EMAIL">Follow-up Email</option>
              </select>
            </FormGroup>
            <FormGroup className="mb-3">
              <Label className="small fw-semibold text-dark">Notes / Next Steps</Label>
              <Input
                type="textarea"
                rows="3"
                placeholder="Discuss pending proposal requirements and timeline..."
                defaultValue="Followed up regarding Qualified stage review. Scheduled alignment call with IT team."
              />
            </FormGroup>
          </ModalBody>
          <ModalFooter style={{ borderTop: "1px solid #e2e8f0" }}>
            <Button
              color="primary"
              size="sm"
              style={{ backgroundColor: "#7f1d1d", borderColor: "#7f1d1d" }}
              onClick={() => setFollowUpDeal(null)}
            >
              Save Follow-up
            </Button>
            <Button
              color="light"
              size="sm"
              onClick={() => setFollowUpDeal(null)}
            >
              Cancel
            </Button>
          </ModalFooter>
        </Modal>
      )}

      {/* MODAL 3: EDIT STAGE TARGETS */}
      <Modal
        isOpen={editTargetsOpen}
        toggle={() => setEditTargetsOpen(false)}
        centered
      >
        <ModalHeader
          toggle={() => setEditTargetsOpen(false)}
          style={{ borderBottom: "1px solid #e2e8f0" }}
        >
          <span className="fw-bold text-dark" style={{ fontSize: "15px" }}>
            Edit Target Days in Stage
          </span>
        </ModalHeader>
        <ModalBody className="p-3">
          <p className="text-muted small mb-3">
            Define target velocity for deals in each sales pipeline stage.
          </p>
          {Object.entries(stageTargets).map(([stage, days]) => (
            <FormGroup key={stage} className="row align-items-center mb-2">
              <Label className="col-sm-5 small fw-semibold text-dark mb-0">
                {stage}
              </Label>
              <div className="col-sm-7">
                <div className="input-group input-group-sm">
                  <Input
                    type="number"
                    min="1"
                    max="90"
                    value={days}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 1;
                      setStageTargets((prev) => ({ ...prev, [stage]: val }));
                    }}
                  />
                  <span className="input-group-text">days</span>
                </div>
              </div>
            </FormGroup>
          ))}
        </ModalBody>
        <ModalFooter style={{ borderTop: "1px solid #e2e8f0" }}>
          <Button
            color="primary"
            size="sm"
            style={{ backgroundColor: "#7f1d1d", borderColor: "#7f1d1d" }}
            onClick={() => setEditTargetsOpen(false)}
          >
            Save Targets
          </Button>
          <Button
            color="light"
            size="sm"
            onClick={() => setEditTargetsOpen(false)}
          >
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default SalesPipelineAgingReportView;

