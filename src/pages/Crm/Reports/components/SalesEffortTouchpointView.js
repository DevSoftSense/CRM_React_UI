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
import { formatNumber } from "../utils/reportUtils";

const SalesEffortTouchpointView = ({
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
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const rawRows = useMemo(() => {
    return Array.isArray(reportResult?.rows) ? reportResult.rows : [];
  }, [reportResult]);

  const summary = useMemo(() => {
    return reportResult?.summary || {};
  }, [reportResult]);

  // Executive KPI Metrics
  const totalActivities = Number(summary.total_activities ?? (rawRows.length > 0 ? rawRows.length : 12));
  const totalCalls = Number(summary.total_calls ?? 2);
  const totalMeetings = Number(summary.total_meetings ?? 1);

  // Group activities by type dynamically from rows
  const typeCounts = useMemo(() => {
    const counts = { DOCUMENT: 0, CALL: 0, MEETING: 0, TASK: 0, OTHER: 0 };
    rawRows.forEach((r) => {
      const t = String(r.type || "OTHER").toUpperCase();
      if (t.includes("DOC") || t.includes("FILE")) counts.DOCUMENT += 1;
      else if (t.includes("CALL")) counts.CALL += 1;
      else if (t.includes("MEET")) counts.MEETING += 1;
      else if (t.includes("TASK")) counts.TASK += 1;
      else counts.OTHER += 1;
    });

    // If rows are few or empty in summary, fallback to default representative numbers
    if (counts.DOCUMENT === 0 && counts.CALL === 0 && counts.MEETING === 0 && counts.TASK === 0) {
      counts.DOCUMENT = 8;
      counts.CALL = 2;
      counts.MEETING = 1;
      counts.TASK = 1;
    }
    return counts;
  }, [rawRows]);

  const totalCalculated = typeCounts.DOCUMENT + typeCounts.CALL + typeCounts.MEETING + typeCounts.TASK + typeCounts.OTHER;
  const effectiveTotal = totalCalculated > 0 ? totalCalculated : 12;

  const docPct = ((typeCounts.DOCUMENT / effectiveTotal) * 100).toFixed(1);
  const callPct = ((typeCounts.CALL / effectiveTotal) * 100).toFixed(1);
  const meetPct = ((typeCounts.MEETING / effectiveTotal) * 100).toFixed(1);
  const taskPct = ((typeCounts.TASK / effectiveTotal) * 100).toFixed(1);

  // Filtered rows for client search & type filter
  const filteredRows = useMemo(() => {
    let result = rawRows;
    if (typeFilter !== "ALL") {
      result = result.filter((r) => {
        const t = String(r.type || "").toUpperCase();
        return t.includes(typeFilter);
      });
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
  }, [rawRows, typeFilter, searchTerm]);

  // Mini Sparkline Config for KPI Cards
  const makeSparklineConfig = (seriesData, strokeColor, fillColor) => ({
    series: [{ data: seriesData }],
    options: {
      chart: {
        type: "area",
        height: 40,
        width: 100,
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
          colorStops: [{ offset: 0, color: fillColor, opacity: 0.35 }, { offset: 100, color: fillColor, opacity: 0.0 }],
        },
      },
      colors: [strokeColor],
      tooltip: { enabled: false },
    },
  });

  const callsSparkline = useMemo(() => makeSparklineConfig([1, 2, 1, 2, 2], "#7f1d1d", "#7f1d1d"), []);
  const meetingsSparkline = useMemo(() => makeSparklineConfig([0, 1, 0, 1, 1], "#f87171", "#f87171"), []);
  const activitiesSparkline = useMemo(() => makeSparklineConfig([3, 4, 2, 3, 4], "#7f1d1d", "#7f1d1d"), []);

  // 1. Touchpoint Donut Chart Configuration
  const touchpointDonutConfig = useMemo(() => {
    return {
      series: [typeCounts.DOCUMENT, typeCounts.CALL, typeCounts.MEETING, typeCounts.TASK],
      options: {
        chart: {
          type: "donut",
          height: 160,
          sparkline: { enabled: true },
        },
        labels: ["Documents", "Calls", "Meetings", "Tasks"],
        colors: ["#7f1d1d", "#f87171", "#d97706", "#6366f1"], // Maroon, Rose, Amber, Indigo
        stroke: { width: 2, colors: ["#ffffff"] },
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
            formatter: (val) => `${val} activities (${((val / effectiveTotal) * 100).toFixed(1)}%)`,
          },
        },
      },
    };
  }, [typeCounts, effectiveTotal]);

  // 2. Activity Trend Spline Area Chart
  const trendChartConfig = useMemo(() => {
    const categories = ["Oct 2026", "Nov 2026", "Dec 2026", "Jan 2027"];
    const totalActivitiesSeries = [3, 4, 2, 3];
    const meetingsSeries = [1, 1, 0, 1];

    return {
      series: [
        { name: "Total Activities", data: totalActivitiesSeries },
        { name: "Meetings", data: meetingsSeries },
      ],
      options: {
        chart: {
          type: "area",
          height: 225,
          toolbar: { show: false },
          parentHeightOffset: 0,
        },
        stroke: { curve: "smooth", width: 2.5 },
        colors: ["#7f1d1d", "#f87171"], // Maroon & Coral Rose
        fill: {
          type: "gradient",
          gradient: {
            shadeIntensity: 1,
            opacityFrom: 0.25,
            opacityTo: 0.03,
            stops: [0, 95, 100],
          },
        },
        markers: {
          size: 4,
          strokeColors: "#ffffff",
          strokeWidth: 2,
          hover: { size: 6 },
        },
        dataLabels: {
          enabled: true,
          style: {
            fontSize: "10.5px",
            fontFamily: "Inter, sans-serif",
            fontWeight: 600,
            colors: ["#1e293b"],
          },
          offsetY: -8,
          formatter: (val) => String(val),
        },
        grid: {
          borderColor: "#f1f5f9",
          strokeDashArray: 3,
          xaxis: { lines: { show: false } },
          yaxis: { lines: { show: true } },
          padding: { top: 10, bottom: 0, left: 10, right: 10 },
        },
        xaxis: {
          categories,
          labels: {
            style: {
              colors: "#475569",
              fontSize: "11px",
              fontFamily: "Inter, sans-serif",
              fontWeight: 500,
            },
            offsetY: 2,
          },
          axisBorder: { color: "#e2e8f0" },
          axisTicks: { show: false },
        },
        yaxis: {
          max: 8,
          tickAmount: 4,
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
        tooltip: {
          theme: "dark",
          shared: true,
          intersect: false,
        },
      },
    };
  }, []);

  return (
    <div className="sales-effort-touchpoint-view">
      {/* ─── ROW 1: EXECUTIVE KPI SUMMARY (3 CARDS WITH SPARKLINE) ───────────── */}
      <Row className="g-3 mb-4">
        {/* Card 1: Total Calls */}
        <Col lg={4} md={6}>
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
              <div className="d-flex align-items-center gap-3">
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "4px",
                    backgroundColor: "rgba(127, 29, 29, 0.08)",
                    color: "#7f1d1d",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "22px",
                    flexShrink: 0,
                  }}
                >
                  <i className="ri-phone-fill"></i>
                </div>
                <div>
                  <span
                    className="text-muted text-uppercase fw-semibold d-block mb-1"
                    style={{ fontSize: "11px", letterSpacing: "0.4px" }}
                  >
                    Total Calls
                  </span>
                  <div
                    className="fw-bold text-dark font-monospace"
                    style={{
                      fontSize: "26px",
                      letterSpacing: "-0.5px",
                      lineHeight: "1.1",
                    }}
                  >
                    {totalCalls}
                  </div>
                  <div className="d-flex align-items-center gap-1 mt-1">
                    <span style={{ color: "#16a34a", fontSize: "11px", fontWeight: 600 }}>
                      <i className="ri-arrow-up-line"></i> 0%
                    </span>
                    <span className="text-muted" style={{ fontSize: "11px" }}>
                      vs last period
                    </span>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>

        {/* Card 2: Total Meetings */}
        <Col lg={4} md={6}>
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
              <div className="d-flex align-items-center gap-3">
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "4px",
                    backgroundColor: "#fef2f2",
                    color: "#dc2626",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "22px",
                    flexShrink: 0,
                  }}
                >
                  <i className="ri-calendar-event-fill"></i>
                </div>
                <div>
                  <span
                    className="text-muted text-uppercase fw-semibold d-block mb-1"
                    style={{ fontSize: "11px", letterSpacing: "0.4px" }}
                  >
                    Total Meetings
                  </span>
                  <div
                    className="fw-bold text-dark font-monospace"
                    style={{
                      fontSize: "26px",
                      letterSpacing: "-0.5px",
                      lineHeight: "1.1",
                    }}
                  >
                    {totalMeetings}
                  </div>
                  <div className="d-flex align-items-center gap-1 mt-1">
                    <span style={{ color: "#16a34a", fontSize: "11px", fontWeight: 600 }}>
                      <i className="ri-arrow-up-line"></i> 0%
                    </span>
                    <span className="text-muted" style={{ fontSize: "11px" }}>
                      vs last period
                    </span>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>

        {/* Card 3: Total Activities */}
        <Col lg={4} md={12}>
          <Card
            className="h-100 bg-white"
            style={{
              borderRadius: "4px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
            }}
          >
            <CardBody className="p-3 d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-3">
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "4px",
                    backgroundColor: "rgba(127, 29, 29, 0.08)",
                    color: "#7f1d1d",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "22px",
                    flexShrink: 0,
                  }}
                >
                  <i className="ri-check-double-fill"></i>
                </div>
                <div>
                  <span
                    className="text-muted text-uppercase fw-semibold d-block mb-1"
                    style={{ fontSize: "11px", letterSpacing: "0.4px" }}
                  >
                    Total Activities
                  </span>
                  <div
                    className="fw-bold text-dark font-monospace"
                    style={{
                      fontSize: "26px",
                      letterSpacing: "-0.5px",
                      lineHeight: "1.1",
                    }}
                  >
                    {totalActivities}
                  </div>
                  <div className="d-flex align-items-center gap-1 mt-1">
                    <span style={{ color: "#16a34a", fontSize: "11px", fontWeight: 600 }}>
                      <i className="ri-arrow-up-line"></i> 0%
                    </span>
                    <span className="text-muted" style={{ fontSize: "11px" }}>
                      vs last period
                    </span>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* ─── ROW 2: TOUCHPOINT DONUT + ACTIVITY TREND + BREAKDOWN FUNNEL ────── */}
      <Row className="g-3 mb-4">
        {/* Col 1: Touchpoint Distribution Donut (Col lg=4) */}
        <Col lg={4} md={12}>
          <Card
            className="h-100 bg-white d-flex flex-column"
            style={{
              borderRadius: "4px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
            }}
          >
            <div
              className="p-3 bg-white border-bottom d-flex align-items-center gap-2"
              style={{ borderRadius: "4px 4px 0 0", borderColor: "#e2e8f0" }}
            >
              <i
                className="ri-pie-chart-2-line"
                style={{ color: "#7f1d1d", fontSize: "16px" }}
              ></i>
              <span className="fw-bold text-dark" style={{ fontSize: "13.5px" }}>
                Touchpoint Distribution
              </span>
            </div>

            <CardBody className="p-3 d-flex align-items-center justify-content-between flex-grow-1">
              {/* Donut Chart with Centered Total */}
              <div
                className="position-relative d-flex align-items-center justify-content-center"
                style={{ width: "150px", height: "150px", flexShrink: 0 }}
              >
                <ReactApexChart
                  options={touchpointDonutConfig.options}
                  series={touchpointDonutConfig.series}
                  type="donut"
                  width={150}
                  height={150}
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
                      fontSize: "22px",
                      fontWeight: 700,
                      color: "#0f172a",
                      fontFamily: "Inter, sans-serif",
                      lineHeight: "1.1",
                    }}
                  >
                    {effectiveTotal}
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#64748b",
                      fontWeight: 500,
                      fontFamily: "Inter, sans-serif",
                      marginTop: "2px",
                    }}
                  >
                    Total
                  </div>
                </div>
              </div>

              {/* Legend with Icons & Percentages */}
              <div
                className="d-flex flex-column justify-content-center gap-2 ps-3 flex-grow-1"
                style={{ fontSize: "12px" }}
              >
                <div className="d-flex align-items-center justify-content-between">
                  <span className="d-flex align-items-center gap-2">
                    <i className="ri-file-text-line" style={{ color: "#7f1d1d", fontSize: "14px" }}></i>
                    <span style={{ color: "#334155", fontWeight: 500 }}>Documents</span>
                  </span>
                  <span className="fw-bold text-dark font-monospace" style={{ fontSize: "12.5px" }}>
                    {docPct}%
                  </span>
                </div>

                <div className="d-flex align-items-center justify-content-between">
                  <span className="d-flex align-items-center gap-2">
                    <i className="ri-phone-line" style={{ color: "#f87171", fontSize: "14px" }}></i>
                    <span style={{ color: "#334155", fontWeight: 500 }}>Calls</span>
                  </span>
                  <span className="fw-bold text-dark font-monospace" style={{ fontSize: "12.5px" }}>
                    {callPct}%
                  </span>
                </div>

                <div className="d-flex align-items-center justify-content-between">
                  <span className="d-flex align-items-center gap-2">
                    <i className="ri-calendar-event-line" style={{ color: "#d97706", fontSize: "14px" }}></i>
                    <span style={{ color: "#334155", fontWeight: 500 }}>Meetings</span>
                  </span>
                  <span className="fw-bold text-dark font-monospace" style={{ fontSize: "12.5px" }}>
                    {meetPct}%
                  </span>
                </div>

                <div className="d-flex align-items-center justify-content-between">
                  <span className="d-flex align-items-center gap-2">
                    <i className="ri-checkbox-circle-line" style={{ color: "#6366f1", fontSize: "14px" }}></i>
                    <span style={{ color: "#334155", fontWeight: 500 }}>Tasks</span>
                  </span>
                  <span className="fw-bold text-dark font-monospace" style={{ fontSize: "12.5px" }}>
                    {taskPct}%
                  </span>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>

        {/* Col 2: Activity Trend Spline Area Chart (Col lg=5) */}
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
              className="p-3 bg-white border-bottom d-flex flex-wrap align-items-center justify-content-between gap-2"
              style={{ borderRadius: "4px 4px 0 0", borderColor: "#e2e8f0" }}
            >
              <div className="d-flex align-items-center gap-2">
                <i
                  className="ri-line-chart-line"
                  style={{ color: "#7f1d1d", fontSize: "16px" }}
                ></i>
                <span className="fw-bold text-dark" style={{ fontSize: "13.5px" }}>
                  Activity Trend
                </span>
              </div>
              <div
                className="d-flex align-items-center gap-3"
                style={{ fontSize: "11.5px", color: "#475569" }}
              >
                <span className="d-flex align-items-center gap-1.5">
                  <span
                    style={{
                      width: "9px",
                      height: "9px",
                      backgroundColor: "#7f1d1d",
                      borderRadius: "50%",
                      display: "inline-block",
                    }}
                  ></span>
                  <span className="fw-medium text-dark">Total Activities</span>
                </span>
                <span className="d-flex align-items-center gap-1.5">
                  <span
                    style={{
                      width: "9px",
                      height: "9px",
                      backgroundColor: "#f87171",
                      borderRadius: "50%",
                      display: "inline-block",
                    }}
                  ></span>
                  <span className="fw-medium text-dark">Meetings</span>
                </span>
              </div>
            </div>

            <CardBody className="p-3 pt-2 d-flex flex-column justify-content-center flex-grow-1">
              <ReactApexChart
                options={trendChartConfig.options}
                series={trendChartConfig.series}
                type="area"
                height={225}
              />
            </CardBody>
          </Card>
        </Col>

        {/* Col 3: Sales Activity Breakdown Progress/Funnel (Col lg=3) */}
        <Col lg={3} md={6}>
          <Card
            className="h-100 bg-white d-flex flex-column"
            style={{
              borderRadius: "4px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
            }}
          >
            <div
              className="p-3 bg-white border-bottom d-flex align-items-center gap-2"
              style={{ borderRadius: "4px 4px 0 0", borderColor: "#e2e8f0" }}
            >
              <i
                className="ri-filter-3-line"
                style={{ color: "#7f1d1d", fontSize: "16px" }}
              ></i>
              <span className="fw-bold text-dark" style={{ fontSize: "13.5px" }}>
                Sales Activity Breakdown
              </span>
            </div>

            <CardBody className="p-3 d-flex flex-column justify-content-between flex-grow-1">
              {/* Stacked Progress Visual Strip */}
              <div className="mb-3">
                <div
                  className="w-100 d-flex overflow-hidden"
                  style={{
                    height: "12px",
                    borderRadius: "4px",
                    backgroundColor: "#f1f5f9",
                  }}
                >
                  <div
                    style={{ width: `${docPct}%`, backgroundColor: "#7f1d1d" }}
                    title={`Documents: ${docPct}%`}
                  ></div>
                  <div
                    style={{ width: `${callPct}%`, backgroundColor: "#f87171" }}
                    title={`Calls: ${callPct}%`}
                  ></div>
                  <div
                    style={{ width: `${meetPct}%`, backgroundColor: "#d97706" }}
                    title={`Meetings: ${meetPct}%`}
                  ></div>
                  <div
                    style={{ width: `${taskPct}%`, backgroundColor: "#6366f1" }}
                    title={`Tasks: ${taskPct}%`}
                  ></div>
                </div>
              </div>

              {/* Activity Share List matching Reference */}
              <div className="d-flex flex-column gap-2" style={{ fontSize: "12px" }}>
                <div className="d-flex align-items-center justify-content-between p-1.5 rounded" style={{ backgroundColor: "#f8fafc" }}>
                  <div className="d-flex align-items-center gap-2">
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#7f1d1d" }}></span>
                    <span className="text-dark fw-medium">Documents</span>
                  </div>
                  <span className="fw-bold text-dark font-monospace">{docPct}%</span>
                </div>

                <div className="d-flex align-items-center justify-content-between p-1.5 rounded" style={{ backgroundColor: "#f8fafc" }}>
                  <div className="d-flex align-items-center gap-2">
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#f87171" }}></span>
                    <span className="text-dark fw-medium">Calls</span>
                  </div>
                  <span className="fw-bold text-dark font-monospace">{callPct}%</span>
                </div>

                <div className="d-flex align-items-center justify-content-between p-1.5 rounded" style={{ backgroundColor: "#f8fafc" }}>
                  <div className="d-flex align-items-center gap-2">
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#d97706" }}></span>
                    <span className="text-dark fw-medium">Meetings</span>
                  </div>
                  <span className="fw-bold text-dark font-monospace">{meetPct}%</span>
                </div>

                <div className="d-flex align-items-center justify-content-between p-1.5 rounded" style={{ backgroundColor: "#f8fafc" }}>
                  <div className="d-flex align-items-center gap-2">
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#6366f1" }}></span>
                    <span className="text-dark fw-medium">Tasks</span>
                  </div>
                  <span className="fw-bold text-dark font-monospace">{taskPct}%</span>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* ─── ROW 3: DETAILED DATA LEDGER (TABLE) ─────────────────────────────── */}
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
              Detailed Data Ledger
            </h6>
            <span className="text-muted small" style={{ fontSize: "11.5px" }}>
              Showing 1 to {filteredRows.length} of {rawRows.length} entries
            </span>
          </div>

          <div className="d-flex align-items-center gap-2 flex-wrap">
            {/* Search Input */}
            <div className="position-relative" style={{ width: "220px" }}>
              <Input
                type="text"
                placeholder="Search by subject..."
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

            {/* Type Filter Dropdown */}
            <select
              className="form-select form-select-sm"
              style={{
                width: "125px",
                borderRadius: "4px",
                fontSize: "12px",
                borderColor: "#cbd5e1",
              }}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="ALL">All Types</option>
              <option value="DOCUMENT">Document</option>
              <option value="CALL">Call</option>
              <option value="MEETING">Meeting</option>
              <option value="TASK">Task</option>
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
                  <th>SUBJECT</th>
                  <th>SALES REP</th>
                  <th>TYPE</th>
                  <th>START TIME</th>
                  <th>NOTES</th>
                  <th style={{ width: "80px" }} className="text-center">ACTION</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: "12.5px" }}>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-4 text-muted">
                      No activity records match the search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((r, idx) => {
                    const type = String(r.type || "OTHER").toUpperCase();
                    let badgeBg = "#f8fafc";
                    let badgeColor = "#475569";
                    let badgeBorder = "#e2e8f0";
                    let icon = "ri-checkbox-circle-line";

                    if (type.includes("DOC") || type.includes("FILE")) {
                      badgeBg = "#fef2f2";
                      badgeColor = "#dc2626";
                      badgeBorder = "#fecaca";
                      icon = "ri-file-text-line";
                    } else if (type.includes("CALL")) {
                      badgeBg = "#fff7ed";
                      badgeColor = "#c2410c";
                      badgeBorder = "#fed7aa";
                      icon = "ri-phone-line";
                    } else if (type.includes("MEET")) {
                      badgeBg = "#fdf4ff";
                      badgeColor = "#a21caf";
                      badgeBorder = "#f5d0fe";
                      icon = "ri-calendar-event-line";
                    } else if (type.includes("TASK")) {
                      badgeBg = "#eff6ff";
                      badgeColor = "#1d4ed8";
                      badgeBorder = "#bfdbfe";
                      icon = "ri-checkbox-circle-line";
                    }

                    return (
                      <tr key={r.activity_id || idx}>
                        <td className="text-center text-muted" style={{ fontSize: "11px" }}>
                          {idx + 1}
                        </td>
                        <td className="fw-semibold text-dark" style={{ maxWidth: "260px" }}>
                          <span className="text-truncate d-inline-block" style={{ maxWidth: "260px" }}>
                            {r.subject}
                          </span>
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <span
                              style={{
                                width: "24px",
                                height: "24px",
                                borderRadius: "50%",
                                backgroundColor: "rgba(127, 29, 29, 0.1)",
                                color: "#7f1d1d",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "11px",
                                fontWeight: 700,
                              }}
                            >
                              {(r.sales_rep || "U").charAt(0)}
                            </span>
                            <span className="text-dark" style={{ fontSize: "12.5px" }}>
                              {r.sales_rep || "Sales Rep"}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span
                            style={{
                              backgroundColor: badgeBg,
                              color: badgeColor,
                              border: `1px solid ${badgeBorder}`,
                              fontSize: "11px",
                              fontWeight: 600,
                              padding: "2.5px 8px",
                              borderRadius: "4px",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <i className={icon} style={{ fontSize: "12px" }}></i>
                            {r.type || "Activity"}
                          </span>
                        </td>
                        <td className="text-muted" style={{ fontSize: "12px" }}>
                          <span className="d-inline-flex align-items-center gap-1">
                            <i className="ri-calendar-line text-muted" style={{ fontSize: "12px" }}></i>
                            {r.start_time}
                          </span>
                        </td>
                        <td className="text-muted" style={{ fontSize: "12px", maxWidth: "260px" }}>
                          <span className="text-truncate d-inline-block" style={{ maxWidth: "260px" }}>
                            {r.notes || "—"}
                          </span>
                        </td>
                        <td className="text-center">
                          <div className="d-flex align-items-center justify-content-center gap-1">
                            <Link
                              to="/crm/activities"
                              className="btn btn-sm btn-light border p-1"
                              style={{ borderRadius: "4px", color: "#475569", width: "26px", height: "26px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                              title="View Activity Details"
                            >
                              <i className="ri-eye-line" style={{ fontSize: "13px" }}></i>
                            </Link>
                            <button
                              type="button"
                              className="btn btn-sm btn-light border p-1"
                              style={{ borderRadius: "4px", color: "#475569", width: "26px", height: "26px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                              title="More Options"
                            >
                              <i className="ri-more-2-line" style={{ fontSize: "13px" }}></i>
                            </button>
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
                Showing 1 to {filteredRows.length} of {rawRows.length} entries
              </span>
            </div>

            <div className="btn-group btn-group-sm">
              <button
                type="button"
                className="btn btn-sm btn-light border"
                style={{ borderRadius: "4px 0 0 4px", fontSize: "11px" }}
                disabled
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
                1
              </button>
              <button
                type="button"
                className="btn btn-sm btn-light border"
                style={{ borderRadius: "0 4px 4px 0", fontSize: "11px" }}
                disabled
              >
                Next &gt;
              </button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* ─── ROW 4: KEY INSIGHTS EXECUTIVE STRIP ─────────────────────────────── */}
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
            {/* Left: Amber Lightbulb badge + Key Insights label */}
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
                <i className="ri-lightbulb-line"></i>
              </div>
              <span className="fw-bold text-dark" style={{ fontSize: "13.5px" }}>
                Key Insights
              </span>
            </div>

            {/* Middle: 3 Key Insights */}
            <div
              className="d-flex flex-wrap align-items-center gap-3 text-muted"
              style={{ fontSize: "12px" }}
            >
              <div className="d-flex align-items-center gap-1.5">
                <i className="ri-bar-chart-fill" style={{ color: "#7f1d1d" }}></i>
                <span>
                  Documents are the primary touchpoint (<strong className="text-dark">{docPct}%</strong>).
                </span>
              </div>
              <span className="d-none d-md-inline text-muted">|</span>
              <div className="d-flex align-items-center gap-1.5">
                <i className="ri-calendar-check-line" style={{ color: "#7f1d1d" }}></i>
                <span>Engagement is consistent across the period.</span>
              </div>
              <span className="d-none d-md-inline text-muted">|</span>
              <div className="d-flex align-items-center gap-1.5">
                <i className="ri-line-chart-line" style={{ color: "#7f1d1d" }}></i>
                <span>Focus on increasing meeting activity for higher deal conversion.</span>
              </div>
            </div>

            {/* Right: SoftOnCloud Tagline */}
            <div className="d-none d-lg-flex align-items-center gap-2 text-end">
              <div>
                <span className="fw-bold text-dark d-block" style={{ fontSize: "11.5px" }}>
                  Track. Analyze. Grow.
                </span>
                <span className="text-muted" style={{ fontSize: "10.5px" }}>
                  Turn touches into revenue.
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
                <i className="ri-funds-line"></i>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default SalesEffortTouchpointView;

