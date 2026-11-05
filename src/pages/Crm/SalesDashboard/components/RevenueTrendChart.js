import React, { useState } from "react";
import { Card, CardBody, CardHeader } from "reactstrap";
import { useSelector } from "react-redux";
import ReactApexChart from "react-apexcharts";

/** Formats values in Indian Lakhs/Crores format: e.g. ₹ 20.50 L, ₹ 1.25 Cr, ₹ 0 */
const formatCalloutInr = (val) => {
  const num = Number(val) || 0;
  if (num === 0) return "₹ 0";
  if (num >= 10000000) {
    const cr = num / 10000000;
    return `₹ ${cr.toFixed(2)} Cr`;
  }
  if (num >= 100000) {
    const l = num / 100000;
    return `₹ ${l.toFixed(2)} L`;
  }
  if (num >= 1000) {
    const k = num / 1000;
    return `₹ ${k.toFixed(1)} k`;
  }
  return `₹ ${num.toLocaleString("en-IN")}`;
};

/** Formats Y-axis tick labels: e.g. ₹ 0, ₹ 5 L, ₹ 10 L, ₹ 15 L, ₹ 20 L */
const formatYAxisInr = (val) => {
  const num = Number(val) || 0;
  if (num === 0) return "₹ 0";
  if (num >= 10000000) {
    const cr = num / 10000000;
    return `₹ ${cr % 1 === 0 ? cr.toFixed(0) : cr.toFixed(1)} Cr`;
  }
  if (num >= 100000) {
    const l = num / 100000;
    return `₹ ${l % 1 === 0 ? l.toFixed(0) : l.toFixed(1)} L`;
  }
  if (num >= 1000) {
    return `₹ ${(num / 1000).toFixed(0)} k`;
  }
  return `₹ ${num}`;
};

const RevenueTrendChart = ({ data = [] }) => {
  const layoutModeType = useSelector((state) => state.Layout?.layoutModeType);
  const isDark =
    layoutModeType === "dark" ||
    (typeof document !== "undefined" &&
      (document.documentElement.getAttribute("data-bs-theme") === "dark" ||
        document.documentElement.getAttribute("data-layout-mode") === "dark"));

  const [filterMode, setFilterMode] = useState("month");

  // Determine trend dataset from database props
  const trendData = Array.isArray(data) ? data : [];

  const categories = trendData.map((d) => d.month_label);
  const revenueSeries = trendData.map((d) => Number(d.revenue) || 0);
  const wonSeries = trendData.map((d) => Number(d.won_revenue) || 0);

  // Identify peak / active data point for the persistent callout pin
  let peakIndex = -1;
  let peakVal = 0;
  revenueSeries.forEach((v, idx) => {
    if (v > peakVal) {
      peakVal = v;
      peakIndex = idx;
    }
  });

  // If no revenue peak found, check won revenue
  if (peakIndex < 0) {
    wonSeries.forEach((v, idx) => {
      if (v > peakVal) {
        peakVal = v;
        peakIndex = idx;
      }
    });
  }

  const peakPoint =
    peakIndex >= 0 && peakVal > 0
      ? {
          month: categories[peakIndex],
          value: peakVal,
        }
      : null;

  const series = [
    {
      name: "Revenue (₹)",
      type: "column",
      data: revenueSeries,
    },
    {
      name: "Won Revenue (₹)",
      type: "column",
      data: wonSeries,
    },
    {
      name: "Trend",
      type: "area",
      data: revenueSeries,
    },
  ];

  const options = {
    chart: {
      toolbar: { show: false },
      stacked: false,
      fontFamily: "inherit",
      zoom: { enabled: false },
    },
    stroke: {
      width: [0, 0, 2.5],
      curve: "smooth",
    },
    plotOptions: {
      bar: {
        columnWidth: "16%",
        borderRadius: 2,
      },
    },
    // Colors: Maroon for Revenue Column, Emerald for Won Revenue, Crimson for Trend Line/Area
    colors: ["#b91c1c", "#10b981", "#dc2626"],
    fill: {
      type: ["solid", "solid", "gradient"],
      opacity: [0.95, 0.95, 0.4],
      gradient: {
        shade: isDark ? "dark" : "light",
        type: "vertical",
        shadeIntensity: 0.5,
        gradientToColors: ["#b91c1c", "#10b981", isDark ? "#450a0a" : "#fee2e2"],
        inverseColors: false,
        opacityFrom: 0.45,
        opacityTo: 0.02,
        stops: [0, 95, 100],
      },
    },
    markers: {
      size: [0, 0, 4.5],
      colors: ["#b91c1c", "#10b981", "#dc2626"],
      strokeColors: "#ffffff",
      strokeWidth: 1.5,
      hover: {
        size: 7,
        sizeOffset: 3,
      },
    },
    legend: {
      show: false, // Using pixel-perfect custom header legend below title
    },
    grid: {
      borderColor: isDark ? "#32383e" : "#f1f5f9",
      strokeDashArray: 3,
      yaxis: { lines: { show: true } },
      xaxis: { lines: { show: false } },
      padding: { top: 20, right: 15, bottom: 0, left: 10 },
    },
    xaxis: {
      categories,
      labels: {
        style: {
          colors: isDark ? "#94a3b8" : "#64748b",
          fontSize: "11px",
          fontWeight: 500,
        },
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        formatter: (v) => formatYAxisInr(v),
        style: {
          colors: isDark ? "#94a3b8" : "#64748b",
          fontSize: "11px",
          fontWeight: 500,
        },
      },
      tickAmount: 4,
    },
    // Dynamic Callout Pin on highest data point
    annotations: {
      points: peakPoint
        ? [
            {
              x: peakPoint.month,
              y: peakPoint.value,
              marker: {
                size: 8,
                fillColor: "#dc2626",
                strokeColor: "#ffffff",
                strokeWidth: 3,
                shape: "circle",
              },
              label: {
                borderColor: "#ef4444",
                borderWidth: 1.5,
                borderRadius: 8,
                text: [
                  formatCalloutInr(peakPoint.value),
                  `(${peakPoint.month})`,
                ],
                textAnchor: "middle",
                offsetY: -16,
                style: {
                  background: isDark ? "#1e293b" : "#ffffff",
                  color: isDark ? "#f8fafc" : "#0f172a",
                  fontSize: "12px",
                  fontWeight: 700,
                  padding: {
                    left: 14,
                    right: 14,
                    top: 6,
                    bottom: 6,
                  },
                },
              },
            },
          ]
        : [],
    },
    tooltip: {
      enabled: true,
      shared: true,
      intersect: false,
      custom: function ({ seriesIndex, dataPointIndex, w }) {
        const month = categories[dataPointIndex] || "";
        const rev = revenueSeries[dataPointIndex] || 0;
        const won = wonSeries[dataPointIndex] || 0;
        const displayVal = rev > 0 ? rev : won > 0 ? won : 0;

        return `
          <div style="
            background: ${isDark ? "#1e293b" : "#ffffff"};
            border: 1.5px solid #ef4444;
            border-radius: 8px;
            padding: 7px 16px;
            box-shadow: 0 4px 14px rgba(239, 68, 68, 0.18);
            text-align: center;
            font-family: inherit;
            position: relative;
          ">
            <div style="font-size: 13px; font-weight: 700; color: ${
              isDark ? "#f8fafc" : "#0f172a"
            }; line-height: 1.2;">
              ${formatCalloutInr(displayVal)}
            </div>
            <div style="font-size: 11px; font-weight: 500; color: ${
              isDark ? "#94a3b8" : "#475569"
            }; margin-top: 3px;">
              (${month})
            </div>
            <div style="
              position: absolute;
              bottom: -6px;
              left: 50%;
              transform: translateX(-50%);
              width: 0;
              height: 0;
              border-left: 6px solid transparent;
              border-right: 6px solid transparent;
              border-top: 6px solid #ef4444;
            "></div>
          </div>
        `;
      },
    },
  };

  return (
    <Card
      className="border shadow-none h-100 mb-0 bg-white"
      style={{
        borderRadius: "12px",
        borderColor: isDark ? "#334155" : "#e2e8f0",
        backgroundColor: isDark ? "#1e293b" : "#ffffff",
      }}
    >
      {/* Top Header: Title + Dropdown */}
      <CardHeader
        className="bg-transparent border-0 pt-3 pb-1 px-3 d-flex align-items-center justify-content-between"
      >
        <h6
          className="fw-bold fs-14 mb-0"
          style={{ color: isDark ? "#f8fafc" : "#0f172a" }}
        >
          Revenue Trend
        </h6>
        <div style={{ width: 105 }}>
          <select
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value)}
            className="form-select form-select-sm border shadow-none"
            style={{
              borderRadius: "6px",
              fontSize: "11px",
              fontWeight: 500,
              padding: "4px 8px",
              cursor: "pointer",
              backgroundColor: isDark ? "#0f172a" : "#ffffff",
              color: isDark ? "#cbd5e1" : "#334155",
              borderColor: isDark ? "#334155" : "#e2e8f0",
            }}
          >
            <option value="month">By Month</option>
            <option value="quarter">By Quarter</option>
            <option value="week">By Week</option>
          </select>
        </div>
      </CardHeader>

      {/* Custom Clean Legend matching mockup */}
      <div className="d-flex align-items-center gap-3 px-3 pt-1 pb-1">
        {/* Revenue Legend */}
        <div className="d-flex align-items-center gap-1 fs-12">
          <span
            style={{
              width: 8,
              height: 8,
              backgroundColor: "#b91c1c",
              borderRadius: "50%",
              display: "inline-block",
            }}
          />
          <span
            className="fw-medium"
            style={{ color: isDark ? "#cbd5e1" : "#334155" }}
          >
            Revenue (₹)
          </span>
        </div>

        {/* Won Revenue Legend */}
        <div className="d-flex align-items-center gap-1 fs-12">
          <span
            style={{
              width: 8,
              height: 8,
              backgroundColor: "#10b981",
              borderRadius: "50%",
              display: "inline-block",
            }}
          />
          <span
            className="fw-medium"
            style={{ color: isDark ? "#cbd5e1" : "#334155" }}
          >
            Won Revenue (₹)
          </span>
        </div>

        {/* Trend Legend */}
        <div className="d-flex align-items-center gap-1 fs-12">
          <span
            style={{
              width: 14,
              height: 2.5,
              backgroundColor: "#dc2626",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                backgroundColor: "#dc2626",
                borderRadius: "50%",
                position: "absolute",
              }}
            />
          </span>
          <span className="fw-medium text-danger">Trend</span>
        </div>
      </div>

      {/* Chart Canvas */}
      <CardBody className="p-2 pt-0">
        {trendData.length === 0 ? (
          <div
            className="d-flex flex-column align-items-center justify-content-center text-muted py-5"
            style={{ minHeight: "280px" }}
          >
            <i className="ri-line-chart-line fs-32 text-muted mb-2" />
            <span className="fs-13">No revenue trend data for this period.</span>
          </div>
        ) : (
          <div style={{ minHeight: "280px" }}>
            <ReactApexChart
              options={options}
              series={series}
              type="line"
              height={280}
            />
          </div>
        )}
      </CardBody>
    </Card>
  );
};

export default RevenueTrendChart;
