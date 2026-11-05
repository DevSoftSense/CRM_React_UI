import React from "react";
import { Row, Col, Card, CardBody } from "reactstrap";

const formatInr = (val) => {
  const num = Number(val) || 0;
  return "₹ " + num.toLocaleString("en-IN");
};

// Lightweight SVG Sparkline component (Zero ApexChart overhead, high-performance)
const MiniSparkline = ({ data = [], color = "#7f1d1d", width = 110, height = 28 }) => {
  const points = Array.isArray(data) && data.length > 0 ? data : [0, 0, 0, 0, 0, 0, 0];
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = max - min || 1;
  const step = width / (points.length - 1 || 1);

  const coords = points.map((val, idx) => {
    const x = Math.round(idx * step);
    const y = Math.round(height - ((val - min) / range) * (height - 6) - 3);
    return `${x},${y}`;
  });

  const pathD = `M ${coords.join(" L ")}`;

  return (
    <svg width={width} height={height} className="overflow-visible" style={{ display: "block" }}>
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const SalesKpiCards = ({ kpis = {}, comparisonLabel = "vs previous period" }) => {
  const totalRevVal = Number(kpis.total_revenue?.value ?? kpis.total_revenue?.count ?? 0);
  const totalRevGrowth = Number(kpis.total_revenue?.growth_pct ?? 0);

  const wonRevVal = Number(kpis.won_revenue?.value ?? kpis.won_revenue?.count ?? 0);
  const wonRevGrowth = Number(kpis.won_revenue?.growth_pct ?? 0);

  const dealsWonVal = Number(kpis.deals_won?.count ?? kpis.deals_won?.value ?? 0);
  const dealsWonGrowth = Number(kpis.deals_won?.growth_pct ?? 0);

  const openOppsVal = Number(kpis.open_opportunities?.count ?? kpis.open_opportunities?.value ?? 0);
  const openOppsGrowth = Number(kpis.open_opportunities?.growth_pct ?? 0);

  const newLeadsVal = Number(kpis.new_leads?.count ?? kpis.new_leads?.value ?? 0);
  const newLeadsGrowth = Number(kpis.new_leads?.growth_pct ?? 0);

  const winRateVal = Number(kpis.win_rate?.percentage ?? kpis.win_rate?.value ?? 0);
  const winRateGrowth = Number(kpis.win_rate?.growth_pct ?? 0);

  const cards = [
    {
      title: "Total Revenue",
      value: formatInr(totalRevVal),
      growth: totalRevGrowth,
      isPositive: totalRevGrowth >= 0,
      sparkline: kpis.total_revenue?.sparkline ?? [0, 0, 0, 0, 0, 0, totalRevVal],
      sparkColor: "#7f1d1d",
      icon: "ri-wallet-3-line",
      iconBg: "rgba(127, 29, 29, 0.1)",
      iconColor: "#7f1d1d",
    },
    {
      title: "Won Revenue",
      value: formatInr(wonRevVal),
      growth: wonRevGrowth,
      isPositive: wonRevGrowth >= 0,
      sparkline: kpis.won_revenue?.sparkline ?? [0, 0, 0, 0, 0, 0, wonRevVal],
      sparkColor: "#059669",
      icon: "ri-focus-3-line",
      iconBg: "rgba(5, 150, 105, 0.1)",
      iconColor: "#059669",
    },
    {
      title: "Total Deals Won",
      value: dealsWonVal.toLocaleString(),
      growth: dealsWonGrowth,
      isPositive: dealsWonGrowth >= 0,
      sparkline: kpis.deals_won?.sparkline ?? [0, 0, 0, 0, 0, 0, dealsWonVal],
      sparkColor: "#991b1b",
      icon: "ri-trophy-line",
      iconBg: "rgba(153, 27, 27, 0.1)",
      iconColor: "#991b1b",
    },
    {
      title: "Open Opportunities",
      value: openOppsVal.toLocaleString(),
      growth: openOppsGrowth,
      isPositive: openOppsGrowth >= 0,
      sparkline: kpis.open_opportunities?.sparkline ?? [0, 0, 0, 0, 0, 0, openOppsVal],
      sparkColor: "#d97706",
      icon: "ri-hourglass-2-line",
      iconBg: "rgba(217, 119, 6, 0.1)",
      iconColor: "#d97706",
    },
    {
      title: "New Leads",
      value: newLeadsVal.toLocaleString(),
      growth: newLeadsGrowth,
      isPositive: newLeadsGrowth >= 0,
      sparkline: kpis.new_leads?.sparkline ?? [0, 0, 0, 0, 0, 0, newLeadsVal],
      sparkColor: "#475569",
      icon: "ri-user-add-line",
      iconBg: "rgba(71, 85, 105, 0.1)",
      iconColor: "#475569",
    },
    {
      title: "Win Rate",
      value: `${winRateVal.toFixed(1)}%`,
      growth: winRateGrowth,
      isPositive: winRateGrowth >= 0,
      sparkline: kpis.win_rate?.sparkline ?? [0, 0, 0, 0, 0, 0, winRateVal],
      sparkColor: "#0d9488",
      icon: "ri-pie-chart-2-line",
      iconBg: "rgba(13, 148, 136, 0.1)",
      iconColor: "#0d9488",
    },
  ];

  return (
    <Row className="g-3 mb-4">
      {cards.map((card, idx) => (
        <Col key={idx} xl={2} md={4} sm={6}>
          <Card
            className="border shadow-none h-100 mb-0 bg-white crm-sales-kpi-card"
            style={{ borderRadius: 0, borderColor: "#e2e8f0" }}
          >
            <CardBody className="p-3 d-flex flex-column justify-content-between">
              {/* Row 1: Title + Icon */}
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span
                  className="text-muted fw-bold fs-11 text-uppercase text-truncate me-1"
                  style={{ letterSpacing: "0.5px" }}
                  title={card.title}
                >
                  {card.title}
                </span>
                <div
                  className="d-flex align-items-center justify-content-center flex-shrink-0 crm-sales-kpi-icon-box"
                  style={{
                    width: 32,
                    height: 32,
                    backgroundColor: card.iconBg,
                    color: card.iconColor,
                    borderRadius: 0,
                  }}
                >
                  <i className={`${card.icon} fs-16`} />
                </div>
              </div>

              {/* Row 2: Value */}
              <h3 className="fw-bold text-dark mb-2 fs-20 text-truncate" title={card.value}>
                {card.value}
              </h3>

              {/* Row 3: Sparkline */}
              <div className="my-1 py-1 d-flex align-items-center">
                <MiniSparkline data={card.sparkline} color={card.sparkColor} width={130} height={24} />
              </div>

              {/* Row 4: Comparison & Growth */}
              <div className="d-flex align-items-center justify-content-between pt-2 border-top mt-1 fs-11">
                <span className="text-muted text-truncate" style={{ maxWidth: "70px" }}>
                  {comparisonLabel}
                </span>
                <span
                  className={`fw-semibold text-nowrap ${
                    card.isPositive ? "text-success" : "text-danger"
                  }`}
                >
                  {card.isPositive ? "▲" : "▼"} {Math.abs(card.growth).toFixed(1)}%
                </span>
              </div>
            </CardBody>
          </Card>
        </Col>
      ))}
    </Row>
  );
};

export default SalesKpiCards;
