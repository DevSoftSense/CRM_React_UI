import React from "react";
import { Card, CardBody, CardHeader } from "reactstrap";

const AiInsightsCard = ({ insights = [] }) => {
  return (
    <Card className="crm-card-3d crm-accent-amber h-100">
      <CardHeader
        className="bg-transparent border-bottom p-3 d-flex align-items-center justify-content-between"
        style={{ borderColor: "#f1f5f9" }}
      >
        <div className="d-flex align-items-center">
          <i className="ri-sparkling-fill me-2" style={{ color: "#d97706", fontSize: "1.05rem" }} />
          <h5 className="card-title mb-0 fw-semibold" style={{ fontSize: "0.9375rem", color: "#1e293b" }}>
            AI Insights
          </h5>
        </div>
        <span
          className="rounded-0 px-2 py-1 fw-semibold"
          style={{
            backgroundColor: "#fffbeb",
            color: "#b45309",
            border: "1px solid #fde68a",
            fontSize: "0.72rem",
            boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
          }}
        >
          Live Intelligence
        </span>
      </CardHeader>
      <CardBody className="p-3">
        <div className="d-flex flex-column gap-2 crm-custom-scroll" style={{ maxHeight: "250px", overflowY: "auto" }}>
          {insights.length === 0 ? (
            <div className="text-center py-4 text-muted">
              <i className="ri-shield-check-line d-block fs-3 text-success mb-1" />
              All pipeline metrics are running normally.
            </div>
          ) : (
            insights.map((item, idx) => (
              <div
                key={idx}
                className="crm-insight-item-3d p-2 rounded-0 d-flex align-items-start gap-2"
                style={{
                  backgroundColor: item.icon_bg || "#f8fafc",
                  borderLeftColor: item.icon_color || "#7f1d1d",
                }}
              >
                <div
                  className="d-flex align-items-center justify-content-center flex-shrink-0 mt-1"
                  style={{
                    width: "26px",
                    height: "26px",
                    borderRadius: "50%",
                    backgroundColor: "#ffffff",
                    color: item.icon_color || "#7f1d1d",
                    fontSize: "0.85rem",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  }}
                >
                  <i className={item.icon || "ri-information-line"} />
                </div>
                <div className="flex-grow-1">
                  <p
                    className="mb-0 text-dark"
                    style={{ fontSize: "0.785rem", lineHeight: "1.35", fontWeight: 500 }}
                  >
                    {item.message}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardBody>
    </Card>
  );
};

export default AiInsightsCard;
