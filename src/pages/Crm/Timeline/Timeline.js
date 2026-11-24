import React, { useEffect, useState, useCallback } from "react";
import { useSelector } from "react-redux";
import {
  Container,
  Row,
  Col,
  Card,
  CardBody,
  Button,
  Input,
  Spinner,
} from "reactstrap";
import { useSearchParams, useNavigate } from "react-router-dom";
import { getCustomerDropdown, getCustomerById } from "../../../helpers/crmCustomerApi";
import CommunicationTimelineTab from "../Customers/CommunicationTimelineTab";

const THEME = {
  primary: "#7f1d1d",
  primaryHover: "#991b1b",
  lightBg: "#fef2f2",
  borderTint: "#fee2e2",
  textDark: "#0f172a",
  textMuted: "#64748b",
  cardBorder: "#e2e8f0",
};

const getInitials = (name) => {
  if (!name) return "CU";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const SoftOnCloudTimeline = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialCustomerId = (() => {
    const raw = searchParams.get("customerId");
    return raw && raw !== "undefined" && raw !== "null" && !isNaN(Number(raw)) ? raw : "";
  })();

  const [customerOptions, setCustomerOptions] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(initialCustomerId);
  const [customer, setCustomer] = useState(null);
  const [loadingCustomer, setLoadingCustomer] = useState(false);
  const [activeTab, setActiveTab] = useState("timeline");
  const [bannerLogType, setBannerLogType] = useState(null);

  document.title = "Communication Timeline | SoftOnCloud CRM";

  // Redux Dark Mode detection
  const { layoutModeType } = useSelector((state) => ({
    layoutModeType: state.Layout.layoutModeType,
  }));
  const isDark =
    layoutModeType === "dark" ||
    (typeof document !== "undefined" &&
      (document.documentElement.getAttribute("data-bs-theme") === "dark" ||
        document.documentElement.getAttribute("data-layout-mode") === "dark"));

  const primaryColor = isDark ? "#fca5a5" : THEME.primary;
  const cardBg = isDark ? "#121212" : "#ffffff";
  const cardBorder = isDark ? "#262626" : THEME.cardBorder;
  const subtleBg = isDark ? "#161b22" : "#f8fafc";
  const subtleBorder = isDark ? "#2d3748" : "#cbd5e1";
  const textTitle = isDark ? "#f1f5f9" : THEME.textDark;
  const textSub = isDark ? "#94a3b8" : THEME.textMuted;

  // Load Customers for Dropdown Picker
  useEffect(() => {
    getCustomerDropdown({ limit: 100 })
      .then((res) => {
        const list = Array.isArray(res)
          ? res
          : res?.items || res?.customers || res?.data || [];
        setCustomerOptions(list);

        // If no customer selected yet or invalid, default to first customer for this tenant
        if (list.length > 0) {
          const defaultCust = list[0];
          const rawId = defaultCust ? (defaultCust.accountId ?? defaultCust.account_id ?? defaultCust.id) : null;
          if (rawId != null && (!selectedCustomerId || selectedCustomerId === "undefined" || isNaN(Number(selectedCustomerId)))) {
            const defId = String(rawId);
            setSelectedCustomerId(defId);
            setSearchParams({ customerId: defId }, { replace: true });
          }
        }
      })
      .catch((err) => console.error("Failed to load customer list:", err));
  }, []); // eslint-disable-line

  // Load Selected Customer Details
  const loadCustomerDetails = useCallback(async (id) => {
    if (!id || id === "undefined" || id === "null" || isNaN(Number(id))) {
      setCustomer(null);
      return;
    }
    setLoadingCustomer(true);
    try {
      const data = await getCustomerById(id);
      setCustomer(data);
    } catch (err) {
      console.error("Failed to fetch customer profile:", err);
    } finally {
      setLoadingCustomer(false);
    }
  }, []);

  useEffect(() => {
    if (selectedCustomerId && selectedCustomerId !== "undefined" && !isNaN(Number(selectedCustomerId))) {
      loadCustomerDetails(selectedCustomerId);
    }
  }, [selectedCustomerId, loadCustomerDetails]);

  // Handle changing selected customer
  const handleCustomerChange = (newId) => {
    if (!newId || newId === "undefined") return;
    setSelectedCustomerId(newId);
    setSearchParams({ customerId: newId }, { replace: true });
  };

  return (
    <div className="page-content" style={{ minHeight: "100vh" }}>
      <Container fluid className="px-4">
        {/* ======================================================== */}
        {/* Top Header Breadcrumb & Customer Selector                */}
        {/* ======================================================== */}
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3 pt-2">
          <div>
            <h4 className="fw-bold mb-0 fs-20" style={{ color: textTitle }}>Communication Timeline</h4>
            <div className="fs-12 mt-1" style={{ color: textSub }}>
              All interactions and touchpoints in chronological order
            </div>
          </div>

          {/* Customer Selector Dropdown */}
          <div className="d-flex align-items-center gap-2">
            <span className="fs-13 fw-semibold" style={{ color: textSub }}>Customer:</span>
            <div style={{ minWidth: "260px" }}>
              <Input
                type="select"
                bsSize="sm"
                value={selectedCustomerId}
                onChange={(e) => handleCustomerChange(e.target.value)}
                style={{
                  borderRadius: 0,
                  borderColor: subtleBorder,
                  backgroundColor: isDark ? "#1a1d21" : "#ffffff",
                  color: textTitle,
                  fontWeight: 600,
                  height: "34px",
                }}
              >
                {customerOptions.map((c) => {
                  const cId = String(c.accountId ?? c.account_id ?? c.id);
                  const cName = c.displayName || c.display_name || c.companyName || c.company_name || `Customer #${cId}`;
                  return (
                    <option key={cId} value={cId}>
                      {cName}
                    </option>
                  );
                })}
              </Input>
            </div>

            {customer && (
              <Button
                color="light"
                size="sm"
                className="border fw-semibold"
                onClick={() => navigate(`/crm/customers/${customer.accountId}`)}
                style={{
                  borderRadius: 0,
                  height: "34px",
                  backgroundColor: subtleBg,
                  borderColor: subtleBorder,
                  color: textTitle,
                }}
              >
                <i className="ri-external-link-line me-1" /> View Full Account
              </Button>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* Hero Customer Profile Banner (Matching Mockup)           */}
        {/* ======================================================== */}
        {customer && (
          <Card
            className="border shadow-none mb-3"
            style={{ borderRadius: 0, backgroundColor: cardBg, borderColor: cardBorder }}
          >
            <CardBody className="p-3">
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
                <div className="d-flex align-items-center gap-3">
                  <Button
                    color="light"
                    size="sm"
                    className="border fw-semibold px-2 d-inline-flex align-items-center justify-content-center"
                    onClick={() => navigate("/crm/customers")}
                    title="Back to Customers"
                    style={{
                      borderRadius: 0,
                      borderColor: subtleBorder,
                      backgroundColor: subtleBg,
                      color: textTitle,
                      width: "36px",
                      height: "36px",
                    }}
                  >
                    <i className="ri-arrow-left-s-line fs-18" />
                  </Button>

                  <div
                    className="d-flex align-items-center justify-content-center fw-bold fs-18 text-white flex-shrink-0"
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: 0,
                      backgroundColor: THEME.primary,
                    }}
                  >
                    {getInitials(customer.displayName || customer.companyName)}
                  </div>

                  <div>
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      <h5 className="fw-bold mb-0 fs-16" style={{ color: textTitle }}>
                        {customer.displayName || customer.companyName}
                      </h5>
                      <span
                        className="badge px-2 py-1 fs-11"
                        style={{
                          borderRadius: 0,
                          backgroundColor: subtleBg,
                          color: textSub,
                          border: `1px solid ${subtleBorder}`,
                        }}
                      >
                        Customer
                      </span>
                    </div>
                    <div className="fs-12 mt-1" style={{ color: textSub }}>
                      {[
                        customer.placeOfSupply,
                        customer.customerSince
                          ? `Customer Since : ${new Date(customer.customerSince).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}`
                          : customer.createdAt
                            ? `Customer Since : ${new Date(customer.createdAt).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}`
                            : null,
                      ]
                        .filter(Boolean)
                        .join(" • ") || "Customer Account"}
                    </div>
                  </div>
                </div>

                {/* Quick Contact & Action Buttons */}
                <div className="d-flex align-items-center gap-2">
                  <Button
                    color="light"
                    size="sm"
                    className="border px-2 d-inline-flex align-items-center justify-content-center"
                    onClick={() => {
                      setBannerLogType(null);
                      setTimeout(() => setBannerLogType("CALL"), 10);
                    }}
                    title="Log Call"
                    style={{
                      borderRadius: 0,
                      borderColor: subtleBorder,
                      backgroundColor: subtleBg,
                      color: textTitle,
                      width: "34px",
                      height: "34px",
                    }}
                  >
                    <i className="ri-phone-line text-success fs-15" />
                  </Button>

                  <Button
                    color="light"
                    size="sm"
                    className="border px-2 d-inline-flex align-items-center justify-content-center"
                    onClick={() => {
                      setBannerLogType(null);
                      setTimeout(() => setBannerLogType("EMAIL"), 10);
                    }}
                    title="Log Email"
                    style={{
                      borderRadius: 0,
                      borderColor: subtleBorder,
                      backgroundColor: subtleBg,
                      color: textTitle,
                      width: "34px",
                      height: "34px",
                    }}
                  >
                    <i className="ri-mail-line fs-15" style={{ color: primaryColor }} />
                  </Button>

                  <Button
                    color="light"
                    size="sm"
                    className="border px-2 d-inline-flex align-items-center justify-content-center"
                    onClick={() => {
                      setBannerLogType(null);
                      setTimeout(() => setBannerLogType("MEETING"), 10);
                    }}
                    title="Log Meeting"
                    style={{
                      borderRadius: 0,
                      borderColor: subtleBorder,
                      backgroundColor: subtleBg,
                      color: textTitle,
                      width: "34px",
                      height: "34px",
                    }}
                  >
                    <i className="ri-calendar-event-line fs-15" style={{ color: "#a855f7" }} />
                  </Button>

                  <Button
                    size="sm"
                    className="text-white fw-semibold px-3 d-inline-flex align-items-center gap-1"
                    onClick={() => {
                      setBannerLogType(null);
                      setTimeout(() => setBannerLogType("CALL"), 10);
                    }}
                    style={{
                      backgroundColor: THEME.primary,
                      borderColor: THEME.primary,
                      borderRadius: 0,
                      height: "34px",
                    }}
                  >
                    <i className="ri-add-line fs-14 me-1" /> Log Activity
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        )}

        {/* ======================================================== */}
        {/* Navigation Tabs Matching Mockup                          */}
        {/* ======================================================== */}
        <div
          className="border-bottom mb-4 d-flex align-items-center justify-content-between flex-wrap gap-2"
          style={{ borderColor: cardBorder }}
        >
          <div className="d-flex align-items-center gap-4 overflow-auto py-1">
            {[
              { id: "overview", label: "Overview", link: customer ? `/crm/customers/${customer.accountId}` : null },
              { id: "opportunities", label: "Opportunities", link: customer ? `/crm/customers/${customer.accountId}?tab=opportunities` : null },
              { id: "contacts", label: "Contacts", link: customer ? `/crm/customers/${customer.accountId}?tab=contacts` : null },
              { id: "activities", label: "Activities", link: customer ? `/crm/customers/${customer.accountId}?tab=activities` : null },
              { id: "timeline", label: "Communication Timeline" },
              { id: "documents", label: "Documents", link: "/crm/documents" },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    if (tab.link) {
                      navigate(tab.link);
                    } else {
                      setActiveTab(tab.id);
                    }
                  }}
                  className="btn btn-link p-0 text-decoration-none position-relative pb-2"
                  style={{
                    color: isActive ? primaryColor : textSub,
                    fontWeight: isActive ? 600 : 500,
                    fontSize: "14px",
                    borderBottom: isActive ? `2.5px solid ${primaryColor}` : "2.5px solid transparent",
                    borderRadius: 0,
                    transition: "all 0.15s ease",
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ======================================================== */}
        {/* Main Communication Timeline Feed Component               */}
        {/* ======================================================== */}
        {loadingCustomer ? (
          <div className="text-center py-5 border" style={{ borderRadius: 0, backgroundColor: cardBg, borderColor: cardBorder }}>
            <Spinner size="sm" style={{ color: primaryColor }} />
            <div className="fs-13 mt-2" style={{ color: textSub }}>Loading customer touchpoints...</div>
          </div>
        ) : selectedCustomerId && selectedCustomerId !== "undefined" && !isNaN(Number(selectedCustomerId)) ? (
          <CommunicationTimelineTab
            accountId={selectedCustomerId}
            customer={customer}
            onEditCustomer={() => navigate(`/crm/customers/${selectedCustomerId}`)}
            initialLogType={bannerLogType}
          />
        ) : (
          <div className="text-center py-5 border" style={{ borderRadius: 0, backgroundColor: cardBg, borderColor: cardBorder }}>
            <i className="ri-history-line fs-32 mb-2 d-block" style={{ color: textSub }} />
            <h6 className="fw-bold" style={{ color: textTitle }}>Select a Customer</h6>
            <p className="fs-13" style={{ color: textSub }}>Choose an account above to view its unified communication timeline.</p>
          </div>
        )}
      </Container>
    </div>
  );
};

export default SoftOnCloudTimeline;

