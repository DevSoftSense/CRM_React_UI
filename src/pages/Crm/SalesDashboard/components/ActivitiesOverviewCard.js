import React, { useState } from "react";
import { Card, CardBody, CardHeader, Row, Col } from "reactstrap";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";

const ActivitiesOverviewCard = ({ activities = {} }) => {
  const layoutModeType = useSelector((state) => state.Layout?.layoutModeType);
  const isDark =
    layoutModeType === "dark" ||
    (typeof document !== "undefined" &&
      (document.documentElement.getAttribute("data-bs-theme") === "dark" ||
        document.documentElement.getAttribute("data-layout-mode") === "dark"));

  const [periodFilter, setPeriodFilter] = useState("month");

  // Strictly real data from database
  const tiles = [
    {
      title: "Calls",
      count: activities?.calls_made?.count ?? 0,
      icon: "ri-phone-fill",
    },
    {
      title: "Emails",
      count: activities?.emails_sent?.count ?? 0,
      icon: "ri-mail-fill",
    },
    {
      title: "Meetings",
      count: activities?.meetings?.count ?? 0,
      icon: "ri-calendar-2-fill",
    },
    {
      title: "Tasks",
      count: activities?.tasks_completed?.count ?? 0,
      icon: "ri-checkbox-fill",
    },
    {
      title: "Follow-ups",
      count: activities?.follow_ups?.count ?? 0,
      icon: "ri-time-fill",
    },
    {
      title: "Quotes",
      count: activities?.quotes_sent?.count ?? 0,
      icon: "ri-file-text-fill",
    },
  ];

  return (
    <Card
      className="border shadow-none h-100 mb-0 bg-white"
      style={{
        borderRadius: "12px",
        borderColor: isDark ? "#334155" : "#e2e8f0",
        backgroundColor: isDark ? "#1e293b" : "#ffffff",
      }}
    >
      {/* Top Header: Title + Period Filter */}
      <CardHeader className="bg-transparent border-0 pt-3 pb-1 px-3 d-flex align-items-center justify-content-between">
        <h6
          className="fw-bold fs-14 mb-0"
          style={{ color: isDark ? "#f8fafc" : "#0f172a" }}
        >
          Activities Overview
        </h6>
        <div style={{ width: 105 }}>
          <select
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
            className="form-select form-select-sm border shadow-none"
            style={{
              borderRadius: "6px",
              fontSize: "11px",
              fontWeight: 500,
              padding: "4px 8px",
              cursor: "pointer",
              backgroundColor: isDark ? "#0f172a" : "#ffffff",
              color: isDark ? "#cbd5e1" : "#334155",
              borderColor: isDark ? "#334155" : "#e2e8f0",
            }}
          >
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="week">This Week</option>
          </select>
        </div>
      </CardHeader>

      <CardBody className="p-3 pt-2 d-flex flex-column justify-content-between">
        {/* 2x3 Grid of Activity Cards */}
        <Row className="g-2 g-md-3 my-auto py-1">
          {tiles.map((t, idx) => (
            <Col key={idx} xs={4}>
              <div
                className="d-flex flex-column align-items-center justify-content-center text-center p-2"
                style={{
                  borderRadius: "14px",
                  backgroundColor: isDark ? "#0f172a" : "#fbf2f4",
                  border: `1px solid ${isDark ? "#334155" : "#fecdd3"}`,
                  minHeight: "88px",
                  transition: "transform 0.15s ease, box-shadow 0.15s ease",
                  cursor: "default",
                }}
              >
                {/* Clean Maroon Icon on Top */}
                <i
                  className={`${t.icon} mb-1`}
                  style={{
                    fontSize: "22px",
                    color: isDark ? "#f87171" : "#881337",
                    lineHeight: 1,
                  }}
                />

                {/* Big Count Number */}
                <div
                  className="fw-bold fs-16 mb-0"
                  style={{
                    color: isDark ? "#f8fafc" : "#0f172a",
                    lineHeight: 1.2,
                  }}
                >
                  {t.count}
                </div>

                {/* Short Compact Label */}
                <div
                  className="fs-12 fw-semibold"
                  style={{
                    color: isDark ? "#94a3b8" : "#334155",
                    marginTop: "2px",
                  }}
                >
                  {t.title}
                </div>
              </div>
            </Col>
          ))}
        </Row>

        {/* Footer Link */}
        <div className="pt-2 mt-2 border-top text-end">
          <Link
            to="/crm/activities"
            className="fs-12 fw-semibold text-decoration-none d-inline-flex align-items-center gap-1"
            style={{ color: "#7f1d1d" }}
          >
            <span>View All Activities</span>
            <i className="ri-arrow-right-line" />
          </Link>
        </div>
      </CardBody>
    </Card>
  );
};

export default ActivitiesOverviewCard;
