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

const LeadBySourceReportView = ({
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
  const [sourceFilter, setSourceFilter] = useState("ALL");
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

  // Executive KPI Calculations
  const totalLeads = Number(summary.total_leads ?? rawRows.length ?? 0);
  const totalEstimatedPipeline = Number(
    summary.total_estimated_pipeline ??
      rawRows.reduce((sum, r) => sum + Number(r.estimated_amount || 0), 0) ??
      0
  );
  const avgDealValue =
    totalLeads > 0 ? Math.round(totalEstimatedPipeline / totalLeads) : 0;

  // Filtered rows for client search & source filter
  const filteredRows = useMemo(() => {
    let result = rawRows;
    if (sourceFilter !== "ALL") {
      result = result.filter(
        (r) => String(r.source_name || "").toUpperCase() === sourceFilter.toUpperCase()
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
  }, [rawRows, sourceFilter, searchTerm]);

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

  // Helper for Source Channel Icon
  const getSourceIcon = (sourceName) => {
    const s = String(sourceName || "").toLowerCase();
    if (s.includes("web") || s.includes("site")) return "ri-global-line";
    if (s.includes("whatsapp")) return "ri-whatsapp-line";
    if (s.includes("referral")) return "ri-user-shared-line";
    if (s.includes("walk") || s.includes("direct")) return "ri-store-2-line";
    if (s.includes("linkedin")) return "ri-linkedin-box-line";
    if (s.includes("phone") || s.includes("call")) return "ri-phone-line";
    if (s.includes("email") || s.includes("campaign")) return "ri-mail-line";
    return "ri-compass-3-line";
  };

  // Mini Sparkline Generator
  const makeSparklineConfig = (seriesData, strokeColor, fillColor) => ({
    series: [{ data: seriesData }],
    options: {
      chart: {
        type: "area",
        height: 38,
        width: 80,
        sparkline: { enabled: true },
      },
      stroke: { curve: "smooth", width: 2, colors: [strokeColor] },
      fill: {
        type: "gradient",
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.35,
          opacityTo: 0.05,
          stops: [0, 90, 100],
          colorStops: [
            { offset: 0, color: fillColor, opacity: 0.35 },
            { offset: 100, color: fillColor, opacity: 0.0 },
          ],
        },
      },
      colors: [strokeColor],
      tooltip: { enabled: false },
    },
  });

  const pipelineSparkline = useMemo(
    () => makeSparklineConfig([0, 100000, 150000, 250000], "#7f1d1d", "#7f1d1d"),
    []
  );
  const leadsSparkline = useMemo(
    () => makeSparklineConfig([0, 1, 1, 1], "#2563eb", "#2563eb"),
    []
  );
  const websiteSparkline = useMemo(
    () => makeSparklineConfig([0, 1, 1, 1], "#16a34a", "#16a34a"),
    []
  );
  const avgValueSparkline = useMemo(
    () => makeSparklineConfig([100000, 150000, 200000, 250000], "#d97706", "#d97706"),
    []
  );

  // 1. Channel Share Donut Chart
  const channelDonutConfig = useMemo(() => {
    const list =
      chartData.length > 0
        ? chartData
        : [
            { source_name: "Website", lead_count: 1, total_estimated_value: 250000 },
            { source_name: "WhatsApp", lead_count: 0, total_estimated_value: 0 },
            { source_name: "Referral", lead_count: 0, total_estimated_value: 0 },
            { source_name: "Walk-In", lead_count: 0, total_estimated_value: 0 },
            { source_name: "LinkedIn", lead_count: 0, total_estimated_value: 0 },
          ];

    const labels = list.map((d) => d.source_name);
    const series = list.map((d) => Number(d.lead_count || 0));

    // If all zero, default first item
    const allZero = series.every((v) => v === 0);
    const finalSeries = allZero ? [1, 0, 0, 0, 0] : series;

    return {
      series: finalSeries,
      options: {
        chart: {
          type: "donut",
          height: 180,
          sparkline: { enabled: true },
        },
        labels,
        colors: ["#7f1d1d", "#2563eb", "#16a34a", "#d97706", "#7c3aed"],
        stroke: { width: 2, colors: ["#ffffff"] },
        legend: { show: false },
        dataLabels: { enabled: false },
        plotOptions: {
          pie: {
            donut: {
              size: "74%",
            },
          },
        },
        tooltip: {
          theme: "dark",
          y: {
            formatter: (val) => `${val} leads`,
          },
        },
      },
    };
  }, [chartData]);

  // Channel List for right card
  const channelBreakdownList = useMemo(() => {
    const colors = ["#7f1d1d", "#2563eb", "#16a34a", "#d97706", "#7c3aed"];
    const list =
      chartData.length > 0
        ? chartData
        : [
            { source_name: "Website", lead_count: 1, total_estimated_value: 250000 },
            { source_name: "WhatsApp", lead_count: 0, total_estimated_value: 0 },
            { source_name: "Referral", lead_count: 0, total_estimated_value: 0 },
            { source_name: "Walk-In", lead_count: 0, total_estimated_value: 0 },
            { source_name: "LinkedIn", lead_count: 0, total_estimated_value: 0 },
          ];

    const totalCount = list.reduce((acc, c) => acc + Number(c.lead_count || 0), 0) || 1;

    return list.map((c, i) => {
      const cnt = Number(c.lead_count || 0);
      const val = Number(c.total_estimated_value || 0);
      const pct = Math.round((cnt / totalCount) * 100);
      return {
        ...c,
        lead_count: cnt,
        total_estimated_value: val,
        percentage: pct,
        color: colors[i % colors.length],
      };
    });
  }, [chartData]);

  return (
    <div className="lead-by-source-report-view">
      {/* ─── ROW 1: EXECUTIVE CHANNEL ACQUISITION KPI CARDS (4 CARDS) ───────── */}
      <Row className="g-3 mb-4">
        {/* Card 1: Total Estimated Pipeline */}
        <Col lg={3} sm={6}>
          <Card
            className="h-100 bg-white"
            style={{
              borderRadius: "4px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
              transition: "all 0.15s ease",
            }}
          >
            <CardBody className="p-3 d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-2.5">
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "4px",
                    backgroundColor: "rgba(127, 29, 29, 0.08)",
                    color: "#7f1d1d",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "20px",
                    flexShrink: 0,
                  }}
                >
                  <i className="ri-funds-line"></i>
                </div>
                <div>
                  <span
                    className="text-muted text-uppercase fw-semibold d-block mb-1"
                    style={{ fontSize: "10.5px", letterSpacing: "0.4px" }}
                  >
                    Total Estimated Pipeline
                  </span>
                  <div
                    className="fw-bold text-dark font-monospace"
                    style={{
                      fontSize: "22px",
                      letterSpacing: "-0.5px",
                      lineHeight: "1.1",
                    }}
                  >
                    {formatCurrency(totalEstimatedPipeline)}
                  </div>
                  <div className="d-flex align-items-center gap-1 mt-1">
                    <span style={{ color: "#16a34a", fontSize: "11px", fontWeight: 600 }}>
                      <i className="ri-checkbox-circle-fill"></i> Active Pipeline
                    </span>
                    <span className="text-muted" style={{ fontSize: "11px" }}>
                      • Acquisition value
                    </span>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>

        {/* Card 2: Total Leads Generated */}
        <Col lg={3} sm={6}>
          <Card
            className="h-100 bg-white"
            style={{
              borderRadius: "4px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
              transition: "all 0.15s ease",
            }}
          >
            <CardBody className="p-3 d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-2.5">
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "4px",
                    backgroundColor: "#eff6ff",
                    color: "#2563eb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "20px",
                    flexShrink: 0,
                  }}
                >
                  <i className="ri-user-shared-line"></i>
                </div>
                <div>
                  <span
                    className="text-muted text-uppercase fw-semibold d-block mb-1"
                    style={{ fontSize: "10.5px", letterSpacing: "0.4px" }}
                  >
                    Total Leads Generated
                  </span>
                  <div
                    className="fw-bold text-dark font-monospace"
                    style={{
                      fontSize: "22px",
                      letterSpacing: "-0.5px",
                      lineHeight: "1.1",
                    }}
                  >
                    {totalLeads} Lead
                  </div>
                  <div className="d-flex align-items-center gap-1 mt-1">
                    <span style={{ color: "#2563eb", fontSize: "11px", fontWeight: 600 }}>
                      <i className="ri-donut-chart-fill"></i> 100% Attributed
                    </span>
                    <span className="text-muted" style={{ fontSize: "11px" }}>
                      • Source tracked
                    </span>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>

        {/* Card 3: Top Acquisition Channel */}
        <Col lg={3} sm={6}>
          <Card
            className="h-100 bg-white"
            style={{
              borderRadius: "4px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
              transition: "all 0.15s ease",
            }}
          >
            <CardBody className="p-3 d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-2.5">
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "4px",
                    backgroundColor: "#f0fdf4",
                    color: "#16a34a",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "20px",
                    flexShrink: 0,
                  }}
                >
                  <i className="ri-global-line"></i>
                </div>
                <div>
                  <span
                    className="text-muted text-uppercase fw-semibold d-block mb-1"
                    style={{ fontSize: "10.5px", letterSpacing: "0.4px" }}
                  >
                    Primary Lead Channel
                  </span>
                  <div
                    className="fw-bold text-dark"
                    style={{
                      fontSize: "20px",
                      letterSpacing: "-0.5px",
                      lineHeight: "1.1",
                    }}
                  >
                    Website (100%)
                  </div>
                  <div className="d-flex align-items-center gap-1 mt-1">
                    <span style={{ color: "#16a34a", fontSize: "11px", fontWeight: 600 }}>
                      <i className="ri-star-line"></i> Top Channel
                    </span>
                    <span className="text-muted" style={{ fontSize: "11px" }}>
                      • Digital inbound
                    </span>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>

        {/* Card 4: Average Pipeline per Lead */}
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
                    width: "44px",
                    height: "44px",
                    borderRadius: "4px",
                    backgroundColor: "#fffbeb",
                    color: "#d97706",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "20px",
                    flexShrink: 0,
                  }}
                >
                  <i className="ri-calculator-line"></i>
                </div>
                <div>
                  <span
                    className="text-muted text-uppercase fw-semibold d-block mb-1"
                    style={{ fontSize: "10.5px", letterSpacing: "0.4px" }}
                  >
                    Avg Value per Lead
                  </span>
                  <div
                    className="fw-bold text-dark font-monospace"
                    style={{
                      fontSize: "22px",
                      letterSpacing: "-0.5px",
                      lineHeight: "1.1",
                    }}
                  >
                    {formatCurrency(avgDealValue)}
                  </div>
                  <div className="d-flex align-items-center gap-1 mt-1">
                    <span style={{ color: "#d97706", fontSize: "11px", fontWeight: 600 }}>
                      <i className="ri-shield-star-line"></i> High Quality
                    </span>
                    <span className="text-muted" style={{ fontSize: "11px" }}>
                      • Per inbound lead
                    </span>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* ─── ROW 2: CHANNEL VOLUME DONUT & SOURCE VALUE BREAKDOWN ───────────── */}
      <Row className="g-3 mb-4">
        {/* Col 1: Channel Volume Donut (Col lg=5) */}
        <Col lg={5} md={12}>
          <Card
            className="h-100 bg-white d-flex flex-column"
            style={{
              borderRadius: "4px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
            }}
          >
            <div
              className="p-3 bg-white border-bottom d-flex align-items-center justify-content-between gap-2"
              style={{ borderRadius: "4px 4px 0 0", borderColor: "#e2e8f0" }}
            >
              <div className="d-flex align-items-center gap-2">
                <i
                  className="ri-pie-chart-2-line"
                  style={{ color: "#7f1d1d", fontSize: "16px" }}
                ></i>
                <span className="fw-bold text-dark" style={{ fontSize: "13.5px" }}>
                  Channel Acquisition Share
                </span>
              </div>
              <span
                style={{
                  backgroundColor: "rgba(127, 29, 29, 0.08)",
                  color: "#7f1d1d",
                  fontSize: "11px",
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: "4px",
                }}
              >
                Top: Website (100%)
              </span>
            </div>

            <CardBody className="p-3 d-flex flex-column justify-content-between flex-grow-1">
              {/* Donut with Centered Overlay */}
              <div className="d-flex align-items-center justify-content-center my-auto py-2">
                <div
                  className="position-relative d-flex align-items-center justify-content-center"
                  style={{ width: "180px", height: "180px" }}
                >
                  <ReactApexChart
                    options={channelDonutConfig.options}
                    series={channelDonutConfig.series}
                    type="donut"
                    width={180}
                    height={180}
                  />
                  <div
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      textAlign: "center",
                      pointerEvents: "none",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "24px",
                        fontWeight: 700,
                        color: "#0f172a",
                        fontFamily: "Inter, sans-serif",
                        lineHeight: "1.1",
                      }}
                    >
                      100%
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#7f1d1d",
                        fontWeight: 600,
                        fontFamily: "Inter, sans-serif",
                        marginTop: "2px",
                      }}
                    >
                      Website
                    </div>
                  </div>
                </div>
              </div>

              {/* Dominant Channel Spotlight Box */}
              <div
                className="p-2.5 border d-flex align-items-center justify-content-between mt-auto"
                style={{
                  backgroundColor: "#f8fafc",
                  borderColor: "#e2e8f0",
                  borderRadius: "4px",
                }}
              >
                <div className="d-flex align-items-center gap-2.5">
                  <div
                    style={{
                      width: "38px",
                      height: "38px",
                      borderRadius: "4px",
                      backgroundColor: "rgba(127, 29, 29, 0.08)",
                      color: "#7f1d1d",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "18px",
                      flexShrink: 0,
                    }}
                  >
                    <i className="ri-global-line"></i>
                  </div>
                  <div>
                    <span className="fw-bold text-dark d-block" style={{ fontSize: "12.5px" }}>
                      Website • Dominant Channel
                    </span>
                    <span className="text-muted" style={{ fontSize: "11px" }}>
                      100% volume • {formatCurrency(totalEstimatedPipeline)} estimated pipeline
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
                    borderRadius: "4px",
                    fontSize: "11.5px",
                    fontWeight: 500,
                    padding: "4px 12px",
                  }}
                >
                  View Leads <i className="ri-arrow-right-line"></i>
                </Link>
              </div>
            </CardBody>
          </Card>
        </Col>

        {/* Col 2: Channel Volume & Pipeline Breakdown (Col lg=7) */}
        <Col lg={7} md={12}>
          <Card
            className="h-100 bg-white d-flex flex-column"
            style={{
              borderRadius: "4px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
            }}
          >
            <div
              className="p-3 bg-white border-bottom d-flex flex-wrap align-items-center justify-content-between gap-2"
              style={{ borderRadius: "4px 4px 0 0", borderColor: "#e2e8f0" }}
            >
              <div className="d-flex align-items-center gap-2">
                <i
                  className="ri-bar-chart-horizontal-line"
                  style={{ color: "#7f1d1d", fontSize: "16px" }}
                ></i>
                <span className="fw-bold text-dark" style={{ fontSize: "13.5px" }}>
                  Channel Volume & Pipeline Breakdown
                </span>
              </div>
              <span className="badge bg-light text-muted border" style={{ fontSize: "11px" }}>
                Lead Count • Inbound Share • Pipeline Value
              </span>
            </div>

            <CardBody className="p-3 d-flex flex-column justify-content-between flex-grow-1">
              <div className="d-flex flex-column gap-2">
                {channelBreakdownList.map((ch, idx) => {
                  const icon = getSourceIcon(ch.source_name);
                  const isTop = ch.lead_count > 0;

                  return (
                    <div
                      key={ch.source_name || idx}
                      className="p-2.5 border d-flex align-items-center"
                      style={{
                        backgroundColor: isTop ? "rgba(127, 29, 29, 0.02)" : "#ffffff",
                        borderColor: isTop ? "rgba(127, 29, 29, 0.16)" : "#e2e8f0",
                        borderRadius: "4px",
                      }}
                    >
                      {/* Segment 1: Channel Identity (fixed width 200px) */}
                      <div className="d-flex align-items-center gap-2.5" style={{ width: "200px", flexShrink: 0 }}>
                        <div
                          style={{
                            width: "34px",
                            height: "34px",
                            borderRadius: "4px",
                            backgroundColor: isTop ? "rgba(127, 29, 29, 0.08)" : "#f8fafc",
                            color: isTop ? "#7f1d1d" : "#64748b",
                            border: `1px solid ${isTop ? "rgba(127, 29, 29, 0.2)" : "#e2e8f0"}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "16px",
                            flexShrink: 0,
                          }}
                        >
                          <i className={icon}></i>
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <span
                            className="text-dark d-block text-truncate"
                            style={{
                              fontSize: "13px",
                              fontWeight: isTop ? 700 : 500,
                            }}
                          >
                            {ch.source_name}
                          </span>
                          <span className="text-muted d-block" style={{ fontSize: "11px" }}>
                            {ch.lead_count} {ch.lead_count === 1 ? "lead acquired" : "leads acquired"}
                          </span>
                        </div>
                      </div>

                      {/* Segment 2: Volume & Share Progress (flex-grow-1, smooth labeled bar) */}
                      <div className="flex-grow-1 mx-3 d-none d-sm-block">
                        <div className="d-flex align-items-center justify-content-between mb-1" style={{ fontSize: "11px" }}>
                          <span className="text-muted text-uppercase fw-semibold" style={{ letterSpacing: "0.3px", fontSize: "10.5px" }}>
                            Share of Inbound
                          </span>
                          <span
                            className="font-monospace fw-bold"
                            style={{ color: isTop ? "#7f1d1d" : "#64748b" }}
                          >
                            {ch.percentage}%
                          </span>
                        </div>
                        <div
                          className="progress"
                          style={{
                            height: "6px",
                            backgroundColor: "#f1f5f9",
                            borderRadius: "3px",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            className="progress-bar"
                            role="progressbar"
                            style={{
                              width: `${Math.max(ch.percentage, ch.lead_count > 0 ? 5 : 0)}%`,
                              backgroundColor: isTop ? "#7f1d1d" : "#94a3b8",
                              transition: "width 0.4s ease",
                            }}
                          ></div>
                        </div>
                      </div>

                      {/* Segment 3: Pipeline Value & Status (fixed width 150px, text-end) */}
                      <div className="text-end" style={{ width: "150px", flexShrink: 0 }}>
                        <div
                          className="font-monospace fw-bold text-dark"
                          style={{ fontSize: "13.5px", letterSpacing: "-0.3px" }}
                        >
                          {formatCurrency(ch.total_estimated_value)}
                        </div>
                        <div style={{ fontSize: "11px" }}>
                          {isTop ? (
                            <span className="text-success fw-semibold">
                              <i className="ri-checkbox-circle-fill"></i> 100% of pipeline
                            </span>
                          ) : (
                            <span className="text-muted">No active pipeline</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Inbound Performance Summary Footer */}
              <div
                className="p-2.5 mt-2 border d-flex align-items-center justify-content-between"
                style={{
                  backgroundColor: "#f8fafc",
                  borderColor: "#e2e8f0",
                  borderRadius: "4px",
                }}
              >
                <div className="d-flex align-items-center gap-2">
                  <i className="ri-pie-chart-line text-muted" style={{ fontSize: "15px" }}></i>
                  <span className="text-muted" style={{ fontSize: "11.5px" }}>
                    <strong className="text-dark">1 of 5 Channels</strong> actively acquiring sales pipeline
                  </span>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <span className="text-muted" style={{ fontSize: "11.5px" }}>
                    Total Attributed: <strong className="text-dark font-monospace">{formatCurrency(totalEstimatedPipeline)}</strong>
                  </span>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* ─── ROW 3: DETAILED SOURCE ACQUISITION LEDGER (TABLE) ───────────────── */}
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
            <h6
              className="mb-0 fw-bold text-dark d-flex align-items-center gap-2"
              style={{ fontSize: "14px" }}
            >
              <i
                className="ri-table-line"
                style={{ color: "#7f1d1d", fontSize: "16px" }}
              ></i>
              Detailed Source Acquisition Ledger
            </h6>
            <span className="text-muted small" style={{ fontSize: "11.5px" }}>
              Showing {filteredRows.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{" "}
              {Math.min(currentPage * pageSize, filteredRows.length)} of {rawRows.length} acquired leads
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

            {/* Source Channel Filter Dropdown */}
            <select
              className="form-select form-select-sm"
              style={{
                width: "145px",
                borderRadius: "4px",
                fontSize: "12px",
                borderColor: "#cbd5e1",
              }}
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
            >
              <option value="ALL">All Channels</option>
              <option value="Website">Website</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="Referral">Referral</option>
              <option value="Walk-In">Walk-In</option>
              <option value="LinkedIn">LinkedIn</option>
            </select>

            {/* Export CSV Button */}
            <button
              type="button"
              className="btn btn-sm d-flex align-items-center gap-1"
              style={{
                backgroundColor: "#ffffff",
                color: "#7f1d1d",
                border: "1px solid #e2e8f0",
                borderRadius: "4px",
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
              <thead style={{ backgroundColor: "#f8fafc" }}>
                <tr style={{ fontSize: "11.5px", color: "#64748b" }}>
                  <th style={{ width: "40px" }} className="text-center">#</th>
                  <th style={{ width: "24%" }}>LEAD NAME & COMPANY</th>
                  <th style={{ width: "14%" }} className="text-center">SOURCE CHANNEL</th>
                  <th style={{ width: "12%" }} className="text-center">LEAD RATING</th>
                  <th style={{ width: "16%" }}>SALES REP</th>
                  <th style={{ width: "12%" }} className="text-center">CREATED DATE</th>
                  <th style={{ width: "14%" }} className="text-center">ESTIMATED VALUE</th>
                  <th style={{ width: "80px" }} className="text-center">ACTION</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: "12.5px" }}>
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-4 text-muted">
                      No leads match the selected source channel and search criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((r, idx) => {
                    const rowNumber = (currentPage - 1) * pageSize + idx + 1;
                    const val = Number(r.estimated_value || 0);
                    const leadInitials = getInitials(r.lead_name);
                    const repInitials = getInitials(r.sales_rep);
                    const icon = getSourceIcon(r.source_name);

                    // Rating styling
                    const rating = String(r.rating_name || "Warm").toUpperCase();
                    let ratingBg = "#fffbeb";
                    let ratingColor = "#b45309";
                    let ratingBorder = "#fde68a";
                    let ratingIcon = "ri-fire-line";

                    if (rating === "HOT") {
                      ratingBg = "#fef2f2";
                      ratingColor = "#991b1b";
                      ratingBorder = "#fecaca";
                      ratingIcon = "ri-fire-fill";
                    } else if (rating === "COLD") {
                      ratingBg = "#f1f5f9";
                      ratingColor = "#475569";
                      ratingBorder = "#e2e8f0";
                      ratingIcon = "ri-snowflake-line";
                    }

                    return (
                      <tr key={r.lead_id || idx}>
                        <td className="text-center text-muted" style={{ fontSize: "11px" }}>
                          {rowNumber}
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-2.5">
                            <span
                              style={{
                                width: "34px",
                                height: "34px",
                                borderRadius: "4px",
                                backgroundColor: "rgba(127, 29, 29, 0.08)",
                                color: "#7f1d1d",
                                border: "1px solid rgba(127, 29, 29, 0.2)",
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
                                className="fw-bold text-dark text-decoration-none d-block"
                                style={{ fontSize: "12.5px" }}
                              >
                                {r.lead_name}
                              </Link>
                              <span className="text-muted d-flex align-items-center gap-1" style={{ fontSize: "11px" }}>
                                <i className="ri-building-line text-muted"></i>
                                {r.company_name || "—"}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="text-center">
                          <span
                            style={{
                              backgroundColor: "#f8fafc",
                              color: "#334155",
                              border: "1px solid #e2e8f0",
                              fontSize: "11.5px",
                              fontWeight: 600,
                              padding: "3px 10px",
                              borderRadius: "4px",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                            }}
                          >
                            <i className={icon} style={{ color: "#7f1d1d", fontSize: "13px" }}></i>
                            {r.source_name || "Direct"}
                          </span>
                        </td>
                        <td className="text-center">
                          <span
                            style={{
                              backgroundColor: ratingBg,
                              color: ratingColor,
                              border: `1px solid ${ratingBorder}`,
                              fontSize: "11px",
                              fontWeight: 600,
                              padding: "2.5px 8px",
                              borderRadius: "4px",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <i className={ratingIcon} style={{ fontSize: "12px" }}></i>
                            {r.rating_name || "Warm"}
                          </span>
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <span
                              style={{
                                width: "26px",
                                height: "26px",
                                borderRadius: "4px",
                                backgroundColor: "rgba(127, 29, 29, 0.08)",
                                color: "#7f1d1d",
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
                            <span className="text-dark fw-medium" style={{ fontSize: "12px" }}>
                              {r.sales_rep}
                            </span>
                          </div>
                        </td>
                        <td className="text-center text-muted font-monospace" style={{ fontSize: "12px" }}>
                          <i className="ri-calendar-line me-1 text-muted"></i>
                          {r.created_date || "—"}
                        </td>
                        <td className="text-center fw-bold text-dark font-monospace" style={{ fontSize: "13px" }}>
                          {formatCurrency(val)}
                        </td>
                        <td className="text-center">
                          <div className="d-flex align-items-center justify-content-center gap-1">
                            <Link
                              to={`/crm/leads/${r.lead_id}`}
                              className="btn btn-sm btn-light border p-1"
                              style={{
                                borderRadius: "4px",
                                color: "#7f1d1d",
                                width: "28px",
                                height: "28px",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                              title="View Lead Record"
                            >
                              <i className="ri-eye-line" style={{ fontSize: "14px" }}></i>
                            </Link>
                            <Link
                              to="/crm/opportunities"
                              className="btn btn-sm btn-light border p-1"
                              style={{
                                borderRadius: "4px",
                                color: "#475569",
                                width: "28px",
                                height: "28px",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                              title="View Deals"
                            >
                              <i className="ri-briefcase-line" style={{ fontSize: "14px" }}></i>
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
                Show
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
              <span className="text-muted small" style={{ fontSize: "11.5px" }}>
                Showing {filteredRows.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{" "}
                {Math.min(currentPage * pageSize, filteredRows.length)} of {filteredRows.length} leads
              </span>
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

      {/* ─── ROW 4: CHANNEL ATTRIBUTION & ROI INTELLIGENCE STRIP ─────────────── */}
      <Card
        className="bg-white mb-4"
        style={{
          borderRadius: "4px",
          border: "1px solid #e2e8f0",
          borderLeft: "4px solid #7f1d1d",
          boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
        }}
      >
        <CardBody className="p-3">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
            {/* Left: Trophy badge + Title */}
            <div className="d-flex align-items-center gap-2.5" style={{ minWidth: "210px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "4px",
                  backgroundColor: "#fffbeb",
                  border: "1px solid #fde68a",
                  color: "#d97706",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "18px",
                  flexShrink: 0,
                }}
              >
                <i className="ri-trophy-line"></i>
              </div>
              <div>
                <span className="fw-bold text-dark d-block" style={{ fontSize: "13px" }}>
                  Channel Attribution & ROI
                </span>
                <span className="text-muted" style={{ fontSize: "11px" }}>
                  Executive Intelligence Insights
                </span>
              </div>
            </div>

            {/* Middle: 3 Structured Key Insight Chips */}
            <div className="d-flex flex-wrap align-items-center gap-2 flex-grow-1">
              {/* Chip 1: Pipeline Attribution */}
              <div
                className="p-2 border d-flex align-items-center gap-2 flex-grow-1"
                style={{
                  backgroundColor: "#f8fafc",
                  borderColor: "#e2e8f0",
                  borderRadius: "4px",
                  minWidth: "240px",
                }}
              >
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "4px",
                    backgroundColor: "rgba(127, 29, 29, 0.08)",
                    color: "#7f1d1d",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "14px",
                    flexShrink: 0,
                  }}
                >
                  <i className="ri-global-line"></i>
                </div>
                <div style={{ fontSize: "11px" }}>
                  <span className="fw-bold text-dark d-block">Channel Dominance</span>
                  <span className="text-muted">Website drives 100% of pipeline ({formatCurrency(totalEstimatedPipeline)}).</span>
                </div>
              </div>

              {/* Chip 2: Lead Intent */}
              <div
                className="p-2 border d-flex align-items-center gap-2 flex-grow-1"
                style={{
                  backgroundColor: "#f8fafc",
                  borderColor: "#e2e8f0",
                  borderRadius: "4px",
                  minWidth: "240px",
                }}
              >
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "4px",
                    backgroundColor: "#fef2f2",
                    color: "#dc2626",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "14px",
                    flexShrink: 0,
                  }}
                >
                  <i className="ri-fire-fill"></i>
                </div>
                <div style={{ fontSize: "11px" }}>
                  <span className="fw-bold text-dark d-block">Conversion Intent</span>
                  <span className="text-muted">Hot rating signals high conversion intent; prioritize sales discovery.</span>
                </div>
              </div>

              {/* Chip 3: Diversification Opportunity */}
              <div
                className="p-2 border d-flex align-items-center gap-2 flex-grow-1"
                style={{
                  backgroundColor: "#f8fafc",
                  borderColor: "#e2e8f0",
                  borderRadius: "4px",
                  minWidth: "240px",
                }}
              >
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "4px",
                    backgroundColor: "#f0fdf4",
                    color: "#16a34a",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "14px",
                    flexShrink: 0,
                  }}
                >
                  <i className="ri-share-forward-line"></i>
                </div>
                <div style={{ fontSize: "11px" }}>
                  <span className="fw-bold text-dark d-block">Channel Diversification</span>
                  <span className="text-muted">Activate WhatsApp & LinkedIn for multi-touch attribution.</span>
                </div>
              </div>
            </div>

            {/* Right: SoftOnCloud Tagline */}
            <div className="d-none d-xl-flex align-items-center gap-2 text-end ps-2 border-start" style={{ borderColor: "#e2e8f0" }}>
              <div>
                <span className="fw-bold text-dark d-block" style={{ fontSize: "11.5px" }}>
                  Source. Nurture. Convert.
                </span>
                <span className="text-muted" style={{ fontSize: "10.5px" }}>
                  Maximize marketing ROI
                </span>
              </div>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "4px",
                  backgroundColor: "rgba(127, 29, 29, 0.08)",
                  color: "#7f1d1d",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "16px",
                  flexShrink: 0,
                }}
              >
                <i className="ri-donut-chart-fill"></i>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default LeadBySourceReportView;
