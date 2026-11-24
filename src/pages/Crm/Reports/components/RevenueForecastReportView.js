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

  const { layoutModeType } = useSelector((state) => ({
    layoutModeType: state.Layout.layoutModeType,
  }));
  const isDark = layoutModeType === "dark";

  const cardBg = isDark ? "#121212" : "#ffffff";
  const cardBorder = isDark ? "#2d3748" : "#e2e8f0";
  const subtleBg = isDark ? "#1a202c" : "#f8fafc";
  const subtleBorder = isDark ? "#334155" : "#cbd5e1";
  const textTitle = isDark ? "#f8fafc" : "#0f172a";
  const textSub = isDark ? "#94a3b8" : "#64748b";
  const primaryColor = isDark ? "#fca5a5" : "#7f1d1d";

  const rawRows = useMemo(() => {
    return Array.isArray(reportResult?.rows) ? reportResult.rows : [];
  }, [reportResult]);

  const summary = useMemo(() => {
    return reportResult?.summary || {};
  }, [reportResult]);

  const chartData = useMemo(() => {
    return Array.isArray(reportResult?.chart_data) ? reportResult.chart_data : [];
  }, [reportResult]);

  // Helper for Rep Initials
  const getInitials = (name) => {
    const parts = String(name || "").trim().split(" ").filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (name || "UN").slice(0, 2).toUpperCase();
  };

  // Executive KPI Calculations
  const grossPipeline = Number(
    summary.gross_pipeline ??
      rawRows.reduce((a, b) => a + Number(b.amount || 0), 0) ??
      0
  );
  const weightedForecast = Number(
    summary.weighted_forecast ??
      rawRows.reduce((a, b) => a + Number(b.weighted_amount || 0), 0) ??
      0
  );
  const activeDealsCount = Number(
    summary.active_deals_count ?? rawRows.length ?? 0
  );
  const confidencePct =
    grossPipeline > 0 ? Math.round((weightedForecast / grossPipeline) * 100) : 0;
  const riskHaircut = Math.max(0, grossPipeline - weightedForecast);
  const avgDealSize =
    activeDealsCount > 0 ? Math.round(grossPipeline / activeDealsCount) : 0;

  // Next expected close calculation
  const nextCloseDeal = useMemo(() => {
    const withDates = rawRows
      .filter((r) => r.expected_close_date)
      .map((r) => ({ ...r, _d: new Date(r.expected_close_date) }))
      .filter((r) => !isNaN(r._d.getTime()))
      .sort((a, b) => a._d - b._d);
    return withDates[0] || null;
  }, [rawRows]);

  const nextCloseDateStr = nextCloseDeal ? nextCloseDeal._d.toISOString() : null;

  const formattedNextCloseDate = useMemo(() => {
    if (!nextCloseDateStr) return "No close date";
    try {
      const d = new Date(nextCloseDateStr);
      if (isNaN(d.getTime())) return "No close date";
      return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "No close date";
    }
  }, [nextCloseDateStr]);

  const nextCloseQuarterLabel = useMemo(() => {
    if (!nextCloseDateStr) return "";
    const d = new Date(nextCloseDateStr);
    if (isNaN(d.getTime())) return "";
    return `Q${Math.floor(d.getMonth() / 3) + 1} ${d.getFullYear()}`;
  }, [nextCloseDateStr]);

  // Dynamic 6-month timeline labels starting from current month
  const timelineMonths = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      return d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
    });
  }, []);

  const todayShortLabel = useMemo(() => {
    return new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  }, []);

  // Dynamic stage breakdown for Pipeline by Stage card
  const stageBreakdown = useMemo(() => {
    const palette = ["#0d9488", "#2563eb", "#7f1d1d", "#d97706", "#7c3aed"];
    const map = {};
    rawRows.forEach((r) => {
      const st = r.stage_name || "Unstaged";
      if (!map[st]) map[st] = { name: st, deals: 0, gross: 0, weighted: 0, probSum: 0 };
      map[st].deals += 1;
      const amt = Number(r.amount || 0);
      const prob = Number(r.probability ?? 0);
      map[st].gross += amt;
      map[st].weighted += Number(r.weighted_amount ?? amt * (prob / 100));
      map[st].probSum += prob;
    });
    const list = Object.values(map).sort((a, b) => b.gross - a.gross);
    const totalGross = list.reduce((s, x) => s + x.gross, 0);
    return list.map((item, idx) => ({
      ...item,
      avgProb: item.deals > 0 ? Math.round(item.probSum / item.deals) : 0,
      sharePct: totalGross > 0 ? Math.round((item.gross / totalGross) * 100) : 0,
      color: palette[idx % palette.length],
    }));
  }, [rawRows]);

  const waterfallMax = Math.max(grossPipeline, targetAmount, 1);
  const grossBarH = grossPipeline > 0 ? Math.max(12, Math.round((grossPipeline / waterfallMax) * 140)) : 4;
  const weightedBarH = weightedForecast > 0 ? Math.max(8, Math.round((weightedForecast / waterfallMax) * 140)) : 4;
  const haircutBarH = riskHaircut > 0 ? Math.max(8, Math.round((riskHaircut / waterfallMax) * 140)) : 4;
  const haircutPct = grossPipeline > 0 ? Math.round((riskHaircut / grossPipeline) * 100) : 0;

  const calculateDaysToClose = (dateStr) => {
    if (!dateStr) return 0;
    try {
      const closeDate = new Date(dateStr);
      const now = new Date();
      const diffTime = closeDate - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return isNaN(diffDays) ? 0 : Math.max(0, diffDays);
    } catch {
      return 0;
    }
  };
  const daysToClose = calculateDaysToClose(nextCloseDateStr);

  // Dynamic Rep Forecast Breakdown
  const repForecastData = useMemo(() => {
    const map = {};
    rawRows.forEach((r) => {
      const rep = r.sales_rep || "Unassigned";
      if (!map[rep]) map[rep] = { name: rep, deals: 0, gross: 0, weighted: 0 };
      map[rep].deals += 1;
      map[rep].gross += Number(r.amount || 0);
      map[rep].weighted += Number(
        r.weighted_amount ||
          Number(r.amount || 0) * (Number(r.probability || 50) / 100)
      );
    });
    return Object.values(map);
  }, [rawRows]);

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
            className="h-100"
            style={{
              borderRadius: 0,
              backgroundColor: cardBg,
              border: `1px solid ${cardBorder}`,
              boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
            }}
          >
            <CardBody className="p-3 d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-2.5">
                <div
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: 0,
                    backgroundColor: isDark ? "rgba(153, 27, 27, 0.2)" : "#fef2f2",
                    color: isDark ? "#f87171" : "#991b1b",
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
                    className="text-uppercase fw-semibold d-block mb-0.5"
                    style={{ fontSize: "10.5px", letterSpacing: "0.3px", color: textSub }}
                  >
                    GROSS PIPELINE
                  </span>
                  <div
                    className="fw-bold font-monospace"
                    style={{ fontSize: "22px", lineHeight: "1.1", color: textTitle }}
                  >
                    {formatCurrency(grossPipeline)}
                  </div>
                  <div style={{ fontSize: "11px", color: textSub, marginTop: "4px" }}>
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
            className="h-100"
            style={{
              borderRadius: 0,
              backgroundColor: cardBg,
              border: `1px solid ${cardBorder}`,
              boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
            }}
          >
            <CardBody className="p-3 d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-2.5">
                <div
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: 0,
                    backgroundColor: isDark ? "rgba(22, 101, 52, 0.2)" : "#f0fdf4",
                    color: isDark ? "#4ade80" : "#166534",
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
                    className="text-uppercase fw-semibold d-block mb-0.5"
                    style={{ fontSize: "10.5px", letterSpacing: "0.3px", color: textSub }}
                  >
                    WEIGHTED FORECAST
                  </span>
                  <div
                    className="fw-bold font-monospace"
                    style={{ fontSize: "22px", lineHeight: "1.1", color: textTitle }}
                  >
                    {formatCurrency(weightedForecast)}
                  </div>
                  <div style={{ fontSize: "11px", color: textSub, marginTop: "4px" }}>
                    Expected revenue • {confidencePct}% of gross
                  </div>
                </div>
              </div>

              {/* Confidence Mini Gauge */}
              <div style={{ width: "75px", textAlign: "right" }}>
                <span className="d-block mb-1" style={{ fontSize: "10px", color: textSub }}>
                  Confidence {confidencePct}%
                </span>
                <div
                  className="progress"
                  style={{
                    height: "4px",
                    backgroundColor: isDark ? "#2d3748" : "#e2e8f0",
                    borderRadius: 0,
                    overflow: "hidden",
                  }}
                >
                  <div
                    className="progress-bar"
                    style={{ width: `${confidencePct}%`, backgroundColor: "#16a34a", borderRadius: 0 }}
                  ></div>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>

        {/* Card 3: ACTIVE DEALS */}
        <Col lg={3} sm={6}>
          <Card
            className="h-100"
            style={{
              borderRadius: 0,
              backgroundColor: cardBg,
              border: `1px solid ${cardBorder}`,
              boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
            }}
          >
            <CardBody className="p-3 d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-2.5">
                <div
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: 0,
                    backgroundColor: isDark ? "rgba(29, 78, 216, 0.2)" : "#eff6ff",
                    color: isDark ? "#60a5fa" : "#1d4ed8",
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
                    className="text-uppercase fw-semibold d-block mb-0.5"
                    style={{ fontSize: "10.5px", letterSpacing: "0.3px", color: textSub }}
                  >
                    ACTIVE DEALS
                  </span>
                  <div
                    className="fw-bold font-monospace"
                    style={{ fontSize: "22px", lineHeight: "1.1", color: textTitle }}
                  >
                    {activeDealsCount}
                  </div>
                  <div style={{ fontSize: "11px", color: textSub, marginTop: "4px" }}>
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
            className="h-100"
            style={{
              borderRadius: 0,
              backgroundColor: cardBg,
              border: `1px solid ${cardBorder}`,
              boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
            }}
          >
            <CardBody className="p-3 d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-2.5">
                <div
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: 0,
                    backgroundColor: isDark ? "rgba(180, 83, 9, 0.2)" : "#fffbeb",
                    color: isDark ? "#fbbf24" : "#b45309",
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
                    className="text-uppercase fw-semibold d-block mb-0.5"
                    style={{ fontSize: "10.5px", letterSpacing: "0.3px", color: textSub }}
                  >
                    NEXT EXPECTED CLOSE
                  </span>
                  <div
                    className="fw-bold"
                    style={{ fontSize: "20px", lineHeight: "1.1", color: textTitle }}
                  >
                    {formattedNextCloseDate}
                  </div>
                  <div style={{ fontSize: "11px", color: textSub, marginTop: "4px" }}>
                    {nextCloseDateStr ? `In ${daysToClose} days • ${nextCloseQuarterLabel}` : "No scheduled open deals"}
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
              style={{
                borderRadius: 0,
                backgroundColor: cardBg,
                border: `1px solid ${cardBorder}`,
                boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
              }}
            >
              <div
                className="p-3 border-bottom d-flex align-items-center justify-content-between flex-wrap gap-2"
                style={{ borderRadius: 0, borderColor: cardBorder, backgroundColor: cardBg }}
              >
                <div>
                  <h6 className="fw-bold mb-0" style={{ fontSize: "14px", color: textTitle }}>
                    From gross pipeline to weighted forecast
                  </h6>
                  <span style={{ fontSize: "11.5px", color: textSub }}>
                    How deal-stage probability reduces what you can expect to earn
                  </span>
                </div>

                {/* Legend */}
                <div className="d-flex align-items-center gap-3" style={{ fontSize: "11px" }}>
                  <span className="d-flex align-items-center gap-1" style={{ color: textTitle }}>
                    <span style={{ color: isDark ? "#38bdf8" : "#93c5fd", fontSize: "12px" }}>●</span> Gross
                  </span>
                  <span className="d-flex align-items-center gap-1" style={{ color: textTitle }}>
                    <span style={{ color: isDark ? "#ef4444" : "#dc2626", fontSize: "12px" }}>●</span> Risk haircut
                  </span>
                  <span className="d-flex align-items-center gap-1" style={{ color: textTitle }}>
                    <span style={{ color: isDark ? "#fca5a5" : "#7f1d1d", fontSize: "12px" }}>●</span> Weighted
                  </span>
                </div>
              </div>

              <CardBody className="p-3">
                {/* Visual Waterfall Bridge Columns */}
                <div
                  className="p-3 border mb-3 position-relative"
                  style={{
                    backgroundColor: isDark ? "#161b22" : "#fafafa",
                    borderColor: cardBorder,
                    height: "230px",
                    display: "flex",
                    alignItems: "flex-end",
                    justifyContent: "space-around",
                    borderRadius: 0,
                  }}
                >
                  {/* Y-Axis Reference Ticks */}
                  <div
                    className="position-absolute start-0 top-0 bottom-0 d-flex flex-column justify-content-between ps-2"
                    style={{ fontSize: "10.5px", pointerEvents: "none", color: textSub }}
                  >
                    <span>{formatShortLakhs(waterfallMax)}</span>
                    <span>{formatShortLakhs(Math.round(waterfallMax * 0.75))}</span>
                    <span>{formatShortLakhs(Math.round(waterfallMax * 0.5))}</span>
                    <span>{formatShortLakhs(Math.round(waterfallMax * 0.25))}</span>
                    <span>₹0</span>
                  </div>

                  {/* Pillar 1: Gross pipeline */}
                  <div className="d-flex flex-column align-items-center" style={{ width: "90px" }}>
                    <span
                      className="font-monospace fw-bold mb-1"
                      style={{ fontSize: "11.5px", color: textTitle }}
                    >
                      {formatCurrency(grossPipeline)}
                    </span>
                    <div
                      style={{
                        width: "80px",
                        height: `${grossBarH}px`,
                        backgroundColor: isDark ? "#38bdf8" : "#93c5fd",
                        borderRadius: 0,
                      }}
                    ></div>
                    <span className="fw-semibold mt-1" style={{ fontSize: "11px", color: textTitle }}>
                      Gross pipeline
                    </span>
                    <span style={{ fontSize: "10px", color: textSub }}>
                      {activeDealsCount} {activeDealsCount === 1 ? "deal" : "deals"}
                    </span>
                  </div>

                  {/* Pillar 2: Probability risk (Haircut) */}
                  <div className="d-flex flex-column align-items-center" style={{ width: "90px" }}>
                    <span
                      className="font-monospace fw-bold mb-1"
                      style={{ fontSize: "11.5px", color: isDark ? "#f87171" : "#dc2626" }}
                    >
                      - {formatCurrency(riskHaircut)}
                    </span>
                    <div style={{ height: `${Math.max(0, grossBarH - haircutBarH)}px` }}></div>
                    <div
                      style={{
                        width: "80px",
                        height: `${haircutBarH}px`,
                        backgroundColor: isDark ? "#ef4444" : "#dc2626",
                        borderRadius: 0,
                      }}
                    ></div>
                    <span className="fw-semibold mt-1" style={{ fontSize: "11px", color: textTitle }}>
                      Probability risk
                    </span>
                    <span style={{ fontSize: "10px", color: textSub }}>
                      {haircutPct}% of gross
                    </span>
                  </div>

                  {/* Pillar 3: Weighted forecast */}
                  <div className="d-flex flex-column align-items-center" style={{ width: "90px" }}>
                    <span
                      className="font-monospace fw-bold mb-1"
                      style={{ fontSize: "11.5px", color: isDark ? "#fca5a5" : "#7f1d1d" }}
                    >
                      {formatCurrency(weightedForecast)}
                    </span>
                    <div
                      style={{
                        width: "80px",
                        height: `${weightedBarH}px`,
                        backgroundColor: isDark ? "#991b1b" : "#7f1d1d",
                        borderRadius: 0,
                      }}
                    ></div>
                    <span className="fw-semibold mt-1" style={{ fontSize: "11px", color: textTitle }}>
                      Weighted forecast
                    </span>
                    <span style={{ fontSize: "10px", color: textSub }}>
                      {confidencePct}% confidence
                    </span>
                  </div>

                  {/* Pillar 4: Target */}
                  <div className="d-flex flex-column align-items-center" style={{ width: "90px" }}>
                    <span className="mb-1" style={{ fontSize: "11px", color: textSub }}>
                      {targetAmount > 0 ? formatCurrency(targetAmount) : "No target"}
                    </span>
                    <div
                      className="d-flex align-items-center justify-content-center"
                      style={{
                        width: "80px",
                        height: targetAmount > 0 ? "150px" : "110px",
                        border: `1px dashed ${isDark ? "#475569" : "#cbd5e1"}`,
                        backgroundColor: isDark ? "#1e2430" : "#ffffff",
                        borderRadius: 0,
                        cursor: "pointer",
                      }}
                      onClick={() => setTargetModalOpen(true)}
                    >
                      <span className="small" style={{ fontSize: "11px", color: textSub }}>
                        {targetAmount > 0 ? "Target set" : "Set target"}
                      </span>
                    </div>
                    <span className="fw-semibold mt-1" style={{ fontSize: "11px", color: textTitle }}>
                      Target
                    </span>
                    <span style={{ fontSize: "10px", color: textSub }}>
                      {targetAmount > 0 ? "Q1 Goal" : "Not set"}
                    </span>
                  </div>
                </div>

                {/* Sub-section: Expected Close Timeline */}
                <div className="pt-2" style={{ borderTop: `1px solid ${cardBorder}` }}>
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="fw-bold" style={{ fontSize: "12px", color: textTitle }}>
                      Expected close timeline
                    </span>
                  </div>

                  {/* Horizontal Timeline Track */}
                  <div className="position-relative py-3 my-1">
                    {/* Horizontal Line */}
                    <div
                      style={{
                        height: "2px",
                        backgroundColor: isDark ? "#334155" : "#e2e8f0",
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
                        borderTop: `2px dashed ${isDark ? "#fca5a5" : "#7f1d1d"}`,
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
                      <span className="fw-bold mb-0.5" style={{ fontSize: "10px", color: textTitle }}>
                        Today • {todayShortLabel}
                      </span>
                      <i className="ri-arrow-down-s-fill" style={{ fontSize: "14px", lineHeight: "0.5", color: textTitle }}></i>
                    </div>

                    {/* Days to Close Badge on Dotted Line */}
                    <div
                      className="position-absolute translate-middle-x"
                      style={{
                        left: "45%",
                        top: "2px",
                        backgroundColor: isDark ? "#1e293b" : "#ffffff",
                        border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}`,
                        padding: "1px 8px",
                        borderRadius: 0,
                        fontSize: "10px",
                        color: textTitle,
                        fontWeight: 600,
                      }}
                    >
                      {nextCloseDeal ? `${daysToClose} days to close` : "No open deals"}
                    </div>

                    {/* Milestone Deal Diamond Marker */}
                    {nextCloseDeal && (
                      <div
                        className="position-absolute d-flex flex-column align-items-center"
                        style={{ left: "78%", top: "-1px" }}
                      >
                        <div
                          style={{
                            width: "10px",
                            height: "10px",
                            backgroundColor: isDark ? "#f87171" : "#7f1d1d",
                            transform: "rotate(45deg)",
                          }}
                        ></div>
                        <div
                          className="mt-1 px-1.5 py-0.5 border"
                          style={{
                            backgroundColor: isDark ? "rgba(127, 29, 29, 0.3)" : "#fef2f2",
                            borderColor: isDark ? "rgba(248, 113, 113, 0.4)" : "#fecaca",
                            borderRadius: 0,
                            fontSize: "10px",
                            color: isDark ? "#fca5a5" : "#7f1d1d",
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {nextCloseDeal.opportunity_name || "Next Deal"} • {formattedNextCloseDate} • {formatShortLakhs(Number(nextCloseDeal.weighted_amount ?? nextCloseDeal.amount ?? 0))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Timeline Months Labels */}
                  <div
                    className="d-flex align-items-center justify-content-between mt-2"
                    style={{ fontSize: "10.5px", color: textSub }}
                  >
                    {timelineMonths.map((lbl) => (
                      <span key={lbl}>{lbl}</span>
                    ))}
                  </div>

                  <div className="mt-2 pt-1" style={{ borderTop: `1px solid ${cardBorder}`, fontSize: "11px", color: textSub }}>
                    Waterfall shows what probability removes from the pipeline; the timeline shows when the money is expected.
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Card B: Forecast vs target */}
            <Card
              style={{
                borderRadius: 0,
                backgroundColor: cardBg,
                border: `1px solid ${cardBorder}`,
                boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
              }}
            >
              <div
                className="p-3 border-bottom"
                style={{ borderRadius: 0, borderColor: cardBorder, backgroundColor: cardBg }}
              >
                <h6 className="fw-bold mb-0" style={{ fontSize: "14px", color: textTitle }}>
                  Forecast vs target
                </h6>
                <span style={{ fontSize: "11.5px", color: textSub }}>
                  Track progress to your revenue goal
                </span>
              </div>

              <CardBody className="p-3">
                {/* Empty Target Progress Track */}
                <div
                  className="progress mb-3"
                  style={{
                    height: "8px",
                    backgroundColor: isDark ? "#2d3748" : "#f1f5f9",
                    borderRadius: 0,
                  }}
                >
                  <div
                    className="progress-bar"
                    style={{
                      width: targetAmount > 0 ? `${Math.min(100, Math.round((weightedForecast / targetAmount) * 100))}%` : "0%",
                      backgroundColor: "#7f1d1d",
                      borderRadius: 0,
                    }}
                  ></div>
                </div>

                <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                  <div>
                    <span className="fw-bold d-block" style={{ fontSize: "13px", color: textTitle }}>
                      {targetAmount > 0 ? `Target: ${formatCurrency(targetAmount)} (${Math.round((weightedForecast / targetAmount) * 100)}% achieved)` : "No target set"}
                    </span>
                    <span style={{ fontSize: "11px", color: textSub }}>
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
                      borderRadius: 0,
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
              style={{
                borderRadius: 0,
                backgroundColor: cardBg,
                border: `1px solid ${cardBorder}`,
                boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
              }}
            >
              <div
                className="p-3 border-bottom d-flex align-items-center justify-content-between"
                style={{ borderRadius: 0, borderColor: cardBorder, backgroundColor: cardBg }}
              >
                <h6 className="fw-bold mb-0" style={{ fontSize: "14px", color: textTitle }}>
                  Forecast scenarios
                </h6>
                <span style={{ fontSize: "11px", color: textSub }}>
                  for the full period
                </span>
              </div>

              <CardBody className="p-3">
                <div className="d-flex flex-column gap-3">
                  {/* Scenario 1: Best case */}
                  <div>
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <div>
                        <span className="fw-bold d-block" style={{ fontSize: "12px", color: textTitle }}>
                          Best case
                        </span>
                        <span style={{ fontSize: "10.5px", color: textSub }}>
                          All deals close
                        </span>
                      </div>
                      <span className="font-monospace fw-bold" style={{ fontSize: "12.5px", color: textTitle }}>
                        {formatCurrency(grossPipeline)}
                      </span>
                    </div>
                    <div
                      className="progress"
                      style={{ height: "6px", backgroundColor: isDark ? "#2d3748" : "#f1f5f9", borderRadius: 0 }}
                    >
                      <div
                        className="progress-bar"
                        style={{ width: "100%", backgroundColor: "#16a34a", borderRadius: 0 }}
                      ></div>
                    </div>
                  </div>

                  {/* Scenario 2: Expected */}
                  <div>
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <div>
                        <span className="fw-bold d-block" style={{ fontSize: "12px", color: textTitle }}>
                          Expected
                        </span>
                        <span style={{ fontSize: "10.5px", color: textSub }}>
                          Probability-weighted
                        </span>
                      </div>
                      <span className="font-monospace fw-bold" style={{ fontSize: "12.5px", color: textTitle }}>
                        {formatCurrency(weightedForecast)}
                      </span>
                    </div>
                    <div
                      className="progress"
                      style={{ height: "6px", backgroundColor: isDark ? "#2d3748" : "#f1f5f9", borderRadius: 0 }}
                    >
                      <div
                        className="progress-bar"
                        style={{ width: `${confidencePct}%`, backgroundColor: isDark ? "#fca5a5" : "#7f1d1d", borderRadius: 0 }}
                      ></div>
                    </div>
                  </div>

                  {/* Scenario 3: Worst case */}
                  <div>
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <div>
                        <span className="fw-bold d-block" style={{ fontSize: "12px", color: textTitle }}>
                          Worst case
                        </span>
                        <span style={{ fontSize: "10.5px", color: textSub }}>
                          Deal slips or is lost
                        </span>
                      </div>
                      <span className="font-monospace" style={{ fontSize: "12.5px", color: textSub }}>
                        ₹0
                      </span>
                    </div>
                    <div
                      className="progress"
                      style={{ height: "6px", backgroundColor: isDark ? "#2d3748" : "#f1f5f9", borderRadius: 0 }}
                    >
                      <div className="progress-bar" style={{ width: "0%", borderRadius: 0 }}></div>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Card 2: Pipeline by stage */}
            <Card
              style={{
                borderRadius: 0,
                backgroundColor: cardBg,
                border: `1px solid ${cardBorder}`,
                boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
              }}
            >
              <div
                className="p-3 border-bottom d-flex align-items-center justify-content-between"
                style={{ borderRadius: 0, borderColor: cardBorder, backgroundColor: cardBg }}
              >
                <h6 className="fw-bold mb-0" style={{ fontSize: "14px", color: textTitle }}>
                  Pipeline by stage
                </h6>
                <span style={{ fontSize: "11px", color: textSub }}>
                  gross &rarr; weighted
                </span>
              </div>

              <CardBody className="p-3">
                {stageBreakdown.length === 0 ? (
                  <div className="py-3 text-center" style={{ fontSize: "12px", color: textSub }}>
                    No active pipeline stages in this period.
                  </div>
                ) : (
                  <>
                    {/* Dynamic Multi-Segment Stage Bar */}
                    <div className="d-flex mb-2.5" style={{ height: "24px", overflow: "hidden" }}>
                      {stageBreakdown.map((st) => (
                        <div
                          key={st.name}
                          className="d-flex align-items-center justify-content-center text-white fw-bold text-truncate px-1"
                          style={{
                            width: `${Math.max(st.sharePct, 8)}%`,
                            backgroundColor: st.color,
                            fontSize: "10.5px",
                          }}
                          title={`${st.name}: ${st.sharePct}% (${formatCurrency(st.gross)})`}
                        >
                          {st.sharePct >= 20 ? `${st.name} ${st.sharePct}%` : `${st.sharePct}%`}
                        </div>
                      ))}
                    </div>

                    {stageBreakdown.map((st, idx) => (
                      <div
                        key={st.name}
                        className="d-flex align-items-center justify-content-between pb-2 mb-2"
                        style={{ borderBottom: idx < stageBreakdown.length - 1 ? `1px solid ${cardBorder}` : "none" }}
                      >
                        <div>
                          <span className="d-flex align-items-center gap-1.5 fw-semibold" style={{ fontSize: "12px", color: textTitle }}>
                            <span style={{ color: st.color, fontSize: "12px" }}>●</span> {st.name}
                          </span>
                          <span style={{ fontSize: "11px", color: textSub }}>
                            Gross {formatCurrency(st.gross)}
                          </span>
                        </div>

                        <div className="text-end">
                          <span className="d-block" style={{ fontSize: "11px", color: textSub }}>
                            {st.deals} {st.deals === 1 ? "deal" : "deals"} • {st.avgProb}% avg prob
                          </span>
                          <span className="fw-bold font-monospace" style={{ fontSize: "12px", color: textTitle }}>
                            Weighted {formatCurrency(st.weighted)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </CardBody>
            </Card>

            {/* Card 3: Forecast by sales rep */}
            <Card
              style={{
                borderRadius: 0,
                backgroundColor: cardBg,
                border: `1px solid ${cardBorder}`,
                boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
              }}
            >
              <div
                className="p-3 border-bottom"
                style={{ borderRadius: 0, borderColor: cardBorder, backgroundColor: cardBg }}
              >
                <h6 className="fw-bold mb-0" style={{ fontSize: "14px", color: textTitle }}>
                  Forecast by sales rep
                </h6>
              </div>

              <CardBody className="p-3">
                {/* Rep Header */}
                <div
                  className="d-flex align-items-center text-uppercase fw-semibold pb-1.5 mb-1.5"
                  style={{ fontSize: "10px", letterSpacing: "0.3px", borderBottom: `1px solid ${cardBorder}`, color: textSub }}
                >
                  <div style={{ width: "120px" }}>REP</div>
                  <div style={{ width: "40px", textAlign: "center" }}>DEALS</div>
                  <div style={{ width: "60px", textAlign: "right" }}>GROSS</div>
                  <div style={{ width: "65px", textAlign: "right" }}>WEIGHTED</div>
                </div>

                {/* Rep Rows */}
                {repForecastData.length === 0 ? (
                  <div className="py-2 text-center" style={{ fontSize: "12px", color: textSub }}>
                    No sales rep forecast data.
                  </div>
                ) : (
                  repForecastData.map((rep, idx) => (
                    <div key={rep.name || idx} className="d-flex align-items-center py-1.5" style={{ fontSize: "12px" }}>
                      <div className="d-flex align-items-center gap-1.5" style={{ width: "120px", flexShrink: 0 }}>
                        <span
                          style={{
                            width: "22px",
                            height: "22px",
                            borderRadius: 0,
                            backgroundColor: isDark ? "rgba(153, 27, 27, 0.2)" : "#fef2f2",
                            color: isDark ? "#f87171" : "#991b1b",
                            fontSize: "10px",
                            fontWeight: 700,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {getInitials(rep.name)}
                        </span>
                        <span className="fw-medium text-truncate" style={{ fontSize: "11.5px", color: textTitle }}>
                          {rep.name}
                        </span>
                      </div>

                      <div className="text-center font-monospace" style={{ width: "40px", flexShrink: 0, color: textTitle }}>
                        {rep.deals}
                      </div>
                      <div className="text-end font-monospace" style={{ width: "60px", flexShrink: 0, color: textSub }}>
                        {formatShortLakhs(rep.gross)}
                      </div>
                      <div className="text-end font-monospace fw-bold" style={{ width: "65px", flexShrink: 0, color: textTitle }}>
                        {formatShortLakhs(rep.weighted)}
                      </div>
                    </div>
                  ))
                )}

                <div className="pt-2 mt-2" style={{ borderTop: `1px solid ${cardBorder}`, fontSize: "10.5px", color: textSub }}>
                  {repForecastData.length > 0
                    ? `${repForecastData.length} active sales rep${repForecastData.length > 1 ? "s" : ""} in pipeline.`
                    : "No forecast pipeline available."}
                </div>
              </CardBody>
            </Card>
          </div>
        </Col>
      </Row>

      {/* ─── ROW 3: OPPORTUNITY LEDGER TABLE ───────────────────────────────────── */}
      <Card
        className="mb-4"
        style={{
          borderRadius: 0,
          backgroundColor: cardBg,
          border: `1px solid ${cardBorder}`,
          boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
        }}
      >
        <div
          className="p-3 border-bottom d-flex flex-wrap align-items-center justify-content-between gap-2"
          style={{
            borderRadius: 0,
            borderColor: cardBorder,
            backgroundColor: cardBg,
          }}
        >
          <div>
            <h6 className="mb-0 fw-bold d-flex align-items-center gap-1.5" style={{ fontSize: "14px", color: textTitle }}>
              Opportunity Ledger
              <span className="fw-normal small ms-1" style={{ fontSize: "11.5px", color: textSub }}>
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
                  borderRadius: 0,
                  fontSize: "12px",
                  borderColor: isDark ? "#334155" : "#cbd5e1",
                  backgroundColor: isDark ? "#1a202c" : "#ffffff",
                  color: textTitle,
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
                borderRadius: 0,
                fontSize: "12px",
                borderColor: isDark ? "#334155" : "#cbd5e1",
                backgroundColor: isDark ? "#1a202c" : "#ffffff",
                color: textTitle,
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
                backgroundColor: isDark ? "#1a202c" : "#ffffff",
                color: textTitle,
                border: `1px solid ${isDark ? "#334155" : "#cbd5e1"}`,
                borderRadius: 0,
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
              <thead style={{ backgroundColor: subtleBg }}>
                <tr style={{ fontSize: "10.5px", color: textSub, textTransform: "uppercase", letterSpacing: "0.3px" }}>
                  <th style={{ width: "24%", borderBottom: `1px solid ${cardBorder}` }}>DEAL</th>
                  <th style={{ width: "12%", borderBottom: `1px solid ${cardBorder}` }}>STAGE</th>
                  <th style={{ width: "15%", borderBottom: `1px solid ${cardBorder}` }}>SALES REP</th>
                  <th style={{ width: "13%", borderBottom: `1px solid ${cardBorder}` }}>AMOUNT</th>
                  <th style={{ width: "14%", borderBottom: `1px solid ${cardBorder}` }}>PROBABILITY</th>
                  <th style={{ width: "12%", borderBottom: `1px solid ${cardBorder}` }}>WEIGHTED</th>
                  <th style={{ width: "14%", borderBottom: `1px solid ${cardBorder}` }}>EXPECTED CLOSE</th>
                  <th style={{ width: "100px", borderBottom: `1px solid ${cardBorder}` }} className="text-end pe-3">ACTIONS</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: "12.5px" }}>
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-4" style={{ color: textSub }}>
                      No opportunities match the selected filters.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((r, idx) => {
                    const prob = Number(r.probability ?? 0);
                    const amt = Number(r.amount ?? 0);
                    const wAmt = Number(r.weighted_amount ?? Math.round(amt * (prob / 100)));
                    const dealDays = calculateDaysToClose(r.expected_close_date);
                    const formattedDealClose = r.expected_close_date
                      ? (() => {
                          try {
                            const d = new Date(r.expected_close_date);
                            return isNaN(d.getTime())
                              ? r.expected_close_date
                              : d.toLocaleDateString("en-GB", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                });
                          } catch {
                            return r.expected_close_date;
                          }
                        })()
                      : "—";

                    return (
                      <tr key={r.opportunity_id || idx} style={{ borderBottom: `1px solid ${cardBorder}` }}>
                        {/* DEAL */}
                        <td>
                          <div>
                            <Link
                              to={r.opportunity_id ? `/crm/opportunities/${r.opportunity_id}` : "/crm/opportunities"}
                              className="fw-bold text-decoration-none d-block"
                              style={{ fontSize: "12.5px", color: textTitle }}
                            >
                              {r.opportunity_name || "—"}
                            </Link>
                            <span className="d-block" style={{ fontSize: "11px", color: isDark ? "#60a5fa" : "#2563eb" }}>
                              {r.customer_name || "—"}
                            </span>
                          </div>
                        </td>

                        {/* STAGE */}
                        <td>
                          <span
                            style={{
                              backgroundColor: isDark ? "rgba(13, 148, 136, 0.2)" : "#f0fdf4",
                              color: isDark ? "#2dd4bf" : "#0d9488",
                              border: `1px solid ${isDark ? "rgba(13, 148, 136, 0.3)" : "#bbf7d0"}`,
                              fontSize: "11px",
                              fontWeight: 600,
                              padding: "2.5px 8px",
                              borderRadius: 0,
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
                                borderRadius: 0,
                                backgroundColor: isDark ? "rgba(153, 27, 27, 0.2)" : "#fef2f2",
                                color: isDark ? "#f87171" : "#991b1b",
                                fontSize: "10px",
                                fontWeight: 700,
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              {getInitials(r.sales_rep)}
                            </span>
                            <span className="fw-medium" style={{ fontSize: "12px", color: textTitle }}>
                              {r.sales_rep || "Unassigned"}
                            </span>
                          </div>
                        </td>

                        {/* AMOUNT */}
                        <td className="fw-bold font-monospace" style={{ fontSize: "13px", color: textTitle }}>
                          {formatCurrency(amt)}
                        </td>

                        {/* PROBABILITY */}
                        <td>
                          <div className="d-flex align-items-center gap-2" style={{ maxWidth: "110px" }}>
                            <div
                              className="progress flex-grow-1"
                              style={{ height: "6px", backgroundColor: isDark ? "#2d3748" : "#f1f5f9", borderRadius: 0 }}
                            >
                              <div
                                className="progress-bar"
                                style={{ width: `${prob}%`, backgroundColor: "#16a34a", borderRadius: 0 }}
                              ></div>
                            </div>
                            <span className="font-monospace fw-bold text-success" style={{ fontSize: "11px" }}>
                              {prob}%
                            </span>
                          </div>
                        </td>

                        {/* WEIGHTED */}
                        <td className="fw-bold font-monospace" style={{ fontSize: "13px", color: textTitle }}>
                          {formatCurrency(wAmt)}
                        </td>

                        {/* EXPECTED CLOSE */}
                        <td>
                          <div className="d-flex align-items-center gap-1.5">
                            <span style={{ fontSize: "12px", color: textTitle }}>
                              {formattedDealClose}
                            </span>
                            <span
                              style={{
                                backgroundColor: isDark ? "rgba(180, 83, 9, 0.2)" : "#fffbeb",
                                color: isDark ? "#fbbf24" : "#b45309",
                                border: `1px solid ${isDark ? "rgba(180, 83, 9, 0.3)" : "#fde68a"}`,
                                fontSize: "10.5px",
                                fontWeight: 600,
                                padding: "1px 6px",
                                borderRadius: 0,
                              }}
                            >
                              in {dealDays} days
                            </span>
                          </div>
                        </td>

                        {/* ACTIONS */}
                        <td className="text-end pe-3">
                          <Link
                            to={r.opportunity_id ? `/crm/opportunities/${r.opportunity_id}` : "/crm/opportunities"}
                            className="btn btn-sm border"
                            style={{
                              fontSize: "11.5px",
                              fontWeight: 500,
                              padding: "3px 12px",
                              borderRadius: 0,
                              backgroundColor: isDark ? "#1a202c" : "#f8fafc",
                              borderColor: isDark ? "#334155" : "#cbd5e1",
                              color: textTitle,
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
          <div
            className="p-3 d-flex align-items-center justify-content-between flex-wrap gap-2"
            style={{ borderTop: `1px solid ${cardBorder}`, backgroundColor: subtleBg }}
          >
            <div className="d-flex align-items-center gap-2">
              <span className="small" style={{ fontSize: "11.5px", color: textSub }}>
                Rows per page:
              </span>
              <select
                className="form-select form-select-sm"
                style={{
                  width: "65px",
                  fontSize: "11.5px",
                  borderRadius: 0,
                  borderColor: isDark ? "#334155" : "#cbd5e1",
                  backgroundColor: isDark ? "#1a202c" : "#ffffff",
                  color: textTitle,
                }}
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
                className="btn btn-sm border"
                style={{
                  borderRadius: 0,
                  fontSize: "11px",
                  backgroundColor: isDark ? "#1a202c" : "#ffffff",
                  borderColor: isDark ? "#334155" : "#cbd5e1",
                  color: textTitle,
                }}
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
                  borderRadius: 0,
                }}
              >
                {currentPage}
              </button>
              <button
                type="button"
                className="btn btn-sm border"
                style={{
                  borderRadius: 0,
                  fontSize: "11px",
                  backgroundColor: isDark ? "#1a202c" : "#ffffff",
                  borderColor: isDark ? "#334155" : "#cbd5e1",
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

      {/* ─── MODAL: SET QUARTERLY TARGET ───────────────────────────────────────── */}
      <Modal isOpen={targetModalOpen} toggle={() => setTargetModalOpen(!targetModalOpen)} centered>
        <ModalHeader
          toggle={() => setTargetModalOpen(false)}
          style={{ backgroundColor: subtleBg, borderColor: cardBorder, color: textTitle, borderRadius: 0 }}
        >
          Set Revenue Forecast Target
        </ModalHeader>
        <ModalBody style={{ backgroundColor: cardBg, color: textTitle }}>
          <FormGroup>
            <Label for="targetInput" style={{ fontSize: "12px", fontWeight: 600, color: textTitle }}>
              Quarterly Revenue Target (₹)
            </Label>
            <Input
              id="targetInput"
              type="number"
              value={targetInput}
              onChange={(e) => setTargetInput(e.target.value)}
              placeholder="e.g. 2000000"
              style={{
                borderRadius: 0,
                backgroundColor: isDark ? "#1a202c" : "#ffffff",
                borderColor: isDark ? "#334155" : "#cbd5e1",
                color: textTitle,
              }}
            />
            <small className="mt-1 d-block" style={{ color: textSub }}>
              Currently forecasting {formatCurrency(weightedForecast)}. Setting a target will benchmark goal attainment.
            </small>
          </FormGroup>
        </ModalBody>
        <ModalFooter style={{ backgroundColor: subtleBg, borderColor: cardBorder, borderRadius: 0 }}>
          <Button
            size="sm"
            onClick={() => setTargetModalOpen(false)}
            style={{
              borderRadius: 0,
              backgroundColor: isDark ? "#1a202c" : "#f8fafc",
              borderColor: isDark ? "#334155" : "#cbd5e1",
              color: textTitle,
            }}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            style={{ backgroundColor: "#7f1d1d", borderColor: "#7f1d1d", color: "#ffffff", borderRadius: 0 }}
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

