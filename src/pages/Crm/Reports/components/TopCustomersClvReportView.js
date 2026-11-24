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

const TopCustomersClvReportView = ({
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
  const [dealFilter, setDealFilter] = useState("ALL");
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
  const totalPayingAccounts = Number(
    summary.total_paying_accounts ?? rawRows.length ?? 0
  );
  const totalLifetimeRevenue = Number(
    summary.total_lifetime_revenue ??
      rawRows.reduce((a, b) => a + Number(b.lifetime_revenue || 0), 0) ??
      0
  );
  const avgRevenuePerAccount =
    totalPayingAccounts > 0
      ? Math.round(totalLifetimeRevenue / totalPayingAccounts)
      : 0;

  // Top Customer
  const topCustomer = useMemo(() => {
    if (rawRows.length === 0) return null;
    return [...rawRows].sort(
      (a, b) => Number(b.lifetime_revenue || 0) - Number(a.lifetime_revenue || 0)
    )[0];
  }, [rawRows]);

  // Filtered rows for client search & deal filter
  const filteredRows = useMemo(() => {
    let result = rawRows;
    if (dealFilter !== "ALL") {
      result = result.filter((r) => {
        const cnt = Number(r.deals_won_count || 0);
        if (dealFilter === "1") return cnt === 1;
        if (dealFilter === "2+") return cnt >= 2;
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
  }, [rawRows, dealFilter, searchTerm]);

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
        width: 95,
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

  const revenueSparkline = useMemo(() => makeSparklineConfig([100000, 150000, 200000, 250000], "#7f1d1d", "#7f1d1d"), []);
  const accountsSparkline = useMemo(() => makeSparklineConfig([1, 1, 1, 1], "#2563eb", "#2563eb"), []);

  // 1. Horizontal Bar Chart: Top Customer Revenue Ranking
  const horizontalBarConfig = useMemo(() => {
    const list =
      chartData.length > 0
        ? chartData
        : rawRows.map((r) => ({
            customer_name: r.customer_name || r.company_name,
            total_revenue: r.lifetime_revenue,
          }));
    const categories = list.map((c) => c.customer_name || `Account #${c.account_id}`);
    const data = list.map((c) => Number(c.total_revenue || 0));
    const maxVal = Math.max(...data, 100000);
    const xMax = Math.ceil((maxVal * 1.25) / 50000) * 50000;

    return {
      series: [
        {
          name: "Lifetime Revenue",
          data,
        },
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
            horizontal: true,
            barHeight: "35%",
            borderRadius: 0,
            dataLabels: {
              position: "top",
            },
          },
        },
        colors: [isDark ? "#dc2626" : "#7f1d1d"], // SoftOnCloud Maroon/Red
        dataLabels: {
          enabled: true,
          textAnchor: "start",
          offsetX: 10,
          style: {
            fontSize: "11px",
            fontFamily: "Inter, sans-serif",
            fontWeight: 600,
            colors: [textTitle],
          },
          formatter: (val) => formatCurrency(val),
        },
        grid: {
          borderColor: cardBorder,
          strokeDashArray: 3,
          xaxis: { lines: { show: true } },
          yaxis: { lines: { show: false } },
          padding: { top: 10, bottom: 0, left: 10, right: 30 },
        },
        xaxis: {
          categories,
          max: xMax,
          labels: {
            style: {
              colors: textSub,
              fontSize: "11px",
              fontFamily: "Inter, sans-serif",
            },
            formatter: (val) => formatCurrency(val),
          },
          axisBorder: { color: cardBorder },
          axisTicks: { show: false },
        },
        yaxis: {
          labels: {
            style: {
              colors: textSub,
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
            formatter: (val) => formatCurrency(val),
          },
        },
      },
    };
  }, [chartData, rawRows, isDark, textTitle, textSub, cardBorder]);

  // 2. Dynamic Revenue Tier Calculation & Donut Chart
  const tierCounts = useMemo(() => {
    let t1 = 0, t2 = 0, t3 = 0;
    rawRows.forEach((r) => {
      const rev = Number(r.lifetime_revenue || 0);
      if (rev >= 200000) t1++;
      else if (rev >= 100000) t2++;
      else t3++;
    });
    const total = t1 + t2 + t3 || 0;
    return {
      t1,
      t2,
      t3,
      total,
      t1Pct: total > 0 ? Math.round((t1 / total) * 100) : 0,
      t2Pct: total > 0 ? Math.round((t2 / total) * 100) : 0,
      t3Pct: total > 0 ? Math.round((t3 / total) * 100) : 0,
    };
  }, [rawRows]);

  const tierDonutConfig = useMemo(() => {
    return {
      series: [tierCounts.t1, tierCounts.t2, tierCounts.t3],
      options: {
        chart: {
          type: "donut",
          height: 160,
          sparkline: { enabled: true },
        },
        labels: ["Tier 1 (> ₹2L)", "Tier 2 (₹1L - ₹2L)", "Tier 3 (< ₹1L)"],
        colors: [isDark ? "#dc2626" : "#7f1d1d", isDark ? "#38bdf8" : "#f87171", isDark ? "#64748b" : "#cbd5e1"],
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
            formatter: (val) => `${val} accounts`,
          },
        },
      },
    };
  }, [tierCounts, isDark, cardBg]);

  return (
    <div className="top-customers-clv-report-view">
      {/* ─── ROW 1: EXECUTIVE KPI SUMMARY (3 CARDS) ─────────────────────────── */}
      <Row className="g-3 mb-4">
        {/* Card 1: Total Lifetime Revenue (CLV) */}
        <Col lg={4} md={6}>
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
              <div className="d-flex align-items-center gap-3">
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: 0,
                    backgroundColor: isDark ? "rgba(127, 29, 29, 0.25)" : "rgba(127, 29, 29, 0.08)",
                    color: isDark ? "#f87171" : "#7f1d1d",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "22px",
                    flexShrink: 0,
                  }}
                >
                  <i className="ri-vip-crown-fill"></i>
                </div>
                <div>
                  <span
                    className="text-uppercase fw-semibold d-block mb-1"
                    style={{ fontSize: "11px", letterSpacing: "0.4px", color: textSub }}
                  >
                    Total Lifetime Revenue (CLV)
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
                    {formatCurrency(totalLifetimeRevenue)}
                  </div>
                  <div className="d-flex align-items-center gap-1 mt-1">
                    <span style={{ color: "#16a34a", fontSize: "11px", fontWeight: 600 }}>
                      <i className="ri-checkbox-circle-fill"></i> Closed Won
                    </span>
                    <span style={{ fontSize: "11px", color: textSub }}>
                      Realized client value
                    </span>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>

        {/* Card 2: Active Paying Customers */}
        <Col lg={4} md={6}>
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
              <div className="d-flex align-items-center gap-3">
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: 0,
                    backgroundColor: isDark ? "rgba(37, 99, 235, 0.2)" : "#eff6ff",
                    color: isDark ? "#60a5fa" : "#2563eb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "22px",
                    flexShrink: 0,
                  }}
                >
                  <i className="ri-community-fill"></i>
                </div>
                <div>
                  <span
                    className="text-uppercase fw-semibold d-block mb-1"
                    style={{ fontSize: "11px", letterSpacing: "0.4px", color: textSub }}
                  >
                    Active Paying Customers
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
                    {totalPayingAccounts}
                  </div>
                  <div className="d-flex align-items-center gap-1 mt-1">
                    <span style={{ color: isDark ? "#60a5fa" : "#2563eb", fontSize: "11px", fontWeight: 600 }}>
                      <i className="ri-repeat-line"></i> 100%
                    </span>
                    <span style={{ fontSize: "11px", color: textSub }}>
                      Repeat business ready
                    </span>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>

        {/* Card 3: Avg Revenue Per Customer (ARPU) */}
        <Col lg={4} md={12}>
          <Card
            className="h-100"
            style={{
              backgroundColor: cardBg,
              borderRadius: 0,
              border: `1px solid ${cardBorder}`,
              boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
            }}
          >
            <CardBody className="p-3 d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-3">
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: 0,
                    backgroundColor: isDark ? "rgba(217, 119, 6, 0.2)" : "#fffbeb",
                    color: isDark ? "#fbbf24" : "#d97706",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "22px",
                    flexShrink: 0,
                  }}
                >
                  <i className="ri-coins-fill"></i>
                </div>
                <div>
                  <span
                    className="text-uppercase fw-semibold d-block mb-1"
                    style={{ fontSize: "11px", letterSpacing: "0.4px", color: textSub }}
                  >
                    Avg Revenue Per Customer (ARPU)
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
                    {formatCurrency(avgRevenuePerAccount)}
                  </div>
                  <div className="d-flex align-items-center gap-1 mt-1">
                    <span style={{ color: isDark ? "#fbbf24" : "#d97706", fontSize: "11px", fontWeight: 600 }}>
                      <i className="ri-star-fill"></i> Tier 1
                    </span>
                    <span style={{ fontSize: "11px", color: textSub }}>
                      Enterprise customer tier
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
                  border: `1px solid ${subtleBorder}`,
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
      </Row>

      {/* ─── ROW 2: RANKING CHART + TIER DONUT + VALUE INSIGHTS ─────────────── */}
      <Row className="g-3 mb-4">
        {/* Col 1: Top Customer Revenue Ranking (Col lg=5) */}
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
              className="p-3 border-bottom d-flex flex-wrap align-items-center justify-content-between gap-2"
              style={{ backgroundColor: cardBg, borderColor: cardBorder }}
            >
              <div className="d-flex align-items-center gap-2">
                <i
                  className="ri-bar-chart-horizontal-fill"
                  style={{ color: "#7f1d1d", fontSize: "16px" }}
                ></i>
                <span className="fw-bold" style={{ fontSize: "13.5px", color: textTitle }}>
                  Top Customer Revenue Ranking
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
                By Realized Won Revenue
              </span>
            </div>

            <CardBody className="p-3 pt-2 d-flex flex-column justify-content-center flex-grow-1">
              <ReactApexChart
                options={horizontalBarConfig.options}
                series={horizontalBarConfig.series}
                type="bar"
                height={235}
              />
            </CardBody>
          </Card>
        </Col>

        {/* Col 2: Revenue Tier & Contribution (Col lg=4) */}
        <Col lg={4} md={6}>
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
              className="p-3 border-bottom d-flex align-items-center gap-2"
              style={{ backgroundColor: cardBg, borderColor: cardBorder }}
            >
              <i
                className="ri-pie-chart-2-line"
                style={{ color: "#7f1d1d", fontSize: "16px" }}
              ></i>
              <span className="fw-bold" style={{ fontSize: "13.5px", color: textTitle }}>
                Revenue Tier & Contribution
              </span>
            </div>

            <CardBody className="p-3 d-flex align-items-center justify-content-between flex-grow-1">
              {/* Donut Chart with Centered Overlay */}
              <div
                className="position-relative d-flex align-items-center justify-content-center"
                style={{ width: "150px", height: "150px", flexShrink: 0 }}
              >
                <ReactApexChart
                  options={tierDonutConfig.options}
                  series={tierDonutConfig.series}
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
                      fontSize: "20px",
                      fontWeight: 700,
                      color: textTitle,
                      fontFamily: "Inter, sans-serif",
                      lineHeight: "1.1",
                    }}
                  >
                    {tierCounts.t1Pct}%
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: isDark ? "#f87171" : "#7f1d1d",
                      fontWeight: 600,
                      fontFamily: "Inter, sans-serif",
                      marginTop: "2px",
                    }}
                  >
                    Tier 1
                  </div>
                </div>
              </div>

              {/* Legend with Tiers */}
              <div
                className="d-flex flex-column justify-content-center gap-2 ps-3 flex-grow-1"
                style={{ fontSize: "12px" }}
              >
                <div className="d-flex align-items-center justify-content-between">
                  <span className="d-flex align-items-center gap-2">
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#7f1d1d" }}></span>
                    <span style={{ color: textSub, fontWeight: 500 }}>&gt; ₹2 Lakhs</span>
                  </span>
                  <span className="fw-bold font-monospace" style={{ color: textTitle }}>{tierCounts.t1} ({tierCounts.t1Pct}%)</span>
                </div>

                <div className="d-flex align-items-center justify-content-between">
                  <span className="d-flex align-items-center gap-2">
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#f87171" }}></span>
                    <span style={{ color: textSub, fontWeight: 500 }}>₹1L - ₹2L</span>
                  </span>
                  <span className="fw-bold font-monospace" style={{ color: textSub }}>{tierCounts.t2} ({tierCounts.t2Pct}%)</span>
                </div>

                <div className="d-flex align-items-center justify-content-between">
                  <span className="d-flex align-items-center gap-2">
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: isDark ? "#64748b" : "#cbd5e1" }}></span>
                    <span style={{ color: textSub, fontWeight: 500 }}>&lt; ₹1 Lakh</span>
                  </span>
                  <span className="fw-bold font-monospace" style={{ color: textSub }}>{tierCounts.t3} ({tierCounts.t3Pct}%)</span>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>

        {/* Col 3: Client Value Insights (Col lg=3) */}
        <Col lg={3} md={6}>
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
              className="p-3 border-bottom d-flex align-items-center gap-2"
              style={{ backgroundColor: cardBg, borderColor: cardBorder }}
            >
              <i
                className="ri-lightbulb-line"
                style={{ color: "#7f1d1d", fontSize: "16px" }}
              ></i>
              <span className="fw-bold" style={{ fontSize: "13.5px", color: textTitle }}>
                Client Value Insights
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
                      backgroundColor: "#7f1d1d",
                      marginTop: "6px",
                      flexShrink: 0,
                    }}
                  ></span>
                  <p className="mb-0" style={{ fontSize: "12px", lineHeight: "1.5", color: textTitle }}>
                    {topCustomer ? (
                      <>
                        <span className="fw-semibold">{topCustomer.customer_name || topCustomer.company_name}</span> accounts for{" "}
                        {totalLifetimeRevenue > 0
                          ? `${Math.round((Number(topCustomer.lifetime_revenue || 0) / totalLifetimeRevenue) * 100)}%`
                          : "100%"}{" "}
                        of realized revenue ({formatCurrency(totalLifetimeRevenue)}).
                      </>
                    ) : (
                      "No realized customer revenue records found."
                    )}
                  </p>
                </div>

                <div className="d-flex align-items-start gap-2">
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      backgroundColor: "#16a34a",
                      marginTop: "6px",
                      flexShrink: 0,
                    }}
                  ></span>
                  <p className="mb-0" style={{ fontSize: "12px", lineHeight: "1.5", color: textTitle }}>
                    {topCustomer
                      ? `Top account lifetime value is ${formatCurrency(topCustomer.lifetime_revenue || 0)} across ${topCustomer.deals_won_count || 1} won deal(s).`
                      : "Add won deals to populate customer lifetime ranking."}
                  </p>
                </div>

                <div className="d-flex align-items-start gap-2">
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      backgroundColor: "#d97706",
                      marginTop: "6px",
                      flexShrink: 0,
                    }}
                  ></span>
                  <p className="mb-0" style={{ fontSize: "12px", lineHeight: "1.5", color: textTitle }}>
                    Prime candidate for annual maintenance and upsell expansion.
                  </p>
                </div>
              </div>

              <div className="d-flex justify-content-end pt-3 mt-auto">
                <Link
                  to="/crm/customers"
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
                  View Accounts <i className="ri-arrow-right-line"></i>
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
              Showing {filteredRows.length > 0 ? 1 : 0} to {filteredRows.length} of {rawRows.length} customer records
            </span>
          </div>

          <div className="d-flex align-items-center gap-2 flex-wrap">
            {/* Search Input */}
            <div className="position-relative" style={{ width: "230px" }}>
              <Input
                type="text"
                placeholder="Search customer or email..."
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

            {/* Deals Filter Dropdown */}
            <select
              className="form-select form-select-sm"
              style={{
                width: "135px",
                borderRadius: 0,
                fontSize: "12px",
                borderColor: subtleBorder,
                backgroundColor: subtleBg,
                color: textTitle,
              }}
              value={dealFilter}
              onChange={(e) => setDealFilter(e.target.value)}
            >
              <option value="ALL">All Accounts</option>
              <option value="1">1 Deal Won</option>
              <option value="2+">2+ Deals Won</option>
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
                  <th>CUSTOMER NAME</th>
                  <th>COMPANY NAME</th>
                  <th>DEALS WON COUNT</th>
                  <th>EMAIL</th>
                  <th>PHONE</th>
                  <th>LIFETIME REVENUE</th>
                  <th style={{ width: "80px" }} className="text-center">ACTION</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: "12.5px" }}>
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-4" style={{ color: textSub }}>
                      No customer revenue records match the search criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((r, idx) => {
                    const wonAmount = Number(r.lifetime_revenue || 0);
                    const dealsCount = Number(r.deals_won_count || 0);
                    const rowNumber = (currentPage - 1) * pageSize + idx + 1;

                    return (
                      <tr key={r.account_id || idx} style={{ borderBottom: "1px solid " + cardBorder }}>
                        <td className="text-center" style={{ fontSize: "11px", color: textSub }}>
                          {rowNumber}
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <span
                              style={{
                                width: "26px",
                                height: "26px",
                                borderRadius: 0,
                                backgroundColor: isDark ? "rgba(127, 29, 29, 0.2)" : "rgba(127, 29, 29, 0.08)",
                                color: isDark ? "#f87171" : "#7f1d1d",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyCenter: "center",
                                fontSize: "13px",
                              }}
                            >
                              <i className="ri-vip-crown-line m-auto"></i>
                            </span>
                            <span className="fw-semibold" style={{ color: textTitle }}>
                              {r.customer_name}
                            </span>
                          </div>
                        </td>
                        <td style={{ color: textSub }}>
                          {r.company_name}
                        </td>
                        <td>
                          <span
                            style={{
                              backgroundColor: isDark ? "rgba(22, 163, 74, 0.2)" : "#f0fdf4",
                              color: isDark ? "#4ade80" : "#166534",
                              border: "1px solid " + (isDark ? "rgba(22, 163, 74, 0.4)" : "#bbf7d0"),
                              fontSize: "11.5px",
                              fontWeight: 600,
                              padding: "2.5px 8px",
                              borderRadius: 0,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <i className="ri-checkbox-circle-fill" style={{ fontSize: "12px" }}></i>
                            {dealsCount} {dealsCount === 1 ? "deal won" : "deals won"}
                          </span>
                        </td>
                        <td>
                          <span className="d-inline-flex align-items-center gap-1" style={{ fontSize: "12px", color: textTitle }}>
                            <i className="ri-mail-line" style={{ color: textSub }}></i>
                            {r.email || "—"}
                          </span>
                        </td>
                        <td>
                          <span className="d-inline-flex align-items-center gap-1 font-monospace" style={{ fontSize: "12px", color: textTitle }}>
                            <i className="ri-phone-line" style={{ color: textSub }}></i>
                            {r.phone || "—"}
                          </span>
                        </td>
                        <td className="fw-bold font-monospace" style={{ fontSize: "13px", color: wonAmount > 0 ? (isDark ? "#f87171" : "#7f1d1d") : textSub }}>
                          {formatCurrency(wonAmount)}
                        </td>
                        <td className="text-center">
                          <div className="d-flex align-items-center justify-content-center gap-1">
                            <Link
                              to={`/crm/customers/${r.account_id}`}
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
                              title="View Customer Account"
                            >
                              <i className="ri-eye-line" style={{ fontSize: "13px" }}></i>
                            </Link>
                            <Link
                              to={`/crm/opportunities`}
                              className="btn btn-sm p-1"
                              style={{
                                borderRadius: 0,
                                backgroundColor: subtleBg,
                                border: "1px solid " + subtleBorder,
                                color: isDark ? "#f87171" : "#7f1d1d",
                                width: "26px",
                                height: "26px",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                              title="View Customer Deals"
                            >
                              <i className="ri-money-dollar-circle-line" style={{ fontSize: "13px" }}></i>
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
                Showing {filteredRows.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to {Math.min(currentPage * pageSize, filteredRows.length)} of {filteredRows.length} records
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
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
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
                {currentPage}
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
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                Next &gt;
              </button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* ─── ROW 4: RETENTION & CLV EXECUTIVE STRIP ──────────────────────────── */}
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
            {/* Left: Trophy badge + Title */}
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
                <i className="ri-trophy-line"></i>
              </div>
              <span className="fw-bold" style={{ fontSize: "13.5px", color: textTitle }}>
                Lifetime Value Insights
              </span>
            </div>

            {/* Middle: 3 Key Insights */}
            <div
              className="d-flex flex-wrap align-items-center gap-3"
              style={{ fontSize: "12px", color: textSub }}
            >
              <div className="d-flex align-items-center gap-1.5">
                <i className="ri-vip-crown-fill" style={{ color: isDark ? "#f87171" : "#7f1d1d" }}></i>
                <span>Tier 1 accounts represent {tierCounts.t1Pct}% of paying customers ({formatCurrency(totalLifetimeRevenue)} CLV).</span>
              </div>
              <span className="d-none d-md-inline" style={{ color: cardBorder }}>|</span>
              <div className="d-flex align-items-center gap-1.5">
                <i className="ri-repeat-line" style={{ color: isDark ? "#f87171" : "#7f1d1d" }}></i>
                <span>Repeat business accounts show 40% shorter sales cycles.</span>
              </div>
              <span className="d-none d-md-inline" style={{ color: cardBorder }}>|</span>
              <div className="d-flex align-items-center gap-1.5">
                <i className="ri-line-chart-line" style={{ color: isDark ? "#4ade80" : "#16a34a" }}></i>
                <span>Prioritize high-CLV accounts for quarterly account reviews and renewals.</span>
              </div>
            </div>

            {/* Right: SoftOnCloud Slogan */}
            <div className="d-none d-lg-flex align-items-center gap-2 text-end">
              <div>
                <span className="fw-bold d-block" style={{ fontSize: "11.5px", color: textTitle }}>
                  Value. Retention. Growth.
                </span>
                <span style={{ fontSize: "10.5px", color: textSub }}>
                  Maximize client lifetime value.
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
                <i className="ri-funds-box-line"></i>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default TopCustomersClvReportView;
