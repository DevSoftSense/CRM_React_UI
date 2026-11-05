import React from "react";
import { Row, Col, Card, CardBody } from "reactstrap";
import ReactApexChart from "react-apexcharts";
import { formatCurrency, formatNumber } from "./dashboardUtils";

const getSparklineConfig = (color = "#7f1d1d", data = []) => {
  const safeData = Array.isArray(data) && data.length > 0 ? data.map(Number) : [0, 0, 0, 0, 0, 0, 0];
  return {
    series: [{ data: safeData }],
    options: {
      chart: {
        type: "area",
        height: 38,
        sparkline: { enabled: true },
        toolbar: { show: false },
        animations: { enabled: true, easing: "easeinout", speed: 600 },
        dropShadow: {
          enabled: true,
          top: 2,
          left: 0,
          blur: 3,
          opacity: 0.22,
          color: color,
        },
      },
      stroke: { curve: "smooth", width: 2.2 },
      fill: {
        type: "gradient",
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.45,
          opacityTo: 0.05,
          stops: [0, 95],
        },
      },
      colors: [color],
      tooltip: {
        fixed: { enabled: false },
        x: { show: false },
        y: {
          formatter: (val) => Number(val).toLocaleString("en-IN"),
          title: { formatter: () => "" },
        },
        marker: { show: false },
      },
    },
  };
};

const KpiCard = ({
  title,
  value,
  growthPct,
  isPositive,
  comparisonLabel,
  icon,
  accentClass,
  sphereClass,
  sparklineColor,
  sparklineData,
  isAlert,
}) => {
  const chartConfig = getSparklineConfig(sparklineColor, sparklineData);

  return (
    <Card className={`crm-card-3d ${accentClass || "crm-accent-maroon"} mb-3`}>
      <CardBody className="p-3">
        <div className="d-flex align-items-start justify-content-between mb-2">
          <div>
            <p
              className="text-muted text-uppercase mb-1"
              style={{ fontSize: "0.725rem", fontWeight: 600, letterSpacing: "0.04em" }}
            >
              {title}
            </p>
            <h3
              className="fw-bold mb-0 crm-kpi-value"
              style={{ fontSize: "1.6rem", letterSpacing: "-0.03em" }}
            >
              {value}
            </h3>
          </div>
          <div className={`crm-icon-sphere-3d ${sphereClass || "crm-sphere-maroon"}`}>
            <i className={icon} />
          </div>
        </div>

        <div className="d-flex align-items-center justify-content-between mt-3 pt-1">
          <div className="d-flex align-items-center">
            {growthPct !== undefined && growthPct !== null ? (
              <span
                className="rounded-0 px-2 py-1 me-1 fw-semibold d-inline-block crm-kpi-badge-target"
                style={{
                  fontSize: "0.72rem",
                  backgroundColor: isPositive ? "#ecfdf5" : "#fef2f2",
                  color: isPositive ? "#059669" : "#dc2626",
                  border: isPositive ? "1px solid #a7f3d0" : "1px solid #fecaca",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                }}
              >
                <i className={isPositive ? "ri-arrow-up-s-fill" : "ri-arrow-down-s-fill"} />
                {Math.abs(Number(growthPct))}%
              </span>
            ) : isAlert ? (
              <span
                className="rounded-0 px-2 py-1 me-1 fw-semibold d-inline-block crm-kpi-badge-target"
                style={{
                  fontSize: "0.72rem",
                  backgroundColor: "#fffbeb",
                  color: "#d97706",
                  border: "1px solid #fde68a",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                }}
              >
                <i className="ri-alarm-warning-line me-1" />
                Action Required
              </span>
            ) : (
              <span
                className="rounded-0 px-2 py-1 me-1 fw-semibold d-inline-block crm-kpi-badge-target"
                style={{
                  fontSize: "0.72rem",
                  backgroundColor: "#f8fafc",
                  color: "#64748b",
                  border: "1px solid #e2e8f0",
                }}
              >
                Target Metric
              </span>
            )}
            <span className="text-muted" style={{ fontSize: "0.72rem" }}>
              {comparisonLabel || "vs Last Period"}
            </span>
          </div>

          <div style={{ width: "85px", height: "35px" }}>
            <ReactApexChart
              options={chartConfig.options}
              series={chartConfig.series}
              type="area"
              height={35}
              width={85}
            />
          </div>
        </div>
      </CardBody>
    </Card>
  );
};

const DashboardKpis = ({ kpis, meta }) => {
  if (!kpis) return null;
  const compLabel = meta?.comparison_label || "vs Last Period";

  return (
    <div>
      {/* Top 4 KPI Cards */}
      <Row className="g-3">
        <Col xl={3} lg={6} sm={6}>
          <KpiCard
            title="New Leads"
            value={formatNumber(kpis.new_leads?.value)}
            growthPct={kpis.new_leads?.growth_pct}
            isPositive={kpis.new_leads?.is_positive}
            comparisonLabel={compLabel}
            icon="ri-team-line"
            accentClass="crm-accent-maroon"
            sphereClass="crm-sphere-maroon"
            sparklineColor="#7f1d1d"
            sparklineData={kpis.new_leads?.sparkline}
          />
        </Col>

        <Col xl={3} lg={6} sm={6}>
          <KpiCard
            title="Open Opportunities"
            value={formatNumber(kpis.open_opportunities?.value)}
            growthPct={kpis.open_opportunities?.growth_pct}
            isPositive={kpis.open_opportunities?.is_positive}
            comparisonLabel={compLabel}
            icon="ri-pie-chart-2-line"
            accentClass="crm-accent-crimson"
            sphereClass="crm-sphere-crimson"
            sparklineColor="#b91c1c"
            sparklineData={kpis.open_opportunities?.sparkline}
          />
        </Col>

        <Col xl={3} lg={6} sm={6}>
          <KpiCard
            title="Today's Follow-ups"
            value={formatNumber(kpis.today_followups?.value)}
            growthPct={undefined}
            isAlert={kpis.today_followups?.is_urgent}
            comparisonLabel="Scheduled for today"
            icon="ri-calendar-check-line"
            accentClass="crm-accent-amber"
            sphereClass="crm-sphere-amber"
            sparklineColor="#d97706"
            sparklineData={kpis.today_followups?.sparkline}
          />
        </Col>

        <Col xl={3} lg={6} sm={6}>
          <KpiCard
            title="Overdue Follow-ups"
            value={formatNumber(kpis.overdue_followups?.value)}
            growthPct={undefined}
            isAlert={kpis.overdue_followups?.is_alert}
            comparisonLabel="Requires attention"
            icon="ri-alarm-warning-line"
            accentClass="crm-accent-red"
            sphereClass="crm-sphere-red"
            sparklineColor="#dc2626"
            sparklineData={kpis.overdue_followups?.sparkline}
          />
        </Col>
      </Row>

      {/* Bottom 4 KPI Cards */}
      <Row className="g-3">
        <Col xl={3} lg={6} sm={6}>
          <KpiCard
            title="Expected Revenue"
            value={formatCurrency(kpis.expected_revenue?.value)}
            growthPct={kpis.expected_revenue?.growth_pct}
            isPositive={kpis.expected_revenue?.is_positive}
            comparisonLabel={compLabel}
            icon="ri-money-dollar-circle-line"
            accentClass="crm-accent-emerald"
            sphereClass="crm-sphere-emerald"
            sparklineColor="#059669"
            sparklineData={kpis.expected_revenue?.sparkline}
          />
        </Col>

        <Col xl={3} lg={6} sm={6}>
          <KpiCard
            title="Closed Revenue"
            value={formatCurrency(kpis.closed_revenue?.value)}
            growthPct={kpis.closed_revenue?.growth_pct}
            isPositive={kpis.closed_revenue?.is_positive}
            comparisonLabel={compLabel}
            icon="ri-hand-coin-line"
            accentClass="crm-accent-teal"
            sphereClass="crm-sphere-teal"
            sparklineColor="#047857"
            sparklineData={kpis.closed_revenue?.sparkline}
          />
        </Col>

        <Col xl={3} lg={6} sm={6}>
          <KpiCard
            title="Conversion Rate"
            value={`${Number(kpis.conversion_rate?.value || 0).toFixed(1)}%`}
            growthPct={undefined}
            comparisonLabel={`${kpis.conversion_rate?.won_count || 0} won deals`}
            icon="ri-focus-3-line"
            accentClass="crm-accent-orange"
            sphereClass="crm-sphere-orange"
            sparklineColor="#ea580c"
            sparklineData={kpis.conversion_rate?.sparkline}
          />
        </Col>

        <Col xl={3} lg={6} sm={6}>
          <KpiCard
            title="Avg Deal Size"
            value={formatCurrency(kpis.avg_deal_size?.value)}
            growthPct={undefined}
            comparisonLabel="Average deal value"
            icon="ri-price-tag-3-line"
            accentClass="crm-accent-slate"
            sphereClass="crm-sphere-slate"
            sparklineColor="#475569"
            sparklineData={kpis.avg_deal_size?.sparkline}
          />
        </Col>
      </Row>
    </div>
  );
};

export default DashboardKpis;
