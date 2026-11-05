import React from "react";
import { Card, CardBody, CardHeader } from "reactstrap";
import ReactApexChart from "react-apexcharts";
import { formatCurrency } from "./dashboardUtils";

const RevenueTrendChart = ({ data = [] }) => {
  const isDark = typeof document !== "undefined" && (
    document.documentElement.getAttribute("data-bs-theme") === "dark" ||
    document.documentElement.getAttribute("data-layout-mode") === "dark"
  );
  const points = Array.isArray(data) && data.length > 0 ? data : [];

  const categories = points.map((p) => p.month_label);
  // Values in Lakhs for clean chart scaling or raw INR
  const values = points.map((p) => Number(p.revenue || 0));

  const chartOptions = {
    chart: {
      type: "area",
      height: 220,
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: { enabled: true, easing: "easeinout", speed: 600 },
      dropShadow: {
        enabled: true,
        top: 2,
        left: 0,
        blur: 4,
        opacity: 0.18,
        color: "#7f1d1d",
      },
    },
    stroke: {
      curve: "smooth",
      width: 2.5,
      colors: ["#7f1d1d"],
    },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.38,
        opacityTo: 0.04,
        stops: [0, 95],
        colorStops: [
          { offset: 0, color: "#7f1d1d", opacity: 0.38 },
          { offset: 100, color: "#7f1d1d", opacity: 0.02 },
        ],
      },
    },
    markers: {
      size: 4,
      colors: ["#7f1d1d"],
      strokeColors: "#ffffff",
      strokeWidth: 2,
      hover: { size: 6.5 },
    },
    colors: ["#7f1d1d"],
    dataLabels: { enabled: false },
    xaxis: {
      categories:
        categories.length > 0
          ? categories
          : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"],
      labels: {
        style: { fontSize: "11px", fontWeight: 500, colors: isDark ? "#cbd5e1" : "#64748b" },
      },
      axisBorder: { show: true, color: isDark ? "#363d45" : "#e2e8f0" },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        formatter: (val) => formatCurrency(val),
        style: { fontSize: "10px", colors: "#94a3b8" },
      },
    },
    grid: {
      borderColor: isDark ? "#32383e" : "#f1f5f9",
      strokeDashArray: 3,
    },
    tooltip: {
      theme: isDark ? "dark" : "light",
      y: {
        formatter: (val, { dataPointIndex }) => {
          const deals = points[dataPointIndex]?.deal_count || 0;
          return `${formatCurrency(val)} (${deals} won deals)`;
        },
      },
    },
  };

  const series = [{ name: "Revenue", data: values }];

  return (
    <Card className="crm-card-3d crm-accent-maroon h-100">
      <CardHeader
        className="bg-transparent border-bottom p-3 d-flex align-items-center justify-content-between"
        style={{ borderColor: "#f1f5f9" }}
      >
        <div className="d-flex align-items-center">
          <i className="ri-line-chart-line me-2" style={{ color: "#7f1d1d", fontSize: "1.05rem" }} />
          <div>
            <h5 className="card-title mb-0 fw-semibold" style={{ fontSize: "0.9375rem", color: "#1e293b" }}>
              Revenue Trend
            </h5>
            <small className="text-muted" style={{ fontSize: "0.72rem" }}>
              (Closed Deals)
            </small>
          </div>
        </div>

        <span className="rounded-0 px-2 py-1 fw-semibold crm-header-badge"
          style={{
            backgroundColor: "#f8fafc",
            color: "#64748b",
            fontSize: "0.72rem",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
          }}
        >
          Monthly
        </span>
      </CardHeader>
      <CardBody className="p-2 pt-3">
        <div style={{ height: "230px" }}>
          <ReactApexChart
            options={chartOptions}
            series={series}
            type="area"
            height={220}
          />
        </div>
      </CardBody>
    </Card>
  );
};

export default RevenueTrendChart;
