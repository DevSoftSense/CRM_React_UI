import React, { useState, useEffect, useCallback } from "react";
import { Container, Row, Col, Spinner, Alert } from "reactstrap";
import BreadCrumb from "../../../Components/Common/BreadCrumb";
import {
  getSalesDashboard,
  getSalesDashboardLookups,
} from "../../../helpers/crmSalesDashboardApi";

// Subcomponents
import SalesDashboardHeader from "./components/SalesDashboardHeader";
import SalesKpiCards from "./components/SalesKpiCards";
import RevenueTrendChart from "./components/RevenueTrendChart";
import DealsByStageFunnel from "./components/DealsByStageFunnel";
import RevenueBySourceDonut from "./components/RevenueBySourceDonut";
import TopSalesRepsTable from "./components/TopSalesRepsTable";
import ActivitiesOverviewCard from "./components/ActivitiesOverviewCard";
import ForecastVsTargetGauge from "./components/ForecastVsTargetGauge";
import RecentWonDealsTable from "./components/RecentWonDealsTable";
import UpcomingFollowupsTable from "./components/UpcomingFollowupsTable";

const SalesDashboard = () => {
  document.title = "Sales Dashboard | SoftOnCloud CRM";

  const [period, setPeriod] = useState("this_month");
  const [selectedOwner, setSelectedOwner] = useState("");
  const [owners, setOwners] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1. Load Lookups (Owners & Periods)
  useEffect(() => {
    let isMounted = true;
    getSalesDashboardLookups()
      .then((res) => {
        if (!isMounted) return;
        const data = res?.data || res || {};
        if (Array.isArray(data.owners)) setOwners(data.owners);
      })
      .catch((err) => {
        console.warn("Failed to load sales dashboard lookups:", err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Load Sales Dashboard Data
  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getSalesDashboard({
        period,
        ownerId: selectedOwner || undefined,
      });
      const data = res?.data || res || {};
      setDashboardData(data);
    } catch (err) {
      console.error("Failed to load Sales Dashboard data:", err);
      setError(err?.response?.data?.message || err?.message || "Failed to load Sales Dashboard.");
    } finally {
      setLoading(false);
    }
  }, [period, selectedOwner]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const kpis = dashboardData?.kpis || {};
  const meta = dashboardData?.meta || {};

  return (
    <div className="page-content" style={{ minHeight: "100vh" }}>
      <Container fluid className="px-4">
        <BreadCrumb title="Sales Dashboard" pageTitle="CRM" />

        {/* Global Error Banner */}
        {error && (
          <Alert color="danger" className="py-2 mb-3" style={{ borderRadius: 0 }}>
            {error}
          </Alert>
        )}

        {/* Header with Filters */}
        <SalesDashboardHeader
          period={period}
          onPeriodChange={setPeriod}
          owners={owners}
          selectedOwner={selectedOwner}
          onOwnerChange={setSelectedOwner}
          onRefresh={loadDashboard}
          loading={loading}
          comparisonLabel={meta.comparison_label || "vs previous period"}
          startDate={meta.start_date}
          endDate={meta.end_date}
        />

        {/* Loading Spinner Overlay when switching filters */}
        {loading && !dashboardData ? (
          <div className="text-center py-5 border bg-white" style={{ borderRadius: 0 }}>
            <Spinner color="primary" />
            <div className="mt-2 text-muted fs-13">Loading Sales Performance Analytics…</div>
          </div>
        ) : (
          <>
            {/* Top 6 KPI Metric Cards */}
            <SalesKpiCards
              kpis={kpis}
              comparisonLabel={meta.comparison_label || "vs previous period"}
            />

            {/* Middle Row: Revenue Trend (Bar+Line) | Deals by Stage (Funnel) | Revenue by Source (Donut) */}
            <Row className="g-3 mb-4">
              <Col xl={4} md={6}>
                <RevenueTrendChart data={dashboardData?.revenue_trend} />
              </Col>
              <Col xl={4} md={6}>
                <DealsByStageFunnel data={dashboardData?.deals_by_stage} />
              </Col>
              <Col xl={4} md={12}>
                <RevenueBySourceDonut data={dashboardData?.revenue_by_source} />
              </Col>
            </Row>

            {/* Performance Row: Top Sales Reps | Activities Overview | Forecast vs Target */}
            <Row className="g-3 mb-4">
              <Col xl={4} md={6}>
                <TopSalesRepsTable reps={dashboardData?.top_sales_reps} />
              </Col>
              <Col xl={4} md={6}>
                <ActivitiesOverviewCard activities={dashboardData?.activities_overview} />
              </Col>
              <Col xl={4} md={12}>
                <ForecastVsTargetGauge forecast={dashboardData?.forecast_vs_target} />
              </Col>
            </Row>

            {/* Bottom Row: Recent Won Deals Table | Upcoming Follow-ups Table */}
            <Row className="g-3 mb-4">
              <Col xl={6} lg={6}>
                <RecentWonDealsTable deals={dashboardData?.recent_won_deals} />
              </Col>
              <Col xl={6} lg={6}>
                <UpcomingFollowupsTable followups={dashboardData?.upcoming_followups} />
              </Col>
            </Row>
          </>
        )}
      </Container>
    </div>
  );
};

export default SalesDashboard;

