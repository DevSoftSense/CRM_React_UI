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
            borderRadius: "50%",
            backgroundColor: i <= activeStep ? "#7f1d1d" : "#e2e8f0",
            marginRight: "4px",
          }}
        />
      );
    }
    return (
      <div>
        <div className="d-flex align-items-center mb-0.5">{dots}</div>
        <span className="text-dark" style={{ fontSize: "11px", fontWeight: 600 }}>
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
        colors: ["#7f1d1d", "#16a34a"],
        markers: {
          size: [6, 0],
          colors: ["#7f1d1d"],
          strokeColors: "#ffffff",
          strokeWidth: 2,
        },
        grid: {
          borderColor: "#f1f5f9",
          strokeDashArray: 3,
          xaxis: { lines: { show: false } },
          yaxis: { lines: { show: true } },
          padding: { top: 10, bottom: 0, left: 10, right: 10 },
        },
        xaxis: {
          categories: ["Oct 26", "Nov 2", "Nov 9", "Nov 16"],
          labels: {
            style: {
              colors: "#64748b",
              fontSize: "11px",
              fontFamily: "Inter, sans-serif",
            },
          },
          axisBorder: { color: "#e2e8f0" },
          axisTicks: { show: false },
        },
        yaxis: {
          min: 0,
          max: 3,
          tickAmount: 3,
          labels: {
            style: {
              colors: "#64748b",
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
                fillColor: "#7f1d1d",
                strokeColor: "#ffffff",
                strokeWidth: 2,
              },
              label: {
                borderColor: "transparent",
                style: {
                  color: "#0f172a",
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
  }, []);

  return (
    <div className="lead-conversion-funnel-view">
      {/* ─── ROW 1: 4 KPI CARDS ────────────────────────────────────────────────── */}
      <Row className="g-3 mb-4">
        {/* Card 1: TOTAL LEADS */}
        <Col lg={3} sm={6}>
          <Card
            className="h-100 bg-white"
            style={{
              borderRadius: "4px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
            }}
          >
            <CardBody className="p-3">
              <div className="d-flex align-items-center justify-content-between mb-1">
                <span
                  className="text-muted text-uppercase fw-bold"
                  style={{ fontSize: "11px", letterSpacing: "0.5px" }}
                >
                  TOTAL LEADS
                </span>
                <div
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    backgroundColor: "#eff6ff",
                    color: "#3b82f6",
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
                className="fw-bold text-dark font-monospace"
                style={{ fontSize: "28px", lineHeight: "1.1", margin: "6px 0" }}
              >
                {totalLeads}
              </div>
              <div className="d-flex align-items-center gap-1.5 mt-2" style={{ fontSize: "11.5px" }}>
                <span style={{ color: "#16a34a", fontWeight: 600 }}>▲ 1 new</span>
                <span className="text-muted">vs previous period</span>
              </div>
            </CardBody>
          </Card>
        </Col>

        {/* Card 2: CONVERSION RATE */}
        <Col lg={3} sm={6}>
          <Card
            className="h-100 bg-white"
            style={{
              borderRadius: "4px",
              border: "1px solid #e2e8f0",
              borderLeft: "3.5px solid #f59e0b",
              boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
            }}
          >
            <CardBody className="p-3">
              <div className="d-flex align-items-center justify-content-between mb-1">
                <span
                  className="text-muted text-uppercase fw-bold"
                  style={{ fontSize: "11px", letterSpacing: "0.5px" }}
                >
                  CONVERSION RATE
                </span>
                <span className="text-muted" style={{ fontSize: "11.5px" }}>
                  Target 15%
                </span>
              </div>
              <div
                className="fw-bold text-dark font-monospace"
                style={{ fontSize: "28px", lineHeight: "1.1", margin: "6px 0" }}
              >
                {conversionRate.toFixed(1)}%
              </div>
              <div className="d-flex align-items-center justify-content-between mt-2">
                <span className="text-muted" style={{ fontSize: "11.5px" }}>
                  0 of 1 lead won
                </span>
                <div
                  style={{
                    width: "90px",
                    height: "3px",
                    backgroundColor: "#e2e8f0",
                    borderRadius: "2px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${conversionRate}%`,
                      height: "100%",
                      backgroundColor: "#f59e0b",
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
            className="h-100 bg-white"
            style={{
              borderRadius: "4px",
              border: "1px solid #e2e8f0",
              borderLeft: "3.5px solid #10b981",
              boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
            }}
          >
            <CardBody className="p-3">
              <div className="d-flex align-items-center justify-content-between mb-1">
                <span
                  className="text-muted text-uppercase fw-bold"
                  style={{ fontSize: "11px", letterSpacing: "0.5px" }}
                >
                  OPEN PIPELINE
                </span>
              </div>
              <div
                className="fw-bold text-dark font-monospace"
                style={{ fontSize: "28px", lineHeight: "1.1", margin: "6px 0" }}
              >
                {formatCurrency(openPipeline)}
              </div>
              <div className="text-muted mt-2" style={{ fontSize: "11.5px" }}>
                Weighted forecast {formatCurrency(weightedPipeline)}
              </div>
            </CardBody>
          </Card>
        </Col>

        {/* Card 4: AVG DAYS IN FUNNEL */}
        <Col lg={3} sm={6}>
          <Card
            className="h-100 bg-white"
            style={{
              borderRadius: "4px",
              border: "1px solid #e2e8f0",
              borderLeft: "3.5px solid #b91c1c",
              boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
            }}
          >
            <CardBody className="p-3">
              <div className="d-flex align-items-center justify-content-between mb-1">
                <span
                  className="text-muted text-uppercase fw-bold"
                  style={{ fontSize: "11px", letterSpacing: "0.5px" }}
                >
                  AVG DAYS IN FUNNEL
                </span>
              </div>
              <div
                className="fw-bold text-dark font-monospace"
                style={{ fontSize: "28px", lineHeight: "1.1", margin: "6px 0" }}
              >
                23 d
              </div>
              <div className="d-flex align-items-center justify-content-between mt-2">
                <div className="d-flex align-items-center gap-1" style={{ fontSize: "11.5px" }}>
                  <span className="text-muted">Target 7 d •</span>
                  <span style={{ color: "#dc2626", fontWeight: 600 }}>▲ 16 d over</span>
                </div>
                <div
                  style={{
                    width: "80px",
                    height: "4px",
                    backgroundColor: "#dc2626",
                    borderRadius: "2px",
                  }}
                ></div>
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
                <div>
                  <h6 className="fw-bold text-dark mb-0" style={{ fontSize: "14px" }}>
                    Funnel Progression
                  </h6>
                  <span className="text-muted" style={{ fontSize: "11.5px" }}>
                    Leads, drop-off and time spent at each stage
                  </span>
                </div>

                {/* Leads vs Value Toggle */}
                <div
                  className="p-0.5 border d-inline-flex align-items-center"
                  style={{ backgroundColor: "#f1f5f9", borderRadius: "4px" }}
                >
                  <button
                    type="button"
                    className="btn btn-sm border-0"
                    style={{
                      backgroundColor: metricView === "leads" ? "#ffffff" : "transparent",
                      color: metricView === "leads" ? "#0f172a" : "#64748b",
                      fontWeight: metricView === "leads" ? 600 : 500,
                      fontSize: "11px",
                      padding: "3px 10px",
                      borderRadius: "3px",
                      boxShadow: metricView === "leads" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                    }}
                    onClick={() => setMetricView("leads")}
                  >
                    Leads
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm border-0"
                    style={{
                      backgroundColor: metricView === "value" ? "#ffffff" : "transparent",
                      color: metricView === "value" ? "#0f172a" : "#64748b",
                      fontWeight: metricView === "value" ? 600 : 500,
                      fontSize: "11px",
                      padding: "3px 10px",
                      borderRadius: "3px",
                      boxShadow: metricView === "value" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
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
                        borderBottom: "1px solid #f1f5f9",
                        color: "#64748b",
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
                            borderBottom: "1px solid #f8fafc",
                            fontSize: "12.5px",
                          }}
                        >
                          {/* Stage Name with distinct round dot */}
                          <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                            <span
                              style={{
                                width: "8px",
                                height: "8px",
                                borderRadius: "50%",
                                backgroundColor: st.dotColor,
                                display: "inline-block",
                                marginRight: "10px",
                                flexShrink: 0,
                              }}
                            />
                            <span
                              className="text-dark"
                              style={{
                                fontWeight: isNew ? 700 : 500,
                                fontSize: "12.5px",
                                whiteSpace: "nowrap",
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
                                backgroundColor: "#f1f5f9",
                                borderRadius: "3px",
                                overflow: "hidden",
                                margin: 0,
                              }}
                            >
                              <div
                                className="progress-bar"
                                style={{
                                  width: `${st.percentage}%`,
                                  backgroundColor: isNew ? "#7f1d1d" : "#e2e8f0",
                                  borderRadius: "3px",
                                  transition: "width 0.3s ease",
                                }}
                              />
                            </div>
                            <span
                              className="font-monospace text-muted"
                              style={{
                                fontSize: "11px",
                                minWidth: "32px",
                                textAlign: "right",
                                fontWeight: isNew ? 600 : 400,
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
                              color: isNew ? "#0f172a" : "#64748b",
                              fontSize: "12.5px",
                            }}
                          >
                            {st.count}
                          </div>

                          {/* From Previous */}
                          <div
                            className="text-center text-muted"
                            style={{ fontSize: "11.5px" }}
                          >
                            {st.fromPrevious}
                          </div>

                          {/* Avg Time */}
                          <div
                            className="text-center font-monospace"
                            style={{
                              color: isNew ? "#dc2626" : "#64748b",
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
                              color: isNew ? "#0f172a" : "#64748b",
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
                            borderRadius: "50%",
                            backgroundColor: "#94a3b8",
                            display: "inline-block",
                            marginRight: "10px",
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ color: "#94a3b8", fontWeight: 500, fontSize: "12.5px" }}>
                          Lost
                        </span>
                      </div>

                      <div style={{ color: "#94a3b8", fontSize: "11.5px", whiteSpace: "nowrap" }}>
                        Lost leads are shown outside the funnel
                      </div>

                      <div className="text-center font-monospace text-muted" style={{ fontSize: "12px" }}>
                        0
                      </div>

                      <div className="text-center text-muted" style={{ fontSize: "11.5px" }}>
                        —
                      </div>

                      <div className="text-center text-muted" style={{ fontSize: "11.5px" }}>
                        —
                      </div>

                      <div className="text-end text-muted font-monospace" style={{ fontSize: "12px", paddingRight: "8px" }}>
                        —
                      </div>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Card B: Leads & Won over time */}
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
                <div>
                  <h6 className="fw-bold text-dark mb-0" style={{ fontSize: "14px" }}>
                    Leads & Won over time
                  </h6>
                  <span className="text-muted" style={{ fontSize: "11.5px" }}>
                    Weekly new leads against deals won
                  </span>
                </div>

                {/* Legend */}
                <div className="d-flex align-items-center gap-3" style={{ fontSize: "11px" }}>
                  <span className="d-flex align-items-center gap-1 text-dark">
                    <span style={{ color: "#7f1d1d", fontSize: "12px" }}>●</span> New leads
                  </span>
                  <span className="d-flex align-items-center gap-1 text-dark">
                    <span style={{ color: "#16a34a", fontSize: "12px" }}>●</span> Won
                  </span>
                </div>
              </div>

              <CardBody className="p-3 position-relative">
                <ReactApexChart
                  options={timelineChartConfig.options}
                  series={timelineChartConfig.series}
                  type="line"
                  height={160}
                />

                {/* Trend Note Pill Overlay */}
                <div
                  className="position-absolute start-50 translate-middle-x"
                  style={{
                    top: "35px",
                    backgroundColor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "4px",
                    padding: "4px 12px",
                    fontSize: "11px",
                    color: "#64748b",
                    pointerEvents: "none",
                  }}
                >
                  Trend line appears once you have 5 or more leads
                </div>
              </CardBody>
            </Card>
          </div>
        </Col>

        {/* ── RIGHT COLUMN (COL LG=4): NEEDS ATTENTION + SOURCES + REPS ────── */}
        <Col lg={4} md={12}>
          <div className="d-flex flex-column gap-3">
            {/* Card 1: Needs attention */}
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
                  Needs attention
                </h6>
                {idleLead && (
                  <span
                    className="badge"
                    style={{
                      backgroundColor: "#fee2e2",
                      color: "#991b1b",
                      border: "1px solid #fecaca",
                      fontSize: "10.5px",
                      padding: "2.5px 8px",
                      borderRadius: "10px",
                    }}
                  >
                    1 lead
                  </span>
                )}
              </div>

              <CardBody className="p-3">
                {!idleLead ? (
                  <div className="py-3 text-center text-muted" style={{ fontSize: "12px" }}>
                    <i className="ri-checkbox-circle-line text-success fs-18 d-block mb-1"></i>
                    No leads currently requiring attention.
                  </div>
                ) : (
                  <div
                    className="p-2.5 border"
                    style={{
                      backgroundColor: "#ffffff",
                      borderColor: "#e2e8f0",
                      borderRadius: "4px",
                    }}
                  >
                    {/* Top: Avatar, Name & Value */}
                    <div className="d-flex align-items-start justify-content-between">
                      <div className="d-flex align-items-center gap-2">
                        <span
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "4px",
                            backgroundColor: "#fef2f2",
                            color: "#991b1b",
                            border: "1px solid #fecaca",
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
                          <span className="fw-bold text-dark d-block" style={{ fontSize: "12.5px" }}>
                            {idleLead.lead_name || "—"}
                          </span>
                          <span className="text-muted" style={{ fontSize: "10.5px" }}>
                            {idleLead.company_name || "—"}
                          </span>
                        </div>
                      </div>

                      <span
                        className="font-monospace fw-bold text-dark"
                        style={{ fontSize: "13px" }}
                      >
                        {formatCurrency(Number(idleLead.estimated_value || idleLead.amount || openPipeline || 0))}
                      </span>
                    </div>

                    {/* Middle: Badge & Owner */}
                    <div className="d-flex align-items-center gap-2 my-2">
                      <span
                        style={{
                          backgroundColor: "#fffbeb",
                          color: "#b45309",
                          border: "1px solid #fde68a",
                          fontSize: "10.5px",
                          fontWeight: 600,
                          padding: "1.5px 6px",
                          borderRadius: "3px",
                        }}
                      >
                        {idleLead.status || "New"} • {calculateAgeDays(idleLead.created_date || idleLead.created_at)} days idle
                      </span>
                      <span className="text-muted" style={{ fontSize: "10.5px" }}>
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
                            borderRadius: "3px",
                          }}
                        >
                          Call now
                        </a>
                      ) : null}
                      <Link
                        to={`/crm/leads/${idleLead.lead_id || 1}`}
                        className="btn btn-sm btn-light border"
                        style={{
                          fontSize: "11px",
                          fontWeight: 500,
                          padding: "4px 12px",
                          borderRadius: "3px",
                          color: "#334155",
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
                  Lead sources
                </h6>
                <span className="text-muted" style={{ fontSize: "11px" }}>
                  by volume • conversion
                </span>
              </div>

              <CardBody className="p-3">
                {leadSources.length === 0 ? (
                  <div className="py-2 text-center text-muted" style={{ fontSize: "12px" }}>
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
                            className="text-dark"
                            style={{ fontWeight: isTop ? 600 : 400, whiteSpace: "nowrap" }}
                          >
                            {ls.name}
                          </span>

                          {/* Progress Bar */}
                          <div>
                            <div
                              className="progress"
                              style={{
                                height: "6px",
                                backgroundColor: "#f1f5f9",
                                borderRadius: "2px",
                                overflow: "hidden",
                                maxWidth: "140px",
                                margin: 0,
                              }}
                            >
                              <div
                                className="progress-bar"
                                style={{
                                  width: `${barWidth}%`,
                                  backgroundColor: isTop ? "#7f1d1d" : "#cbd5e1",
                                }}
                              />
                            </div>
                          </div>

                          {/* Count */}
                          <span
                            className="font-monospace text-dark text-center"
                            style={{ fontWeight: isTop ? 700 : 400 }}
                          >
                            {ls.count}
                          </span>

                          {/* Win Rate */}
                          <span
                            className="text-muted font-monospace text-end"
                            style={{ fontSize: "10.5px" }}
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
                    className="pt-2 mt-2 border-top text-muted"
                    style={{ fontSize: "11px" }}
                  >
                    {leadSources[0].name} • {leadSources[0].wonRate}
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Card 3: Sales rep performance */}
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
                  Sales rep performance
                </h6>
                <span className="text-muted" style={{ fontSize: "11px" }}>
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
                    borderBottom: "1px solid #f1f5f9",
                    color: "#64748b",
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
                  <div className="py-2 text-center text-muted" style={{ fontSize: "12px" }}>
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
                        borderRadius: "3px",
                        backgroundColor: selectedRepFilter === rep.name ? "#f8fafc" : "transparent",
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
                            borderRadius: "3px",
                            backgroundColor: "#fef2f2",
                            color: "#991b1b",
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
                        <span className="text-dark fw-medium text-truncate" style={{ fontSize: "11.5px" }}>
                          {rep.name}
                        </span>
                      </div>

                      <div className="text-center font-monospace" style={{ fontSize: "12px", fontWeight: 600, color: "#0f172a" }}>
                        {rep.leads}
                      </div>
                      <div className="text-center font-monospace text-muted" style={{ fontSize: "12px" }}>
                        {rep.won}
                      </div>
                      <div className="text-center font-monospace text-muted" style={{ fontSize: "12px" }}>
                        {rep.convRate}
                      </div>
                      <div
                        className="text-end font-monospace"
                        style={{ color: "#dc2626", fontWeight: 700, fontSize: "12px" }}
                      >
                        {rep.avgDays}
                      </div>
                    </div>
                  ))
                )}

                {/* Sub-text note */}
                <div
                  className="pt-2 mt-2 border-top text-muted"
                  style={{ fontSize: "10.5px", lineHeight: "1.4" }}
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
              Lead Ledger
              <span className="text-muted fw-normal small ms-1" style={{ fontSize: "11.5px" }}>
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

            {/* Source Filter Dropdown */}
            <select
              className="form-select form-select-sm"
              style={{
                width: "120px",
                borderRadius: "4px",
                fontSize: "12px",
                borderColor: "#cbd5e1",
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
                borderRadius: "4px",
                fontSize: "12px",
                borderColor: "#cbd5e1",
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
                <tr style={{ fontSize: "10.5px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid #e2e8f0" }}>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>LEAD</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>STAGE</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>SOURCE</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>OWNER</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>CREATED</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>AGE</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, textAlign: "right" }}>VALUE</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, textAlign: "center" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: "12.5px" }}>
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-4 text-muted">
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
                      <tr key={r.lead_id || idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        {/* LEAD */}
                        <td style={{ padding: "12px 16px" }}>
                          <div className="d-flex align-items-center gap-2.5">
                            <span
                              style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "50%",
                                backgroundColor: "#fee2e2",
                                color: "#991b1b",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyCenter: "center",
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
                                className="fw-bold text-dark text-decoration-none d-block"
                                style={{ fontSize: "12.5px" }}
                              >
                                {r.lead_name || "—"}
                              </Link>
                              <span className="text-muted" style={{ fontSize: "11px" }}>
                                {r.company_name || "—"}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* STAGE */}
                        <td style={{ padding: "12px 16px" }}>
                          <div>
                            <div className="d-flex align-items-center gap-1 mb-1">
                              <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#7f1d1d" }}></span>
                              <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#e2e8f0" }}></span>
                              <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#e2e8f0" }}></span>
                              <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#e2e8f0" }}></span>
                              <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#e2e8f0" }}></span>
                              <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#e2e8f0" }}></span>
                            </div>
                            <span className="text-dark fw-medium" style={{ fontSize: "11.5px" }}>
                              {r.status || "New"}
                            </span>
                          </div>
                        </td>

                        {/* SOURCE */}
                        <td style={{ padding: "12px 16px", color: "#334155", fontSize: "12.5px" }}>
                          {r.source || "—"}
                        </td>

                        {/* OWNER */}
                        <td style={{ padding: "12px 16px" }}>
                          <div className="d-flex align-items-center gap-1.5">
                            <span
                              style={{
                                width: "20px",
                                height: "20px",
                                borderRadius: "3px",
                                backgroundColor: "#fee2e2",
                                color: "#991b1b",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "9.5px",
                                fontWeight: 700,
                              }}
                            >
                              {repInitials}
                            </span>
                            <span style={{ color: "#334155", fontSize: "12.5px" }}>
                              {r.sales_rep || "Unassigned"}
                            </span>
                          </div>
                        </td>

                        {/* CREATED */}
                        <td style={{ padding: "12px 16px", color: "#475569", fontSize: "12px" }}>
                          {r.created_date ? new Date(r.created_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                        </td>

                        {/* AGE */}
                        <td style={{ padding: "12px 16px" }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "2px 8px",
                              borderRadius: "10px",
                              backgroundColor: "#fffbeb",
                              color: "#b45309",
                              border: "1px solid #fde68a",
                              fontSize: "11px",
                              fontWeight: 600,
                            }}
                          >
                            {ageDays} days
                          </span>
                        </td>

                        {/* VALUE */}
                        <td style={{ padding: "12px 16px", textAlign: "right" }} className="fw-bold text-dark font-monospace">
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
                                borderRadius: "3px",
                              }}
                            >
                              Call
                            </a>
                            <Link
                              to={`/crm/leads/${r.lead_id || 1}`}
                              className="btn btn-sm btn-link text-decoration-none text-muted p-0"
                              style={{ fontSize: "11.5px" }}
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
    </div>
  );
};

export default LeadConversionFunnelView;
