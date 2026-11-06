import React from "react";
import { Row, Card, CardBody } from "reactstrap";
import { getKpiConfig } from "../utils/reportUtils";

const ReportKpiCards = ({ summary }) => {
  if (!summary || typeof summary !== "object") return null;

  const entries = Object.entries(summary).filter(
    ([, val]) => val !== null && val !== undefined
  );

  if (entries.length === 0) return null;

  // Determine column width: 1 -> col-12, 2 -> col-md-6, 3 -> col-lg-4, 4+ -> col-xl-3 col-md-6
  const getColClass = (total) => {
    if (total === 1) return "col-12";
    if (total === 2) return "col-md-6 col-12";
    if (total === 3) return "col-lg-4 col-md-6 col-12";
    return "col-xl-3 col-md-6 col-12";
  };

  const colClass = getColClass(entries.length);

  return (
    <Row className="mb-4 g-3">
      {entries.map(([key, val]) => {
        const { label, displayVal, icon, color, bg } = getKpiConfig(key, val);

        return (
          <div className={colClass} key={key}>
            <Card
              className="h-100 bg-white"
              style={{
                borderRadius: "4px",
                border: "1px solid #e2e8f0",
                borderTop: `3px solid ${color}`,
                boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
                transition: "all 0.15s ease",
              }}
            >
              <CardBody className="p-3 d-flex align-items-center justify-content-between">
                <div>
                  <span
                    className="text-muted text-uppercase fw-semibold d-block mb-1"
                    style={{ fontSize: "11px", letterSpacing: "0.4px" }}
                  >
                    {label}
                  </span>
                  <div
                    className="fw-bold text-dark"
                    style={{
                      fontSize: "24px",
                      letterSpacing: "-0.5px",
                      lineHeight: "1.2",
                    }}
                  >
                    {displayVal}
                  </div>
                </div>

                <div
                  className="d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "4px",
                    backgroundColor: bg,
                    color: color,
                    fontSize: "20px",
                  }}
                >
                  <i className={icon}></i>
                </div>
              </CardBody>
            </Card>
          </div>
        );
      })}
    </Row>
  );
};

export default ReportKpiCards;
