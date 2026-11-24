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
  const totalActivities = Number(
    summary.total_activities ?? rawRows.length ?? 0
  );
  const totalCalls = Number(
    summary.total_calls ??
      rawRows.filter((r) => String(r.type || "").toUpperCase().includes("CALL")).length ??
      0
  );
  const totalMeetings = Number(
    summary.total_meetings ??
      rawRows.filter((r) => String(r.type || "").toUpperCase().includes("MEET")).length ??
      0
  );

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
    return counts;
  }, [rawRows]);

  const totalCalculated =
    typeCounts.DOCUMENT +
    typeCounts.CALL +
    typeCounts.MEETING +
    typeCounts.TASK +
    typeCounts.OTHER;
  const effectiveTotal = totalCalculated;

  const docPct =
    effectiveTotal > 0
      ? ((typeCounts.DOCUMENT / effectiveTotal) * 100).toFixed(1)
      : "0.0";
  const callPct =
    effectiveTotal > 0
      ? ((typeCounts.CALL / effectiveTotal) * 100).toFixed(1)
      : "0.0";
  const meetPct =
    effectiveTotal > 0
      ? ((typeCounts.MEETING / effectiveTotal) * 100).toFixed(1)
      : "0.0";
  const taskPct =
    effectiveTotal > 0
      ? ((typeCounts.TASK / effectiveTotal) * 100).toFixed(1)
      : "0.0";

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
        stroke: { width: 2, colors: [cardBg] },
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
            formatter: (val) =>
              `${val} activities (${effectiveTotal > 0 ? ((val / effectiveTotal) * 100).toFixed(1) : "0.0"}%)`,
          },
        },
      },
    };
  }, [typeCounts, effectiveTotal, cardBg]);

  // 2. Activity Trend Spline Area Chart (computed dynamically across last 4 months from rawRows)
  const trendChartConfig = useMemo(() => {
    const now = new Date();
    const monthBuckets = Array.from({ length: 4 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (3 - i), 1);
      return {
        year: d.getFullYear(),
        month: d.getMonth(),
        label: d.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
        total: 0,
        meetings: 0,
      };
    });

    rawRows.forEach((r) => {
      const dt = new Date(r.activity_date || r.start_time || r.created_at);
      if (isNaN(dt.getTime())) return;
      const bucket = monthBuckets.find((b) => b.year === dt.getFullYear() && b.month === dt.getMonth());
      if (bucket) {
        bucket.total += 1;
        if (String(r.type || "").toUpperCase().includes("MEET")) {
          bucket.meetings += 1;
        }
      }
    });

    const categories = monthBuckets.map((b) => b.label);
    const totalActivitiesSeries = monthBuckets.map((b) => b.total);
    const meetingsSeries = monthBuckets.map((b) => b.meetings);
    const maxVal = Math.max(...totalActivitiesSeries, ...meetingsSeries, 4);

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
          strokeColors: isDark ? "#21262d" : "#ffffff",
          strokeWidth: 2,
          hover: { size: 6 },
        },
        dataLabels: {
          enabled: true,
          style: {
            fontSize: "10.5px",
            fontFamily: "Inter, sans-serif",
            fontWeight: 600,
            colors: [isDark ? "#f0f6fc" : "#1e293b"],
          },
          offsetY: -8,
          formatter: (val) => String(val),
        },
        grid: {
          borderColor: isDark ? "#21262d" : "#f1f5f9",
          strokeDashArray: 3,
          xaxis: { lines: { show: false } },
          yaxis: { lines: { show: true } },
          padding: { top: 10, bottom: 0, left: 10, right: 10 },
        },
        xaxis: {
          categories,
          labels: {
            style: {
              colors: isDark ? "#8b949e" : "#475569",
              fontSize: "11px",
              fontFamily: "Inter, sans-serif",
              fontWeight: 500,
            },
            offsetY: 2,
          },
          axisBorder: { color: isDark ? "#21262d" : "#e2e8f0" },
          axisTicks: { show: false },
        },
        yaxis: {
          max: Math.ceil(maxVal * 1.25),
          tickAmount: 4,
          labels: {
            style: {
              colors: textSub,
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
  }, [rawRows, isDark, textSub]);

  return (
    <div className="sales-effort-touchpoint-view">
      {/* ─── ROW 1: EXECUTIVE KPI SUMMARY (3 CARDS WITH SPARKLINE) ───────────── */}
      <Row className="g-3 mb-4">
        {/* Card 1: Total Calls */}
        <Col lg={4} md={6}>
          <Card
            className="h-100"
            style={{
              borderRadius: 0,
              border: "1px solid " + cardBorder,
              backgroundColor: cardBg,
              boxShadow: isDark ? "none" : "0 1px 3px rgba(15, 23, 42, 0.04)",
              transition: "all 0.15s ease",
            }}
          >
            <CardBody className="p-3 d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-3">
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: 0,
                    backgroundColor: isDark ? "rgba(127, 29, 29, 0.2)" : "rgba(127, 29, 29, 0.08)",
                    color: isDark ? "#f87171" : "#7f1d1d",
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
                    className="text-uppercase fw-semibold d-block mb-1"
                    style={{ fontSize: "11px", letterSpacing: "0.4px", color: textSub }}
                  >
                    Total Calls
                  </span>
                  <div
                    className="fw-bold font-monospace"
                    style={{
                      fontSize: "26px",
                      letterSpacing: "-0.5px",
                      lineHeight: "1.1",
                      color: textTitle,
                    }}
                  >
                    {totalCalls}
                  </div>
                  <div className="d-flex align-items-center gap-1 mt-1">
                    <span style={{ color: "#16a34a", fontSize: "11px", fontWeight: 600 }}>
                      {callPct}%
                    </span>
                    <span style={{ fontSize: "11px", color: textSub }}>
                      of logged touchpoints
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
            className="h-100"
            style={{
              borderRadius: 0,
              border: "1px solid " + cardBorder,
              backgroundColor: cardBg,
              boxShadow: isDark ? "none" : "0 1px 3px rgba(15, 23, 42, 0.04)",
              transition: "all 0.15s ease",
            }}
          >
            <CardBody className="p-3 d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-3">
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: 0,
                    backgroundColor: isDark ? "rgba(220, 38, 38, 0.2)" : "#fef2f2",
                    color: isDark ? "#f87171" : "#dc2626",
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
                    className="text-uppercase fw-semibold d-block mb-1"
                    style={{ fontSize: "11px", letterSpacing: "0.4px", color: textSub }}
                  >
                    Total Meetings
                  </span>
                  <div
                    className="fw-bold font-monospace"
                    style={{
                      fontSize: "26px",
                      letterSpacing: "-0.5px",
                      lineHeight: "1.1",
                      color: textTitle,
                    }}
                  >
                    {totalMeetings}
                  </div>
                  <div className="d-flex align-items-center gap-1 mt-1">
                    <span style={{ color: "#16a34a", fontSize: "11px", fontWeight: 600 }}>
                      {meetPct}%
                    </span>
                    <span style={{ fontSize: "11px", color: textSub }}>
                      of logged touchpoints
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
            className="h-100"
            style={{
              borderRadius: 0,
              border: "1px solid " + cardBorder,
              backgroundColor: cardBg,
              boxShadow: isDark ? "none" : "0 1px 3px rgba(15, 23, 42, 0.04)",
            }}
          >
            <CardBody className="p-3 d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-3">
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: 0,
                    backgroundColor: isDark ? "rgba(127, 29, 29, 0.2)" : "rgba(127, 29, 29, 0.08)",
                    color: isDark ? "#f87171" : "#7f1d1d",
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
                    className="text-uppercase fw-semibold d-block mb-1"
                    style={{ fontSize: "11px", letterSpacing: "0.4px", color: textSub }}
                  >
                    Total Activities
                  </span>
                  <div
                    className="fw-bold font-monospace"
                    style={{
                      fontSize: "26px",
                      letterSpacing: "-0.5px",
                      lineHeight: "1.1",
                      color: textTitle,
                    }}
                  >
                    {totalActivities}
                  </div>
                  <div className="d-flex align-items-center gap-1 mt-1">
                    <span style={{ color: "#16a34a", fontSize: "11px", fontWeight: 600 }}>
                      {effectiveTotal} records
                    </span>
                    <span style={{ fontSize: "11px", color: textSub }}>
                      in selected period
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
            className="h-100 d-flex flex-column"
            style={{
              borderRadius: 0,
              border: "1px solid " + cardBorder,
              backgroundColor: cardBg,
              boxShadow: isDark ? "none" : "0 1px 3px rgba(15, 23, 42, 0.04)",
            }}
          >
            <div
              className="p-3 border-bottom d-flex align-items-center gap-2"
              style={{ borderRadius: 0, borderColor: cardBorder, backgroundColor: cardBg }}
            >
              <i
                className="ri-pie-chart-2-line"
                style={{ color: isDark ? "#f87171" : "#7f1d1d", fontSize: "16px" }}
              ></i>
              <span className="fw-bold" style={{ fontSize: "13.5px", color: textTitle }}>
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
                      color: textTitle,
                      fontFamily: "Inter, sans-serif",
                      lineHeight: "1.1",
                    }}
                  >
                    {effectiveTotal}
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: textSub,
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
                    <i className="ri-file-text-line" style={{ color: isDark ? "#f87171" : "#7f1d1d", fontSize: "14px" }}></i>
                    <span style={{ color: textSub, fontWeight: 500 }}>Documents</span>
                  </span>
                  <span className="fw-bold font-monospace" style={{ fontSize: "12.5px", color: textTitle }}>
                    {docPct}%
                  </span>
                </div>

                <div className="d-flex align-items-center justify-content-between">
                  <span className="d-flex align-items-center gap-2">
                    <i className="ri-phone-line" style={{ color: "#f87171", fontSize: "14px" }}></i>
                    <span style={{ color: textSub, fontWeight: 500 }}>Calls</span>
                  </span>
                  <span className="fw-bold font-monospace" style={{ fontSize: "12.5px", color: textTitle }}>
                    {callPct}%
                  </span>
                </div>

                <div className="d-flex align-items-center justify-content-between">
                  <span className="d-flex align-items-center gap-2">
                    <i className="ri-calendar-event-line" style={{ color: "#d97706", fontSize: "14px" }}></i>
                    <span style={{ color: textSub, fontWeight: 500 }}>Meetings</span>
                  </span>
                  <span className="fw-bold font-monospace" style={{ fontSize: "12.5px", color: textTitle }}>
                    {meetPct}%
                  </span>
                </div>

                <div className="d-flex align-items-center justify-content-between">
                  <span className="d-flex align-items-center gap-2">
                    <i className="ri-checkbox-circle-line" style={{ color: "#6366f1", fontSize: "14px" }}></i>
                    <span style={{ color: textSub, fontWeight: 500 }}>Tasks</span>
                  </span>
                  <span className="fw-bold font-monospace" style={{ fontSize: "12.5px", color: textTitle }}>
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
            className="h-100 d-flex flex-column"
            style={{
              borderRadius: 0,
              border: "1px solid " + cardBorder,
              backgroundColor: cardBg,
              boxShadow: isDark ? "none" : "0 1px 3px rgba(15, 23, 42, 0.04)",
            }}
          >
            <div
              className="p-3 border-bottom d-flex flex-wrap align-items-center justify-content-between gap-2"
              style={{ borderRadius: 0, borderColor: cardBorder, backgroundColor: cardBg }}
            >
              <div className="d-flex align-items-center gap-2">
                <i
                  className="ri-line-chart-line"
                  style={{ color: isDark ? "#f87171" : "#7f1d1d", fontSize: "16px" }}
                ></i>
                <span className="fw-bold" style={{ fontSize: "13.5px", color: textTitle }}>
                  Activity Trend
                </span>
              </div>
              <div
                className="d-flex align-items-center gap-3"
                style={{ fontSize: "11.5px", color: textSub }}
              >
                <span className="d-flex align-items-center gap-1.5">
                  <span
                    style={{
                      width: "9px",
                      height: "9px",
                      backgroundColor: "#7f1d1d",
                      borderRadius: 0,
                      display: "inline-block",
                    }}
                  ></span>
                  <span className="fw-medium" style={{ color: textTitle }}>Total Activities</span>
                </span>
                <span className="d-flex align-items-center gap-1.5">
                  <span
                    style={{
                      width: "9px",
                      height: "9px",
                      backgroundColor: "#f87171",
                      borderRadius: 0,
                      display: "inline-block",
                    }}
                  ></span>
                  <span className="fw-medium" style={{ color: textTitle }}>Meetings</span>
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
            className="h-100 d-flex flex-column"
            style={{
              borderRadius: 0,
              border: "1px solid " + cardBorder,
              backgroundColor: cardBg,
              boxShadow: isDark ? "none" : "0 1px 3px rgba(15, 23, 42, 0.04)",
            }}
          >
            <div
              className="p-3 border-bottom d-flex align-items-center gap-2"
              style={{ borderRadius: 0, borderColor: cardBorder, backgroundColor: cardBg }}
            >
              <i
                className="ri-filter-3-line"
                style={{ color: isDark ? "#f87171" : "#7f1d1d", fontSize: "16px" }}
              ></i>
              <span className="fw-bold" style={{ fontSize: "13.5px", color: textTitle }}>
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
                    borderRadius: 0,
                    backgroundColor: isDark ? "#21262d" : "#f1f5f9",
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
                <div
                  className="d-flex align-items-center justify-content-between p-1.5"
                  style={{ backgroundColor: subtleBg, border: "1px solid " + subtleBorder, borderRadius: 0 }}
                >
                  <div className="d-flex align-items-center gap-2">
                    <span style={{ width: "8px", height: "8px", borderRadius: 0, backgroundColor: "#7f1d1d" }}></span>
                    <span className="fw-medium" style={{ color: textTitle }}>Documents</span>
                  </div>
                  <span className="fw-bold font-monospace" style={{ color: textTitle }}>{docPct}%</span>
                </div>

                <div
                  className="d-flex align-items-center justify-content-between p-1.5"
                  style={{ backgroundColor: subtleBg, border: "1px solid " + subtleBorder, borderRadius: 0 }}
                >
                  <div className="d-flex align-items-center gap-2">
                    <span style={{ width: "8px", height: "8px", borderRadius: 0, backgroundColor: "#f87171" }}></span>
                    <span className="fw-medium" style={{ color: textTitle }}>Calls</span>
                  </div>
                  <span className="fw-bold font-monospace" style={{ color: textTitle }}>{callPct}%</span>
                </div>

                <div
                  className="d-flex align-items-center justify-content-between p-1.5"
                  style={{ backgroundColor: subtleBg, border: "1px solid " + subtleBorder, borderRadius: 0 }}
                >
                  <div className="d-flex align-items-center gap-2">
                    <span style={{ width: "8px", height: "8px", borderRadius: 0, backgroundColor: "#d97706" }}></span>
                    <span className="fw-medium" style={{ color: textTitle }}>Meetings</span>
                  </div>
                  <span className="fw-bold font-monospace" style={{ color: textTitle }}>{meetPct}%</span>
                </div>

                <div
                  className="d-flex align-items-center justify-content-between p-1.5"
                  style={{ backgroundColor: subtleBg, border: "1px solid " + subtleBorder, borderRadius: 0 }}
                >
                  <div className="d-flex align-items-center gap-2">
                    <span style={{ width: "8px", height: "8px", borderRadius: 0, backgroundColor: "#6366f1" }}></span>
                    <span className="fw-medium" style={{ color: textTitle }}>Tasks</span>
                  </div>
                  <span className="fw-bold font-monospace" style={{ color: textTitle }}>{taskPct}%</span>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* ─── ROW 3: DETAILED DATA LEDGER (TABLE) ─────────────────────────────── */}
      <Card
        className="mb-4"
        style={{
          borderRadius: 0,
          border: "1px solid " + cardBorder,
          backgroundColor: cardBg,
          boxShadow: isDark ? "none" : "0 1px 3px rgba(15, 23, 42, 0.04)",
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
              Detailed Data Ledger
            </h6>
            <span style={{ fontSize: "11.5px", color: textSub }}>
              Showing {filteredRows.length > 0 ? 1 : 0} to {filteredRows.length} of {rawRows.length} entries
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
                  borderRadius: 0,
                  fontSize: "12px",
                  borderColor: subtleBorder,
                  backgroundColor: subtleBg,
                  color: textTitle,
                }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <i
                className="ri-search-line position-absolute top-50 start-0 translate-middle-y ms-2"
                style={{ fontSize: "12px", color: textSub }}
              ></i>
            </div>

            {/* Type Filter Dropdown */}
            <select
              className="form-select form-select-sm"
              style={{
                width: "125px",
                borderRadius: 0,
                fontSize: "12px",
                borderColor: subtleBorder,
                backgroundColor: subtleBg,
                color: textTitle,
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
                backgroundColor: isDark ? "rgba(127, 29, 29, 0.15)" : "#ffffff",
                color: isDark ? "#f87171" : "#7f1d1d",
                border: "1px solid " + (isDark ? "rgba(127, 29, 29, 0.3)" : "#e2e8f0"),
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
              <thead style={{ backgroundColor: subtleBg }}>
                <tr style={{ fontSize: "11.5px", color: textSub, borderBottom: "1px solid " + cardBorder }}>
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
                    <td colSpan="7" className="text-center py-4" style={{ color: textSub }}>
                      No activity records match the search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((r, idx) => {
                    const type = String(r.type || "OTHER").toUpperCase();
                    let badgeBg = subtleBg;
                    let badgeColor = textSub;
                    let badgeBorder = subtleBorder;
                    let icon = "ri-checkbox-circle-line";

                    if (type.includes("DOC") || type.includes("FILE")) {
                      badgeBg = isDark ? "rgba(220, 38, 38, 0.15)" : "#fef2f2";
                      badgeColor = isDark ? "#f87171" : "#dc2626";
                      badgeBorder = isDark ? "rgba(220, 38, 38, 0.35)" : "#fecaca";
                      icon = "ri-file-text-line";
                    } else if (type.includes("CALL")) {
                      badgeBg = isDark ? "rgba(217, 119, 6, 0.15)" : "#fff7ed";
                      badgeColor = isDark ? "#fbbf24" : "#c2410c";
                      badgeBorder = isDark ? "rgba(217, 119, 6, 0.35)" : "#fed7aa";
                      icon = "ri-phone-line";
                    } else if (type.includes("MEET")) {
                      badgeBg = isDark ? "rgba(192, 38, 211, 0.15)" : "#fdf4ff";
                      badgeColor = isDark ? "#e879f9" : "#a21caf";
                      badgeBorder = isDark ? "rgba(192, 38, 211, 0.35)" : "#f5d0fe";
                      icon = "ri-calendar-event-line";
                    } else if (type.includes("TASK")) {
                      badgeBg = isDark ? "rgba(59, 130, 246, 0.15)" : "#eff6ff";
                      badgeColor = isDark ? "#60a5fa" : "#1d4ed8";
                      badgeBorder = isDark ? "rgba(59, 130, 246, 0.35)" : "#bfdbfe";
                      icon = "ri-checkbox-circle-line";
                    }

                    return (
                      <tr key={r.activity_id || idx} style={{ borderBottom: "1px solid " + cardBorder }}>
                        <td className="text-center" style={{ fontSize: "11px", color: textSub }}>
                          {idx + 1}
                        </td>
                        <td className="fw-semibold" style={{ maxWidth: "260px", color: textTitle }}>
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
                                borderRadius: 0,
                                backgroundColor: isDark ? "rgba(127, 29, 29, 0.2)" : "rgba(127, 29, 29, 0.1)",
                                color: isDark ? "#f87171" : "#7f1d1d",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "11px",
                                fontWeight: 700,
                              }}
                            >
                              {(r.sales_rep || "U").charAt(0)}
                            </span>
                            <span style={{ fontSize: "12.5px", color: textTitle }}>
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
                              borderRadius: 0,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <i className={icon} style={{ fontSize: "12px" }}></i>
                            {r.type || "Activity"}
                          </span>
                        </td>
                        <td style={{ fontSize: "12px", color: textSub }}>
                          <span className="d-inline-flex align-items-center gap-1">
                            <i className="ri-calendar-line" style={{ fontSize: "12px", color: textSub }}></i>
                            {r.start_time}
                          </span>
                        </td>
                        <td style={{ fontSize: "12px", maxWidth: "260px", color: textSub }}>
                          <span className="text-truncate d-inline-block" style={{ maxWidth: "260px" }}>
                            {r.notes || "—"}
                          </span>
                        </td>
                        <td className="text-center">
                          <div className="d-flex align-items-center justify-content-center gap-1">
                            <Link
                              to="/crm/activities"
                              className="btn btn-sm p-1"
                              style={{
                                borderRadius: 0,
                                backgroundColor: subtleBg,
                                border: "1px solid " + subtleBorder,
                                color: textSub,
                                width: "26px",
                                height: "26px",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                              title="View Activity Details"
                            >
                              <i className="ri-eye-line" style={{ fontSize: "13px" }}></i>
                            </Link>
                            <button
                              type="button"
                              className="btn btn-sm p-1"
                              style={{
                                borderRadius: 0,
                                backgroundColor: subtleBg,
                                border: "1px solid " + subtleBorder,
                                color: textSub,
                                width: "26px",
                                height: "26px",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
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
          <div
            className="p-3 border-top d-flex align-items-center justify-content-between flex-wrap gap-2"
            style={{ borderColor: cardBorder }}
          >
            <div className="d-flex align-items-center gap-2">
              <span style={{ fontSize: "11.5px", color: textSub }}>
                Show
              </span>
              <select
                className="form-select form-select-sm"
                style={{
                  width: "65px",
                  fontSize: "11.5px",
                  borderRadius: 0,
                  borderColor: subtleBorder,
                  backgroundColor: subtleBg,
                  color: textTitle,
                }}
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span style={{ fontSize: "11.5px", color: textSub }}>
                Showing 1 to {filteredRows.length} of {rawRows.length} entries
              </span>
            </div>

            <div className="btn-group btn-group-sm">
              <button
                type="button"
                className="btn btn-sm"
                style={{
                  borderRadius: 0,
                  fontSize: "11px",
                  backgroundColor: subtleBg,
                  borderColor: subtleBorder,
                  color: textTitle,
                }}
                disabled
              >
                &lt; Prev
              </button>
              <button
                type="button"
                className="btn btn-sm"
                style={{
                  backgroundColor: primaryColor,
                  color: "#ffffff",
                  fontSize: "11px",
                  fontWeight: 600,
                  border: "1px solid " + primaryColor,
                  borderRadius: 0,
                }}
              >
                1
              </button>
              <button
                type="button"
                className="btn btn-sm"
                style={{
                  borderRadius: 0,
                  fontSize: "11px",
                  backgroundColor: subtleBg,
                  borderColor: subtleBorder,
                  color: textTitle,
                }}
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
        className="mb-4"
        style={{
          borderRadius: 0,
          border: "1px solid " + cardBorder,
          borderLeft: "4px solid " + primaryColor,
          backgroundColor: cardBg,
          boxShadow: isDark ? "none" : "0 1px 3px rgba(15, 23, 42, 0.04)",
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
                  borderRadius: 0,
                  backgroundColor: isDark ? "rgba(217, 119, 6, 0.2)" : "#fffbeb",
                  border: "1px solid " + (isDark ? "rgba(217, 119, 6, 0.4)" : "#fde68a"),
                  color: isDark ? "#fbbf24" : "#d97706",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "18px",
                  flexShrink: 0,
                }}
              >
                <i className="ri-lightbulb-line"></i>
              </div>
              <span className="fw-bold" style={{ fontSize: "13.5px", color: textTitle }}>
                Key Insights
              </span>
            </div>

            {/* Middle: 3 Key Insights */}
            <div
              className="d-flex flex-wrap align-items-center gap-3"
              style={{ fontSize: "12px", color: textSub }}
            >
              <div className="d-flex align-items-center gap-1.5">
                <i className="ri-bar-chart-fill" style={{ color: isDark ? "#f87171" : "#7f1d1d" }}></i>
                <span>
                  Documents are the primary touchpoint (<strong style={{ color: textTitle }}>{docPct}%</strong>).
                </span>
              </div>
              <span className="d-none d-md-inline" style={{ color: cardBorder }}>|</span>
              <div className="d-flex align-items-center gap-1.5">
                <i className="ri-calendar-check-line" style={{ color: isDark ? "#f87171" : "#7f1d1d" }}></i>
                <span>Engagement is consistent across the period.</span>
              </div>
              <span className="d-none d-md-inline" style={{ color: cardBorder }}>|</span>
              <div className="d-flex align-items-center gap-1.5">
                <i className="ri-line-chart-line" style={{ color: isDark ? "#f87171" : "#7f1d1d" }}></i>
                <span>Focus on increasing meeting activity for higher deal conversion.</span>
              </div>
            </div>

            {/* Right: SoftOnCloud Tagline */}
            <div className="d-none d-lg-flex align-items-center gap-2 text-end">
              <div>
                <span className="fw-bold d-block" style={{ fontSize: "11.5px", color: textTitle }}>
                  Track. Analyze. Grow.
                </span>
                <span style={{ fontSize: "10.5px", color: textSub }}>
                  Turn touches into revenue.
                </span>
              </div>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: 0,
                  backgroundColor: isDark ? "rgba(127, 29, 29, 0.2)" : "rgba(127, 29, 29, 0.08)",
                  color: isDark ? "#f87171" : "#7f1d1d",
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

