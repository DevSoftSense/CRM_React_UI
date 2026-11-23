import React, { useState, useMemo } from "react";
import { useSelector } from "react-redux";
import {
  Row,
  Col,
  Card,
  CardBody,
  Input,
  Button,
} from "reactstrap";

const CHART_TYPE_META = {
  horizontal_bar: { icon: "ri-bar-chart-horizontal-line", label: "Horizontal Bar" },
  donut: { icon: "ri-pie-chart-line", label: "Donut Chart" },
  area: { icon: "ri-line-chart-line", label: "Area Trend" },
  funnel: { icon: "ri-filter-3-line", label: "Funnel Velocity" },
  storage_gauge: { icon: "ri-dashboard-3-line", label: "Storage Gauge" },
  multi_bar: { icon: "ri-bar-chart-grouped-line", label: "Grouped Bar" },
  bullet_bar: { icon: "ri-git-commit-line", label: "Bullet Progress" },
  aging_bars: { icon: "ri-time-line", label: "Aging Bars" },
  top_list: { icon: "ri-list-ordered", label: "Ranked Table" },
  risk_bars: { icon: "ri-alarm-warning-line", label: "Risk Meter" },
  trend_column: { icon: "ri-bar-chart-line", label: "Trend Column" },
  gauge: { icon: "ri-dashboard-line", label: "Compliance Gauge" },
};

const resolveChartMeta = (type) => {
  const key = String(type || "").toLowerCase().trim();
  if (CHART_TYPE_META[key]) return CHART_TYPE_META[key];
  const formatted = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return { icon: "ri-bar-chart-2-line", label: formatted || "Analytics Chart" };
};

const ReportCatalogView = ({ categories, reports, onSelectReport }) => {
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [hoveredCode, setHoveredCode] = useState(null);

  const layoutModeType = useSelector((state) => state.Layout.layoutModeType);
  const isDark = layoutModeType === "dark";

  // Dynamic Theme Palette
  const cardBg = isDark ? "#121212" : "#ffffff";
  const cardBorder = isDark ? "#2d3748" : "#e2e8f0";
  const subtleBg = isDark ? "#1a202c" : "#f8fafc";
  const subtleBorder = isDark ? "#334155" : "#cbd5e1";
  const textTitle = isDark ? "#f8fafc" : "#0f172a";
  const textSub = isDark ? "#94a3b8" : "#64748b";
  const primaryColor = isDark ? "#fca5a5" : "#7f1d1d";

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
        className="shadow-sm border-0 mb-4 rounded-0"
        style={{
          borderRadius: 0,
          background: cardBg,
          border: `1px solid ${cardBorder}`,
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
                    className="btn btn-sm d-flex align-items-center gap-2 border-0 rounded-0"
                    style={{
                      borderRadius: 0,
                      fontSize: "13px",
                      fontWeight: isActive ? 600 : 500,
                      padding: "7px 14px",
                      backgroundColor: isActive ? "#7f1d1d" : "transparent",
                      color: isActive ? "#ffffff" : textSub,
                      transition: "all 0.15s ease",
                    }}
                    onClick={() => setActiveCategory(cat.id)}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = isDark ? "#21262d" : "#f8fafc";
                        e.currentTarget.style.color = textTitle;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = "transparent";
                        e.currentTarget.style.color = textSub;
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
                        borderRadius: 0,
                        backgroundColor: isActive
                          ? "rgba(255, 255, 255, 0.22)"
                          : (isDark ? "#21262d" : "#f1f5f9"),
                        color: isActive ? "#ffffff" : textTitle,
                        fontSize: "11px",
                        fontWeight: 600,
                        border: isActive ? "none" : (isDark ? "1px solid #334155" : "1px solid #e2e8f0"),
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
                className="ps-4 rounded-0"
                style={{
                  borderRadius: 0,
                  fontSize: "13px",
                  height: "38px",
                  borderColor: subtleBorder,
                  backgroundColor: isDark ? "#121212" : "#ffffff",
                  color: textTitle,
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
                  color: textSub,
                  fontSize: "14px",
                }}
              ></i>
              {searchTerm && (
                <button
                  type="button"
                  className="btn btn-sm btn-link position-absolute end-0 top-50 translate-middle-y text-muted p-1 me-2"
                  onClick={() => setSearchTerm("")}
                >
                  <i className="ri-close-line" style={{ color: textSub }}></i>
                </button>
              )}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Reports Grid */}
      {filteredReports.length === 0 ? (
        <Card
          className="shadow-sm border-0 py-5 rounded-0"
          style={{ borderRadius: 0, background: cardBg, border: `1px solid ${cardBorder}` }}
        >
          <CardBody className="text-center">
            <div
              className="d-inline-flex align-items-center justify-content-center mb-3"
              style={{
                width: "56px",
                height: "56px",
                borderRadius: 0,
                backgroundColor: isDark ? "rgba(239, 68, 68, 0.15)" : "rgba(127, 29, 29, 0.08)",
                color: isDark ? "#f87171" : "#7f1d1d",
                fontSize: "24px",
              }}
            >
              <i className="ri-file-search-line"></i>
            </div>
            <h5 className="fw-semibold mb-1" style={{ color: textTitle }}>No Matching Reports Found</h5>
            <p className="small mb-3" style={{ color: textSub }}>
              No reports match your query "{searchTerm}". Try clearing your filters.
            </p>
            <Button
              size="sm"
              className="border px-3 rounded-0"
              style={{
                borderRadius: 0,
                backgroundColor: subtleBg,
                borderColor: subtleBorder,
                color: textTitle,
              }}
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
            const chartMeta = resolveChartMeta(report.chart_type);

            return (
              <Col xl={4} md={6} xs={12} key={report.code}>
                <Card
                  className="h-100 border-0 d-flex flex-column rounded-0"
                  style={{
                    borderRadius: 0,
                    background: cardBg,
                    border: isHovered
                      ? (isDark ? "1px solid #f87171" : "1px solid #fca5a5")
                      : `1px solid ${cardBorder}`,
                    boxShadow: isHovered
                      ? (isDark ? "0 4px 16px rgba(0, 0, 0, 0.45)" : "0 4px 12px rgba(127, 29, 29, 0.08)")
                      : "0 1px 3px rgba(0, 0, 0, 0.04)",
                    transform: isHovered ? "translateY(-2px)" : "translateY(0)",
                    transition:
                      "transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease",
                    cursor: "pointer",
                  }}
                  onMouseEnter={() => setHoveredCode(report.code)}
                  onMouseLeave={() => setHoveredCode(null)}
                  onClick={() => onSelectReport(report)}
                >
                  <CardBody className="p-4 d-flex flex-column">
                    {/* Title, Icon & Badge */}
                    <div className="d-flex align-items-start gap-3 mb-3">
                      <div
                        className="d-flex align-items-center justify-content-center flex-shrink-0"
                        style={{
                          width: "38px",
                          height: "38px",
                          borderRadius: 0,
                          backgroundColor: isHovered
                            ? "#7f1d1d"
                            : (isDark ? "rgba(239, 68, 68, 0.18)" : "rgba(127, 29, 29, 0.08)"),
                          color: isHovered
                            ? "#ffffff"
                            : (isDark ? "#f87171" : "#7f1d1d"),
                          fontSize: "18px",
                          border: isHovered
                            ? "1px solid #7f1d1d"
                            : (isDark ? "1px solid rgba(239, 68, 68, 0.25)" : "none"),
                          transition: "all 0.15s ease",
                        }}
                      >
                        <i className={report.icon || "ri-file-chart-line"}></i>
                      </div>
                      <div className="flex-grow-1 min-w-0">
                        <h6
                          className="fw-bold mb-1"
                          style={{
                            color: textTitle,
                            fontSize: "15px",
                            lineHeight: "1.35",
                          }}
                        >
                          {report.name}
                        </h6>
                        <span
                          style={{
                            display: "inline-block",
                            backgroundColor: isDark ? "#21262d" : "#f8fafc",
                            border: isDark ? "1px solid #334155" : "1px solid #e2e8f0",
                            color: isDark ? "#cbd5e1" : "#475569",
                            fontSize: "10.5px",
                            fontWeight: 600,
                            padding: "2px 6px",
                            borderRadius: 0,
                          }}
                        >
                          {report.badge || "Analytics"}
                        </span>
                      </div>
                    </div>

                    {/* Description */}
                    <p
                      className="small mb-4 flex-grow-1"
                      style={{
                        fontSize: "12.5px",
                        lineHeight: "1.55",
                        color: textSub,
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
                      style={{ borderTop: isDark ? "1px solid #262626" : "1px solid #f1f5f9" }}
                    >
                      <span
                        className="d-flex align-items-center gap-1.5"
                        style={{
                          fontSize: "11.5px",
                          color: textSub,
                          fontWeight: 500,
                        }}
                      >
                        <i
                          className={chartMeta.icon}
                          style={{ color: isDark ? "#f87171" : "#7f1d1d", fontSize: "14px" }}
                        ></i>
                        <span>{chartMeta.label}</span>
                      </span>

                      <button
                        type="button"
                        className="btn btn-sm d-flex align-items-center gap-1 rounded-0"
                        style={{
                          borderRadius: 0,
                          fontSize: "12px",
                          fontWeight: 600,
                          backgroundColor: isHovered
                            ? "#7f1d1d"
                            : (isDark ? "rgba(127, 29, 29, 0.15)" : "#ffffff"),
                          color: isHovered
                            ? "#ffffff"
                            : (isDark ? "#fca5a5" : "#7f1d1d"),
                          border: isHovered
                            ? "1px solid #7f1d1d"
                            : (isDark ? "1px solid #991b1b" : "1px solid #7f1d1d"),
                          padding: "5px 12px",
                          transition: "all 0.15s ease",
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectReport(report);
                        }}
                      >
                        View Report <i className="ri-arrow-right-line"></i>
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
