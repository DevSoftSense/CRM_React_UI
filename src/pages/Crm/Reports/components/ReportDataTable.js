import React, { useState, useMemo } from "react";
import {
  Card,
  CardHeader,
  CardBody,
  Input,
  Button,
  Table,
} from "reactstrap";
import {
  formatCurrency,
  formatNumber,
  humanizeKey,
  exportToCsv,
} from "../utils/reportUtils";

const ReportDataTable = ({ rows, reportTitle, reportCode }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const rawRows = Array.isArray(rows) ? rows : [];

  // Logical column ordering priority: Subject -> Account -> Stage/Status -> Financials -> Metrics -> Owner -> Dates
  const columnPriority = [
    "opportunity_name",
    "lead_name",
    "customer_name",
    "company_name",
    "title",
    "task_code",
    "subject",
    "sales_rep",
    "rep_name",
    "employee",
    "campaign_name",
    "file_name",
    "stage_name",
    "status",
    "status_name",
    "won_revenue",
    "target_amount",
    "gap_amount",
    "attainment_pct",
    "amount",
    "budget",
    "actual_spend",
    "probability",
    "weighted_amount",
    "weighted_value",
    "roi_percentage",
    "priority",
    "rating_name",
    "aging_status",
    "days_in_stage",
    "days_overdue",
    "days_inactive",
    "hours_uncontacted",
    "assignee",
    "uploaded_by",
    "source",
    "source_name",
    "type",
    "leads_generated",
    "deals_won_count",
    "deals_count",
    "expected_close_date",
    "close_date",
    "due_date",
    "start_time",
    "created_date",
    "uploaded_on",
    "notes",
  ];

  // Determine columns from first row, sorted by logical priority
  const columns = useMemo(() => {
    if (rawRows.length === 0) return [];
    const keys = Object.keys(rawRows[0]).filter(
      (k) => !k.endsWith("_id") && k !== "id" && k !== "org_id" && k !== "app_id"
    );

    return keys.sort((a, b) => {
      const idxA = columnPriority.indexOf(a.toLowerCase());
      const idxB = columnPriority.indexOf(b.toLowerCase());
      const posA = idxA === -1 ? 999 : idxA;
      const posB = idxB === -1 ? 999 : idxB;
      return posA - posB;
    });
  }, [rawRows]);

  // Client-side search filtering
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rawRows;
    const term = searchTerm.toLowerCase();
    return rawRows.filter((row) =>
      Object.values(row).some((val) =>
        String(val ?? "").toLowerCase().includes(term)
      )
    );
  }, [rawRows, searchTerm]);

  // Pagination calculation
  const totalRecords = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);

  const paginatedRows = useMemo(() => {
    const start = (validCurrentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, validCurrentPage, pageSize]);

  const isNumericColumn = (k) => {
    const key = k.toLowerCase();
    return (
      key.includes("amount") ||
      key.includes("value") ||
      key.includes("revenue") ||
      key.includes("spend") ||
      key.includes("budget") ||
      key.includes("clv")
    );
  };

  const isBadgeColumn = (k) => {
    const key = k.toLowerCase();
    return (
      key.includes("status") ||
      key.includes("priority") ||
      key.includes("aging") ||
      key.includes("outcome") ||
      key.includes("risk") ||
      key.includes("probability") ||
      key.includes("rate") ||
      key.includes("pct") ||
      key.includes("percentage") ||
      key.includes("stage") ||
      key.includes("hours_uncontacted")
    );
  };

  const getColumnStyle = (col) => {
    const k = col.toLowerCase();
    if (
      k.includes("opportunity_name") ||
      k.includes("lead_name") ||
      k.includes("campaign_name") ||
      k.includes("title")
    ) {
      return { minWidth: "200px" };
    }
    if (k.includes("customer_name") || k.includes("company_name")) {
      return { minWidth: "170px" };
    }
    if (k.includes("hours_uncontacted")) {
      return { minWidth: "160px" };
    }
    if (k.includes("stage_name") || k.includes("stage") || k.includes("status")) {
      return { minWidth: "115px" };
    }
    if (
      k.includes("amount") ||
      k.includes("value") ||
      k.includes("revenue") ||
      k.includes("budget")
    ) {
      return { minWidth: "130px" };
    }
    if (k.includes("probability") || k.includes("rate") || k.includes("pct")) {
      return { minWidth: "105px" };
    }
    if (k.includes("sales_rep") || k.includes("assignee") || k.includes("uploaded_by")) {
      return { minWidth: "140px" };
    }
    if (k.includes("date") || k.includes("time") || k.includes("on")) {
      return { minWidth: "125px" };
    }
    return { minWidth: "110px" };
  };

  // Format cell value
  const renderCellValue = (key, value) => {
    if (value === null || value === undefined || value === "") {
      return <span className="text-muted">—</span>;
    }

    const k = key.toLowerCase();

    // Stage badge
    if (k.includes("stage")) {
      return (
        <span
          style={{
            display: "inline-block",
            backgroundColor: "rgba(127, 29, 29, 0.06)",
            color: "#7f1d1d",
            border: "1px solid rgba(127, 29, 29, 0.15)",
            fontSize: "11px",
            fontWeight: 600,
            padding: "2px 8px",
            borderRadius: "4px",
          }}
        >
          {String(value)}
        </span>
      );
    }

    // Status or Priority soft badge
    if (isBadgeColumn(k) && !k.includes("rate") && !k.includes("pct") && !k.includes("probability")) {
      const v = String(value).toUpperCase();
      let badgeStyle = {
        backgroundColor: "#f1f5f9",
        color: "#475569",
        border: "1px solid #cbd5e1",
      };

      if (
        v === "WON" ||
        v === "ACTIVE" ||
        v === "COMPLETED" ||
        v === "ON_TRACK" ||
        v === "LOW RISK"
      ) {
        badgeStyle = {
          backgroundColor: "#f0fdf4",
          color: "#166534",
          border: "1px solid #bbf7d0",
        };
      } else if (
        v === "LOST" ||
        v === "STUCK" ||
        v === "OVERDUE" ||
        v === "HIGH" ||
        v === "HIGH RISK"
      ) {
        badgeStyle = {
          backgroundColor: "#fef2f2",
          color: "#991b1b",
          border: "1px solid #fecaca",
        };
      } else if (
        v === "SLOW" ||
        v === "MEDIUM" ||
        v === "IN_PROGRESS" ||
        v === "MEDIUM RISK"
      ) {
        badgeStyle = {
          backgroundColor: "#fffbeb",
          color: "#92400e",
          border: "1px solid #fde68a",
        };
      } else if (v === "LOW" || v === "PENDING" || v === "NEW") {
        badgeStyle = {
          backgroundColor: "#f0fdfa",
          color: "#0f766e",
          border: "1px solid #99f6e4",
        };
      }

      return (
        <span
          style={{
            ...badgeStyle,
            display: "inline-block",
            fontSize: "11px",
            fontWeight: 600,
            padding: "2px 8px",
            borderRadius: "4px",
            textTransform: "capitalize",
          }}
        >
          {String(value)}
        </span>
      );
    }

    // Currency values
    if (
      k.includes("amount") ||
      k.includes("value") ||
      k.includes("revenue") ||
      k.includes("spend") ||
      k.includes("budget") ||
      k.includes("clv")
    ) {
      return (
        <span className="fw-bold text-dark font-monospace" style={{ fontSize: "12.5px" }}>
          {formatCurrency(value)}
        </span>
      );
    }

    // Sales Rep / Owner / Employee with Avatar
    if (
      k === "sales_rep" ||
      k === "rep_name" ||
      k === "employee" ||
      k === "owner_name"
    ) {
      const name = String(value || "Unassigned");
      const initials = name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();
      return (
        <div className="d-flex align-items-center gap-2">
          <div
            style={{
              width: "26px",
              height: "26px",
              borderRadius: "50%",
              backgroundColor: "rgba(127, 29, 29, 0.1)",
              color: "#7f1d1d",
              fontWeight: 700,
              fontSize: "11px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {initials || "SR"}
          </div>
          <span className="fw-semibold text-dark" style={{ fontSize: "12.5px" }}>
            {name}
          </span>
        </div>
      );
    }

    // Percentage & Probability values
    if (
      k.includes("rate") ||
      k.includes("pct") ||
      k.includes("percentage") ||
      k.includes("probability")
    ) {
      const num = Number(value);
      const isHigh = num >= 100;
      const isMid = num >= 50 && num < 100;
      const isLow = num < 50;
      return (
        <span
          style={{
            display: "inline-block",
            backgroundColor: isHigh
              ? "#f0fdf4"
              : isMid
              ? "#fffbeb"
              : "#f8fafc",
            color: isHigh ? "#166534" : isMid ? "#92400e" : "#64748b",
            border: `1px solid ${
              isHigh ? "#bbf7d0" : isMid ? "#fde68a" : "#e2e8f0"
            }`,
            fontSize: "11.5px",
            fontWeight: 600,
            padding: "2px 8px",
            borderRadius: "4px",
          }}
        >
          {isHigh && (
            <i className="ri-checkbox-circle-fill me-1 text-success"></i>
          )}
          {num.toFixed(1)}%
        </span>
      );
    }

    // Hours uncontacted severity badge
    if (k.includes("hours_uncontacted")) {
      const numHours = Number(value);
      const days = (numHours / 24).toFixed(1);
      const isCritical = numHours >= 168; // > 7 days
      const isWarning = numHours >= 72; // 3 to 7 days
      const isModerate = numHours >= 24;

      return (
        <span
          style={{
            display: "inline-block",
            backgroundColor: isCritical
              ? "#fef2f2"
              : isWarning
              ? "#fffbeb"
              : isModerate
              ? "#f0f9ff"
              : "#f0fdf4",
            color: isCritical
              ? "#991b1b"
              : isWarning
              ? "#92400e"
              : isModerate
              ? "#0369a1"
              : "#166534",
            border: `1px solid ${
              isCritical
                ? "#fecaca"
                : isWarning
                ? "#fde68a"
                : isModerate
                ? "#bae6fd"
                : "#bbf7d0"
            }`,
            fontSize: "11px",
            fontWeight: 600,
            padding: "2px 8px",
            borderRadius: "4px",
          }}
        >
          <i
            className={`${
              isCritical ? "ri-error-warning-line" : "ri-time-line"
            } me-1`}
          ></i>
          {days} days {isCritical ? "(Stale)" : isWarning ? "(Warning)" : ""}
        </span>
      );
    }

    // Standard Days / Hours values
    if (k.includes("days") || k.includes("hours")) {
      return (
        <span style={{ fontSize: "12px", color: "#475569" }}>
          <i className="ri-time-line me-1" style={{ color: "#94a3b8" }}></i>
          {value} {k.includes("hours") ? "hrs" : "days"}
        </span>
      );
    }

    // Date formatting
    if (k.includes("date") || k.includes("time") || k.includes("on")) {
      return (
        <span style={{ fontSize: "12px", color: "#475569", fontWeight: 500 }}>
          {String(value)}
        </span>
      );
    }

    // Main entity names
    if (
      k.includes("opportunity_name") ||
      k.includes("lead_name") ||
      k.includes("campaign_name") ||
      k.includes("title")
    ) {
      return (
        <span className="fw-semibold text-dark" style={{ fontSize: "13px" }}>
          {String(value)}
        </span>
      );
    }

    return <span style={{ fontSize: "12.5px", color: "#334155" }}>{String(value)}</span>;
  };

  return (
    <Card className="bg-white mb-4" style={{ borderRadius: "4px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)" }}>
      <CardHeader className="bg-white border-bottom py-3" style={{ borderRadius: "4px 4px 0 0" }}>
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
          <div>
            <h6 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2" style={{ fontSize: "14px" }}>
              <i
                className="ri-table-line"
                style={{ color: "#7f1d1d", fontSize: "16px" }}
              ></i>
              Detailed Data Ledger
            </h6>
            <span className="text-muted small" style={{ fontSize: "11.5px" }}>
              Showing {filteredRows.length} of {rawRows.length} transaction records
            </span>
          </div>

          <div className="d-flex align-items-center gap-2">
            {/* Search Input */}
            <div className="position-relative" style={{ width: "230px" }}>
              <Input
                type="text"
                placeholder="Filter by keyword..."
                className="form-control-sm ps-4"
                style={{ borderRadius: "4px", fontSize: "12px", borderColor: "#cbd5e1" }}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
              <i
                className="ri-search-line position-absolute"
                style={{
                  left: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#94a3b8",
                  fontSize: "13px",
                }}
              ></i>
            </div>

            {/* CSV Export Button */}
            <Button
              color="light"
              size="sm"
              className="border d-flex align-items-center gap-1"
              style={{
                borderRadius: "4px",
                fontSize: "12px",
                fontWeight: 500,
                color: "#7f1d1d",
                borderColor: "#e2e8f0",
                backgroundColor: "#ffffff",
              }}
              onClick={() => exportToCsv(reportCode || "crm_report", rawRows)}
              disabled={rawRows.length === 0}
            >
              <i className="ri-download-2-line"></i> Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardBody className="p-0">
        {rawRows.length === 0 ? (
          <div className="text-center py-5">
            <div
              className="d-inline-flex align-items-center justify-content-center mb-3"
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "4px",
                backgroundColor: "rgba(127, 29, 29, 0.08)",
                color: "#7f1d1d",
                fontSize: "20px",
              }}
            >
              <i className="ri-inbox-line"></i>
            </div>
            <h6 className="fw-semibold text-dark mb-1">No Records Found</h6>
            <p className="text-muted small mb-0">
              There are no transaction records matching the current report parameters.
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <Table className="align-middle table-nowrap table-hover mb-0" style={{ borderCollapse: "separate", borderSpacing: "0" }}>
              <thead style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <tr>
                  <th
                    style={{
                      width: "45px",
                      fontSize: "11px",
                      textTransform: "uppercase",
                      color: "#475569",
                      fontWeight: 600,
                      letterSpacing: "0.5px",
                      padding: "10px 14px",
                      backgroundColor: "#f8fafc",
                    }}
                  >
                    #
                  </th>
                  {columns.map((col) => {
                    const isNum = isNumericColumn(col);
                    const isBadge = isBadgeColumn(col);
                    return (
                      <th
                        key={col}
                        className={isNum ? "text-end" : isBadge ? "text-center" : ""}
                        style={{
                          fontSize: "11px",
                          textTransform: "uppercase",
                          color: "#475569",
                          letterSpacing: "0.5px",
                          fontWeight: 600,
                          padding: "10px 14px",
                          backgroundColor: "#f8fafc",
                          ...getColumnStyle(col),
                        }}
                      >
                        {humanizeKey(col)}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map((row, idx) => {
                  const rowNumber =
                    (validCurrentPage - 1) * pageSize + idx + 1;
                  return (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        transition: "background-color 0.1s ease",
                      }}
                    >
                      <td
                        className="text-muted"
                        style={{ width: "45px", fontSize: "11.5px", padding: "11px 14px" }}
                      >
                        {rowNumber}
                      </td>
                      {columns.map((col) => {
                        const isNum = isNumericColumn(col);
                        const isBadge = isBadgeColumn(col);
                        return (
                          <td
                            key={col}
                            className={isNum ? "text-end" : isBadge ? "text-center" : ""}
                            style={{ padding: "11px 14px", ...getColumnStyle(col) }}
                          >
                            {renderCellValue(col, row[col])}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        )}

        {/* Pagination Toolbar */}
        {totalRecords > 0 && (
          <div className="d-flex flex-wrap align-items-center justify-content-between p-3 border-top gap-2 bg-white" style={{ borderRadius: "0 0 4px 4px" }}>
            <div className="d-flex align-items-center gap-2">
              <span className="text-muted small" style={{ fontSize: "12px" }}>Show</span>
              <select
                className="form-select form-select-sm"
                style={{ width: "65px", borderRadius: "4px", fontSize: "12px", borderColor: "#cbd5e1" }}
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span className="text-muted small ms-1" style={{ fontSize: "12px" }}>
                Showing {(validCurrentPage - 1) * pageSize + 1} to{" "}
                {Math.min(validCurrentPage * pageSize, totalRecords)} of{" "}
                {totalRecords} entries
              </span>
            </div>

            <div className="d-flex align-items-center gap-1">
              <Button
                color="light"
                size="sm"
                className="border"
                style={{ borderRadius: "4px", fontSize: "12px", padding: "4px 10px", borderColor: "#e2e8f0" }}
                disabled={validCurrentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                <i className="ri-arrow-left-s-line me-1"></i> Prev
              </Button>
              <span
                className="px-2 small fw-semibold text-dark"
                style={{ fontSize: "12px" }}
              >
                Page {validCurrentPage} of {totalPages}
              </span>
              <Button
                color="light"
                size="sm"
                className="border"
                style={{ borderRadius: "4px", fontSize: "12px", padding: "4px 10px", borderColor: "#e2e8f0" }}
                disabled={validCurrentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                Next <i className="ri-arrow-right-s-line ms-1"></i>
              </Button>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
};

export default ReportDataTable;
