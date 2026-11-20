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
  const totalTasks = Number(summary.total_tasks_count ?? 4);
  const overdueTasks = Number(summary.overdue_tasks_count ?? 2);
  const completedTasks = Math.max(0, totalTasks - overdueTasks);
  const pendingTasks = 0;
  const complianceRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 50;

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
            borderRadius: 4,
            borderRadiusApplication: "end",
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
            colors: ["#1e293b"],
          },
          offsetY: -14,
          formatter: (val) => String(val),
        },
        grid: {
          borderColor: "#f1f5f9",
          strokeDashArray: 3,
          xaxis: { lines: { show: false } },
          yaxis: { lines: { show: true } },
          padding: { top: 12, bottom: 0, left: 10, right: 10 },
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
          max: 5,
          tickAmount: 5,
          labels: {
            style: {
              colors: "#64748b",
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
  }, []);

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
        stroke: { width: 2, colors: ["#ffffff"] },
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
  }, [completedTasks, overdueTasks]);

  return (
    <div className="overdue-tasks-compliance-view">
      {/* ─── ROW 1: EXECUTIVE KPI SUMMARY (3 CARDS) ─────────────────────────── */}
      <Row className="g-3 mb-4">
        {/* Card 1: Total Tasks Count */}
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
                  <i className="ri-clipboard-fill"></i>
                </div>
                <div>
                  <span
                    className="text-muted text-uppercase fw-semibold d-block mb-1"
                    style={{ fontSize: "11px", letterSpacing: "0.4px" }}
                  >
                    Total Tasks Count
                  </span>
                  <div
                    className="fw-bold text-dark font-monospace"
                    style={{
                      fontSize: "26px",
                      letterSpacing: "-0.5px",
                      lineHeight: "1.1",
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
                    <span className="text-muted" style={{ fontSize: "11px" }}>
                      vs last period
                    </span>
                  </div>
                </div>
              </div>

              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  backgroundColor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#64748b",
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
                  <i className="ri-alarm-warning-fill"></i>
                </div>
                <div>
                  <span
                    className="text-muted text-uppercase fw-semibold d-block mb-1"
                    style={{ fontSize: "11px", letterSpacing: "0.4px" }}
                  >
                    Overdue Tasks Count
                  </span>
                  <div
                    className="fw-bold text-dark font-monospace"
                    style={{
                      fontSize: "26px",
                      letterSpacing: "-0.5px",
                      lineHeight: "1.1",
                    }}
                  >
                    {overdueTasks}
                  </div>
                  <div className="d-flex align-items-center gap-1 mt-1">
                    <span
                      style={{
                        color: "#dc2626",
                        fontSize: "11px",
                        fontWeight: 600,
                      }}
                    >
                      <i className="ri-arrow-up-line"></i> 100%
                    </span>
                    <span className="text-muted" style={{ fontSize: "11px" }}>
                      vs last period
                    </span>
                  </div>
                </div>
              </div>

              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  backgroundColor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#64748b",
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
            className="h-100 bg-white"
            style={{
              borderRadius: "4px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
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
                      stroke="#f1f5f9"
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
                      color: "#0f172a",
                      fontFamily: "Inter, sans-serif",
                    }}
                  >
                    {complianceRate}%
                  </span>
                </div>

                <div>
                  <h6
                    className="fw-bold text-dark mb-0"
                    style={{ fontSize: "14px" }}
                  >
                    Compliance Rate
                  </h6>
                  <span
                    className="text-muted d-block mt-0.5"
                    style={{ fontSize: "11px" }}
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
                    <span className="text-muted" style={{ fontSize: "11px" }}>
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
                  borderRadius: "50%",
                  backgroundColor: "rgba(127, 29, 29, 0.08)",
                  border: "1px solid rgba(127, 29, 29, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#7f1d1d",
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
                  className="ri-bar-chart-2-line"
                  style={{ color: "#7f1d1d", fontSize: "16px" }}
                ></i>
                <span className="fw-bold text-dark" style={{ fontSize: "13.5px" }}>
                  Overdue Tasks Trend
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
                      borderRadius: "2px",
                      display: "inline-block",
                    }}
                  ></span>
                  <span className="fw-medium text-dark">Total Tasks</span>
                </span>
                <span className="d-flex align-items-center gap-1.5">
                  <span
                    style={{
                      width: "9px",
                      height: "9px",
                      backgroundColor: "#f87171",
                      borderRadius: "2px",
                      display: "inline-block",
                    }}
                  ></span>
                  <span className="fw-medium text-dark">Overdue Tasks</span>
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
                      color: "#0f172a",
                      fontFamily: "Inter, sans-serif",
                      lineHeight: "1.1",
                    }}
                  >
                    {complianceRate}%
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
                        borderRadius: "50%",
                        backgroundColor: "#16a34a",
                        display: "inline-block",
                      }}
                    ></span>
                    <span style={{ color: "#334155", fontWeight: 500 }}>Completed</span>
                  </span>
                  <span className="fw-bold text-dark font-monospace" style={{ fontSize: "13px" }}>
                    {completedTasks}
                  </span>
                </div>

                <div className="d-flex align-items-center justify-content-between">
                  <span className="d-flex align-items-center gap-2">
                    <span
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        backgroundColor: "#991b1b",
                        display: "inline-block",
                      }}
                    ></span>
                    <span style={{ color: "#334155", fontWeight: 500 }}>Overdue</span>
                  </span>
                  <span className="fw-bold text-dark font-monospace" style={{ fontSize: "13px" }}>
                    {overdueTasks}
                  </span>
                </div>

                <div className="d-flex align-items-center justify-content-between">
                  <span className="d-flex align-items-center gap-2">
                    <span
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        backgroundColor: "#cbd5e1",
                        display: "inline-block",
                      }}
                    ></span>
                    <span style={{ color: "#64748b", fontWeight: 500 }}>Pending</span>
                  </span>
                  <span className="fw-bold text-muted font-monospace" style={{ fontSize: "13px" }}>
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
                className="ri-lightbulb-line"
                style={{ color: "#7f1d1d", fontSize: "16px" }}
              ></i>
              <span className="fw-bold text-dark" style={{ fontSize: "13.5px" }}>
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
                      borderRadius: "50%",
                      backgroundColor: "#991b1b",
                      marginTop: "6px",
                      flexShrink: 0,
                    }}
                  ></span>
                  <p
                    className="mb-0 text-dark"
                    style={{ fontSize: "12px", lineHeight: "1.5" }}
                  >
                    <span className="fw-semibold">2 tasks are overdue</span> and need immediate attention.
                  </p>
                </div>

                <div className="d-flex align-items-start gap-2">
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      backgroundColor: "#7f1d1d",
                      marginTop: "6px",
                      flexShrink: 0,
                    }}
                  ></span>
                  <p
                    className="mb-0 text-dark"
                    style={{ fontSize: "12px", lineHeight: "1.5" }}
                  >
                    Your follow-up compliance is at <span className="fw-semibold">{complianceRate}%</span>.
                  </p>
                </div>

                <div className="d-flex align-items-start gap-2">
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      backgroundColor: "#7f1d1d",
                      marginTop: "6px",
                      flexShrink: 0,
                    }}
                  ></span>
                  <p
                    className="mb-0 text-dark"
                    style={{ fontSize: "12px", lineHeight: "1.5" }}
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
                    backgroundColor: "#7f1d1d",
                    borderColor: "#7f1d1d",
                    color: "#ffffff",
                    borderRadius: "4px",
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

            {/* Status Filter Dropdown */}
            <select
              className="form-select form-select-sm"
              style={{
                width: "125px",
                borderRadius: "4px",
                fontSize: "12px",
                borderColor: "#cbd5e1",
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
                    <td colSpan="10" className="text-center py-4 text-muted">
                      No overdue task records match the search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((r, idx) => {
                    const daysOverdue = Number(r.days_overdue || 0);
                    const priority = String(r.priority || "MEDIUM").toUpperCase();

                    return (
                      <tr key={r.task_id || idx}>
                        <td className="text-center text-muted" style={{ fontSize: "11px" }}>
                          {idx + 1}
                        </td>
                        <td className="fw-semibold text-dark">
                          {r.company_name || "Client Account"}
                        </td>
                        <td className="fw-semibold text-dark">
                          {r.title}
                        </td>
                        <td>
                          <span
                            className="font-monospace"
                            style={{
                              backgroundColor: "#f8fafc",
                              border: "1px solid #e2e8f0",
                              color: "#475569",
                              fontSize: "11.5px",
                              fontWeight: 600,
                              padding: "2px 8px",
                              borderRadius: "4px",
                            }}
                          >
                            {r.task_code || `TSK-${r.task_id}`}
                          </span>
                        </td>
                        <td>
                          <span
                            style={{
                              backgroundColor: priority === "HIGH" ? "#fef2f2" : "#fffbeb",
                              color: priority === "HIGH" ? "#991b1b" : "#92400e",
                              border: `1px solid ${priority === "HIGH" ? "#fecaca" : "#fde68a"}`,
                              fontSize: "11px",
                              fontWeight: 600,
                              padding: "2px 8px",
                              borderRadius: "4px",
                            }}
                          >
                            {priority === "HIGH" ? "High" : priority === "LOW" ? "Low" : "Medium"}
                          </span>
                        </td>
                        <td>
                          <span
                            style={{
                              backgroundColor: "#f8fafc",
                              border: "1px solid #e2e8f0",
                              color: "#475569",
                              fontSize: "11.5px",
                              fontWeight: 500,
                              padding: "3px 8px",
                              borderRadius: "4px",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <i className="ri-time-line text-muted" style={{ fontSize: "12px" }}></i>
                            {daysOverdue} days
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
                              {(r.assignee || "U").charAt(0)}
                            </span>
                            <span className="text-dark" style={{ fontSize: "12.5px" }}>
                              {r.assignee || "Sales Rep"}
                            </span>
                          </div>
                        </td>
                        <td className="text-muted" style={{ fontSize: "12px" }}>
                          {r.due_date}
                        </td>
                        <td>
                          <span
                            style={{
                              backgroundColor: "#fef2f2",
                              color: "#991b1b",
                              border: "1px solid #fecaca",
                              fontSize: "11px",
                              fontWeight: 600,
                              padding: "2px 8px",
                              borderRadius: "4px",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                            }}
                          >
                            <span
                              style={{
                                width: "6px",
                                height: "6px",
                                borderRadius: "50%",
                                backgroundColor: "#dc2626",
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
                              className="btn btn-sm btn-light border p-1"
                              style={{ borderRadius: "4px", color: "#475569", width: "26px", height: "26px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                              title="View Task Details"
                            >
                              <i className="ri-eye-line" style={{ fontSize: "13px" }}></i>
                            </Link>
                            <Link
                              to="/crm/tasks"
                              className="btn btn-sm btn-light border p-1"
                              style={{ borderRadius: "4px", color: "#475569", width: "26px", height: "26px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                              title="Edit Task"
                            >
                              <i className="ri-edit-line" style={{ fontSize: "13px" }}></i>
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
                Showing 1 to {filteredRows.length} of {rows.length} entries
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
    </div>
  );
};

export default OverdueTasksComplianceView;
