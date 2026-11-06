import React, { useMemo } from "react";
import ReactApexChart from "react-apexcharts";
import { Card, CardHeader, CardBody, Row, Col } from "reactstrap";
import { formatCurrency, formatNumber } from "../utils/reportUtils";

const ReportChartRenderer = ({ chartType, chartData, title }) => {
  const data = Array.isArray(chartData) ? chartData : [];

  // Default executive color palette
  const defaultColors = [
    "#15803d", // Emerald Green
    "#7f1d1d", // SoftOnCloud Maroon
    "#d97706", // Amber
    "#475569", // Slate
    "#0f766e", // Teal
    "#7c3aed", // Violet
    "#dc2626", // Red
    "#64748b", // Grey Slate
  ];

  // Base font style for chart axis & labels
  const baseFont = {
    fontFamily: "Inter, sans-serif",
    colors: "#64748b",
    fontSize: "12px",
  };

  // 1. Compute Breakdown Items for Donut / Pie
  const donutBreakdown = useMemo(() => {
    if (chartType !== "donut" && chartType !== "pie") return [];

    const total = data.reduce(
      (sum, d) =>
        sum +
        Number(
          d.deal_count ??
            d.count ??
            d.lead_count ??
            d.total_amount ??
            d.value ??
            0
        ),
      0
    );

    const isRevenue = data.some(
      (d) =>
        d.total_amount !== undefined ||
        d.value !== undefined ||
        d.won_revenue !== undefined
    );

    return data.map((d, i) => {
      const label =
        d.outcome ||
        d.source_name ||
        d.type ||
        d.name ||
        d.status ||
        `Segment ${i + 1}`;
      const rawVal = Number(
        d.deal_count ??
          d.count ??
          d.lead_count ??
          d.total_amount ??
          d.value ??
          0
      );
      const pct = total > 0 ? ((rawVal / total) * 100).toFixed(0) : "0";
      const color = d.color || defaultColors[i % defaultColors.length];

      return {
        label,
        value: rawVal,
        percentage: pct,
        color,
        displayValue: isRevenue
          ? formatCurrency(rawVal)
          : `${formatNumber(rawVal)} records`,
      };
    });
  }, [data, chartType]);

  // 2. Compute Breakdown Items for Horizontal Bar (Stages / Funnel / Aging)
  const barBreakdown = useMemo(() => {
    if (
      chartType !== "horizontal_bar" &&
      chartType !== "funnel" &&
      chartType !== "aging_bars"
    )
      return [];

    const isFunnel = chartType === "funnel";
    const isAging = chartType === "aging_bars";
    const totalCount = data.reduce(
      (sum, d) => sum + Number(d.deal_count ?? d.count ?? d.lead_count ?? 0),
      0
    );

    const funnelColors = [
      "#7f1d1d", // New - Dark Maroon
      "#991b1b", // Contacted - Maroon
      "#b91c1c", // Qualified - Crimson
      "#c2410c", // Proposal - Rust
      "#d97706", // Negotiation - Amber
      "#16a34a", // Converted - Emerald Green
      "#94a3b8", // Lost - Slate
    ];

    const agingColors = [
      "#16a34a", // < 24 Hours - Fresh (Green)
      "#0284c7", // 1 - 3 Days - Recent (Blue)
      "#d97706", // 4 - 7 Days - Warning (Amber)
      "#dc2626", // > 7 Days - Critical (Danger Red)
    ];

    const agingLabels = ["Fresh (< 24h)", "Recent (1-3d)", "Urgent (4-7d)", "Critical (> 7d)"];

    return data.map((d, idx) => {
      const name =
        d.bracket ||
        d.status_name ||
        d.stage_name ||
        d.status ||
        d.name ||
        d.rep_name ||
        d.source_name ||
        "Bracket";
      const count = Number(d.deal_count ?? d.count ?? d.lead_count ?? 0);
      const amount = Number(
        d.amount ?? d.estimated_amount ?? d.total_amount ?? 0
      );
      const percentage =
        totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
      const color = isAging
        ? agingColors[idx % agingColors.length]
        : isFunnel
        ? funnelColors[idx % funnelColors.length]
        : "#7f1d1d";
      const sublabel = isAging ? agingLabels[idx % agingLabels.length] : null;

      return {
        name,
        count,
        amount,
        percentage,
        color,
        sublabel,
        avgDays: d.avg_days_in_stage ?? null,
      };
    });
  }, [data, chartType]);

  // 3. ApexCharts Configuration
  const chartConfig = useMemo(() => {
    if (data.length === 0) return null;

    // A. Horizontal Bar (Pipeline Stages, Funnel, Aging Brackets)
    if (
      chartType === "horizontal_bar" ||
      chartType === "funnel" ||
      chartType === "aging_bars"
    ) {
      const isFunnel = chartType === "funnel";
      const isAging = chartType === "aging_bars";
      const categories = data.map(
        (d) =>
          d.bracket ||
          d.status_name ||
          d.stage_name ||
          d.status ||
          d.name ||
          d.rep_name ||
          d.source_name ||
          "Bracket"
      );
      const values = data.map((d) =>
        Number(d.deal_count ?? d.count ?? d.total_amount ?? d.lead_count ?? 0)
      );
      const amounts = data.map((d) =>
        Number(d.amount ?? d.estimated_amount ?? d.total_amount ?? 0)
      );
      const hasAmount = amounts.some((a) => a > 0);

      const maxVal = Math.max(...values, 0);
      const suggestedMax =
        maxVal === 0 ? 5 : maxVal <= 5 ? 5 : Math.ceil(maxVal * 1.25);

      const funnelColors = [
        "#7f1d1d",
        "#991b1b",
        "#b91c1c",
        "#c2410c",
        "#d97706",
        "#16a34a",
        "#94a3b8",
      ];

      const agingColors = [
        "#16a34a", // < 24 Hours
        "#0284c7", // 1 - 3 Days
        "#d97706", // 4 - 7 Days
        "#dc2626", // > 7 Days (Stale)
      ];

      const palette = isAging
        ? agingColors
        : isFunnel
        ? funnelColors
        : ["#7f1d1d"];

      return {
        type: "bar",
        height: Math.max(260, categories.length * 48),
        series: [
          {
            name: isAging || isFunnel ? "Lead Count" : hasAmount ? "Deal Count" : "Count",
            data: values,
          },
        ],
        options: {
          chart: { toolbar: { show: false } },
          plotOptions: {
            bar: {
              horizontal: true,
              barHeight: categories.length <= 4 ? "40%" : "44%",
              borderRadius: 4,
              distributed: isAging || isFunnel,
            },
          },
          colors: palette,
          dataLabels: {
            enabled: true,
            textAnchor: "start",
            style: { colors: ["#ffffff"], fontSize: "11px", fontWeight: 600 },
            formatter: (val) => (val > 0 ? formatNumber(val) : ""),
            offsetX: 8,
          },
          grid: {
            borderColor: "#f1f5f9",
            strokeDashArray: 3,
            xaxis: { lines: { show: true } },
            yaxis: { lines: { show: false } },
          },
          xaxis: {
            categories,
            min: 0,
            max: suggestedMax,
            tickAmount: Math.min(suggestedMax, 5),
            labels: {
              style: baseFont,
              formatter: (val) => (Number.isInteger(val) ? val : ""),
            },
          },
          yaxis: {
            labels: {
              style: { ...baseFont, fontWeight: 500, colors: "#334155" },
            },
          },
          legend: { show: false },
          tooltip: {
            theme: "dark",
            y: {
              formatter: (val, opts) => {
                const idx = opts.dataPointIndex;
                const amt = amounts[idx];
                const unit = isAging || isFunnel
                  ? val === 1
                    ? "lead"
                    : "leads"
                  : val === 1
                  ? "deal"
                  : "deals";
                if (amt && amt > 0) {
                  return `${val} ${unit} (${formatCurrency(amt)})`;
                }
                return `${val} ${unit}`;
              },
            },
          },
        },
      };
    }

    // B. Donut / Pie (Win/Loss, Lead Source)
    if (chartType === "donut" || chartType === "pie") {
      const labels = donutBreakdown.map((b) => b.label);
      const series = donutBreakdown.map((b) => b.value);
      const colors = donutBreakdown.map((b) => b.color);

      const totalVal = series.reduce((a, b) => a + b, 0);
      const isRevenue = data.some(
        (d) =>
          d.total_amount !== undefined ||
          d.value !== undefined ||
          d.won_revenue !== undefined
      );

      return {
        type: "donut",
        height: 290,
        series,
        options: {
          chart: { toolbar: { show: false } },
          labels,
          colors,
          legend: { show: false }, // Custom interactive legend rendered on the right
          plotOptions: {
            pie: {
              donut: {
                size: "72%",
                labels: {
                  show: true,
                  name: {
                    show: true,
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#64748b",
                    offsetY: -5,
                  },
                  value: {
                    show: true,
                    fontSize: "16px",
                    fontWeight: 700,
                    color: "#0f172a",
                    offsetY: 5,
                    formatter: () =>
                      isRevenue
                        ? formatCurrency(totalVal)
                        : formatNumber(totalVal),
                  },
                  total: {
                    show: true,
                    label: isRevenue ? "Total Revenue" : "Total Count",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#64748b",
                    formatter: () =>
                      isRevenue
                        ? formatCurrency(totalVal)
                        : formatNumber(totalVal),
                  },
                },
              },
            },
          },
          dataLabels: {
            enabled: false,
          },
          stroke: {
            width: 2,
            colors: ["#ffffff"],
          },
          tooltip: {
            theme: "dark",
            y: {
              formatter: (val) =>
                isRevenue ? formatCurrency(val) : `${val} records`,
            },
          },
        },
      };
    }

    // C. Area / Line (Revenue Forecast, Monthly Velocity)
    if (chartType === "area" || chartType === "line") {
      const categories = data.map(
        (d) => d.month_label || d.period || d.date || d.label || "Month"
      );

      const hasWeighted = data.some(
        (d) =>
          d.weighted_amount !== undefined ||
          d.weighted_forecast !== undefined ||
          d.gross_amount !== undefined
      );

      const series = hasWeighted
        ? [
            {
              name: "Gross Pipeline (Unweighted)",
              data: data.map((d) =>
                Number(d.gross_amount ?? d.unweighted_amount ?? d.pipeline_amount ?? 0)
              ),
            },
            {
              name: "Probability Weighted Forecast",
              data: data.map((d) =>
                Number(d.weighted_amount ?? d.weighted_forecast ?? 0)
              ),
            },
          ]
        : [
            {
              name: "Revenue",
              data: data.map((d) =>
                Number(d.amount ?? d.revenue ?? d.count ?? 0)
              ),
            },
          ];

      return {
        type: "area",
        height: 310,
        series,
        options: {
          chart: {
            toolbar: { show: false },
            zoom: { enabled: false },
            fontFamily: "inherit",
          },
          dataLabels: {
            enabled: false,
          },
          colors: hasWeighted ? ["#64748b", "#7f1d1d"] : ["#7f1d1d"],
          stroke: {
            curve: "smooth",
            width: hasWeighted ? [2, 3] : 2.5,
            dashArray: hasWeighted ? [4, 0] : 0,
          },
          fill: {
            type: "gradient",
            gradient: {
              shadeIntensity: 1,
              opacityFrom: hasWeighted ? [0.12, 0.45] : 0.45,
              opacityTo: hasWeighted ? [0.01, 0.05] : 0.05,
              stops: [0, 95, 100],
            },
          },
          markers: {
            size: 3,
            strokeColors: "#ffffff",
            strokeWidth: 2,
            hover: { size: 6 },
          },
          grid: { borderColor: "#f1f5f9", strokeDashArray: 3 },
          xaxis: {
            categories,
            labels: { style: { ...baseFont, fontSize: "11px" } },
            axisBorder: { color: "#e2e8f0" },
            axisTicks: { color: "#e2e8f0" },
          },
          yaxis: {
            labels: {
              style: { ...baseFont, fontSize: "11px" },
              formatter: (val) => formatCurrency(val),
            },
          },
          tooltip: {
            theme: "dark",
            shared: true,
            intersect: false,
            y: { formatter: (val) => formatCurrency(val) },
          },
          legend: {
            position: "top",
            horizontalAlign: "right",
            fontSize: "12px",
            labels: { colors: "#475569" },
            markers: { radius: 2 },
          },
        },
      };
    }

    // D. Comparative Bar / Scorecard / ROI
    if (
      chartType === "scorecard" ||
      chartType === "roi_compare" ||
      chartType === "matrix" ||
      chartType === "bullet_bar"
    ) {
      const categories = data.map(
        (d) =>
          d.sales_rep ||
          d.rep_name ||
          d.campaign_name ||
          d.name ||
          d.source_name ||
          "Record"
      );

      const isTarget = data.some((d) => d.target_amount !== undefined);
      const isRoi = data.some(
        (d) => d.actual_spend !== undefined || d.budget !== undefined
      );

      let series = [];
      let colors = ["#7f1d1d", "#16a34a"];

      if (isTarget) {
        series = [
          {
            name: "Target Quota",
            data: data.map((d) => Number(d.target_amount ?? 0)),
          },
          {
            name: "Won Revenue",
            data: data.map((d) =>
              Number(d.won_revenue ?? d.achieved_amount ?? d.won_amount ?? 0)
            ),
          },
        ];
        colors = ["#94a3b8", "#16a34a"];
      } else if (isRoi) {
        series = [
          {
            name: "Budget",
            data: data.map((d) => Number(d.budget ?? 0)),
          },
          {
            name: "Won Revenue",
            data: data.map((d) => Number(d.won_revenue ?? 0)),
          },
        ];
        colors = ["#ea580c", "#16a34a"];
      } else {
        series = [
          {
            name: "Value",
            data: data.map((d) =>
              Number(d.value ?? d.total_amount ?? d.count ?? 0)
            ),
          },
        ];
        colors = ["#7f1d1d"];
      }

      return {
        type: "bar",
        height: 310,
        series,
        options: {
          chart: { toolbar: { show: false } },
          dataLabels: { enabled: false },
          plotOptions: {
            bar: {
              horizontal: false,
              columnWidth: "40%",
              borderRadius: 4,
            },
          },
          colors,
          grid: { borderColor: "#f1f5f9", strokeDashArray: 3 },
          xaxis: {
            categories,
            labels: {
              style: baseFont,
              rotate: -20,
              trim: true,
              maxHeight: 60,
            },
          },
          yaxis: {
            labels: {
              style: baseFont,
              formatter: (val) => formatCurrency(val),
            },
          },
          legend: {
            position: "top",
            horizontalAlign: "right",
            fontSize: "12px",
            labels: { colors: "#475569" },
          },
          tooltip: {
            theme: "dark",
            y: { formatter: (val) => formatCurrency(val) },
          },
        },
      };
    }

    // E. Default Column / Multi-bar (Activity effort, Document extensions)
    const categories = data.map(
      (d) =>
        d.activity_type ||
        d.act_type ||
        d.bracket ||
        d.extension ||
        d.inactivity_bracket ||
        d.priority ||
        d.sales_rep ||
        d.name ||
        "Item"
    );
    const seriesValues = data.map((d) =>
      Number(
        d.count ??
          d.lead_count ??
          d.act_count ??
          d.overdue_count ??
          d.value ??
          0
      )
    );

    const maxCol = Math.max(...seriesValues, 0);
    const suggestedMaxCol = maxCol <= 5 ? 5 : Math.ceil(maxCol * 1.25);

    return {
      type: "bar",
      height: 290,
      series: [{ name: "Count", data: seriesValues }],
      options: {
        chart: { toolbar: { show: false } },
        plotOptions: {
          bar: {
            horizontal: false,
            columnWidth: "35%",
            borderRadius: 4,
          },
        },
        colors: ["#7f1d1d"],
        dataLabels: { enabled: false },
        grid: { borderColor: "#f1f5f9", strokeDashArray: 3 },
        xaxis: { categories, labels: { style: baseFont } },
        yaxis: {
          min: 0,
          max: suggestedMaxCol,
          tickAmount: Math.min(suggestedMaxCol, 5),
          labels: {
            style: baseFont,
            formatter: (val) => (Number.isInteger(val) ? val : ""),
          },
        },
        tooltip: {
          theme: "dark",
          y: { formatter: (val) => `${formatNumber(val)} items` },
        },
      },
    };
  }, [data, chartType, donutBreakdown]);

  if (!chartConfig) {
    return (
      <Card
        className="bg-white mb-4"
        style={{ borderRadius: "4px", border: "1px solid #e2e8f0" }}
      >
        <CardBody className="text-center py-5">
          <div
            className="d-inline-flex align-items-center justify-content-center mb-3"
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "4px",
              backgroundColor: "rgba(127, 29, 29, 0.08)",
              color: "#7f1d1d",
              fontSize: "22px",
            }}
          >
            <i className="ri-bar-chart-box-line"></i>
          </div>
          <h6 className="fw-semibold text-dark mb-1">No Chart Data Available</h6>
          <p className="text-muted small mb-0">
            No analytical records match the selected date range or filters.
          </p>
        </CardBody>
      </Card>
    );
  }

  const isDonutLayout =
    (chartType === "donut" || chartType === "pie") && donutBreakdown.length > 0;
  const isHorizontalBarLayout =
    (chartType === "horizontal_bar" ||
      chartType === "funnel" ||
      chartType === "aging_bars") &&
    barBreakdown.length > 0 &&
    barBreakdown.length <= 8;

  // Quota Attainment Leaderboard (Ranked Reps for bullet_bar)
  const quotaLeaderboard = useMemo(() => {
    if (chartType !== "bullet_bar" || !Array.isArray(data)) return [];
    return [...data]
      .map((d) => {
        const name = d.sales_rep || d.rep_name || d.name || "Sales Rep";
        const target = Number(d.target_amount ?? 500000);
        const won = Number(
          d.won_revenue ?? d.achieved_amount ?? d.won_amount ?? 0
        );
        const attainment = target > 0 ? (won / target) * 100 : 0;
        const gap = Math.max(target - won, 0);
        const initials = name
          .split(" ")
          .map((n) => n[0])
          .slice(0, 2)
          .join("")
          .toUpperCase();

        return {
          name,
          initials,
          target,
          won,
          attainment: Number(attainment.toFixed(1)),
          gap,
        };
      })
      .sort((a, b) => b.attainment - a.attainment || b.won - a.won);
  }, [data, chartType]);

  const isBulletBarLayout =
    chartType === "bullet_bar" && quotaLeaderboard.length > 0;

  return (
    <Card
      className="bg-white mb-4"
      style={{
        borderRadius: "4px",
        border: "1px solid #e2e8f0",
        boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
      }}
    >
      <CardHeader
        className="bg-white border-bottom py-3 d-flex align-items-center justify-content-between"
        style={{ borderRadius: "4px 4px 0 0" }}
      >
        <div>
          <h6
            className="mb-0 fw-bold text-dark d-flex align-items-center gap-2"
            style={{ fontSize: "14px" }}
          >
            <i
              className="ri-bar-chart-2-line"
              style={{ color: "#7f1d1d", fontSize: "16px" }}
            ></i>
            {title ? `${title} — Visual Breakdown` : "Visual Analytics & Trends"}
          </h6>
        </div>
        <div className="d-flex align-items-center gap-2">
          <span className="text-muted small" style={{ fontSize: "11.5px" }}>
            <i className="ri-information-line me-1"></i>
            Interactive analytics
          </span>
        </div>
      </CardHeader>

      <CardBody className="pt-3 pb-3">
        {/* Case 1: Donut / Pie 2-Column Split Layout */}
        {isDonutLayout ? (
          <Row className="g-4 align-items-center">
            {/* Left: Donut Chart with Center Total */}
            <Col lg={5} md={12} className="d-flex justify-content-center">
              <div style={{ width: "100%", maxWidth: "340px" }}>
                <ReactApexChart
                  options={chartConfig.options}
                  series={chartConfig.series}
                  type="donut"
                  height={290}
                />
              </div>
            </Col>

            {/* Right: Distribution Breakdown Cards (matches target mockup) */}
            <Col lg={7} md={12}>
              <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
                <span
                  className="fw-semibold text-uppercase text-muted"
                  style={{ fontSize: "11px", letterSpacing: "0.5px" }}
                >
                  Segment Breakdown
                </span>
                <span
                  className="fw-semibold text-muted"
                  style={{ fontSize: "11px" }}
                >
                  Share & Volume
                </span>
              </div>

              <div className="d-flex flex-column gap-2">
                {donutBreakdown.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2 px-3 border bg-white"
                    style={{
                      borderRadius: "4px",
                      borderColor: "#e2e8f0",
                      boxShadow: "0 1px 2px rgba(15, 23, 42, 0.03)",
                    }}
                  >
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <div className="d-flex align-items-center gap-2">
                        <span
                          style={{
                            width: "10px",
                            height: "10px",
                            borderRadius: "50%",
                            backgroundColor: item.color,
                            display: "inline-block",
                          }}
                        ></span>
                        <span
                          className="fw-bold text-dark"
                          style={{ fontSize: "13px" }}
                        >
                          {item.label}
                        </span>
                      </div>

                      <div className="d-flex align-items-center gap-2">
                        <span
                          style={{
                            backgroundColor: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            color: "#475569",
                            fontSize: "11px",
                            fontWeight: 600,
                            padding: "1px 6px",
                            borderRadius: "4px",
                          }}
                        >
                          {item.percentage}%
                        </span>
                        <span
                          className="fw-bold text-dark font-monospace"
                          style={{ fontSize: "13px" }}
                        >
                          {item.displayValue}
                        </span>
                      </div>
                    </div>

                    {/* Mini Progress Bar */}
                    <div
                      style={{
                        height: "4px",
                        backgroundColor: "#f1f5f9",
                        borderRadius: "2px",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${item.percentage}%`,
                          height: "100%",
                          backgroundColor: item.color,
                          borderRadius: "2px",
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </Col>
          </Row>
        ) : isHorizontalBarLayout ? (
          /* Case 2: Horizontal Bar 2-Column Split Layout */
          <Row className="g-4 align-items-center">
            {/* Left: Bar Chart */}
            <Col lg={7} md={12}>
              <ReactApexChart
                options={chartConfig.options}
                series={chartConfig.series}
                type={chartConfig.type}
                height={chartConfig.height}
              />
            </Col>

            {/* Right: Stage Performance Ledger */}
            <Col lg={5} md={12}>
              <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
                <span
                  className="fw-semibold text-uppercase text-muted"
                  style={{ fontSize: "11px", letterSpacing: "0.5px" }}
                >
                  {chartType === "aging_bars"
                    ? "Aging Severity Breakdown"
                    : chartType === "funnel"
                    ? "Funnel Stage Breakdown"
                    : "Stage Breakdown"}
                </span>
                <span
                  className="fw-semibold text-muted"
                  style={{ fontSize: "11px" }}
                >
                  {chartType === "aging_bars"
                    ? "Exposure & Risk"
                    : chartType === "funnel"
                    ? "Conversion & Value"
                    : "Value & Velocity"}
                </span>
              </div>

              <div className="d-flex flex-column gap-2">
                {barBreakdown.map((stage, idx) => (
                  <div
                    key={idx}
                    className="p-2 px-3 border bg-white d-flex align-items-center justify-content-between"
                    style={{
                      borderRadius: "4px",
                      borderColor: "#e2e8f0",
                      boxShadow: "0 1px 2px rgba(15, 23, 42, 0.03)",
                    }}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <span
                        style={{
                          width: "10px",
                          height: "10px",
                          borderRadius: "2px",
                          backgroundColor: stage.color || "#7f1d1d",
                          display: "inline-block",
                          flexShrink: 0,
                        }}
                      ></span>
                      <div>
                        <div
                          className="fw-bold text-dark"
                          style={{ fontSize: "13px" }}
                        >
                          {stage.name}
                        </div>
                        <div className="text-muted" style={{ fontSize: "11px" }}>
                          {stage.count}{" "}
                          {chartType === "funnel" || chartType === "aging_bars"
                            ? stage.count === 1
                              ? "lead"
                              : "leads"
                            : stage.count === 1
                            ? "deal"
                            : "deals"}
                          {stage.sublabel && (
                            <span
                              className="ms-2 badge"
                              style={{
                                backgroundColor: `${stage.color}15`,
                                color: stage.color,
                                border: `1px solid ${stage.color}35`,
                                fontSize: "10px",
                                fontWeight: 600,
                              }}
                            >
                              {stage.sublabel}
                            </span>
                          )}
                          {stage.avgDays !== null && (
                            <span className="ms-2">
                              • avg {stage.avgDays} days
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-end">
                      <div
                        className="fw-bold text-dark font-monospace"
                        style={{ fontSize: "13px" }}
                      >
                        {stage.amount > 0 ? formatCurrency(stage.amount) : "—"}
                      </div>
                      {(chartType === "funnel" ||
                        chartType === "aging_bars") && (
                        <span
                          style={{
                            backgroundColor: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            color: "#475569",
                            fontSize: "10.5px",
                            fontWeight: 600,
                            padding: "1px 6px",
                            borderRadius: "4px",
                            display: "inline-block",
                            marginTop: "2px",
                          }}
                        >
                          {stage.percentage}%
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Col>
          </Row>
        ) : isBulletBarLayout ? (
          /* Case 3: Target Attainment 2-Column Split Layout (Dual-Bar Chart + Attainment Leaderboard) */
          <Row className="g-4 align-items-center">
            {/* Left: Dual Clustered Column Chart (Target Quota vs Won Revenue) */}
            <Col lg={7} md={12}>
              <ReactApexChart
                options={chartConfig.options}
                series={chartConfig.series}
                type={chartConfig.type}
                height={chartConfig.height}
              />
            </Col>

            {/* Right: Sales Rep Quota Attainment Leaderboard */}
            <Col lg={5} md={12}>
              <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
                <span
                  className="fw-semibold text-uppercase text-muted"
                  style={{ fontSize: "11px", letterSpacing: "0.5px" }}
                >
                  <i className="ri-trophy-line me-1 text-warning"></i>
                  Attainment Leaderboard
                </span>
                <span
                  className="fw-semibold text-muted"
                  style={{ fontSize: "11px" }}
                >
                  Quota Progress
                </span>
              </div>

              <div className="d-flex flex-column gap-2">
                {quotaLeaderboard.map((rep, idx) => {
                  const isGold = idx === 0 && rep.won > 0;
                  const isSilver = idx === 1 && rep.won > 0;
                  const isBronze = idx === 2 && rep.won > 0;
                  const rankColor = isGold
                    ? "#eab308"
                    : isSilver
                    ? "#94a3b8"
                    : isBronze
                    ? "#b45309"
                    : "#64748b";

                  const attainmentColor =
                    rep.attainment >= 100
                      ? "#16a34a"
                      : rep.attainment >= 50
                      ? "#0284c7"
                      : "#64748b";

                  return (
                    <div
                      key={idx}
                      className="p-2 px-3 border bg-white"
                      style={{
                        borderRadius: "4px",
                        borderColor: "#e2e8f0",
                        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.03)",
                      }}
                    >
                      <div className="d-flex align-items-center justify-content-between mb-1">
                        <div className="d-flex align-items-center gap-2">
                          {/* Rank Badge */}
                          <span
                            style={{
                              width: "20px",
                              height: "20px",
                              borderRadius: "50%",
                              backgroundColor: `${rankColor}18`,
                              color: rankColor,
                              fontSize: "11px",
                              fontWeight: 700,
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            {idx + 1}
                          </span>

                          {/* Avatar Initials */}
                          <div
                            style={{
                              width: "24px",
                              height: "24px",
                              borderRadius: "50%",
                              backgroundColor: "rgba(127, 29, 29, 0.1)",
                              color: "#7f1d1d",
                              fontSize: "10.5px",
                              fontWeight: 700,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            {rep.initials || "SR"}
                          </div>

                          <span
                            className="fw-bold text-dark"
                            style={{ fontSize: "13px" }}
                          >
                            {rep.name}
                          </span>
                        </div>

                        <div className="d-flex align-items-center gap-2">
                          {/* Attainment Badge */}
                          <span
                            style={{
                              backgroundColor: `${attainmentColor}12`,
                              border: `1px solid ${attainmentColor}30`,
                              color: attainmentColor,
                              fontSize: "11px",
                              fontWeight: 600,
                              padding: "1px 6px",
                              borderRadius: "4px",
                            }}
                          >
                            {rep.attainment}%
                          </span>
                          <span
                            className="fw-bold text-dark font-monospace"
                            style={{ fontSize: "12.5px" }}
                          >
                            {formatCurrency(rep.won)}
                          </span>
                        </div>
                      </div>

                      {/* Mini Attainment Progress Bar */}
                      <div
                        style={{
                          height: "4px",
                          backgroundColor: "#f1f5f9",
                          borderRadius: "2px",
                          overflow: "hidden",
                          marginTop: "6px",
                          marginBottom: "4px",
                        }}
                      >
                        <div
                          style={{
                            width: `${Math.min(rep.attainment, 100)}%`,
                            height: "100%",
                            backgroundColor: attainmentColor,
                            borderRadius: "2px",
                          }}
                        ></div>
                      </div>

                      <div
                        className="d-flex align-items-center justify-content-between text-muted"
                        style={{ fontSize: "10.5px" }}
                      >
                        <span>Target: {formatCurrency(rep.target)}</span>
                        <span>
                          {rep.gap > 0
                            ? `Shortfall: ${formatCurrency(rep.gap)}`
                            : "Quota Met 🎉"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Col>
          </Row>
        ) : (
          /* Case 4: Standard Full-Width Chart (Area, Column, Comparative) */
          <ReactApexChart
            options={chartConfig.options}
            series={chartConfig.series}
            type={chartConfig.type}
            height={chartConfig.height}
          />
        )}
      </CardBody>
    </Card>
  );
};

export default ReportChartRenderer;
