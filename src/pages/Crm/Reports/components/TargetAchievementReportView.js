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

const TargetAchievementReportView = ({
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
  const [attainmentFilter, setAttainmentFilter] = useState("ALL");
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
  const totalTargetAmount = Number(
    summary.total_target_amount ??
      rawRows.reduce((a, b) => a + Number(b.target_amount || 0), 0) ??
      0
  );
  const totalWonAchieved = Number(
    summary.total_won_achieved ??
      rawRows.reduce((a, b) => a + Number(b.won_revenue || 0), 0) ??
      0
  );
  const quotaGapAmount = Number(
    summary.quota_gap_amount ??
      Math.max(0, totalTargetAmount - totalWonAchieved) ??
      0
  );
  const teamAttainmentPct = Number(
    summary.team_attainment_pct ??
      (totalTargetAmount > 0
        ? Math.round((totalWonAchieved / totalTargetAmount) * 100)
        : 0)
  );

  // Top Attainment Rep
  const topAttainmentRep = useMemo(() => {
    if (rawRows.length === 0) return null;
    return [...rawRows].sort(
      (a, b) => Number(b.attainment_pct || 0) - Number(a.attainment_pct || 0)
    )[0];
  }, [rawRows]);

  // Filtered rows for client search & filter
  const filteredRows = useMemo(() => {
    let result = rawRows;
    if (attainmentFilter === "ACHIEVED") {
      result = result.filter((r) => Number(r.attainment_pct || 0) > 0);
    } else if (attainmentFilter === "GAP") {
      result = result.filter((r) => Number(r.attainment_pct || 0) === 0);
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
  }, [rawRows, attainmentFilter, searchTerm]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  // Helper for Rep Initials
  const getRepInitials = (name) => {
    const parts = String(name || "").trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (name || "SR").slice(0, 2).toUpperCase();
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

  const wonSparkline = useMemo(
    () => makeSparklineConfig([0, 100000, 150000, 250000], "#7f1d1d", "#7f1d1d"),
    []
  );
  const attainmentSparkline = useMemo(
    () => makeSparklineConfig([0, 6.7, 10.0, 16.7], "#2563eb", "#2563eb"),
    []
  );
  const gapSparkline = useMemo(
    () => makeSparklineConfig([1500000, 1400000, 1350000, 1250000], "#d97706", "#d97706"),
    []
  );
  const targetSparkline = useMemo(
    () => makeSparklineConfig([1500000, 1500000, 1500000, 1500000], "#475569", "#475569"),
    []
  );

  // 1. Dual Clustered Column Chart: Target Quota vs Won Revenue
  const clusteredColumnConfig = useMemo(() => {
    const list =
      chartData.length > 0
        ? chartData
        : rawRows.length > 0
        ? rawRows
        : [];

    const categories = list.map((c) => c.sales_rep || "Sales Rep");
    const targetData = list.map((c) => Number(c.target_amount || 0));
    const wonData = list.map((c) => Number(c.won_revenue ?? c.achieved_amount ?? 0));

    const maxVal = Math.max(...targetData, ...wonData, 500000);
    const yMax = Math.ceil((maxVal * 1.25) / 100000) * 100000; // e.g. 650000

    return {
      series: [
        {
          name: "Target Quota",
          data: targetData,
        },
        {
          name: "Won Revenue",
          data: wonData,
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
            columnWidth: "46%",
            borderRadius: 4,
            dataLabels: {
              position: "top",
            },
          },
        },
        colors: ["#94a3b8", "#7f1d1d"], // Slate Gray (Target), SoftOnCloud Maroon (Won)
        dataLabels: {
          enabled: true,
          offsetY: -16,
          style: {
            fontSize: "10.5px",
            fontFamily: "Inter, sans-serif",
            fontWeight: 600,
            colors: ["#1e293b"],
          },
          formatter: (val) => {
            if (!val || val === 0) return "";
            if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
            return `₹${val.toLocaleString()}`;
          },
        },
        stroke: {
          show: true,
          width: 2,
          colors: ["transparent"],
        },
        grid: {
          borderColor: "#f1f5f9",
          strokeDashArray: 3,
          xaxis: { lines: { show: false } },
          yaxis: { lines: { show: true } },
          padding: { top: 25, bottom: 0, left: 10, right: 10 },
        },
        xaxis: {
          categories,
          labels: {
            style: {
              colors: "#334155",
              fontSize: "12px",
              fontFamily: "Inter, sans-serif",
              fontWeight: 600,
            },
          },
          axisBorder: { color: "#e2e8f0" },
          axisTicks: { show: false },
        },
        yaxis: {
          min: 0,
          max: yMax,
          forceNiceScale: false,
          tickAmount: 4,
          labels: {
            style: {
              colors: "#64748b",
              fontSize: "11px",
              fontFamily: "Inter, sans-serif",
            },
            formatter: (val) => {
              if (val >= 100000) return `₹${Math.round(val / 100000)}L`;
              return `₹${val}`;
            },
          },
          axisBorder: { show: true, color: "#e2e8f0" },
          axisTicks: { show: false },
        },
        legend: {
          position: "top",
          horizontalAlign: "right",
          fontSize: "11.5px",
          fontFamily: "Inter, sans-serif",
          fontWeight: 500,
          offsetY: -5,
          markers: {
            radius: 2,
            width: 10,
            height: 10,
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
  }, [chartData, rawRows]);

  // 2. Team Quota Attainment Donut Gauge
  const attainmentDonutConfig = useMemo(() => {
    return {
      series: [totalWonAchieved, quotaGapAmount],
      options: {
        chart: {
          type: "donut",
          height: 135,
          sparkline: { enabled: true },
        },
        labels: ["Won Revenue", "Quota Shortfall"],
        colors: ["#7f1d1d", "#f1f5f9"], // Maroon (Achieved), Light Slate (Gap)
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
            formatter: (val) => formatCurrency(val),
          },
        },
      },
    };
  }, [totalWonAchieved, quotaGapAmount]);

  return (
    <div className="target-achievement-report-view">
      {/* ─── ROW 1: EXECUTIVE QUOTA ATTAINMENT KPI CARDS (4 CARDS) ──────────── */}
      <Row className="g-3 mb-4">
        {/* Card 1: Won Revenue Achieved */}
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
                  <i className="ri-funds-box-fill"></i>
                </div>
                <div>
                  <span
                    className="text-muted text-uppercase fw-semibold d-block mb-1"
                    style={{ fontSize: "10.5px", letterSpacing: "0.4px" }}
                  >
                    Won Revenue Achieved
                  </span>
                  <div
                    className="fw-bold text-dark font-monospace"
                    style={{
                      fontSize: "22px",
                      letterSpacing: "-0.5px",
                      lineHeight: "1.1",
                    }}
                  >
                    {formatCurrency(totalWonAchieved)}
                  </div>
                  <div className="d-flex align-items-center gap-1 mt-1">
                    <span style={{ color: "#16a34a", fontSize: "11px", fontWeight: 600 }}>
                      <i className="ri-checkbox-circle-fill"></i> Closed Won
                    </span>
                    <span className="text-muted" style={{ fontSize: "11px" }}>
                      Sales achievement
                    </span>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>

        {/* Card 2: Team Quota Attainment */}
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
                  <i className="ri-percent-fill"></i>
                </div>
                <div>
                  <span
                    className="text-muted text-uppercase fw-semibold d-block mb-1"
                    style={{ fontSize: "10.5px", letterSpacing: "0.4px" }}
                  >
                    Team Quota Attainment
                  </span>
                  <div
                    className="fw-bold text-dark font-monospace"
                    style={{
                      fontSize: "22px",
                      letterSpacing: "-0.5px",
                      lineHeight: "1.1",
                    }}
                  >
                    {teamAttainmentPct.toFixed(1)}%
                  </div>
                  <div className="d-flex align-items-center gap-1 mt-1">
                    <span style={{ color: "#2563eb", fontSize: "11px", fontWeight: 600 }}>
                      <i className="ri-speed-up-fill"></i> Pacing
                    </span>
                    <span className="text-muted" style={{ fontSize: "11px" }}>
                      Target: ₹15 Lakhs
                    </span>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>

        {/* Card 3: Quota Shortfall / Gap */}
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
                  <i className="ri-compass-3-fill"></i>
                </div>
                <div>
                  <span
                    className="text-muted text-uppercase fw-semibold d-block mb-1"
                    style={{ fontSize: "10.5px", letterSpacing: "0.4px" }}
                  >
                    Quota Shortfall / Gap
                  </span>
                  <div
                    className="fw-bold text-dark font-monospace"
                    style={{
                      fontSize: "22px",
                      letterSpacing: "-0.5px",
                      lineHeight: "1.1",
                    }}
                  >
                    {formatCurrency(quotaGapAmount)}
                  </div>
                  <div className="d-flex align-items-center gap-1 mt-1">
                    <span style={{ color: "#d97706", fontSize: "11px", fontWeight: 600 }}>
                      <i className="ri-time-line"></i> To Quota
                    </span>
                    <span className="text-muted" style={{ fontSize: "11px" }}>
                      Pipeline needed
                    </span>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>

        {/* Card 4: Total Target Quota */}
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
                  <i className="ri-flag-fill"></i>
                </div>
                <div>
                  <span
                    className="text-muted text-uppercase fw-semibold d-block mb-1"
                    style={{ fontSize: "10.5px", letterSpacing: "0.4px" }}
                  >
                    Total Target Quota
                  </span>
                  <div
                    className="fw-bold text-dark font-monospace"
                    style={{
                      fontSize: "22px",
                      letterSpacing: "-0.5px",
                      lineHeight: "1.1",
                    }}
                  >
                    {formatCurrency(totalTargetAmount)}
                  </div>
                  <div className="d-flex align-items-center gap-1 mt-1">
                    <span style={{ color: "#475569", fontSize: "11px", fontWeight: 600 }}>
                      {rawRows.length} Reps
                    </span>
                    <span className="text-muted" style={{ fontSize: "11px" }}>
                      Allocated target
                    </span>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* ─── ROW 2: COMPARATIVE COLUMN CHART + ATTAINMENT LEADERBOARD ───────── */}
      <Row className="g-3 mb-4">
        {/* Col 1: Target Quota vs Won Revenue (Col lg=7) */}
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
                  className="ri-bar-chart-2-fill"
                  style={{ color: "#7f1d1d", fontSize: "16px" }}
                ></i>
                <span className="fw-bold text-dark" style={{ fontSize: "13.5px" }}>
                  Target Quota vs Won Revenue
                </span>
              </div>
              <span className="badge bg-light text-muted border" style={{ fontSize: "11px" }}>
                Target vs Actual Achievement
              </span>
            </div>

            <CardBody className="p-3 pt-2 d-flex flex-column justify-content-center flex-grow-1">
              <ReactApexChart
                options={clusteredColumnConfig.options}
                series={clusteredColumnConfig.series}
                type="bar"
                height={250}
              />
            </CardBody>
          </Card>
        </Col>

        {/* Col 2: Attainment Donut Gauge & Leaderboard (Col lg=5) */}
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
                  Attainment Leaderboard
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
                Team Pace: {teamAttainmentPct.toFixed(1)}%
              </span>
            </div>

            <CardBody className="p-3 d-flex flex-column justify-content-between flex-grow-1">
              {/* Donut and Legend Top Row */}
              <div className="d-flex align-items-center gap-3 mb-3">
                {/* Donut Chart with Centered Overlay */}
                <div
                  className="position-relative d-flex align-items-center justify-content-center"
                  style={{ width: "135px", height: "135px", flexShrink: 0 }}
                >
                  <ReactApexChart
                    options={attainmentDonutConfig.options}
                    series={attainmentDonutConfig.series}
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
                        color: "#0f172a",
                        fontFamily: "Inter, sans-serif",
                        lineHeight: "1.1",
                      }}
                    >
                      {teamAttainmentPct.toFixed(1)}%
                    </div>
                    <div
                      style={{
                        fontSize: "10.5px",
                        color: "#7f1d1d",
                        fontWeight: 600,
                        fontFamily: "Inter, sans-serif",
                        marginTop: "2px",
                      }}
                    >
                      Team Attained
                    </div>
                  </div>
                </div>

                {/* Donut KPI Summary Cards */}
                <div className="flex-grow-1 d-flex flex-column gap-2">
                  <div
                    className="p-2 border"
                    style={{
                      backgroundColor: "rgba(127, 29, 29, 0.04)",
                      borderColor: "rgba(127, 29, 29, 0.15)",
                      borderRadius: "4px",
                    }}
                  >
                    <div className="d-flex align-items-center justify-content-between">
                      <span className="d-flex align-items-center gap-1.5 text-muted" style={{ fontSize: "11.5px" }}>
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#7f1d1d" }}></span>
                        Won Achieved
                      </span>
                      <span className="fw-bold font-monospace text-dark" style={{ fontSize: "12px" }}>
                        {formatCurrency(totalWonAchieved)}
                      </span>
                    </div>
                  </div>

                  <div
                    className="p-2 border"
                    style={{
                      backgroundColor: "#fffbeb",
                      borderColor: "#fde68a",
                      borderRadius: "4px",
                    }}
                  >
                    <div className="d-flex align-items-center justify-content-between">
                      <span className="d-flex align-items-center gap-1.5 text-muted" style={{ fontSize: "11.5px" }}>
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#d97706" }}></span>
                        Quota Shortfall
                      </span>
                      <span className="fw-bold font-monospace text-dark" style={{ fontSize: "12px" }}>
                        {formatCurrency(quotaGapAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rep Leaderboard List */}
              <div className="d-flex flex-column gap-1.5">
                {rawRows.map((r, i) => {
                  const won = Number(r.won_revenue || 0);
                  const target = Number(r.target_amount || 500000);
                  const pct = Number(r.attainment_pct || 0);
                  const isLeader = i === 0 && won > 0;
                  const initials = getRepInitials(r.sales_rep);

                  return (
                    <div
                      key={r.employee_id || i}
                      className="p-2 border d-flex align-items-center justify-content-between"
                      style={{
                        backgroundColor: isLeader ? "rgba(127, 29, 29, 0.03)" : "#ffffff",
                        borderColor: isLeader ? "rgba(127, 29, 29, 0.15)" : "#e2e8f0",
                        borderRadius: "4px",
                      }}
                    >
                      <div className="d-flex align-items-center gap-2">
                        <span
                          style={{
                            width: "28px",
                            height: "28px",
                            borderRadius: "4px",
                            backgroundColor: isLeader ? "#7f1d1d" : "#f1f5f9",
                            color: isLeader ? "#ffffff" : "#475569",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "11px",
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {initials}
                        </span>
                        <div>
                          <div className="d-flex align-items-center gap-1.5">
                            <span className="text-dark fw-semibold" style={{ fontSize: "12px" }}>
                              {r.sales_rep}
                            </span>
                            {isLeader && (
                              <i className="ri-vip-crown-fill" style={{ color: "#d97706", fontSize: "12px" }}></i>
                            )}
                          </div>
                          <span className="text-muted font-monospace" style={{ fontSize: "10.5px" }}>
                            {formatCurrency(won)} of {formatCurrency(target)}
                          </span>
                        </div>
                      </div>

                      <div className="d-flex align-items-center gap-2">
                        <span
                          className="badge font-monospace"
                          style={{
                            backgroundColor: pct >= 50 ? "#f0fdf4" : (pct > 0 ? "#fffbeb" : "#fef2f2"),
                            color: pct >= 50 ? "#166534" : (pct > 0 ? "#b45309" : "#991b1b"),
                            border: "1px solid",
                            borderColor: pct >= 50 ? "#bbf7d0" : (pct > 0 ? "#fde68a" : "#fecaca"),
                            fontSize: "10.5px",
                            padding: "2px 6px",
                          }}
                        >
                          {pct.toFixed(1)}%
                        </span>
                        <div
                          className="progress"
                          style={{
                            width: "55px",
                            height: "5px",
                            backgroundColor: "#e2e8f0",
                            borderRadius: "2px",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            className="progress-bar"
                            role="progressbar"
                            style={{
                              width: `${Math.min(100, pct)}%`,
                              backgroundColor: pct >= 50 ? "#16a34a" : "#f97316",
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* ─── ROW 3: DETAILED QUOTA ATTAINMENT LEDGER (TABLE) ──────────────────── */}
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
              Detailed Quota Attainment Ledger
            </h6>
            <span className="text-muted small" style={{ fontSize: "11.5px" }}>
              Showing {filteredRows.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{" "}
              {Math.min(currentPage * pageSize, filteredRows.length)} of {rawRows.length} sales reps
            </span>
          </div>

          <div className="d-flex align-items-center gap-2 flex-wrap">
            {/* Search Input */}
            <div className="position-relative" style={{ width: "230px" }}>
              <Input
                type="text"
                placeholder="Search sales rep..."
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

            {/* Attainment Filter Dropdown */}
            <select
              className="form-select form-select-sm"
              style={{
                width: "155px",
                borderRadius: "4px",
                fontSize: "12px",
                borderColor: "#cbd5e1",
              }}
              value={attainmentFilter}
              onChange={(e) => setAttainmentFilter(e.target.value)}
            >
              <option value="ALL">All Sales Reps</option>
              <option value="ACHIEVED">Achieved &gt; 0%</option>
              <option value="GAP">Zero Attainment</option>
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
                  <th style={{ minWidth: "160px" }}>SALES REP</th>
                  <th style={{ minWidth: "140px" }} className="text-center">TARGET QUOTA</th>
                  <th style={{ minWidth: "140px" }} className="text-center">WON REVENUE</th>
                  <th style={{ minWidth: "140px" }} className="text-center">QUOTA SHORTFALL (GAP)</th>
                  <th style={{ minWidth: "140px" }} className="text-center">ATTAINMENT PROGRESS</th>
                  <th style={{ minWidth: "130px" }} className="text-center">PACING STATUS</th>
                  <th style={{ width: "80px" }} className="text-center">ACTION</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: "12.5px" }}>
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-4 text-muted">
                      No sales reps match the search and filter criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((r, idx) => {
                    const rowNumber = (currentPage - 1) * pageSize + idx + 1;
                    const wonAmount = Number(r.won_revenue || 0);
                    const targetAmount = Number(r.target_amount || 500000);
                    const gapAmount = Number(r.gap_amount ?? Math.max(0, targetAmount - wonAmount));
                    const pct = Number(r.attainment_pct || 0);
                    const initials = getRepInitials(r.sales_rep);

                    let statusLabel = "Pipeline Needed";
                    let statusColor = "#991b1b";
                    let statusBg = "#fef2f2";
                    let statusBorder = "#fecaca";

                    if (pct >= 50) {
                      statusLabel = "On Track";
                      statusColor = "#166534";
                      statusBg = "#f0fdf4";
                      statusBorder = "#bbf7d0";
                    } else if (pct > 0) {
                      statusLabel = "Active In Pace";
                      statusColor = "#b45309";
                      statusBg = "#fffbeb";
                      statusBorder = "#fde68a";
                    }

                    return (
                      <tr key={r.employee_id || idx}>
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
                                backgroundColor:
                                  wonAmount > 0 ? "rgba(127, 29, 29, 0.08)" : "#f1f5f9",
                                color: wonAmount > 0 ? "#7f1d1d" : "#475569",
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
                              <span className="fw-semibold text-dark d-block">
                                {r.sales_rep}
                              </span>
                              <span className="text-muted" style={{ fontSize: "11px" }}>
                                Rep #{r.employee_id}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="text-center font-monospace text-muted" style={{ fontSize: "12.5px" }}>
                          {formatCurrency(targetAmount)}
                        </td>
                        <td className="text-center fw-bold font-monospace" style={{ fontSize: "13px", color: wonAmount > 0 ? "#7f1d1d" : "#64748b" }}>
                          {formatCurrency(wonAmount)}
                        </td>
                        <td className="text-center font-monospace" style={{ fontSize: "12.5px", color: gapAmount > 0 ? "#d97706" : "#16a34a" }}>
                          {formatCurrency(gapAmount)}
                        </td>
                        <td className="text-center">
                          <div className="d-inline-flex flex-column" style={{ minWidth: "110px" }}>
                            <div className="d-flex align-items-center justify-content-between mb-1">
                              <span className="fw-bold font-monospace text-dark" style={{ fontSize: "11.5px" }}>
                                {pct.toFixed(1)}%
                              </span>
                              <span className="text-muted" style={{ fontSize: "10.5px" }}>
                                of quota
                              </span>
                            </div>
                            <div
                              className="progress"
                              style={{
                                height: "5px",
                                width: "100%",
                                backgroundColor: "#e2e8f0",
                                borderRadius: "2px",
                                overflow: "hidden",
                              }}
                            >
                              <div
                                className="progress-bar"
                                role="progressbar"
                                style={{
                                  width: `${Math.min(100, pct)}%`,
                                  backgroundColor: pct >= 50 ? "#16a34a" : (pct > 0 ? "#f97316" : "#cbd5e1"),
                                }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="text-center">
                          <span
                            style={{
                              backgroundColor: statusBg,
                              color: statusColor,
                              border: "1px solid",
                              borderColor: statusBorder,
                              fontSize: "11px",
                              fontWeight: 600,
                              padding: "2.5px 8px",
                              borderRadius: "4px",
                              display: "inline-block",
                            }}
                          >
                            {statusLabel}
                          </span>
                        </td>
                        <td className="text-center">
                          <div className="d-flex align-items-center justify-content-center gap-1">
                            <Link
                              to={`/crm/owners`}
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
                              title="View Sales Rep Profile"
                            >
                              <i className="ri-user-3-line" style={{ fontSize: "14px" }}></i>
                            </Link>
                            <Link
                              to={`/crm/opportunities`}
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
                              title="View Assigned Opportunities"
                            >
                              <i className="ri-funds-line" style={{ fontSize: "14px" }}></i>
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
                {Math.min(currentPage * pageSize, filteredRows.length)} of {filteredRows.length} sales reps
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

      {/* ─── ROW 4: QUOTA PACING & ATTAINMENT STRIP ─────────────────────────── */}
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
                <i className="ri-trophy-line"></i>
              </div>
              <span className="fw-bold text-dark" style={{ fontSize: "13.5px" }}>
                Quota Pacing & Attainment Insights
              </span>
            </div>

            {/* Middle: 3 Key Insights */}
            <div
              className="d-flex flex-wrap align-items-center gap-3 text-muted"
              style={{ fontSize: "12px" }}
            >
              <div className="d-flex align-items-center gap-1.5">
                <i className="ri-funds-box-fill" style={{ color: "#7f1d1d" }}></i>
                <span>Team achieved {formatCurrency(totalWonAchieved)} ({teamAttainmentPct}%) toward {formatCurrency(totalTargetAmount)} target quota.</span>
              </div>
              <span className="d-none d-md-inline text-muted">|</span>
              <div className="d-flex align-items-center gap-1.5">
                <i className="ri-vip-crown-fill" style={{ color: "#d97706" }}></i>
                <span>
                  {topAttainmentRep
                    ? `${topAttainmentRep.sales_rep} leads with ${topAttainmentRep.attainment_pct || 0}% attainment and ${formatCurrency(topAttainmentRep.won_revenue || 0)} won.`
                    : "No team targets established for this period."}
                </span>
              </div>
              <span className="d-none d-md-inline text-muted">|</span>
              <div className="d-flex align-items-center gap-1.5">
                <i className="ri-alert-fill" style={{ color: "#d97706" }}></i>
                <span>
                  {quotaGapAmount > 0
                    ? `${formatCurrency(quotaGapAmount)} remaining quota gap requires pipeline acceleration.`
                    : "Target quota successfully achieved."}
                </span>
              </div>
            </div>

            {/* Right: SoftOnCloud Slogan */}
            <div className="d-none d-lg-flex align-items-center gap-2 text-end">
              <div>
                <span className="fw-bold text-dark d-block" style={{ fontSize: "11.5px" }}>
                  Target. Velocity. Attainment.
                </span>
                <span className="text-muted" style={{ fontSize: "10.5px" }}>
                  Drive predictable revenue growth.
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
                <i className="ri-award-fill"></i>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default TargetAchievementReportView;

