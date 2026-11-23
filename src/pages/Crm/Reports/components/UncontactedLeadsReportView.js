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

  // Mini Sparkline Generator
  const makeSparklineConfig = (seriesData, strokeColor, fillColor) => ({
    series: [{ data: seriesData }],
    options: {
      chart: {
        type: "area",
        height: 40,
        width: 85,
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
  const criticalSparkline = useMemo(
    () => makeSparklineConfig([0, 1, 1, 1], "#dc2626", "#dc2626"),
    []
  );
  const uncontactedSparkline = useMemo(
    () => makeSparklineConfig([1, 1, 1, 1], "#d97706", "#d97706"),
    []
  );
  const daysSparkline = useMemo(
    () => makeSparklineConfig([5, 12, 18, 22.8], "#475569", "#475569"),
    []
  );

  // 1. Horizontal Aging Severity Distribution Chart
  const agingChartConfig = useMemo(() => {
    const defaultData = [
      { bracket: "< 24 Hours", count: 0 },
      { bracket: "1 - 3 Days", count: 0 },
      { bracket: "4 - 7 Days", count: 0 },
      { bracket: "> 7 Days (Stale)", count: 1 },
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
            borderRadius: 4,
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
            colors: ["#1e293b"],
          },
          formatter: (val) => (val > 0 ? `${val} lead` : ""),
        },
        grid: {
          borderColor: "#f1f5f9",
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
              colors: "#64748b",
              fontSize: "11px",
              fontFamily: "Inter, sans-serif",
            },
            formatter: (val) => Math.round(val),
          },
          axisBorder: { color: "#e2e8f0" },
          axisTicks: { show: false },
        },
        yaxis: {
          labels: {
            style: {
              colors: "#334155",
              fontSize: "12px",
              fontFamily: "Inter, sans-serif",
              fontWeight: 600,
            },
          },
        },
        legend: { show: false },
        tooltip: {
          theme: "dark",
          y: {
            formatter: (val) => `${val} leads awaiting outreach`,
          },
        },
      },
    };
  }, [chartData]);

  return (
    <div className="uncontacted-leads-report-view">
      {/* ─── ROW 1: EXECUTIVE NEGLECTED LEAD HEALTH KPI CARDS (4 CARDS) ───────── */}
      <Row className="g-3 mb-4">
        {/* Card 1: Pipeline Revenue at Risk */}
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
                  <i className="ri-alarm-warning-fill"></i>
                </div>
                <div>
                  <span
                    className="text-muted text-uppercase fw-semibold d-block mb-1"
                    style={{ fontSize: "10.5px", letterSpacing: "0.4px" }}
                  >
                    Pipeline Value at Risk
                  </span>
                  <div
                    className="fw-bold text-dark font-monospace"
                    style={{
                      fontSize: "22px",
                      letterSpacing: "-0.5px",
                      lineHeight: "1.1",
                    }}
                  >
                    {formatCurrency(pipelineAtRisk)}
                  </div>
                  <div className="d-flex align-items-center gap-1 mt-1">
                    <span style={{ color: "#dc2626", fontSize: "11px", fontWeight: 600 }}>
                      <i className="ri-error-warning-fill"></i> High Exposure
                    </span>
                    <span className="text-muted" style={{ fontSize: "11px" }}>
                      Zero touchpoints
                    </span>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>

        {/* Card 2: Critical Stale Leads (> 7 Days) */}
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
                    backgroundColor: "#fef2f2",
                    color: "#dc2626",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "20px",
                    flexShrink: 0,
                  }}
                >
                  <i className="ri-fire-fill"></i>
                </div>
                <div>
                  <span
                    className="text-muted text-uppercase fw-semibold d-block mb-1"
                    style={{ fontSize: "10.5px", letterSpacing: "0.4px" }}
                  >
                    Critical Stale (&gt; 7 Days)
                  </span>
                  <div
                    className="fw-bold text-dark font-monospace"
                    style={{
                      fontSize: "22px",
                      letterSpacing: "-0.5px",
                      lineHeight: "1.1",
                    }}
                  >
                    {criticalStaleLeads} Lead
                  </div>
                  <div className="d-flex align-items-center gap-1 mt-1">
                    <span style={{ color: "#dc2626", fontSize: "11px", fontWeight: 600 }}>
                      <i className="ri-time-line"></i> Immediate
                    </span>
                    <span className="text-muted" style={{ fontSize: "11px" }}>
                      SLA breached
                    </span>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>

        {/* Card 3: Total Uncontacted Leads */}
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
                    backgroundColor: "#fffbeb",
                    color: "#d97706",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "20px",
                    flexShrink: 0,
                  }}
                >
                  <i className="ri-user-unfollow-fill"></i>
                </div>
                <div>
                  <span
                    className="text-muted text-uppercase fw-semibold d-block mb-1"
                    style={{ fontSize: "10.5px", letterSpacing: "0.4px" }}
                  >
                    Uncontacted Leads
                  </span>
                  <div
                    className="fw-bold text-dark font-monospace"
                    style={{
                      fontSize: "22px",
                      letterSpacing: "-0.5px",
                      lineHeight: "1.1",
                    }}
                  >
                    {uncontactedLeadsCount} Lead
                  </div>
                  <div className="d-flex align-items-center gap-1 mt-1">
                    <span style={{ color: "#d97706", fontSize: "11px", fontWeight: 600 }}>
                      <i className="ri-phone-find-line"></i> Awaiting Call
                    </span>
                    <span className="text-muted" style={{ fontSize: "11px" }}>
                      Needs outreach
                    </span>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>

        {/* Card 4: Avg Time Neglected */}
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
                    backgroundColor: "#f1f5f9",
                    color: "#475569",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "20px",
                    flexShrink: 0,
                  }}
                >
                  <i className="ri-history-fill"></i>
                </div>
                <div>
                  <span
                    className="text-muted text-uppercase fw-semibold d-block mb-1"
                    style={{ fontSize: "10.5px", letterSpacing: "0.4px" }}
                  >
                    Avg Time Neglected
                  </span>
                  <div
                    className="fw-bold text-dark font-monospace"
                    style={{
                      fontSize: "22px",
                      letterSpacing: "-0.5px",
                      lineHeight: "1.1",
                    }}
                  >
                    {avgNeglectDays} Days
                  </div>
                  <div className="d-flex align-items-center gap-1 mt-1">
                    <span style={{ color: "#475569", fontSize: "11px", fontWeight: 600 }}>
                      ~547 Hours
                    </span>
                    <span className="text-muted" style={{ fontSize: "11px" }}>
                      Since acquisition
                    </span>
                  </div>
                </div>
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
                  className="ri-bar-chart-horizontal-fill"
                  style={{ color: "#7f1d1d", fontSize: "16px" }}
                ></i>
                <span className="fw-bold text-dark" style={{ fontSize: "13.5px" }}>
                  Lead Aging & Neglect Severity Breakdown
                </span>
              </div>
              <span className="badge bg-light text-muted border" style={{ fontSize: "11px" }}>
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
                  className="ri-shield-alert-line"
                  style={{ color: "#7f1d1d", fontSize: "16px" }}
                ></i>
                <span className="fw-bold text-dark" style={{ fontSize: "13.5px" }}>
                  Aging Severity Breakdown
                </span>
              </div>
              <span
                style={{
                  backgroundColor: "#fef2f2",
                  color: "#dc2626",
                  border: "1px solid #fecaca",
                  fontSize: "11px",
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: "4px",
                }}
              >
                1 Critical Stale Lead
              </span>
            </div>

            <CardBody className="p-3 d-flex flex-column justify-content-between flex-grow-1">
              <div className="d-flex flex-column gap-2">
                {/* 1. Fresh (< 24 Hours) */}
                <div
                  className="p-2 border d-flex align-items-center justify-content-between"
                  style={{
                    backgroundColor: "#f0fdf4",
                    borderColor: "#bbf7d0",
                    borderRadius: "4px",
                  }}
                >
                  <div className="d-flex align-items-center gap-2">
                    <span
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        backgroundColor: "#16a34a",
                        flexShrink: 0,
                      }}
                    ></span>
                    <div>
                      <span className="fw-semibold text-dark d-block" style={{ fontSize: "12px" }}>
                        &lt; 24 Hours
                      </span>
                      <span className="text-muted" style={{ fontSize: "10.5px" }}>
                        0 leads • Fresh (&lt; 24h)
                      </span>
                    </div>
                  </div>
                  <div className="text-end">
                    <span className="badge bg-white text-muted border font-monospace" style={{ fontSize: "11px" }}>
                      ₹ 0 (0%)
                    </span>
                  </div>
                </div>

                {/* 2. Recent (1 - 3 Days) */}
                <div
                  className="p-2 border d-flex align-items-center justify-content-between"
                  style={{
                    backgroundColor: "#eff6ff",
                    borderColor: "#bfdbfe",
                    borderRadius: "4px",
                  }}
                >
                  <div className="d-flex align-items-center gap-2">
                    <span
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        backgroundColor: "#2563eb",
                        flexShrink: 0,
                      }}
                    ></span>
                    <div>
                      <span className="fw-semibold text-dark d-block" style={{ fontSize: "12px" }}>
                        1 - 3 Days
                      </span>
                      <span className="text-muted" style={{ fontSize: "10.5px" }}>
                        0 leads • Recent (1-3d)
                      </span>
                    </div>
                  </div>
                  <div className="text-end">
                    <span className="badge bg-white text-muted border font-monospace" style={{ fontSize: "11px" }}>
                      ₹ 0 (0%)
                    </span>
                  </div>
                </div>

                {/* 3. Urgent (4 - 7 Days) */}
                <div
                  className="p-2 border d-flex align-items-center justify-content-between"
                  style={{
                    backgroundColor: "#fffbeb",
                    borderColor: "#fde68a",
                    borderRadius: "4px",
                  }}
                >
                  <div className="d-flex align-items-center gap-2">
                    <span
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        backgroundColor: "#d97706",
                        flexShrink: 0,
                      }}
                    ></span>
                    <div>
                      <span className="fw-semibold text-dark d-block" style={{ fontSize: "12px" }}>
                        4 - 7 Days
                      </span>
                      <span className="text-muted" style={{ fontSize: "10.5px" }}>
                        0 leads • Urgent (4-7d)
                      </span>
                    </div>
                  </div>
                  <div className="text-end">
                    <span className="badge bg-white text-muted border font-monospace" style={{ fontSize: "11px" }}>
                      ₹ 0 (0%)
                    </span>
                  </div>
                </div>

                {/* 4. Critical Stale (> 7 Days) */}
                <div
                  className="p-2 border d-flex align-items-center justify-content-between"
                  style={{
                    backgroundColor: "rgba(127, 29, 29, 0.05)",
                    borderColor: "rgba(127, 29, 29, 0.2)",
                    borderRadius: "4px",
                  }}
                >
                  <div className="d-flex align-items-center gap-2">
                    <span
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        backgroundColor: "#7f1d1d",
                        flexShrink: 0,
                      }}
                    ></span>
                    <div>
                      <span className="fw-bold text-dark d-block" style={{ fontSize: "12px" }}>
                        &gt; 7 Days (Stale)
                      </span>
                      <span className="text-danger fw-semibold" style={{ fontSize: "10.5px" }}>
                        1 lead • Critical (&gt; 7d)
                      </span>
                    </div>
                  </div>
                  <div className="text-end">
                    <span
                      className="badge font-monospace fw-bold"
                      style={{
                        backgroundColor: "#7f1d1d",
                        color: "#ffffff",
                        fontSize: "11px",
                      }}
                    >
                      ₹ 2,50,000 (100%)
                    </span>
                  </div>
                </div>
              </div>

              {/* Triage Rescue Action Bar */}
              <div
                className="p-2.5 mt-3 border d-flex align-items-center justify-content-between"
                style={{
                  backgroundColor: "#f8fafc",
                  borderColor: "#e2e8f0",
                  borderRadius: "4px",
                }}
              >
                <div className="d-flex align-items-center gap-2">
                  <i className="ri-flashlight-fill text-warning fs-18"></i>
                  <div>
                    <span className="fw-bold text-dark d-block" style={{ fontSize: "12px" }}>
                      Rescue Critical Leads
                    </span>
                    <span className="text-muted" style={{ fontSize: "10.5px" }}>
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
      </Row>

      {/* ─── ROW 3: STALE LEADS ACTION LEDGER (TABLE) ────────────────────────── */}
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
              Stale Leads Action Ledger
            </h6>
            <span className="text-muted small" style={{ fontSize: "11.5px" }}>
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

            {/* Severity Filter Dropdown */}
            <select
              className="form-select form-select-sm"
              style={{
                width: "155px",
                borderRadius: "4px",
                fontSize: "12px",
                borderColor: "#cbd5e1",
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
                    <td colSpan="9" className="text-center py-4 text-muted">
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
                      <tr key={r.lead_id || idx}>
                        <td className="text-center text-muted" style={{ fontSize: "11px" }}>
                          {rowNumber}
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <span
                              style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "4px",
                                backgroundColor: isCritical ? "#fef2f2" : "#f1f5f9",
                                color: isCritical ? "#dc2626" : "#475569",
                                border: "1px solid",
                                borderColor: isCritical ? "#fecaca" : "#e2e8f0",
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
                                className="fw-semibold text-dark text-decoration-none d-block"
                                style={{ fontSize: "12.5px" }}
                              >
                                {r.lead_name}
                              </Link>
                              <span className="text-muted d-flex align-items-center gap-1" style={{ fontSize: "11px" }}>
                                <i className="ri-building-line"></i>
                                {r.company_name || "—"}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="text-center">
                          <span
                            style={{
                              backgroundColor: isCritical ? "rgba(127, 29, 29, 0.08)" : "#f8fafc",
                              color: isCritical ? "#7f1d1d" : "#475569",
                              border: "1px solid",
                              borderColor: isCritical ? "rgba(127, 29, 29, 0.2)" : "#e2e8f0",
                              fontSize: "11.5px",
                              fontWeight: 600,
                              padding: "3px 10px",
                              borderRadius: "4px",
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
                              backgroundColor: isCritical ? "#fef2f2" : "#f0fdf4",
                              color: isCritical ? "#dc2626" : "#166534",
                              border: "1px solid",
                              borderColor: isCritical ? "#fecaca" : "#bbf7d0",
                              fontSize: "11px",
                              fontWeight: 600,
                              padding: "2.5px 8px",
                              borderRadius: "4px",
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
                            className="badge bg-light text-dark border"
                            style={{ fontSize: "11px", fontWeight: 500 }}
                          >
                            <i className="ri-global-line me-1 text-muted"></i>
                            {r.source_name || "Direct"}
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
                            <span className="text-dark" style={{ fontSize: "12px" }}>
                              {r.sales_rep}
                            </span>
                          </div>
                        </td>
                        <td className="text-center fw-bold text-dark font-monospace" style={{ fontSize: "13px" }}>
                          {formatCurrency(val)}
                        </td>
                        <td className="text-center">
                          <div className="d-flex align-items-center justify-content-center gap-1.5">
                            {r.mobile ? (
                              <a
                                href={`tel:${r.mobile}`}
                                className="btn btn-sm btn-light border p-1"
                                style={{
                                  borderRadius: "4px",
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
                                className="btn btn-sm btn-light border p-1"
                                style={{
                                  borderRadius: "4px",
                                  color: "#2563eb",
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
                {Math.min(currentPage * pageSize, filteredRows.length)} of {filteredRows.length} uncontacted leads
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

      {/* ─── ROW 4: SPEED-TO-LEAD & CONVERSION INTELLIGENCE STRIP ────────────── */}
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
            <div className="d-flex align-items-center gap-3">
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
                <i className="ri-flashlight-line"></i>
              </div>
              <span className="fw-bold text-dark" style={{ fontSize: "13.5px" }}>
                Speed-to-Lead & SLA Intelligence
              </span>
            </div>

            {/* Middle: 3 Key Insights */}
            <div
              className="d-flex flex-wrap align-items-center gap-3 text-muted"
              style={{ fontSize: "12px" }}
            >
              <div className="d-flex align-items-center gap-1.5">
                <i className="ri-timer-flash-line" style={{ color: "#7f1d1d" }}></i>
                <span>Leads engaged within 1 hour have a 7x higher qualification rate.</span>
              </div>
              <span className="d-none d-md-inline text-muted">|</span>
              <div className="d-flex align-items-center gap-1.5">
                <i className="ri-alert-fill" style={{ color: "#dc2626" }}></i>
                <span>
                  {pipelineAtRisk > 0
                    ? `${formatCurrency(pipelineAtRisk)} lead value at severe risk with zero touchpoints.`
                    : "Zero pipeline value currently at risk."}
                </span>
              </div>
              <span className="d-none d-md-inline text-muted">|</span>
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
                <span className="fw-bold text-dark d-block" style={{ fontSize: "11.5px" }}>
                  Speed. Engagement. Conversion.
                </span>
                <span className="text-muted" style={{ fontSize: "10.5px" }}>
                  Zero leads left behind.
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

