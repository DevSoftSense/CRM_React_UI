import React, { useState, useEffect, useCallback } from "react";
import { Container, Row, Col, Spinner, Alert } from "reactstrap";
import { getDashboard, getDashboardLookups } from "../../helpers/crmDashboardApi";
import { resolveAuthDisplay } from "../../helpers/authSession";
import DashboardHeader from "./components/DashboardHeader";
import DashboardKpis from "./components/DashboardKpis";
import SalesFunnelChart from "./components/SalesFunnelChart";
import PipelineValueChart from "./components/PipelineValueChart";
import LeadSourcesChart from "./components/LeadSourcesChart";
import RevenueTrendChart from "./components/RevenueTrendChart";
import TodaysScheduleCard from "./components/TodaysScheduleCard";
import PendingFollowupsCard from "./components/PendingFollowupsCard";
import HotOpportunitiesCard from "./components/HotOpportunitiesCard";
import RecentActivitiesCard from "./components/RecentActivitiesCard";
import TeamPerformanceCard from "./components/TeamPerformanceCard";
import AiInsightsCard from "./components/AiInsightsCard";
import NotificationsCard from "./components/NotificationsCard";
import QuickActionsCard from "./components/QuickActionsCard";
import "./dashboard.css";

const DashboardCrm = () => {
  document.title = "CRM Dashboard | SoftOnCloud CRM";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [lookups, setLookups] = useState({ owners: [], periods: [] });
  const [filters, setFilters] = useState({
    period: "this_month",
    ownerId: null,
    dateFrom: null,
    dateTo: null,
  });

  const authUser = resolveAuthDisplay();
  const userName = authUser?.name || "User";

  // Load Lookups on Mount
  useEffect(() => {
    let isMounted = true;
    getDashboardLookups()
      .then((res) => {
        if (isMounted && res) {
          setLookups(res);
        }
      })
      .catch((err) => {
        console.warn("Failed to load dashboard lookups:", err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Load Dashboard Data whenever filters change
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getDashboard({
        period: filters.period,
        ownerId: filters.ownerId,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
      });
      setData(res);
    } catch (err) {
      console.error("Failed to load dashboard:", err);
      setError(err?.message || "Failed to load CRM dashboard data.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "period" && value !== "custom") {
        next.dateFrom = null;
        next.dateTo = null;
      }
      return next;
    });
  };

  return (
    <div className="page-content" style={{ backgroundColor: "#f8fafc", minHeight: "100vh" }}>
      <Container fluid className="crm-dashboard-wrapper">
        {/* Header & Filter Controls */}
        <DashboardHeader
          meta={data?.meta}
          lookups={lookups}
          filters={filters}
          onFilterChange={handleFilterChange}
          userName={userName}
        />

        {error && (
          <Alert color="danger" className="rounded-0 mb-3">
            <i className="ri-error-warning-line me-2" />
            {error}
          </Alert>
        )}

        {loading && !data ? (
          <div className="text-center py-5">
            <Spinner style={{ color: "#7f1d1d", width: "3rem", height: "3rem" }} />
            <p className="text-muted mt-2">Loading live CRM metrics...</p>
          </div>
        ) : (
          <React.Fragment>
            {/* Row 1: 8 Live KPI Metric Cards */}
            <div className="crm-kpis-row">
              <DashboardKpis kpis={data?.kpis} meta={data?.meta} />
            </div>

            {/* Row 2: 4 Main Visual Charts */}
            <Row className="g-3 mb-3 crm-charts-row">
              <Col xl={3} lg={6} md={12}>
                <SalesFunnelChart data={data?.sales_funnel || data?.salesFunnel} />
              </Col>
              <Col xl={3} lg={6} md={12}>
                <PipelineValueChart data={data?.pipeline_value || data?.pipelineValue} />
              </Col>
              <Col xl={3} lg={6} md={12}>
                <LeadSourcesChart data={data?.lead_sources || data?.leadSources} />
              </Col>
              <Col xl={3} lg={6} md={12}>
                <RevenueTrendChart data={data?.revenue_trend || data?.revenueTrend} />
              </Col>
            </Row>

            {/* Row 3: 4 Data Tables / Feeds */}
            <Row className="g-3 mb-3 crm-tables-row">
              <Col xl={3} lg={6} md={12}>
                <TodaysScheduleCard activities={data?.todays_schedule || data?.todaysSchedule || []} />
              </Col>
              <Col xl={3} lg={6} md={12}>
                <PendingFollowupsCard tasks={data?.pending_followups || data?.pendingFollowups || []} />
              </Col>
              <Col xl={3} lg={6} md={12}>
                <HotOpportunitiesCard opportunities={data?.hot_opportunities || data?.hotOpportunities || []} />
              </Col>
              <Col xl={3} lg={6} md={12}>
                <RecentActivitiesCard activities={data?.recent_activities || data?.recentActivities || []} />
              </Col>
            </Row>

            {/* Row 4: 4 Specialized Cards */}
            <Row className="g-3 mb-4 crm-cards-row">
              <Col xl={3} lg={6} md={12}>
                <TeamPerformanceCard reps={data?.team_performance || data?.teamPerformance || []} />
              </Col>
              <Col xl={3} lg={6} md={12}>
                <AiInsightsCard insights={data?.ai_insights || data?.aiInsights || []} />
              </Col>
              <Col xl={3} lg={6} md={12}>
                <NotificationsCard notifications={data?.notifications || data?.notifications || {}} />
              </Col>
              <Col xl={3} lg={6} md={12}>
                <QuickActionsCard actions={data?.quick_actions || data?.quickActions || []} />
              </Col>
            </Row>
          </React.Fragment>
        )}
      </Container>
    </div>
  );
};

export default DashboardCrm;
