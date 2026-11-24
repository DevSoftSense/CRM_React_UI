import React, { useState, useMemo } from "react";
import { useSelector } from "react-redux";
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

  // Dynamic Theme Integration
  const { layoutModeType } = useSelector((state) => ({
    layoutModeType: state.Layout.layoutModeType,
  }));
  const isDark = layoutModeType === "dark";

  // Dynamic Theme Palette
  const cardBg = isDark ? "#121212" : "#ffffff";
  const cardBorder = isDark ? "#2d3748" : "#e2e8f0";
  const subtleBg = isDark ? "#1a202c" : "#f8fafc";
  const subtleBorder = isDark ? "#334155" : "#cbd5e1";
  const textTitle = isDark ? "#f8fafc" : "#0f172a";
  const textSub = isDark ? "#94a3b8" : "#64748b";
  const primaryColor = isDark ? "#fca5a5" : "#7f1d1d";

  // Extract raw data from reportResult
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
  const wonRevenue = Number(
    summary.won_revenue ??
      rawRows
        .filter((r) => String(r.outcome).toLowerCase() === "won")
        .reduce((sum, r) => sum + Number(r.amount || 0), 0) ??
      0
  );
  const lostRevenue = Number(
    summary.lost_revenue ??
      rawRows
        .filter((r) => String(r.outcome).toLowerCase() === "lost")
        .reduce((sum, r) => sum + Number(r.amount || 0), 0) ??
      0
  );
  const wonDealsCount = Number(
    summary.won_deals_count ??
      rawRows.filter((r) => String(r.outcome).toLowerCase() === "won").length ??
      0
  );
  const lostDealsCount = Number(
    summary.lost_deals_count ??
      rawRows.filter((r) => String(r.outcome).toLowerCase() === "lost").length ??
      0
  );
  const totalClosedDeals = wonDealsCount + lostDealsCount;

  const winRatePct =
    totalClosedDeals > 0
      ? Math.round((wonDealsCount / totalClosedDeals) * 100)
      : 0;

  // Average sales cycle in days
  const avgSalesCycle = useMemo(() => {
    if (rawRows.length === 0) return 0;
    const totalDays = rawRows.reduce((acc, r) => acc + (Number(r.cycle_days) || 0), 0);
    return Math.round(totalDays / rawRows.length);
  }, [rawRows]);

  const avgDealSize = totalClosedDeals > 0
    ? Math.round((wonRevenue + lostRevenue) / totalClosedDeals)
    : 0;

  const currentMonthShort = new Date().toLocaleString("en-US", { month: "short" });

  // Dynamic monthly won/lost aggregates (supports both revenue and deal count modes)
  const monthlyStats = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const byMonth = months.map((month) => {
      const wonDeals = rawRows.filter((r) => {
        if (!r.close_date || String(r.outcome).toLowerCase() !== "won") return false;
        const d = new Date(r.close_date);
        return !isNaN(d.getTime()) && d.toLocaleString("en-US", { month: "short" }) === month;
      });
      const lostDeals = rawRows.filter((r) => {
        if (!r.close_date || String(r.outcome).toLowerCase() !== "lost") return false;
        const d = new Date(r.close_date);
        return !isNaN(d.getTime()) && d.toLocaleString("en-US", { month: "short" }) === month;
      });
      return {
        month,
        wonDeals,
        lostDeals,
        wonAmt: wonDeals.reduce((a, b) => a + Number(b.amount || 0), 0),
        lostAmt: lostDeals.reduce((a, b) => a + Number(b.amount || 0), 0),
        wonCount: wonDeals.length,
        lostCount: lostDeals.length,
      };
    });
    const maxVal = Math.max(
      ...byMonth.map((m) =>
        metricMode === "count" ? Math.max(m.wonCount, m.lostCount) : Math.max(m.wonAmt, m.lostAmt)
      ),
      metricMode === "count" ? 2 : 100000
    );
    return { byMonth, maxVal };
  }, [rawRows, metricMode]);

  const maxBubbleAmount = useMemo(() => {
    return Math.max(...rawRows.map((r) => Number(r.amount || 0)), 100000);
  }, [rawRows]);

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
      const rep = r.sales_rep || "Unassigned";
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
            background: isDark ? "#2d3748" : "#f1f5f9",
            strokeWidth: "90%",
            margin: 5,
          },
          dataLabels: {
            name: { show: false },
            value: {
              offsetY: -8,
              fontSize: "26px",
              fontWeight: 700,
              color: textTitle,
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
  }, [winRatePct, isDark, textTitle]);

  return (
    <div className="win-loss-analysis-report-view">
      {/* 1. ROW 1: 4 EXECUTIVE KPI CARDS */}
      <Row className="g-3 mb-4">
        {/* Card 1: Won Revenue */}
        <Col xs={12} sm={6} lg={3}>
          <Card
            className="h-100 rounded-0"
            style={{
              borderRadius: 0,
              backgroundColor: cardBg,
              border: `1px solid ${cardBorder}`,
              borderTop: "3px solid #16a34a",
              boxShadow: isDark ? "0 1px 3px rgba(0, 0, 0, 0.25)" : "0 1px 3px rgba(15, 23, 42, 0.04)",
            }}
          >
            <CardBody className="p-3">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <div
                  className="d-flex align-items-center justify-content-center flex-shrink-0 rounded-0"
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: 0,
                    backgroundColor: isDark ? "rgba(22, 163, 74, 0.15)" : "#dcfce7",
                    color: "#16a34a",
                    fontSize: "18px",
                  }}
                >
                  <i className="ri-money-rupee-circle-line"></i>
                </div>
                <span style={{ fontSize: "11px", color: textSub }}>No prior data</span>
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
                WON REVENUE
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
                {formatCurrency(wonRevenue)}
              </div>
              <div className="d-flex align-items-center gap-1.5 mt-2" style={{ fontSize: "11.5px", color: isDark ? "#4ade80" : "#16a34a" }}>
                <span style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: 0, backgroundColor: "#16a34a" }}></span>
                <span>{wonDealsCount} deal won</span>
              </div>
            </CardBody>
          </Card>
        </Col>

        {/* Card 2: Lost Revenue */}
        <Col xs={12} sm={6} lg={3}>
          <Card
            className="h-100 rounded-0"
            style={{
              borderRadius: 0,
              backgroundColor: cardBg,
              border: `1px solid ${cardBorder}`,
              borderTop: "3px solid #ef4444",
              boxShadow: isDark ? "0 1px 3px rgba(0, 0, 0, 0.25)" : "0 1px 3px rgba(15, 23, 42, 0.04)",
            }}
          >
            <CardBody className="p-3">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <div
                  className="d-flex align-items-center justify-content-center flex-shrink-0 rounded-0"
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: 0,
                    backgroundColor: isDark ? "rgba(239, 68, 68, 0.15)" : "#fee2e2",
                    color: "#ef4444",
                    fontSize: "18px",
                  }}
                >
                  <i className="ri-close-circle-line"></i>
                </div>
                <span style={{ fontSize: "11px", color: textSub }}>No prior data</span>
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
                LOST REVENUE
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
                {formatCurrency(lostRevenue)}
              </div>
              <div className="d-flex align-items-center gap-1.5 mt-2" style={{ fontSize: "11.5px", color: textSub }}>
                <span>{lostDealsCount} deals lost</span>
              </div>
            </CardBody>
          </Card>
        </Col>

        {/* Card 3: Win Rate */}
        <Col xs={12} sm={6} lg={3}>
          <Card
            className="h-100 rounded-0"
            style={{
              borderRadius: 0,
              backgroundColor: cardBg,
              border: `1px solid ${cardBorder}`,
              borderTop: "3px solid #10b981",
              boxShadow: isDark ? "0 1px 3px rgba(0, 0, 0, 0.25)" : "0 1px 3px rgba(15, 23, 42, 0.04)",
            }}
          >
            <CardBody className="p-3">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <div
                  className="d-flex align-items-center justify-content-center flex-shrink-0 rounded-0"
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: 0,
                    backgroundColor: isDark ? "rgba(16, 185, 129, 0.15)" : "#dcfce7",
                    color: "#10b981",
                    fontSize: "18px",
                  }}
                >
                  <i className="ri-checkbox-circle-line"></i>
                </div>
                <span style={{ fontSize: "11px", color: textSub }}>No prior data</span>
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
                WIN RATE
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
                {winRatePct}%
              </div>
              <div className="d-flex align-items-center gap-1.5 mt-2" style={{ fontSize: "11.5px", color: textSub }}>
                <span>{wonDealsCount} won of {totalClosedDeals} closed deal</span>
              </div>
            </CardBody>
          </Card>
        </Col>

        {/* Card 4: Avg Sales Cycle */}
        <Col xs={12} sm={6} lg={3}>
          <Card
            className="h-100 rounded-0"
            style={{
              borderRadius: 0,
              backgroundColor: cardBg,
              border: `1px solid ${cardBorder}`,
              borderTop: "3px solid #f59e0b",
              boxShadow: isDark ? "0 1px 3px rgba(0, 0, 0, 0.25)" : "0 1px 3px rgba(15, 23, 42, 0.04)",
            }}
          >
            <CardBody className="p-3">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <div
                  className="d-flex align-items-center justify-content-center flex-shrink-0 rounded-0"
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: 0,
                    backgroundColor: isDark ? "rgba(245, 158, 11, 0.15)" : "#fef3c7",
                    color: isDark ? "#fbbf24" : "#d97706",
                    fontSize: "18px",
                  }}
                >
                  <i className="ri-time-line"></i>
                </div>
                <span style={{ fontSize: "11px", color: textSub }}>No prior data</span>
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
                AVG SALES CYCLE
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
                {avgSalesCycle} days
              </div>
              <div className="d-flex align-items-center gap-1.5 mt-2" style={{ fontSize: "11.5px", color: textSub }}>
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
                      Won vs Lost revenue by month
                    </h6>
                    <span style={{ fontSize: "12px", color: textSub }}>
                      Won deals rise above the line, lost deals fall below it
                    </span>
                  </div>
                  <div className="d-flex align-items-center gap-3">
                    {/* Legend */}
                    <div className="d-flex align-items-center gap-2" style={{ fontSize: "12px" }}>
                      <span className="d-flex align-items-center gap-1">
                        <span style={{ width: "8px", height: "8px", borderRadius: 0, backgroundColor: "#16a34a" }}></span>
                        <span style={{ color: textSub }}>Won</span>
                      </span>
                      <span className="d-flex align-items-center gap-1">
                        <span style={{ width: "8px", height: "8px", borderRadius: 0, backgroundColor: "#dc2626" }}></span>
                        <span style={{ color: textSub }}>Lost</span>
                      </span>
                    </div>

                    {/* Metric Mode Toggle */}
                    <div className="btn-group btn-group-sm rounded-0" role="group">
                      <button
                        type="button"
                        className="btn btn-sm rounded-0"
                        style={{
                          borderRadius: 0,
                          backgroundColor: metricMode === "revenue" ? (isDark ? "#21262d" : "#ffffff") : (isDark ? "#121212" : "#f8fafc"),
                          borderColor: subtleBorder,
                          color: metricMode === "revenue" ? textTitle : textSub,
                          fontWeight: metricMode === "revenue" ? 600 : 400,
                          fontSize: "11.5px",
                          padding: "3px 10px",
                          boxShadow: metricMode === "revenue" ? "0 1px 2px rgba(0,0,0,0.15)" : "none",
                        }}
                        onClick={() => setMetricMode("revenue")}
                      >
                        Revenue
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm rounded-0"
                        style={{
                          borderRadius: 0,
                          backgroundColor: metricMode === "count" ? (isDark ? "#21262d" : "#ffffff") : (isDark ? "#121212" : "#f8fafc"),
                          borderColor: subtleBorder,
                          color: metricMode === "count" ? textTitle : textSub,
                          fontWeight: metricMode === "count" ? 600 : 400,
                          fontSize: "11.5px",
                          padding: "3px 10px",
                          boxShadow: metricMode === "count" ? "0 1px 2px rgba(0,0,0,0.15)" : "none",
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
                      bottom: "40px",
                      width: "55px",
                      fontSize: "10.5px",
                      color: textSub,
                      textAlign: "right",
                      paddingRight: "8px",
                      fontWeight: 500,
                    }}
                  >
                    <span style={{ color: isDark ? "#4ade80" : "#16a34a", fontWeight: 700 }}>▲ WON</span>
                    <span>{metricMode === "count" ? monthlyStats.maxVal : formatShortLakhs(monthlyStats.maxVal)}</span>
                    <span>{metricMode === "count" ? Math.round(monthlyStats.maxVal / 2) : formatShortLakhs(monthlyStats.maxVal / 2)}</span>
                    <span style={{ color: textSub, fontWeight: 600 }}>{metricMode === "count" ? "0" : "₹0"}</span>
                    <span>{metricMode === "count" ? `-${Math.round(monthlyStats.maxVal / 2)}` : `-${formatShortLakhs(monthlyStats.maxVal / 2)}`}</span>
                    <span>{metricMode === "count" ? `-${monthlyStats.maxVal}` : `-${formatShortLakhs(monthlyStats.maxVal)}`}</span>
                    <span style={{ color: isDark ? "#f87171" : "#dc2626", fontWeight: 700 }}>▼ LOST</span>
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
                    <div style={{ position: "absolute", top: "15%", left: 0, right: 0, borderTop: isDark ? "1px dashed #262626" : "1px dashed #f1f5f9" }}></div>
                    <div style={{ position: "absolute", top: "35%", left: 0, right: 0, borderTop: isDark ? "1px dashed #262626" : "1px dashed #f1f5f9" }}></div>
                    {/* Center Baseline (0 Line) */}
                    <div
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: 0,
                        right: 0,
                        borderTop: isDark ? "1.5px solid #475569" : "1.5px solid #94a3b8",
                      }}
                    ></div>
                    {/* Bottom grid lines */}
                    <div style={{ position: "absolute", top: "65%", left: 0, right: 0, borderTop: isDark ? "1px dashed #262626" : "1px dashed #f1f5f9" }}></div>
                    <div style={{ position: "absolute", top: "85%", left: 0, right: 0, borderTop: isDark ? "1px dashed #262626" : "1px dashed #f1f5f9" }}></div>

                    {/* Columns Grid across 12 months */}
                    <div
                      className="d-flex justify-content-between align-items-center h-100 position-relative"
                      style={{ paddingLeft: "10px", paddingRight: "10px" }}
                    >
                      {monthlyStats.byMonth.map((mStat) => {
                        const { month, wonDeals, lostDeals, wonAmt, lostAmt, wonCount, lostCount } = mStat;
                        const hasWon = wonCount > 0;
                        const hasLost = lostCount > 0;
                        const hasAny = hasWon || hasLost;
                        const topDeal = wonDeals[0] || lostDeals[0];
                        const isHovered = hoveredMonth === month;
                        const wonMetric = metricMode === "count" ? wonCount : wonAmt;
                        const lostMetric = metricMode === "count" ? lostCount : lostAmt;
                        const wonHeightPct = hasWon ? Math.min(46, Math.max(10, Math.round((wonMetric / monthlyStats.maxVal) * 46))) : 0;
                        const lostHeightPct = hasLost ? Math.min(46, Math.max(10, Math.round((lostMetric / monthlyStats.maxVal) * 46))) : 0;

                        return (
                          <div
                            key={month}
                            className="d-flex flex-column align-items-center position-relative"
                            style={{
                              flex: 1,
                              height: "100%",
                              cursor: hasAny ? "pointer" : "default",
                            }}
                            onMouseEnter={() => {
                              if (hasAny) setHoveredMonth(month);
                            }}
                            onMouseLeave={() => {
                              if (hasAny) setHoveredMonth(null);
                            }}
                          >
                            {isHovered && topDeal && (
                              <div
                                className="position-absolute rounded-0"
                                style={{
                                  bottom: "102%",
                                  left: "50%",
                                  transform: "translateX(-50%)",
                                  backgroundColor: isDark ? "#1a202c" : "#ffffff",
                                  border: `1px solid ${cardBorder}`,
                                  borderRadius: 0,
                                  padding: "8px 12px",
                                  boxShadow: isDark ? "0 6px 18px rgba(0, 0, 0, 0.4)" : "0 6px 18px rgba(15, 23, 42, 0.12)",
                                  whiteSpace: "nowrap",
                                  zIndex: 30,
                                  minWidth: "200px",
                                  pointerEvents: "none",
                                }}
                              >
                                <div style={{ fontSize: "11.5px", fontWeight: 700, color: textTitle }}>
                                  {month} Summary
                                </div>
                                {hasWon && (
                                  <div style={{ fontSize: "11px", fontWeight: 600, color: isDark ? "#4ade80" : "#16a34a", marginTop: "2px" }}>
                                    Won: {wonCount} ({formatCurrency(wonAmt)})
                                  </div>
                                )}
                                {hasLost && (
                                  <div style={{ fontSize: "11px", fontWeight: 600, color: isDark ? "#f87171" : "#dc2626", marginTop: "2px" }}>
                                    Lost: {lostCount} ({formatCurrency(lostAmt)})
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Green rising column for Won deals */}
                            {hasWon && (
                              <div
                                className="position-absolute rounded-0"
                                style={{
                                  bottom: "50%",
                                  width: "26px",
                                  height: `${wonHeightPct}%`,
                                  backgroundColor: isHovered ? (isDark ? "#16a34a" : "#15803d") : (isDark ? "#22c55e" : "#16a34a"),
                                  borderRadius: 0,
                                  transition: "all 0.15s ease",
                                  cursor: "pointer",
                                }}
                              >
                                <div
                                  style={{
                                    position: "absolute",
                                    bottom: "100%",
                                    left: "50%",
                                    transform: "translateX(-50%)",
                                    fontSize: "10px",
                                    fontWeight: 700,
                                    color: isDark ? "#4ade80" : "#16a34a",
                                    marginBottom: "2px",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {metricMode === "count" ? wonCount : formatShortLakhs(wonAmt)}
                                </div>
                              </div>
                            )}

                            {/* Red falling column for Lost deals */}
                            {hasLost && (
                              <div
                                className="position-absolute rounded-0"
                                style={{
                                  top: "50%",
                                  width: "26px",
                                  height: `${lostHeightPct}%`,
                                  backgroundColor: isHovered ? "#b91c1c" : "#dc2626",
                                  borderRadius: 0,
                                  transition: "all 0.15s ease",
                                  cursor: "pointer",
                                }}
                              >
                                <div
                                  style={{
                                    position: "absolute",
                                    top: "100%",
                                    left: "50%",
                                    transform: "translateX(-50%)",
                                    fontSize: "10px",
                                    fontWeight: 700,
                                    color: isDark ? "#f87171" : "#dc2626",
                                    marginTop: "2px",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {metricMode === "count" ? lostCount : formatShortLakhs(lostAmt)}
                                </div>
                              </div>
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
                          color: m === currentMonthShort ? textTitle : textSub,
                          fontWeight: m === currentMonthShort ? 700 : 500,
                        }}
                      >
                        {m}
                      </span>
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
                  {lostDealsCount > 0
                    ? `Showing ${wonDealsCount} won and ${lostDealsCount} lost closed deals across the selected period.`
                    : "Lost deals will appear as red bars below the line when recorded."}
                </div>
              </CardBody>
            </Card>

            {/* CARD B: DEAL SIZE VS SALES CYCLE */}
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
                  className="mb-3 pb-2"
                  style={{ borderBottom: `1px solid ${cardBorder}` }}
                >
                  <h6 className="fw-bold mb-0" style={{ fontSize: "15px", color: textTitle }}>
                    Deal size vs sales cycle
                  </h6>
                  <span style={{ fontSize: "12px", color: textSub }}>
                    Each bubble is a closed deal. Top-left is the best: big and fast.
                  </span>
                </div>

                {/* Quadrant Scatter / Bubble Chart Canvas */}
                <div
                  className="position-relative py-2"
                  style={{
                    minHeight: "220px",
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
                      bottom: "35px",
                      width: "50px",
                      fontSize: "10.5px",
                      color: textSub,
                      textAlign: "right",
                      paddingRight: "8px",
                      fontWeight: 500,
                    }}
                  >
                    <span>{formatShortLakhs(maxBubbleAmount)}</span>
                    <span>{formatShortLakhs(Math.round((maxBubbleAmount * 2) / 3))}</span>
                    <span>{formatShortLakhs(Math.round(maxBubbleAmount / 3))}</span>
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
                      borderLeft: isDark ? "1px solid #334155" : "1px solid #cbd5e1",
                      borderBottom: isDark ? "1px solid #334155" : "1px solid #cbd5e1",
                    }}
                  >
                    {/* Horizontal grid lines */}
                    <div style={{ position: "absolute", top: "33%", left: 0, right: 0, borderTop: isDark ? "1px dashed #262626" : "1px dashed #f1f5f9" }}></div>
                    <div style={{ position: "absolute", top: "66%", left: 0, right: 0, borderTop: isDark ? "1px dashed #262626" : "1px dashed #f1f5f9" }}></div>

                    {/* Vertical grid lines */}
                    <div style={{ position: "absolute", left: "25%", top: 0, bottom: 0, borderLeft: isDark ? "1px dashed #262626" : "1px dashed #f1f5f9" }}></div>
                    <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, borderLeft: isDark ? "1px dashed #262626" : "1px dashed #f1f5f9" }}></div>
                    <div style={{ position: "absolute", left: "75%", top: 0, bottom: 0, borderLeft: isDark ? "1px dashed #262626" : "1px dashed #f1f5f9" }}></div>

                    {/* Quadrant Labels */}
                    <div
                      className="position-absolute"
                      style={{
                        top: "12px",
                        left: "15px",
                        fontSize: "11px",
                        fontWeight: 700,
                        color: isDark ? "#4ade80" : "#16a34a",
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
                        color: textSub,
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
                        color: textSub,
                      }}
                    >
                      Small & fast
                    </div>

                    {/* Dynamic Deal Bubbles */}
                    {rawRows.length === 0 ? (
                      <div className="d-flex align-items-center justify-content-center h-100" style={{ fontSize: "12px", color: textSub }}>
                        No deal cycle records available.
                      </div>
                    ) : (
                      rawRows.map((r, idx) => {
                        const isWon = String(r.outcome).toLowerCase() === "won";
                        const cycle = Number(r.cycle_days || 0);
                        const leftPct = Math.min(85, Math.max(5, Math.round((cycle / 60) * 100)));
                        const amt = Number(r.amount || 0);
                        const topPct = Math.min(78, Math.max(12, Math.round(100 - (amt / maxBubbleAmount) * 85)));
                        const color = isWon ? (isDark ? "#22c55e" : "#16a34a") : (isDark ? "#ef4444" : "#dc2626");

                        return (
                          <div
                            key={r.opportunity_id || idx}
                            className="position-absolute d-flex align-items-center gap-2"
                            style={{
                              left: `${leftPct}%`,
                              top: `${topPct}%`,
                            }}
                          >
                            <div
                              className="rounded-0"
                              style={{
                                width: "18px",
                                height: "18px",
                                borderRadius: 0,
                                backgroundColor: color,
                                boxShadow: `0 0 0 4px ${isWon ? (isDark ? "rgba(34, 197, 94, 0.25)" : "rgba(22, 163, 74, 0.2)") : (isDark ? "rgba(239, 68, 68, 0.25)" : "rgba(220, 38, 38, 0.2)")}`,
                                cursor: "pointer",
                              }}
                              title={`${r.opportunity_name || "Deal"}: ${formatCurrency(amt)} (${cycle} days)`}
                              onClick={() => setSelectedDealForModal(r)}
                            ></div>
                            <div>
                              <div style={{ fontSize: "11.5px", fontWeight: 700, color: textTitle }}>
                                {r.opportunity_name || "—"}
                              </div>
                              <div style={{ fontSize: "10.5px", color: textSub }}>
                                {formatCurrency(amt)} • {cycle} days
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* X-Axis Labels */}
                  <div
                    className="position-absolute d-flex justify-content-between"
                    style={{
                      left: "55px",
                      right: "20px",
                      bottom: "10px",
                      fontSize: "11px",
                      color: textSub,
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
                    Win rate
                  </h6>
                  <span style={{ fontSize: "11.5px", color: textSub }}>
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
                    style={{
                      fontSize: "12px",
                      fontWeight: 500,
                      marginTop: "-20px",
                      color: textSub,
                    }}
                  >
                    {wonDealsCount} won • {lostDealsCount} lost
                  </div>
                  {/* Scale marks */}
                  <div
                    className="d-flex justify-content-between px-4 mt-2"
                    style={{ fontSize: "11px", color: textSub, fontWeight: 500 }}
                  >
                    <span>0%</span>
                    <span>100%</span>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* CARD 2: KEY TAKEAWAYS */}
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
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <h6 className="fw-bold mb-0" style={{ fontSize: "14px", color: textTitle }}>
                    Key takeaways
                  </h6>
                  <Badge
                    color="light"
                    className="border rounded-0"
                    style={{
                      fontSize: "11px",
                      fontWeight: 500,
                      borderRadius: 0,
                      padding: "2px 8px",
                      backgroundColor: subtleBg,
                      borderColor: subtleBorder,
                      color: textSub,
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
                        borderRadius: 0,
                        backgroundColor: "#16a34a",
                        flexShrink: 0,
                        marginTop: "5px",
                      }}
                    ></span>
                    <span style={{ fontSize: "12.5px", color: textTitle, lineHeight: "1.4" }}>
                      <strong>{formatCurrency(wonRevenue)}</strong> won across {wonDealsCount} {wonDealsCount === 1 ? "deal" : "deals"}; {lostDealsCount} {lostDealsCount === 1 ? "deal" : "deals"} lost ({formatCurrency(lostRevenue)}).
                    </span>
                  </div>

                  <div className="d-flex align-items-start gap-2">
                    <span
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: 0,
                        backgroundColor: "#f59e0b",
                        flexShrink: 0,
                        marginTop: "5px",
                      }}
                    ></span>
                    <span style={{ fontSize: "12.5px", color: textTitle, lineHeight: "1.4" }}>
                      Average closed sales cycle is <strong>{avgSalesCycle} days</strong> with avg deal size {formatCurrency(avgDealSize)}.
                    </span>
                  </div>

                  <div className="d-flex align-items-start gap-2">
                    <span
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: 0,
                        backgroundColor: "#3b82f6",
                        flexShrink: 0,
                        marginTop: "5px",
                      }}
                    ></span>
                    <span style={{ fontSize: "12.5px", color: textTitle, lineHeight: "1.4" }}>
                      Win rate needs about 10 closed deals to be reliable.
                    </span>
                  </div>

                  <div className="d-flex align-items-start gap-2">
                    <span
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: 0,
                        backgroundColor: "#64748b",
                        flexShrink: 0,
                        marginTop: "5px",
                      }}
                    ></span>
                    <span style={{ fontSize: "12.5px", color: textTitle, lineHeight: "1.4" }}>
                      Add a Lost reason to unlock loss analysis.
                    </span>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* CARD 3: WIN RATE BY SALES REP */}
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
                    Win rate by sales rep
                  </h6>
                  <span style={{ fontSize: "11.5px", color: textSub }}>
                    Click a rep to filter the page
                  </span>
                </div>

                {/* Micro Table */}
                <div className="table-responsive">
                  <Table className="table-sm table-borderless align-middle mb-0" style={{ fontSize: "12px" }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${cardBorder}`, color: textSub, fontSize: "10.5px" }}>
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
                                className="rounded-0"
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
                          <td className="text-center fw-semibold" style={{ padding: "8px 4px", color: textTitle }}>
                            {r.won}
                          </td>
                          <td className="text-center" style={{ padding: "8px 4px", color: textSub }}>
                            {r.lost}
                          </td>
                          <td style={{ padding: "8px 4px", minWidth: "85px" }}>
                            <div className="d-flex align-items-center gap-1.5">
                              <div
                                className="rounded-0"
                                style={{
                                  flex: 1,
                                  height: "6px",
                                  backgroundColor: isDark ? "#2d3748" : "#f1f5f9",
                                  borderRadius: 0,
                                  overflow: "hidden",
                                }}
                              >
                                <div
                                  className="rounded-0"
                                  style={{
                                    width: `${r.winRate}%`,
                                    height: "100%",
                                    backgroundColor: "#16a34a",
                                    borderRadius: 0,
                                  }}
                                ></div>
                              </div>
                              <span style={{ fontSize: "11px", fontWeight: 700, color: isDark ? "#4ade80" : "#16a34a" }}>
                                {r.winRate}%
                              </span>
                            </div>
                          </td>
                          <td className="text-end fw-bold" style={{ padding: "8px 4px", color: textTitle }}>
                            {formatShortLakhs(r.revenue)}
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
                  {repsData.length === 0
                    ? "No closed deals recorded by sales reps yet."
                    : `${repsData.length} sales ${repsData.length === 1 ? "rep" : "reps"} with closed deal outcomes.`}
                </div>
              </CardBody>
            </Card>
          </div>
        </Col>
      </Row>

      {/* 4. ROW 3: CLOSED DEALS LEDGER TABLE */}
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
                Closed Deals Ledger
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
                  className="rounded-0"
                  placeholder="Search deal or customer..."
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

              {/* Outcome Filter */}
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
              <thead style={{ backgroundColor: subtleBg, color: textSub, borderBottom: `1px solid ${cardBorder}` }}>
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
                    <td colSpan={8} className="text-center py-4" style={{ color: textSub }}>
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
                          <Link
                            to={`/crm/opportunities/${r.opportunity_id}`}
                            className="fw-bold text-decoration-none hover-underline"
                            style={{ color: textTitle }}
                          >
                            {r.opportunity_name || "—"}
                          </Link>
                        </td>

                        {/* CUSTOMER */}
                        <td style={{ color: textSub }}>
                          {r.account_id ? (
                            <Link
                              to={`/crm/customers/${r.account_id}`}
                              className="text-decoration-underline fw-medium"
                              style={{ fontSize: "12.5px", color: isDark ? "#60a5fa" : "#2563eb" }}
                            >
                              {r.customer_name || "—"}
                            </Link>
                          ) : (
                            r.customer_name || "—"
                          )}
                        </td>

                        {/* SALES REP */}
                        <td>
                          <div className="d-flex align-items-center gap-1.5">
                            <span
                              className="rounded-0"
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
                              {(r.sales_rep || "UN")
                                .split(" ")
                                .map((w) => w[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()}
                            </span>
                            <span className="fw-medium" style={{ color: textTitle }}>
                              {r.sales_rep || "Unassigned"}
                            </span>
                          </div>
                        </td>

                        {/* AMOUNT */}
                        <td className="fw-bold" style={{ color: textTitle }}>
                          {formatCurrency(r.amount || 0)}
                        </td>

                        {/* CLOSE DATE */}
                        <td style={{ color: textSub }}>
                          {r.close_date || "—"}
                        </td>

                        {/* OUTCOME */}
                        <td>
                          {isWon ? (
                            <span
                              className="rounded-0"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "3px 8px",
                                borderRadius: 0,
                                backgroundColor: isDark ? "rgba(22, 163, 74, 0.2)" : "#dcfce7",
                                color: isDark ? "#4ade80" : "#15803d",
                                border: isDark ? "1px solid rgba(74, 222, 128, 0.3)" : "1px solid #bbf7d0",
                                fontSize: "11.5px",
                                fontWeight: 600,
                              }}
                            >
                              <i className="ri-check-line"></i>
                              <span>Won</span>
                            </span>
                          ) : (
                            <span
                              className="rounded-0"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "3px 8px",
                                borderRadius: 0,
                                backgroundColor: isDark ? "rgba(239, 68, 68, 0.2)" : "#fee2e2",
                                color: isDark ? "#f87171" : "#b91c1c",
                                border: isDark ? "1px solid rgba(248, 113, 113, 0.3)" : "1px solid #fecaca",
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
                            className="rounded-0"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "3px 8px",
                              borderRadius: 0,
                              backgroundColor: cycleDays <= 1 ? (isDark ? "rgba(245, 158, 11, 0.2)" : "#fef3c7") : (isDark ? "#2d3748" : "#f1f5f9"),
                              color: cycleDays <= 1 ? (isDark ? "#fbbf24" : "#b45309") : textTitle,
                              border: cycleDays <= 1 ? (isDark ? "1px solid rgba(245, 158, 11, 0.35)" : "1px solid #fde68a") : (isDark ? "1px solid #334155" : "1px solid #e2e8f0"),
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
                            className="btn btn-sm rounded-0"
                            style={{
                              backgroundColor: subtleBg,
                              border: `1px solid ${subtleBorder}`,
                              color: textTitle,
                              fontSize: "12px",
                              fontWeight: 500,
                              borderRadius: 0,
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
                <tfoot style={{ backgroundColor: subtleBg, borderTop: `2px solid ${cardBorder}` }}>
                  <tr style={{ fontWeight: 700, fontSize: "12px", color: textTitle }}>
                    <td colSpan={3}>
                      TOTAL ({filteredRows.length} {filteredRows.length === 1 ? "deal" : "deals"})
                    </td>
                    <td style={{ color: textTitle }}>
                      {formatCurrency(filteredRows.reduce((a, b) => a + Number(b.amount || 0), 0))}
                    </td>
                    <td></td>
                    <td style={{ color: isDark ? "#4ade80" : "#16a34a" }}>
                      Won {filteredRows.filter(r => r.outcome === "Won").length} • Lost {filteredRows.filter(r => r.outcome === "Lost").length}
                    </td>
                    <td style={{ color: textSub }}>
                      Avg {avgSalesCycle} d
                    </td>
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
              toggle={() => setSelectedDealForModal(null)}
              className="rounded-0 py-3"
              style={{ backgroundColor: subtleBg, borderBottom: `1px solid ${cardBorder}` }}
            >
              <span className="fw-bold" style={{ fontSize: "15px", color: textTitle }}>
                Deal Details
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
                  <div>
                    {selectedDealForModal.account_id ? (
                      <Link
                        to={`/crm/customers/${selectedDealForModal.account_id}`}
                        className="fw-semibold text-decoration-underline"
                        style={{ color: isDark ? "#60a5fa" : "#2563eb" }}
                      >
                        {selectedDealForModal.customer_name}
                      </Link>
                    ) : (
                      <span className="fw-semibold" style={{ color: textTitle }}>
                        {selectedDealForModal.customer_name}
                      </span>
                    )}
                  </div>
                </div>
                <div className="col-6">
                  <label className="small mb-1" style={{ color: textSub }}>Sales Rep</label>
                  <div className="fw-semibold" style={{ color: textTitle }}>
                    {selectedDealForModal.sales_rep}
                  </div>
                </div>
                <div className="col-6">
                  <label className="small mb-1" style={{ color: textSub }}>Amount</label>
                  <div className="fw-bold" style={{ color: textTitle }}>
                    {formatCurrency(selectedDealForModal.amount || 0)}
                  </div>
                </div>
                <div className="col-6">
                  <label className="small mb-1" style={{ color: textSub }}>Outcome</label>
                  <div>
                    <span
                      className="rounded-0"
                      style={{
                        display: "inline-block",
                        padding: "2px 8px",
                        borderRadius: 0,
                        backgroundColor: selectedDealForModal.outcome === "Won"
                          ? (isDark ? "rgba(22, 163, 74, 0.2)" : "#dcfce7")
                          : (isDark ? "rgba(239, 68, 68, 0.2)" : "#fee2e2"),
                        color: selectedDealForModal.outcome === "Won"
                          ? (isDark ? "#4ade80" : "#15803d")
                          : (isDark ? "#f87171" : "#b91c1c"),
                        border: selectedDealForModal.outcome === "Won"
                          ? (isDark ? "1px solid rgba(74, 222, 128, 0.3)" : "1px solid #bbf7d0")
                          : (isDark ? "1px solid rgba(248, 113, 113, 0.3)" : "1px solid #fecaca"),
                        fontSize: "11.5px",
                        fontWeight: 600,
                      }}
                    >
                      {selectedDealForModal.outcome}
                    </span>
                  </div>
                </div>
                <div className="col-6">
                  <label className="small mb-1" style={{ color: textSub }}>Close Date</label>
                  <div style={{ color: textTitle }}>
                    {selectedDealForModal.close_date}
                  </div>
                </div>
                <div className="col-6">
                  <label className="small mb-1" style={{ color: textSub }}>Sales Cycle</label>
                  <div style={{ color: textTitle }}>
                    {selectedDealForModal.cycle_days || 0} days
                  </div>
                </div>
              </div>
            </ModalBody>
            <ModalFooter className="rounded-0 py-2" style={{ backgroundColor: subtleBg, borderTop: `1px solid ${cardBorder}` }}>
              <Link
                to={`/crm/opportunities/${selectedDealForModal.opportunity_id}`}
                className="btn btn-sm rounded-0 text-white"
                style={{ backgroundColor: "#7f1d1d", borderColor: "#7f1d1d", borderRadius: 0 }}
              >
                Open Full Opportunity
              </Link>
              <Button
                color="light"
                size="sm"
                className="rounded-0"
                style={{ backgroundColor: subtleBg, borderColor: subtleBorder, color: textTitle, borderRadius: 0 }}
                onClick={() => setSelectedDealForModal(null)}
              >
                Close
              </Button>
            </ModalFooter>
          </div>
        </Modal>
      )}

      {/* MODAL 2: CHECK CLOSE DATES INFO */}
      <Modal
        isOpen={checkDatesModalOpen}
        toggle={() => setCheckDatesModalOpen(false)}
        centered
        contentClassName="rounded-0 shadow-lg"
        style={{ maxWidth: "520px" }}
      >
        <div style={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}` }}>
          <ModalHeader
            toggle={() => setCheckDatesModalOpen(false)}
            className="rounded-0 py-3"
            style={{ backgroundColor: subtleBg, borderBottom: `1px solid ${cardBorder}` }}
          >
            <span className="fw-bold" style={{ fontSize: "15px", color: textTitle }}>
              Sales Cycle Audit &amp; Close Dates
            </span>
          </ModalHeader>
          <ModalBody className="p-3" style={{ backgroundColor: cardBg }}>
            <p className="small mb-3" style={{ color: textSub }}>
              Sales cycle duration is calculated as the difference between the deal&apos;s <strong>Created Date</strong> and its <strong>Actual Close Date</strong>.
            </p>
            <div
              className="p-3 mb-3 rounded-0"
              style={{
                backgroundColor: isDark ? "rgba(245, 158, 11, 0.15)" : "#fef3c7",
                border: isDark ? "1px solid rgba(245, 158, 11, 0.35)" : "1px solid #fde68a",
                borderRadius: 0,
                fontSize: "12.5px",
                color: isDark ? "#fbbf24" : "#92400e",
              }}
            >
              <strong>Note on 0-day cycle:</strong> Deals closed on the day of creation indicate either an existing offline transaction entered at closing or an immediate conversion. For high-value enterprise sales, ensure created dates reflect when discussions first started.
            </div>
            <div className="d-flex flex-column gap-2">
              {rawRows.map((r, i) => (
                <div
                  key={i}
                  className="d-flex align-items-center justify-content-between p-2 rounded-0"
                  style={{
                    fontSize: "12px",
                    borderRadius: 0,
                    backgroundColor: subtleBg,
                    border: `1px solid ${cardBorder}`,
                  }}
                >
                  <div>
                    <strong style={{ color: textTitle }}>{r.opportunity_name}</strong>
                    <div style={{ fontSize: "11px", color: textSub }}>
                      Close Date: {r.close_date}
                    </div>
                  </div>
                  <span
                    className="rounded-0"
                    style={{
                      display: "inline-block",
                      padding: "2px 8px",
                      borderRadius: 0,
                      backgroundColor: Number(r.cycle_days) === 0
                        ? (isDark ? "rgba(245, 158, 11, 0.2)" : "#fef3c7")
                        : (isDark ? "rgba(14, 116, 144, 0.2)" : "#ecfeff"),
                      color: Number(r.cycle_days) === 0
                        ? (isDark ? "#fbbf24" : "#b45309")
                        : (isDark ? "#22d3ee" : "#0e7490"),
                      border: Number(r.cycle_days) === 0
                        ? (isDark ? "1px solid rgba(245, 158, 11, 0.35)" : "1px solid #fde68a")
                        : (isDark ? "1px solid rgba(34, 211, 238, 0.3)" : "1px solid #a5f3fc"),
                      fontSize: "11.5px",
                      fontWeight: 600,
                    }}
                  >
                    {r.cycle_days} days
                  </span>
                </div>
              ))}
            </div>
          </ModalBody>
          <ModalFooter className="rounded-0 py-2" style={{ backgroundColor: subtleBg, borderTop: `1px solid ${cardBorder}` }}>
            <Button
              color="light"
              size="sm"
              className="rounded-0"
              style={{ backgroundColor: subtleBg, borderColor: subtleBorder, color: textTitle, borderRadius: 0 }}
              onClick={() => setCheckDatesModalOpen(false)}
            >
              Done
            </Button>
          </ModalFooter>
        </div>
      </Modal>
    </div>
  );
};

export default WinLossAnalysisReportView;

