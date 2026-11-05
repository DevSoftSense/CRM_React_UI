import React from "react";
import { Card, CardBody, CardHeader, Table } from "reactstrap";
import { Link } from "react-router-dom";
import { formatFullCurrency } from "./dashboardUtils";

const HotOpportunitiesCard = ({ opportunities = [] }) => {
  const getStageBadge = (stageName = "", stageCode = "") => {
    const code = String(stageCode || stageName).toUpperCase();
    if (code.includes("QUALIFIED") || code.includes("PROPOSAL")) {
      return (
        <span
          className="rounded-0 px-2 py-1 fw-semibold d-inline-block text-capitalize"
          style={{
            backgroundColor: "#fef2f2",
            color: "#7f1d1d",
            border: "1px solid #fecaca",
            fontSize: "0.68rem",
            letterSpacing: "0.02em",
          }}
        >
          {stageName || "Qualified"}
        </span>
      );
    }
    if (code.includes("NEGOTIATION")) {
      return (
        <span
          className="rounded-0 px-2 py-1 fw-semibold d-inline-block text-capitalize"
          style={{
            backgroundColor: "#fffbeb",
            color: "#b45309",
            border: "1px solid #fde68a",
            fontSize: "0.68rem",
            letterSpacing: "0.02em",
          }}
        >
          {stageName || "Negotiation"}
        </span>
      );
    }
    if (code.includes("WON")) {
      return (
        <span
          className="rounded-0 px-2 py-1 fw-semibold d-inline-block text-capitalize"
          style={{
            backgroundColor: "#ecfdf5",
            color: "#047857",
            border: "1px solid #a7f3d0",
            fontSize: "0.68rem",
            letterSpacing: "0.02em",
          }}
        >
          {stageName || "Won"}
        </span>
      );
    }
    return (
      <span
        className="rounded-0 px-2 py-1 fw-semibold d-inline-block text-capitalize"
        style={{
          backgroundColor: "#f8fafc",
          color: "#475569",
          border: "1px solid #e2e8f0",
          fontSize: "0.68rem",
          letterSpacing: "0.02em",
        }}
      >
        {stageName || "Open"}
      </span>
    );
  };

  return (
    <Card className="crm-card-3d crm-accent-maroon h-100">
      <CardHeader
        className="bg-transparent border-bottom p-3 d-flex align-items-center justify-content-between"
        style={{ borderColor: "#f1f5f9" }}
      >
        <div className="d-flex align-items-center">
          <i className="ri-fire-line me-2" style={{ color: "#7f1d1d", fontSize: "1.05rem" }} />
          <h5 className="card-title mb-0 fw-semibold" style={{ fontSize: "0.9375rem" }}>
            Hot Opportunities
          </h5>
        </div>
        <Link
          to="/crm/opportunities" className="text-decoration-none fw-medium crm-card-header-link"
          style={{ fontSize: "0.75rem", color: "#7f1d1d" }}
        >
          View All <i className="ri-arrow-right-s-line align-middle" />
        </Link>
      </CardHeader>
      <CardBody className="p-0">
        <div className="table-responsive crm-custom-scroll" style={{ maxHeight: "250px", overflowY: "auto" }}>
          <Table className="align-middle table-nowrap mb-0 table-hover">
            <thead className="table-light">
              <tr style={{ fontSize: "0.72rem" }}>
                <th scope="col" className="ps-3">Customer</th>
                <th scope="col">Stage</th>
                <th scope="col">Probability</th>
                <th scope="col" className="pe-3 text-end">Value</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: "0.785rem" }}>
              {opportunities.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-4 text-muted">
                    <i className="ri-shake-hands-line d-block fs-3 text-secondary mb-1" />
                    No open opportunities in pipeline.
                  </td>
                </tr>
              ) : (
                opportunities.map((o, idx) => (
                  <tr key={o.opportunity_id || idx} className="crm-table-hover-row">
                    <td className="ps-3" style={{ maxWidth: "120px" }}>
                      <Link
                        to={`/crm/opportunities/${o.opportunity_id}`}
                        className="text-decoration-none fw-semibold text-truncate d-block crm-table-link"
                        title={o.customer_name}
                      >
                        {o.customer_name}
                      </Link>
                      <small className="text-muted text-truncate d-block" style={{ fontSize: "0.6875rem" }}>
                        {o.opportunity_name}
                      </small>
                    </td>
                    <td>{getStageBadge(o.stage_name, o.stage_code)}</td>
                    <td>
                      <span className="fw-semibold crm-table-link">
                        {Number(o.probability || 0).toFixed(0)}%
                      </span>
                    </td>
                    <td className="pe-3 text-end fw-bold crm-table-value">
                      {formatFullCurrency(o.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>
      </CardBody>
    </Card>
  );
};

export default HotOpportunitiesCard;
