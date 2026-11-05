import React, { useMemo } from "react";
import ReactApexChart from "react-apexcharts";
import { Card, CardHeader, CardBody } from "reactstrap";
import { formatCurrency, formatNumber } from "../utils/reportUtils";

const ReportChartRenderer = ({ chartType, chartData, title }) => {
  const data = Array.isArray(chartData) ? chartData : [];

  const chartConfig = useMemo(() => {
    if (data.length === 0) return null;

    const baseFont = {
      fontFamily: "Inter, sans-serif",
      colors: "#64748b",
      fontSize: "12px",
    };

    // 1. Horizontal Bar (e.g., Pipeline Stages, Overdue Tasks by Rep)
    if (chartType === "horizontal_bar" || chartType === "funnel") {
      const categories = data.map(
        (d) => d.stage_name || d.name || d.rep_name || d.source_name || "Stage"
      );
      const values = data.map((d) =>
        Number(d.deal_count ?? d.count ?? d.total_amount ?? d.lead_count ?? 0)
      );
      const amounts = data.map((d) => Number(d.total_amount ?? 0));

      const hasAmount = amounts.some((a) => a > 0);

      return {
        type: "bar",
        height: Math.max(280, categories.length * 45),
        series: [
          {
            name: hasAmount ? "Deal Count" : "Count",
            data: values,
          },
        ],
        options: {
          chart: {
            toolbar: { show: false },
          },
          plotOptions: {
            bar: {
              horizontal: true,
              barHeight: "55%",
              borderRadius: 6,
              distributed: false,
            },
          },
          colors: ["#7f1d1d"],
          dataLabels: {
            enabled: true,
            textAnchor: "start",
            style: { colors: ["#ffffff"], fontSize: "11px", fontWeight: 600 },
            formatter: (val) => formatNumber(val),
            offsetX: 0,
          },
          xaxis: {
            categories,
            labels: { style: baseFont },
          },
          yaxis: {
            labels: { style: { ...baseFont, fontWeight: 500 } },
          },
          tooltip: {
            theme: "dark",
            y: {
              formatter: (val, opts) => {
                const idx = opts.dataPointIndex;
                const amt = amounts[idx];
                if (amt && amt > 0) {
                  return `${val} deals (${formatCurrency(amt)})`;
                }
                return `${val} records`;
              },
            },
          },
        },
      };
    }

    // 2. Donut / Pie (e.g., Win/Loss, Lead Source, Task Priority)
    if (chartType === "donut" || chartType === "pie") {
      const labels = data.map(
        (d) =>
          d.outcome ||
          d.source_name ||
          d.type ||
          d.name ||
          d.status ||
          "Segment"
      );
      const series = data.map((d) =>
        Number(
          d.deal_count ??
            d.count ??
            d.lead_count ??
            d.total_amount ??
            d.value ??
            0
        )
      );

      // Color scheme: SoftOnCloud Executive Palette (Won = Green, Lost = Red, Maroon, Slate, Amber, etc.)
      const defaultColors = [
        "#15803d",
        "#dc2626",
        "#7f1d1d",
        "#334155",
        "#b45309",
        "#475569",
        "#0f766e",
        "#78716c",
      ];

      return {
        type: "donut",
        height: 320,
        series,
        options: {
          chart: { toolbar: { show: false } },
          labels,
          colors: defaultColors.slice(0, labels.length),
          legend: {
            position: "bottom",
            horizontalAlign: "center",
            fontSize: "12px",
            labels: { colors: "#475569" },
            itemMargin: { horizontal: 12, vertical: 6 },
          },
          plotOptions: {
            pie: {
              donut: {
                size: "68%",
                labels: {
                  show: true,
                  total: {
                    show: true,
                    label: "Total Deals",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#64748b",
                    formatter: (w) =>
                      formatNumber(
                        w.globals.seriesTotals.reduce((a, b) => a + b, 0)
                      ),
                  },
                },
              },
            },
          },
          dataLabels: { enabled: true, style: { fontSize: "11px" } },
          tooltip: {
            theme: "dark",
            y: {
              formatter: (val) => `${val} deals`,
            },
          },
        },
      };
    }

    // 3. Area / Line (e.g., Revenue Forecast, Monthly Lead Velocity)
    if (chartType === "area" || chartType === "line") {
      const categories = data.map(
        (d) => d.month_label || d.period || d.date || d.label || "Month"
      );

      // Check if multi-series: unweighted vs weighted
      const hasWeighted = data.some(
        (d) => d.weighted_amount !== undefined || d.weighted_forecast !== undefined
      );

      const series = hasWeighted
        ? [
            {
              name: "Unweighted Pipeline",
              data: data.map((d) =>
                Number(d.unweighted_amount ?? d.pipeline_amount ?? 0)
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
        height: 300,
        series,
        options: {
          chart: { toolbar: { show: false }, zoom: { enabled: false } },
          colors: hasWeighted ? ["#94a3b8", "#7f1d1d"] : ["#7f1d1d"],
          stroke: { curve: "smooth", width: 2.5 },
          fill: {
            type: "gradient",
            gradient: {
              shadeIntensity: 1,
              opacityFrom: 0.45,
              opacityTo: 0.05,
              stops: [0, 95, 100],
            },
          },
          xaxis: {
            categories,
            labels: { style: baseFont },
          },
          yaxis: {
            labels: {
              style: baseFont,
              formatter: (val) => formatCurrency(val),
            },
          },
          tooltip: {
            theme: "dark",
            y: {
              formatter: (val) => formatCurrency(val),
            },
          },
          legend: {
            position: "top",
            horizontalAlign: "right",
            fontSize: "12px",
            labels: { colors: "#475569" },
          },
        },
      };
    }

    // 4. Comparative Bar / Scorecard / ROI (Target vs Achieved, Spend vs Revenue)
    if (
      chartType === "scorecard" ||
      chartType === "roi_compare" ||
      chartType === "matrix"
    ) {
      const categories = data.map(
        (d) =>
          d.rep_name ||
          d.campaign_name ||
          d.name ||
          d.source_name ||
          "Record"
      );

      const isTarget = data.some((d) => d.target_amount !== undefined);
      const isRoi = data.some((d) => d.spend !== undefined);

      let series = [];
      let colors = ["#7f1d1d", "#16a34a"];

      if (isTarget) {
        series = [
          {
            name: "Target Quota",
            data: data.map((d) => Number(d.target_amount ?? 0)),
          },
          {
            name: "Achieved Revenue",
            data: data.map((d) => Number(d.achieved_amount ?? 0)),
          },
        ];
        colors = ["#94a3b8", "#16a34a"];
      } else if (isRoi) {
        series = [
          {
            name: "Budget / Spend",
            data: data.map((d) => Number(d.spend ?? d.budget ?? 0)),
          },
          {
            name: "Closed Revenue",
            data: data.map((d) => Number(d.revenue ?? 0)),
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
        height: 320,
        series,
        options: {
          chart: { toolbar: { show: false } },
          plotOptions: {
            bar: {
              horizontal: false,
              columnWidth: "45%",
              borderRadius: 5,
            },
          },
          colors,
          xaxis: {
            categories,
            labels: {
              style: baseFont,
              rotate: -25,
              trim: true,
              maxHeight: 70,
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
            y: {
              formatter: (val) => formatCurrency(val),
            },
          },
        },
      };
    }

    // 5. Trend Column / Standard Column (e.g., Activity effort, Document counts)
    const categories = data.map(
      (d) =>
        d.act_type ||
        d.name ||
        d.month ||
        d.source_name ||
        d.folder_name ||
        "Item"
    );
    const seriesValues = data.map((d) =>
      Number(d.count ?? d.lead_count ?? d.activity_count ?? d.value ?? 0)
    );

    return {
      type: "bar",
      height: 290,
      series: [{ name: "Count", data: seriesValues }],
      options: {
        chart: { toolbar: { show: false } },
        plotOptions: {
          bar: {
            horizontal: false,
            columnWidth: "40%",
            borderRadius: 6,
          },
        },
        colors: ["#7f1d1d"],
        dataLabels: { enabled: false },
        xaxis: {
          categories,
          labels: { style: baseFont },
        },
        yaxis: {
          labels: {
            style: baseFont,
            formatter: (val) => formatNumber(val),
          },
        },
        tooltip: {
          theme: "dark",
          y: {
            formatter: (val) => `${formatNumber(val)} items`,
          },
        },
      },
    };
  }, [data, chartType]);

  if (!chartConfig) {
    return (
      <Card className="shadow-sm border-0 mb-4" style={{ borderRadius: "12px" }}>
        <CardBody className="text-center py-5">
          <div
            className="d-inline-flex align-items-center justify-content-center mb-3"
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              backgroundColor: "rgba(127, 29, 29, 0.08)",
              color: "#7f1d1d",
              fontSize: "24px",
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

  return (
    <Card className="shadow-sm border-0 mb-4" style={{ borderRadius: "12px" }}>
      <CardHeader className="bg-transparent border-bottom py-3 d-flex align-items-center justify-content-between">
        <h6 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2">
          <i
            className="ri-pie-chart-2-line"
            style={{ color: "#7f1d1d", fontSize: "16px" }}
          ></i>
          Visual Analytics & Trends
        </h6>
        <span
          className="badge text-uppercase"
          style={{
            backgroundColor: "rgba(127, 29, 29, 0.08)",
            color: "#7f1d1d",
            fontSize: "10px",
            fontWeight: 600,
            padding: "5px 10px",
            borderRadius: "6px",
          }}
        >
          {chartType?.replace(/_/g, " ")}
        </span>
      </CardHeader>
      <CardBody className="pt-2">
        <ReactApexChart
          options={chartConfig.options}
          series={chartConfig.series}
          type={chartConfig.type}
          height={chartConfig.height}
        />
      </CardBody>
    </Card>
  );
};

export default ReportChartRenderer;

