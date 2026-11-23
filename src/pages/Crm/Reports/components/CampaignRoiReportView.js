import React, { useState, useMemo } from "react";
import { useSelector } from "react-redux";
import ReactApexChart from "react-apexcharts";
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

const CampaignRoiReportView = ({
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

  const cardBg = isDark ? "#161b22" : "#ffffff";
  const cardBorder = isDark ? "#21262d" : "#e2e8f0";
  const subtleBg = isDark ? "#0d1117" : "#f8fafc";
  const subtleBorder = isDark ? "#30363d" : "#e2e8f0";
  const textTitle = isDark ? "#f0f6fc" : "#0f172a";
  const textSub = isDark ? "#8b949e" : "#64748b";

  const [searchTerm, setSearchTerm] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const rows = useMemo(() => {
    return Array.isArray(reportResult?.rows) ? reportResult.rows : [];
  }, [reportResult]);

  const summary = useMemo(() => {
    return reportResult?.summary || {};
  }, [reportResult]);

  const chartData = useMemo(() => {
    return Array.isArray(reportResult?.chart_data) ? reportResult.chart_data : [];
  }, [reportResult]);

  const totalSpend = Number(
    summary.total_spend ??
      rows.reduce((sum, r) => sum + Number(r.actual_spend || 0), 0) ??
      0
  );
  const totalBudget = Number(
    summary.total_budget ??
      rows.reduce((sum, r) => sum + Number(r.budget || 0), 0) ??
      0
  );
  const totalCampaigns = Number(
    summary.total_campaigns ?? rows.length ?? 0
  );
  const totalWonRevenue = rows.reduce(
    (sum, r) => sum + Number(r.won_revenue || 0),
    0
  );
  const totalLeads = rows.reduce(
    (sum, r) => sum + Number(r.leads_generated || 0),
    0
  );

  const hasWonRevenue = useMemo(() => {
    return chartData.some((c) => Number(c.won_revenue || 0) > 0);
  }, [chartData]);

  // Filtered rows for client search
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const term = searchTerm.toLowerCase();
    return rows.filter((r) =>
      String(r.campaign_name || "").toLowerCase().includes(term)
    );
  }, [rows, searchTerm]);

  // Clustered Column Chart Configuration
  const chartConfig = useMemo(() => {
    const categories = chartData.map((c) => {
      const name = c.campaign_name || `Campaign #${c.campaign_id}`;
      const won = Number(c.won_revenue || 0);
      return [name, `Won Revenue: ${formatCurrency(won)}`];
    });
    const budgetSeries = chartData.map((c) => Number(c.budget || 0));
    const spendSeries = chartData.map((c) => Number(c.actual_spend || c.budget || 0));
    const wonSeries = chartData.map((c) => Number(c.won_revenue || 0));

    // Calculate maximum value to grant 25-30% top headroom
    const maxVal = Math.max(
      ...budgetSeries,
      ...spendSeries,
      hasWonRevenue ? Math.max(...wonSeries) : 0,
      10000
    );
    // Round to clean 50,000 increments with headroom
    const yAxisMax = Math.ceil((maxVal * 1.3) / 50000) * 50000;

    const series = [
      { name: "Budget", data: budgetSeries },
      { name: "Actual Spend", data: spendSeries },
    ];
    const chartColors = ["#7f1d1d", "#f87171"]; // Deep Maroon & Soft Coral Rose

    if (hasWonRevenue) {
      series.push({ name: "Won Revenue", data: wonSeries });
      chartColors.push("#16a34a");
    }

    return {
      series,
      options: {
        chart: {
          type: "bar",
          height: 320,
          toolbar: { show: false },
          parentHeightOffset: 0,
        },
        plotOptions: {
          bar: {
            horizontal: false,
            columnWidth: hasWonRevenue ? "55%" : "44%",
            borderRadius: 0,
            borderRadiusApplication: "end",
            dataLabels: {
              position: "top",
            },
          },
        },
        colors: chartColors,
        dataLabels: {
          enabled: true,
          style: {
            fontSize: "10.5px",
            fontFamily: "Inter, sans-serif",
            fontWeight: 600,
            colors: [isDark ? "#f0f6fc" : "#1e293b"],
          },
          offsetY: -14,
          formatter: (val) => {
            if (!val || val <= 0) return "";
            return "₹" + Number(val).toLocaleString("en-IN");
          },
        },
        grid: {
          borderColor: isDark ? "#21262d" : "#f1f5f9",
          strokeDashArray: 3,
          xaxis: { lines: { show: false } },
          yaxis: { lines: { show: true } },
          padding: {
            top: 10,
            bottom: 5,
            left: 15,
            right: 15,
          },
        },
        xaxis: {
          categories,
          labels: {
            style: {
              colors: isDark ? "#c9d1d9" : "#334155",
              fontSize: "11.5px",
              fontFamily: "Inter, sans-serif",
              fontWeight: 500,
            },
            rotate: 0,
            trim: false,
            offsetY: 2,
          },
          axisBorder: { color: isDark ? "#21262d" : "#e2e8f0" },
          axisTicks: { show: false },
        },
        yaxis: {
          max: yAxisMax,
          tickAmount: 4,
          labels: {
            style: {
              colors: textSub,
              fontSize: "11px",
              fontFamily: "Inter, sans-serif",
            },
            formatter: (val) => formatCurrency(val),
          },
        },
        legend: {
          show: false, // Rendered in card header for perfect match with design
        },
        tooltip: {
          theme: "dark",
          shared: true,
          intersect: false,
          y: {
            formatter: (val) => formatCurrency(val),
          },
        },
      },
    };
  }, [chartData, hasWonRevenue, isDark, textSub]);

  return (
    <div className="campaign-roi-report-view">
      {/* ─── ROW 1: 3-CARD EXECUTIVE SUMMARY ─────────────────────────────────── */}
      <Row className="g-3 mb-4">
        {/* Card 1: Total Spend */}
        <Col lg={4} md={6}>
          <Card
            className="h-100"
            style={{
              borderRadius: 0,
              border: `1px solid ${cardBorder}`,
              backgroundColor: cardBg,
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
                    backgroundColor: "rgba(127, 29, 29, 0.08)",
                    color: "#7f1d1d",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "24px",
                    flexShrink: 0,
                  }}
                >
                  <i className="ri-coins-line"></i>
                </div>
                <div>
                  <span
                    className="text-uppercase fw-semibold d-block mb-1"
                    style={{ fontSize: "11.5px", letterSpacing: "0.4px", color: textSub }}
                  >
                    Total Spend
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
                    {formatCurrency(totalSpend)}
                  </div>
                  <span
                    className="mt-1 d-inline-block"
                    style={{ fontSize: "11px", color: textSub }}
                  >
                    Actual marketing expenditure
                  </span>
                </div>
              </div>

              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: 0,
                  backgroundColor: subtleBg,
                  border: `1px solid ${cardBorder}`,
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

        {/* Card 2: Total Budget */}
        <Col lg={4} md={6}>
          <Card
            className="h-100"
            style={{
              borderRadius: 0,
              border: `1px solid ${cardBorder}`,
              backgroundColor: cardBg,
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
                    backgroundColor: "rgba(127, 29, 29, 0.08)",
                    color: "#7f1d1d",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "24px",
                    flexShrink: 0,
                  }}
                >
                  <i className="ri-wallet-3-line"></i>
                </div>
                <div>
                  <span
                    className="text-uppercase fw-semibold d-block mb-1"
                    style={{ fontSize: "11.5px", letterSpacing: "0.4px", color: textSub }}
                  >
                    Total Budget
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
                    {formatCurrency(totalBudget)}
                  </div>
                  <span
                    className="mt-1 d-inline-block"
                    style={{ fontSize: "11px", color: textSub }}
                  >
                    Allocated campaign funds
                  </span>
                </div>
              </div>

              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: 0,
                  backgroundColor: subtleBg,
                  border: `1px solid ${cardBorder}`,
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

        {/* Card 3: Total Campaigns */}
        <Col lg={4} md={12}>
          <Card
            className="h-100"
            style={{
              borderRadius: 0,
              border: `1px solid ${cardBorder}`,
              backgroundColor: cardBg,
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
                    backgroundColor: "rgba(127, 29, 29, 0.08)",
                    color: "#7f1d1d",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "24px",
                    flexShrink: 0,
                  }}
                >
                  <i className="ri-megaphone-line"></i>
                </div>
                <div>
                  <span
                    className="text-uppercase fw-semibold d-block mb-1"
                    style={{ fontSize: "11.5px", letterSpacing: "0.4px", color: textSub }}
                  >
                    Total Campaigns
                  </span>
                  <div
                    className="fw-bold"
                    style={{
                      fontSize: "26px",
                      letterSpacing: "-0.5px",
                      lineHeight: "1.1",
                      color: textTitle,
                    }}
                  >
                    {totalCampaigns}
                  </div>
                  <span
                    className="mt-1 d-inline-block"
                    style={{ fontSize: "11px", color: textSub }}
                  >
                    {totalLeads} {totalLeads === 1 ? "lead" : "leads"} generated
                  </span>
                </div>
              </div>

              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: 0,
                  backgroundColor: subtleBg,
                  border: `1px solid ${cardBorder}`,
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

      {/* ─── ROW 2: COMPARISON CHART + KEY INSIGHT CARD ──────────────────────── */}
      <Row className="g-3 mb-4">
        {/* Left: Campaign Spend & Revenue Comparison Chart */}
        <Col lg={8} md={12}>
          <Card
            className="h-100"
            style={{
              borderRadius: 0,
              border: `1px solid ${cardBorder}`,
              backgroundColor: cardBg,
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
              <div className="d-flex align-items-center gap-2">
                <i
                  className="ri-bar-chart-fill"
                  style={{ color: "#7f1d1d", fontSize: "16px" }}
                ></i>
                <span className="fw-bold" style={{ fontSize: "13.5px", color: textTitle }}>
                  Campaign Spend & Revenue Comparison
                </span>
              </div>
              <div
                className="d-flex align-items-center gap-3"
                style={{ fontSize: "12px", color: textSub }}
              >
                <span className="d-flex align-items-center gap-1.5">
                  <span
                    style={{
                      width: "10px",
                      height: "10px",
                      backgroundColor: "#7f1d1d",
                      borderRadius: 0,
                      display: "inline-block",
                    }}
                  ></span>
                  <span className="fw-medium" style={{ color: textTitle }}>Budget</span>
                </span>
                <span className="d-flex align-items-center gap-1.5">
                  <span
                    style={{
                      width: "10px",
                      height: "10px",
                      backgroundColor: "#f87171",
                      borderRadius: 0,
                      display: "inline-block",
                    }}
                  ></span>
                  <span className="fw-medium" style={{ color: textTitle }}>Actual Spend</span>
                </span>
                <span className="d-flex align-items-center gap-1.5">
                  <span
                    style={{
                      width: "10px",
                      height: "10px",
                      backgroundColor: "#16a34a",
                      borderRadius: 0,
                      display: "inline-block",
                    }}
                  ></span>
                  <span className="fw-medium" style={{ color: textTitle }}>
                    Won Revenue {hasWonRevenue ? "" : "(₹ 0)"}
                  </span>
                </span>
              </div>
            </div>

            <CardBody className="p-3 pt-2">
              <ReactApexChart
                options={chartConfig.options}
                series={chartConfig.series}
                type="bar"
                height={320}
              />
            </CardBody>
          </Card>
        </Col>

        {/* Right: Key Insight Card */}
        <Col lg={4} md={12}>
          <Card
            className="h-100"
            style={{
              borderRadius: 0,
              border: `1px solid ${cardBorder}`,
              backgroundColor: cardBg,
              boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
            }}
          >
            <div
              className="p-3 border-bottom d-flex align-items-center gap-2"
              style={{
                borderRadius: 0,
                borderColor: cardBorder,
                backgroundColor: cardBg,
              }}
            >
              <i
                className="ri-lightbulb-line"
                style={{ color: "#7f1d1d", fontSize: "16px" }}
              ></i>
              <span className="fw-bold" style={{ fontSize: "13.5px", color: textTitle }}>
                Key Insight
              </span>
            </div>

            <CardBody className="p-4 d-flex flex-column align-items-center justify-content-center text-center">
              {/* Document with alert badge graphic matching reference */}
              <div
                style={{
                  width: "72px",
                  height: "82px",
                  borderRadius: 0,
                  backgroundColor: isDark ? "rgba(127, 29, 29, 0.15)" : "#fef2f2",
                  border: isDark ? "1.5px solid rgba(248, 113, 113, 0.3)" : "1.5px solid #fecaca",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  marginBottom: "20px",
                  boxShadow: "0 2px 8px rgba(127, 29, 29, 0.06)",
                }}
              >
                <div
                  style={{
                    width: "42px",
                    height: "3.5px",
                    backgroundColor: "#f87171",
                    borderRadius: 0,
                    marginBottom: "7px",
                  }}
                ></div>
                <div
                  style={{
                    width: "32px",
                    height: "3.5px",
                    backgroundColor: "#f87171",
                    borderRadius: 0,
                    marginBottom: "7px",
                  }}
                ></div>
                <div
                  style={{
                    width: "38px",
                    height: "3.5px",
                    backgroundColor: "#f87171",
                    borderRadius: 0,
                  }}
                ></div>
                <div
                  style={{
                    position: "absolute",
                    bottom: "-8px",
                    right: "-8px",
                    width: "28px",
                    height: "28px",
                    borderRadius: 0,
                    backgroundColor: "#7f1d1d",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "15px",
                    fontWeight: "bold",
                    border: isDark ? "2.5px solid #161b22" : "2.5px solid #ffffff",
                    boxShadow: "0 2px 5px rgba(0, 0, 0, 0.15)",
                  }}
                >
                  !
                </div>
              </div>

              <h6
                className="fw-bold mb-2"
                style={{ fontSize: "15px", lineHeight: "1.4", color: textTitle }}
              >
                {totalWonRevenue > 0
                  ? `Recorded ${formatCurrency(totalWonRevenue)} won revenue across active campaigns.`
                  : "No won revenue recorded in the selected period."}
              </h6>

              <p
                className="small mb-3"
                style={{ fontSize: "12px", lineHeight: "1.5", maxWidth: "260px", color: textSub }}
              >
                {totalWonRevenue > 0
                  ? "Campaign attribution is delivering positive returns. Review detailed ROI breakdown in the ledger below."
                  : "Track converted deals attributed to campaigns to measure return on ad spend and optimize acquisition costs."}
              </p>

              <div
                className="p-2 px-3 border w-100 d-flex align-items-center justify-content-between"
                style={{
                  borderRadius: 0,
                  borderColor: cardBorder,
                  backgroundColor: subtleBg,
                }}
              >
                <span className="small" style={{ fontSize: "11.5px", color: textSub }}>
                  Budget Utilization
                </span>
                <span className="fw-bold font-monospace" style={{ fontSize: "12px", color: textTitle }}>
                  100% Allocated
                </span>
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
          border: `1px solid ${cardBorder}`,
          backgroundColor: cardBg,
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
                style={{ color: "#7f1d1d", fontSize: "16px" }}
              ></i>
              Detailed Data Ledger
            </h6>
            <span className="small" style={{ fontSize: "11.5px", color: textSub }}>
              Showing {filteredRows.length} of {rows.length} transaction records
            </span>
          </div>

          <div className="d-flex align-items-center gap-2 flex-wrap">
            {/* Search Input */}
            <div className="position-relative" style={{ width: "230px" }}>
              <Input
                type="text"
                placeholder="Search campaign..."
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

            {/* Export CSV Button */}
            <button
              type="button"
              className="btn btn-sm d-flex align-items-center gap-1"
              style={{
                backgroundColor: subtleBg,
                color: isDark ? "#f87171" : "#7f1d1d",
                border: `1px solid ${cardBorder}`,
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
            <Table className="align-middle table-nowrap mb-0" hover style={{ borderColor: cardBorder }}>
              <thead style={{ backgroundColor: subtleBg, borderBottom: `1px solid ${cardBorder}` }}>
                <tr style={{ fontSize: "11.5px", color: textSub }}>
                  <th style={{ width: "40px", backgroundColor: "transparent", color: textSub }} className="text-center">#</th>
                  <th style={{ backgroundColor: "transparent", color: textSub }}>CAMPAIGN NAME</th>
                  <th style={{ backgroundColor: "transparent", color: textSub }}>WON REVENUE</th>
                  <th style={{ backgroundColor: "transparent", color: textSub }}>BUDGET</th>
                  <th style={{ backgroundColor: "transparent", color: textSub }}>ACTUAL SPEND</th>
                  <th style={{ backgroundColor: "transparent", color: textSub }}>ROI PERCENTAGE</th>
                  <th style={{ backgroundColor: "transparent", color: textSub }}>LEADS GENERATED</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: "12.5px" }}>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-4" style={{ color: textSub }}>
                      No campaign records match the search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((c, idx) => {
                    const roi = Number(c.roi_percentage ?? -100);
                    const isPositive = roi > 0;
                    const isZero = roi === 0;

                    return (
                      <tr key={c.campaign_id || idx} style={{ borderBottom: `1px solid ${cardBorder}` }}>
                        <td className="text-center" style={{ fontSize: "11px", color: textSub }}>
                          {idx + 1}
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <span
                              style={{
                                width: "24px",
                                height: "24px",
                                borderRadius: 0,
                                backgroundColor: "rgba(127, 29, 29, 0.08)",
                                color: "#7f1d1d",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "13px",
                                flexShrink: 0,
                              }}
                            >
                              <i className="ri-megaphone-line"></i>
                            </span>
                            <span className="fw-semibold" style={{ color: textTitle }}>
                              {c.campaign_name}
                            </span>
                          </div>
                        </td>
                        <td className="fw-bold font-monospace" style={{ fontSize: "12px", color: textTitle }}>
                          {formatCurrency(c.won_revenue || 0)}
                        </td>
                        <td className="fw-bold font-monospace" style={{ fontSize: "12px", color: textTitle }}>
                          {formatCurrency(c.budget || 0)}
                        </td>
                        <td className="fw-bold font-monospace" style={{ fontSize: "12px", color: textTitle }}>
                          {formatCurrency(c.actual_spend || c.budget || 0)}
                        </td>
                        <td>
                          <span
                            style={{
                              backgroundColor: isPositive
                                ? (isDark ? "rgba(22, 101, 52, 0.2)" : "#f0fdf4")
                                : isZero
                                ? (isDark ? "rgba(100, 116, 139, 0.15)" : "#f8fafc")
                                : (isDark ? "rgba(153, 27, 27, 0.2)" : "#fef2f2"),
                              color: isPositive
                                ? (isDark ? "#4ade80" : "#166534")
                                : isZero
                                ? (isDark ? "#94a3b8" : "#475569")
                                : (isDark ? "#f87171" : "#991b1b"),
                              border: `1px solid ${
                                isPositive
                                  ? (isDark ? "rgba(74, 222, 128, 0.3)" : "#bbf7d0")
                                  : isZero
                                  ? (isDark ? "#30363d" : "#e2e8f0")
                                  : (isDark ? "rgba(248, 113, 113, 0.3)" : "#fecaca")
                              }`,
                              fontSize: "11.5px",
                              fontWeight: 600,
                              padding: "2px 8px",
                              borderRadius: 0,
                              display: "inline-block",
                            }}
                          >
                            {roi > 0 ? `+${roi.toFixed(0)}%` : `${roi.toFixed(0)}%`}
                          </span>
                        </td>
                        <td>
                          <span
                            style={{
                              backgroundColor: (c.leads_generated || 0) > 0
                                ? (isDark ? "rgba(22, 101, 52, 0.2)" : "#f0fdf4")
                                : (isDark ? "rgba(100, 116, 139, 0.15)" : "#f8fafc"),
                              border: `1px solid ${
                                (c.leads_generated || 0) > 0
                                  ? (isDark ? "rgba(74, 222, 128, 0.3)" : "#bbf7d0")
                                  : (isDark ? "#30363d" : "#e2e8f0")
                              }`,
                              color: (c.leads_generated || 0) > 0
                                ? (isDark ? "#4ade80" : "#166534")
                                : textSub,
                              fontSize: "11px",
                              fontWeight: 600,
                              padding: "2px 8px",
                              borderRadius: 0,
                            }}
                          >
                            {(c.leads_generated || 0) > 0
                              ? `${c.leads_generated} (${Number(c.leads_generated).toFixed(1)}%)`
                              : "0 (0.0%)"}
                          </span>
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
              <span className="small" style={{ fontSize: "11.5px", color: textSub }}>
                Showing 1 to {filteredRows.length} of {rows.length} records
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
                  color: textSub,
                  border: `1px solid ${cardBorder}`,
                }}
                disabled
              >
                &lt; Prev
              </button>
              <button
                type="button"
                className="btn btn-sm"
                style={{
                  borderRadius: 0,
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
                className="btn btn-sm"
                style={{
                  borderRadius: 0,
                  fontSize: "11px",
                  backgroundColor: subtleBg,
                  color: textSub,
                  border: `1px solid ${cardBorder}`,
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

export default CampaignRoiReportView;
