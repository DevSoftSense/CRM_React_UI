import React from "react";
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

  // Strictly real data from database
  const tiles = [
    {
      title: "Calls",
      count: activities?.calls_made?.count ?? 0,
      growth: activities?.calls_made?.growth_pct,
      icon: "ri-phone-fill",
    },
    {
      title: "Emails",
      count: activities?.emails_sent?.count ?? 0,
      growth: activities?.emails_sent?.growth_pct,
      icon: "ri-mail-fill",
    },
    {
      title: "Meetings",
      count: activities?.meetings?.count ?? 0,
      growth: activities?.meetings?.growth_pct,
      icon: "ri-calendar-2-fill",
    },
    {
      title: "Tasks",
      count: activities?.tasks_completed?.count ?? 0,
      growth: activities?.tasks_completed?.growth_pct,
      icon: "ri-checkbox-fill",
    },
    {
      title: "Follow-ups",
      count: activities?.follow_ups?.count ?? 0,
      growth: activities?.follow_ups?.growth_pct,
      icon: "ri-time-fill",
    },
    {
      title: "Quotes",
      count: activities?.quotes_sent?.count ?? 0,
      growth: activities?.quotes_sent?.growth_pct,
      icon: "ri-file-text-fill",
    },
  ];
  const totalActivities = tiles.reduce((s, t) => s + (Number(t.count) || 0), 0);

  return (
    <Card
      className="border shadow-none h-100 mb-0"
      style={{
        borderRadius: 0,
        borderColor: isDark ? "#21262d" : "#e2e8f0",
        backgroundColor: isDark ? "#161b22" : "#ffffff",
      }}
    >
      {/* Top Header: Title + Total Badge */}
      <CardHeader className="bg-transparent border-0 pt-3 pb-1 px-3 d-flex align-items-center justify-content-between">
        <h6
          className="fw-bold fs-14 mb-0"
          style={{ color: isDark ? "#f8fafc" : "#0f172a" }}
        >
          Activities Overview
        </h6>
        <span
          className="badge rounded-0 fs-11 fw-medium px-2 py-1"
          style={{
            backgroundColor: isDark ? "#1a1a1a" : "#f8fafc",
            color: isDark ? "#94a3b8" : "#475569",
            border: `1px solid ${isDark ? "#262626" : "#e2e8f0"}`,
          }}
        >
          {totalActivities} Total
        </span>
      </CardHeader>

      <CardBody className="p-3 pt-2 d-flex flex-column justify-content-between">
        {/* 2x3 Grid of Activity Cards */}
        <Row className="g-2 g-md-3 my-auto py-1">
          {tiles.map((t, idx) => (
            <Col key={idx} xs={4}>
              <div
                className="d-flex flex-column align-items-center justify-content-center text-center p-2"
                style={{
                  borderRadius: 0,
                  backgroundColor: isDark ? "#1a1a1a" : "#fbf2f4",
                  border: `1px solid ${isDark ? "#262626" : "#fecdd3"}`,
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
