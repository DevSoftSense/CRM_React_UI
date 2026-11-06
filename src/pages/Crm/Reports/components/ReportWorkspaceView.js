import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardBody,
  Button,
  Input,
  Spinner,
  Alert,
} from "reactstrap";
import { runReport } from "../../../../helpers/crmReportApi";
import { getDatePresetRange, exportToCsv } from "../utils/reportUtils";
import ReportKpiCards from "./ReportKpiCards";
import ReportChartRenderer from "./ReportChartRenderer";
import ReportDataTable from "./ReportDataTable";

const ReportWorkspaceView = ({ report, onBackToCatalog, owners = [] }) => {
  // Filters state
  const [datePreset, setDatePreset] = useState("this_year");
  const [dateFrom, setDateFrom] = useState(() => {
    const range = getDatePresetRange("this_year");
    return range.from;
  });
  const [dateTo, setDateTo] = useState(() => {
    const range = getDatePresetRange("this_year");
    return range.to;
  });
  const [selectedOwnerId, setSelectedOwnerId] = useState("");
  const [isCustomDate, setIsCustomDate] = useState(false);

  // Data fetching state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reportResult, setReportResult] = useState(null);

  // Handle Preset Change
  const handlePresetChange = (presetId) => {
    setDatePreset(presetId);
    if (presetId === "custom") {
      setIsCustomDate(true);
    } else {
      setIsCustomDate(false);
      const range = getDatePresetRange(presetId);
      setDateFrom(range.from);
      setDateTo(range.to);
    }
  };

  // Run Report from API
  const executeReport = useCallback(async () => {
    if (!report?.code) return;

    try {
      setLoading(true);
      setError(null);

      const payload = {
        reportCode: report.code,
        dateFrom: dateFrom ? new Date(dateFrom).toISOString() : null,
        dateTo: dateTo ? new Date(dateTo).toISOString() : null,
        ownerEmployeeId: selectedOwnerId ? Number(selectedOwnerId) : null,
      };

      const res = await runReport(payload);
      const data = res?.data || res || {};
      setReportResult(data);
    } catch (err) {
      console.error(`Failed to run report ${report.code}:`, err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "An error occurred while generating this report.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [report?.code, dateFrom, dateTo, selectedOwnerId]);

  // Run on mount or when filter changes
  useEffect(() => {
    executeReport();
  }, [executeReport]);

  const summary = reportResult?.summary || {};
  const chartData = reportResult?.chart_data || [];
  const rows = reportResult?.rows || [];

  return (
    <div>
      {/* Top Workspace Action & Filter Bar */}
      <Card
        className="bg-white mb-4"
        style={{
          borderRadius: "4px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
        }}
      >
        <CardBody className="p-3">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
            {/* Left: Back button & Title */}
            <div className="d-flex align-items-center gap-3">
              <Button
                color="light"
                size="sm"
                className="border d-flex align-items-center gap-1"
                style={{
                  borderRadius: "4px",
                  fontSize: "12px",
                  fontWeight: 500,
                  color: "#475569",
                  borderColor: "#e2e8f0",
                  backgroundColor: "#ffffff",
                  padding: "5px 10px",
                }}
                onClick={onBackToCatalog}
                title="Back to Reports Catalog"
              >
                <i className="ri-arrow-left-line"></i>
                <span className="d-none d-sm-inline">All Reports</span>
              </Button>

              <div>
                <h5
                  className="fw-bold mb-0 text-dark"
                  style={{ fontSize: "17px", letterSpacing: "-0.3px" }}
                >
                  {report?.name}
                </h5>
              </div>
            </div>

            {/* Right: Filters & Action Buttons */}
            <div className="d-flex flex-wrap align-items-center gap-2">
              {/* Date Presets */}
              <div className="btn-group btn-group-sm" role="group">
                {[
                  { id: "this_month", label: "Month" },
                  { id: "this_quarter", label: "Quarter" },
                  { id: "this_year", label: "Year" },
                  { id: "all_time", label: "All Time" },
                  { id: "custom", label: "Custom" },
                ].map((p) => {
                  const isActive = datePreset === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      className="btn btn-sm"
                      style={{
                        backgroundColor: isActive ? "#7f1d1d" : "#ffffff",
                        borderColor: isActive ? "#7f1d1d" : "#e2e8f0",
                        color: isActive ? "#ffffff" : "#475569",
                        fontSize: "12px",
                        fontWeight: 500,
                        border: "1px solid",
                        padding: "4px 10px",
                      }}
                      onClick={() => handlePresetChange(p.id)}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>

              {/* Custom Date Pickers */}
              {isCustomDate && (
                <div className="d-flex align-items-center gap-1">
                  <Input
                    type="date"
                    bsSize="sm"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    style={{ width: "130px", fontSize: "12px", borderRadius: "4px" }}
                  />
                  <span className="text-muted small">to</span>
                  <Input
                    type="date"
                    bsSize="sm"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    style={{ width: "130px", fontSize: "12px", borderRadius: "4px" }}
                  />
                </div>
              )}

              {/* Owner Filter Dropdown */}
              <select
                className="form-select form-select-sm"
                style={{
                  width: "160px",
                  borderRadius: "4px",
                  fontSize: "12px",
                  borderColor: "#cbd5e1",
                }}
                value={selectedOwnerId}
                onChange={(e) => setSelectedOwnerId(e.target.value)}
              >
                <option value="">All Sales Reps</option>
                {owners.map((owner) => (
                  <option
                    key={owner.ownerId || owner.owner_id || owner.employee_id}
                    value={owner.ownerId || owner.owner_id || owner.employee_id}
                  >
                    {owner.fullName || owner.full_name}
                  </option>
                ))}
              </select>

              {/* Refresh Button */}
              <Button
                color="light"
                size="sm"
                className="border d-flex align-items-center gap-1"
                style={{
                  borderRadius: "4px",
                  fontSize: "12px",
                  color: "#475569",
                  borderColor: "#e2e8f0",
                  backgroundColor: "#ffffff",
                  padding: "5px 9px",
                }}
                onClick={executeReport}
                disabled={loading}
                title="Refresh Report Data"
              >
                <i className={`ri-refresh-line ${loading ? "ri-spin" : ""}`}></i>
              </Button>

              {/* Print Button */}
              <Button
                color="light"
                size="sm"
                className="border d-flex align-items-center gap-1"
                style={{
                  borderRadius: "4px",
                  fontSize: "12px",
                  color: "#475569",
                  borderColor: "#e2e8f0",
                  backgroundColor: "#ffffff",
                  padding: "5px 9px",
                }}
                onClick={() => window.print()}
                title="Print Report"
              >
                <i className="ri-printer-line"></i>
              </Button>

              {/* Export CSV Button */}
              <button
                type="button"
                className="btn btn-sm d-flex align-items-center gap-1"
                style={{
                  borderRadius: "4px",
                  fontSize: "12px",
                  fontWeight: 500,
                  backgroundColor: "#7f1d1d",
                  borderColor: "#7f1d1d",
                  color: "#ffffff",
                  padding: "5px 12px",
                }}
                onClick={() => exportToCsv(report?.code, rows)}
                disabled={rows.length === 0}
              >
                <i className="ri-download-2-line"></i> Export
              </button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Error Message */}
      {error && (
        <Alert
          color="danger"
          className="mb-4 d-flex align-items-center justify-content-between"
          style={{ borderRadius: "4px" }}
        >
          <div className="d-flex align-items-center gap-2">
            <i className="ri-error-warning-line fs-18"></i>
            <span>{error}</span>
          </div>
          <Button
            color="danger"
            size="sm"
            outline
            onClick={executeReport}
            style={{ borderRadius: "4px", fontSize: "12px" }}
          >
            Retry
          </Button>
        </Alert>
      )}

      {/* Loading Indicator */}
      {loading ? (
        <div className="text-center py-5">
          <Spinner style={{ color: "#7f1d1d" }} />
          <p className="text-muted mt-2 small">
            Calculating report analytics and executing database queries...
          </p>
        </div>
      ) : error ? null : (
        <>
          {/* 1. Summary KPI Cards */}
          <ReportKpiCards summary={summary} />

          {/* 2. Visual Analytics Chart */}
          <ReportChartRenderer
            chartType={report?.chart_type}
            chartData={chartData}
            title={report?.name}
          />

          {/* 3. Detailed Data Ledger Table */}
          <ReportDataTable
            rows={rows}
            reportTitle={report?.name}
            reportCode={report?.code}
          />
        </>
      )}
    </div>
  );
};

export default ReportWorkspaceView;
