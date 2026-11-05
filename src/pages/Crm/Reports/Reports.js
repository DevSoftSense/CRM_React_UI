import React, { useState, useEffect, useCallback } from "react";
import { Container, Spinner, Alert } from "reactstrap";
import { useSearchParams } from "react-router-dom";
import BreadCrumb from "../../../Components/Common/BreadCrumb";
import { getReportCatalog } from "../../../helpers/crmReportApi";
import { getOwnerDropdown } from "../../../helpers/crmOwnerApi";

import ReportCatalogView from "./components/ReportCatalogView";
import ReportWorkspaceView from "./components/ReportWorkspaceView";

const Reports = () => {
  document.title = "Reports & Analytics | SoftOnCloud CRM";

  const [searchParams, setSearchParams] = useSearchParams();
  const reportCodeParam = searchParams.get("code");

  const [categories, setCategories] = useState([]);
  const [reports, setReports] = useState([]);
  const [owners, setOwners] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1. Load Catalog & Owners
  const loadCatalogAndOwners = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch catalog and owners in parallel
      const [catalogRes, ownersRes] = await Promise.allSettled([
        getReportCatalog(),
        getOwnerDropdown({ limit: 100 }),
      ]);

      if (catalogRes.status === "fulfilled") {
        const catData = catalogRes.value?.data || catalogRes.value || {};
        const cats = Array.isArray(catData.categories) ? catData.categories : [];
        const reps = Array.isArray(catData.reports) ? catData.reports : [];
        setCategories(cats);
        setReports(reps);

        // Auto-select report if ?code= is present in URL
        if (reportCodeParam) {
          const match = reps.find(
            (r) => r.code?.toUpperCase() === reportCodeParam.toUpperCase()
          );
          if (match) setSelectedReport(match);
        }
      } else {
        console.error("Failed to fetch report catalog:", catalogRes.reason);
        setError("Failed to load reports catalog. Please check your network or try again.");
      }

      if (ownersRes.status === "fulfilled") {
        const ownData = ownersRes.value?.data || ownersRes.value || [];
        setOwners(Array.isArray(ownData) ? ownData : []);
      }
    } catch (err) {
      console.error("Error initializing Reports hub:", err);
      setError("An unexpected error occurred while loading reports.");
    } finally {
      setLoading(false);
    }
  }, [reportCodeParam]);

  useEffect(() => {
    loadCatalogAndOwners();
  }, [loadCatalogAndOwners]);

  // Handle report selection
  const handleSelectReport = (report) => {
    setSelectedReport(report);
    if (report?.code) {
      setSearchParams({ code: report.code });
    }
  };

  // Handle return to catalog view
  const handleBackToCatalog = () => {
    setSelectedReport(null);
    setSearchParams({});
  };

  return (
    <div className="page-content">
      <Container fluid>
        <BreadCrumb
          title={
            selectedReport
              ? selectedReport.name
              : "Reports & Analytics Hub"
          }
          pageTitle="CRM"
        />

        {error && (
          <Alert color="danger" className="mb-4" style={{ borderRadius: "8px" }}>
            <div className="d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-2">
                <i className="ri-error-warning-line fs-18"></i>
                <span>{error}</span>
              </div>
              <button
                className="btn btn-sm btn-outline-danger"
                onClick={loadCatalogAndOwners}
                style={{ borderRadius: "6px" }}
              >
                Retry
              </button>
            </div>
          </Alert>
        )}

        {loading ? (
          <div className="text-center py-5">
            <Spinner style={{ color: "#7f1d1d" }} />
            <p className="text-muted mt-2 small">
              Loading CRM analytics catalog and metadata...
            </p>
          </div>
        ) : selectedReport ? (
          <ReportWorkspaceView
            report={selectedReport}
            owners={owners}
            onBackToCatalog={handleBackToCatalog}
          />
        ) : (
          <ReportCatalogView
            categories={categories}
            reports={reports}
            onSelectReport={handleSelectReport}
          />
        )}
      </Container>
    </div>
  );
};

export default Reports;

