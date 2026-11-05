import React from "react";
import { Card, CardBody, CardHeader } from "reactstrap";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";

const formatInr = (val) => {
  const num = Number(val) || 0;
  return "₹ " + num.toLocaleString("en-IN");
};

const RecentWonDealsTable = ({ deals = [] }) => {
  const layoutModeType = useSelector((state) => state.Layout?.layoutModeType);
  const isDark =
    layoutModeType === "dark" ||
    (typeof document !== "undefined" &&
      (document.documentElement.getAttribute("data-bs-theme") === "dark" ||
        document.documentElement.getAttribute("data-layout-mode") === "dark"));

  const dealList = Array.isArray(deals) ? deals : [];

  return (
    <Card
      className="border shadow-none h-100 mb-0 bg-white"
      style={{
        borderRadius: "12px",
        borderColor: isDark ? "#334155" : "#e2e8f0",
        backgroundColor: isDark ? "#1e293b" : "#ffffff",
      }}
    >
      {/* Top Header: Title */}
      <CardHeader className="bg-transparent border-0 pt-3 pb-1 px-3 d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center gap-2">
          <span
            style={{
              width: 8,
              height: 8,
              backgroundColor: "#b91c1c",
              borderRadius: "50%",
              display: "inline-block",
            }}
          />
          <h6
            className="fw-bold fs-14 mb-0"
            style={{ color: isDark ? "#f8fafc" : "#0f172a" }}
          >
            Recent Won Deals
          </h6>
        </div>
      </CardHeader>

      <CardBody className="p-3 pt-2 d-flex flex-column">
        {dealList.length === 0 ? (
          <div className="d-flex flex-column align-items-center justify-content-center text-muted my-auto py-5">
            <i className="ri-award-line fs-32 text-muted mb-2" />
            <span className="fs-13">No recent won deals in this period.</span>
          </div>
        ) : (
          <div className="d-flex flex-column gap-2 mb-2">
            {dealList.map((d, idx) => (
              <div
                key={idx}
                className="p-3 position-relative"
                style={{
                  borderRadius: "16px",
                  border: isDark
                    ? "1.5px solid #881337"
                    : "1.5px solid #fda4af",
                  backgroundColor: isDark ? "#0f172a" : "#ffffff",
                  transition: "transform 0.15s ease, box-shadow 0.15s ease",
                }}
              >
                {/* Top Row: Trophy Icon + Opportunity Name + Customer Name & Won Pill */}
                <div className="d-flex align-items-start justify-content-between gap-2 mb-2">
                  <div className="d-flex align-items-start gap-2 gap-sm-3">
                    {/* Trophy Icon */}
                    <div
                      className="d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "10px",
                        backgroundColor: isDark
                          ? "rgba(136, 19, 55, 0.25)"
                          : "#fef2f2",
                        color: isDark ? "#f87171" : "#881337",
                      }}
                    >
                      <i className="ri-trophy-fill fs-22" />
                    </div>

                    {/* Deal Title & Customer */}
                    <div>
                      <Link
                        to={
                          d.opportunity_id
                            ? `/crm/opportunities/${d.opportunity_id}`
                            : "/crm/opportunities"
                        }
                        className="fw-bold fs-13 text-decoration-none d-block mb-1 text-truncate"
                        style={{
                          color: isDark ? "#f8fafc" : "#0f172a",
                          maxWidth: "280px",
                        }}
                        title={d.opportunity_name}
                      >
                        {d.opportunity_name}
                      </Link>
                      <span
                        className="fs-12 fw-medium d-block text-truncate"
                        style={{
                          color: isDark ? "#94a3b8" : "#475569",
                          maxWidth: "260px",
                        }}
                        title={d.customer_name}
                      >
                        {d.customer_name}
                      </span>
                    </div>
                  </div>

                  {/* Soft Emerald "Won" Badge */}
                  <span
                    className="badge fw-bold fs-11 px-3 py-1 flex-shrink-0"
                    style={{
                      backgroundColor: "#d1fae5",
                      color: "#047857",
                      borderRadius: "14px",
                      border: "1px solid #a7f3d0",
                    }}
                  >
                    Won
                  </span>
                </div>

                {/* Bottom Meta Breadcrumb: Amount | Rep | Close Date */}
                <div
                  className="d-flex align-items-center gap-2 pt-2 mt-1 fs-12 text-nowrap flex-wrap"
                  style={{
                    borderTop: `1px dashed ${
                      isDark ? "#334155" : "#f1f5f9"
                    }`,
                  }}
                >
                  <span
                    className="fw-bold"
                    style={{ color: isDark ? "#f8fafc" : "#0f172a" }}
                  >
                    {formatInr(d.amount)}
                  </span>
                  <span style={{ color: isDark ? "#475569" : "#cbd5e1" }}>
                    |
                  </span>
                  <span
                    className="fw-semibold"
                    style={{ color: isDark ? "#cbd5e1" : "#334155" }}
                  >
                    {d.sales_rep}
                  </span>
                  <span style={{ color: isDark ? "#475569" : "#cbd5e1" }}>
                    |
                  </span>
                  <span style={{ color: isDark ? "#94a3b8" : "#64748b" }}>
                    {d.close_date}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer Link: View All Won Deals → */}
        <div className="mt-auto pt-2 border-top d-flex align-items-center justify-content-between">
          <span className="fs-12 text-muted fw-medium">
            {dealList.length > 0
              ? `${dealList.length} won ${dealList.length === 1 ? "deal" : "deals"}`
              : ""}
          </span>
          <Link
            to="/crm/opportunities"
            className="fs-12 fw-semibold text-decoration-none d-inline-flex align-items-center gap-1"
            style={{ color: "#7f1d1d" }}
          >
            <span>View All Won Deals</span>
            <i className="ri-arrow-right-line" />
          </Link>
        </div>
      </CardBody>
    </Card>
  );
};

export default RecentWonDealsTable;
