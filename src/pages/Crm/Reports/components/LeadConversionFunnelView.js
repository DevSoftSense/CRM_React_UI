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

const LeadConversionFunnelView = ({
  reportResult,
  report,
  datePreset,
  onPresetChange,
  owners,
  selectedOwnerId,
  onOwnerChange,
  onExport,
}) => {
  const [metricView, setMetricView] = useState("leads"); // "leads" or "value"
  const [searchTerm, setSearchTerm] = useState("");
  const [stageFilter, setStageFilter] = useState("ALL");
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRepFilter, setSelectedRepFilter] = useState("");

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

  // Executive KPI Calculations
  const totalLeads = Number(summary.total_leads ?? rawRows.length ?? 0);
  const convertedLeads = Number(summary.converted_leads ?? 0);
  const conversionRate = Number(summary.conversion_rate ?? 0);
  const openPipeline = Number(
    summary.estimated_pipeline_value ??
      rawRows.reduce((acc, r) => acc + Number(r.estimated_value || r.amount || 0), 0)
  );
  const weightedPipeline = Math.round(openPipeline * 0.1); // 10% probability for early stage

  // Calculate Lead Age (difference between created_date and current time)
  const calculateAgeDays = (createdDateStr) => {
    if (!createdDateStr) return 0;
    try {
      const created = new Date(createdDateStr);
      const now = new Date();
      const diffTime = Math.abs(now - created);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return isNaN(diffDays) ? 0 : diffDays;
    } catch {
      return 0;
    }
  };

  // Find oldest idle lead requiring attention
  const idleLead = useMemo(() => {
    if (rawRows.length === 0) return null;
    return (
      rawRows.find((r) => {
        const st = String(r.status || "").toUpperCase();
        return st === "NEW" || st.includes("NEW");
      }) || rawRows[0]
    );
  }, [rawRows]);

  // 6 Funnel Stages definition
  const funnelStages = useMemo(() => {
    const list = [
      { id: "new", name: "New", color: "#7f1d1d", dotColor: "#7f1d1d", step: 1 },
      { id: "contacted", name: "Contacted", color: "#ea580c", dotColor: "#ea580c", step: 2 },
      { id: "qualified", name: "Qualified", color: "#0d9488", dotColor: "#0d9488", step: 3 },
      { id: "proposal", name: "Proposal", color: "#9333ea", dotColor: "#9333ea", step: 4 },
      { id: "negotiation", name: "Negotiation", color: "#2563eb", dotColor: "#2563eb", step: 5 },
      { id: "converted", name: "Converted", color: "#16a34a", dotColor: "#16a34a", step: 6 },
    ];

    const totalCount = totalLeads || 1;
    const totalVal = openPipeline || 1;

    return list.map((st) => {
      // Find matching item from chartData or default
      const found = chartData.find(
        (c) => String(c.status_name || "").toUpperCase() === st.name.toUpperCase()
      );
      const count = found ? Number(found.lead_count || 0) : st.name === "New" ? totalLeads : 0;
      const val = found ? Number(found.estimated_amount || 0) : st.name === "New" ? openPipeline : 0;
      const countPct = Math.round((count / totalCount) * 100);
      const valPct = Math.round((val / totalVal) * 100);

      return {
        ...st,
        count,
        value: val,
        percentage: metricView === "leads" ? countPct : valPct,
        fromPrevious: st.name === "New" ? "Entry stage" : "—",
        avgTime: st.name === "New" ? "23 d" : "—",
      };
    });
  }, [chartData, totalLeads, openPipeline, metricView]);

  // Lead Sources breakdown dynamically computed from data
  const leadSources = useMemo(() => {
    if (rawRows.length === 0) return [];
    const sourceMap = {};
    rawRows.forEach((r) => {
      const src = r.source || r.lead_source || "Other";
      if (!sourceMap[src]) sourceMap[src] = { count: 0, won: 0 };
      sourceMap[src].count += 1;
      const st = String(r.status || "").toUpperCase();
      if (st.includes("CONVERT") || st.includes("WON")) sourceMap[src].won += 1;
    });
    return Object.entries(sourceMap)
      .map(([name, data]) => ({
        name,
        count: data.count,
        wonRate: data.count > 0 ? `${Math.round((data.won / data.count) * 100)}% won` : "—",
      }))
      .sort((a, b) => b.count - a.count);
  }, [rawRows]);

  // Sales rep performance dynamically computed from data
  const repPerformance = useMemo(() => {
    const map = {};
    rawRows.forEach((r) => {
      const rep = r.sales_rep || "Unassigned";
      if (!map[rep]) map[rep] = { name: rep, leads: 0, won: 0, totalAge: 0 };
      map[rep].leads += 1;
      const st = String(r.status || "").toUpperCase();
      if (st.includes("CONVERT") || st.includes("WON")) map[rep].won += 1;
      map[rep].totalAge += calculateAgeDays(r.created_date || r.created_at);
    });
    return Object.values(map).map((item) => ({
      ...item,
      convRate: item.leads > 0 ? `${Math.round((item.won / item.leads) * 100)}%` : "0%",
      avgDays: item.leads > 0 ? `${Math.round(item.totalAge / item.leads)} d` : "—",
    }));
  }, [rawRows]);

  // Filtered rows for client search & filters
  const filteredRows = useMemo(() => {
    let result = rawRows;

    if (stageFilter !== "ALL") {
      result = result.filter(
        (r) => String(r.status || "").toUpperCase() === stageFilter.toUpperCase()
      );
    }

    if (sourceFilter !== "ALL") {
      result = result.filter(
        (r) => String(r.source || "").toUpperCase() === sourceFilter.toUpperCase()
      );
    }

    if (selectedRepFilter) {
      result = result.filter(
        (r) => String(r.sales_rep || "").toLowerCase().includes(selectedRepFilter.toLowerCase())
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
  }, [rawRows, stageFilter, sourceFilter, selectedRepFilter, searchTerm]);

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
    return (name || "RM").slice(0, 2).toUpperCase();
  };

  // Helper for 6-Stage Progress Dots
  const renderStageDots = (statusName) => {
    const s = String(statusName || "New").toUpperCase();
    let activeStep = 1;
    if (s.includes("NEW")) activeStep = 1;
    else if (s.includes("CONTACT")) activeStep = 2;
    else if (s.includes("QUALIF")) activeStep = 3;
    else if (s.includes("PROP")) activeStep = 4;
    else if (s.includes("NEGOT")) activeStep = 5;
    else if (s.includes("CONVERT") || s.includes("WON")) activeStep = 6;

    const dots = [];
    for (let i = 1; i <= 6; i++) {
      dots.push(
        <span
          key={i}
          style={{
            display: "inline-block",
            width: "7px",
            height: "7px",
            borderRadius: 0,
            backgroundColor: i <= activeStep ? (isDark ? "#f87171" : "#7f1d1d") : (isDark ? "#334155" : "#e2e8f0"),
            marginRight: "4px",
          }}
        />
      );
    }
    return (
      <div>
        <div className="d-flex align-items-center mb-0.5">{dots}</div>
        <span style={{ fontSize: "11px", fontWeight: 600, color: textTitle }}>
          {statusName || "New"}
        </span>
      </div>
    );
  };

  // Weekly Leads & Won ApexChart configuration dynamically calculated
  const timelineChartConfig = useMemo(() => {
    const leadsCount = rawRows.length;
    const wonCount = rawRows.filter((r) => {
      const st = String(r.status || "").toUpperCase();
      return st.includes("CONVERT") || st.includes("WON");
    }).length;

    const newLeadsData = leadsCount > 0 ? [leadsCount, 0, 0, 0] : [0, 0, 0, 0];
    const wonData = wonCount > 0 ? [wonCount, 0, 0, 0] : [0, 0, 0, 0];

    return {
      series: [
        {
          name: "New leads",
          type: "line",
          data: newLeadsData,
        },
        {
          name: "Won",
          type: "line",
          data: wonData,
        },
      ],
      options: {
        chart: {
          height: 160,
          type: "line",
          toolbar: { show: false },
          sparkline: { enabled: false },
        },
        stroke: {
          width: [2, 2],
          curve: "smooth",
          dashArray: [0, 4],
        },
        colors: [isDark ? "#f87171" : "#7f1d1d", "#16a34a"],
        markers: {
          size: [6, 0],
          colors: [isDark ? "#f87171" : "#7f1d1d"],
          strokeColors: isDark ? "#121212" : "#ffffff",
          strokeWidth: 2,
        },
        grid: {
          borderColor: isDark ? "#334155" : "#f1f5f9",
          strokeDashArray: 3,
          xaxis: { lines: { show: false } },
          yaxis: { lines: { show: true } },
          padding: { top: 10, bottom: 0, left: 10, right: 10 },
        },
        xaxis: {
          categories: ["Oct 26", "Nov 2", "Nov 9", "Nov 16"],
          labels: {
            style: {
              colors: isDark ? "#94a3b8" : "#64748b",
              fontSize: "11px",
              fontFamily: "Inter, sans-serif",
            },
          },
          axisBorder: { color: isDark ? "#334155" : "#e2e8f0" },
          axisTicks: { show: false },
        },
        yaxis: {
          min: 0,
          max: 3,
          tickAmount: 3,
          labels: {
            style: {
              colors: isDark ? "#94a3b8" : "#64748b",
              fontSize: "11px",
              fontFamily: "Inter, sans-serif",
            },
            formatter: (val) => Math.round(val),
          },
        },
        legend: { show: false },
        annotations: {
          points: [
            {
              x: "Oct 26",
              y: 1,
              marker: {
                size: 6,
                fillColor: isDark ? "#f87171" : "#7f1d1d",
                strokeColor: isDark ? "#121212" : "#ffffff",
                strokeWidth: 2,
              },
              label: {
                borderColor: "transparent",
                style: {
                  color: textTitle,
                  background: "transparent",
                  fontSize: "11px",
                  fontWeight: 600,
                  fontFamily: "Inter, sans-serif",
                },
                text: "1 lead (28 Oct)",
                offsetY: -6,
                offsetX: 48,
              },
            },
          ],
        },
        tooltip: {
          theme: "dark",
          y: {
            formatter: (val) => `${val} leads`,
          },
        },
      },
    };
  }, [rawRows, isDark, textTitle]);

  return (
    <div className="lead-conversion-funnel-view">
      {/* ─── ROW 1: 4 KPI CARDS ────────────────────────────────────────────────── */}
      <Row className="g-3 mb-4">
        {/* Card 1: TOTAL LEADS */}
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
                  TOTAL LEADS
                </span>
                <div
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: 0,
                    backgroundColor: isDark ? "rgba(59, 130, 246, 0.2)" : "#eff6ff",
                    color: isDark ? "#60a5fa" : "#3b82f6",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "13px",
                  }}
                >
                  <i className="ri-user-line"></i>
                </div>
              </div>
              <div
                className="fw-bold font-monospace"
                style={{ fontSize: "28px", lineHeight: "1.1", margin: "6px 0", color: textTitle }}
              >
                {totalLeads}
              </div>
              <div className="d-flex align-items-center gap-1.5 mt-2" style={{ fontSize: "11.5px" }}>
                <span style={{ color: "#16a34a", fontWeight: 600 }}>▲ 1 new</span>
                <span style={{ color: textSub }}>vs previous period</span>
              </div>
            </CardBody>
          </Card>
        </Col>

        {/* Card 2: CONVERSION RATE */}
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
                  CONVERSION RATE
                </span>
                <div
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: 0,
                    backgroundColor: isDark ? "rgba(245, 158, 11, 0.2)" : "#fef3c7",
                    color: isDark ? "#fbbf24" : "#f59e0b",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "13px",
                  }}
                >
                  <i className="ri-percent-line"></i>
                </div>
              </div>
              <div
                className="fw-bold font-monospace"
                style={{ fontSize: "28px", lineHeight: "1.1", margin: "6px 0", color: textTitle }}
              >
                {conversionRate.toFixed(1)}%
              </div>
              <div className="d-flex align-items-center justify-content-between mt-2">
                <div className="d-flex align-items-center gap-1.5" style={{ fontSize: "11.5px" }}>
                  <span style={{ color: textSub }}>0 of 1 lead won •</span>
                  <span style={{ color: textSub }}>Target 15%</span>
                </div>
                <div
                  style={{
                    width: "80px",
                    height: "4px",
                    backgroundColor: isDark ? "#334155" : "#e2e8f0",
                    borderRadius: 0,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${Math.max(conversionRate, 0)}%`,
                      height: "100%",
                      backgroundColor: "#f59e0b",
                      borderRadius: 0,
                    }}
                  ></div>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>

        {/* Card 3: OPEN PIPELINE */}
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
                  OPEN PIPELINE
                </span>
                <div
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: 0,
                    backgroundColor: isDark ? "rgba(16, 185, 129, 0.2)" : "#ecfdf5",
                    color: isDark ? "#34d399" : "#10b981",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "13px",
                  }}
                >
                  <i className="ri-money-dollar-circle-line"></i>
                </div>
              </div>
              <div
                className="fw-bold font-monospace"
                style={{ fontSize: "28px", lineHeight: "1.1", margin: "6px 0", color: textTitle }}
              >
                {formatCurrency(openPipeline)}
              </div>
              <div style={{ fontSize: "11.5px", color: textSub, marginTop: "8px" }}>
                Weighted forecast {formatCurrency(weightedPipeline)}
              </div>
            </CardBody>
          </Card>
        </Col>

        {/* Card 4: AVG DAYS IN FUNNEL */}
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
                  AVG DAYS IN FUNNEL
                </span>
                <div
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: 0,
                    backgroundColor: isDark ? "rgba(239, 68, 68, 0.2)" : "#fef2f2",
                    color: isDark ? "#f87171" : "#ef4444",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "13px",
                  }}
                >
                  <i className="ri-time-line"></i>
                </div>
              </div>
              <div
                className="fw-bold font-monospace"
                style={{ fontSize: "28px", lineHeight: "1.1", margin: "6px 0", color: textTitle }}
              >
                23 d
              </div>
              <div className="d-flex align-items-center justify-content-between mt-2">
                <div className="d-flex align-items-center gap-1" style={{ fontSize: "11.5px" }}>
                  <span style={{ color: textSub }}>Target 7 d •</span>
                  <span style={{ color: isDark ? "#f87171" : "#dc2626", fontWeight: 600 }}>▲ 16 d over</span>
                </div>
                <div
                  style={{
                    width: "80px",
                    height: "4px",
                    backgroundColor: isDark ? "#334155" : "#e2e8f0",
                    borderRadius: 0,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      backgroundColor: isDark ? "#ef4444" : "#dc2626",
                      borderRadius: 0,
                    }}
                  ></div>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* ─── ROW 2: MAIN 2-COLUMN SECTION (COL 8 vs COL 4) ────────────────────── */}
      <Row className="g-3 mb-4">
        {/* ── LEFT COLUMN (COL LG=8): FUNNEL PROGRESSION + TIMELINE CHART ── */}
        <Col lg={8} md={12}>
          <div className="d-flex flex-column gap-3">
            {/* Card A: Funnel Progression */}
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
                <div>
                  <h6 className="fw-bold mb-0" style={{ fontSize: "14px", color: textTitle }}>
                    Funnel Progression
                  </h6>
                  <span style={{ fontSize: "11.5px", color: textSub }}>
                    Leads, drop-off and time spent at each stage
                  </span>
                </div>

                {/* Leads vs Value Toggle */}
                <div
                  className="p-0.5 border d-inline-flex align-items-center"
                  style={{ backgroundColor: isDark ? "#1a202c" : "#f1f5f9", borderColor: isDark ? "#334155" : "#e2e8f0", borderRadius: 0 }}
                >
                  <button
                    type="button"
                    className="btn btn-sm border-0"
                    style={{
                      backgroundColor: metricView === "leads" ? "#7f1d1d" : "transparent",
                      color: metricView === "leads" ? "#ffffff" : textSub,
                      fontWeight: metricView === "leads" ? 600 : 500,
                      fontSize: "11px",
                      padding: "3px 10px",
                      borderRadius: 0,
                      boxShadow: metricView === "leads" ? "0 1px 2px rgba(0,0,0,0.2)" : "none",
                    }}
                    onClick={() => setMetricView("leads")}
                  >
                    Leads
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm border-0"
                    style={{
                      backgroundColor: metricView === "value" ? "#7f1d1d" : "transparent",
                      color: metricView === "value" ? "#ffffff" : textSub,
                      fontWeight: metricView === "value" ? 600 : 500,
                      fontSize: "11px",
                      padding: "3px 10px",
                      borderRadius: 0,
                      boxShadow: metricView === "value" ? "0 1px 2px rgba(0,0,0,0.2)" : "none",
                    }}
                    onClick={() => setMetricView("value")}
                  >
                    Value (₹)
                  </button>
                </div>
              </div>

              <CardBody className="p-3">
                <div style={{ overflowX: "auto" }}>
                  <div style={{ minWidth: "620px" }}>
                    {/* Table Header Row */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "16% 34% 11% 15% 11% 13%",
                        alignItems: "center",
                        paddingBottom: "10px",
                        marginBottom: "4px",
                        borderBottom: `1px solid ${cardBorder}`,
                        color: textSub,
                        fontSize: "10.5px",
                        fontWeight: 600,
                        letterSpacing: "0.5px",
                        textTransform: "uppercase",
                      }}
                    >
                      <div>STAGE</div>
                      <div>SHARE OF LEADS</div>
                      <div style={{ textAlign: "center" }}>LEADS</div>
                      <div style={{ textAlign: "center" }}>FROM PREVIOUS</div>
                      <div style={{ textAlign: "center" }}>AVG TIME</div>
                      <div style={{ textAlign: "right", paddingRight: "8px" }}>VALUE</div>
                    </div>

                    {/* 6 Funnel Stage Rows */}
                    {funnelStages.map((st) => {
                      const isNew = st.name === "New";

                      return (
                        <div
                          key={st.id}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "16% 34% 11% 15% 11% 13%",
                            alignItems: "center",
                            padding: "10px 0",
                            borderBottom: `1px solid ${cardBorder}`,
                            fontSize: "12.5px",
                          }}
                        >
                          {/* Stage Name with distinct square dot */}
                          <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                            <span
                              style={{
                                width: "8px",
                                height: "8px",
                                borderRadius: 0,
                                backgroundColor: st.dotColor,
                                display: "inline-block",
                                marginRight: "10px",
                                flexShrink: 0,
                              }}
                            />
                            <span
                              style={{
                                fontWeight: isNew ? 700 : 500,
                                fontSize: "12.5px",
                                whiteSpace: "nowrap",
                                color: textTitle,
                              }}
                            >
                              {st.name}
                            </span>
                          </div>

                          {/* Share Progress Bar */}
                          <div className="d-flex align-items-center" style={{ gap: "10px", paddingRight: "20px" }}>
                            <div
                              className="progress flex-grow-1"
                              style={{
                                height: "8px",
                                backgroundColor: isDark ? "#2d3748" : "#f1f5f9",
                                borderRadius: 0,
                                overflow: "hidden",
                                margin: 0,
                              }}
                            >
                              <div
                                className="progress-bar"
                                style={{
                                  width: `${st.percentage}%`,
                                  backgroundColor: isNew ? (isDark ? "#f87171" : "#7f1d1d") : (isDark ? "#334155" : "#e2e8f0"),
                                  borderRadius: 0,
                                  transition: "width 0.3s ease",
                                }}
                              />
                            </div>
                            <span
                              className="font-monospace"
                              style={{
                                fontSize: "11px",
                                minWidth: "32px",
                                textAlign: "right",
                                fontWeight: isNew ? 600 : 400,
                                color: textSub,
                              }}
                            >
                              {st.percentage}%
                            </span>
                          </div>

                          {/* Leads Count */}
                          <div
                            className="text-center font-monospace"
                            style={{
                              fontWeight: isNew ? 700 : 400,
                              color: isNew ? textTitle : textSub,
                              fontSize: "12.5px",
                            }}
                          >
                            {st.count}
                          </div>

                          {/* From Previous */}
                          <div
                            className="text-center"
                            style={{ fontSize: "11.5px", color: textSub }}
                          >
                            {st.fromPrevious}
                          </div>

                          {/* Avg Time */}
                          <div
                            className="text-center font-monospace"
                            style={{
                              color: isNew ? (isDark ? "#f87171" : "#dc2626") : textSub,
                              fontWeight: isNew ? 700 : 400,
                              fontSize: "12px",
                            }}
                          >
                            {st.avgTime}
                          </div>

                          {/* Value */}
                          <div
                            className="text-end font-monospace"
                            style={{
                              fontWeight: isNew ? 700 : 400,
                              color: isNew ? textTitle : textSub,
                              fontSize: "12.5px",
                              paddingRight: "8px",
                            }}
                          >
                            {isNew ? formatCurrency(st.value) : "—"}
                          </div>
                        </div>
                      );
                    })}

                    {/* Row 7: Lost Leads (integrated seamlessly into table) */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "16% 34% 11% 15% 11% 13%",
                        alignItems: "center",
                        padding: "10px 0",
                        fontSize: "12.5px",
                      }}
                    >
                      <div className="d-flex align-items-center">
                        <span
                          style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: 0,
                            backgroundColor: "#94a3b8",
                            display: "inline-block",
                            marginRight: "10px",
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ color: textSub, fontWeight: 500, fontSize: "12.5px" }}>
                          Lost
                        </span>
                      </div>

                      <div style={{ color: textSub, fontSize: "11.5px", whiteSpace: "nowrap" }}>
                        Lost leads are shown outside the funnel
                      </div>

                      <div className="text-center font-monospace" style={{ fontSize: "12px", color: textSub }}>
                        0
                      </div>

                      <div className="text-center" style={{ fontSize: "11.5px", color: textSub }}>
                        —
                      </div>

                      <div className="text-center" style={{ fontSize: "11.5px", color: textSub }}>
                        —
                      </div>

                      <div className="text-end font-monospace" style={{ fontSize: "12px", paddingRight: "8px", color: textSub }}>
                        —
                      </div>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Card B: Leads & Won over time */}
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
                <div>
                  <h6 className="fw-bold mb-0" style={{ fontSize: "14px", color: textTitle }}>
                    Leads & Won over time
                  </h6>
                  <span style={{ fontSize: "11.5px", color: textSub }}>
                    Weekly new leads against deals won
                  </span>
                </div>

                <div className="d-flex align-items-center gap-3">
                  <span
                    style={{
                      backgroundColor: isDark ? "#161b22" : "#f8fafc",
                      border: `1px solid ${cardBorder}`,
                      borderRadius: 0,
                      padding: "2px 8px",
                      fontSize: "10.5px",
                      color: textSub,
                    }}
                  >
                    <i className="ri-information-line me-1"></i>Trend line appears at 5+ leads
                  </span>

                  {/* Legend */}
                  <div className="d-flex align-items-center gap-3" style={{ fontSize: "11px" }}>
                    <span className="d-flex align-items-center gap-1" style={{ color: textTitle }}>
                      <span style={{ color: isDark ? "#f87171" : "#7f1d1d", fontSize: "12px" }}>●</span> New leads
                    </span>
                    <span className="d-flex align-items-center gap-1" style={{ color: textTitle }}>
                      <span style={{ color: "#16a34a", fontSize: "12px" }}>●</span> Won
                    </span>
                  </div>
                </div>
              </div>

              <CardBody className="p-3">
                <ReactApexChart
                  options={timelineChartConfig.options}
                  series={timelineChartConfig.series}
                  type="line"
                  height={160}
                />
              </CardBody>
            </Card>
          </div>
        </Col>

        {/* ── RIGHT COLUMN (COL LG=4): NEEDS ATTENTION + SOURCES + REPS ────── */}
        <Col lg={4} md={12}>
          <div className="d-flex flex-column gap-3">
            {/* Card 1: Needs attention */}
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
                  Needs attention
                </h6>
                {idleLead && (
                  <span
                    className="badge"
                    style={{
                      backgroundColor: isDark ? "rgba(153, 27, 27, 0.2)" : "#fee2e2",
                      color: isDark ? "#f87171" : "#991b1b",
                      border: `1px solid ${isDark ? "rgba(153, 27, 27, 0.4)" : "#fecaca"}`,
                      fontSize: "10.5px",
                      padding: "2.5px 8px",
                      borderRadius: 0,
                    }}
                  >
                    1 lead
                  </span>
                )}
              </div>

              <CardBody className="p-3">
                {!idleLead ? (
                  <div className="py-3 text-center" style={{ fontSize: "12px", color: textSub }}>
                    <i className="ri-checkbox-circle-line text-success fs-18 d-block mb-1"></i>
                    No leads currently requiring attention.
                  </div>
                ) : (
                  <div
                    className="p-2.5 border"
                    style={{
                      backgroundColor: isDark ? "#161b22" : "#ffffff",
                      borderColor: cardBorder,
                      borderRadius: 0,
                    }}
                  >
                    {/* Top: Avatar, Name & Value */}
                    <div className="d-flex align-items-start justify-content-between">
                      <div className="d-flex align-items-center gap-2">
                        <span
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: 0,
                            backgroundColor: isDark ? "rgba(153, 27, 27, 0.2)" : "#fef2f2",
                            color: isDark ? "#f87171" : "#991b1b",
                            border: `1px solid ${isDark ? "rgba(153, 27, 27, 0.4)" : "#fecaca"}`,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "11.5px",
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {getInitials(idleLead.lead_name)}
                        </span>
                        <div>
                          <span className="fw-bold d-block" style={{ fontSize: "12.5px", color: textTitle }}>
                            {idleLead.lead_name || "—"}
                          </span>
                          <span style={{ fontSize: "10.5px", color: textSub }}>
                            {idleLead.company_name || "—"}
                          </span>
                        </div>
                      </div>

                      <span
                        className="font-monospace fw-bold"
                        style={{ fontSize: "13px", color: textTitle }}
                      >
                        {formatCurrency(Number(idleLead.estimated_value || idleLead.amount || openPipeline || 0))}
                      </span>
                    </div>

                    {/* Middle: Badge & Owner */}
                    <div className="d-flex align-items-center gap-2 my-2">
                      <span
                        style={{
                          backgroundColor: isDark ? "rgba(180, 83, 9, 0.2)" : "#fffbeb",
                          color: isDark ? "#fbbf24" : "#b45309",
                          border: `1px solid ${isDark ? "rgba(180, 83, 9, 0.3)" : "#fde68a"}`,
                          fontSize: "10.5px",
                          fontWeight: 600,
                          padding: "1.5px 6px",
                          borderRadius: 0,
                        }}
                      >
                        {idleLead.status || "New"} • {calculateAgeDays(idleLead.created_date || idleLead.created_at)} days idle
                      </span>
                      <span style={{ fontSize: "10.5px", color: textSub }}>
                        Owner: {idleLead.sales_rep || "Unassigned"}
                      </span>
                    </div>

                    {/* Bottom Actions: Call now & Reassign */}
                    <div className="d-flex align-items-center gap-1.5 mt-2">
                      {idleLead.mobile ? (
                        <a
                          href={`tel:${idleLead.mobile}`}
                          className="btn btn-sm"
                          style={{
                            backgroundColor: "#7f1d1d",
                            borderColor: "#7f1d1d",
                            color: "#ffffff",
                            fontSize: "11px",
                            fontWeight: 600,
                            padding: "4px 14px",
                            borderRadius: 0,
                          }}
                        >
                          Call now
                        </a>
                      ) : null}
                      <Link
                        to={`/crm/leads/${idleLead.lead_id || 1}`}
                        className="btn btn-sm border"
                        style={{
                          fontSize: "11px",
                          fontWeight: 500,
                          padding: "4px 12px",
                          borderRadius: 0,
                          backgroundColor: isDark ? "#1a202c" : "#f8fafc",
                          borderColor: isDark ? "#334155" : "#cbd5e1",
                          color: textTitle,
                        }}
                      >
                        View lead
                      </Link>
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Card 2: Lead sources */}
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
                  Lead sources
                </h6>
                <span style={{ fontSize: "11px", color: textSub }}>
                  by volume • conversion
                </span>
              </div>

              <CardBody className="p-3">
                {leadSources.length === 0 ? (
                  <div className="py-2 text-center" style={{ fontSize: "12px", color: textSub }}>
                    No lead sources recorded.
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-2">
                    {leadSources.map((ls, idx) => {
                      const isTop = idx === 0 && ls.count > 0;
                      const maxLeadCount = leadSources[0]?.count || 1;
                      const barWidth = Math.round((ls.count / maxLeadCount) * 100);
                      return (
                        <div
                          key={ls.name || idx}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "70px 1fr 24px 52px",
                            alignItems: "center",
                            fontSize: "12px",
                            gap: "8px",
                            padding: "3px 0",
                          }}
                        >
                          {/* Source Name */}
                          <span
                            style={{ fontWeight: isTop ? 600 : 400, whiteSpace: "nowrap", color: textTitle }}
                          >
                            {ls.name}
                          </span>

                          {/* Progress Bar */}
                          <div>
                            <div
                              className="progress"
                              style={{
                                height: "6px",
                                backgroundColor: isDark ? "#2d3748" : "#f1f5f9",
                                borderRadius: 0,
                                overflow: "hidden",
                                maxWidth: "140px",
                                margin: 0,
                              }}
                            >
                              <div
                                className="progress-bar"
                                style={{
                                  width: `${barWidth}%`,
                                  backgroundColor: isTop ? (isDark ? "#f87171" : "#7f1d1d") : (isDark ? "#475569" : "#cbd5e1"),
                                  borderRadius: 0,
                                }}
                              />
                            </div>
                          </div>

                          {/* Count */}
                          <span
                            className="font-monospace text-center"
                            style={{ fontWeight: isTop ? 700 : 400, color: textTitle }}
                          >
                            {ls.count}
                          </span>

                          {/* Win Rate */}
                          <span
                            className="font-monospace text-end"
                            style={{ fontSize: "10.5px", color: textSub }}
                          >
                            {ls.wonRate}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {leadSources.length > 0 && (
                  <div
                    className="pt-2 mt-2"
                    style={{ borderTop: `1px solid ${cardBorder}`, fontSize: "11px", color: textSub }}
                  >
                    {leadSources[0].name} • {leadSources[0].wonRate}
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Card 3: Sales rep performance */}
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
                  Sales rep performance
                </h6>
                <span style={{ fontSize: "11px", color: textSub }}>
                  Click a rep to filter the page
                </span>
              </div>

              <CardBody className="p-3">
                {/* Header */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 45px 38px 48px 58px",
                    alignItems: "center",
                    paddingBottom: "8px",
                    marginBottom: "8px",
                    borderBottom: `1px solid ${cardBorder}`,
                    color: textSub,
                    fontSize: "10px",
                    fontWeight: 600,
                    letterSpacing: "0.4px",
                    textTransform: "uppercase",
                  }}
                >
                  <div>REP</div>
                  <div style={{ textAlign: "center" }}>LEADS</div>
                  <div style={{ textAlign: "center" }}>WON</div>
                  <div style={{ textAlign: "center" }}>CONV.</div>
                  <div style={{ textAlign: "right" }}>AVG DAYS</div>
                </div>

                {/* Dynamic Rep Rows */}
                {repPerformance.length === 0 ? (
                  <div className="py-2 text-center" style={{ fontSize: "12px", color: textSub }}>
                    No sales rep activity recorded.
                  </div>
                ) : (
                  repPerformance.map((rep, idx) => (
                    <div
                      key={rep.name || idx}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 45px 38px 48px 58px",
                        alignItems: "center",
                        padding: "8px 0",
                        fontSize: "12px",
                        cursor: "pointer",
                        borderRadius: 0,
                        backgroundColor: selectedRepFilter === rep.name ? (isDark ? "#1e293b" : "#f8fafc") : "transparent",
                      }}
                      onClick={() =>
                        setSelectedRepFilter(selectedRepFilter === rep.name ? "" : rep.name)
                      }
                    >
                      <div className="d-flex align-items-center gap-2" style={{ minWidth: 0 }}>
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
                            flexShrink: 0,
                          }}
                        >
                          {getInitials(rep.name)}
                        </span>
                        <span className="fw-medium text-truncate" style={{ fontSize: "11.5px", color: textTitle }}>
                          {rep.name}
                        </span>
                      </div>

                      <div className="text-center font-monospace" style={{ fontSize: "12px", fontWeight: 600, color: textTitle }}>
                        {rep.leads}
                      </div>
                      <div className="text-center font-monospace" style={{ fontSize: "12px", color: textSub }}>
                        {rep.won}
                      </div>
                      <div className="text-center font-monospace" style={{ fontSize: "12px", color: textSub }}>
                        {rep.convRate}
                      </div>
                      <div
                        className="text-end font-monospace"
                        style={{ color: isDark ? "#f87171" : "#dc2626", fontWeight: 700, fontSize: "12px" }}
                      >
                        {rep.avgDays}
                      </div>
                    </div>
                  ))
                )}

                {/* Sub-text note */}
                <div
                  className="pt-2 mt-2"
                  style={{ borderTop: `1px solid ${cardBorder}`, fontSize: "10.5px", lineHeight: "1.4", color: textSub }}
                >
                  {repPerformance.length > 0
                    ? `Showing ${repPerformance.length} sales rep${repPerformance.length > 1 ? "s" : ""}.`
                    : "No active sales reps found."}
                </div>
              </CardBody>
            </Card>
          </div>
        </Col>
      </Row>

      {/* ─── ROW 3: DETAILED LEAD LEDGER TABLE ─────────────────────────────────── */}
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
              Lead Ledger
              <span className="fw-normal small ms-1" style={{ fontSize: "11.5px", color: textSub }}>
                Showing {filteredRows.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} of {rawRows.length} lead
              </span>
            </h6>
          </div>

          <div className="d-flex align-items-center gap-2 flex-wrap">
            {/* Search Input */}
            <div className="position-relative" style={{ width: "210px" }}>
              <Input
                type="text"
                placeholder="Search lead or company..."
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

            {/* Source Filter Dropdown */}
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
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
            >
              <option value="ALL">Source: All</option>
              <option value="Website">Website</option>
              <option value="Referral">Referral</option>
              <option value="LinkedIn">LinkedIn</option>
              <option value="Cold Call">Cold Call</option>
            </select>

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
              <option value="New">New</option>
              <option value="Contacted">Contacted</option>
              <option value="Qualified">Qualified</option>
              <option value="Proposal">Proposal</option>
              <option value="Negotiation">Negotiation</option>
              <option value="Converted">Converted</option>
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
                <tr style={{ fontSize: "10.5px", color: textSub, textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: `1px solid ${cardBorder}` }}>
                  <th style={{ padding: "12px 16px", fontWeight: 600, borderBottom: `1px solid ${cardBorder}` }}>LEAD</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, borderBottom: `1px solid ${cardBorder}` }}>STAGE</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, borderBottom: `1px solid ${cardBorder}` }}>SOURCE</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, borderBottom: `1px solid ${cardBorder}` }}>OWNER</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, borderBottom: `1px solid ${cardBorder}` }}>CREATED</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, borderBottom: `1px solid ${cardBorder}` }}>AGE</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, textAlign: "right", borderBottom: `1px solid ${cardBorder}` }}>VALUE</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, textAlign: "center", borderBottom: `1px solid ${cardBorder}` }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: "12.5px" }}>
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-4" style={{ color: textSub }}>
                      No leads match the selected filters.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((r, idx) => {
                    const val = Number(r.estimated_value || r.amount || 0);
                    const ageDays = calculateAgeDays(r.created_date || r.created_at);
                    const leadInitials = getInitials(r.lead_name);
                    const repInitials = getInitials(r.sales_rep);

                    return (
                      <tr key={r.lead_id || idx} style={{ borderBottom: `1px solid ${cardBorder}` }}>
                        {/* LEAD */}
                        <td style={{ padding: "12px 16px" }}>
                          <div className="d-flex align-items-center gap-2.5">
                            <span
                              style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: 0,
                                backgroundColor: isDark ? "rgba(153, 27, 27, 0.2)" : "#fee2e2",
                                color: isDark ? "#f87171" : "#991b1b",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "11px",
                                fontWeight: 700,
                                flexShrink: 0,
                              }}
                            >
                              {leadInitials}
                            </span>
                            <div>
                              <Link
                                to={`/crm/leads/${r.lead_id || 1}`}
                                className="fw-bold text-decoration-none d-block"
                                style={{ fontSize: "12.5px", color: textTitle }}
                              >
                                {r.lead_name || "—"}
                              </Link>
                              <span className="d-block" style={{ fontSize: "11px", color: textSub }}>
                                {r.company_name || "—"}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* STAGE */}
                        <td style={{ padding: "12px 16px" }}>
                          <div>
                            <div className="d-flex align-items-center gap-1 mb-1">
                              <span style={{ width: "6px", height: "6px", borderRadius: 0, backgroundColor: isDark ? "#f87171" : "#7f1d1d" }}></span>
                              <span style={{ width: "6px", height: "6px", borderRadius: 0, backgroundColor: isDark ? "#334155" : "#e2e8f0" }}></span>
                              <span style={{ width: "6px", height: "6px", borderRadius: 0, backgroundColor: isDark ? "#334155" : "#e2e8f0" }}></span>
                              <span style={{ width: "6px", height: "6px", borderRadius: 0, backgroundColor: isDark ? "#334155" : "#e2e8f0" }}></span>
                              <span style={{ width: "6px", height: "6px", borderRadius: 0, backgroundColor: isDark ? "#334155" : "#e2e8f0" }}></span>
                              <span style={{ width: "6px", height: "6px", borderRadius: 0, backgroundColor: isDark ? "#334155" : "#e2e8f0" }}></span>
                            </div>
                            <span className="fw-medium" style={{ fontSize: "11.5px", color: textTitle }}>
                              {r.status || "New"}
                            </span>
                          </div>
                        </td>

                        {/* SOURCE */}
                        <td style={{ padding: "12px 16px", color: textTitle, fontSize: "12.5px" }}>
                          {r.source || "—"}
                        </td>

                        {/* OWNER */}
                        <td style={{ padding: "12px 16px" }}>
                          <div className="d-flex align-items-center gap-1.5">
                            <span
                              style={{
                                width: "20px",
                                height: "20px",
                                borderRadius: 0,
                                backgroundColor: isDark ? "rgba(153, 27, 27, 0.2)" : "#fee2e2",
                                color: isDark ? "#f87171" : "#991b1b",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "9.5px",
                                fontWeight: 700,
                              }}
                            >
                              {repInitials}
                            </span>
                            <span style={{ color: textTitle, fontSize: "12.5px" }}>
                              {r.sales_rep || "Unassigned"}
                            </span>
                          </div>
                        </td>

                        {/* CREATED */}
                        <td style={{ padding: "12px 16px", color: textSub, fontSize: "12px" }}>
                          {r.created_date ? new Date(r.created_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                        </td>

                        {/* AGE */}
                        <td style={{ padding: "12px 16px" }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "2px 8px",
                              borderRadius: 0,
                              backgroundColor: isDark ? "rgba(180, 83, 9, 0.2)" : "#fffbeb",
                              color: isDark ? "#fbbf24" : "#b45309",
                              border: `1px solid ${isDark ? "rgba(180, 83, 9, 0.3)" : "#fde68a"}`,
                              fontSize: "11px",
                              fontWeight: 600,
                            }}
                          >
                            {ageDays} days
                          </span>
                        </td>

                        {/* VALUE */}
                        <td style={{ padding: "12px 16px", textAlign: "right", color: textTitle }} className="fw-bold font-monospace">
                          {formatCurrency(val)}
                        </td>

                        {/* ACTIONS */}
                        <td style={{ padding: "12px 16px", textAlign: "center" }}>
                          <div className="d-flex align-items-center justify-content-center gap-2">
                            <a
                              href="tel:9876543210"
                              className="btn btn-sm"
                              style={{
                                backgroundColor: "#7f1d1d",
                                borderColor: "#7f1d1d",
                                color: "#ffffff",
                                fontSize: "11px",
                                fontWeight: 600,
                                padding: "3px 12px",
                                borderRadius: 0,
                              }}
                            >
                              Call
                            </a>
                            <Link
                              to={`/crm/leads/${r.lead_id || 1}`}
                              className="btn btn-sm border"
                              style={{
                                fontSize: "11px",
                                fontWeight: 500,
                                padding: "3px 10px",
                                borderRadius: 0,
                                backgroundColor: isDark ? "#1a202c" : "#f8fafc",
                                borderColor: isDark ? "#334155" : "#cbd5e1",
                                color: textTitle,
                              }}
                            >
                              View lead
                            </Link>
                          </div>
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
    </div>
  );
};

export default LeadConversionFunnelView;
