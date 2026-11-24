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

  // Channel List for right card (strictly real tenant data)
  const channelBreakdownList = useMemo(() => {
    const colors = ["#7f1d1d", "#2563eb", "#16a34a", "#d97706", "#7c3aed"];
    const list = chartData.length > 0 ? chartData : [];
    const totalCount = list.reduce((acc, c) => acc + Number(c.lead_count || 0), 0);
    const totalVal = list.reduce((acc, c) => acc + Number(c.total_estimated_value || 0), 0);

    return [...list]
      .sort((a, b) => Number(b.lead_count || 0) - Number(a.lead_count || 0))
      .map((c, i) => {
        const cnt = Number(c.lead_count || 0);
        const val = Number(c.total_estimated_value || 0);
        const pct = totalCount > 0 ? Math.round((cnt / totalCount) * 100) : 0;
        const valPct = totalVal > 0 ? Math.round((val / totalVal) * 100) : 0;
        return {
          ...c,
          lead_count: cnt,
          total_estimated_value: val,
          percentage: pct,
          valueSharePct: valPct,
          color: colors[i % colors.length],
        };
      });
  }, [chartData]);

  const topChannel = channelBreakdownList[0] || null;
  const activeChannelsCount = channelBreakdownList.filter((c) => c.lead_count > 0).length;

  // 1. Channel Share Donut Chart
  const channelDonutConfig = useMemo(() => {
    const labels = channelBreakdownList.map((d) => d.source_name || "Other");
    const series = channelBreakdownList.map((d) => Number(d.lead_count || 0));
    const hasData = series.some((v) => v > 0);

    return {
      hasData,
      series: hasData ? series : [1],
      options: {
        chart: {
          type: "donut",
          height: 180,
          sparkline: { enabled: true },
        },
        labels: hasData ? labels : ["No Data"],
        colors: hasData
          ? ["#7f1d1d", "#2563eb", "#16a34a", "#d97706", "#7c3aed"]
          : [isDark ? "#21262d" : "#e2e8f0"],
        stroke: { width: 2, colors: [isDark ? cardBg : "#ffffff"] },
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
          enabled: hasData,
          theme: isDark ? "dark" : "light",
          y: {
            formatter: (val) => `${val} leads`,
          },
        },
      },
    };
  }, [channelBreakdownList, isDark, cardBg]);

  return (
    <div className="lead-by-source-report-view">
      {/* ─── ROW 1: EXECUTIVE CHANNEL ACQUISITION KPI CARDS (4 CARDS) ───────── */}
      <Row className="g-3 mb-4">
        {/* Card 1: Total Estimated Pipeline */}
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
                  TOTAL ESTIMATED PIPELINE
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
                  <i className="ri-funds-line"></i>
                </div>
              </div>
              <div
                className="fw-bold font-monospace"
                style={{ fontSize: "24px", lineHeight: "1.1", margin: "6px 0", color: textTitle }}
              >
                {formatCurrency(totalEstimatedPipeline)}
              </div>
              <div className="d-flex align-items-center gap-1.5 mt-2" style={{ fontSize: "11.5px" }}>
                <span style={{ color: "#16a34a", fontWeight: 600 }}>● Active Pipeline</span>
                <span style={{ color: textSub }}>• Acquisition value</span>
              </div>
            </CardBody>
          </Card>
        </Col>

        {/* Card 2: Total Leads Generated */}
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
                  TOTAL LEADS GENERATED
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
                  <i className="ri-user-shared-line"></i>
                </div>
              </div>
              <div
                className="fw-bold font-monospace"
                style={{ fontSize: "24px", lineHeight: "1.1", margin: "6px 0", color: textTitle }}
              >
                {totalLeads} Lead{totalLeads === 1 ? "" : "s"}
              </div>
              <div className="d-flex align-items-center gap-1.5 mt-2" style={{ fontSize: "11.5px" }}>
                <span style={{ color: isDark ? "#60a5fa" : "#2563eb", fontWeight: 600 }}>
                  100% Attributed
                </span>
                <span style={{ color: textSub }}>• Source tracked</span>
              </div>
            </CardBody>
          </Card>
        </Col>

        {/* Card 3: Primary Lead Channel */}
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
                  PRIMARY LEAD CHANNEL
                </span>
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: 0,
                    backgroundColor: isDark ? "rgba(16, 185, 129, 0.2)" : "#f0fdf4",
                    color: isDark ? "#34d399" : "#16a34a",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "14px",
                  }}
                >
                  <i className="ri-global-line"></i>
                </div>
              </div>
              <div
                className="fw-bold"
                style={{ fontSize: "22px", lineHeight: "1.1", margin: "6px 0", color: textTitle }}
              >
                {topChannel && topChannel.lead_count > 0
                  ? `${topChannel.source_name} (${topChannel.percentage}%)`
                  : "None"}
              </div>
              <div className="d-flex align-items-center gap-1.5 mt-2" style={{ fontSize: "11.5px" }}>
                <span style={{ color: "#16a34a", fontWeight: 600 }}>★ Top Channel</span>
                <span style={{ color: textSub }}>• Digital inbound</span>
              </div>
            </CardBody>
          </Card>
        </Col>

        {/* Card 4: Avg Value per Lead */}
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
                  AVG VALUE PER LEAD
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
                  <i className="ri-calculator-line"></i>
                </div>
              </div>
              <div
                className="fw-bold font-monospace"
                style={{ fontSize: "24px", lineHeight: "1.1", margin: "6px 0", color: textTitle }}
              >
                {formatCurrency(avgDealValue)}
              </div>
              <div className="d-flex align-items-center gap-1.5 mt-2" style={{ fontSize: "11.5px" }}>
                <span style={{ color: isDark ? "#fbbf24" : "#d97706", fontWeight: 600 }}>High Quality</span>
                <span style={{ color: textSub }}>• Per inbound lead</span>
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
                  className="ri-pie-chart-2-line"
                  style={{ color: isDark ? "#f87171" : "#7f1d1d", fontSize: "16px" }}
                ></i>
                <span className="fw-bold" style={{ fontSize: "13.5px", color: textTitle }}>
                  Channel Acquisition Share
                </span>
              </div>
              <span
                style={{
                  backgroundColor: isDark ? "rgba(127, 29, 29, 0.25)" : "rgba(127, 29, 29, 0.08)",
                  color: isDark ? "#f87171" : "#7f1d1d",
                  border: `1px solid ${isDark ? "rgba(127, 29, 29, 0.4)" : "rgba(127, 29, 29, 0.2)"}`,
                  fontSize: "11px",
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: 0,
                }}
              >
                {topChannel && topChannel.lead_count > 0
                  ? `Top: ${topChannel.source_name} (${topChannel.percentage}%)`
                  : "No active channels"}
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
                        color: textTitle,
                        fontFamily: "Inter, sans-serif",
                        lineHeight: "1.1",
                      }}
                    >
                      {topChannel && topChannel.lead_count > 0 ? `${topChannel.percentage}%` : "0%"}
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: isDark ? "#f87171" : "#7f1d1d",
                        fontWeight: 600,
                        fontFamily: "Inter, sans-serif",
                        marginTop: "2px",
                      }}
                    >
                      {topChannel && topChannel.lead_count > 0 ? topChannel.source_name : "No Data"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Dominant Channel Spotlight Box */}
              <div
                className="p-2.5 border d-flex align-items-center justify-content-between mt-auto"
                style={{
                  backgroundColor: subtleBg,
                  borderColor: cardBorder,
                  borderRadius: 0,
                }}
              >
                <div className="d-flex align-items-center gap-2.5">
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: 0,
                      backgroundColor: isDark ? "rgba(127, 29, 29, 0.25)" : "rgba(127, 29, 29, 0.08)",
                      color: isDark ? "#f87171" : "#7f1d1d",
                      border: `1px solid ${isDark ? "rgba(127, 29, 29, 0.4)" : "rgba(127, 29, 29, 0.2)"}`,
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
                    <span className="fw-bold d-block" style={{ fontSize: "12.5px", color: textTitle }}>
                      {topChannel && topChannel.lead_count > 0
                        ? `${topChannel.source_name} • Dominant Channel`
                        : "No Active Lead Channels"}
                    </span>
                    <span style={{ fontSize: "11px", color: textSub }}>
                      {topChannel && topChannel.lead_count > 0
                        ? `${topChannel.percentage}% volume • ${formatCurrency(topChannel.total_estimated_value)} estimated pipeline`
                        : "Add leads with source attribution to track channel performance"}
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

        {/* Col 2: Channel Volume & Pipeline Breakdown (Col lg=7) */}
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
                  className="ri-bar-chart-horizontal-line"
                  style={{ color: isDark ? "#f87171" : "#7f1d1d", fontSize: "16px" }}
                ></i>
                <span className="fw-bold" style={{ fontSize: "13.5px", color: textTitle }}>
                  Channel Volume & Pipeline Breakdown
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
                        backgroundColor: isTop
                          ? (isDark ? "rgba(127, 29, 29, 0.15)" : "rgba(127, 29, 29, 0.04)")
                          : (isDark ? "#12171f" : "#ffffff"),
                        borderColor: isTop
                          ? (isDark ? "rgba(239, 68, 68, 0.35)" : "rgba(127, 29, 29, 0.2)")
                          : cardBorder,
                        borderRadius: 0,
                      }}
                    >
                      {/* Segment 1: Channel Identity */}
                      <div className="d-flex align-items-center gap-2.5" style={{ width: "200px", flexShrink: 0 }}>
                        <div
                          style={{
                            width: "34px",
                            height: "34px",
                            borderRadius: 0,
                            backgroundColor: isTop
                              ? (isDark ? "rgba(127, 29, 29, 0.25)" : "rgba(127, 29, 29, 0.08)")
                              : subtleBg,
                            color: isTop
                              ? (isDark ? "#f87171" : "#7f1d1d")
                              : textSub,
                            border: `1px solid ${isTop ? (isDark ? "rgba(239, 68, 68, 0.4)" : "rgba(127, 29, 29, 0.2)") : cardBorder}`,
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
                            className="d-block text-truncate"
                            style={{
                              fontSize: "13px",
                              fontWeight: isTop ? 700 : 500,
                              color: textTitle,
                            }}
                          >
                            {ch.source_name}
                          </span>
                          <span className="d-block" style={{ fontSize: "11px", color: textSub }}>
                            {ch.lead_count} {ch.lead_count === 1 ? "lead acquired" : "leads acquired"}
                          </span>
                        </div>
                      </div>

                      {/* Segment 2: Volume & Share Progress */}
                      <div className="flex-grow-1 mx-3 d-none d-sm-block">
                        <div className="d-flex align-items-center justify-content-between mb-1" style={{ fontSize: "11px" }}>
                          <span className="text-uppercase fw-semibold" style={{ letterSpacing: "0.3px", fontSize: "10.5px", color: textSub }}>
                            Share of Inbound
                          </span>
                          <span
                            className="font-monospace fw-bold"
                            style={{ color: isTop ? (isDark ? "#f87171" : "#7f1d1d") : textSub }}
                          >
                            {ch.percentage}%
                          </span>
                        </div>
                        <div
                          style={{
                            height: "6px",
                            backgroundColor: isDark ? "#2d3748" : "#f1f5f9",
                            borderRadius: 0,
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${Math.max(ch.percentage, ch.lead_count > 0 ? 5 : 0)}%`,
                              height: "100%",
                              backgroundColor: isTop ? (isDark ? "#ef4444" : "#7f1d1d") : (isDark ? "#475569" : "#94a3b8"),
                              borderRadius: 0,
                              transition: "width 0.4s ease",
                            }}
                          ></div>
                        </div>
                      </div>

                      {/* Segment 3: Pipeline Value & Status */}
                      <div className="text-end" style={{ width: "150px", flexShrink: 0 }}>
                        <div
                          className="font-monospace fw-bold"
                          style={{ fontSize: "13.5px", letterSpacing: "-0.3px", color: textTitle }}
                        >
                          {formatCurrency(ch.total_estimated_value)}
                        </div>
                        <div style={{ fontSize: "11px" }}>
                          {isTop ? (
                            <span style={{ color: "#16a34a", fontWeight: 600 }}>
                              <i className="ri-checkbox-circle-fill"></i> {ch.valueSharePct}% of pipeline
                            </span>
                          ) : (
                            <span style={{ color: textSub }}>No active pipeline</span>
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
                  backgroundColor: subtleBg,
                  borderColor: cardBorder,
                  borderRadius: 0,
                }}
              >
                <div className="d-flex align-items-center gap-2">
                  <i className="ri-pie-chart-line" style={{ fontSize: "15px", color: textSub }}></i>
                  <span style={{ fontSize: "11.5px", color: textSub }}>
                    <strong style={{ color: textTitle }}>
                      {activeChannelsCount} of {channelBreakdownList.length} Channels
                    </strong>{" "}
                    actively acquiring sales pipeline
                  </span>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <span style={{ fontSize: "11.5px", color: textSub }}>
                    Total Attributed: <strong className="font-monospace" style={{ color: textTitle }}>{formatCurrency(totalEstimatedPipeline)}</strong>
                  </span>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* ─── ROW 3: DETAILED SOURCE ACQUISITION LEDGER (TABLE) ───────────────── */}
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
              Detailed Source Acquisition Ledger
            </h6>
            <span className="small" style={{ fontSize: "11.5px", color: textSub }}>
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

            {/* Source Channel Filter Dropdown */}
            <select
              className="form-select form-select-sm"
              style={{
                width: "145px",
                borderRadius: 0,
                fontSize: "12px",
                borderColor: cardBorder,
                backgroundColor: subtleBg,
                color: textTitle,
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
                    <td colSpan="8" className="text-center py-4" style={{ color: textSub }}>
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
                    let ratingBg = isDark ? "rgba(180, 83, 9, 0.2)" : "#fffbeb";
                    let ratingColor = isDark ? "#fbbf24" : "#b45309";
                    let ratingBorder = isDark ? "rgba(180, 83, 9, 0.3)" : "#fde68a";
                    let ratingIcon = "ri-fire-line";

                    if (rating === "HOT") {
                      ratingBg = isDark ? "rgba(153, 27, 27, 0.2)" : "#fef2f2";
                      ratingColor = isDark ? "#f87171" : "#991b1b";
                      ratingBorder = isDark ? "rgba(153, 27, 27, 0.4)" : "#fecaca";
                      ratingIcon = "ri-fire-fill";
                    } else if (rating === "COLD") {
                      ratingBg = isDark ? "#1e293b" : "#f1f5f9";
                      ratingColor = isDark ? "#94a3b8" : "#475569";
                      ratingBorder = isDark ? "#334155" : "#e2e8f0";
                      ratingIcon = "ri-snowflake-line";
                    }

                    return (
                      <tr key={r.lead_id || idx} style={{ borderBottom: `1px solid ${cardBorder}` }}>
                        <td className="text-center" style={{ fontSize: "11px", color: textSub }}>
                          {rowNumber}
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-2.5">
                            <span
                              style={{
                                width: "34px",
                                height: "34px",
                                borderRadius: 0,
                                backgroundColor: isDark ? "rgba(127, 29, 29, 0.25)" : "rgba(127, 29, 29, 0.08)",
                                color: isDark ? "#f87171" : "#7f1d1d",
                                border: `1px solid ${isDark ? "rgba(127, 29, 29, 0.4)" : "rgba(127, 29, 29, 0.2)"}`,
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
                                className="fw-bold text-decoration-none d-block"
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
                              backgroundColor: subtleBg,
                              color: textTitle,
                              border: `1px solid ${cardBorder}`,
                              fontSize: "11.5px",
                              fontWeight: 600,
                              padding: "3px 10px",
                              borderRadius: 0,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                            }}
                          >
                            <i className={icon} style={{ color: isDark ? "#f87171" : "#7f1d1d", fontSize: "13px" }}></i>
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
                              borderRadius: 0,
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
                            <span className="fw-medium" style={{ fontSize: "12px", color: textTitle }}>
                              {r.sales_rep}
                            </span>
                          </div>
                        </td>
                        <td className="text-center font-monospace" style={{ fontSize: "12px", color: textSub }}>
                          <i className="ri-calendar-line me-1" style={{ color: textSub }}></i>
                          {r.created_date || "—"}
                        </td>
                        <td className="text-center fw-bold font-monospace" style={{ fontSize: "13px", color: textTitle }}>
                          {formatCurrency(val)}
                        </td>
                        <td className="text-center">
                          <div className="d-flex align-items-center justify-content-center gap-1">
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
                              title="View Lead Record"
                            >
                              <i className="ri-eye-line" style={{ fontSize: "14px" }}></i>
                            </Link>
                            <Link
                              to="/crm/opportunities"
                              className="btn btn-sm border p-1"
                              style={{
                                borderRadius: 0,
                                backgroundColor: subtleBg,
                                borderColor: cardBorder,
                                color: textSub,
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
                {Math.min(currentPage * pageSize, filteredRows.length)} of {filteredRows.length} leads
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

      {/* ─── ROW 4: CHANNEL ATTRIBUTION & ROI INTELLIGENCE STRIP ─────────────── */}
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
            <div className="d-flex align-items-center gap-2.5" style={{ minWidth: "210px" }}>
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
                <i className="ri-trophy-line"></i>
              </div>
              <div>
                <span className="fw-bold d-block" style={{ fontSize: "13px", color: textTitle }}>
                  Channel Attribution & ROI
                </span>
                <span style={{ fontSize: "11px", color: textSub }}>
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
                  backgroundColor: subtleBg,
                  borderColor: cardBorder,
                  borderRadius: 0,
                  minWidth: "240px",
                }}
              >
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: 0,
                    backgroundColor: isDark ? "rgba(127, 29, 29, 0.25)" : "rgba(127, 29, 29, 0.08)",
                    color: isDark ? "#f87171" : "#7f1d1d",
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
                  <span className="fw-bold d-block" style={{ color: textTitle }}>Channel Dominance</span>
                  <span style={{ color: textSub }}>Website drives 100% of pipeline ({formatCurrency(totalEstimatedPipeline)}).</span>
                </div>
              </div>

              {/* Chip 2: Lead Intent */}
              <div
                className="p-2 border d-flex align-items-center gap-2 flex-grow-1"
                style={{
                  backgroundColor: subtleBg,
                  borderColor: cardBorder,
                  borderRadius: 0,
                  minWidth: "240px",
                }}
              >
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
                    flexShrink: 0,
                  }}
                >
                  <i className="ri-fire-fill"></i>
                </div>
                <div style={{ fontSize: "11px" }}>
                  <span className="fw-bold d-block" style={{ color: textTitle }}>Conversion Intent</span>
                  <span style={{ color: textSub }}>Hot rating signals high conversion intent; prioritize sales discovery.</span>
                </div>
              </div>

              {/* Chip 3: Diversification Opportunity */}
              <div
                className="p-2 border d-flex align-items-center gap-2 flex-grow-1"
                style={{
                  backgroundColor: subtleBg,
                  borderColor: cardBorder,
                  borderRadius: 0,
                  minWidth: "240px",
                }}
              >
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: 0,
                    backgroundColor: isDark ? "rgba(16, 185, 129, 0.2)" : "#f0fdf4",
                    color: isDark ? "#34d399" : "#16a34a",
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
                  <span className="fw-bold d-block" style={{ color: textTitle }}>Channel Diversification</span>
                  <span style={{ color: textSub }}>Activate WhatsApp & LinkedIn for multi-touch attribution.</span>
                </div>
              </div>
            </div>

            {/* Right: SoftOnCloud Tagline */}
            <div className="d-none d-xl-flex align-items-center gap-2 text-end ps-2 border-start" style={{ borderColor: cardBorder }}>
              <div>
                <span className="fw-bold d-block" style={{ fontSize: "11.5px", color: textTitle }}>
                  Source. Nurture. Convert.
                </span>
                <span style={{ fontSize: "10.5px", color: textSub }}>
                  Maximize marketing ROI
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
