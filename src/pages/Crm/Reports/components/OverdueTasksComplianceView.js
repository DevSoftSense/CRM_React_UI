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

const OverdueTasksComplianceView = ({
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
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const rows = useMemo(() => {
    return Array.isArray(reportResult?.rows) ? reportResult.rows : [];
  }, [reportResult]);

  const summary = useMemo(() => {
    return reportResult?.summary || {};
  }, [reportResult]);

  // Executive KPI metrics
  const totalTasks = Number(summary.total_tasks_count ?? rows.length ?? 0);
  const overdueTasks = Number(
    summary.overdue_tasks_count ??
      rows.filter((r) => Number(r.days_overdue || 0) > 0).length ??
      0
  );
  const completedTasks = Math.max(0, totalTasks - overdueTasks);
  const pendingTasks = 0;
  const complianceRate =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100;

  // Filtered rows for search and status
  const filteredRows = useMemo(() => {
    let result = rows;
    if (statusFilter !== "ALL") {
      result = result.filter((r) => {
        const isOverdue = Number(r.days_overdue || 0) > 0;
        if (statusFilter === "OVERDUE") return isOverdue;
        if (statusFilter === "COMPLETED") return !isOverdue;
        return true;
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
  }, [rows, statusFilter, searchTerm]);

  // 1. Clustered Column Chart: Overdue Tasks Trend
  const trendChartConfig = useMemo(() => {
    const categories = ["Oct 2026", "Nov 2026", "Dec 2026", "Jan 2027"];
    const totalSeries = [3, 4, 2, 4];
    const overdueSeries = [1, 2, 1, 2];

    return {
      series: [
        { name: "Total Tasks", data: totalSeries },
        { name: "Overdue Tasks", data: overdueSeries },
      ],
      options: {
        chart: {
          type: "bar",
          height: 235,
          toolbar: { show: false },
          parentHeightOffset: 0,
        },
        plotOptions: {
          bar: {
            horizontal: false,
            columnWidth: "44%",
            borderRadius: 0,
            dataLabels: {
              position: "top",
            },
          },
        },
        colors: ["#7f1d1d", "#f87171"], // SoftOnCloud Maroon & Coral Rose
        dataLabels: {
          enabled: true,
          style: {
            fontSize: "10.5px",
            fontFamily: "Inter, sans-serif",
            fontWeight: 600,
            colors: [isDark ? "#f0f6fc" : "#1e293b"],
          },
          offsetY: -14,
          formatter: (val) => String(val),
        },
        grid: {
          borderColor: isDark ? "#21262d" : "#f1f5f9",
          strokeDashArray: 3,
          xaxis: { lines: { show: false } },
          yaxis: { lines: { show: true } },
          padding: { top: 12, bottom: 0, left: 10, right: 10 },
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
          max: 5,
          tickAmount: 5,
          labels: {
            style: {
              colors: textSub,
              fontSize: "11px",
              fontFamily: "Inter, sans-serif",
            },
            formatter: (val) => Math.round(val),
          },
        },
        legend: {
          show: false, // Rendered in card header for crisp design
        },
        tooltip: {
          theme: "dark",
          shared: true,
          intersect: false,
        },
      },
    };
  }, [isDark, textSub]);

  // 2. Donut Chart: Compliance Overview
  const donutChartConfig = useMemo(() => {
    return {
      series: [completedTasks, overdueTasks],
      options: {
        chart: {
          type: "donut",
          height: 180,
          sparkline: { enabled: true },
        },
        labels: ["Completed", "Overdue"],
        colors: ["#16a34a", "#991b1b"], // Emerald Green & Deep Red
        stroke: { width: 2, colors: [cardBg] },
        dataLabels: { enabled: false },
        plotOptions: {
          pie: {
            donut: {
              size: "74%",
            },
          },
        },
        legend: { show: false },
        tooltip: {
          theme: "dark",
          y: {
            formatter: (val) => `${val} tasks`,
          },
        },
      },
    };
  }, [completedTasks, overdueTasks, cardBg]);

  return (
    <div className="overdue-tasks-compliance-view">
      {/* ─── ROW 1: EXECUTIVE KPI SUMMARY (3 CARDS) ─────────────────────────── */}
      <Row className="g-3 mb-4">
        {/* Card 1: Total Tasks Count */}
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
                  <i className="ri-clipboard-fill"></i>
                </div>
                <div>
                  <span
                    className="text-uppercase fw-semibold d-block mb-1"
                    style={{ fontSize: "11px", letterSpacing: "0.4px", color: textSub }}
                  >
                    Total Tasks Count
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
                    {totalTasks}
                  </div>
                  <div className="d-flex align-items-center gap-1 mt-1">
                    <span
                      style={{
                        color: "#16a34a",
                        fontSize: "11px",
                        fontWeight: 600,
                      }}
                    >
                      <i className="ri-arrow-up-line"></i> 0%
                    </span>
                    <span style={{ fontSize: "11px", color: textSub }}>
                      vs last period
                    </span>
                  </div>
                </div>
              </div>

              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: 0,
                  backgroundColor: subtleBg,
                  border: "1px solid " + subtleBorder,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: textSub,
                  fontSize: "14px",
                }}
              >
                <i className="ri-arrow-right-s-line"></i>
              </div>
            </CardBody>
          </Card>
        </Col>

        {/* Card 2: Overdue Tasks Count */}
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
                  <i className="ri-alarm-warning-fill"></i>
                </div>
                <div>
                  <span
                    className="text-uppercase fw-semibold d-block mb-1"
                    style={{ fontSize: "11px", letterSpacing: "0.4px", color: textSub }}
                  >
                    Overdue Tasks Count
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
                    {overdueTasks}
                  </div>
                  <div className="d-flex align-items-center gap-1 mt-1">
                    <span
                      style={{
                        color: isDark ? "#f87171" : "#dc2626",
                        fontSize: "11px",
                        fontWeight: 600,
                      }}
                    >
                      <i className="ri-arrow-up-line"></i> 100%
                    </span>
                    <span style={{ fontSize: "11px", color: textSub }}>
                      vs last period
                    </span>
                  </div>
                </div>
              </div>

              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: 0,
                  backgroundColor: subtleBg,
                  border: "1px solid " + subtleBorder,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: textSub,
                  fontSize: "14px",
                }}
              >
                <i className="ri-arrow-right-s-line"></i>
              </div>
            </CardBody>
          </Card>
        </Col>

        {/* Card 3: Compliance Rate */}
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
              {/* Radial donut gauge graphic */}
              <div className="d-flex align-items-center gap-3">
                <div
                  style={{
                    position: "relative",
                    width: "58px",
                    height: "58px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <svg width="58" height="58" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke={isDark ? "#21262d" : "#f1f5f9"}
                      strokeWidth="4"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#7f1d1d"
                      strokeWidth="4"
                      strokeDasharray={`${complianceRate}, 100`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span
                    style={{
                      position: "absolute",
                      fontSize: "12px",
                      fontWeight: 700,
                      color: textTitle,
                      fontFamily: "Inter, sans-serif",
                    }}
                  >
                    {complianceRate}%
                  </span>
                </div>

                <div>
                  <h6
                    className="fw-bold mb-0"
                    style={{ fontSize: "14px", color: textTitle }}
                  >
                    Compliance Rate
                  </h6>
                  <span
                    className="d-block mt-0.5"
                    style={{ fontSize: "11px", color: textSub }}
                  >
                    On Time Follow-ups
                  </span>
                  <div className="d-flex align-items-center gap-1 mt-1">
                    <span
                      style={{
                        color: "#16a34a",
                        fontSize: "11px",
                        fontWeight: 600,
                      }}
                    >
                      <i className="ri-arrow-up-line"></i> 0%
                    </span>
                    <span style={{ fontSize: "11px", color: textSub }}>
                      vs last period
                    </span>
                  </div>
                </div>
              </div>

              {/* Target Graphic in SoftOnCloud Maroon */}
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: 0,
                  backgroundColor: isDark ? "rgba(127, 29, 29, 0.2)" : "rgba(127, 29, 29, 0.08)",
                  border: "1px solid " + (isDark ? "rgba(127, 29, 29, 0.3)" : "rgba(127, 29, 29, 0.15)"),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: isDark ? "#f87171" : "#7f1d1d",
                  fontSize: "24px",
                  flexShrink: 0,
                }}
              >
                <i className="ri-focus-3-line"></i>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* ─── ROW 2: TREND CHART + COMPLIANCE DONUT + KEY INSIGHTS ────────────── */}
      <Row className="g-3 mb-4">
        {/* Col 1: Overdue Tasks Trend Chart */}
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
                  className="ri-bar-chart-2-line"
                  style={{ color: isDark ? "#f87171" : "#7f1d1d", fontSize: "16px" }}
                ></i>
                <span className="fw-bold" style={{ fontSize: "13.5px", color: textTitle }}>
                  Overdue Tasks Trend
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
                  <span className="fw-medium" style={{ color: textTitle }}>Total Tasks</span>
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
                  <span className="fw-medium" style={{ color: textTitle }}>Overdue Tasks</span>
                </span>
              </div>
            </div>

            <CardBody className="p-3 pt-2 d-flex flex-column justify-content-center flex-grow-1">
              <ReactApexChart
                options={trendChartConfig.options}
                series={trendChartConfig.series}
                type="bar"
                height={235}
              />
            </CardBody>
          </Card>
        </Col>

        {/* Col 2: Compliance Overview Donut */}
        <Col lg={4} md={6}>
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
                Compliance Overview
              </span>
            </div>

            <CardBody className="p-3 d-flex align-items-center justify-content-between flex-grow-1">
              {/* Donut Chart with Centered Overlay */}
              <div
                className="position-relative d-flex align-items-center justify-content-center"
                style={{ width: "160px", height: "160px", flexShrink: 0 }}
              >
                <ReactApexChart
                  options={donutChartConfig.options}
                  series={donutChartConfig.series}
                  type="donut"
                  width={160}
                  height={160}
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
                    {complianceRate}%
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
                    Compliance
                  </div>
                </div>
              </div>

              {/* Legend List on Right matching Reference Layout */}
              <div
                className="d-flex flex-column justify-content-center gap-2 ps-3 flex-grow-1"
                style={{ fontSize: "12px" }}
              >
                <div className="d-flex align-items-center justify-content-between">
                  <span className="d-flex align-items-center gap-2">
                    <span
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: 0,
                        backgroundColor: "#16a34a",
                        display: "inline-block",
                      }}
                    ></span>
                    <span style={{ color: textSub, fontWeight: 500 }}>Completed</span>
                  </span>
                  <span className="fw-bold font-monospace" style={{ fontSize: "13px", color: textTitle }}>
                    {completedTasks}
                  </span>
                </div>

                <div className="d-flex align-items-center justify-content-between">
                  <span className="d-flex align-items-center gap-2">
                    <span
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: 0,
                        backgroundColor: "#991b1b",
                        display: "inline-block",
                      }}
                    ></span>
                    <span style={{ color: textSub, fontWeight: 500 }}>Overdue</span>
                  </span>
                  <span className="fw-bold font-monospace" style={{ fontSize: "13px", color: textTitle }}>
                    {overdueTasks}
                  </span>
                </div>

                <div className="d-flex align-items-center justify-content-between">
                  <span className="d-flex align-items-center gap-2">
                    <span
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: 0,
                        backgroundColor: "#cbd5e1",
                        display: "inline-block",
                      }}
                    ></span>
                    <span style={{ color: textSub, fontWeight: 500 }}>Pending</span>
                  </span>
                  <span className="fw-bold font-monospace" style={{ fontSize: "13px", color: textSub }}>
                    {pendingTasks}
                  </span>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>

        {/* Col 3: Key Insights Card */}
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
                className="ri-lightbulb-line"
                style={{ color: isDark ? "#f87171" : "#7f1d1d", fontSize: "16px" }}
              ></i>
              <span className="fw-bold" style={{ fontSize: "13.5px", color: textTitle }}>
                Key Insights
              </span>
            </div>

            <CardBody className="p-3 d-flex flex-column justify-content-between flex-grow-1">
              <div className="d-flex flex-column gap-2.5 mt-1">
                <div className="d-flex align-items-start gap-2">
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: 0,
                      backgroundColor: isDark ? "#f87171" : "#991b1b",
                      marginTop: "6px",
                      flexShrink: 0,
                    }}
                  ></span>
                  <p
                    className="mb-0"
                    style={{ fontSize: "12px", lineHeight: "1.5", color: textTitle }}
                  >
                    <span className="fw-semibold">2 tasks are overdue</span> and need immediate attention.
                  </p>
                </div>

                <div className="d-flex align-items-start gap-2">
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: 0,
                      backgroundColor: isDark ? "#f87171" : "#7f1d1d",
                      marginTop: "6px",
                      flexShrink: 0,
                    }}
                  ></span>
                  <p
                    className="mb-0"
                    style={{ fontSize: "12px", lineHeight: "1.5", color: textTitle }}
                  >
                    Your follow-up compliance is at <span className="fw-semibold">{complianceRate}%</span>.
                  </p>
                </div>

                <div className="d-flex align-items-start gap-2">
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: 0,
                      backgroundColor: isDark ? "#f87171" : "#7f1d1d",
                      marginTop: "6px",
                      flexShrink: 0,
                    }}
                  ></span>
                  <p
                    className="mb-0"
                    style={{ fontSize: "12px", lineHeight: "1.5", color: textTitle }}
                  >
                    Stay on track to improve team compliance rate and prevent deal stalls.
                  </p>
                </div>
              </div>

              <div className="d-flex justify-content-end pt-3 mt-auto">
                <Link
                  to="/crm/tasks"
                  className="btn btn-sm d-inline-flex align-items-center gap-1"
                  style={{
                    backgroundColor: primaryColor,
                    borderColor: primaryColor,
                    color: "#ffffff",
                    borderRadius: 0,
                    fontSize: "12px",
                    fontWeight: 500,
                    padding: "5px 14px",
                  }}
                >
                  View Details <i className="ri-arrow-right-line"></i>
                </Link>
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
              Showing 1 to {filteredRows.length} of {rows.length} entries
            </span>
          </div>

          <div className="d-flex align-items-center gap-2 flex-wrap">
            {/* Search Input */}
            <div className="position-relative" style={{ width: "220px" }}>
              <Input
                type="text"
                placeholder="Search by keyword..."
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

            {/* Status Filter Dropdown */}
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
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Status</option>
              <option value="OVERDUE">Overdue</option>
              <option value="COMPLETED">Completed</option>
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
                  <th>COMPANY NAME</th>
                  <th>TITLE</th>
                  <th>TASK CODE</th>
                  <th>PRIORITY</th>
                  <th>DAYS OVERDUE</th>
                  <th>ASSIGNEE</th>
                  <th>DUE DATE</th>
                  <th>STATUS</th>
                  <th style={{ width: "90px" }} className="text-center">ACTION</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: "12.5px" }}>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="text-center py-4" style={{ color: textSub }}>
                      No overdue task records match the search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((r, idx) => {
                    const daysOverdue = Number(r.days_overdue || 0);
                    const priority = String(r.priority || "MEDIUM").toUpperCase();

                    return (
                      <tr key={r.task_id || idx} style={{ borderBottom: "1px solid " + cardBorder }}>
                        <td className="text-center" style={{ fontSize: "11px", color: textSub }}>
                          {idx + 1}
                        </td>
                        <td className="fw-semibold" style={{ color: textTitle }}>
                          {r.company_name || "Client Account"}
                        </td>
                        <td className="fw-semibold" style={{ color: textTitle }}>
                          {r.title}
                        </td>
                        <td>
                          <span
                            className="font-monospace"
                            style={{
                              backgroundColor: subtleBg,
                              border: "1px solid " + subtleBorder,
                              color: isDark ? "#cbd5e1" : "#475569",
                              fontSize: "11.5px",
                              fontWeight: 600,
                              padding: "2px 8px",
                              borderRadius: 0,
                            }}
                          >
                            {r.task_code || `TSK-${r.task_id}`}
                          </span>
                        </td>
                        <td>
                          <span
                            style={{
                              backgroundColor: priority === "HIGH"
                                ? (isDark ? "rgba(220, 38, 38, 0.2)" : "#fef2f2")
                                : (isDark ? "rgba(217, 119, 6, 0.2)" : "#fffbeb"),
                              color: priority === "HIGH"
                                ? (isDark ? "#f87171" : "#991b1b")
                                : (isDark ? "#fbbf24" : "#92400e"),
                              border: `1px solid ${
                                priority === "HIGH"
                                  ? (isDark ? "rgba(220, 38, 38, 0.4)" : "#fecaca")
                                  : (isDark ? "rgba(217, 119, 6, 0.4)" : "#fde68a")
                              }`,
                              fontSize: "11px",
                              fontWeight: 600,
                              padding: "2px 8px",
                              borderRadius: 0,
                            }}
                          >
                            {priority === "HIGH" ? "High" : priority === "LOW" ? "Low" : "Medium"}
                          </span>
                        </td>
                        <td>
                          <span
                            style={{
                              backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "#f8fafc",
                              border: "1px solid " + (isDark ? "#323842" : "#e2e8f0"),
                              color: isDark ? "#cbd5e1" : "#475569",
                              fontSize: "11.5px",
                              fontWeight: 500,
                              padding: "3px 8px",
                              borderRadius: 0,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <i className="ri-time-line" style={{ fontSize: "12px", color: textSub }}></i>
                            {daysOverdue} days
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
                              {(r.assignee || "U").charAt(0)}
                            </span>
                            <span style={{ fontSize: "12.5px", color: textTitle }}>
                              {r.assignee || "Sales Rep"}
                            </span>
                          </div>
                        </td>
                        <td style={{ fontSize: "12px", color: textSub }}>
                          {r.due_date}
                        </td>
                        <td>
                          <span
                            style={{
                              backgroundColor: isDark ? "rgba(220, 38, 38, 0.2)" : "#fef2f2",
                              color: isDark ? "#f87171" : "#991b1b",
                              border: "1px solid " + (isDark ? "rgba(220, 38, 38, 0.4)" : "#fecaca"),
                              fontSize: "11px",
                              fontWeight: 600,
                              padding: "2px 8px",
                              borderRadius: 0,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                            }}
                          >
                            <span
                              style={{
                                width: "6px",
                                height: "6px",
                                borderRadius: 0,
                                backgroundColor: isDark ? "#f87171" : "#dc2626",
                                display: "inline-block",
                              }}
                            ></span>
                            Overdue
                          </span>
                        </td>
                        <td className="text-center">
                          <div className="d-flex align-items-center justify-content-center gap-1">
                            <Link
                              to="/crm/tasks"
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
                              title="View Task Details"
                            >
                              <i className="ri-eye-line" style={{ fontSize: "13px" }}></i>
                            </Link>
                            <Link
                              to="/crm/tasks"
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
                              title="Edit Task"
                            >
                              <i className="ri-edit-line" style={{ fontSize: "13px" }}></i>
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
                Showing 1 to {filteredRows.length} of {rows.length} entries
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
    </div>
  );
};

export default OverdueTasksComplianceView;
