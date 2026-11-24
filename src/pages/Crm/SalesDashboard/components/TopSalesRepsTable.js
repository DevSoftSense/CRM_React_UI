import React, { useState } from "react";
import { Card, CardBody, CardHeader } from "reactstrap";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";

const formatInr = (val) => {
  const num = Number(val) || 0;
  return "₹ " + num.toLocaleString("en-IN");
};

const TopSalesRepsTable = ({ reps = [] }) => {
  const layoutModeType = useSelector((state) => state.Layout?.layoutModeType);
  const isDark =
    layoutModeType === "dark" ||
    (typeof document !== "undefined" &&
      (document.documentElement.getAttribute("data-bs-theme") === "dark" ||
        document.documentElement.getAttribute("data-layout-mode") === "dark"));

  const [sortMode, setSortMode] = useState("revenue");

  // Read strictly incoming database reps and apply selected sort order
  const repList = React.useMemo(() => {
    const arr = Array.isArray(reps) ? [...reps] : [];
    arr.sort((a, b) => {
      if (sortMode === "deals") {
        return (Number(b.deals_won) || 0) - (Number(a.deals_won) || 0);
      }
      if (sortMode === "rate") {
        return (Number(b.win_rate) || 0) - (Number(a.win_rate) || 0);
      }
      return (Number(b.won_revenue) || 0) - (Number(a.won_revenue) || 0);
    });
    return arr;
  }, [reps, sortMode]);

  const maxRevenue = Math.max(...repList.map((r) => Number(r.won_revenue) || 0), 1);

  return (
    <Card
      className="border shadow-none h-100 mb-0"
      style={{
        borderRadius: 0,
        borderColor: isDark ? "#21262d" : "#e2e8f0",
        backgroundColor: isDark ? "#161b22" : "#ffffff",
      }}
    >
      {/* Top Header: Title + Sort Filter Dropdown */}
      <CardHeader className="bg-transparent border-0 pt-3 pb-1 px-3 d-flex align-items-center justify-content-between">
        <h6
          className="fw-bold fs-14 mb-0"
          style={{ color: isDark ? "#f8fafc" : "#0f172a" }}
        >
          Top Sales Reps
        </h6>
        <div style={{ width: 125 }}>
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value)}
            className="form-select form-select-sm border shadow-none"
            style={{
              borderRadius: 0,
              fontSize: "11px",
              fontWeight: 500,
              padding: "4px 8px",
              cursor: "pointer",
              backgroundColor: isDark ? "#1a1a1a" : "#ffffff",
              color: isDark ? "#cbd5e1" : "#334155",
              borderColor: isDark ? "#262626" : "#e2e8f0",
            }}
          >
            <option value="revenue">By Won Revenue</option>
            <option value="deals">By Deals Won</option>
            <option value="rate">By Win Rate</option>
          </select>
        </div>
      </CardHeader>

      <CardBody className="p-0 d-flex flex-column justify-content-between">
        {repList.length === 0 ? (
          <div className="d-flex flex-column align-items-center justify-content-center text-muted my-auto py-5">
            <i className="ri-team-line fs-32 text-muted mb-2" />
            <span className="fs-13">No sales rep performance data recorded for this period.</span>
          </div>
        ) : (
          <div className="d-flex flex-column my-auto py-1">
            {repList.map((r, idx) => {
              const isLast = idx === repList.length - 1;
              const repName = r.sales_rep || r.name || "Unassigned";
              const wonRev = Number(r.won_revenue) || 0;
              const dealsWon = Number(r.deals_won) || 0;
              const winRate = Number(r.win_rate) || 0;
              const sharePct = wonRev > 0 ? Math.max(4, Math.min(100, Math.round((wonRev / maxRevenue) * 100))) : 0;

              return (
                <div
                  key={r.employee_id || idx}
                  className="d-flex align-items-center justify-content-between px-3 py-3"
                  style={{
                    borderBottom: isLast
                      ? "none"
                      : `1px solid ${isDark ? "#262626" : "#f1f5f9"}`,
                    transition: "background-color 0.15s ease",
                  }}
                >
                  {/* Left: Rep Name & Deals Won */}
                  <div style={{ width: "36%", minWidth: "95px" }}>
                    <span
                      className="fw-semibold fs-13 d-block text-truncate"
                      style={{ color: isDark ? "#f8fafc" : "#1e293b" }}
                      title={repName}
                    >
                      {repName}
                    </span>
                    <span className="fs-11 text-muted d-block">
                      {dealsWon} {dealsWon === 1 ? "deal" : "deals"} won
                    </span>
                  </div>

                  {/* Center: Won Revenue */}
                  <div style={{ width: "34%", minWidth: "95px" }}>
                    <span
                      className="fw-bold fs-14 text-nowrap d-block"
                      style={{ color: isDark ? "#f8fafc" : "#0f172a" }}
                    >
                      {formatInr(wonRev)}
                    </span>
                    <div
                      className="mt-1"
                      style={{
                        width: "100%",
                        maxWidth: "90px",
                        height: "4px",
                        backgroundColor: isDark ? "#262626" : "#f1f5f9",
                      }}
                    >
                      <div
                        style={{
                          width: `${sharePct}%`,
                          height: "100%",
                          backgroundColor: wonRev > 0 ? "#991b1b" : "transparent",
                          transition: "width 0.3s ease",
                        }}
                      />
                    </div>
                  </div>

                  {/* Right: Win Rate Badge */}
                  <div
                    className="d-flex align-items-center justify-content-end"
                    style={{ width: "30%", minWidth: "75px" }}
                  >
                    <span
                      className="badge rounded-0 fw-semibold fs-11 px-2 py-1"
                      style={{
                        backgroundColor:
                          winRate >= 50
                            ? isDark ? "rgba(16, 185, 129, 0.2)" : "#d1fae5"
                            : isDark ? "#262626" : "#f1f5f9",
                        color:
                          winRate >= 50
                            ? isDark ? "#34d399" : "#047857"
                            : isDark ? "#cbd5e1" : "#475569",
                      }}
                    >
                      {winRate.toFixed(1)}% Win
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Link: View All Sales Reps → */}
        <div className="px-3 py-2 border-top text-end">
          <Link
            to="/crm/owners"
            className="fs-12 fw-semibold text-decoration-none d-inline-flex align-items-center gap-1"
            style={{ color: "#7f1d1d" }}
          >
            <span>View All Sales Reps</span>
            <i className="ri-arrow-right-line" />
          </Link>
        </div>
      </CardBody>
    </Card>
  );
};

export default TopSalesRepsTable;
