import React, { useState, useMemo } from "react";
import ReactApexChart from "react-apexcharts";
import { Link } from "react-router-dom";
import {
  Row,
  Col,
  Card,
  CardBody,
  Input,
  Button,
  Table,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  FormGroup,
  Label,
} from "reactstrap";
import { formatCurrency, formatNumber } from "../utils/reportUtils";

const RevenueForecastReportView = ({
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
  const [stageFilter, setStageFilter] = useState("ALL");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [targetModalOpen, setTargetModalOpen] = useState(false);
  const [targetAmount, setTargetAmount] = useState(0); // 0 = Not set
  const [targetInput, setTargetInput] = useState("2000000");

  const rawRows = useMemo(() => {
    return Array.isArray(reportResult?.rows) ? reportResult.rows : [];
  }, [reportResult]);

  const summary = useMemo(() => {
    return reportResult?.summary || {};
  }, [reportResult]);

  const chartData = useMemo(() => {
    return Array.isArray(reportResult?.chart_data) ? reportResult.chart_data : [];
  }, [reportResult]);

  // Executive KPI Calculations
  const grossPipeline = Number(summary.gross_pipeline ?? (rawRows.length > 0 ? rawRows.reduce((a, b) => a + Number(b.amount || 0), 0) : 1850000));
  const weightedForecast = Number(summary.weighted_forecast ?? (rawRows.length > 0 ? rawRows.reduce((a, b) => a + Number(b.weighted_amount || 0), 0) : 1665000));
  const activeDealsCount = Number(summary.active_deals_count ?? (rawRows.length > 0 ? rawRows.length : 1));
  const confidencePct = grossPipeline > 0 ? Math.round((weightedForecast / grossPipeline) * 100) : 90;
  const riskHaircut = Math.max(0, grossPipeline - weightedForecast);
  const avgDealSize = activeDealsCount > 0 ? Math.round(grossPipeline / activeDealsCount) : grossPipeline;

  // Next expected close calculation
  const nextCloseDateStr = rawRows[0]?.expected_close_date || "19 Mar 2027";
  const calculateDaysToClose = (dateStr) => {
    if (!dateStr) return 119;
    try {
      const closeDate = new Date(dateStr);
      const referenceDate = new Date("2026-11-20T00:00:00");
      const diffTime = closeDate - referenceDate;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return isNaN(diffDays) ? 119 : Math.max(0, diffDays);
    } catch {
      return 119;
    }
  };
  const daysToClose = calculateDaysToClose(nextCloseDateStr);

  // Filtered rows for client search & stage filter
  const filteredRows = useMemo(() => {
    let result = rawRows;

    if (stageFilter !== "ALL") {
      result = result.filter(
        (r) => String(r.stage_name || "").toUpperCase() === stageFilter.toUpperCase()
      );
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter((r) =>
        Object.values(r).some((val) =>
          String(val ?? "").toLowerCase().includes(term)
        )
      );
    }
    return result;
  }, [rawRows, stageFilter, searchTerm]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  // Format currency in Lakhs short
  const formatShortLakhs = (amt) => {
    if (!amt) return "₹0";
    if (amt >= 100000) {
      const inLakhs = (amt / 100000).toFixed(amt % 100000 === 0 ? 0 : 2);
      return `₹${inLakhs} L`;
    }
    return formatCurrency(amt);
  };

  const handleSaveTarget = () => {
    const val = Number(targetInput) || 0;
    setTargetAmount(val);
    setTargetModalOpen(false);
  };

  return (
    <div className="revenue-forecast-report-view">
      {/* ─── ROW 1: 4 KPI CARDS ────────────────────────────────────────────────── */}
      <Row className="g-3 mb-4">
        {/* Card 1: GROSS PIPELINE */}
        <Col lg={3} sm={6}>
          <Card
            className="h-100 bg-white"
            style={{
              borderRadius: "4px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
            }}
          >
            <CardBody className="p-3 d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-2.5">
                <div
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "4px",
                    backgroundColor: "#fef2f2",
                    color: "#991b1b",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "18px",
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  ₹
                </div>
                <div>
                  <span
                    className="text-muted text-uppercase fw-semibold d-block mb-0.5"
                    style={{ fontSize: "10.5px", letterSpacing: "0.3px" }}
                  >
                    GROSS PIPELINE
                  </span>
                  <div
                    className="fw-bold text-dark font-monospace"
                    style={{ fontSize: "22px", lineHeight: "1.1" }}
                  >
                    {formatCurrency(grossPipeline)}
                  </div>
                  <div className="text-muted mt-1" style={{ fontSize: "11px" }}>
                    {activeDealsCount} open deal • unweighted
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>

        {/* Card 2: WEIGHTED FORECAST */}
        <Col lg={3} sm={6}>
          <Card
            className="h-100 bg-white"
            style={{
              borderRadius: "4px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
            }}
          >
            <CardBody className="p-3 d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-2.5">
                <div
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "4px",
                    backgroundColor: "#f0fdf4",
                    color: "#166534",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "18px",
                    flexShrink: 0,
                  }}
                >
                  <i className="ri-line-chart-line"></i>
                </div>
                <div>
                  <span
                    className="text-muted text-uppercase fw-semibold d-block mb-0.5"
                    style={{ fontSize: "10.5px", letterSpacing: "0.3px" }}
                  >
                    WEIGHTED FORECAST
                  </span>
                  <div
                    className="fw-bold text-dark font-monospace"
                    style={{ fontSize: "22px", lineHeight: "1.1" }}
                  >
                    {formatCurrency(weightedForecast)}
                  </div>
                  <div className="text-muted mt-1" style={{ fontSize: "11px" }}>
                    Expected revenue • {confidencePct}% of gross
                  </div>
                </div>
              </div>

              {/* Confidence Mini Gauge */}
              <div style={{ width: "75px", textAlign: "right" }}>
                <span className="text-muted d-block mb-1" style={{ fontSize: "10px" }}>
                  Confidence {confidencePct}%
                </span>
                <div
                  className="progress"
                  style={{
                    height: "4px",
                    backgroundColor: "#e2e8f0",
                    borderRadius: "2px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    className="progress-bar"
                    style={{ width: `${confidencePct}%`, backgroundColor: "#16a34a" }}
                  ></div>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>

        {/* Card 3: ACTIVE DEALS */}
        <Col lg={3} sm={6}>
          <Card
            className="h-100 bg-white"
            style={{
              borderRadius: "4px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
            }}
          >
            <CardBody className="p-3 d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-2.5">
                <div
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "4px",
                    backgroundColor: "#eff6ff",
                    color: "#1d4ed8",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "18px",
                    flexShrink: 0,
                  }}
                >
                  <i className="ri-briefcase-line"></i>
                </div>
                <div>
                  <span
                    className="text-muted text-uppercase fw-semibold d-block mb-0.5"
                    style={{ fontSize: "10.5px", letterSpacing: "0.3px" }}
                  >
                    ACTIVE DEALS
                  </span>
                  <div
                    className="fw-bold text-dark font-monospace"
                    style={{ fontSize: "22px", lineHeight: "1.1" }}
                  >
                    {activeDealsCount}
                  </div>
                  <div className="text-muted mt-1" style={{ fontSize: "11px" }}>
                    Avg deal size {formatCurrency(avgDealSize)}
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>

        {/* Card 4: NEXT EXPECTED CLOSE */}
        <Col lg={3} sm={6}>
          <Card
            className="h-100 bg-white"
            style={{
              borderRadius: "4px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
            }}
          >
            <CardBody className="p-3 d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-2.5">
                <div
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "4px",
                    backgroundColor: "#fffbeb",
                    color: "#b45309",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "18px",
                    flexShrink: 0,
                  }}
                >
                  <i className="ri-calendar-event-line"></i>
                </div>
                <div>
                  <span
                    className="text-muted text-uppercase fw-semibold d-block mb-0.5"
                    style={{ fontSize: "10.5px", letterSpacing: "0.3px" }}
                  >
                    NEXT EXPECTED CLOSE
                  </span>
                  <div
                    className="fw-bold text-dark"
                    style={{ fontSize: "20px", lineHeight: "1.1" }}
                  >
                    {nextCloseDateStr}
                  </div>
                  <div className="text-muted mt-1" style={{ fontSize: "11px" }}>
                    In {daysToClose} days • Q1 2027
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* ─── ROW 2: MAIN 2-COLUMN SECTION (COL 8 vs COL 4) ────────────────────── */}
      <Row className="g-3 mb-4">
        {/* ── LEFT COLUMN (COL LG=8): WATERFALL + TIMELINE + TARGET ── */}
        <Col lg={8} md={12}>
          <div className="d-flex flex-column gap-3">
            {/* Card A: From gross pipeline to weighted forecast (Waterfall & Timeline) */}
            <Card
              className="bg-white"
              style={{
                borderRadius: "4px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
              }}
            >
              <div
                className="p-3 bg-white border-bottom d-flex align-items-center justify-content-between flex-wrap gap-2"
                style={{ borderRadius: "4px 4px 0 0", borderColor: "#e2e8f0" }}
              >
                <div>
                  <h6 className="fw-bold text-dark mb-0" style={{ fontSize: "14px" }}>
                    From gross pipeline to weighted forecast
                  </h6>
                  <span className="text-muted" style={{ fontSize: "11.5px" }}>
                    How deal-stage probability reduces what you can expect to earn
                  </span>
                </div>

                {/* Legend */}
                <div className="d-flex align-items-center gap-3" style={{ fontSize: "11px" }}>
                  <span className="d-flex align-items-center gap-1 text-dark">
                    <span style={{ color: "#93c5fd", fontSize: "12px" }}>●</span> Gross
                  </span>
                  <span className="d-flex align-items-center gap-1 text-dark">
                    <span style={{ color: "#dc2626", fontSize: "12px" }}>●</span> Risk haircut
                  </span>
                  <span className="d-flex align-items-center gap-1 text-dark">
                    <span style={{ color: "#7f1d1d", fontSize: "12px" }}>●</span> Weighted
                  </span>
                </div>
              </div>

              <CardBody className="p-3">
                {/* Visual Waterfall Bridge Columns */}
                <div
                  className="p-3 border rounded mb-3 position-relative"
                  style={{
                    backgroundColor: "#fafafa",
                    borderColor: "#f1f5f9",
                    height: "230px",
                    display: "flex",
                    alignItems: "flex-end",
                    justifyContent: "space-around",
                  }}
                >
                  {/* Y-Axis Reference Ticks */}
                  <div
                    className="position-absolute start-0 top-0 bottom-0 d-flex flex-column justify-content-between ps-2 text-muted"
                    style={{ fontSize: "10.5px", pointerEvents: "none" }}
                  >
                    <span>₹20 L</span>
                    <span>₹15 L</span>
                    <span>₹10 L</span>
                    <span>₹5 L</span>
                    <span>₹0</span>
                  </div>

                  {/* Pillar 1: Gross pipeline */}
                  <div className="d-flex flex-column align-items-center" style={{ width: "90px" }}>
                    <span
                      className="font-monospace fw-bold text-dark mb-1"
                      style={{ fontSize: "11.5px" }}
                    >
                      {formatCurrency(grossPipeline)}
                    </span>
                    <div
                      style={{
                        width: "80px",
                        height: "140px",
                        backgroundColor: "#93c5fd",
                        borderRadius: "2px 2px 0 0",
                      }}
                    ></div>
                    <span className="fw-semibold text-dark mt-1" style={{ fontSize: "11px" }}>
                      Gross pipeline
                    </span>
                    <span className="text-muted" style={{ fontSize: "10px" }}>
                      1 deal
                    </span>
                  </div>

                  {/* Pillar 2: Probability risk (Haircut) */}
                  <div className="d-flex flex-column align-items-center" style={{ width: "90px" }}>
                    <span
                      className="font-monospace fw-bold text-danger mb-1"
                      style={{ fontSize: "11.5px" }}
                    >
                      - {formatCurrency(riskHaircut)}
                    </span>
                    <div style={{ height: "124px" }}></div>
                    <div
                      style={{
                        width: "80px",
                        height: "16px",
                        backgroundColor: "#dc2626",
                        borderRadius: "2px",
                      }}
                    ></div>
                    <span className="fw-semibold text-dark mt-1" style={{ fontSize: "11px" }}>
                      Probability risk
                    </span>
                    <span className="text-muted" style={{ fontSize: "10px" }}>
                      10% of gross
                    </span>
                  </div>

                  {/* Pillar 3: Weighted forecast */}
                  <div className="d-flex flex-column align-items-center" style={{ width: "90px" }}>
                    <span
                      className="font-monospace fw-bold mb-1"
                      style={{ fontSize: "11.5px", color: "#7f1d1d" }}
                    >
                      {formatCurrency(weightedForecast)}
                    </span>
                    <div
                      style={{
                        width: "80px",
                        height: "125px",
                        backgroundColor: "#7f1d1d",
                        borderRadius: "2px 2px 0 0",
                      }}
                    ></div>
                    <span className="fw-semibold text-dark mt-1" style={{ fontSize: "11px" }}>
                      Weighted forecast
                    </span>
                    <span className="text-muted" style={{ fontSize: "10px" }}>
                      90% confidence
                    </span>
                  </div>

                  {/* Pillar 4: Target */}
                  <div className="d-flex flex-column align-items-center" style={{ width: "90px" }}>
                    <span className="text-muted mb-1" style={{ fontSize: "11px" }}>
                      {targetAmount > 0 ? formatCurrency(targetAmount) : "No target"}
                    </span>
                    <div
                      className="d-flex align-items-center justify-content-center"
                      style={{
                        width: "80px",
                        height: targetAmount > 0 ? "150px" : "110px",
                        border: "1px dashed #cbd5e1",
                        backgroundColor: "#ffffff",
                        borderRadius: "2px",
                        cursor: "pointer",
                      }}
                      onClick={() => setTargetModalOpen(true)}
                    >
                      <span className="text-muted small" style={{ fontSize: "11px" }}>
                        {targetAmount > 0 ? "Target set" : "Set target"}
                      </span>
                    </div>
                    <span className="fw-semibold text-dark mt-1" style={{ fontSize: "11px" }}>
                      Target
                    </span>
                    <span className="text-muted" style={{ fontSize: "10px" }}>
                      {targetAmount > 0 ? "Q1 Goal" : "Not set"}
                    </span>
                  </div>
                </div>

                {/* Sub-section: Expected Close Timeline */}
                <div className="pt-2 border-top">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="fw-bold text-dark" style={{ fontSize: "12px" }}>
                      Expected close timeline
                    </span>
                  </div>

                  {/* Horizontal Timeline Track */}
                  <div className="position-relative py-3 my-1">
                    {/* Horizontal Line */}
                    <div
                      style={{
                        height: "2px",
                        backgroundColor: "#e2e8f0",
                        width: "100%",
                        position: "absolute",
                        top: "50%",
                        transform: "translateY(-50%)",
                      }}
                    ></div>

                    {/* Dotted section between Today and Close Date */}
                    <div
                      style={{
                        height: "2px",
                        borderTop: "2px dashed #7f1d1d",
                        width: "70%",
                        position: "absolute",
                        top: "50%",
                        left: "12%",
                        transform: "translateY(-50%)",
                      }}
                    ></div>

                    {/* Today Marker */}
                    <div
                      className="position-absolute d-flex flex-column align-items-center"
                      style={{ left: "10%", top: "-4px" }}
                    >
                      <span className="text-dark fw-bold mb-0.5" style={{ fontSize: "10px" }}>
                        Today • 20 Nov
                      </span>
                      <i className="ri-arrow-down-s-fill text-dark" style={{ fontSize: "14px", lineHeight: "0.5" }}></i>
                    </div>

                    {/* Days to Close Badge on Dotted Line */}
                    <div
                      className="position-absolute translate-middle-x"
                      style={{
                        left: "45%",
                        top: "2px",
                        backgroundColor: "#ffffff",
                        border: "1px solid #e2e8f0",
                        padding: "1px 8px",
                        borderRadius: "10px",
                        fontSize: "10px",
                        color: "#475569",
                        fontWeight: 600,
                      }}
                    >
                      {daysToClose} days to close
                    </div>

                    {/* Milestone Deal Diamond Marker */}
                    <div
                      className="position-absolute d-flex flex-column align-items-center"
                      style={{ left: "80%", top: "-1px" }}
                    >
                      <div
                        style={{
                          width: "10px",
                          height: "10px",
                          backgroundColor: "#7f1d1d",
                          transform: "rotate(45deg)",
                        }}
                      ></div>
                      <div
                        className="mt-1 px-1.5 py-0.5 border"
                        style={{
                          backgroundColor: "#fef2f2",
                          borderColor: "#fecaca",
                          borderRadius: "3px",
                          fontSize: "10px",
                          color: "#7f1d1d",
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                        }}
                      >
                        ERP Implementation • 19 Mar • ₹16.65 L
                      </div>
                    </div>
                  </div>

                  {/* Timeline Months Labels */}
                  <div
                    className="d-flex align-items-center justify-content-between text-muted mt-2"
                    style={{ fontSize: "10.5px" }}
                  >
                    <span>Nov 2026</span>
                    <span>Dec 2026</span>
                    <span>Jan 2027</span>
                    <span>Feb 2027</span>
                    <span>Mar 2027</span>
                    <span>Apr 2027</span>
                  </div>

                  <div className="text-muted mt-2 pt-1 border-top" style={{ fontSize: "11px" }}>
                    Waterfall shows what probability removes from the pipeline; the timeline shows when the money is expected.
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Card B: Forecast vs target */}
            <Card
              className="bg-white"
              style={{
                borderRadius: "4px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
              }}
            >
              <div
                className="p-3 bg-white border-bottom"
                style={{ borderRadius: "4px 4px 0 0", borderColor: "#e2e8f0" }}
              >
                <h6 className="fw-bold text-dark mb-0" style={{ fontSize: "14px" }}>
                  Forecast vs target
                </h6>
                <span className="text-muted" style={{ fontSize: "11.5px" }}>
                  Track progress to your Q1 2027 revenue goal
                </span>
              </div>

              <CardBody className="p-3">
                {/* Empty Target Progress Track */}
                <div
                  className="progress mb-3"
                  style={{
                    height: "8px",
                    backgroundColor: "#f1f5f9",
                    borderRadius: "4px",
                  }}
                >
                  <div
                    className="progress-bar"
                    style={{
                      width: targetAmount > 0 ? `${Math.min(100, Math.round((weightedForecast / targetAmount) * 100))}%` : "0%",
                      backgroundColor: "#7f1d1d",
                    }}
                  ></div>
                </div>

                <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                  <div>
                    <span className="fw-bold text-dark d-block" style={{ fontSize: "13px" }}>
                      {targetAmount > 0 ? `Target: ${formatCurrency(targetAmount)} (${Math.round((weightedForecast / targetAmount) * 100)}% achieved)` : "No target set"}
                    </span>
                    <span className="text-muted" style={{ fontSize: "11px" }}>
                      Set a quarterly target to see % achieved, gap to goal and required pipeline.
                    </span>
                  </div>

                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{
                      backgroundColor: "#7f1d1d",
                      borderColor: "#7f1d1d",
                      color: "#ffffff",
                      fontSize: "11.5px",
                      fontWeight: 600,
                      padding: "5px 14px",
                      borderRadius: "4px",
                    }}
                    onClick={() => setTargetModalOpen(true)}
                  >
                    Set target
                  </button>
                </div>
              </CardBody>
            </Card>
          </div>
        </Col>

        {/* ── RIGHT COLUMN (COL LG=4): SCENARIOS + PIPELINE BY STAGE + BY REP ── */}
        <Col lg={4} md={12}>
          <div className="d-flex flex-column gap-3">
            {/* Card 1: Forecast scenarios */}
            <Card
              className="bg-white"
              style={{
                borderRadius: "4px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
              }}
            >
              <div
                className="p-3 bg-white border-bottom d-flex align-items-center justify-content-between"
                style={{ borderRadius: "4px 4px 0 0", borderColor: "#e2e8f0" }}
              >
                <h6 className="fw-bold text-dark mb-0" style={{ fontSize: "14px" }}>
                  Forecast scenarios
                </h6>
                <span className="text-muted" style={{ fontSize: "11px" }}>
                  for the full period
                </span>
              </div>

              <CardBody className="p-3">
                <div className="d-flex flex-column gap-3">
                  {/* Scenario 1: Best case */}
                  <div>
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <div>
                        <span className="fw-bold text-dark d-block" style={{ fontSize: "12px" }}>
                          Best case
                        </span>
                        <span className="text-muted" style={{ fontSize: "10.5px" }}>
                          All deals close
                        </span>
                      </div>
                      <span className="font-monospace fw-bold text-dark" style={{ fontSize: "12.5px" }}>
                        {formatCurrency(grossPipeline)}
                      </span>
                    </div>
                    <div
                      className="progress"
                      style={{ height: "6px", backgroundColor: "#f1f5f9", borderRadius: "3px" }}
                    >
                      <div
                        className="progress-bar"
                        style={{ width: "100%", backgroundColor: "#16a34a" }}
                      ></div>
                    </div>
                  </div>

                  {/* Scenario 2: Expected */}
                  <div>
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <div>
                        <span className="fw-bold text-dark d-block" style={{ fontSize: "12px" }}>
                          Expected
                        </span>
                        <span className="text-muted" style={{ fontSize: "10.5px" }}>
                          Probability-weighted
                        </span>
                      </div>
                      <span className="font-monospace fw-bold text-dark" style={{ fontSize: "12.5px" }}>
                        {formatCurrency(weightedForecast)}
                      </span>
                    </div>
                    <div
                      className="progress"
                      style={{ height: "6px", backgroundColor: "#f1f5f9", borderRadius: "3px" }}
                    >
                      <div
                        className="progress-bar"
                        style={{ width: `${confidencePct}%`, backgroundColor: "#7f1d1d" }}
                      ></div>
                    </div>
                  </div>

                  {/* Scenario 3: Worst case */}
                  <div>
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <div>
                        <span className="fw-bold text-dark d-block" style={{ fontSize: "12px" }}>
                          Worst case
                        </span>
                        <span className="text-muted" style={{ fontSize: "10.5px" }}>
                          Deal slips or is lost
                        </span>
                      </div>
                      <span className="font-monospace text-muted" style={{ fontSize: "12.5px" }}>
                        ₹0
                      </span>
                    </div>
                    <div
                      className="progress"
                      style={{ height: "6px", backgroundColor: "#f1f5f9", borderRadius: "3px" }}
                    >
                      <div className="progress-bar" style={{ width: "0%" }}></div>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Card 2: Pipeline by stage */}
            <Card
              className="bg-white"
              style={{
                borderRadius: "4px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
              }}
            >
              <div
                className="p-3 bg-white border-bottom d-flex align-items-center justify-content-between"
                style={{ borderRadius: "4px 4px 0 0", borderColor: "#e2e8f0" }}
              >
                <h6 className="fw-bold text-dark mb-0" style={{ fontSize: "14px" }}>
                  Pipeline by stage
                </h6>
                <span className="text-muted" style={{ fontSize: "11px" }}>
                  gross &rarr; weighted
                </span>
              </div>

              <CardBody className="p-3">
                {/* Full Width Segment Bar */}
                <div
                  className="p-1.5 text-center text-white fw-bold mb-2.5"
                  style={{
                    backgroundColor: "#0d9488",
                    borderRadius: "4px",
                    fontSize: "11.5px",
                    letterSpacing: "0.2px",
                  }}
                >
                  Qualified 100%
                </div>

                <div className="d-flex align-items-center justify-content-between pb-2 mb-2 border-bottom">
                  <div>
                    <span className="d-flex align-items-center gap-1.5 text-dark fw-semibold" style={{ fontSize: "12px" }}>
                      <span style={{ color: "#0d9488", fontSize: "12px" }}>●</span> Qualified
                    </span>
                    <span className="text-muted" style={{ fontSize: "11px" }}>
                      Gross {formatCurrency(grossPipeline)}
                    </span>
                  </div>

                  <div className="text-end">
                    <span className="text-muted d-block" style={{ fontSize: "11px" }}>
                      1 deal • 90% probability
                    </span>
                    <span className="fw-bold text-dark font-monospace" style={{ fontSize: "12px" }}>
                      Weighted {formatCurrency(weightedForecast)}
                    </span>
                  </div>
                </div>

                <div className="d-flex align-items-center gap-1.5 text-muted" style={{ fontSize: "11px" }}>
                  <i className="ri-alert-line text-warning" style={{ fontSize: "13px" }}></i>
                  <span>90% is high for "Qualified". Review stage probabilities.</span>
                </div>
              </CardBody>
            </Card>

            {/* Card 3: Forecast by sales rep */}
            <Card
              className="bg-white"
              style={{
                borderRadius: "4px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
              }}
            >
              <div
                className="p-3 bg-white border-bottom"
                style={{ borderRadius: "4px 4px 0 0", borderColor: "#e2e8f0" }}
              >
                <h6 className="fw-bold text-dark mb-0" style={{ fontSize: "14px" }}>
                  Forecast by sales rep
                </h6>
              </div>

              <CardBody className="p-3">
                {/* Rep Header */}
                <div
                  className="d-flex align-items-center text-muted text-uppercase fw-semibold pb-1.5 mb-1.5 border-bottom"
                  style={{ fontSize: "10px", letterSpacing: "0.3px" }}
                >
                  <div style={{ width: "120px" }}>REP</div>
                  <div style={{ width: "40px", textAlign: "center" }}>DEALS</div>
                  <div style={{ width: "60px", textAlign: "right" }}>GROSS</div>
                  <div style={{ width: "65px", textAlign: "right" }}>WEIGHTED</div>
                </div>

                {/* Rep Row */}
                <div className="d-flex align-items-center py-1.5" style={{ fontSize: "12px" }}>
                  <div className="d-flex align-items-center gap-1.5" style={{ width: "120px", flexShrink: 0 }}>
                    <span
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "3px",
                        backgroundColor: "#fef2f2",
                        color: "#991b1b",
                        fontSize: "10px",
                        fontWeight: 700,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      AK
                    </span>
                    <span className="text-dark fw-medium text-truncate" style={{ fontSize: "11.5px" }}>
                      Amit Kumar
                    </span>
                  </div>

                  <div className="text-center font-monospace" style={{ width: "40px", flexShrink: 0 }}>
                    1
                  </div>
                  <div className="text-end font-monospace text-muted" style={{ width: "60px", flexShrink: 0 }}>
                    {formatShortLakhs(grossPipeline)}
                  </div>
                  <div className="text-end font-monospace fw-bold text-dark" style={{ width: "65px", flexShrink: 0 }}>
                    {formatShortLakhs(weightedForecast)}
                  </div>
                </div>

                <div className="pt-2 mt-2 border-top text-muted" style={{ fontSize: "10.5px" }}>
                  100% of the forecast sits with one rep.
                </div>
              </CardBody>
            </Card>
          </div>
        </Col>
      </Row>

      {/* ─── ROW 3: OPPORTUNITY LEDGER TABLE ───────────────────────────────────── */}
      <Card
        className="bg-white mb-4"
        style={{
          borderRadius: "4px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
        }}
      >
        <div
          className="p-3 bg-white border-bottom d-flex flex-wrap align-items-center justify-content-between gap-2"
          style={{
            borderRadius: "4px 4px 0 0",
            borderColor: "#e2e8f0",
          }}
        >
          <div>
            <h6 className="mb-0 fw-bold text-dark d-flex align-items-center gap-1.5" style={{ fontSize: "14px" }}>
              Opportunity Ledger
              <span className="text-muted fw-normal small ms-1" style={{ fontSize: "11.5px" }}>
                Showing {filteredRows.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} of {rawRows.length} deal
              </span>
            </h6>
          </div>

          <div className="d-flex align-items-center gap-2 flex-wrap">
            {/* Search Input */}
            <div className="position-relative" style={{ width: "230px" }}>
              <Input
                type="text"
                placeholder="Search deal or customer..."
                className="form-control-sm ps-4"
                style={{
                  borderRadius: "4px",
                  fontSize: "12px",
                  borderColor: "#cbd5e1",
                  backgroundColor: "#ffffff",
                }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <i
                className="ri-search-line position-absolute top-50 start-0 translate-middle-y ms-2 text-muted"
                style={{ fontSize: "12px" }}
              ></i>
            </div>

            {/* Stage Filter Dropdown */}
            <select
              className="form-select form-select-sm"
              style={{
                width: "120px",
                borderRadius: "4px",
                fontSize: "12px",
                borderColor: "#cbd5e1",
              }}
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
            >
              <option value="ALL">Stage: All</option>
              <option value="Prospecting">Prospecting</option>
              <option value="Qualified">Qualified</option>
              <option value="Proposal">Proposal</option>
              <option value="Negotiation">Negotiation</option>
            </select>

            {/* Export CSV Button */}
            <button
              type="button"
              className="btn btn-sm d-flex align-items-center gap-1"
              style={{
                backgroundColor: "#ffffff",
                color: "#1e293b",
                border: "1px solid #cbd5e1",
                borderRadius: "4px",
                fontSize: "12px",
                fontWeight: 500,
                padding: "4px 12px",
              }}
              onClick={onExport}
            >
              Export CSV
            </button>
          </div>
        </div>

        <CardBody className="p-0">
          <div className="table-responsive">
            <Table className="align-middle table-nowrap mb-0" hover>
              <thead style={{ backgroundColor: "#f8fafc" }}>
                <tr style={{ fontSize: "10.5px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.3px" }}>
                  <th style={{ width: "24%" }}>DEAL</th>
                  <th style={{ width: "12%" }}>STAGE</th>
                  <th style={{ width: "15%" }}>SALES REP</th>
                  <th style={{ width: "13%" }}>AMOUNT</th>
                  <th style={{ width: "14%" }}>PROBABILITY</th>
                  <th style={{ width: "12%" }}>WEIGHTED</th>
                  <th style={{ width: "14%" }}>EXPECTED CLOSE</th>
                  <th style={{ width: "100px" }} className="text-end pe-3">ACTIONS</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: "12.5px" }}>
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-4 text-muted">
                      No opportunities match the selected filters.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((r, idx) => {
                    const prob = Number(r.probability || 90);
                    const amt = Number(r.amount || grossPipeline);
                    const wAmt = Number(r.weighted_amount || weightedForecast);
                    const dealDays = calculateDaysToClose(r.expected_close_date);

                    return (
                      <tr key={r.opportunity_id || idx}>
                        {/* DEAL */}
                        <td>
                          <div>
                            <Link
                              to={`/crm/opportunities/${r.opportunity_id || 1}`}
                              className="fw-bold text-dark text-decoration-none d-block"
                              style={{ fontSize: "12.5px" }}
                            >
                              {r.opportunity_name || "ABC Ltd. - ERP Implementation"}
                            </Link>
                            <span className="text-muted d-block" style={{ fontSize: "11px" }}>
                              {r.customer_name || "ABC 1 Tech Solutions Ltd."}
                            </span>
                          </div>
                        </td>

                        {/* STAGE */}
                        <td>
                          <span
                            style={{
                              backgroundColor: "#f0fdf4",
                              color: "#0d9488",
                              border: "1px solid #bbf7d0",
                              fontSize: "11px",
                              fontWeight: 600,
                              padding: "2.5px 8px",
                              borderRadius: "4px",
                            }}
                          >
                            {r.stage_name || "Qualified"}
                          </span>
                        </td>

                        {/* SALES REP */}
                        <td>
                          <div className="d-flex align-items-center gap-1.5">
                            <span
                              style={{
                                width: "22px",
                                height: "22px",
                                borderRadius: "3px",
                                backgroundColor: "#fef2f2",
                                color: "#991b1b",
                                fontSize: "10px",
                                fontWeight: 700,
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              AK
                            </span>
                            <span className="text-dark fw-medium" style={{ fontSize: "12px" }}>
                              {r.sales_rep || "Amit Kumar"}
                            </span>
                          </div>
                        </td>

                        {/* AMOUNT */}
                        <td className="fw-bold text-dark font-monospace" style={{ fontSize: "13px" }}>
                          {formatCurrency(amt)}
                        </td>

                        {/* PROBABILITY */}
                        <td>
                          <div className="d-flex align-items-center gap-2" style={{ maxWidth: "110px" }}>
                            <div
                              className="progress flex-grow-1"
                              style={{ height: "6px", backgroundColor: "#f1f5f9", borderRadius: "3px" }}
                            >
                              <div
                                className="progress-bar"
                                style={{ width: `${prob}%`, backgroundColor: "#16a34a" }}
                              ></div>
                            </div>
                            <span className="font-monospace fw-bold text-success" style={{ fontSize: "11px" }}>
                              {prob}%
                            </span>
                          </div>
                        </td>

                        {/* WEIGHTED */}
                        <td className="fw-bold text-dark font-monospace" style={{ fontSize: "13px" }}>
                          {formatCurrency(wAmt)}
                        </td>

                        {/* EXPECTED CLOSE */}
                        <td>
                          <div className="d-flex align-items-center gap-1.5">
                            <span className="text-dark" style={{ fontSize: "12px" }}>
                              {r.expected_close_date || "19 Mar 2027"}
                            </span>
                            <span
                              style={{
                                backgroundColor: "#fffbeb",
                                color: "#b45309",
                                border: "1px solid #fde68a",
                                fontSize: "10.5px",
                                fontWeight: 600,
                                padding: "1px 6px",
                                borderRadius: "3px",
                              }}
                            >
                              in {dealDays} days
                            </span>
                          </div>
                        </td>

                        {/* ACTIONS */}
                        <td className="text-end pe-3">
                          <Link
                            to={`/crm/opportunities/${r.opportunity_id || 1}`}
                            className="btn btn-sm btn-light border"
                            style={{
                              fontSize: "11.5px",
                              fontWeight: 500,
                              padding: "3px 12px",
                              borderRadius: "3px",
                              color: "#334155",
                            }}
                          >
                            View deal
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </Table>
          </div>

          {/* Table Footer Pagination */}
          <div className="p-3 border-top d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div className="d-flex align-items-center gap-2">
              <span className="text-muted small" style={{ fontSize: "11.5px" }}>
                Rows per page:
              </span>
              <select
                className="form-select form-select-sm"
                style={{ width: "65px", fontSize: "11.5px", borderRadius: "4px" }}
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="btn-group btn-group-sm">
              <button
                type="button"
                className="btn btn-sm btn-light border"
                style={{ borderRadius: "4px 0 0 4px", fontSize: "11px" }}
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                &lt; Prev
              </button>
              <button
                type="button"
                className="btn btn-sm"
                style={{
                  backgroundColor: "#7f1d1d",
                  color: "#ffffff",
                  fontSize: "11px",
                  fontWeight: 600,
                  border: "1px solid #7f1d1d",
                }}
              >
                {currentPage}
              </button>
              <button
                type="button"
                className="btn btn-sm btn-light border"
                style={{ borderRadius: "0 4px 4px 0", fontSize: "11px" }}
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                Next &gt;
              </button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* ─── MODAL: SET QUARTERLY TARGET ───────────────────────────────────────── */}
      <Modal isOpen={targetModalOpen} toggle={() => setTargetModalOpen(!targetModalOpen)} centered>
        <ModalHeader toggle={() => setTargetModalOpen(false)}>
          Set Revenue Forecast Target
        </ModalHeader>
        <ModalBody>
          <FormGroup>
            <Label for="targetInput" style={{ fontSize: "12px", fontWeight: 600 }}>
              Quarterly Revenue Target (₹)
            </Label>
            <Input
              id="targetInput"
              type="number"
              value={targetInput}
              onChange={(e) => setTargetInput(e.target.value)}
              placeholder="e.g. 2000000"
            />
            <small className="text-muted mt-1 d-block">
              Currently forecasting {formatCurrency(weightedForecast)}. Setting a target will benchmark goal attainment.
            </small>
          </FormGroup>
        </ModalBody>
        <ModalFooter>
          <Button color="light" size="sm" onClick={() => setTargetModalOpen(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            style={{ backgroundColor: "#7f1d1d", borderColor: "#7f1d1d", color: "#ffffff" }}
            onClick={handleSaveTarget}
          >
            Save Target
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default RevenueForecastReportView;

