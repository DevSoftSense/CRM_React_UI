import React, { useState, useMemo } from "react";
import {
  Row,
  Col,
  Card,
  CardBody,
  Input,
  Button,
} from "reactstrap";

const ReportCatalogView = ({ categories, reports, onSelectReport }) => {
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [hoveredCode, setHoveredCode] = useState(null);

  const rawCategories = Array.isArray(categories) ? categories : [];
  const rawReports = Array.isArray(reports) ? reports : [];

  // Filter reports by category and search keyword
  const filteredReports = useMemo(() => {
    let result = rawReports;

    if (activeCategory !== "all") {
      result = result.filter((r) => r.category === activeCategory);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (r) =>
          (r.name && r.name.toLowerCase().includes(term)) ||
          (r.description && r.description.toLowerCase().includes(term)) ||
          (r.category_name && r.category_name.toLowerCase().includes(term)) ||
          (r.code && r.code.toLowerCase().includes(term))
      );
    }

    return result;
  }, [rawReports, activeCategory, searchTerm]);

  return (
    <div>
      {/* Category Navigation and Search Header */}
      <Card
        className="shadow-sm border-0 mb-4"
        style={{
          borderRadius: "10px",
          background: "#ffffff",
          border: "1px solid #e2e8f0",
        }}
      >
        <CardBody className="p-3">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
            {/* Category Navigation Pills */}
            <div
              className="d-flex align-items-center gap-2 flex-grow-1"
              style={{ overflowX: "auto", whiteSpace: "nowrap", paddingBottom: "2px" }}
            >
              {rawCategories.map((cat) => {
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    className="btn btn-sm d-flex align-items-center gap-2 border-0"
                    style={{
                      borderRadius: "8px",
                      fontSize: "13px",
                      fontWeight: isActive ? 600 : 500,
                      padding: "7px 14px",
                      backgroundColor: isActive ? "#7f1d1d" : "transparent",
                      color: isActive ? "#ffffff" : "#475569",
                      transition: "all 0.15s ease",
                    }}
                    onClick={() => setActiveCategory(cat.id)}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = "#f8fafc";
                        e.currentTarget.style.color = "#0f172a";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = "transparent";
                        e.currentTarget.style.color = "#475569";
                      }
                    }}
                  >
                    <i className={cat.icon} style={{ fontSize: "14px" }}></i>
                    <span>{cat.name}</span>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minWidth: "20px",
                        height: "19px",
                        padding: "0 6px",
                        borderRadius: "10px",
                        backgroundColor: isActive
                          ? "rgba(255, 255, 255, 0.22)"
                          : "#f1f5f9",
                        color: isActive ? "#ffffff" : "#64748b",
                        fontSize: "11px",
                        fontWeight: 600,
                        border: isActive ? "none" : "1px solid #e2e8f0",
                      }}
                    >
                      {cat.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="position-relative" style={{ minWidth: "260px" }}>
              <Input
                type="text"
                placeholder="Search reports by keyword..."
                className="ps-4"
                style={{
                  borderRadius: "8px",
                  fontSize: "13px",
                  height: "38px",
                  borderColor: "#cbd5e1",
                  boxShadow: "none",
                }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <i
                className="ri-search-line position-absolute"
                style={{
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#94a3b8",
                  fontSize: "14px",
                }}
              ></i>
              {searchTerm && (
                <button
                  type="button"
                  className="btn btn-sm btn-link position-absolute end-0 top-50 translate-middle-y text-muted p-1 me-2"
                  onClick={() => setSearchTerm("")}
                >
                  <i className="ri-close-line"></i>
                </button>
              )}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Reports Grid */}
      {filteredReports.length === 0 ? (
        <Card
          className="shadow-sm border-0 py-5"
          style={{ borderRadius: "10px", border: "1px solid #e2e8f0" }}
        >
          <CardBody className="text-center">
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
              <i className="ri-file-search-line"></i>
            </div>
            <h5 className="fw-semibold text-dark mb-1">No Matching Reports Found</h5>
            <p className="text-muted small mb-3">
              No reports match your query "{searchTerm}". Try clearing your filters.
            </p>
            <Button
              color="light"
              size="sm"
              className="border px-3"
              style={{ borderRadius: "6px" }}
              onClick={() => {
                setActiveCategory("all");
                setSearchTerm("");
              }}
            >
              Reset Filters
            </Button>
          </CardBody>
        </Card>
      ) : (
        <Row className="g-4">
          {filteredReports.map((report) => {
            const isHovered = hoveredCode === report.code;

            return (
              <Col xl={4} md={6} xs={12} key={report.code}>
                <Card
                  className="h-100 border-0 d-flex flex-column"
                  style={{
                    borderRadius: "10px",
                    background: "#ffffff",
                    border: isHovered
                      ? "1px solid #fca5a5"
                      : "1px solid #e2e8f0",
                    boxShadow: isHovered
                      ? "0 10px 25px -4px rgba(127, 29, 29, 0.09), 0 4px 6px -2px rgba(0, 0, 0, 0.04)"
                      : "0 1px 3px rgba(0, 0, 0, 0.05)",
                    transform: isHovered ? "translateY(-3px)" : "translateY(0)",
                    transition:
                      "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease, border-color 0.2s ease",
                    cursor: "pointer",
                  }}
                  onMouseEnter={() => setHoveredCode(report.code)}
                  onMouseLeave={() => setHoveredCode(null)}
                  onClick={() => onSelectReport(report)}
                >
                  <CardBody className="p-4 d-flex flex-column">
                    {/* Header: Category Tag & Report Code */}
                    <div className="d-flex align-items-center justify-content-between mb-3">
                      <span
                        style={{
                          backgroundColor: "#fef2f2",
                          color: "#7f1d1d",
                          border: "1px solid #fecaca",
                          fontSize: "10.5px",
                          fontWeight: 700,
                          letterSpacing: "0.5px",
                          padding: "3px 8px",
                          borderRadius: "4px",
                          textTransform: "uppercase",
                        }}
                      >
                        {report.category_name}
                      </span>
                      <span
                        style={{
                          backgroundColor: "#f8fafc",
                          color: "#475569",
                          border: "1px solid #e2e8f0",
                          fontFamily: "monospace",
                          fontSize: "11px",
                          fontWeight: 600,
                          padding: "2px 7px",
                          borderRadius: "4px",
                        }}
                      >
                        {report.code.split("_")[0]}
                      </span>
                    </div>

                    {/* Hero: Icon, Title & Badge */}
                    <div className="d-flex align-items-start gap-3 mb-3">
                      <div
                        className="d-flex align-items-center justify-content-center flex-shrink-0"
                        style={{
                          width: "44px",
                          height: "44px",
                          borderRadius: "8px",
                          background:
                            "linear-gradient(135deg, #7f1d1d 0%, #450a0a 100%)",
                          color: "#ffffff",
                          fontSize: "20px",
                          boxShadow: "0 4px 10px rgba(127, 29, 29, 0.2)",
                        }}
                      >
                        <i className={report.icon || "ri-bar-chart-2-line"}></i>
                      </div>
                      <div className="flex-grow-1">
                        <h6
                          className="fw-bold mb-1"
                          style={{
                            color: "#0f172a",
                            fontSize: "15px",
                            lineHeight: "1.35",
                          }}
                        >
                          {report.name}
                        </h6>
                        <span
                          style={{
                            display: "inline-block",
                            backgroundColor: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            color: "#475569",
                            fontSize: "10.5px",
                            fontWeight: 600,
                            padding: "2px 6px",
                            borderRadius: "4px",
                          }}
                        >
                          {report.badge || "Analytics"}
                        </span>
                      </div>
                    </div>

                    {/* Description */}
                    <p
                      className="text-muted small mb-4 flex-grow-1"
                      style={{
                        fontSize: "12.5px",
                        lineHeight: "1.55",
                        color: "#64748b",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {report.description}
                    </p>

                    {/* Footer: Chart Indicator & Action Button */}
                    <div
                      className="d-flex align-items-center justify-content-between pt-3 mt-auto"
                      style={{ borderTop: "1px solid #f1f5f9" }}
                    >
                      <span
                        className="d-flex align-items-center gap-1"
                        style={{
                          fontSize: "11.5px",
                          color: "#64748b",
                          fontWeight: 500,
                        }}
                      >
                        <i
                          className="ri-line-chart-line"
                          style={{ color: "#7f1d1d" }}
                        ></i>
                        {report.chart_type?.replace(/_/g, " ")}
                      </span>

                      <button
                        type="button"
                        className="btn btn-sm d-flex align-items-center gap-1"
                        style={{
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: 600,
                          backgroundColor: isHovered ? "#7f1d1d" : "#ffffff",
                          color: isHovered ? "#ffffff" : "#7f1d1d",
                          border: "1px solid #7f1d1d",
                          padding: "5px 12px",
                          transition: "all 0.15s ease",
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectReport(report);
                        }}
                      >
                        Run Report <i className="ri-arrow-right-line"></i>
                      </button>
                    </div>
                  </CardBody>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}
    </div>
  );
};

export default ReportCatalogView;
