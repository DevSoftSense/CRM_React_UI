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

const RepProductivityScorecardView = ({
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
  const [performanceFilter, setPerformanceFilter] = useState("ALL");
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

  // Helper for Rep Initials
  const getInitials = (name) => {
    const parts = String(name || "").trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (name || "RP").slice(0, 2).toUpperCase();
  };

  // Executive KPI Calculations
  const activeRepsCount = Number(summary.active_reps ?? rawRows.length ?? 0);
  const totalWonRevenue = Number(summary.total_won_revenue ?? 0);

  const totalActivitiesCount = useMemo(() => {
    return rawRows.reduce((acc, r) => acc + Number(r.activities_logged || 0), 0);
  }, [rawRows]);

  const totalTasksCount = useMemo(() => {
    return rawRows.reduce((acc, r) => acc + Number(r.tasks_completed || 0), 0);
  }, [rawRows]);

  const totalDealsWon = useMemo(() => {
    return rawRows.reduce((acc, r) => acc + Number(r.deals_won || 0), 0);
  }, [rawRows]);

  // Dynamic Top Leader rep
  const topLeader = useMemo(() => {
    if (rawRows.length === 0) return null;
    return [...rawRows].sort((a, b) => Number(b.won_revenue || 0) - Number(a.won_revenue || 0))[0];
  }, [rawRows]);

  // Filtered rows for client search & filter
  const filteredRows = useMemo(() => {
    let result = rawRows;
    if (performanceFilter === "WON") {
      result = result.filter((r) => Number(r.deals_won || 0) > 0);
    } else if (performanceFilter === "HIGH_EFFORT") {
      result = result.filter((r) => Number(r.activities_logged || 0) >= 5);
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
  }, [rawRows, performanceFilter, searchTerm]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

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

  const wonRevenueSparkline = useMemo(
    () => makeSparklineConfig([0, 100000, 150000, 250000], "#7f1d1d", "#7f1d1d"),
    []
  );
  const activitiesSparkline = useMemo(
    () => makeSparklineConfig([3, 7, 9, 12], "#2563eb", "#2563eb"),
    []
  );
  const tasksSparkline = useMemo(
    () => makeSparklineConfig([0, 1, 1, 2], "#16a34a", "#16a34a"),
    []
  );
  const teamSparkline = useMemo(
    () => makeSparklineConfig([1, 2, 3, 3], "#d97706", "#d97706"),
    []
  );

  // 1. Clustered Column Chart: Sales Effort vs Output
  const effortVsOutputChartConfig = useMemo(() => {
    const list =
      chartData.length > 0
        ? chartData
        : rawRows.map((r) => ({
            sales_rep: r.sales_rep,
            activities_count: r.activities_logged,
            tasks_completed: r.tasks_completed,
            won_revenue: r.won_revenue,
          }));

    const categories = list.map((c) => c.sales_rep || "Sales Rep");
    const activitiesData = list.map((c) => Number(c.activities_count || 0));
    const tasksData = list.map((c) => Number(c.tasks_completed || 0));
    const wonDealsData = list.map((c) => {
      const match = rawRows.find((r) => r.sales_rep === c.sales_rep);
      return Number(match?.deals_won ?? (Number(c.won_revenue || 0) > 0 ? 1 : 0));
    });

    const maxCount = Math.max(...activitiesData, ...tasksData, ...wonDealsData, 1);
    const yMax = Math.ceil((maxCount * 1.25) / 2) * 2; // e.g. 14

    return {
      series: [
        {
          name: "Activities Logged",
          data: activitiesData,
        },
        {
          name: "Tasks Completed",
          data: tasksData,
        },
        {
          name: "Deals Won",
          data: wonDealsData,
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
            horizontal: false,
            columnWidth: "50%",
            borderRadius: 0,
            dataLabels: {
              position: "top",
            },
          },
        },
        colors: [isDark ? "#dc2626" : "#7f1d1d", isDark ? "#38bdf8" : "#2563eb", isDark ? "#4ade80" : "#16a34a"], // SoftOnCloud Maroon/Red, Sky Blue, Emerald Green
        dataLabels: {
          enabled: true,
          offsetY: -16,
          style: {
            fontSize: "11px",
            fontFamily: "Inter, sans-serif",
            fontWeight: 600,
            colors: [textTitle],
          },
          formatter: (val) => (val > 0 ? val : ""),
        },
        stroke: {
          show: true,
          width: 2,
          colors: ["transparent"],
        },
        grid: {
          borderColor: cardBorder,
          strokeDashArray: 3,
          xaxis: { lines: { show: false } },
          yaxis: { lines: { show: true } },
          padding: { top: 25, bottom: 0, left: 10, right: 10 },
        },
        xaxis: {
          categories,
          labels: {
            style: {
              colors: textSub,
              fontSize: "12px",
              fontFamily: "Inter, sans-serif",
              fontWeight: 600,
            },
          },
          axisBorder: { color: cardBorder },
          axisTicks: { show: false },
        },
        yaxis: {
          min: 0,
          max: yMax,
          forceNiceScale: false,
          tickAmount: 4,
          labels: {
            style: {
              colors: textSub,
              fontSize: "11px",
              fontFamily: "Inter, sans-serif",
            },
            formatter: (val) => Math.max(0, Math.round(val)),
          },
          axisBorder: { show: true, color: cardBorder },
          axisTicks: { show: false },
        },
        legend: {
          position: "top",
          horizontalAlign: "right",
          fontSize: "11.5px",
          fontFamily: "Inter, sans-serif",
          fontWeight: 500,
          offsetY: -5,
          labels: {
            colors: textSub,
          },
          markers: {
            radius: 0,
            width: 10,
            height: 10,
          },
        },
        tooltip: {
          theme: "dark",
          y: {
            formatter: (val) => `${val} count`,
          },
        },
      },
    };
  }, [chartData, rawRows, isDark, textTitle, textSub, cardBorder]);

  // 2. Won Revenue Share Donut Chart
  const revenueDonutConfig = useMemo(() => {
    const list = rawRows;
    const labels = list.map((r) => r.sales_rep || "Sales Rep");
    const rawSeries = list.map((r) => Number(r.won_revenue || 0));
    const allZero = rawSeries.length === 0 || rawSeries.every((v) => v === 0);
    const finalSeries = allZero ? (rawSeries.length > 0 ? rawSeries.map(() => 0) : [0]) : rawSeries;

    return {
      series: finalSeries,
      options: {
        chart: {
          type: "donut",
          height: 140,
          sparkline: { enabled: true },
        },
        labels,
        colors: [isDark ? "#dc2626" : "#7f1d1d", isDark ? "#38bdf8" : "#2563eb", isDark ? "#64748b" : "#94a3b8"],
        stroke: { width: 2, colors: [cardBg] },
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
            formatter: (val) => formatCurrency(val),
          },
        },
      },
    };
  }, [rawRows, cardBg, isDark]);

  // Helper for Rep Initials
  const getRepInitials = (name) => {
    const parts = String(name || "").trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (name || "SR").slice(0, 2).toUpperCase();
  };

  return (
    <div className="rep-productivity-scorecard-view">
      {/* ─── ROW 1: EXECUTIVE KPI SCORECARD CARDS (4 CARDS) ────────────────── */}
      <Row className="g-3 mb-4">
        {/* Card 1: Won Revenue Output */}
        <Col lg={3} sm={6}>
          <Card
            className="h-100"
            style={{
              backgroundColor: cardBg,
              borderRadius: 0,
              border: `1px solid ${cardBorder}`,
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
                    borderRadius: 0,
                    backgroundColor: isDark ? "rgba(127, 29, 29, 0.25)" : "rgba(127, 29, 29, 0.08)",
                    color: isDark ? "#f87171" : "#7f1d1d",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "20px",
                    flexShrink: 0,
                  }}
                >
                  <i className="ri-money-dollar-circle-fill"></i>
                </div>
                <div>
                  <span
                    className="text-uppercase fw-semibold d-block mb-1"
                    style={{ fontSize: "10.5px", letterSpacing: "0.4px", color: textSub }}
                  >
                    Won Revenue Output
                  </span>
                  <div
                    className="fw-bold font-monospace"
                    style={{
                      fontSize: "22px",
                      letterSpacing: "-0.5px",
                      lineHeight: "1.1",
                      color: textTitle,
                    }}
                  >
                    {formatCurrency(totalWonRevenue)}
                  </div>
                  <div className="d-flex align-items-center gap-1 mt-1">
                    <span style={{ color: "#16a34a", fontSize: "11px", fontWeight: 600 }}>
                      <i className="ri-checkbox-circle-fill"></i> 100%
                    </span>
                    <span style={{ fontSize: "11px", color: textSub }}>
                      Closed Won target
                    </span>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>

        {/* Card 2: Total Sales Activities */}
        <Col lg={3} sm={6}>
          <Card
            className="h-100"
            style={{
              backgroundColor: cardBg,
              borderRadius: 0,
              border: `1px solid ${cardBorder}`,
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
                    borderRadius: 0,
                    backgroundColor: isDark ? "rgba(37, 99, 235, 0.2)" : "#eff6ff",
                    color: isDark ? "#60a5fa" : "#2563eb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "20px",
                    flexShrink: 0,
                  }}
                >
                  <i className="ri-phone-fill"></i>
                </div>
                <div>
                  <span
                    className="text-uppercase fw-semibold d-block mb-1"
                    style={{ fontSize: "10.5px", letterSpacing: "0.4px", color: textSub }}
                  >
                    Total Activities Logged
                  </span>
                  <div
                    className="fw-bold font-monospace"
                    style={{
                      fontSize: "22px",
                      letterSpacing: "-0.5px",
                      lineHeight: "1.1",
                      color: textTitle,
                    }}
                  >
                    {totalActivitiesCount}
                  </div>
                  <div className="d-flex align-items-center gap-1 mt-1">
                    <span style={{ color: isDark ? "#60a5fa" : "#2563eb", fontSize: "11px", fontWeight: 600 }}>
                      <i className="ri-fire-fill"></i> High Velocity
                    </span>
                    <span style={{ fontSize: "11px", color: textSub }}>
                      Calls & meetings
                    </span>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>

        {/* Card 3: Tasks Completed */}
        <Col lg={3} sm={6}>
          <Card
            className="h-100"
            style={{
              backgroundColor: cardBg,
              borderRadius: 0,
              border: `1px solid ${cardBorder}`,
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
                    borderRadius: 0,
                    backgroundColor: isDark ? "rgba(22, 163, 74, 0.2)" : "#f0fdf4",
                    color: isDark ? "#4ade80" : "#16a34a",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "20px",
                    flexShrink: 0,
                  }}
                >
                  <i className="ri-checkbox-circle-fill"></i>
                </div>
                <div>
                  <span
                    className="text-uppercase fw-semibold d-block mb-1"
                    style={{ fontSize: "10.5px", letterSpacing: "0.4px", color: textSub }}
                  >
                    Follow-ups Completed
                  </span>
                  <div
                    className="fw-bold font-monospace"
                    style={{
                      fontSize: "22px",
                      letterSpacing: "-0.5px",
                      lineHeight: "1.1",
                      color: textTitle,
                    }}
                  >
                    {totalTasksCount}
                  </div>
                  <div className="d-flex align-items-center gap-1 mt-1">
                    <span style={{ color: "#16a34a", fontSize: "11px", fontWeight: 600 }}>
                      <i className="ri-check-line"></i> Completed
                    </span>
                    <span style={{ fontSize: "11px", color: textSub }}>
                      On-time execution
                    </span>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>

        {/* Card 4: Active Sales Reps */}
        <Col lg={3} sm={6}>
          <Card
            className="h-100"
            style={{
              backgroundColor: cardBg,
              borderRadius: 0,
              border: `1px solid ${cardBorder}`,
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
                    borderRadius: 0,
                    backgroundColor: isDark ? "rgba(217, 119, 6, 0.2)" : "#fffbeb",
                    color: isDark ? "#fbbf24" : "#d97706",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "20px",
                    flexShrink: 0,
                  }}
                >
                  <i className="ri-team-fill"></i>
                </div>
                <div>
                  <span
                    className="text-uppercase fw-semibold d-block mb-1"
                    style={{ fontSize: "10.5px", letterSpacing: "0.4px", color: textSub }}
                  >
                    Active Sales Team
                  </span>
                  <div
                    className="fw-bold font-monospace"
                    style={{
                      fontSize: "22px",
                      letterSpacing: "-0.5px",
                      lineHeight: "1.1",
                      color: textTitle,
                    }}
                  >
                    {activeRepsCount} Reps
                  </div>
                  <div className="d-flex align-items-center gap-1 mt-1">
                    <span style={{ color: isDark ? "#fbbf24" : "#d97706", fontSize: "11px", fontWeight: 600 }}>
                      {totalDealsWon} Won
                    </span>
                    <span style={{ fontSize: "11px", color: textSub }}>
                      • 2 In Pipeline
                    </span>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* ─── ROW 2: COMPARATIVE SCORECARD CHART + REVENUE SHARE ─────────────── */}
      <Row className="g-3 mb-4">
        {/* Col 1: Rep Effort vs Output Comparative Chart (Col lg=7) */}
        <Col lg={7} md={12}>
          <Card
            className="h-100 d-flex flex-column"
            style={{
              backgroundColor: cardBg,
              borderRadius: 0,
              border: `1px solid ${cardBorder}`,
              boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
            }}
          >
            <div
              className="p-3 border-bottom d-flex flex-wrap align-items-center justify-content-between gap-2"
              style={{ backgroundColor: cardBg, borderColor: cardBorder }}
            >
              <div className="d-flex align-items-center gap-2">
                <i
                  className="ri-bar-chart-grouped-fill"
                  style={{ color: "#7f1d1d", fontSize: "16px" }}
                ></i>
                <span className="fw-bold" style={{ fontSize: "13.5px", color: textTitle }}>
                  Sales Effort vs Deals Won Comparison
                </span>
              </div>
              <span
                className="badge border"
                style={{
                  backgroundColor: subtleBg,
                  color: textSub,
                  borderColor: subtleBorder,
                  borderRadius: 0,
                  fontSize: "11px",
                }}
              >
                Activities • Tasks • Deals Won
              </span>
            </div>

            <CardBody className="p-3 pt-2 d-flex flex-column justify-content-center flex-grow-1">
              <ReactApexChart
                options={effortVsOutputChartConfig.options}
                series={effortVsOutputChartConfig.series}
                type="bar"
                height={250}
              />
            </CardBody>
          </Card>
        </Col>

        {/* Col 2: Won Revenue Contribution & Performer Spotlight (Col lg=5) */}
        <Col lg={5} md={12}>
          <Card
            className="h-100 d-flex flex-column"
            style={{
              backgroundColor: cardBg,
              borderRadius: 0,
              border: `1px solid ${cardBorder}`,
              boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
            }}
          >
            <div
              className="p-3 border-bottom d-flex align-items-center justify-content-between gap-2"
              style={{ backgroundColor: cardBg, borderColor: cardBorder }}
            >
              <div className="d-flex align-items-center gap-2">
                <i
                  className="ri-pie-chart-2-line"
                  style={{ color: "#7f1d1d", fontSize: "16px" }}
                ></i>
                <span className="fw-bold" style={{ fontSize: "13.5px", color: textTitle }}>
                  Won Revenue Contribution
                </span>
              </div>
              <span
                style={{
                  backgroundColor: isDark ? "rgba(127, 29, 29, 0.25)" : "rgba(127, 29, 29, 0.08)",
                  color: isDark ? "#f87171" : "#7f1d1d",
                  fontSize: "11px",
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: 0,
                }}
              >
                Top Leader: {topLeader ? topLeader.sales_rep : "None"}
              </span>
            </div>

            <CardBody className="p-3 d-flex flex-column justify-content-between flex-grow-1">
              {/* Donut and Legend Row */}
              <div className="d-flex align-items-center gap-3 mb-3">
                {/* Donut Chart with Centered Overlay */}
                <div
                  className="position-relative d-flex align-items-center justify-content-center"
                  style={{ width: "135px", height: "135px", flexShrink: 0 }}
                >
                  <ReactApexChart
                    options={revenueDonutConfig.options}
                    series={revenueDonutConfig.series}
                    type="donut"
                    width={135}
                    height={135}
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
                        fontSize: "20px",
                        fontWeight: 700,
                        color: textTitle,
                        fontFamily: "Inter, sans-serif",
                        lineHeight: "1.1",
                      }}
                    >
                      {topLeader && totalWonRevenue > 0
                        ? `${Math.round((Number(topLeader.won_revenue || 0) / totalWonRevenue) * 100)}%`
                        : "0%"}
                    </div>
                    <div
                      style={{
                        fontSize: "10.5px",
                        color: isDark ? "#f87171" : "#7f1d1d",
                        fontWeight: 600,
                        fontFamily: "Inter, sans-serif",
                        marginTop: "2px",
                      }}
                    >
                      {topLeader ? topLeader.sales_rep : "—"}
                    </div>
                  </div>
                </div>

                {/* Rep Contribution Breakdown Clean Row Cards */}
                <div className="flex-grow-1 d-flex flex-column gap-1.5">
                  {rawRows.map((r, i) => {
                    const colors = [isDark ? "#dc2626" : "#7f1d1d", isDark ? "#38bdf8" : "#2563eb", isDark ? "#64748b" : "#94a3b8"];
                    const rev = Number(r.won_revenue || 0);
                    const pct = totalWonRevenue > 0 ? Math.round((rev / totalWonRevenue) * 100) : (i === 0 ? 100 : 0);
                    const isTop = i === 0;

                    return (
                      <div
                        key={r.employee_id || i}
                        className="d-flex align-items-center justify-content-between px-2.5 py-1.5"
                        style={{
                          backgroundColor: isTop
                            ? (isDark ? "rgba(127, 29, 29, 0.2)" : "rgba(127, 29, 29, 0.04)")
                            : (isDark ? subtleBg : "#ffffff"),
                          border: "1px solid",
                          borderColor: isTop
                            ? (isDark ? "rgba(127, 29, 29, 0.4)" : "rgba(127, 29, 29, 0.15)")
                            : cardBorder,
                          borderRadius: 0,
                        }}
                      >
                        <div className="d-flex align-items-center gap-2">
                          <span
                            style={{
                              width: "8px",
                              height: "8px",
                              borderRadius: "50%",
                              backgroundColor: colors[i % colors.length],
                              flexShrink: 0,
                            }}
                          ></span>
                          <span
                            style={{
                              fontSize: "12px",
                              fontWeight: isTop ? 600 : 500,
                              color: textTitle,
                            }}
                          >
                            {r.sales_rep}
                          </span>
                        </div>

                        <div className="d-flex align-items-center gap-2">
                          <span
                            className="badge font-monospace"
                            style={{
                              backgroundColor: isTop
                                ? (isDark ? "rgba(127, 29, 29, 0.25)" : "#fef2f2")
                                : (isDark ? "#21262d" : "#f8fafc"),
                              color: isTop ? (isDark ? "#f87171" : "#7f1d1d") : textSub,
                              border: "1px solid",
                              borderColor: isTop
                                ? (isDark ? "rgba(127, 29, 29, 0.4)" : "#fecaca")
                                : cardBorder,
                              fontSize: "10.5px",
                              padding: "2px 6px",
                              borderRadius: 0,
                            }}
                          >
                            {pct}%
                          </span>
                          <span
                            className="font-monospace fw-bold"
                            style={{
                              fontSize: "12px",
                              minWidth: "75px",
                              textAlign: "right",
                              color: rev > 0 ? (isDark ? "#f87171" : "#7f1d1d") : textSub,
                            }}
                          >
                            {formatCurrency(rev)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Performer Spotlight Box */}
              <div
                className="p-2.5 border d-flex align-items-center justify-content-between"
                style={{
                  backgroundColor: isDark ? subtleBg : "#f8fafc",
                  borderColor: cardBorder,
                  borderRadius: 0,
                }}
              >
                {topLeader ? (
                  <div className="d-flex align-items-center gap-2.5">
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: 0,
                        backgroundColor: "#7f1d1d",
                        color: "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "13px",
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {getInitials(topLeader.sales_rep)}
                    </div>
                    <div>
                      <div className="d-flex align-items-center gap-1.5">
                        <span className="fw-bold" style={{ fontSize: "12.5px", color: textTitle }}>
                          {topLeader.sales_rep}
                        </span>
                        <span
                          style={{
                            backgroundColor: isDark ? "rgba(217, 119, 6, 0.2)" : "#fef3c7",
                            color: isDark ? "#fbbf24" : "#92400e",
                            border: `1px solid ${isDark ? "rgba(217, 119, 6, 0.4)" : "#fde68a"}`,
                            fontSize: "10px",
                            fontWeight: 600,
                            padding: "1px 6px",
                            borderRadius: 0,
                          }}
                        >
                          <i className="ri-vip-crown-fill" style={{ color: "#d97706" }}></i> Quota Leader
                        </span>
                      </div>
                      <span className="d-block" style={{ fontSize: "11px", color: textSub }}>
                        {formatCurrency(topLeader.won_revenue || 0)} Won • {topLeader.activities_logged || 0} activities logged • {topLeader.deals_won || 0} deal{topLeader.deals_won === 1 ? "" : "s"} won
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="py-2" style={{ fontSize: "12px", color: textSub }}>
                    No sales rep activity recorded.
                  </div>
                )}

                <Link
                  to="/crm/opportunities"
                  className="btn btn-sm d-inline-flex align-items-center gap-1"
                  style={{
                    backgroundColor: primaryColor,
                    borderColor: primaryColor,
                    color: "#ffffff",
                    borderRadius: 0,
                    fontSize: "11.5px",
                    fontWeight: 500,
                    padding: "5px 12px",
                  }}
                >
                  View Deals <i className="ri-arrow-right-line"></i>
                </Link>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* ─── ROW 3: DETAILED REP SCORECARD LEDGER (TABLE) ────────────────────── */}
      <Card
        className="mb-4"
        style={{
          backgroundColor: cardBg,
          borderRadius: 0,
          border: `1px solid ${cardBorder}`,
          boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
        }}
      >
        <div
          className="p-3 border-bottom d-flex flex-wrap align-items-center justify-content-between gap-2"
          style={{
            backgroundColor: cardBg,
            borderColor: cardBorder,
          }}
        >
          <div>
            <h6
              className="mb-0 fw-bold d-flex align-items-center gap-2"
              style={{ fontSize: "14px", color: textTitle }}
            >
              <i
                className="ri-table-line"
                style={{ color: "#7f1d1d", fontSize: "16px" }}
              ></i>
              Detailed Rep Scorecard Ledger
            </h6>
            <span style={{ fontSize: "11.5px", color: textSub }}>
              Showing {filteredRows.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{" "}
              {Math.min(currentPage * pageSize, filteredRows.length)} of {rawRows.length} sales reps
            </span>
          </div>

          <div className="d-flex align-items-center gap-2 flex-wrap">
            {/* Search Input */}
            <div className="position-relative" style={{ width: "230px" }}>
              <Input
                type="text"
                placeholder="Search rep name or email..."
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
                className="ri-search-line position-absolute top-50 start-0 translate-middle-y ms-2 text-muted"
                style={{ fontSize: "12px" }}
              ></i>
            </div>

            {/* Performance Filter Dropdown */}
            <select
              className="form-select form-select-sm"
              style={{
                width: "145px",
                borderRadius: 0,
                fontSize: "12px",
                borderColor: subtleBorder,
                backgroundColor: subtleBg,
                color: textTitle,
              }}
              value={performanceFilter}
              onChange={(e) => setPerformanceFilter(e.target.value)}
            >
              <option value="ALL">All Sales Reps</option>
              <option value="WON">Has Won Deals</option>
              <option value="HIGH_EFFORT">High Activity (≥5)</option>
            </select>

            {/* Export CSV Button */}
            <button
              type="button"
              className="btn btn-sm d-flex align-items-center gap-1"
              style={{
                backgroundColor: isDark ? "rgba(127, 29, 29, 0.15)" : "#ffffff",
                color: isDark ? "#f87171" : "#7f1d1d",
                border: `1px solid ${isDark ? "rgba(127, 29, 29, 0.3)" : "#e2e8f0"}`,
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
                  <th style={{ minWidth: "160px" }}>SALES REP</th>
                  <th style={{ minWidth: "200px" }}>EMAIL & CONTACT</th>
                  <th style={{ minWidth: "140px" }} className="text-center">ACTIVITIES LOGGED</th>
                  <th style={{ minWidth: "130px" }} className="text-center">TASKS COMPLETED</th>
                  <th style={{ minWidth: "120px" }} className="text-center">DEALS WON</th>
                  <th style={{ minWidth: "130px" }} className="text-center">WON REVENUE</th>
                  <th style={{ minWidth: "140px" }} className="text-center">EFFICIENCY SCORE</th>
                  <th style={{ width: "80px" }} className="text-center">ACTION</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: "12.5px" }}>
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-4" style={{ color: textSub }}>
                      No sales reps match the search and filter criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((r, idx) => {
                    const rowNumber = (currentPage - 1) * pageSize + idx + 1;
                    const wonAmount = Number(r.won_revenue || 0);
                    const dealsCount = Number(r.deals_won || 0);
                    const actsCount = Number(r.activities_logged || 0);
                    const tasksCount = Number(r.tasks_completed || 0);
                    const initials = getRepInitials(r.sales_rep);

                    // Efficiency calculation
                    let efficiencyScore = 30;
                    let badgeColor = isDark ? "#8b949e" : "#64748b";
                    let badgeBg = isDark ? "#21262d" : "#f1f5f9";
                    let label = "Pipeline Nurturing";
                    let barColor = isDark ? "#30363d" : "#cbd5e1";

                    if (wonAmount > 0) {
                      efficiencyScore = 95;
                      badgeColor = isDark ? "#4ade80" : "#166534";
                      badgeBg = isDark ? "rgba(22, 163, 74, 0.2)" : "#f0fdf4";
                      label = "Top Performer";
                      barColor = "#16a34a";
                    } else if (actsCount > 0 || tasksCount > 0) {
                      efficiencyScore = 55;
                      badgeColor = isDark ? "#fb923c" : "#c2410c";
                      badgeBg = isDark ? "rgba(249, 115, 22, 0.2)" : "#fff7ed";
                      label = "Active Outreach";
                      barColor = "#f97316";
                    }

                    return (
                      <tr key={r.employee_id || idx} style={{ borderBottom: `1px solid ${cardBorder}` }}>
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
                                backgroundColor:
                                  wonAmount > 0
                                    ? (isDark ? "rgba(127, 29, 29, 0.25)" : "rgba(127, 29, 29, 0.08)")
                                    : (isDark ? "#21262d" : "#f1f5f9"),
                                color: wonAmount > 0 ? (isDark ? "#f87171" : "#7f1d1d") : (isDark ? "#c9d1d9" : "#475569"),
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "12px",
                                fontWeight: 700,
                                flexShrink: 0,
                              }}
                            >
                              {initials}
                            </span>
                            <div>
                              <span className="fw-semibold d-block" style={{ color: textTitle }}>
                                {r.sales_rep}
                              </span>
                              <span style={{ fontSize: "11px", color: textSub }}>
                                Rep #{r.employee_id}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div>
                            <div className="d-flex align-items-center gap-2" style={{ fontSize: "12px" }}>
                              <i className="ri-mail-line" style={{ fontSize: "13px", color: textSub }}></i>
                              <span style={{ color: textTitle }}>{r.email || "—"}</span>
                            </div>
                            <div className="d-flex align-items-center gap-2 font-monospace mt-1" style={{ fontSize: "11px", color: textSub }}>
                              <i className="ri-phone-line" style={{ fontSize: "12px" }}></i>
                              <span>{r.phone || "—"}</span>
                            </div>
                          </div>
                        </td>
                        <td className="text-center">
                          <span
                            style={{
                              backgroundColor: actsCount >= 5
                                ? (isDark ? "rgba(127, 29, 29, 0.25)" : "rgba(127, 29, 29, 0.08)")
                                : (isDark ? "#21262d" : "#f8fafc"),
                              color: actsCount >= 5 ? (isDark ? "#f87171" : "#7f1d1d") : textSub,
                              border: "1px solid",
                              borderColor: actsCount >= 5
                                ? (isDark ? "rgba(127, 29, 29, 0.4)" : "rgba(127, 29, 29, 0.2)")
                                : cardBorder,
                              fontSize: "11.5px",
                              fontWeight: 600,
                              padding: "3px 10px",
                              borderRadius: 0,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                            }}
                          >
                            {actsCount >= 5 ? (
                              <i className="ri-fire-fill text-danger" style={{ fontSize: "13px" }}></i>
                            ) : (
                              <i className="ri-phone-line" style={{ fontSize: "12px" }}></i>
                            )}
                            {actsCount} {actsCount === 1 ? "activity" : "activities"}
                          </span>
                        </td>
                        <td className="text-center">
                          <span
                            style={{
                              backgroundColor: tasksCount > 0
                                ? (isDark ? "rgba(22, 163, 74, 0.2)" : "#f0fdf4")
                                : (isDark ? "#21262d" : "#f8fafc"),
                              color: tasksCount > 0 ? (isDark ? "#4ade80" : "#166534") : textSub,
                              border: "1px solid",
                              borderColor: tasksCount > 0
                                ? (isDark ? "rgba(22, 163, 74, 0.4)" : "#bbf7d0")
                                : cardBorder,
                              fontSize: "11.5px",
                              fontWeight: 600,
                              padding: "3px 10px",
                              borderRadius: 0,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                            }}
                          >
                            <i className="ri-checkbox-circle-fill" style={{ fontSize: "12px" }}></i>
                            {tasksCount} completed
                          </span>
                        </td>
                        <td className="text-center">
                          <span
                            style={{
                              backgroundColor: dealsCount > 0
                                ? (isDark ? "rgba(22, 163, 74, 0.2)" : "#f0fdf4")
                                : (isDark ? "#21262d" : "#f8fafc"),
                              color: dealsCount > 0 ? (isDark ? "#4ade80" : "#166534") : textSub,
                              border: "1px solid",
                              borderColor: dealsCount > 0
                                ? (isDark ? "rgba(22, 163, 74, 0.4)" : "#bbf7d0")
                                : cardBorder,
                              fontSize: "11.5px",
                              fontWeight: 600,
                              padding: "3px 10px",
                              borderRadius: 0,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                            }}
                          >
                            <i
                              className={dealsCount > 0 ? "ri-vip-crown-fill" : "ri-indeterminate-circle-line"}
                              style={{ fontSize: "12px" }}
                            ></i>
                            {dealsCount} {dealsCount === 1 ? "deal won" : "deals won"}
                          </span>
                        </td>
                        <td className="text-center fw-bold font-monospace" style={{ fontSize: "13px", color: wonAmount > 0 ? (isDark ? "#f87171" : "#7f1d1d") : textSub }}>
                          {formatCurrency(wonAmount)}
                        </td>
                        <td className="text-center">
                          <div className="d-inline-flex flex-column" style={{ minWidth: "110px" }}>
                            <span
                              style={{
                                backgroundColor: badgeBg,
                                color: badgeColor,
                                fontSize: "11px",
                                fontWeight: 600,
                                padding: "2px 8px",
                                borderRadius: 0,
                                display: "inline-block",
                                width: "fit-content",
                                marginBottom: "5px",
                              }}
                            >
                              {label}
                            </span>
                            <div
                              className="progress"
                              style={{
                                height: "5px",
                                width: "100%",
                                backgroundColor: isDark ? "#21262d" : "#e2e8f0",
                                borderRadius: 0,
                                overflow: "hidden",
                              }}
                            >
                              <div
                                className="progress-bar"
                                role="progressbar"
                                style={{
                                  width: `${efficiencyScore}%`,
                                  backgroundColor: barColor,
                                  borderRadius: 0,
                                }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="text-center">
                          <div className="d-flex align-items-center justify-content-center gap-1">
                            <Link
                              to={`/crm/owners`}
                              className="btn btn-sm border p-1"
                              style={{
                                borderRadius: 0,
                                backgroundColor: subtleBg,
                                borderColor: subtleBorder,
                                color: textSub,
                                width: "28px",
                                height: "28px",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                              title="View Sales Rep Profile"
                            >
                              <i className="ri-user-3-line" style={{ fontSize: "14px" }}></i>
                            </Link>
                            <Link
                              to={`/crm/opportunities`}
                              className="btn btn-sm border p-1"
                              style={{
                                borderRadius: 0,
                                backgroundColor: subtleBg,
                                borderColor: subtleBorder,
                                color: isDark ? "#f87171" : "#7f1d1d",
                                width: "28px",
                                height: "28px",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                              title="View Assigned Opportunities"
                            >
                              <i className="ri-briefcase-4-line" style={{ fontSize: "14px" }}></i>
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
                  backgroundColor: subtleBg,
                  color: textTitle,
                  borderColor: subtleBorder,
                }}
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span style={{ fontSize: "11.5px", color: textSub }}>
                Showing {filteredRows.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{" "}
                {Math.min(currentPage * pageSize, filteredRows.length)} of {filteredRows.length} sales reps
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
                  color: textSub,
                  borderColor: subtleBorder,
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
                  color: textSub,
                  borderColor: subtleBorder,
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

      {/* ─── ROW 4: EXECUTIVE COACHING & PRODUCTIVITY INSIGHTS STRIP ─────────── */}
      <Card
        className="mb-4"
        style={{
          backgroundColor: cardBg,
          borderRadius: 0,
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
                  backgroundColor: isDark ? "rgba(217, 119, 6, 0.2)" : "#fffbeb",
                  border: `1px solid ${isDark ? "rgba(217, 119, 6, 0.4)" : "#fde68a"}`,
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
              <span className="fw-bold" style={{ fontSize: "13.5px", color: textTitle }}>
                Productivity & Scorecard Insights
              </span>
            </div>

            {/* Middle: 3 Key Insights */}
            <div
              className="d-flex flex-wrap align-items-center gap-3"
              style={{ fontSize: "12px", color: textSub }}
            >
              <div className="d-flex align-items-center gap-1.5">
                <i className="ri-flashlight-fill" style={{ color: "#7f1d1d" }}></i>
                <span>High activity volume strongly correlates with closed deals.</span>
              </div>
              <span className="d-none d-md-inline" style={{ color: cardBorder }}>|</span>
              <div className="d-flex align-items-center gap-1.5">
                <i className="ri-vip-crown-fill" style={{ color: "#d97706" }}></i>
                <span>
                  {topLeader
                    ? `${topLeader.sales_rep} leads team velocity with ${topLeader.activities_logged || 0} logged touchpoints and ${formatCurrency(topLeader.won_revenue || 0)} won.`
                    : "No logged sales activities recorded for this period."}
                </span>
              </div>
              <span className="d-none d-md-inline" style={{ color: cardBorder }}>|</span>
              <div className="d-flex align-items-center gap-1.5">
                <i className="ri-line-chart-line" style={{ color: "#16a34a" }}></i>
                <span>
                  {rawRows.filter((r) => Number(r.won_revenue || 0) === 0).length > 0
                    ? `Follow-up coaching recommended for ${rawRows.filter((r) => Number(r.won_revenue || 0) === 0).map((r) => r.sales_rep).join(" and ")}.`
                    : "All active team members have logged performance."}
                </span>
              </div>
            </div>

            {/* Right: SoftOnCloud Slogan */}
            <div className="d-none d-lg-flex align-items-center gap-2 text-end">
              <div>
                <span className="fw-bold d-block" style={{ fontSize: "11.5px", color: textTitle }}>
                  Effort. Velocity. Conversion.
                </span>
                <span style={{ fontSize: "10.5px", color: textSub }}>
                  Drive repeatable sales performance.
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
                <i className="ri-medal-fill"></i>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default RepProductivityScorecardView;
