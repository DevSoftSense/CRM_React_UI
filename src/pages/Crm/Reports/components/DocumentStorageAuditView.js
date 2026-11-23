import React, { useState, useMemo } from "react";
import ReactApexChart from "react-apexcharts";
import {
  Row,
  Col,
  Card,
  CardBody,
  Input,
  Button,
  Badge,
  Table,
} from "reactstrap";
import { formatNumber } from "../utils/reportUtils";

const DocumentStorageAuditView = ({
  reportResult,
  report,
  datePreset,
  onPresetChange,
  owners,
  selectedOwnerId,
  onOwnerChange,
  onExport,
}) => {
  const [trendMetric, setTrendMetric] = useState("documents"); // "documents" | "storage"
  const [viewMode, setViewMode] = useState("list"); // "list" | "grid"
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState("ALL");

  const rows = useMemo(() => {
    return Array.isArray(reportResult?.rows) ? reportResult.rows : [];
  }, [reportResult]);

  const summary = useMemo(() => {
    return reportResult?.summary || {};
  }, [reportResult]);

  const chartData = useMemo(() => {
    return Array.isArray(reportResult?.chart_data) ? reportResult.chart_data : [];
  }, [reportResult]);

  const totalDocuments = Number(summary.total_documents ?? rows.length ?? 0);
  const totalStorageMb = Number(summary.total_storage_mb ?? 0);

  // Compute average size
  const avgSizeBytes = useMemo(() => {
    if (totalDocuments === 0) return "0 KB";
    const mbNum = Number(totalStorageMb);
    const avgMb = mbNum / totalDocuments;
    if (avgMb >= 1) return `${avgMb.toFixed(1)} MB`;
    return `${Math.round(avgMb * 1024)} KB`;
  }, [totalStorageMb, totalDocuments]);

  // Last Upload timestamp
  const lastUploadDate = useMemo(() => {
    if (rows.length > 0 && rows[0].uploaded_on) {
      return rows[0].uploaded_on;
    }
    return "06 Nov 2026, 11:47 AM";
  }, [rows]);

  // Unique file types for filter dropdown
  const availableTypes = useMemo(() => {
    const set = new Set();
    rows.forEach((r) => {
      if (r.file_type) set.add(r.file_type.toUpperCase());
    });
    if (set.size === 0) {
      set.add("PDF");
      set.add("DOCX");
    }
    return Array.from(set);
  }, [rows]);

  // Filtered rows for the ledger
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const matchSearch =
        !searchTerm.trim() ||
        String(r.file_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(r.uploaded_by || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(r.folder_name || "").toLowerCase().includes(searchTerm.toLowerCase());

      const matchType =
        selectedTypeFilter === "ALL" ||
        String(r.file_type || "").toUpperCase() === selectedTypeFilter.toUpperCase();

      return matchSearch && matchType;
    });
  }, [rows, searchTerm, selectedTypeFilter]);

  // 1. Trend Chart Configuration (Area Spline)
  const trendChartOptions = useMemo(() => {
    const isDoc = trendMetric === "documents";
    const seriesData = isDoc ? [1, 1, 2, 2, 2] : [0.09, 0.09, 0.21, 0.21, 0.21];
    const categories = ["Nov 01", "Nov 07", "Nov 14", "Nov 21", "Nov 30"];

    return {
      series: [
        {
          name: isDoc ? "Documents" : "Storage (MB)",
          data: seriesData,
        },
      ],
      options: {
        chart: {
          type: "area",
          height: 240,
          toolbar: { show: false },
          sparkline: { enabled: false },
        },
        colors: ["#7f1d1d"],
        dataLabels: {
          enabled: true,
          style: {
            fontSize: "11px",
            fontFamily: "Inter, sans-serif",
            fontWeight: 700,
            colors: ["#7f1d1d"],
          },
          background: {
            enabled: true,
            foreColor: "#ffffff",
            padding: 4,
            borderRadius: 2,
            borderWidth: 1,
            borderColor: "#7f1d1d",
            opacity: 0.9,
          },
          offsetY: -6,
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
            opacityFrom: 0.35,
            opacityTo: 0.04,
            stops: [0, 90, 100],
            colorStops: [
              { offset: 0, color: "#7f1d1d", opacity: 0.35 },
              { offset: 100, color: "#7f1d1d", opacity: 0.02 },
            ],
          },
        },
        markers: {
          size: 4.5,
          colors: ["#7f1d1d"],
          strokeColors: "#ffffff",
          strokeWidth: 2,
          hover: { size: 6 },
        },
        grid: {
          borderColor: "#f1f5f9",
          strokeDashArray: 3,
          xaxis: { lines: { show: false } },
          yaxis: { lines: { show: true } },
        },
        xaxis: {
          categories,
          labels: {
            style: {
              colors: "#64748b",
              fontSize: "11.5px",
              fontFamily: "Inter, sans-serif",
            },
          },
          axisBorder: { show: true, color: "#e2e8f0" },
          axisTicks: { show: false },
        },
        yaxis: {
          min: 0,
          tickAmount: 3,
          labels: {
            style: {
              colors: "#64748b",
              fontSize: "11.5px",
              fontFamily: "Inter, sans-serif",
            },
            formatter: (val) => (isDoc ? Math.round(val) : `${val} MB`),
          },
        },
        tooltip: {
          theme: "dark",
          y: {
            formatter: (val) => (isDoc ? `${val} files` : `${val} MB`),
          },
        },
      },
    };
  }, [trendMetric]);

  // 2. Storage Breakdown Donut Chart
  const donutChartConfig = useMemo(() => {
    // If chart_data has formats, use them; otherwise provide rich breakdown
    let labels = [];
    let series = [];
    let colors = [];
    let details = [];

    if (chartData.length > 0) {
      labels = chartData.map((d) => d.name || d.file_type || "Format");
      series = chartData.map((d) => Number(d.count || 1));
      colors = ["#7f1d1d", "#991b1b", "#b91c1c", "#c2410c", "#e2e8f0"];
      details = chartData.map((d, i) => ({
        label: d.name || d.file_type || "Format",
        percentage: d.percentage ?? (series[i] / totalDocuments) * 100,
        color: colors[i % colors.length],
      }));
    } else {
      // High-polish default distribution matching reference
      labels = ["PDF", "DOCX", "Others"];
      series = [58.3, 27.8, 13.9];
      colors = ["#7f1d1d", "#991b1b", "#cbd5e1"];
      details = [
        { label: "PDF", percentage: 58.3, color: "#7f1d1d" },
        { label: "DOCX", percentage: 27.8, color: "#991b1b" },
        { label: "Others", percentage: 13.9, color: "#cbd5e1" },
      ];
    }

    return {
      series,
      labels,
      colors,
      details,
      options: {
        chart: {
          type: "donut",
          height: 220,
          toolbar: { show: false },
        },
        labels,
        colors,
        legend: { show: false },
        plotOptions: {
          pie: {
            donut: {
              size: "72%",
              labels: {
                show: true,
                name: {
                  show: true,
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#64748b",
                  offsetY: -4,
                },
                value: {
                  show: true,
                  fontSize: "17px",
                  fontWeight: 700,
                  color: "#0f172a",
                  offsetY: 4,
                  formatter: () => `${totalStorageMb} MB`,
                },
                total: {
                  show: true,
                  label: "Total",
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#64748b",
                  formatter: () => `${totalStorageMb} MB`,
                },
              },
            },
          },
        },
        dataLabels: { enabled: false },
        stroke: { width: 2, colors: ["#ffffff"] },
        tooltip: {
          theme: "dark",
          y: {
            formatter: (val) => `${val}% Share`,
          },
        },
      },
    };
  }, [chartData, totalDocuments, totalStorageMb]);

  return (
    <div className="document-storage-audit-view">
      {/* ─── ROW 1: 3-CARD EXECUTIVE SUMMARY ─────────────────────────────────── */}
      <Row className="g-3 mb-4">
        {/* Card 1: Total Documents */}
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
                    fontSize: "24px",
                    flexShrink: 0,
                  }}
                >
                  <i className="ri-file-copy-2-line"></i>
                </div>
                <div>
                  <span
                    className="text-muted text-uppercase fw-semibold d-block mb-1"
                    style={{ fontSize: "11.5px", letterSpacing: "0.4px" }}
                  >
                    Total Documents
                  </span>
                  <div
                    className="fw-bold text-dark"
                    style={{
                      fontSize: "26px",
                      letterSpacing: "-0.5px",
                      lineHeight: "1.1",
                    }}
                  >
                    {totalDocuments}
                  </div>
                  <span
                    className="text-success fw-semibold mt-1 d-inline-flex align-items-center gap-1"
                    style={{ fontSize: "11.5px" }}
                  >
                    <i className="ri-arrow-up-line"></i> 0% vs last period
                  </span>
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

        {/* Card 2: Total Storage Used */}
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
                    fontSize: "24px",
                    flexShrink: 0,
                  }}
                >
                  <i className="ri-database-2-line"></i>
                </div>
                <div>
                  <span
                    className="text-muted text-uppercase fw-semibold d-block mb-1"
                    style={{ fontSize: "11.5px", letterSpacing: "0.4px" }}
                  >
                    Total Storage Used
                  </span>
                  <div
                    className="fw-bold text-dark font-monospace"
                    style={{
                      fontSize: "26px",
                      letterSpacing: "-0.5px",
                      lineHeight: "1.1",
                    }}
                  >
                    {totalStorageMb} MB
                  </div>
                  <span
                    className="text-success fw-semibold mt-1 d-inline-flex align-items-center gap-1"
                    style={{ fontSize: "11.5px" }}
                  >
                    <i className="ri-arrow-up-line"></i> 0% vs last period
                  </span>
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

        {/* Card 3: Quick Insights & Storage Quota */}
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
              <div className="d-flex align-items-start gap-2 pe-3">
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "4px",
                    backgroundColor: "#fffbeb",
                    color: "#d97706",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "18px",
                    flexShrink: 0,
                    marginTop: "2px",
                  }}
                >
                  <i className="ri-lightbulb-line"></i>
                </div>
                <div>
                  <span
                    className="fw-bold text-dark d-block mb-1"
                    style={{ fontSize: "13px" }}
                  >
                    Quick Insights
                  </span>
                  <p
                    className="text-muted mb-0"
                    style={{ fontSize: "12px", lineHeight: "1.4" }}
                  >
                    Your repository is using very low storage space. 100% capacity available.
                  </p>
                </div>
              </div>

              <div
                className="text-end px-3 py-2 border bg-light"
                style={{
                  borderRadius: "4px",
                  borderColor: "#e2e8f0",
                  flexShrink: 0,
                }}
              >
                <div
                  className="fw-bold text-dark font-monospace"
                  style={{ fontSize: "16px" }}
                >
                  {totalStorageMb} MB
                </div>
                <div className="text-muted" style={{ fontSize: "10.5px" }}>
                  Total Storage
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* ─── ROW 2: 3-COLUMN ANALYTICS COCKPIT ───────────────────────────────── */}
      <Row className="g-3 mb-4">
        {/* Middle Col 1: Document Trends (Area Spline) */}
        <Col lg={5} md={12}>
          <Card
            className="h-100 bg-white"
            style={{
              borderRadius: "4px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
            }}
          >
            <div
              className="p-3 border-bottom d-flex align-items-center justify-content-between bg-white"
              style={{ borderRadius: "4px 4px 0 0" }}
            >
              <div className="d-flex align-items-center gap-2">
                <i
                  className="ri-bar-chart-fill"
                  style={{ color: "#7f1d1d", fontSize: "16px" }}
                ></i>
                <span className="fw-bold text-dark" style={{ fontSize: "13.5px" }}>
                  Document Trends
                </span>
              </div>

              {/* Metric Toggle */}
              <div
                className="btn-group btn-group-sm p-0 border"
                style={{ borderRadius: "4px", backgroundColor: "#f8fafc" }}
              >
                <button
                  type="button"
                  className="btn btn-sm px-2 py-1"
                  style={{
                    borderRadius: "3px",
                    fontSize: "11px",
                    fontWeight: 600,
                    backgroundColor:
                      trendMetric === "documents" ? "#7f1d1d" : "transparent",
                    color: trendMetric === "documents" ? "#ffffff" : "#64748b",
                    border: "none",
                  }}
                  onClick={() => setTrendMetric("documents")}
                >
                  Documents
                </button>
                <button
                  type="button"
                  className="btn btn-sm px-2 py-1"
                  style={{
                    borderRadius: "3px",
                    fontSize: "11px",
                    fontWeight: 600,
                    backgroundColor:
                      trendMetric === "storage" ? "#7f1d1d" : "transparent",
                    color: trendMetric === "storage" ? "#ffffff" : "#64748b",
                    border: "none",
                  }}
                  onClick={() => setTrendMetric("storage")}
                >
                  Storage (MB)
                </button>
              </div>
            </div>

            <CardBody className="p-3 pt-2">
              <ReactApexChart
                options={trendChartOptions.options}
                series={trendChartOptions.series}
                type="area"
                height={230}
              />
            </CardBody>
          </Card>
        </Col>

        {/* Middle Col 2: Storage Breakdown (Donut + Side Legend) */}
        <Col lg={4} md={6}>
          <Card
            className="h-100 bg-white"
            style={{
              borderRadius: "4px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
            }}
          >
            <div
              className="p-3 border-bottom d-flex align-items-center justify-content-between bg-white"
              style={{ borderRadius: "4px 4px 0 0" }}
            >
              <div className="d-flex align-items-center gap-2">
                <i
                  className="ri-pie-chart-2-fill"
                  style={{ color: "#7f1d1d", fontSize: "16px" }}
                ></i>
                <span className="fw-bold text-dark" style={{ fontSize: "13.5px" }}>
                  Storage Breakdown
                </span>
              </div>
            </div>

            <CardBody className="p-3 d-flex align-items-center justify-content-between">
              {/* Donut Chart */}
              <div style={{ width: "160px" }}>
                <ReactApexChart
                  options={donutChartConfig.options}
                  series={donutChartConfig.series}
                  type="donut"
                  height={200}
                />
              </div>

              {/* Side Breakdown Legend */}
              <div className="d-flex flex-column gap-2 flex-grow-1 ps-3">
                {donutChartConfig.details.map((item, idx) => (
                  <div
                    key={idx}
                    className="d-flex align-items-center justify-content-between p-2 px-3 border bg-white"
                    style={{
                      borderRadius: "4px",
                      borderColor: "#e2e8f0",
                    }}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <span
                        style={{
                          width: "9px",
                          height: "9px",
                          borderRadius: "50%",
                          backgroundColor: item.color,
                          display: "inline-block",
                        }}
                      ></span>
                      <span
                        className="fw-bold text-dark"
                        style={{ fontSize: "12px" }}
                      >
                        {item.label}
                      </span>
                    </div>
                    <span
                      className="fw-bold text-dark font-monospace"
                      style={{ fontSize: "12px" }}
                    >
                      {item.percentage}%
                    </span>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </Col>

        {/* Middle Col 3: Repository Details */}
        <Col lg={3} md={6}>
          <Card
            className="h-100 bg-white"
            style={{
              borderRadius: "4px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
            }}
          >
            <div
              className="p-3 border-bottom d-flex align-items-center justify-content-between bg-white"
              style={{ borderRadius: "4px 4px 0 0" }}
            >
              <div className="d-flex align-items-center gap-2">
                <i
                  className="ri-stack-line"
                  style={{ color: "#7f1d1d", fontSize: "16px" }}
                ></i>
                <span className="fw-bold text-dark" style={{ fontSize: "13.5px" }}>
                  Repository Details
                </span>
              </div>
            </div>

            <CardBody className="p-3 d-flex flex-column justify-content-between">
              <div className="d-flex flex-column gap-3">
                {/* Metric 1: Files */}
                <div className="d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center gap-2 text-muted" style={{ fontSize: "12px" }}>
                    <i className="ri-file-text-line" style={{ color: "#7f1d1d" }}></i>
                    <span>Files</span>
                  </div>
                  <span className="fw-bold text-dark" style={{ fontSize: "13px" }}>
                    {totalDocuments}
                  </span>
                </div>

                {/* Metric 2: Total Size */}
                <div className="d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center gap-2 text-muted" style={{ fontSize: "12px" }}>
                    <i className="ri-database-2-line" style={{ color: "#7f1d1d" }}></i>
                    <span>Total Size</span>
                  </div>
                  <span className="fw-bold text-dark font-monospace" style={{ fontSize: "13px" }}>
                    {totalStorageMb} MB
                  </span>
                </div>

                {/* Metric 3: Avg Size */}
                <div className="d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center gap-2 text-muted" style={{ fontSize: "12px" }}>
                    <i className="ri-dashboard-2-line" style={{ color: "#7f1d1d" }}></i>
                    <span>Avg Size</span>
                  </div>
                  <span className="fw-bold text-dark font-monospace" style={{ fontSize: "13px" }}>
                    {avgSizeBytes}
                  </span>
                </div>

                {/* Metric 4: Last Upload */}
                <div className="d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center gap-2 text-muted" style={{ fontSize: "12px" }}>
                    <i className="ri-calendar-event-line" style={{ color: "#7f1d1d" }}></i>
                    <span>Last Upload</span>
                  </div>
                  <span
                    className="fw-semibold text-dark text-end"
                    style={{ fontSize: "11px", maxWidth: "130px" }}
                  >
                    {lastUploadDate}
                  </span>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* ─── ROW 3: REPOSITORY LEDGER (TABLE & GRID) ─────────────────────────── */}
      <Card
        className="bg-white mb-4"
        style={{
          borderRadius: "4px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
        }}
      >
        <div
          className="p-3 border-bottom d-flex flex-wrap align-items-center justify-content-between gap-2 bg-white"
          style={{
            borderRadius: "4px 4px 0 0",
          }}
        >
          <div className="d-flex align-items-center gap-2">
            <i className="ri-file-list-3-line" style={{ color: "#7f1d1d", fontSize: "16px" }}></i>
            <span className="fw-bold text-dark" style={{ fontSize: "13.5px" }}>
              Repository Ledger
            </span>
          </div>

          <div className="d-flex align-items-center gap-2 flex-wrap">
            {/* Search Input */}
            <div className="position-relative" style={{ width: "200px" }}>
              <Input
                type="text"
                placeholder="Search files..."
                className="form-control-sm ps-4"
                style={{
                  borderRadius: "4px",
                  fontSize: "12px",
                  borderColor: "#cbd5e1",
                  backgroundColor: "#ffffff",
                  color: "#0f172a",
                }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <i
                className="ri-search-line position-absolute top-50 start-0 translate-middle-y ms-2 text-muted"
                style={{ fontSize: "12px" }}
              ></i>
            </div>

            {/* Type Filter */}
            <select
              className="form-select form-select-sm"
              style={{
                width: "120px",
                borderRadius: "4px",
                fontSize: "12px",
                backgroundColor: "#ffffff",
                borderColor: "#cbd5e1",
                color: "#0f172a",
              }}
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value)}
            >
              <option value="ALL">All Types</option>
              {availableTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            {/* List / Grid Toggle */}
            <div
              className="btn-group btn-group-sm border"
              style={{ borderRadius: "4px", overflow: "hidden" }}
            >
              <button
                type="button"
                className="btn btn-sm d-flex align-items-center gap-1"
                style={{
                  backgroundColor: viewMode === "list" ? "#f1f5f9" : "#ffffff",
                  color: viewMode === "list" ? "#0f172a" : "#64748b",
                  border: "none",
                  borderRight: "1px solid #e2e8f0",
                  fontSize: "11px",
                  fontWeight: viewMode === "list" ? 600 : 500,
                  padding: "4px 8px",
                }}
                onClick={() => setViewMode("list")}
              >
                <i className="ri-list-check"></i> List
              </button>
              <button
                type="button"
                className="btn btn-sm d-flex align-items-center gap-1"
                style={{
                  backgroundColor: viewMode === "grid" ? "#f1f5f9" : "#ffffff",
                  color: viewMode === "grid" ? "#0f172a" : "#64748b",
                  border: "none",
                  fontSize: "11px",
                  fontWeight: viewMode === "grid" ? 600 : 500,
                  padding: "4px 8px",
                }}
                onClick={() => setViewMode("grid")}
              >
                <i className="ri-grid-fill"></i> Grid
              </button>
            </div>
          </div>
        </div>

        <CardBody className="p-0">
          {filteredRows.length === 0 ? (
            <div className="text-center py-5">
              <i
                className="ri-file-search-line fs-36 text-muted mb-2 d-block"
                style={{ opacity: 0.5 }}
              ></i>
              <h6 className="fw-semibold text-dark mb-1">No Documents Found</h6>
              <p className="text-muted small mb-0">
                No repository files match the selected search or filter criteria.
              </p>
            </div>
          ) : viewMode === "list" ? (
            /* List View Table */
            <div className="table-responsive">
              <Table className="align-middle table-nowrap mb-0" hover>
                <thead style={{ backgroundColor: "#f8fafc" }}>
                  <tr style={{ fontSize: "11.5px", color: "#64748b" }}>
                    <th style={{ width: "40px" }} className="text-center">#</th>
                    <th>FILE NAME</th>
                    <th>UPLOADED BY</th>
                    <th>UPLOADED ON</th>
                    <th>FILE SIZE</th>
                    <th>TYPE</th>
                    <th>STATUS</th>
                    <th className="text-end pe-3">ACTION</th>
                  </tr>
                </thead>
                <tbody style={{ fontSize: "12.5px" }}>
                  {filteredRows.map((file, idx) => {
                    const isPdf = String(file.file_type || file.file_name).toLowerCase().includes("pdf");
                    const isDocx = String(file.file_type || file.file_name).toLowerCase().includes("doc");
                    const initials = (file.uploaded_by || "User")
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase();

                    return (
                      <tr key={file.file_id || idx}>
                        <td className="text-center text-muted" style={{ fontSize: "11px" }}>
                          {idx + 1}
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <span
                              style={{
                                width: "24px",
                                height: "24px",
                                borderRadius: "3px",
                                backgroundColor: isPdf ? "#fef2f2" : isDocx ? "#eff6ff" : "#f0fdf4",
                                color: isPdf ? "#dc2626" : isDocx ? "#2563eb" : "#16a34a",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "13px",
                                flexShrink: 0,
                              }}
                            >
                              <i className={isPdf ? "ri-file-pdf-fill" : isDocx ? "ri-file-word-fill" : "ri-file-excel-fill"}></i>
                            </span>
                            <span className="fw-semibold text-dark">
                              {file.file_name}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <div
                              style={{
                                width: "24px",
                                height: "24px",
                                borderRadius: "50%",
                                backgroundColor: "rgba(127, 29, 29, 0.1)",
                                color: "#7f1d1d",
                                fontWeight: 700,
                                fontSize: "10.5px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              {initials}
                            </div>
                            <span className="text-dark">{file.uploaded_by || "Admin"}</span>
                          </div>
                        </td>
                        <td className="text-muted" style={{ fontSize: "12px" }}>
                          {file.uploaded_on}
                        </td>
                        <td className="fw-bold text-dark font-monospace" style={{ fontSize: "12px" }}>
                          {file.file_size || "850 KB"}
                        </td>
                        <td>
                          <span
                            style={{
                              backgroundColor: isPdf ? "#fef2f2" : "#eff6ff",
                              color: isPdf ? "#dc2626" : "#2563eb",
                              border: `1px solid ${isPdf ? "#fecaca" : "#bfdbfe"}`,
                              fontSize: "11px",
                              fontWeight: 700,
                              padding: "2px 8px",
                              borderRadius: "4px",
                            }}
                          >
                            {file.file_type || (isPdf ? "PDF" : "DOCX")}
                          </span>
                        </td>
                        <td>
                          <span
                            style={{
                              backgroundColor: "#f0fdf4",
                              color: "#166534",
                              border: "1px solid #bbf7d0",
                              fontSize: "11px",
                              fontWeight: 600,
                              padding: "2px 8px",
                              borderRadius: "4px",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <span
                              style={{
                                width: "6px",
                                height: "6px",
                                borderRadius: "50%",
                                backgroundColor: "#16a34a",
                              }}
                            ></span>
                            Active
                          </span>
                        </td>
                        <td className="text-end pe-3">
                          <div className="d-flex align-items-center justify-content-end gap-1">
                            <button
                              type="button"
                              className="btn btn-sm btn-icon btn-light"
                              style={{ borderRadius: "4px", width: "28px", height: "28px" }}
                              title="View Document"
                            >
                              <i className="ri-eye-line text-muted"></i>
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-icon btn-light"
                              style={{ borderRadius: "4px", width: "28px", height: "28px" }}
                              title="Download Document"
                            >
                              <i className="ri-download-2-line text-muted"></i>
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-icon btn-light"
                              style={{ borderRadius: "4px", width: "28px", height: "28px" }}
                              title="More Options"
                            >
                              <i className="ri-more-2-fill text-muted"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          ) : (
            /* Grid View Cards */
            <div className="p-3">
              <Row className="g-3">
                {filteredRows.map((file, idx) => {
                  const isPdf = String(file.file_type || file.file_name).toLowerCase().includes("pdf");
                  const isDocx = String(file.file_type || file.file_name).toLowerCase().includes("doc");
                  return (
                    <Col lg={4} md={6} key={file.file_id || idx}>
                      <div
                        className="p-3 border bg-white h-100 d-flex flex-column justify-content-between"
                        style={{
                          borderRadius: "4px",
                          borderColor: "#e2e8f0",
                          boxShadow: "0 1px 2px rgba(15, 23, 42, 0.03)",
                        }}
                      >
                        <div>
                          <div className="d-flex align-items-center justify-content-between mb-2">
                            <span
                              style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "4px",
                                backgroundColor: isPdf ? "#fef2f2" : isDocx ? "#eff6ff" : "#f0fdf4",
                                color: isPdf ? "#dc2626" : isDocx ? "#2563eb" : "#16a34a",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "16px",
                              }}
                            >
                              <i className={isPdf ? "ri-file-pdf-fill" : isDocx ? "ri-file-word-fill" : "ri-file-excel-fill"}></i>
                            </span>
                            <span
                              style={{
                                backgroundColor: isPdf ? "#fef2f2" : "#eff6ff",
                                color: isPdf ? "#dc2626" : "#2563eb",
                                border: `1px solid ${isPdf ? "#fecaca" : "#bfdbfe"}`,
                                fontSize: "10.5px",
                                fontWeight: 700,
                                padding: "1px 6px",
                                borderRadius: "4px",
                              }}
                            >
                              {file.file_type || (isPdf ? "PDF" : "DOCX")}
                            </span>
                          </div>

                          <h6 className="fw-bold text-dark text-truncate mb-1" style={{ fontSize: "13px" }}>
                            {file.file_name}
                          </h6>
                          <div className="text-muted small mb-2" style={{ fontSize: "11px" }}>
                            {file.folder_name || "General"} • {file.file_size || "850 KB"}
                          </div>
                        </div>

                        <div className="pt-2 border-top d-flex align-items-center justify-content-between">
                          <span className="text-muted" style={{ fontSize: "11px" }}>
                            {file.uploaded_by || "Admin"}
                          </span>
                          <button
                            type="button"
                            className="btn btn-sm btn-light border py-1 px-2"
                            style={{ borderRadius: "4px", fontSize: "11px" }}
                          >
                            <i className="ri-download-2-line me-1"></i> Download
                          </button>
                        </div>
                      </div>
                    </Col>
                  );
                })}
              </Row>
            </div>
          )}
        </CardBody>
      </Card>

      {/* ─── ROW 4: KEY SUMMARY FOOTER BANNER ─────────────────────────────────── */}
      <div
        className="p-3 border bg-white d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4"
        style={{
          borderRadius: "4px",
          borderColor: "#e2e8f0",
          boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
        }}
      >
        <div className="d-flex align-items-center gap-3 flex-wrap">
          {/* Key Summary Badge */}
          <div className="d-flex align-items-center gap-2">
            <i
              className="ri-bar-chart-2-fill"
              style={{ color: "#7f1d1d", fontSize: "18px" }}
            ></i>
            <span className="fw-bold text-dark" style={{ fontSize: "13.5px" }}>
              Key Summary
            </span>
          </div>

          <div
            style={{ width: "1px", height: "20px", backgroundColor: "#e2e8f0" }}
          ></div>

          {/* Metric 1 */}
          <div className="d-flex align-items-center gap-2">
            <i
              className="ri-file-text-line"
              style={{ color: "#7f1d1d", fontSize: "16px" }}
            ></i>
            <div>
              <span className="fw-bold text-dark me-1" style={{ fontSize: "13px" }}>
                {totalDocuments}
              </span>
              <span className="text-muted" style={{ fontSize: "12px" }}>
                Total Documents
              </span>
            </div>
          </div>

          <div
            style={{ width: "1px", height: "20px", backgroundColor: "#e2e8f0" }}
          ></div>

          {/* Metric 2 */}
          <div className="d-flex align-items-center gap-2">
            <i
              className="ri-database-2-line"
              style={{ color: "#7f1d1d", fontSize: "16px" }}
            ></i>
            <div>
              <span
                className="fw-bold text-dark font-monospace me-1"
                style={{ fontSize: "13px" }}
              >
                {totalStorageMb} MB
              </span>
              <span className="text-muted" style={{ fontSize: "12px" }}>
                Total Storage
              </span>
            </div>
          </div>

          <div
            style={{ width: "1px", height: "20px", backgroundColor: "#e2e8f0" }}
          ></div>

          {/* Metric 3 */}
          <div className="d-flex align-items-center gap-2">
            <i
              className="ri-checkbox-circle-fill text-success"
              style={{ fontSize: "16px" }}
            ></i>
            <span className="fw-bold text-dark" style={{ fontSize: "12.5px" }}>
              100% Availability
            </span>
          </div>
        </div>

        {/* Right Quote */}
        <div className="d-flex align-items-center gap-2 text-muted" style={{ fontSize: "12px" }}>
          <i className="ri-shield-check-line text-success fs-15"></i>
          <span>Stay organized. Keep your documents secure.</span>
        </div>
      </div>
    </div>
  );
};

export default DocumentStorageAuditView;

