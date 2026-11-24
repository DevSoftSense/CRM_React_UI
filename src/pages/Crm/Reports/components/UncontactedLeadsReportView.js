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
} from "reactstrap";
import { formatCurrency, formatNumber } from "../utils/reportUtils";

const UncontactedLeadsReportView = ({
  reportResult,
  report,
  datePreset,
  onPresetChange,
  owners,
  selectedOwnerId,
  onOwnerChange,
  onExport,
}) => {
  const layoutMode = useSelector((state) => state.Layout?.layoutModeType);
  const isDark = layoutMode === "dark";

  // Dynamic Theme Colors
  const cardBg = isDark ? "#161b22" : "#ffffff";
  const cardBorder = isDark ? "#21262d" : "#e2e8f0";
  const subtleBg = isDark ? "#0d1117" : "#f8fafc";
  const subtleBorder = isDark ? "#30363d" : "#e2e8f0";
  const textTitle = isDark ? "#f0f6fc" : "#0f172a";
  const textSub = isDark ? "#8b949e" : "#64748b";
  const primaryColor = "#7f1d1d";

  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const rawRows = useMemo(() => {
    return Array.isArray(reportResult?.rows) ? reportResult.rows : [];
  }, [reportResult]);

  const summary = useMemo(() => {
    return reportResult?.summary || {};
  }, [reportResult]);

  const chartData = useMemo(() => {
    return Array.isArray(reportResult?.chart_data) ? reportResult.chart_data : [];
  }, [reportResult]);

  // Executive KPI Metrics
  const pipelineAtRisk = Number(
    summary.pipeline_at_risk ??
      rawRows.reduce((a, b) => a + Number(b.estimated_value || b.amount || 0), 0) ??
      0
  );
  const uncontactedLeadsCount = Number(
    summary.uncontacted_leads_count ?? rawRows.length ?? 0
  );
  const criticalStaleLeads = Number(
    summary.critical_stale_leads ??
      rawRows.filter((r) => Number(r.hours_uncontacted || 0) >= 168).length ??
      0
  );
  const avgNeglectDays = Number(summary.avg_neglect_days ?? 0);

  // Oldest uncontacted lead
  const oldestLead = useMemo(() => {
    if (rawRows.length === 0) return null;
    return [...rawRows].sort(
      (a, b) => Number(b.hours_uncontacted || 0) - Number(a.hours_uncontacted || 0)
    )[0];
  }, [rawRows]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    let result = rawRows;
    if (severityFilter === "CRITICAL") {
      result = result.filter((r) => Number(r.hours_uncontacted || 0) >= 168); // >= 7 days (168h)
    } else if (severityFilter === "FRESH") {
      result = result.filter((r) => Number(r.hours_uncontacted || 0) <= 24);
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
  }, [rawRows, severityFilter, searchTerm]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  // Helper for Rep/Lead Initials
  const getInitials = (name) => {
    const parts = String(name || "").trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (name || "LD").slice(0, 2).toUpperCase();
  };

  // Dynamic 4-bracket aging breakdown computed strictly from rawRows
  const severityBrackets = useMemo(() => {
    const b = {
      fresh: { count: 0, value: 0 },
      recent: { count: 0, value: 0 },
      urgent: { count: 0, value: 0 },
      stale: { count: 0, value: 0 },
    };
    rawRows.forEach((r) => {
      const hrs = Number(r.hours_uncontacted || 0);
      const val = Number(r.estimated_value || r.amount || 0);
      if (hrs < 24) {
        b.fresh.count += 1;
        b.fresh.value += val;
      } else if (hrs < 72) {
        b.recent.count += 1;
        b.recent.value += val;
      } else if (hrs < 168) {
        b.urgent.count += 1;
        b.urgent.value += val;
      } else {
        b.stale.count += 1;
        b.stale.value += val;
      }
    });
    const totalVal = b.fresh.value + b.recent.value + b.urgent.value + b.stale.value;
    const pct = (v) => (totalVal > 0 ? Math.round((v / totalVal) * 100) : 0);
    return {
      fresh: { ...b.fresh, pct: pct(b.fresh.value) },
      recent: { ...b.recent, pct: pct(b.recent.value) },
      urgent: { ...b.urgent, pct: pct(b.urgent.value) },
      stale: { ...b.stale, pct: pct(b.stale.value) },
    };
  }, [rawRows]);

  // 1. Horizontal Aging Severity Distribution Chart
  const agingChartConfig = useMemo(() => {
    const defaultData = [
      { bracket: "< 24 Hours", count: severityBrackets.fresh.count },
      { bracket: "1 - 3 Days", count: severityBrackets.recent.count },
      { bracket: "4 - 7 Days", count: severityBrackets.urgent.count },
      { bracket: "> 7 Days (Stale)", count: severityBrackets.stale.count },
    ];

    const list = chartData.length > 0 ? chartData : defaultData;
    const categories = list.map((d) => d.bracket);
    const data = list.map((d) => Number(d.count || 0));
    const maxCount = Math.max(...data, 1);
    const xMax = Math.max(3, Math.ceil(maxCount * 1.5));

    return {
      series: [
        {
          name: "Uncontacted Leads",
          data,
        },
      ],
      options: {
        chart: {
          type: "bar",
          height: 250,
          toolbar: { show: false },
          parentHeightOffset: 0,
        },
        plotOptions: {
          bar: {
            horizontal: true,
            barHeight: "42%",
            borderRadius: 0,
            distributed: true,
            dataLabels: {
              position: "top",
            },
          },
        },
        colors: ["#16a34a", "#2563eb", "#d97706", "#7f1d1d"], // Fresh (Green), Recent (Blue), Urgent (Amber), Critical (Maroon)
        dataLabels: {
          enabled: true,
          textAnchor: "start",
          offsetX: 10,
          style: {
            fontSize: "11px",
            fontFamily: "Inter, sans-serif",
            fontWeight: 600,
            colors: [isDark ? "#f0f6fc" : "#1e293b"],
          },
          formatter: (val) => (val > 0 ? `${val} lead` : ""),
        },
        grid: {
          borderColor: isDark ? "#21262d" : "#f1f5f9",
          strokeDashArray: 3,
          xaxis: { lines: { show: true } },
          yaxis: { lines: { show: false } },
          padding: { top: 15, bottom: 0, left: 10, right: 35 },
        },
        xaxis: {
          min: 0,
          max: xMax,
          tickAmount: xMax,
          labels: {
            style: {
              colors: textSub,
              fontSize: "11px",
              fontFamily: "Inter, sans-serif",
            },
            formatter: (val) => Math.round(val),
          },
          axisBorder: { color: cardBorder },
          axisTicks: { show: false },
        },
        yaxis: {
          labels: {
            style: {
              colors: textTitle,
              fontSize: "12px",
              fontFamily: "Inter, sans-serif",
              fontWeight: 600,
            },
          },
        },
        legend: { show: false },
        tooltip: {
          theme: isDark ? "dark" : "light",
          y: {
            formatter: (val) => `${val} leads awaiting outreach`,
          },
        },
      },
    };
  }, [chartData, isDark, textTitle, textSub, cardBorder]);

  return (
    <div className="uncontacted-leads-report-view">
      {/* ─── ROW 1: EXECUTIVE NEGLECTED LEAD HEALTH KPI CARDS (4 CARDS) ───────── */}
      <Row className="g-3 mb-4">
        {/* Card 1: Pipeline Revenue at Risk */}
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
            <CardBody className="p-3">
              <div className="d-flex align-items-center justify-content-between mb-1">
                <span
                  className="text-uppercase fw-bold"
                  style={{ fontSize: "11px", letterSpacing: "0.5px", color: textSub }}
                >
                  PIPELINE VALUE AT RISK
                </span>
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: 0,
                    backgroundColor: isDark ? "rgba(127, 29, 29, 0.25)" : "#fee2e2",
                    color: isDark ? "#f87171" : "#7f1d1d",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "14px",
                  }}
                >
                  <i className="ri-alarm-warning-fill"></i>
                </div>
              </div>
              <div
                className="fw-bold font-monospace"
                style={{ fontSize: "24px", lineHeight: "1.1", margin: "6px 0", color: textTitle }}
              >
                {formatCurrency(pipelineAtRisk)}
              </div>
              <div className="d-flex align-items-center gap-1.5 mt-2" style={{ fontSize: "11.5px" }}>
                <span style={{ color: "#dc2626", fontWeight: 600 }}>● High Exposure</span>
                <span style={{ color: textSub }}>• Zero touchpoints</span>
              </div>
            </CardBody>
          </Card>
        </Col>

        {/* Card 2: Critical Stale Leads (> 7 Days) */}
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
            <CardBody className="p-3">
              <div className="d-flex align-items-center justify-content-between mb-1">
                <span
                  className="text-uppercase fw-bold"
                  style={{ fontSize: "11px", letterSpacing: "0.5px", color: textSub }}
                >
                  CRITICAL STALE (&gt; 7 DAYS)
                </span>
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: 0,
                    backgroundColor: isDark ? "rgba(220, 38, 38, 0.2)" : "#fef2f2",
                    color: isDark ? "#f87171" : "#dc2626",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "14px",
                  }}
                >
                  <i className="ri-fire-fill"></i>
                </div>
              </div>
              <div
                className="fw-bold font-monospace"
                style={{ fontSize: "24px", lineHeight: "1.1", margin: "6px 0", color: textTitle }}
              >
                {criticalStaleLeads} Lead{criticalStaleLeads === 1 ? "" : "s"}
              </div>
              <div className="d-flex align-items-center gap-1.5 mt-2" style={{ fontSize: "11.5px" }}>
                <span style={{ color: "#dc2626", fontWeight: 600 }}>Immediate</span>
                <span style={{ color: textSub }}>• SLA breached</span>
              </div>
            </CardBody>
          </Card>
        </Col>

        {/* Card 3: Total Uncontacted Leads */}
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
            <CardBody className="p-3">
              <div className="d-flex align-items-center justify-content-between mb-1">
                <span
                  className="text-uppercase fw-bold"
                  style={{ fontSize: "11px", letterSpacing: "0.5px", color: textSub }}
                >
                  UNCONTACTED LEADS
                </span>
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: 0,
                    backgroundColor: isDark ? "rgba(245, 158, 11, 0.2)" : "#fffbeb",
                    color: isDark ? "#fbbf24" : "#d97706",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "14px",
                  }}
                >
                  <i className="ri-user-unfollow-fill"></i>
                </div>
              </div>
              <div
                className="fw-bold font-monospace"
                style={{ fontSize: "24px", lineHeight: "1.1", margin: "6px 0", color: textTitle }}
              >
                {uncontactedLeadsCount} Lead{uncontactedLeadsCount === 1 ? "" : "s"}
              </div>
              <div className="d-flex align-items-center gap-1.5 mt-2" style={{ fontSize: "11.5px" }}>
                <span style={{ color: isDark ? "#fbbf24" : "#d97706", fontWeight: 600 }}>Awaiting Call</span>
                <span style={{ color: textSub }}>• Needs outreach</span>
              </div>
            </CardBody>
          </Card>
        </Col>

        {/* Card 4: Avg Time Neglected */}
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
            <CardBody className="p-3">
              <div className="d-flex align-items-center justify-content-between mb-1">
                <span
                  className="text-uppercase fw-bold"
                  style={{ fontSize: "11px", letterSpacing: "0.5px", color: textSub }}
                >
                  AVG TIME NEGLECTED
                </span>
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: 0,
                    backgroundColor: isDark ? "rgba(59, 130, 246, 0.2)" : "#eff6ff",
                    color: isDark ? "#60a5fa" : "#2563eb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "14px",
                  }}
                >
                  <i className="ri-history-fill"></i>
                </div>
              </div>
              <div
                className="fw-bold font-monospace"
                style={{ fontSize: "24px", lineHeight: "1.1", margin: "6px 0", color: textTitle }}
              >
                {avgNeglectDays} Days
              </div>
              <div className="d-flex align-items-center gap-1.5 mt-2" style={{ fontSize: "11.5px" }}>
                <span style={{ color: isDark ? "#60a5fa" : "#2563eb", fontWeight: 600 }}>
                  ~{Math.round(avgNeglectDays * 24)} Hours
                </span>
                <span style={{ color: textSub }}>• Since acquisition</span>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* ─── ROW 2: AGING DISTRIBUTION + SEVERITY BREAKDOWN ─────────────────── */}
      <Row className="g-3 mb-4">
        {/* Col 1: Lead Aging & Neglect Severity Chart (Col lg=7) */}
        <Col lg={7} md={12}>
          <Card
            className="h-100 d-flex flex-column"
            style={{
              borderRadius: 0,
              backgroundColor: cardBg,
              border: `1px solid ${cardBorder}`,
              boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
            }}
          >
            <div
              className="p-3 border-bottom d-flex flex-wrap align-items-center justify-content-between gap-2"
              style={{ borderRadius: 0, borderColor: cardBorder, backgroundColor: cardBg }}
            >
              <div className="d-flex align-items-center gap-2">
                <i
                  className="ri-bar-chart-horizontal-fill"
                  style={{ color: isDark ? "#f87171" : "#7f1d1d", fontSize: "16px" }}
                ></i>
                <span className="fw-bold" style={{ fontSize: "13.5px", color: textTitle }}>
                  Lead Aging & Neglect Severity Breakdown
                </span>
              </div>
              <span
                style={{
                  backgroundColor: subtleBg,
                  color: textSub,
                  border: `1px solid ${cardBorder}`,
                  fontSize: "11px",
                  padding: "3px 8px",
                  borderRadius: 0,
                }}
              >
                By Response Timeframes
              </span>
            </div>

            <CardBody className="p-3 pt-2 d-flex flex-column justify-content-center flex-grow-1">
              <ReactApexChart
                options={agingChartConfig.options}
                series={agingChartConfig.series}
                type="bar"
                height={250}
              />
            </CardBody>
          </Card>
        </Col>

        {/* Col 2: Aging Severity Triage Cockpit (Col lg=5) */}
        <Col lg={5} md={12}>
          <Card
            className="h-100 d-flex flex-column"
            style={{
              borderRadius: 0,
              backgroundColor: cardBg,
              border: `1px solid ${cardBorder}`,
              boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
            }}
          >
            <div
              className="p-3 border-bottom d-flex align-items-center justify-content-between gap-2"
              style={{ borderRadius: 0, borderColor: cardBorder, backgroundColor: cardBg }}
            >
              <div className="d-flex align-items-center gap-2">
                <i
                  className="ri-shield-alert-line"
                  style={{ color: isDark ? "#f87171" : "#7f1d1d", fontSize: "16px" }}
                ></i>
                <span className="fw-bold" style={{ fontSize: "13.5px", color: textTitle }}>
                  Aging Severity Breakdown
                </span>
              </div>
              <span
                style={{
                  backgroundColor: isDark ? "rgba(220, 38, 38, 0.2)" : "#fef2f2",
                  color: isDark ? "#f87171" : "#dc2626",
                  border: `1px solid ${isDark ? "rgba(220, 38, 38, 0.4)" : "#fecaca"}`,
                  fontSize: "11px",
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: 0,
                }}
              >
                {criticalStaleLeads} Critical Stale {criticalStaleLeads === 1 ? "Lead" : "Leads"}
              </span>
            </div>

            <CardBody className="p-3 d-flex flex-column justify-content-between flex-grow-1">
              <div className="d-flex flex-column gap-2">
                {/* 1. Fresh (< 24 Hours) */}
                <div
                  className="p-2 border d-flex align-items-center justify-content-between"
                  style={{
                    backgroundColor: isDark ? "rgba(22, 163, 74, 0.12)" : "#f0fdf4",
                    borderColor: isDark ? "rgba(22, 163, 74, 0.25)" : "#bbf7d0",
                    borderRadius: 0,
                  }}
                >
                  <div className="d-flex align-items-center gap-2">
                    <span
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: 0,
                        backgroundColor: "#16a34a",
                        flexShrink: 0,
                      }}
                    ></span>
                    <div>
                      <span className="fw-semibold d-block" style={{ fontSize: "12px", color: textTitle }}>
                        &lt; 24 Hours
                      </span>
                      <span style={{ fontSize: "10.5px", color: textSub }}>
                        {severityBrackets.fresh.count} {severityBrackets.fresh.count === 1 ? "lead" : "leads"} • Fresh (&lt; 24h)
                      </span>
                    </div>
                  </div>
                  <div className="text-end">
                    <span
                      className="badge font-monospace"
                      style={{
                        backgroundColor: isDark ? "#12171f" : "#ffffff",
                        color: textSub,
                        border: `1px solid ${cardBorder}`,
                        borderRadius: 0,
                        fontSize: "11px",
                      }}
                    >
                      {formatCurrency(severityBrackets.fresh.value)} ({severityBrackets.fresh.pct}%)
                    </span>
                  </div>
                </div>

                {/* 2. Recent (1 - 3 Days) */}
                <div
                  className="p-2 border d-flex align-items-center justify-content-between"
                  style={{
                    backgroundColor: isDark ? "rgba(37, 99, 235, 0.12)" : "#eff6ff",
                    borderColor: isDark ? "rgba(37, 99, 235, 0.25)" : "#bfdbfe",
                    borderRadius: 0,
                  }}
                >
                  <div className="d-flex align-items-center gap-2">
                    <span
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: 0,
                        backgroundColor: "#2563eb",
                        flexShrink: 0,
                      }}
                    ></span>
                    <div>
                      <span className="fw-semibold d-block" style={{ fontSize: "12px", color: textTitle }}>
                        1 - 3 Days
                      </span>
                      <span style={{ fontSize: "10.5px", color: textSub }}>
                        {severityBrackets.recent.count} {severityBrackets.recent.count === 1 ? "lead" : "leads"} • Recent (1-3d)
                      </span>
                    </div>
                  </div>
                  <div className="text-end">
                    <span
                      className="badge font-monospace"
                      style={{
                        backgroundColor: isDark ? "#12171f" : "#ffffff",
                        color: textSub,
                        border: `1px solid ${cardBorder}`,
                        borderRadius: 0,
                        fontSize: "11px",
                      }}
                    >
                      {formatCurrency(severityBrackets.recent.value)} ({severityBrackets.recent.pct}%)
                    </span>
                  </div>
                </div>

                {/* 3. Urgent (4 - 7 Days) */}
                <div
                  className="p-2 border d-flex align-items-center justify-content-between"
                  style={{
                    backgroundColor: isDark ? "rgba(217, 119, 6, 0.12)" : "#fffbeb",
                    borderColor: isDark ? "rgba(217, 119, 6, 0.25)" : "#fde68a",
                    borderRadius: 0,
                  }}
                >
                  <div className="d-flex align-items-center gap-2">
                    <span
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: 0,
                        backgroundColor: "#d97706",
                        flexShrink: 0,
                      }}
                    ></span>
                    <div>
                      <span className="fw-semibold d-block" style={{ fontSize: "12px", color: textTitle }}>
                        4 - 7 Days
                      </span>
                      <span style={{ fontSize: "10.5px", color: textSub }}>
                        {severityBrackets.urgent.count} {severityBrackets.urgent.count === 1 ? "lead" : "leads"} • Urgent (4-7d)
                      </span>
                    </div>
                  </div>
                  <div className="text-end">
                    <span
                      className="badge font-monospace"
                      style={{
                        backgroundColor: isDark ? "#12171f" : "#ffffff",
                        color: textSub,
                        border: `1px solid ${cardBorder}`,
                        borderRadius: 0,
                        fontSize: "11px",
                      }}
                    >
                      {formatCurrency(severityBrackets.urgent.value)} ({severityBrackets.urgent.pct}%)
                    </span>
                  </div>
                </div>

                {/* 4. Critical Stale (> 7 Days) */}
                <div
                  className="p-2 border d-flex align-items-center justify-content-between"
                  style={{
                    backgroundColor: isDark ? "rgba(127, 29, 29, 0.25)" : "rgba(127, 29, 29, 0.05)",
                    borderColor: isDark ? "rgba(239, 68, 68, 0.35)" : "rgba(127, 29, 29, 0.2)",
                    borderRadius: 0,
                  }}
                >
                  <div className="d-flex align-items-center gap-2">
                    <span
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: 0,
                        backgroundColor: isDark ? "#f87171" : "#7f1d1d",
                        flexShrink: 0,
                      }}
                    ></span>
                    <div>
                      <span className="fw-bold d-block" style={{ fontSize: "12px", color: textTitle }}>
                        &gt; 7 Days (Stale)
                      </span>
                      <span style={{ fontSize: "10.5px", color: isDark ? "#f87171" : "#dc2626", fontWeight: 600 }}>
                        {severityBrackets.stale.count} {severityBrackets.stale.count === 1 ? "lead" : "leads"} • Critical (&gt; 7d)
                      </span>
                    </div>
                  </div>
                  <div className="text-end">
                    <span
                      className="badge font-monospace fw-bold"
                      style={{
                        backgroundColor: "#7f1d1d",
                        color: "#ffffff",
                        borderRadius: 0,
                        fontSize: "11px",
                      }}
                    >
                      {formatCurrency(severityBrackets.stale.value)} ({severityBrackets.stale.pct}%)
                    </span>
                  </div>
                </div>
              </div>

              {/* Triage Rescue Action Bar */}
              <div
                className="p-2.5 mt-3 border d-flex align-items-center justify-content-between"
                style={{
                  backgroundColor: subtleBg,
                  borderColor: cardBorder,
                  borderRadius: 0,
                }}
              >
                <div className="d-flex align-items-center gap-2">
                  <i className="ri-flashlight-fill text-warning fs-18"></i>
                  <div>
                    <span className="fw-bold d-block" style={{ fontSize: "12px", color: textTitle }}>
                      Rescue Critical Leads
                    </span>
                    <span style={{ fontSize: "10.5px", color: textSub }}>
                      Dispatch calls or emails to convert leads before dropoff
                    </span>
                  </div>
                </div>

                <Link
                  to="/crm/leads"
                  className="btn btn-sm d-inline-flex align-items-center gap-1"
                  style={{
                    backgroundColor: "#7f1d1d",
                    borderColor: "#7f1d1d",
                    color: "#ffffff",
                    borderRadius: 0,
                    fontSize: "11.5px",
                    fontWeight: 600,
                    padding: "4px 12px",
                  }}
                >
                  View Leads <i className="ri-arrow-right-line"></i>
                </Link>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* ─── ROW 3: STALE LEADS ACTION LEDGER (TABLE) ────────────────────────── */}
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
            <h6
              className="mb-0 fw-bold d-flex align-items-center gap-2"
              style={{ fontSize: "14px", color: textTitle }}
            >
              <i
                className="ri-table-line"
                style={{ color: isDark ? "#f87171" : "#7f1d1d", fontSize: "16px" }}
              ></i>
              Stale Leads Action Ledger
            </h6>
            <span className="small" style={{ fontSize: "11.5px", color: textSub }}>
              Showing {filteredRows.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{" "}
              {Math.min(currentPage * pageSize, filteredRows.length)} of {rawRows.length} uncontacted leads
            </span>
          </div>

          <div className="d-flex align-items-center gap-2 flex-wrap">
            {/* Search Input */}
            <div className="position-relative" style={{ width: "230px" }}>
              <Input
                type="text"
                placeholder="Search lead or company..."
                className="form-control-sm ps-4"
                style={{
                  borderRadius: 0,
                  fontSize: "12px",
                  borderColor: cardBorder,
                  backgroundColor: subtleBg,
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

            {/* Severity Filter Dropdown */}
            <select
              className="form-select form-select-sm"
              style={{
                width: "155px",
                borderRadius: 0,
                fontSize: "12px",
                borderColor: cardBorder,
                backgroundColor: subtleBg,
                color: textTitle,
              }}
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
            >
              <option value="ALL">All Uncontacted</option>
              <option value="CRITICAL">Critical Stale (&gt; 7d)</option>
              <option value="FRESH">Fresh (&lt; 24h)</option>
            </select>

            {/* Export CSV Button */}
            <button
              type="button"
              className="btn btn-sm d-flex align-items-center gap-1 border"
              style={{
                backgroundColor: subtleBg,
                color: isDark ? "#f87171" : "#7f1d1d",
                borderColor: cardBorder,
                borderRadius: 0,
                fontSize: "12px",
                fontWeight: 500,
                padding: "5px 12px",
              }}
              onClick={onExport}
            >
              <i className="ri-download-2-line"></i> Export CSV
            </button>
          </div>
        </div>

        <CardBody className="p-0">
          <div className="table-responsive">
            <Table className="align-middle table-nowrap mb-0" hover>
              <thead style={{ backgroundColor: subtleBg, borderBottom: `1px solid ${cardBorder}` }}>
                <tr style={{ fontSize: "11.5px", color: textSub }}>
                  <th style={{ width: "40px" }} className="text-center">#</th>
                  <th style={{ minWidth: "180px" }}>LEAD NAME & COMPANY</th>
                  <th style={{ minWidth: "150px" }} className="text-center">TIME UNCONTACTED</th>
                  <th style={{ minWidth: "130px" }} className="text-center">SEVERITY LEVEL</th>
                  <th style={{ minWidth: "120px" }} className="text-center">LEAD SOURCE</th>
                  <th style={{ minWidth: "150px" }}>ASSIGNED SALES REP</th>
                  <th style={{ minWidth: "130px" }} className="text-center">ESTIMATED VALUE</th>
                  <th style={{ minWidth: "110px" }} className="text-center">DIRECT OUTREACH</th>
                  <th style={{ width: "70px" }} className="text-center">ACTION</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: "12.5px" }}>
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-4" style={{ color: textSub }}>
                      No uncontacted leads match the search and filter criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((r, idx) => {
                    const rowNumber = (currentPage - 1) * pageSize + idx + 1;
                    const hours = Number(r.hours_uncontacted || 0);
                    const days = (hours / 24).toFixed(1);
                    const val = Number(r.estimated_value || 0);
                    const isCritical = hours >= 168; // > 7 days
                    const leadInitials = getInitials(r.lead_name);
                    const repInitials = getInitials(r.sales_rep);

                    return (
                      <tr key={r.lead_id || idx} style={{ borderBottom: `1px solid ${cardBorder}` }}>
                        <td className="text-center" style={{ fontSize: "11px", color: textSub }}>
                          {rowNumber}
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <span
                              style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: 0,
                                backgroundColor: isCritical
                                  ? (isDark ? "rgba(220, 38, 38, 0.25)" : "#fef2f2")
                                  : (isDark ? "rgba(127, 29, 29, 0.25)" : "#f1f5f9"),
                                color: isCritical ? "#f87171" : (isDark ? "#f87171" : "#475569"),
                                border: "1px solid",
                                borderColor: isCritical
                                  ? (isDark ? "rgba(239, 68, 68, 0.4)" : "#fecaca")
                                  : cardBorder,
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "12px",
                                fontWeight: 700,
                                flexShrink: 0,
                              }}
                            >
                              {leadInitials}
                            </span>
                            <div>
                              <Link
                                to={`/crm/leads/${r.lead_id}`}
                                className="fw-semibold text-decoration-none d-block"
                                style={{ fontSize: "12.5px", color: textTitle }}
                              >
                                {r.lead_name}
                              </Link>
                              <span className="d-flex align-items-center gap-1" style={{ fontSize: "11px", color: textSub }}>
                                <i className="ri-building-line" style={{ color: textSub }}></i>
                                {r.company_name || "—"}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="text-center">
                          <span
                            style={{
                              backgroundColor: isCritical
                                ? (isDark ? "rgba(127, 29, 29, 0.25)" : "rgba(127, 29, 29, 0.08)")
                                : subtleBg,
                              color: isCritical ? "#f87171" : textSub,
                              border: "1px solid",
                              borderColor: isCritical
                                ? (isDark ? "rgba(239, 68, 68, 0.4)" : "rgba(127, 29, 29, 0.2)")
                                : cardBorder,
                              fontSize: "11.5px",
                              fontWeight: 600,
                              padding: "3px 10px",
                              borderRadius: 0,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <i className="ri-time-line" style={{ fontSize: "12px" }}></i>
                            {days} days ({hours}h)
                          </span>
                        </td>
                        <td className="text-center">
                          <span
                            style={{
                              backgroundColor: isCritical
                                ? (isDark ? "rgba(220, 38, 38, 0.25)" : "#fef2f2")
                                : (isDark ? "rgba(22, 163, 74, 0.15)" : "#f0fdf4"),
                              color: isCritical ? "#f87171" : "#16a34a",
                              border: "1px solid",
                              borderColor: isCritical
                                ? (isDark ? "rgba(239, 68, 68, 0.4)" : "#fecaca")
                                : (isDark ? "rgba(22, 163, 74, 0.3)" : "#bbf7d0"),
                              fontSize: "11px",
                              fontWeight: 600,
                              padding: "2.5px 8px",
                              borderRadius: 0,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <i className={isCritical ? "ri-error-warning-fill" : "ri-checkbox-circle-fill"} style={{ fontSize: "12px" }}></i>
                            {isCritical ? "Critical Stale" : "Fresh Lead"}
                          </span>
                        </td>
                        <td className="text-center">
                          <span
                            style={{
                              backgroundColor: subtleBg,
                              color: textTitle,
                              border: `1px solid ${cardBorder}`,
                              borderRadius: 0,
                              fontSize: "11px",
                              fontWeight: 500,
                              padding: "3px 8px",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <i className="ri-global-line me-1" style={{ color: textSub }}></i>
                            {r.source_name || "Direct"}
                          </span>
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <span
                              style={{
                                width: "26px",
                                height: "26px",
                                borderRadius: 0,
                                backgroundColor: isDark ? "rgba(127, 29, 29, 0.25)" : "rgba(127, 29, 29, 0.08)",
                                color: isDark ? "#f87171" : "#7f1d1d",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "11px",
                                fontWeight: 700,
                                flexShrink: 0,
                              }}
                            >
                              {repInitials}
                            </span>
                            <span style={{ fontSize: "12px", color: textTitle }}>
                              {r.sales_rep}
                            </span>
                          </div>
                        </td>
                        <td className="text-center fw-bold font-monospace" style={{ fontSize: "13px", color: textTitle }}>
                          {formatCurrency(val)}
                        </td>
                        <td className="text-center">
                          <div className="d-flex align-items-center justify-content-center gap-1.5">
                            {r.mobile ? (
                              <a
                                href={`tel:${r.mobile}`}
                                className="btn btn-sm border p-1"
                                style={{
                                  borderRadius: 0,
                                  backgroundColor: subtleBg,
                                  borderColor: cardBorder,
                                  color: "#16a34a",
                                  width: "28px",
                                  height: "28px",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                                title={`Call ${r.mobile}`}
                              >
                                <i className="ri-phone-fill" style={{ fontSize: "13px" }}></i>
                              </a>
                            ) : null}
                            {r.email ? (
                              <a
                                href={`mailto:${r.email}`}
                                className="btn btn-sm border p-1"
                                style={{
                                  borderRadius: 0,
                                  backgroundColor: subtleBg,
                                  borderColor: cardBorder,
                                  color: isDark ? "#60a5fa" : "#2563eb",
                                  width: "28px",
                                  height: "28px",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                                title={`Email ${r.email}`}
                              >
                                <i className="ri-mail-fill" style={{ fontSize: "13px" }}></i>
                              </a>
                            ) : null}
                          </div>
                        </td>
                        <td className="text-center">
                          <Link
                            to={`/crm/leads/${r.lead_id}`}
                            className="btn btn-sm border p-1"
                            style={{
                              borderRadius: 0,
                              backgroundColor: subtleBg,
                              borderColor: cardBorder,
                              color: isDark ? "#f87171" : "#7f1d1d",
                              width: "28px",
                              height: "28px",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                            title="Open Lead Record"
                          >
                            <i className="ri-eye-line" style={{ fontSize: "14px" }}></i>
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
            className="p-3 border-top d-flex align-items-center justify-content-between flex-wrap gap-2"
            style={{ borderColor: cardBorder, backgroundColor: cardBg }}
          >
            <div className="d-flex align-items-center gap-2">
              <span className="small" style={{ fontSize: "11.5px", color: textSub }}>
                Show
              </span>
              <select
                className="form-select form-select-sm"
                style={{
                  width: "65px",
                  fontSize: "11.5px",
                  borderRadius: 0,
                  backgroundColor: subtleBg,
                  borderColor: cardBorder,
                  color: textTitle,
                }}
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span className="small" style={{ fontSize: "11.5px", color: textSub }}>
                Showing {filteredRows.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{" "}
                {Math.min(currentPage * pageSize, filteredRows.length)} of {filteredRows.length} uncontacted leads
              </span>
            </div>

            <div className="btn-group btn-group-sm">
              <button
                type="button"
                className="btn btn-sm border"
                style={{
                  borderRadius: 0,
                  fontSize: "11px",
                  backgroundColor: subtleBg,
                  borderColor: cardBorder,
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
                  backgroundColor: subtleBg,
                  borderColor: cardBorder,
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

      {/* ─── ROW 4: SPEED-TO-LEAD & CONVERSION INTELLIGENCE STRIP ────────────── */}
      <Card
        className="mb-4"
        style={{
          borderRadius: 0,
          backgroundColor: cardBg,
          border: `1px solid ${cardBorder}`,
          borderLeft: "4px solid #7f1d1d",
          boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
        }}
      >
        <CardBody className="p-3">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
            {/* Left: Trophy badge + Title */}
            <div className="d-flex align-items-center gap-3">
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: 0,
                  backgroundColor: isDark ? "rgba(245, 158, 11, 0.15)" : "#fffbeb",
                  border: `1px solid ${isDark ? "rgba(245, 158, 11, 0.3)" : "#fde68a"}`,
                  color: isDark ? "#fbbf24" : "#d97706",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "18px",
                  flexShrink: 0,
                }}
              >
                <i className="ri-flashlight-line"></i>
              </div>
              <span className="fw-bold" style={{ fontSize: "13.5px", color: textTitle }}>
                Speed-to-Lead & SLA Intelligence
              </span>
            </div>

            {/* Middle: 3 Key Insights */}
            <div
              className="d-flex flex-wrap align-items-center gap-3"
              style={{ fontSize: "12px", color: textSub }}
            >
              <div className="d-flex align-items-center gap-1.5">
                <i className="ri-timer-flash-line" style={{ color: isDark ? "#f87171" : "#7f1d1d" }}></i>
                <span>Leads engaged within 1 hour have a 7x higher qualification rate.</span>
              </div>
              <span className="d-none d-md-inline" style={{ color: cardBorder }}>|</span>
              <div className="d-flex align-items-center gap-1.5">
                <i className="ri-alert-fill" style={{ color: "#dc2626" }}></i>
                <span>
                  {pipelineAtRisk > 0
                    ? `${formatCurrency(pipelineAtRisk)} lead value at severe risk with zero touchpoints.`
                    : "Zero pipeline value currently at risk."}
                </span>
              </div>
              <span className="d-none d-md-inline" style={{ color: cardBorder }}>|</span>
              <div className="d-flex align-items-center gap-1.5">
                <i className="ri-phone-forward-line" style={{ color: "#16a34a" }}></i>
                <span>
                  {oldestLead
                    ? `Dispatch immediate outreach sequence to re-engage ${oldestLead.lead_name || "lead"}.`
                    : "All leads have been contacted promptly."}
                </span>
              </div>
            </div>

            {/* Right: SoftOnCloud Slogan */}
            <div className="d-none d-lg-flex align-items-center gap-2 text-end">
              <div>
                <span className="fw-bold d-block" style={{ fontSize: "11.5px", color: textTitle }}>
                  Speed. Engagement. Conversion.
                </span>
                <span style={{ fontSize: "10.5px", color: textSub }}>
                  Zero leads left behind.
                </span>
              </div>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: 0,
                  backgroundColor: isDark ? "rgba(127, 29, 29, 0.25)" : "rgba(127, 29, 29, 0.08)",
                  color: isDark ? "#f87171" : "#7f1d1d",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "16px",
                }}
              >
                <i className="ri-shield-check-fill"></i>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default UncontactedLeadsReportView;

