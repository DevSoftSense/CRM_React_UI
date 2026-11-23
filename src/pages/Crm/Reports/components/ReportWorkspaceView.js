import React, { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
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
import DocumentStorageAuditView from "./DocumentStorageAuditView";
import CampaignRoiReportView from "./CampaignRoiReportView";
import OverdueTasksComplianceView from "./OverdueTasksComplianceView";
import SalesEffortTouchpointView from "./SalesEffortTouchpointView";
import DormantAccountsReportView from "./DormantAccountsReportView";
import TopCustomersClvReportView from "./TopCustomersClvReportView";
import RepProductivityScorecardView from "./RepProductivityScorecardView";
import TargetAchievementReportView from "./TargetAchievementReportView";
import UncontactedLeadsReportView from "./UncontactedLeadsReportView";
import LeadBySourceReportView from "./LeadBySourceReportView";
import LeadConversionFunnelView from "./LeadConversionFunnelView";
import RevenueForecastReportView from "./RevenueForecastReportView";
import WinLossAnalysisReportView from "./WinLossAnalysisReportView";
import SalesPipelineAgingReportView from "./SalesPipelineAgingReportView";

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

  const isDocumentAudit =
    report?.code === "R14_DOCUMENT_AUDIT" ||
    report?.code === "R14_DOC_STORAGE";

  const isCampaignRoi = report?.code === "R13_CAMPAIGN_ROI";
  const isOverdueTasks = report?.code === "R12_OVERDUE_TASKS";
  const isActivityEffort = report?.code === "R11_ACTIVITY_EFFORT";
  const isDormantAccounts = report?.code === "R10_DORMANT_ACCOUNTS";
  const isTopCustomersClv = report?.code === "R09_TOP_CUSTOMERS_CLV";
  const isRepProductivity = report?.code === "R08_REP_PRODUCTIVITY";
  const isTargetAchievement =
    report?.code === "R07_TARGET_ACHIEVEMENT" ||
    report?.code === "R07_TARGET_ACHIEVE";
  const isUncontactedLeads = report?.code === "R06_UNCONTACTED_LEADS";
  const isLeadBySource = report?.code === "R05_LEAD_BY_SOURCE";
  const isLeadConversion =
    report?.code === "R04_LEAD_CONVERSION" ||
    report?.code === "R04_LEAD_FUNNEL";
  const isRevenueForecast =
    report?.code === "R03_REVENUE_FORECAST" ||
    report?.code === "R03_WEIGHTED_PIPELINE";
  const isWinLoss = report?.code === "R02_WIN_LOSS";
  const isPipelineAging =
    report?.code === "R01_PIPELINE_AGING" ||
    report?.code === "R01_PIPELINE_AGE";

  const layoutModeType = useSelector((state) => state.Layout.layoutModeType);
  const isDark = layoutModeType === "dark";

  const cardBg = isDark ? "#121212" : "#ffffff";
  const cardBorder = isDark ? "#2d3748" : "#e2e8f0";
  const subtleBg = isDark ? "#1a202c" : "#f8fafc";
  const subtleBorder = isDark ? "#334155" : "#cbd5e1";
  const textTitle = isDark ? "#f8fafc" : "#0f172a";
  const textSub = isDark ? "#94a3b8" : "#64748b";

  return (
    <div>
      {/* Top Workspace Action & Filter Bar */}
      <Card
        className="mb-4"
        style={{
          borderRadius: 0,
          backgroundColor: cardBg,
          border: `1px solid ${cardBorder}`,
          boxShadow: isDark ? "0 1px 3px rgba(0, 0, 0, 0.3)" : "0 1px 3px rgba(15, 23, 42, 0.04)",
        }}
      >
        <CardBody className="p-3">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
            {/* Left: Back button & Title */}
            <div className="d-flex align-items-center gap-3">
              <Button
                size="sm"
                className="border d-flex align-items-center gap-1 rounded-0"
                style={{
                  borderRadius: 0,
                  fontSize: "12px",
                  fontWeight: 500,
                  color: textTitle,
                  borderColor: subtleBorder,
                  backgroundColor: subtleBg,
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
                  className="fw-bold mb-0"
                  style={{ fontSize: "17px", letterSpacing: "-0.3px", color: textTitle }}
                >
                  {report?.name}
                </h5>
                {report?.description && (
                  <p
                    className="small mb-0 mt-1"
                    style={{ fontSize: "12px", color: textSub }}
                  >
                    {report.description}
                  </p>
                )}
              </div>
            </div>

            {/* Right: Filters & Action Buttons */}
            <div className="d-flex flex-wrap align-items-center gap-2">
              {/* Date Presets Dropdown */}
              <select
                className="form-select form-select-sm rounded-0"
                style={{
                  width: "135px",
                  borderRadius: 0,
                  fontSize: "12px",
                  borderColor: subtleBorder,
                  color: textTitle,
                  fontWeight: 500,
                  backgroundColor: isDark ? "#121212" : "#ffffff",
                }}
                value={datePreset}
                onChange={(e) => handlePresetChange(e.target.value)}
              >
                <option value="this_month">This Month</option>
                <option value="this_quarter">This Quarter</option>
                <option value="this_year">This Year</option>
                <option value="all_time">All Time</option>
                <option value="custom">Custom Range...</option>
              </select>

              {/* Custom Date Pickers */}
              {isCustomDate && (
                <div className="d-flex align-items-center gap-1">
                  <Input
                    type="date"
                    bsSize="sm"
                    className="rounded-0"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    style={{
                      width: "130px",
                      fontSize: "12px",
                      borderRadius: 0,
                      backgroundColor: isDark ? "#121212" : "#ffffff",
                      borderColor: subtleBorder,
                      color: textTitle,
                    }}
                  />
                  <span className="small" style={{ color: textSub }}>to</span>
                  <Input
                    type="date"
                    bsSize="sm"
                    className="rounded-0"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    style={{
                      width: "130px",
                      fontSize: "12px",
                      borderRadius: 0,
                      backgroundColor: isDark ? "#121212" : "#ffffff",
                      borderColor: subtleBorder,
                      color: textTitle,
                    }}
                  />
                </div>
              )}

              {/* Owner Filter Dropdown */}
              <select
                className="form-select form-select-sm rounded-0"
                style={{
                  width: "160px",
                  borderRadius: 0,
                  fontSize: "12px",
                  borderColor: subtleBorder,
                  backgroundColor: isDark ? "#121212" : "#ffffff",
                  color: textTitle,
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
                size="sm"
                className="border d-flex align-items-center gap-1 rounded-0"
                style={{
                  borderRadius: 0,
                  fontSize: "12px",
                  color: textTitle,
                  borderColor: subtleBorder,
                  backgroundColor: subtleBg,
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
                size="sm"
                className="border d-flex align-items-center gap-1 rounded-0"
                style={{
                  borderRadius: 0,
                  fontSize: "12px",
                  color: textTitle,
                  borderColor: subtleBorder,
                  backgroundColor: subtleBg,
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
                className="btn btn-sm d-flex align-items-center gap-1 rounded-0"
                style={{
                  borderRadius: 0,
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
          className="mb-4 d-flex align-items-center justify-content-between rounded-0"
          style={{ borderRadius: 0 }}
        >
          <div className="d-flex align-items-center gap-2">
            <i className="ri-error-warning-line fs-18"></i>
            <span>{error}</span>
          </div>
          <Button
            color="danger"
            size="sm"
            outline
            className="rounded-0"
            onClick={executeReport}
            style={{ borderRadius: 0, fontSize: "12px" }}
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
      ) : error ? null : isDocumentAudit ? (
        <DocumentStorageAuditView
          reportResult={reportResult}
          report={report}
          datePreset={datePreset}
          onPresetChange={handlePresetChange}
          owners={owners}
          selectedOwnerId={selectedOwnerId}
          onOwnerChange={setSelectedOwnerId}
          onExport={() => exportToCsv(report?.code, rows)}
        />
      ) : isCampaignRoi ? (
        <CampaignRoiReportView
          reportResult={reportResult}
          report={report}
          datePreset={datePreset}
          onPresetChange={handlePresetChange}
          owners={owners}
          selectedOwnerId={selectedOwnerId}
          onOwnerChange={setSelectedOwnerId}
          onExport={() => exportToCsv(report?.code, rows)}
        />
      ) : isOverdueTasks ? (
        <OverdueTasksComplianceView
          reportResult={reportResult}
          report={report}
          datePreset={datePreset}
          onPresetChange={handlePresetChange}
          owners={owners}
          selectedOwnerId={selectedOwnerId}
          onOwnerChange={setSelectedOwnerId}
          onExport={() => exportToCsv(report?.code, rows)}
        />
      ) : isActivityEffort ? (
        <SalesEffortTouchpointView
          reportResult={reportResult}
          report={report}
          datePreset={datePreset}
          onPresetChange={handlePresetChange}
          owners={owners}
          selectedOwnerId={selectedOwnerId}
          onOwnerChange={setSelectedOwnerId}
          onExport={() => exportToCsv(report?.code, rows)}
        />
      ) : isDormantAccounts ? (
        <DormantAccountsReportView
          reportResult={reportResult}
          report={report}
          datePreset={datePreset}
          onPresetChange={handlePresetChange}
          owners={owners}
          selectedOwnerId={selectedOwnerId}
          onOwnerChange={setSelectedOwnerId}
          onExport={() => exportToCsv(report?.code, rows)}
        />
      ) : isTopCustomersClv ? (
        <TopCustomersClvReportView
          reportResult={reportResult}
          report={report}
          datePreset={datePreset}
          onPresetChange={handlePresetChange}
          owners={owners}
          selectedOwnerId={selectedOwnerId}
          onOwnerChange={setSelectedOwnerId}
          onExport={() => exportToCsv(report?.code, rows)}
        />
      ) : isRepProductivity ? (
        <RepProductivityScorecardView
          reportResult={reportResult}
          report={report}
          datePreset={datePreset}
          onPresetChange={handlePresetChange}
          owners={owners}
          selectedOwnerId={selectedOwnerId}
          onOwnerChange={setSelectedOwnerId}
          onExport={() => exportToCsv(report?.code, rows)}
        />
      ) : isTargetAchievement ? (
        <TargetAchievementReportView
          reportResult={reportResult}
          report={report}
          datePreset={datePreset}
          onPresetChange={handlePresetChange}
          owners={owners}
          selectedOwnerId={selectedOwnerId}
          onOwnerChange={setSelectedOwnerId}
          onExport={() => exportToCsv(report?.code, rows)}
        />
      ) : isUncontactedLeads ? (
        <UncontactedLeadsReportView
          reportResult={reportResult}
          report={report}
          datePreset={datePreset}
          onPresetChange={handlePresetChange}
          owners={owners}
          selectedOwnerId={selectedOwnerId}
          onOwnerChange={setSelectedOwnerId}
          onExport={() => exportToCsv(report?.code, rows)}
        />
      ) : isLeadBySource ? (
        <LeadBySourceReportView
          reportResult={reportResult}
          report={report}
          datePreset={datePreset}
          onPresetChange={handlePresetChange}
          owners={owners}
          selectedOwnerId={selectedOwnerId}
          onOwnerChange={setSelectedOwnerId}
          onExport={() => exportToCsv(report?.code, rows)}
        />
      ) : isLeadConversion ? (
        <LeadConversionFunnelView
          reportResult={reportResult}
          report={report}
          datePreset={datePreset}
          onPresetChange={handlePresetChange}
          owners={owners}
          selectedOwnerId={selectedOwnerId}
          onOwnerChange={setSelectedOwnerId}
          onExport={() => exportToCsv(report?.code, rows)}
        />
      ) : isRevenueForecast ? (
        <RevenueForecastReportView
          reportResult={reportResult}
          report={report}
          datePreset={datePreset}
          onPresetChange={handlePresetChange}
          owners={owners}
          selectedOwnerId={selectedOwnerId}
          onOwnerChange={setSelectedOwnerId}
          onExport={() => exportToCsv(report?.code, rows)}
        />
      ) : isWinLoss ? (
        <WinLossAnalysisReportView
          reportResult={reportResult}
          report={report}
          datePreset={datePreset}
          onPresetChange={handlePresetChange}
          owners={owners}
          selectedOwnerId={selectedOwnerId}
          onOwnerChange={setSelectedOwnerId}
          onExport={() => exportToCsv(report?.code, rows)}
        />
      ) : isPipelineAging ? (
        <SalesPipelineAgingReportView
          reportResult={reportResult}
          report={report}
          datePreset={datePreset}
          onPresetChange={handlePresetChange}
          owners={owners}
          selectedOwnerId={selectedOwnerId}
          onOwnerChange={setSelectedOwnerId}
          onExport={() => exportToCsv(report?.code, rows)}
        />
      ) : (
        <>
          {/* 1. Summary KPI Cards */}
          <ReportKpiCards summary={summary} />

          {/* 2. Visual Analytics Chart */}
          <ReportChartRenderer
            chartType={report?.chart_type}
            chartData={chartData}
            title={report?.name}
            summary={summary}
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
