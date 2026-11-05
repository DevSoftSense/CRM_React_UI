import React, { useState, useMemo } from "react";
import {
  Card,
  CardHeader,
  CardBody,
  Input,
  Button,
  Table,
  Badge,
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

  // Determine columns from the first row keys
  const columns = useMemo(() => {
    if (rawRows.length === 0) return [];
    return Object.keys(rawRows[0]).filter(
      (k) => !k.endsWith("_id") && k !== "id" && k !== "org_id" && k !== "app_id"
    );
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

  // Format cell value
  const renderCellValue = (key, value) => {
    if (value === null || value === undefined || value === "") {
      return <span className="text-muted">—</span>;
    }

    const k = key.toLowerCase();

    // Status or Priority badge
    if (
      k.includes("status") ||
      k.includes("priority") ||
      k.includes("aging") ||
      k.includes("outcome")
    ) {
      const v = String(value).toUpperCase();
      let colorClass = "bg-secondary";

      if (v === "WON" || v === "ACTIVE" || v === "COMPLETED" || v === "ON_TRACK") {
        colorClass = "bg-success";
      } else if (v === "LOST" || v === "STUCK" || v === "OVERDUE" || v === "HIGH") {
        colorClass = "bg-danger";
      } else if (v === "SLOW" || v === "MEDIUM" || v === "IN_PROGRESS") {
        colorClass = "bg-warning text-dark";
      } else if (v === "LOW" || v === "PENDING") {
        colorClass = "bg-info";
      }

      return (
        <Badge
          className={`${colorClass} px-2 py-1`}
          style={{ fontSize: "11px", borderRadius: "4px" }}
        >
          {String(value)}
        </Badge>
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
        <span className="fw-semibold text-dark">
          {formatCurrency(value)}
        </span>
      );
    }

    // Percentage values
    if (k.includes("rate") || k.includes("pct") || k.includes("percentage")) {
      return (
        <span className="fw-semibold text-dark">
          {Number(value).toFixed(1)}%
        </span>
      );
    }

    // Days values
    if (k.includes("days")) {
      return <span>{value} days</span>;
    }

    return String(value);
  };

  return (
    <Card className="shadow-sm border-0 mb-4" style={{ borderRadius: "12px" }}>
      <CardHeader className="bg-transparent border-bottom py-3">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
          <div>
            <h6 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2">
              <i
                className="ri-table-line"
                style={{ color: "#7f1d1d", fontSize: "16px" }}
              ></i>
              Detailed Data Ledger
            </h6>
            <span className="text-muted small">
              Showing {filteredRows.length} of {rawRows.length} total records
            </span>
          </div>

          <div className="d-flex align-items-center gap-2">
            {/* Search Input */}
            <div className="position-relative" style={{ width: "220px" }}>
              <Input
                type="text"
                placeholder="Search records..."
                className="form-control-sm ps-4"
                style={{ borderRadius: "6px", fontSize: "12px" }}
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
                  fontSize: "12px",
                }}
              ></i>
            </div>

            {/* CSV Export Button */}
            <Button
              color="light"
              size="sm"
              className="border d-flex align-items-center gap-1"
              style={{
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 500,
                color: "#7f1d1d",
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
                borderRadius: "50%",
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
            <Table className="align-middle table-nowrap table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th
                    style={{
                      width: "40px",
                      fontSize: "11px",
                      textTransform: "uppercase",
                      color: "#64748b",
                    }}
                  >
                    #
                  </th>
                  {columns.map((col) => (
                    <th
                      key={col}
                      style={{
                        fontSize: "11px",
                        textTransform: "uppercase",
                        color: "#64748b",
                        letterSpacing: "0.5px",
                        fontWeight: 600,
                      }}
                    >
                      {humanizeKey(col)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map((row, idx) => {
                  const rowNumber =
                    (validCurrentPage - 1) * pageSize + idx + 1;
                  return (
                    <tr key={idx}>
                      <td
                        className="text-muted small"
                        style={{ width: "40px" }}
                      >
                        {rowNumber}
                      </td>
                      {columns.map((col) => (
                        <td
                          key={col}
                          style={{ fontSize: "13px", color: "#334155" }}
                        >
                          {renderCellValue(col, row[col])}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        )}

        {/* Pagination Toolbar */}
        {totalRecords > 0 && (
          <div className="d-flex flex-wrap align-items-center justify-content-between p-3 border-top gap-2">
            <div className="d-flex align-items-center gap-2">
              <span className="text-muted small">Show</span>
              <select
                className="form-select form-select-sm"
                style={{ width: "70px", borderRadius: "6px", fontSize: "12px" }}
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
              <span className="text-muted small">
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
                style={{ borderRadius: "6px", fontSize: "12px" }}
                disabled={validCurrentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                <i className="ri-arrow-left-s-line"></i> Prev
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
                style={{ borderRadius: "6px", fontSize: "12px" }}
                disabled={validCurrentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                Next <i className="ri-arrow-right-s-line"></i>
              </Button>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
};

export default ReportDataTable;

