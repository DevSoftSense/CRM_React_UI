import React from "react";
import { Row, Col, Card, CardBody } from "reactstrap";
import { getKpiConfig } from "../utils/reportUtils";

const ReportKpiCards = ({ summary }) => {
  if (!summary || typeof summary !== "object") return null;

  const entries = Object.entries(summary).filter(
    ([, val]) => val !== null && val !== undefined
  );

  if (entries.length === 0) return null;

  // Compute column width: if 1-2 items -> col-md-6, 3 items -> col-md-4, 4+ items -> col-xl-3 col-md-6
  const getColClass = (total) => {
    if (total === 1) return "col-12";
    if (total === 2) return "col-md-6 col-12";
    if (total === 3) return "col-md-4 col-12";
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
              className="h-100 shadow-sm border-0"
              style={{
                borderRadius: "12px",
                borderLeft: `4px solid ${color}`,
                background: "#ffffff",
                transition: "transform 0.15s ease, box-shadow 0.15s ease",
              }}
            >
              <CardBody className="p-3">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span
                    className="text-muted text-uppercase fw-semibold"
                    style={{ fontSize: "11px", letterSpacing: "0.5px" }}
                  >
                    {label}
                  </span>
                  <div
                    className="d-flex align-items-center justify-content-center"
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "10px",
                      backgroundColor: bg,
                      color: color,
                      fontSize: "18px",
                    }}
                  >
                    <i className={icon}></i>
                  </div>
                </div>

                <div className="d-flex align-items-baseline">
                  <h3
                    className="fw-bold mb-0 text-dark"
                    style={{ fontSize: "22px", letterSpacing: "-0.5px" }}
                  >
                    {displayVal}
                  </h3>
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

