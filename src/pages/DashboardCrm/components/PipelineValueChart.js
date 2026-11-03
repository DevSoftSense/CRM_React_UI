import React from "react";
import { Card, CardBody, CardHeader } from "reactstrap";
import ReactApexChart from "react-apexcharts";
import { formatCurrency } from "./dashboardUtils";

const PipelineValueChart = ({ data = {} }) => {
  const totalValue = data?.total_pipeline_value || 0;
  const stages = Array.isArray(data?.stages) ? data.stages : [];

  const categories = stages.map((s) => s.stage_name || s.stage_code);
  const amounts = stages.map((s) => Number(s.amount || 0));
  const colors = stages.map((s) => s.color || "#7f1d1d");

  const chartOptions = {
    chart: {
      type: "bar",
      height: 220,
      toolbar: { show: false },
      animations: { enabled: true, easing: "easeinout", speed: 600 },
      dropShadow: {
        enabled: true,
        top: 2,
        left: 0,
        blur: 4,
        opacity: 0.16,
      },
    },
    plotOptions: {
      bar: {
        columnWidth: "46%",
        distributed: true,
        borderRadius: 0,
        dataLabels: {
          position: "top",
        },
      },
    },
    colors: colors.length > 0 ? colors : ["#475569", "#7f1d1d", "#d97706", "#991b1b", "#059669"],
    dataLabels: {
      enabled: true,
      formatter: (val) => (val > 0 ? formatCurrency(val) : ""),
      offsetY: -20,
      style: {
        fontSize: "10px",
        fontWeight: 600,
        colors: ["#334155"],
      },
    },
    legend: { show: false },
    xaxis: {
      categories: categories.length > 0 ? categories : ["Prospecting", "Qualified", "Proposal", "Negotiation", "Won"],
      labels: {
        style: {
          fontSize: "11px",
          fontWeight: 500,
          colors: "#64748b",
        },
      },
      axisBorder: { show: true, color: "#e2e8f0" },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        formatter: (val) => formatCurrency(val),
        style: { fontSize: "10px", colors: "#94a3b8" },
      },
    },
    grid: {
      borderColor: "#f1f5f9",
      strokeDashArray: 3,
    },
    tooltip: {
      theme: "light",
      y: {
        formatter: (val, { dataPointIndex }) => {
          const count = stages[dataPointIndex]?.count || 0;
          return `${formatCurrency(val)} (${count} deals)`;
        },
      },
    },
  };

  const series = [{ name: "Value", data: amounts }];

  return (
    <Card className="crm-card-3d crm-accent-amber h-100">
      <CardHeader
        className="bg-transparent border-bottom p-3"
        style={{ borderColor: "#f1f5f9" }}
      >
        <div className="d-flex align-items-center justify-content-between mb-1">
          <div className="d-flex align-items-center">
            <i className="ri-bar-chart-grouped-line me-2" style={{ color: "#d97706", fontSize: "1.05rem" }} />
            <h5 className="card-title mb-0 fw-semibold" style={{ fontSize: "0.9375rem", color: "#1e293b" }}>
              Pipeline Value
            </h5>
          </div>
          <span
            className="rounded-0 px-2 py-1 fw-semibold"
            style={{
              backgroundColor: "#f8fafc",
              color: "#64748b",
              border: "1px solid #e2e8f0",
              fontSize: "0.72rem",
              boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            }}
          >
            By Stage
          </span>
        </div>
        <p className="text-muted mb-0" style={{ fontSize: "0.8125rem" }}>
          Total Pipeline Value:{" "}
          <strong style={{ color: "#7f1d1d" }}>{formatCurrency(totalValue)}</strong>
        </p>
      </CardHeader>
      <CardBody className="p-2 pt-3">
        <div style={{ height: "230px" }}>
          <ReactApexChart
            options={chartOptions}
            series={series}
            type="bar"
            height={220}
          />
        </div>
      </CardBody>
    </Card>
  );
};

export default PipelineValueChart;
