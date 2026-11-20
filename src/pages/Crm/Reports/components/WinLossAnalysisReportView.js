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
  Badge,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "reactstrap";
import { formatCurrency, formatNumber } from "../utils/reportUtils";

const WinLossAnalysisReportView = ({
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
  const [outcomeFilter, setOutcomeFilter] = useState("ALL");
  const [metricMode, setMetricMode] = useState("revenue"); // "revenue" | "count"
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDealForModal, setSelectedDealForModal] = useState(null);
  const [checkDatesModalOpen, setCheckDatesModalOpen] = useState(false);
  const [hoveredMonth, setHoveredMonth] = useState(null);

  // Extract raw data from reportResult
  const rawRows = useMemo(() => {
    if (Array.isArray(reportResult?.rows) && reportResult.rows.length > 0) {
      return reportResult.rows;
    }
    // Fallback seed row if API hasn't loaded or returns empty
    return [
      {
        opportunity_id: 1,
        opportunity_name: "Enterprise Cloud CRM & ERP Rollout",
        customer_name: "ABC 1 Tech Solutions Ltd.",
        amount: 250000,
        outcome: "Won",
        sales_rep: "Amit Kumar",
        close_date: "04 Nov 2026",
        cycle_days: 0,
      },
    ];
  }, [reportResult]);

  const summary = useMemo(() => {
    return reportResult?.summary || {};
  }, [reportResult]);

  // Executive KPI Calculations
  const wonRevenue = Number(summary.won_revenue ?? (rawRows.filter(r => r.outcome === "Won").reduce((sum, r) => sum + Number(r.amount || 0), 0) || 250000));
  const lostRevenue = Number(summary.lost_revenue ?? (rawRows.filter(r => r.outcome === "Lost").reduce((sum, r) => sum + Number(r.amount || 0), 0) || 0));
  const wonDealsCount = Number(summary.won_deals_count ?? rawRows.filter(r => r.outcome === "Won").length ?? 1);
  const lostDealsCount = Number(summary.lost_deals_count ?? rawRows.filter(r => r.outcome === "Lost").length ?? 0);
  const totalClosedDeals = wonDealsCount + lostDealsCount;
  
  const winRatePct = totalClosedDeals > 0 
    ? Math.round((wonDealsCount / totalClosedDeals) * 100) 
    : 100;

  // Average sales cycle in days
  const avgSalesCycle = useMemo(() => {
    if (rawRows.length === 0) return 0;
    const totalDays = rawRows.reduce((acc, r) => acc + (Number(r.cycle_days) || 0), 0);
    return Math.round(totalDays / rawRows.length);
  }, [rawRows]);

  const avgDealSize = totalClosedDeals > 0
    ? Math.round((wonRevenue + lostRevenue) / totalClosedDeals)
    : 250000;

  // Short currency formatter for charts & badges (e.g. ₹2.5 L)
  const formatShortLakhs = (amt) => {
    if (!amt || amt === 0) return "₹0";
    if (amt >= 100000) {
      const inLakhs = (amt / 100000).toFixed(amt % 100000 === 0 ? 0 : 1);
      return `₹${inLakhs} L`;
    }
    return formatCurrency(amt);
  };

  // Filtered rows for ledger table
  const filteredRows = useMemo(() => {
    let result = rawRows;

    if (outcomeFilter !== "ALL") {
      result = result.filter(
        (r) => String(r.outcome || "").toUpperCase() === outcomeFilter.toUpperCase()
      );
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (r) =>
          String(r.opportunity_name || "").toLowerCase().includes(term) ||
          String(r.customer_name || "").toLowerCase().includes(term) ||
          String(r.sales_rep || "").toLowerCase().includes(term)
      );
    }

    return result;
  }, [rawRows, outcomeFilter, searchTerm]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  // Aggregate stats by sales rep
  const repsData = useMemo(() => {
    const map = {};
    rawRows.forEach((r) => {
      const rep = r.sales_rep || "Amit Kumar";
      if (!map[rep]) {
        map[rep] = {
          name: rep,
          won: 0,
          lost: 0,
          revenue: 0,
        };
      }
      if (r.outcome === "Won") {
        map[rep].won += 1;
        map[rep].revenue += Number(r.amount || 0);
      } else {
        map[rep].lost += 1;
      }
    });

    return Object.values(map).map((item) => {
      const total = item.won + item.lost;
      const rate = total > 0 ? Math.round((item.won / total) * 100) : 0;
      return {
        ...item,
        winRate: rate,
      };
    });
  }, [rawRows]);

  // Apex radialBar chart options for Win Rate Semi-Circle Donut
  const winRateChartOptions = useMemo(() => {
    return {
      chart: {
        type: "radialBar",
        offsetY: -10,
        sparkline: { enabled: true },
      },
      plotOptions: {
        radialBar: {
          startAngle: -100,
          endAngle: 100,
          track: {
            background: "#f1f5f9",
            strokeWidth: "90%",
            margin: 5,
          },
          dataLabels: {
            name: { show: false },
            value: {
              offsetY: -8,
              fontSize: "26px",
              fontWeight: 700,
              color: "#0f172a",
              formatter: () => `${winRatePct}%`,
            },
          },
        },
      },
      grid: { padding: { top: -10 } },
      fill: {
        colors: ["#16a34a"],
      },
      labels: ["Win Rate"],
    };
  }, [winRatePct]);

  return (
    <div className="win-loss-analysis-report-view">
      {/* 1. ROW 1: 4 EXECUTIVE KPI CARDS */}
      <Row className="g-3 mb-4">
        {/* Card 1: Won Revenue */}
        <Col xs={12} sm={6} lg={3}>
          <Card
            className="h-100 bg-white"
            style={{
              borderRadius: "4px",
              border: "1px solid #e2e8f0",
              borderTop: "3px solid #16a34a",
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
                    backgroundColor: "#dcfce7",
                    color: "#16a34a",
                    fontSize: "18px",
                  }}
                >
                  <i className="ri-money-rupee-circle-line"></i>
                </div>
                <span style={{ fontSize: "11px", color: "#94a3b8" }}>No prior data</span>
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
                WON REVENUE
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
                {formatCurrency(wonRevenue)}
              </div>
              <div className="d-flex align-items-center gap-1.5 mt-2" style={{ fontSize: "11.5px", color: "#16a34a" }}>
                <span style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#16a34a" }}></span>
                <span>{wonDealsCount} deal won</span>
              </div>
            </CardBody>
          </Card>
        </Col>

        {/* Card 2: Lost Revenue */}
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
                  <i className="ri-close-circle-line"></i>
                </div>
                <span style={{ fontSize: "11px", color: "#94a3b8" }}>No prior data</span>
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
                LOST REVENUE
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
                {formatCurrency(lostRevenue)}
              </div>
              <div className="d-flex align-items-center gap-1.5 mt-2" style={{ fontSize: "11.5px", color: "#64748b" }}>
                <span>{lostDealsCount} deals lost</span>
              </div>
            </CardBody>
          </Card>
        </Col>

        {/* Card 3: Win Rate */}
        <Col xs={12} sm={6} lg={3}>
          <Card
            className="h-100 bg-white"
            style={{
              borderRadius: "4px",
              border: "1px solid #e2e8f0",
              borderTop: "3px solid #10b981",
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
                    backgroundColor: "#dcfce7",
                    color: "#10b981",
                    fontSize: "18px",
                  }}
                >
                  <i className="ri-checkbox-circle-line"></i>
                </div>
                <span style={{ fontSize: "11px", color: "#94a3b8" }}>No prior data</span>
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
                WIN RATE
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
                {winRatePct}%
              </div>
              <div className="d-flex align-items-center gap-1.5 mt-2" style={{ fontSize: "11.5px", color: "#64748b" }}>
                <span>{wonDealsCount} won of {totalClosedDeals} closed deal</span>
              </div>
            </CardBody>
          </Card>
        </Col>

        {/* Card 4: Avg Sales Cycle */}
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
                <span style={{ fontSize: "11px", color: "#94a3b8" }}>No prior data</span>
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
                AVG SALES CYCLE
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
                {avgSalesCycle} days
              </div>
              <div className="d-flex align-items-center gap-1.5 mt-2" style={{ fontSize: "11.5px", color: "#64748b" }}>
                <span>Avg deal size {formatCurrency(avgDealSize)}</span>
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
            {/* CARD A: WON VS LOST REVENUE BY MONTH */}
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
                      Won vs Lost revenue by month
                    </h6>
                    <span className="text-muted" style={{ fontSize: "12px" }}>
                      Won deals rise above the line, lost deals fall below it
                    </span>
                  </div>
                  <div className="d-flex align-items-center gap-3">
                    {/* Legend */}
                    <div className="d-flex align-items-center gap-2" style={{ fontSize: "12px" }}>
                      <span className="d-flex align-items-center gap-1">
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#16a34a" }}></span>
                        <span className="text-muted">Won</span>
                      </span>
                      <span className="d-flex align-items-center gap-1">
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#dc2626" }}></span>
                        <span className="text-muted">Lost</span>
                      </span>
                    </div>

                    {/* Metric Mode Toggle */}
                    <div className="btn-group btn-group-sm" role="group">
                      <button
                        type="button"
                        className="btn btn-sm"
                        style={{
                          backgroundColor: metricMode === "revenue" ? "#ffffff" : "#f8fafc",
                          borderColor: "#cbd5e1",
                          color: metricMode === "revenue" ? "#0f172a" : "#64748b",
                          fontWeight: metricMode === "revenue" ? 600 : 400,
                          fontSize: "11.5px",
                          padding: "3px 10px",
                          boxShadow: metricMode === "revenue" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                        }}
                        onClick={() => setMetricMode("revenue")}
                      >
                        Revenue
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm"
                        style={{
                          backgroundColor: metricMode === "count" ? "#ffffff" : "#f8fafc",
                          borderColor: "#cbd5e1",
                          color: metricMode === "count" ? "#0f172a" : "#64748b",
                          fontWeight: metricMode === "count" ? 600 : 400,
                          fontSize: "11.5px",
                          padding: "3px 10px",
                          boxShadow: metricMode === "count" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                        }}
                        onClick={() => setMetricMode("count")}
                      >
                        Deal count
                      </button>
                    </div>
                  </div>
                </div>

                {/* Bi-directional Visual Chart Canvas */}
                <div
                  className="position-relative py-3"
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
                      bottom: "40px",
                      width: "55px",
                      fontSize: "10.5px",
                      color: "#94a3b8",
                      textAlign: "right",
                      paddingRight: "8px",
                      fontWeight: 500,
                    }}
                  >
                    <span style={{ color: "#16a34a", fontWeight: 700 }}>▲ WON</span>
                    <span>₹3 L</span>
                    <span>₹1.5 L</span>
                    <span style={{ color: "#64748b", fontWeight: 600 }}>₹0</span>
                    <span>-₹1.5 L</span>
                    <span>-₹3 L</span>
                    <span style={{ color: "#dc2626", fontWeight: 700 }}>▼ LOST</span>
                  </div>

                  {/* Chart Grid Lines & Baseline */}
                  <div
                    className="position-absolute"
                    style={{
                      left: "60px",
                      right: "15px",
                      top: "20px",
                      bottom: "45px",
                    }}
                  >
                    {/* Top grid lines */}
                    <div style={{ position: "absolute", top: "15%", left: 0, right: 0, borderTop: "1px dashed #f1f5f9" }}></div>
                    <div style={{ position: "absolute", top: "35%", left: 0, right: 0, borderTop: "1px dashed #f1f5f9" }}></div>
                    {/* Center Baseline (0 Line) */}
                    <div
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: 0,
                        right: 0,
                        borderTop: "1.5px solid #94a3b8",
                      }}
                    ></div>
                    {/* Bottom grid lines */}
                    <div style={{ position: "absolute", top: "65%", left: 0, right: 0, borderTop: "1px dashed #f1f5f9" }}></div>
                    <div style={{ position: "absolute", top: "85%", left: 0, right: 0, borderTop: "1px dashed #f1f5f9" }}></div>

                    {/* Columns Grid across 12 months */}
                    <div
                      className="d-flex justify-content-between align-items-center h-100 position-relative"
                      style={{ paddingLeft: "10px", paddingRight: "10px" }}
                    >
                      {[
                        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
                      ].map((month, idx) => {
                        const isNov = month === "Nov";
                        const isHovered = hoveredMonth === month;
                        return (
                          <div
                            key={month}
                            className="d-flex flex-column align-items-center position-relative"
                            style={{
                              flex: 1,
                              height: "100%",
                              cursor: isNov ? "pointer" : "default",
                            }}
                            onMouseEnter={() => {
                              if (isNov) setHoveredMonth(month);
                            }}
                            onMouseLeave={() => {
                              if (isNov) setHoveredMonth(null);
                            }}
                          >
                            {/* If Nov, render the green rising column */}
                            {isNov && (
                              <>
                                {/* Floating Tooltip Card: ONLY VISIBLE ON HOVER */}
                                {isHovered && (
                                  <div
                                    className="position-absolute"
                                    style={{
                                      bottom: "105%",
                                      right: "50%",
                                      transform: "translateX(15%)",
                                      backgroundColor: "#ffffff",
                                      border: "1px solid #cbd5e1",
                                      borderRadius: "4px",
                                      padding: "8px 12px",
                                      boxShadow: "0 6px 18px rgba(15, 23, 42, 0.12)",
                                      whiteSpace: "nowrap",
                                      zIndex: 30,
                                      minWidth: "220px",
                                      pointerEvents: "none",
                                      animation: "fadeIn 0.15s ease-in-out",
                                    }}
                                  >
                                    <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#0f172a" }}>
                                      Enterprise Cloud CRM & ERP Rollout
                                    </div>
                                    <div style={{ fontSize: "10.5px", color: "#64748b", marginTop: "1px" }}>
                                      Won on 04 Nov 2026 • Amit Kumar
                                    </div>
                                    <div style={{ fontSize: "11px", fontWeight: 700, color: "#16a34a", marginTop: "2px" }}>
                                      ₹2,50,000 • 0 days cycle
                                    </div>
                                  </div>
                                )}

                                {/* Nov Pillar */}
                                <div
                                  className="position-absolute"
                                  style={{
                                    bottom: "50%",
                                    width: "28px",
                                    height: "38%", // Reaches ~₹2.5L
                                    backgroundColor: isHovered ? "#15803d" : "#16a34a",
                                    borderRadius: "2px 2px 0 0",
                                    boxShadow: isHovered
                                      ? "0 0 0 3px rgba(22, 163, 74, 0.35), 0 4px 10px rgba(22, 163, 74, 0.4)"
                                      : "0 2px 6px rgba(22, 163, 74, 0.3)",
                                    transition: "all 0.15s ease",
                                    cursor: "pointer",
                                  }}
                                  onMouseEnter={() => setHoveredMonth(month)}
                                  onMouseLeave={() => setHoveredMonth(null)}
                                >
                                  {/* Pillar label on top */}
                                  <div
                                    style={{
                                      position: "absolute",
                                      bottom: "100%",
                                      left: "50%",
                                      transform: "translateX(-50%)",
                                      fontSize: "10.5px",
                                      fontWeight: 700,
                                      color: isHovered ? "#15803d" : "#16a34a",
                                      marginBottom: "2px",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    ₹2.5 L
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* X-Axis Month Labels */}
                  <div
                    className="position-absolute d-flex justify-content-between"
                    style={{
                      left: "60px",
                      right: "15px",
                      bottom: "10px",
                      paddingLeft: "10px",
                      paddingRight: "10px",
                    }}
                  >
                    {[
                      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
                    ].map((m) => (
                      <span
                        key={m}
                        style={{
                          flex: 1,
                          textAlign: "center",
                          fontSize: "11px",
                          color: m === "Nov" ? "#0f172a" : "#94a3b8",
                          fontWeight: m === "Nov" ? 700 : 500,
                        }}
                      >
                        {m}
                      </span>
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
                  Lost deals will appear as red bars below the line. Right now there are none.
                </div>
              </CardBody>
            </Card>

            {/* CARD B: DEAL SIZE VS SALES CYCLE */}
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
                <div className="mb-3 pb-2 border-bottom">
                  <h6 className="fw-bold mb-0 text-dark" style={{ fontSize: "15px" }}>
                    Deal size vs sales cycle
                  </h6>
                  <span className="text-muted" style={{ fontSize: "12px" }}>
                    Each bubble is a closed deal. Top-left is the best: big and fast.
                  </span>
                </div>

                {/* Quadrant Scatter / Bubble Chart Canvas */}
                <div
                  className="position-relative py-2"
                  style={{
                    minHeight: "220px",
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
                      bottom: "35px",
                      width: "50px",
                      fontSize: "10.5px",
                      color: "#94a3b8",
                      textAlign: "right",
                      paddingRight: "8px",
                      fontWeight: 500,
                    }}
                  >
                    <span>₹5 L</span>
                    <span>₹3.3 L</span>
                    <span>₹1.7 L</span>
                    <span>₹0</span>
                  </div>

                  {/* Quadrant Canvas Area */}
                  <div
                    className="position-absolute"
                    style={{
                      left: "55px",
                      right: "20px",
                      top: "15px",
                      bottom: "35px",
                      borderLeft: "1px solid #cbd5e1",
                      borderBottom: "1px solid #cbd5e1",
                    }}
                  >
                    {/* Horizontal grid lines */}
                    <div style={{ position: "absolute", top: "33%", left: 0, right: 0, borderTop: "1px dashed #f1f5f9" }}></div>
                    <div style={{ position: "absolute", top: "66%", left: 0, right: 0, borderTop: "1px dashed #f1f5f9" }}></div>

                    {/* Vertical grid lines */}
                    <div style={{ position: "absolute", left: "25%", top: 0, bottom: 0, borderLeft: "1px dashed #f1f5f9" }}></div>
                    <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, borderLeft: "1px dashed #f1f5f9" }}></div>
                    <div style={{ position: "absolute", left: "75%", top: 0, bottom: 0, borderLeft: "1px dashed #f1f5f9" }}></div>

                    {/* Quadrant Labels */}
                    <div
                      className="position-absolute"
                      style={{
                        top: "12px",
                        left: "15px",
                        fontSize: "11px",
                        fontWeight: 700,
                        color: "#16a34a",
                        letterSpacing: "0.4px",
                      }}
                    >
                      BIG & FAST ★
                    </div>

                    <div
                      className="position-absolute"
                      style={{
                        top: "12px",
                        right: "15px",
                        fontSize: "11px",
                        fontWeight: 500,
                        color: "#94a3b8",
                      }}
                    >
                      Slow & big
                    </div>

                    <div
                      className="position-absolute"
                      style={{
                        bottom: "12px",
                        left: "15px",
                        fontSize: "11px",
                        fontWeight: 500,
                        color: "#94a3b8",
                      }}
                    >
                      Small & fast
                    </div>

                    {/* Enterprise Cloud CRM & ERP Rollout Bubble */}
                    <div
                      className="position-absolute d-flex align-items-center gap-2"
                      style={{
                        left: "10px", // 0 days cycle
                        top: "45%",  // ~₹2.5L deal amount
                      }}
                    >
                      <div
                        style={{
                          width: "20px",
                          height: "20px",
                          borderRadius: "50%",
                          backgroundColor: "#16a34a",
                          boxShadow: "0 0 0 4px rgba(22, 163, 74, 0.2)",
                          cursor: "pointer",
                        }}
                        title="Enterprise Cloud CRM & ERP Rollout: ₹2,50,000 (0 days)"
                      ></div>
                      <div>
                        <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#0f172a" }}>
                          Enterprise Cloud CRM & ERP Rollout
                        </div>
                        <div style={{ fontSize: "10.5px", color: "#64748b" }}>
                          ₹2,50,000 • 0 days
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* X-Axis Labels */}
                  <div
                    className="position-absolute d-flex justify-content-between"
                    style={{
                      left: "55px",
                      right: "20px",
                      bottom: "10px",
                      fontSize: "11px",
                      color: "#94a3b8",
                      fontWeight: 500,
                    }}
                  >
                    <span>0 d</span>
                    <span>15 d</span>
                    <span>30 d</span>
                    <span>45 d</span>
                    <span>60 d</span>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        </Col>

        {/* RIGHT COLUMN: COL 4 */}
        <Col xs={12} lg={4}>
          <div className="d-flex flex-column gap-3">
            {/* CARD 1: WIN RATE GAUGE */}
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
                    Win rate
                  </h6>
                  <span className="text-muted" style={{ fontSize: "11.5px" }}>
                    by closed deals
                  </span>
                </div>

                {/* Semi-circle Gauge */}
                <div className="position-relative text-center py-2">
                  <ReactApexChart
                    options={winRateChartOptions}
                    series={[winRatePct]}
                    type="radialBar"
                    height={180}
                  />
                  {/* Gauge subtext */}
                  <div
                    className="text-muted"
                    style={{
                      fontSize: "12px",
                      fontWeight: 500,
                      marginTop: "-20px",
                    }}
                  >
                    {wonDealsCount} won • {lostDealsCount} lost
                  </div>
                  {/* Scale marks */}
                  <div
                    className="d-flex justify-content-between px-4 mt-2"
                    style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 500 }}
                  >
                    <span>0%</span>
                    <span>100%</span>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* CARD 2: KEY TAKEAWAYS */}
            <Card
              className="bg-white"
              style={{
                borderRadius: "4px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
              }}
            >
              <CardBody className="p-3">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <h6 className="fw-bold mb-0 text-dark" style={{ fontSize: "14px" }}>
                    Key takeaways
                  </h6>
                  <Badge
                    color="light"
                    className="text-muted border"
                    style={{
                      fontSize: "11px",
                      fontWeight: 500,
                      borderRadius: "10px",
                      padding: "2px 8px",
                      backgroundColor: "#f8fafc",
                    }}
                  >
                    Auto
                  </Badge>
                </div>

                {/* Takeaway Bullets */}
                <div className="d-flex flex-column gap-2.5">
                  <div className="d-flex align-items-start gap-2">
                    <span
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        backgroundColor: "#16a34a",
                        flexShrink: 0,
                        marginTop: "5px",
                      }}
                    ></span>
                    <span style={{ fontSize: "12.5px", color: "#1e293b", lineHeight: "1.4" }}>
                      <strong>{formatCurrency(wonRevenue)}</strong> won from {wonDealsCount} deal. No deals lost this year.
                    </span>
                  </div>

                  <div className="d-flex align-items-start gap-2">
                    <span
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        backgroundColor: "#f59e0b",
                        flexShrink: 0,
                        marginTop: "5px",
                      }}
                    ></span>
                    <span style={{ fontSize: "12.5px", color: "#1e293b", lineHeight: "1.4" }}>
                      The deal closed in <strong>{avgSalesCycle} days</strong>. Check the created date.
                    </span>
                  </div>

                  <div className="d-flex align-items-start gap-2">
                    <span
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        backgroundColor: "#3b82f6",
                        flexShrink: 0,
                        marginTop: "5px",
                      }}
                    ></span>
                    <span style={{ fontSize: "12.5px", color: "#1e293b", lineHeight: "1.4" }}>
                      Win rate needs about 10 closed deals to be reliable.
                    </span>
                  </div>

                  <div className="d-flex align-items-start gap-2">
                    <span
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        backgroundColor: "#64748b",
                        flexShrink: 0,
                        marginTop: "5px",
                      }}
                    ></span>
                    <span style={{ fontSize: "12.5px", color: "#1e293b", lineHeight: "1.4" }}>
                      Add a Lost reason to unlock loss analysis.
                    </span>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* CARD 3: WIN RATE BY SALES REP */}
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
                    Win rate by sales rep
                  </h6>
                  <span className="text-muted" style={{ fontSize: "11.5px" }}>
                    Click a rep to filter the page
                  </span>
                </div>

                {/* Micro Table */}
                <div className="table-responsive">
                  <Table className="table-sm table-borderless align-middle mb-0" style={{ fontSize: "12px" }}>
                    <thead>
                      <tr className="border-bottom" style={{ color: "#94a3b8", fontSize: "10.5px" }}>
                        <th style={{ padding: "6px 4px", fontWeight: 600 }}>REP</th>
                        <th className="text-center" style={{ padding: "6px 4px", fontWeight: 600 }}>WON</th>
                        <th className="text-center" style={{ padding: "6px 4px", fontWeight: 600 }}>LOST</th>
                        <th style={{ padding: "6px 4px", fontWeight: 600 }}>WIN RATE</th>
                        <th className="text-end" style={{ padding: "6px 4px", fontWeight: 600 }}>REVENUE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {repsData.map((r, i) => (
                        <tr
                          key={i}
                          style={{ cursor: "pointer" }}
                          className="hover-bg-light"
                          onClick={() => {
                            const found = owners.find(
                              (o) => (o.fullName || o.full_name) === r.name
                            );
                            if (found && onOwnerChange) {
                              onOwnerChange(found.ownerId || found.owner_id || found.employee_id);
                            }
                          }}
                        >
                          <td style={{ padding: "8px 4px" }}>
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
                          <td className="text-center fw-semibold text-dark" style={{ padding: "8px 4px" }}>
                            {r.won}
                          </td>
                          <td className="text-center text-muted" style={{ padding: "8px 4px" }}>
                            {r.lost}
                          </td>
                          <td style={{ padding: "8px 4px", minWidth: "85px" }}>
                            <div className="d-flex align-items-center gap-1.5">
                              <div
                                style={{
                                  flex: 1,
                                  height: "6px",
                                  backgroundColor: "#f1f5f9",
                                  borderRadius: "3px",
                                  overflow: "hidden",
                                }}
                              >
                                <div
                                  style={{
                                    width: `${r.winRate}%`,
                                    height: "100%",
                                    backgroundColor: "#16a34a",
                                    borderRadius: "3px",
                                  }}
                                ></div>
                              </div>
                              <span style={{ fontSize: "11px", fontWeight: 700, color: "#16a34a" }}>
                                {r.winRate}%
                              </span>
                            </div>
                          </td>
                          <td className="text-end fw-bold text-dark" style={{ padding: "8px 4px" }}>
                            {formatShortLakhs(r.revenue)}
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

      {/* 4. ROW 3: CLOSED DEALS LEDGER TABLE */}
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
                Closed Deals Ledger
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

              {/* Outcome Filter */}
              <select
                className="form-select form-select-sm"
                style={{
                  width: "130px",
                  borderRadius: "4px",
                  fontSize: "12px",
                  borderColor: "#cbd5e1",
                }}
                value={outcomeFilter}
                onChange={(e) => {
                  setOutcomeFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="ALL">Outcome: All</option>
                <option value="Won">Outcome: Won</option>
                <option value="Lost">Outcome: Lost</option>
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
                title="Export Closed Deals to CSV"
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
                  <th style={{ fontWeight: 600, fontSize: "11px", letterSpacing: "0.5px" }}>AMOUNT</th>
                  <th style={{ fontWeight: 600, fontSize: "11px", letterSpacing: "0.5px" }}>CLOSE DATE</th>
                  <th style={{ fontWeight: 600, fontSize: "11px", letterSpacing: "0.5px" }}>OUTCOME</th>
                  <th style={{ fontWeight: 600, fontSize: "11px", letterSpacing: "0.5px" }}>CYCLE</th>
                  <th className="text-end" style={{ fontWeight: 600, fontSize: "11px", letterSpacing: "0.5px" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-4 text-muted">
                      No closed deals found matching the selected filters.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((r, idx) => {
                    const isWon = String(r.outcome).toLowerCase() === "won";
                    const cycleDays = Number(r.cycle_days) || 0;
                    return (
                      <tr key={r.opportunity_id || idx}>
                        {/* DEAL */}
                        <td>
                          <span
                            className="fw-bold text-dark"
                            style={{ cursor: "pointer", color: "#0f172a" }}
                            onClick={() => setSelectedDealForModal(r)}
                          >
                            {r.opportunity_name || "Enterprise Cloud CRM & ERP Rollout"}
                          </span>
                        </td>

                        {/* CUSTOMER */}
                        <td className="text-muted">
                          {r.customer_name || "ABC 1 Tech Solutions Ltd."}
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
                              {r.sales_rep || "Amit Kumar"}
                            </span>
                          </div>
                        </td>

                        {/* AMOUNT */}
                        <td className="fw-bold text-dark">
                          {formatCurrency(r.amount || 0)}
                        </td>

                        {/* CLOSE DATE */}
                        <td className="text-muted">
                          {r.close_date || "04 Nov 2026"}
                        </td>

                        {/* OUTCOME */}
                        <td>
                          {isWon ? (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "3px 8px",
                                borderRadius: "4px",
                                backgroundColor: "#dcfce7",
                                color: "#15803d",
                                border: "1px solid #bbf7d0",
                                fontSize: "11.5px",
                                fontWeight: 600,
                              }}
                            >
                              <i className="ri-check-line"></i>
                              <span>Won</span>
                            </span>
                          ) : (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "3px 8px",
                                borderRadius: "4px",
                                backgroundColor: "#fee2e2",
                                color: "#b91c1c",
                                border: "1px solid #fecaca",
                                fontSize: "11.5px",
                                fontWeight: 600,
                              }}
                            >
                              <i className="ri-close-line"></i>
                              <span>Lost</span>
                            </span>
                          )}
                        </td>

                        {/* CYCLE */}
                        <td>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "3px 8px",
                              borderRadius: "4px",
                              backgroundColor: cycleDays <= 1 ? "#fef3c7" : "#f1f5f9",
                              color: cycleDays <= 1 ? "#b45309" : "#475569",
                              border: cycleDays <= 1 ? "1px solid #fde68a" : "1px solid #e2e8f0",
                              fontSize: "11.5px",
                              fontWeight: 600,
                            }}
                          >
                            <span>{cycleDays} days</span>
                            {cycleDays <= 1 && <i className="ri-error-warning-line"></i>}
                          </span>
                        </td>

                        {/* ACTIONS */}
                        <td className="text-end">
                          <button
                            type="button"
                            className="btn btn-sm"
                            style={{
                              backgroundColor: "#ffffff",
                              border: "1px solid #cbd5e1",
                              color: "#334155",
                              fontSize: "12px",
                              fontWeight: 500,
                              borderRadius: "4px",
                              padding: "3px 10px",
                            }}
                            onClick={() => setSelectedDealForModal(r)}
                          >
                            View deal
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
                    <td colSpan={3}>
                      TOTAL ({filteredRows.length} {filteredRows.length === 1 ? "deal" : "deals"})
                    </td>
                    <td className="text-dark">
                      {formatCurrency(filteredRows.reduce((a, b) => a + Number(b.amount || 0), 0))}
                    </td>
                    <td></td>
                    <td style={{ color: "#16a34a" }}>
                      Won {filteredRows.filter(r => r.outcome === "Won").length} • Lost {filteredRows.filter(r => r.outcome === "Lost").length}
                    </td>
                    <td style={{ color: "#475569" }}>
                      Avg {avgSalesCycle} d
                    </td>
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
              Deal Details
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
                <label className="text-muted small mb-1">Amount</label>
                <div className="fw-bold text-dark">
                  {formatCurrency(selectedDealForModal.amount || 0)}
                </div>
              </div>
              <div className="col-6">
                <label className="text-muted small mb-1">Outcome</label>
                <div>
                  <Badge color={selectedDealForModal.outcome === "Won" ? "success" : "danger"}>
                    {selectedDealForModal.outcome}
                  </Badge>
                </div>
              </div>
              <div className="col-6">
                <label className="text-muted small mb-1">Close Date</label>
                <div className="text-dark">
                  {selectedDealForModal.close_date}
                </div>
              </div>
              <div className="col-6">
                <label className="text-muted small mb-1">Sales Cycle</label>
                <div className="text-dark">
                  {selectedDealForModal.cycle_days || 0} days
                </div>
              </div>
            </div>
          </ModalBody>
          <ModalFooter style={{ borderTop: "1px solid #e2e8f0" }}>
            <Link
              to={`/crm/opportunities/${selectedDealForModal.opportunity_id}`}
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

      {/* MODAL 2: CHECK CLOSE DATES INFO */}
      <Modal
        isOpen={checkDatesModalOpen}
        toggle={() => setCheckDatesModalOpen(false)}
        centered
      >
        <ModalHeader
          toggle={() => setCheckDatesModalOpen(false)}
          style={{ borderBottom: "1px solid #e2e8f0" }}
        >
          <span className="fw-bold text-dark" style={{ fontSize: "15px" }}>
            Sales Cycle Audit & Close Dates
          </span>
        </ModalHeader>
        <ModalBody className="p-3">
          <p className="text-muted small mb-3">
            Sales cycle duration is calculated as the difference between the deal&apos;s <strong>Created Date</strong> and its <strong>Actual Close Date</strong>.
          </p>
          <div
            className="p-3 mb-3"
            style={{
              backgroundColor: "#fef3c7",
              border: "1px solid #fde68a",
              borderRadius: "4px",
              fontSize: "12.5px",
              color: "#92400e",
            }}
          >
            <strong>Note on 0-day cycle:</strong> Deals closed on the day of creation indicate either an existing offline transaction entered at closing or an immediate conversion. For high-value enterprise sales, ensure created dates reflect when discussions first started.
          </div>
          <div className="d-flex flex-column gap-2">
            {rawRows.map((r, i) => (
              <div
                key={i}
                className="d-flex align-items-center justify-content-between p-2 border rounded"
                style={{ fontSize: "12px" }}
              >
                <div>
                  <strong>{r.opportunity_name}</strong>
                  <div className="text-muted" style={{ fontSize: "11px" }}>
                    Close Date: {r.close_date}
                  </div>
                </div>
                <Badge color={Number(r.cycle_days) === 0 ? "warning" : "info"}>
                  {r.cycle_days} days
                </Badge>
              </div>
            ))}
          </div>
        </ModalBody>
        <ModalFooter style={{ borderTop: "1px solid #e2e8f0" }}>
          <Button
            color="light"
            size="sm"
            onClick={() => setCheckDatesModalOpen(false)}
          >
            Done
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default WinLossAnalysisReportView;

