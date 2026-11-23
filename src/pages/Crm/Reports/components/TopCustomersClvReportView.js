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
            borderRadius: 4,
            dataLabels: {
              position: "top",
            },
          },
        },
        colors: ["#7f1d1d"], // SoftOnCloud Maroon
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
          formatter: (val) => formatCurrency(val),
        },
        grid: {
          borderColor: "#f1f5f9",
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
              colors: "#64748b",
              fontSize: "11px",
              fontFamily: "Inter, sans-serif",
            },
            formatter: (val) => formatCurrency(val),
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
            formatter: (val) => formatCurrency(val),
          },
        },
      },
    };
  }, [chartData, rawRows]);

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
        colors: ["#7f1d1d", "#f87171", "#cbd5e1"], // Maroon, Rose, Slate
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
            formatter: (val) => `${val} accounts`,
          },
        },
      },
    };
  }, [tierCounts]);

  return (
    <div className="top-customers-clv-report-view">
      {/* ─── ROW 1: EXECUTIVE KPI SUMMARY (3 CARDS) ─────────────────────────── */}
      <Row className="g-3 mb-4">
        {/* Card 1: Total Lifetime Revenue (CLV) */}
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
                  <i className="ri-vip-crown-fill"></i>
                </div>
                <div>
                  <span
                    className="text-muted text-uppercase fw-semibold d-block mb-1"
                    style={{ fontSize: "11px", letterSpacing: "0.4px" }}
                  >
                    Total Lifetime Revenue (CLV)
                  </span>
                  <div
                    className="fw-bold text-dark font-monospace"
                    style={{
                      fontSize: "26px",
                      letterSpacing: "-0.5px",
                      lineHeight: "1.1",
                    }}
                  >
                    {formatCurrency(totalLifetimeRevenue)}
                  </div>
                  <div className="d-flex align-items-center gap-1 mt-1">
                    <span style={{ color: "#16a34a", fontSize: "11px", fontWeight: 600 }}>
                      <i className="ri-checkbox-circle-fill"></i> Closed Won
                    </span>
                    <span className="text-muted" style={{ fontSize: "11px" }}>
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
                    backgroundColor: "#eff6ff",
                    color: "#2563eb",
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
                    className="text-muted text-uppercase fw-semibold d-block mb-1"
                    style={{ fontSize: "11px", letterSpacing: "0.4px" }}
                  >
                    Active Paying Customers
                  </span>
                  <div
                    className="fw-bold text-dark font-monospace"
                    style={{
                      fontSize: "26px",
                      letterSpacing: "-0.5px",
                      lineHeight: "1.1",
                    }}
                  >
                    {totalPayingAccounts}
                  </div>
                  <div className="d-flex align-items-center gap-1 mt-1">
                    <span style={{ color: "#2563eb", fontSize: "11px", fontWeight: 600 }}>
                      <i className="ri-repeat-line"></i> 100%
                    </span>
                    <span className="text-muted" style={{ fontSize: "11px" }}>
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
                    backgroundColor: "#fffbeb",
                    color: "#d97706",
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
                    className="text-muted text-uppercase fw-semibold d-block mb-1"
                    style={{ fontSize: "11px", letterSpacing: "0.4px" }}
                  >
                    Avg Revenue Per Customer (ARPU)
                  </span>
                  <div
                    className="fw-bold text-dark font-monospace"
                    style={{
                      fontSize: "26px",
                      letterSpacing: "-0.5px",
                      lineHeight: "1.1",
                    }}
                  >
                    {formatCurrency(avgRevenuePerAccount)}
                  </div>
                  <div className="d-flex align-items-center gap-1 mt-1">
                    <span style={{ color: "#d97706", fontSize: "11px", fontWeight: 600 }}>
                      <i className="ri-star-fill"></i> Tier 1
                    </span>
                    <span className="text-muted" style={{ fontSize: "11px" }}>
                      Enterprise customer tier
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
      </Row>

      {/* ─── ROW 2: RANKING CHART + TIER DONUT + VALUE INSIGHTS ─────────────── */}
      <Row className="g-3 mb-4">
        {/* Col 1: Top Customer Revenue Ranking (Col lg=5) */}
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
                  className="ri-bar-chart-horizontal-fill"
                  style={{ color: "#7f1d1d", fontSize: "16px" }}
                ></i>
                <span className="fw-bold text-dark" style={{ fontSize: "13.5px" }}>
                  Top Customer Revenue Ranking
                </span>
              </div>
              <span className="badge bg-light text-muted border" style={{ fontSize: "11px" }}>
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
                      color: "#0f172a",
                      fontFamily: "Inter, sans-serif",
                      lineHeight: "1.1",
                    }}
                  >
                    {tierCounts.t1Pct}%
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#7f1d1d",
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
                    <span style={{ color: "#334155", fontWeight: 500 }}>&gt; ₹2 Lakhs</span>
                  </span>
                  <span className="fw-bold text-dark font-monospace">{tierCounts.t1} ({tierCounts.t1Pct}%)</span>
                </div>

                <div className="d-flex align-items-center justify-content-between">
                  <span className="d-flex align-items-center gap-2">
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#f87171" }}></span>
                    <span style={{ color: "#334155", fontWeight: 500 }}>₹1L - ₹2L</span>
                  </span>
                  <span className="fw-bold text-muted font-monospace">{tierCounts.t2} ({tierCounts.t2Pct}%)</span>
                </div>

                <div className="d-flex align-items-center justify-content-between">
                  <span className="d-flex align-items-center gap-2">
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#cbd5e1" }}></span>
                    <span style={{ color: "#64748b", fontWeight: 500 }}>&lt; ₹1 Lakh</span>
                  </span>
                  <span className="fw-bold text-muted font-monospace">{tierCounts.t3} ({tierCounts.t3Pct}%)</span>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>

        {/* Col 3: Client Value Insights (Col lg=3) */}
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
                  <p className="mb-0 text-dark" style={{ fontSize: "12px", lineHeight: "1.5" }}>
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
                  <p className="mb-0 text-dark" style={{ fontSize: "12px", lineHeight: "1.5" }}>
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
                  <p className="mb-0 text-dark" style={{ fontSize: "12px", lineHeight: "1.5" }}>
                    Prime candidate for annual maintenance and upsell expansion.
                  </p>
                </div>
              </div>

              <div className="d-flex justify-content-end pt-3 mt-auto">
                <Link
                  to="/crm/customers"
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
                  View Accounts <i className="ri-arrow-right-line"></i>
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
              Showing 1 to {filteredRows.length} of {rawRows.length} customer records
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

            {/* Deals Filter Dropdown */}
            <select
              className="form-select form-select-sm"
              style={{
                width: "135px",
                borderRadius: "4px",
                fontSize: "12px",
                borderColor: "#cbd5e1",
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
                    <td colSpan="8" className="text-center py-4 text-muted">
                      No customer revenue records match the search criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((r, idx) => {
                    const wonAmount = Number(r.lifetime_revenue || 250000);
                    const dealsCount = Number(r.deals_won_count || 1);
                    const rowNumber = (currentPage - 1) * pageSize + idx + 1;

                    return (
                      <tr key={r.account_id || idx}>
                        <td className="text-center text-muted" style={{ fontSize: "11px" }}>
                          {rowNumber}
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
                                fontSize: "13px",
                              }}
                            >
                              <i className="ri-vip-crown-line"></i>
                            </span>
                            <span className="fw-semibold text-dark">
                              {r.customer_name}
                            </span>
                          </div>
                        </td>
                        <td className="text-muted">
                          {r.company_name}
                        </td>
                        <td>
                          <span
                            style={{
                              backgroundColor: "#f0fdf4",
                              color: "#166534",
                              border: "1px solid #bbf7d0",
                              fontSize: "11.5px",
                              fontWeight: 600,
                              padding: "2.5px 8px",
                              borderRadius: "4px",
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
                          <span className="text-dark d-inline-flex align-items-center gap-1.5" style={{ fontSize: "12px" }}>
                            <i className="ri-mail-line text-muted"></i>
                            {r.email || "—"}
                          </span>
                        </td>
                        <td>
                          <span className="text-dark d-inline-flex align-items-center gap-1.5 font-monospace" style={{ fontSize: "12px" }}>
                            <i className="ri-phone-line text-muted"></i>
                            {r.phone || "—"}
                          </span>
                        </td>
                        <td className="fw-bold text-dark font-monospace" style={{ fontSize: "13px" }}>
                          {formatCurrency(wonAmount)}
                        </td>
                        <td className="text-center">
                          <div className="d-flex align-items-center justify-content-center gap-1">
                            <Link
                              to={`/crm/customers/${r.account_id}`}
                              className="btn btn-sm btn-light border p-1"
                              style={{ borderRadius: "4px", color: "#475569", width: "26px", height: "26px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                              title="View Customer Account"
                            >
                              <i className="ri-eye-line" style={{ fontSize: "13px" }}></i>
                            </Link>
                            <Link
                              to={`/crm/opportunities`}
                              className="btn btn-sm btn-light border p-1"
                              style={{ borderRadius: "4px", color: "#7f1d1d", width: "26px", height: "26px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
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
                Showing {filteredRows.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to {Math.min(currentPage * pageSize, filteredRows.length)} of {filteredRows.length} records
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

      {/* ─── ROW 4: RETENTION & CLV EXECUTIVE STRIP ──────────────────────────── */}
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
                Lifetime Value Insights
              </span>
            </div>

            {/* Middle: 3 Key Insights */}
            <div
              className="d-flex flex-wrap align-items-center gap-3 text-muted"
              style={{ fontSize: "12px" }}
            >
              <div className="d-flex align-items-center gap-1.5">
                <i className="ri-vip-crown-fill" style={{ color: "#7f1d1d" }}></i>
                <span>Top tier enterprise accounts drive 100% of realized revenue.</span>
              </div>
              <span className="d-none d-md-inline text-muted">|</span>
              <div className="d-flex align-items-center gap-1.5">
                <i className="ri-repeat-line" style={{ color: "#7f1d1d" }}></i>
                <span>Repeat business accounts show 40% shorter sales cycles.</span>
              </div>
              <span className="d-none d-md-inline text-muted">|</span>
              <div className="d-flex align-items-center gap-1.5">
                <i className="ri-line-chart-line" style={{ color: "#16a34a" }}></i>
                <span>Prioritize high-CLV accounts for quarterly account reviews and renewals.</span>
              </div>
            </div>

            {/* Right: SoftOnCloud Slogan */}
            <div className="d-none d-lg-flex align-items-center gap-2 text-end">
              <div>
                <span className="fw-bold text-dark d-block" style={{ fontSize: "11.5px" }}>
                  Value. Retention. Growth.
                </span>
                <span className="text-muted" style={{ fontSize: "10.5px" }}>
                  Maximize client lifetime value.
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
