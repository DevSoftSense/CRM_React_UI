import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  Col,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownToggle,
  Form,
  FormGroup,
  Input,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Row,
  Spinner,
} from "reactstrap";
import {
  getTimeline,
  getTimelineStats,
  getTimelineSummary,
  getTimelineLookups,
  logTimelineActivity,
} from "../../../helpers/crmTimelineApi";
import { toastApiError, toastSuccess } from "../../../helpers/crmToast";

const THEME = {
  primary: "#7f1d1d",
  primaryHover: "#991b1b",
  lightBg: "#fef2f2",
  borderTint: "#fee2e2",
  textDark: "#0f172a",
  textMuted: "#64748b",
  cardBorder: "#e2e8f0",
};

// Type style mappings for Timeline Cards
const TYPE_CONFIG = {
  CALL: {
    label: "Call",
    icon: "ri-phone-fill",
    color: "#059669",
    bgColor: "#ecfdf5",
    borderColor: "#a7f3d0",
  },
  EMAIL: {
    label: "Email",
    icon: "ri-mail-fill",
    color: "#2563eb",
    bgColor: "#eff6ff",
    borderColor: "#bfdbfe",
  },
  MEETING: {
    label: "Meeting",
    icon: "ri-calendar-event-fill",
    color: "#7c3aed",
    bgColor: "#f5f3ff",
    borderColor: "#ddd6fe",
  },
  NOTE: {
    label: "Note",
    icon: "ri-file-text-fill",
    color: "#d97706",
    bgColor: "#fffbeb",
    borderColor: "#fde68a",
  },
  TASK: {
    label: "Task",
    icon: "ri-checkbox-circle-fill",
    color: "#0d9488",
    bgColor: "#f0fdfa",
    borderColor: "#99f6e4",
  },
  DOCUMENT: {
    label: "Document",
    icon: "ri-folder-fill",
    color: "#7f1d1d",
    bgColor: "#fef2f2",
    borderColor: "#fecaca",
  },
};

const getDirectionBadge = (dir) => {
  if (!dir) return null;
  const d = String(dir).toLowerCase();
  let style = {
    backgroundColor: "#f1f5f9",
    color: "#475569",
    border: "1px solid #cbd5e1",
  };
  if (d.includes("outbound")) {
    style = {
      backgroundColor: "#ecfdf5",
      color: "#047857",
      border: "1px solid #a7f3d0",
    };
  } else if (d.includes("inbound")) {
    style = {
      backgroundColor: "#eff6ff",
      color: "#1d4ed8",
      border: "1px solid #bfdbfe",
    };
  } else if (d.includes("in person") || d.includes("person")) {
    style = {
      backgroundColor: "#f5f3ff",
      color: "#6d28d9",
      border: "1px solid #ddd6fe",
    };
  } else if (d.includes("online")) {
    style = {
      backgroundColor: "#e0f2fe",
      color: "#0369a1",
      border: "1px solid #bae6fd",
    };
  }
  return (
    <span
      className="badge px-2 py-0.5 fs-11 fw-semibold"
      style={{ ...style, borderRadius: 0, textTransform: "capitalize" }}
    >
      {dir}
    </span>
  );
};

const cleanDescription = (text) => {
  if (!text) return "";
  return text
    .replace(/\[(Subtype|Account|Contact|Direction|Related|With|Owner|Status|Party|Lead):[^\]]*\]/gi, "")
    .trim();
};

const renderDateLabel = (label) => {
  if (!label) return null;
  const parts = label.trim().split(/\s+/);
  if (parts[0] === "Today" || parts[0] === "Yesterday") {
    return (
      <div className="lh-sm">
        <div className="fw-bold text-dark fs-12">{parts[0]}</div>
        <div className="text-muted fs-11 mt-0.5">{parts.slice(1).join(" ")}</div>
      </div>
    );
  }
  return <div className="fw-bold text-dark fs-12">{label}</div>;
};

const CommunicationTimelineTab = ({
  accountId,
  customer,
  onEditCustomer,
  initialLogType = null,
}) => {
  // State
  const [timelineItems, setTimelineItems] = useState([]);
  const [stats, setStats] = useState({
    calls_count: 0,
    emails_count: 0,
    meetings_count: 0,
    notes_count: 0,
    tasks_count: 0,
    documents_count: 0,
  });
  const [summary, setSummary] = useState(null);
  const [lookups, setLookups] = useState({
    contacts: [],
    owners: [],
    interaction_types: [],
  });

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filterType, setFilterType] = useState("ALL");
  const [search, setSearch] = useState("");
  const [selectedOwnerId, setSelectedOwnerId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [limit, setLimit] = useState(25);
  const [hasMore, setHasMore] = useState(true);

  // UI Dropdowns
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [statsPeriod, setStatsPeriod] = useState("This Month");
  const [statsPeriodOpen, setStatsPeriodOpen] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState(null);

  // Modals
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [activeItem, setActiveItem] = useState(null);

  // Log Form State
  const [logForm, setLogForm] = useState({
    interactionType: "CALL",
    title: "",
    description: "",
    direction: "Outbound",
    contactName: "",
    contactInfo: "",
    durationMinutes: 15,
    ownerId: "",
    interactionTime: new Date().toISOString().slice(0, 16),
  });
  const [logSubmitting, setLogSubmitting] = useState(false);

  const validAccountId = useMemo(() => {
    if (!accountId || accountId === "undefined" || accountId === "null") return null;
    const n = Number(accountId);
    return isNaN(n) || n <= 0 ? null : n;
  }, [accountId]);

  // Fetch Lookups & Summary once
  useEffect(() => {
    if (!validAccountId) return;
    const fetchLookupsAndSummary = async () => {
      try {
        const [lData, sData] = await Promise.all([
          getTimelineLookups({ entityId: validAccountId }).catch(() => null),
          getTimelineSummary({ entityId: validAccountId }).catch(() => null),
        ]);
        if (lData) setLookups(lData);
        if (sData && (sData.account_id || sData.accountId)) setSummary(sData);
      } catch (err) {
        console.error("Failed to load timeline lookups:", err);
      }
    };
    fetchLookupsAndSummary();
  }, [validAccountId]);

  // Fetch Stats
  const loadStats = useCallback(async () => {
    if (!validAccountId) return;
    try {
      const res = await getTimelineStats({ entityId: validAccountId });
      if (res) setStats(res);
    } catch (err) {
      console.error("Failed to load timeline stats:", err);
    }
  }, [validAccountId]);

  // Fetch Timeline Feed
  const loadTimeline = useCallback(
    async (isLoadMore = false, currentLimit = limit) => {
      if (!validAccountId) return;
      if (isLoadMore) setLoadingMore(true);
      else setLoading(true);

      try {
        const items = await getTimeline({
          entityId: validAccountId,
          interactionType: filterType,
          search: search.trim() || undefined,
          ownerId: selectedOwnerId ? Number(selectedOwnerId) : undefined,
          dateFrom: dateFrom ? new Date(dateFrom).toISOString() : undefined,
          dateTo: dateTo ? new Date(dateTo).toISOString() : undefined,
          limit: currentLimit,
          offset: 0,
        });

        const list = Array.isArray(items) ? items : [];
        setTimelineItems(list);
        setHasMore(list.length >= currentLimit);
      } catch (err) {
        toastApiError(err, "Failed to load communication timeline.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [validAccountId, filterType, search, selectedOwnerId, dateFrom, dateTo, limit]
  );

  useEffect(() => {
    loadTimeline(false, limit);
    loadStats();
  }, [loadTimeline, loadStats, limit]);

  // Trigger open log activity if requested from parent
  useEffect(() => {
    if (initialLogType) {
      handleOpenLogModal(initialLogType);
    }
  }, [initialLogType]); // eslint-disable-line

  // Open Log Activity Modal with specific initial tab
  const handleOpenLogModal = (type = "CALL") => {
    const defaultContact = lookups.contacts?.[0]?.full_name || "";
    const defaultPhone = lookups.contacts?.[0]?.mobile || customer?.phoneMobile || "";
    setLogForm({
      interactionType: type,
      title:
        type === "CALL"
          ? "Follow-up Call"
          : type === "EMAIL"
          ? "Email Sent"
          : type === "MEETING"
          ? "Meeting"
          : type === "NOTE"
          ? "Note Added"
          : "Follow-up Task",
      description: "",
      direction:
        type === "CALL" || type === "EMAIL"
          ? "Outbound"
          : type === "MEETING"
          ? "In Person"
          : "General",
      contactName: defaultContact,
      contactInfo: defaultPhone,
      durationMinutes: type === "CALL" ? 15 : type === "MEETING" ? 60 : 5,
      ownerId: lookups.owners?.[0]?.employee_id ? String(lookups.owners[0].employee_id) : "",
      interactionTime: new Date().toISOString().slice(0, 16),
    });
    setLogModalOpen(true);
  };

  // Submit Activity Log
  const handleLogSubmit = async (e) => {
    e.preventDefault();
    if (!logForm.title.trim()) {
      toastApiError(null, "Subject / Title is required.");
      return;
    }

    setLogSubmitting(true);
    try {
      await logTimelineActivity({
        entityType: "CUSTOMER",
        entityId: validAccountId || Number(accountId),
        interactionType: logForm.interactionType,
        title: logForm.title.trim(),
        description: logForm.description.trim() || null,
        direction: logForm.direction || null,
        contactName: logForm.contactName.trim() || null,
        contactInfo: logForm.contactInfo.trim() || null,
        durationMinutes: Number(logForm.durationMinutes) || 5,
        ownerId: logForm.ownerId ? Number(logForm.ownerId) : null,
        interactionTime: logForm.interactionTime
          ? new Date(logForm.interactionTime).toISOString()
          : new Date().toISOString(),
      });

      toastSuccess("Activity recorded in timeline successfully.");
      setLogModalOpen(false);
      await Promise.all([loadTimeline(false, limit), loadStats()]);
    } catch (err) {
      toastApiError(err, "Failed to log interaction.");
    } finally {
      setLogSubmitting(false);
    }
  };

  // Toggle filter on 2x3 box click
  const toggleFilterType = (type) => {
    setFilterType((prev) => (prev === type ? "ALL" : type));
  };

  // Export Timeline to CSV
  const handleExportCsv = () => {
    if (!timelineItems.length) {
      toastApiError(null, "No timeline records to export.");
      return;
    }

    const headers = [
      "Date",
      "Time",
      "Type",
      "Title",
      "Direction",
      "Contact Person",
      "Contact Info",
      "Sales Rep",
      "Duration",
      "Description",
    ];

    const rows = timelineItems.map((item) => [
      `"${item.date_label || ""}"`,
      `"${item.time_label || ""}"`,
      `"${item.interaction_type || ""}"`,
      `"${(item.title || "").replace(/"/g, '""')}"`,
      `"${item.direction || ""}"`,
      `"${(item.contact_person || "").replace(/"/g, '""')}"`,
      `"${item.contact_info || ""}"`,
      `"${(item.employee_name || "").replace(/"/g, '""')}"`,
      `"${item.duration_label || ""}"`,
      `"${(cleanDescription(item.description) || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `CRM_Timeline_${customer?.displayName || customer?.companyName || accountId}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toastSuccess("Timeline exported to CSV successfully.");
  };

  // Clear all filters
  const handleClearFilters = () => {
    setFilterType("ALL");
    setSearch("");
    setSelectedOwnerId("");
    setDateFrom("");
    setDateTo("");
  };

  // Load More Interactions
  const handleLoadMore = () => {
    const nextLimit = limit + 25;
    setLimit(nextLimit);
    loadTimeline(true, nextLimit);
  };

  // Copy note to clipboard
  const handleCopyNote = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(cleanDescription(text));
    toastSuccess("Discussion notes copied to clipboard.");
  };

  // Effective customer profile data (merged from summary API and props)
  const displayProfile = useMemo(() => {
    return {
      displayName: summary?.display_name || customer?.displayName || customer?.companyName || "Customer",
      industry: summary?.industry || customer?.department || customer?.partyProfile || "Information Technology",
      website: summary?.website || customer?.websiteUrl || "",
      phone: summary?.phone || customer?.phoneWork || customer?.phoneMobile || "",
      email: summary?.email || customer?.email || "",
      ownerName: summary?.owner_name || customer?.assignedOwnerName || "Sales Team",
      leadSource: summary?.lead_source || customer?.acquisitionSource || "Website",
      status: summary?.status || customer?.status || "Active",
      location: summary?.location || customer?.placeOfSupply || "India",
      customerSince: summary?.customer_since || "Recent",
    };
  }, [summary, customer]);

  return (
    <div className="communication-timeline-wrapper">
      <Row className="g-4">
        {/* ======================================================== */}
        {/* Left Column: Timeline Stream & Filter Bar (8 Cols)       */}
        {/* ======================================================== */}
        <Col lg={8} xl={8}>
          {/* Top Filter & Search Action Bar */}
          <div
            className="d-flex align-items-center justify-content-between flex-wrap gap-2 p-2 mb-4 bg-white border"
            style={{ borderRadius: 0, borderColor: THEME.cardBorder }}
          >
            {/* Left: Interaction Type Dropdown */}
            <Dropdown
              isOpen={typeDropdownOpen}
              toggle={() => setTypeDropdownOpen(!typeDropdownOpen)}
            >
              <DropdownToggle
                color="light"
                size="sm"
                className="border bg-white text-dark fw-semibold d-flex align-items-center gap-2 px-3"
                style={{ borderRadius: 0, borderColor: "#cbd5e1", height: "36px" }}
              >
                <span>
                  {filterType === "ALL"
                    ? "All Interactions"
                    : TYPE_CONFIG[filterType]?.label || filterType}
                </span>
                <i className="ri-arrow-down-s-line fs-14 text-muted" />
              </DropdownToggle>
              <DropdownMenu
                style={{
                  borderRadius: 0,
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                }}
              >
                <DropdownItem
                  active={filterType === "ALL"}
                  onClick={() => setFilterType("ALL")}
                  style={{ borderRadius: 0 }}
                >
                  All Interactions
                </DropdownItem>
                {Object.keys(TYPE_CONFIG).map((k) => (
                  <DropdownItem
                    key={k}
                    active={filterType === k}
                    onClick={() => setFilterType(k)}
                    style={{ borderRadius: 0 }}
                  >
                    <i
                      className={`${TYPE_CONFIG[k].icon} me-2`}
                      style={{ color: TYPE_CONFIG[k].color }}
                    />
                    {TYPE_CONFIG[k].label}s
                  </DropdownItem>
                ))}
              </DropdownMenu>
            </Dropdown>

            {/* Middle & Right: Search Input + Log Activity Button */}
            <div className="d-flex align-items-center gap-2 flex-grow-1 justify-content-end">
              <div
                className="input-group input-group-sm"
                style={{ maxWidth: "280px" }}
              >
                <span
                  className="input-group-text bg-white border-end-0 text-muted"
                  style={{ borderRadius: 0, borderColor: "#cbd5e1" }}
                >
                  <i className="ri-search-line" />
                </span>
                <Input
                  type="text"
                  placeholder="Search in timeline..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="border-start-0 ps-1"
                  style={{ borderRadius: 0, borderColor: "#cbd5e1", height: "36px" }}
                />
                {search && (
                  <button
                    type="button"
                    className="btn btn-sm btn-white border border-start-0 text-muted"
                    onClick={() => setSearch("")}
                    style={{ borderRadius: 0, borderColor: "#cbd5e1" }}
                  >
                    <i className="ri-close-line" />
                  </button>
                )}
              </div>

              {/* Log Activity Button (Single Plus) */}
              <Button
                size="sm"
                className="text-white fw-semibold px-3 d-inline-flex align-items-center gap-1"
                onClick={() => handleOpenLogModal("CALL")}
                style={{
                  backgroundColor: THEME.primary,
                  borderColor: THEME.primary,
                  borderRadius: 0,
                  height: "36px",
                  boxShadow: "0 1px 2px 0 rgba(127, 29, 29, 0.2)",
                }}
              >
                <i className="ri-add-line fs-14 me-1" /> Log Activity
              </Button>
            </div>
          </div>

          {/* Timeline Stream Container with Continuous Spine */}
          <div className="timeline-stream-container position-relative">
            {loading ? (
              <div
                className="text-center py-5 bg-white border"
                style={{ borderRadius: 0, borderColor: THEME.cardBorder }}
              >
                <Spinner size="sm" style={{ color: THEME.primary }} />
                <div className="text-muted fs-13 mt-2">Loading timeline touchpoints...</div>
              </div>
            ) : timelineItems.length === 0 ? (
              <div
                className="text-center py-5 bg-white border"
                style={{ borderRadius: 0, borderColor: THEME.cardBorder }}
              >
                <div
                  className="d-inline-flex align-items-center justify-content-center mb-2"
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: 0,
                    backgroundColor: "#fef2f2",
                    color: THEME.primary,
                  }}
                >
                  <i className="ri-history-line fs-24" />
                </div>
                <h6 className="fw-bold text-dark mb-1">No Interactions Found</h6>
                <p className="text-muted fs-13 mb-3">
                  No communication activities match your selected filters.
                </p>
                <div className="d-flex justify-content-center gap-2">
                  <Button
                    size="sm"
                    className="text-white fw-semibold"
                    onClick={() => handleOpenLogModal("CALL")}
                    style={{
                      backgroundColor: THEME.primary,
                      borderColor: THEME.primary,
                      borderRadius: 0,
                    }}
                  >
                    <i className="ri-add-line me-1" /> Log First Activity
                  </Button>
                  {(filterType !== "ALL" || search || selectedOwnerId || dateFrom || dateTo) && (
                    <Button
                      size="sm"
                      color="light"
                      className="border"
                      onClick={handleClearFilters}
                      style={{ borderRadius: 0 }}
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="timeline-feed-wrapper position-relative">
                {/* Continuous Vertical Spine Track (Unbroken from top to bottom) */}
                <div
                  className="position-absolute"
                  style={{
                    top: "16px",
                    bottom: "28px",
                    left: "111px",
                    width: "2px",
                    backgroundColor: "#e2e8f0",
                    zIndex: 1,
                  }}
                />

                {timelineItems.map((item, index) => {
                  const typeCfg = TYPE_CONFIG[item.interaction_type] || TYPE_CONFIG.CALL;
                  const isFirstOfDay =
                    index === 0 ||
                    item.date_label !== timelineItems[index - 1]?.date_label;
                  const cleanedNotes = cleanDescription(item.description);

                  return (
                    <div
                      key={item.timeline_id || index}
                      className="timeline-row d-flex align-items-start position-relative mb-4"
                    >
                      {/* Left: Date / Time Column */}
                      <div
                        className="timeline-date-col text-end flex-shrink-0"
                        style={{
                          width: "100px",
                          paddingRight: "14px",
                          paddingTop: "6px",
                        }}
                      >
                        {isFirstOfDay ? (
                          renderDateLabel(item.date_label)
                        ) : (
                          <div className="text-muted fs-11 fw-medium">{item.time_label}</div>
                        )}
                      </div>

                      {/* Spine Bullet Node Column (Centered on vertical spine at 112px) */}
                      <div
                        className="timeline-bullet-col position-relative flex-shrink-0 d-flex justify-content-center"
                        style={{
                          width: "24px",
                          paddingTop: "14px",
                          zIndex: 2,
                        }}
                      >
                        <div
                          style={{
                            width: "10px",
                            height: "10px",
                            borderRadius: "50%",
                            backgroundColor: typeCfg.color,
                            border: "2px solid #ffffff",
                            boxShadow: `0 0 0 1.5px ${typeCfg.color}`,
                          }}
                        />
                      </div>

                      {/* Square Type Icon Box */}
                      <div
                        className="timeline-icon-box flex-shrink-0 d-flex align-items-center justify-content-center me-3"
                        style={{
                          width: "38px",
                          height: "38px",
                          borderRadius: 0,
                          backgroundColor: typeCfg.bgColor,
                          color: typeCfg.color,
                          border: `1px solid ${typeCfg.borderColor}`,
                          zIndex: 2,
                        }}
                      >
                        <i className={`${typeCfg.icon} fs-16`} />
                      </div>

                      {/* Right: Event Card */}
                      <Card
                        className="flex-grow-1 border bg-white mb-0 shadow-sm"
                        style={{
                          borderRadius: 0,
                          borderColor: THEME.cardBorder,
                        }}
                      >
                        <CardBody className="p-3">
                          {/* Card Top: Title, Direction Badge, Time, Duration, Context Menu */}
                          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
                            <div className="d-flex align-items-center gap-2 flex-wrap">
                              <h6 className="fw-bold text-dark mb-0 fs-14">
                                {item.title}
                              </h6>
                              {getDirectionBadge(item.direction)}
                              {item.status_badge && (
                                <span
                                  className="badge px-2 py-0.5 fs-10"
                                  style={{
                                    borderRadius: 0,
                                    backgroundColor: "#f1f5f9",
                                    color: "#475569",
                                    border: "1px solid #cbd5e1",
                                    fontWeight: 600,
                                  }}
                                >
                                  {item.status_badge}
                                </span>
                              )}
                            </div>

                            <div className="d-flex align-items-center gap-2 text-muted fs-12">
                              <span className="fw-medium">{item.time_label}</span>
                              {item.duration_label && (
                                <span
                                  className="badge px-2 py-0.5 fs-11"
                                  style={{
                                    borderRadius: 0,
                                    backgroundColor: "#f8fafc",
                                    color: "#0f172a",
                                    border: "1px solid #e2e8f0",
                                    fontWeight: 600,
                                  }}
                                >
                                  {item.duration_label}
                                </span>
                              )}
                              {item.attachments_count > 0 && (
                                <span
                                  className="badge px-2 py-0.5 fs-11"
                                  style={{
                                    borderRadius: 0,
                                    backgroundColor: "#f8fafc",
                                    color: "#475569",
                                    border: "1px solid #e2e8f0",
                                  }}
                                >
                                  <i className="ri-attachment-2 me-1" />
                                  {item.attachments_count}
                                </span>
                              )}

                              {/* Interactive Context Menu */}
                              <Dropdown
                                isOpen={menuOpenId === item.timeline_id}
                                toggle={() =>
                                  setMenuOpenId(
                                    menuOpenId === item.timeline_id ? null : item.timeline_id
                                  )
                                }
                              >
                                <DropdownToggle
                                  color="link"
                                  size="sm"
                                  className="p-0 text-muted text-decoration-none"
                                >
                                  <i className="ri-more-2-fill fs-16" />
                                </DropdownToggle>
                                <DropdownMenu
                                  end
                                  style={{
                                    borderRadius: 0,
                                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                                  }}
                                >
                                  <DropdownItem
                                    onClick={() => {
                                      setActiveItem(item);
                                      setDetailModalOpen(true);
                                    }}
                                    style={{ borderRadius: 0 }}
                                  >
                                    <i className="ri-eye-line me-2 text-muted" /> View Details
                                  </DropdownItem>
                                  {cleanedNotes && (
                                    <DropdownItem
                                      onClick={() => handleCopyNote(cleanedNotes)}
                                      style={{ borderRadius: 0 }}
                                    >
                                      <i className="ri-file-copy-line me-2 text-muted" /> Copy Notes
                                    </DropdownItem>
                                  )}
                                  <DropdownItem
                                    onClick={() => handleOpenLogModal("CALL")}
                                    style={{ borderRadius: 0 }}
                                  >
                                    <i className="ri-reply-line me-2 text-muted" /> Log Follow-up
                                  </DropdownItem>
                                </DropdownMenu>
                              </Dropdown>
                            </div>
                          </div>

                          {/* Card Body: Clean Discussion Text */}
                          {cleanedNotes && (
                            <p
                              className="text-dark fs-13 mb-3"
                              style={{
                                whiteSpace: "pre-line",
                                lineHeight: 1.55,
                                color: "#334155",
                              }}
                            >
                              {cleanedNotes}
                            </p>
                          )}

                          {/* Card Footer: Contact Person & Staff Owner */}
                          <div className="d-flex align-items-center gap-3 text-muted fs-12 pt-2 border-top flex-wrap">
                            {item.contact_person && (
                              <div className="d-flex align-items-center gap-1 text-dark fw-medium">
                                <i className="ri-user-line text-muted" />
                                <span>{item.contact_person}</span>
                                {item.contact_info && (
                                  <span className="text-muted fw-normal ms-1">
                                    ({item.contact_info})
                                  </span>
                                )}
                              </div>
                            )}

                            {item.contact_person && item.employee_name && (
                              <span className="text-muted" style={{ opacity: 0.5 }}>
                                |
                              </span>
                            )}

                            {item.employee_name && (
                              <div className="d-flex align-items-center gap-1.5">
                                <div
                                  className="text-white d-inline-flex align-items-center justify-content-center fw-bold fs-10"
                                  style={{
                                    width: "18px",
                                    height: "18px",
                                    borderRadius: 0,
                                    backgroundColor: THEME.primary,
                                  }}
                                >
                                  {(item.employee_name[0] || "S").toUpperCase()}
                                </div>
                                <span className="text-dark fw-medium">
                                  {item.employee_name}
                                </span>
                              </div>
                            )}
                          </div>
                        </CardBody>
                      </Card>
                    </div>
                  );
                })}

                {/* Load More Button */}
                {hasMore && (
                  <div className="text-center mt-3 pt-2">
                    <Button
                      color="light"
                      size="sm"
                      className="border bg-white text-dark fw-semibold px-4 py-2 shadow-sm"
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      style={{
                        borderRadius: 0,
                        borderColor: "#cbd5e1",
                      }}
                    >
                      {loadingMore ? (
                        <>
                          <Spinner size="sm" className="me-2" /> Loading more...
                        </>
                      ) : (
                        <>Load More Interactions ▾</>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </Col>

        {/* ======================================================== */}
        {/* Right Column: Profile Summary, Stats & Filter (4 Cols)   */}
        {/* ======================================================== */}
        <Col lg={4} xl={4}>
          {/* Card 1: Lead / Customer Summary */}
          <Card
            className="border shadow-sm mb-3 bg-white"
            style={{ borderRadius: 0, borderColor: THEME.cardBorder }}
          >
            <CardBody className="p-3">
              <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
                <h6 className="fw-bold text-dark mb-0 fs-14">Lead Summary</h6>
                {onEditCustomer && (
                  <button
                    type="button"
                    onClick={onEditCustomer}
                    className="btn btn-link p-0 text-decoration-none fs-12 fw-semibold d-inline-flex align-items-center gap-1"
                    style={{ color: THEME.primary }}
                  >
                    <i className="ri-pencil-line" /> Edit
                  </button>
                )}
              </div>

              <div className="summary-fields-list d-flex flex-column gap-2 fs-12">
                <div className="d-flex justify-content-between align-items-center py-1">
                  <span className="text-muted">Industry</span>
                  <span className="text-dark fw-semibold text-end">
                    {displayProfile.industry}
                  </span>
                </div>

                <div className="d-flex justify-content-between align-items-center py-1">
                  <span className="text-muted">Website</span>
                  {displayProfile.website ? (
                    <a
                      href={
                        displayProfile.website.startsWith("http")
                          ? displayProfile.website
                          : `https://${displayProfile.website}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="text-decoration-none fw-semibold text-end d-inline-flex align-items-center gap-1"
                      style={{ color: THEME.primary }}
                    >
                      {displayProfile.website.replace(/^https?:\/\//, "")}
                      <i className="ri-external-link-line fs-11" />
                    </a>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </div>

                <div className="d-flex justify-content-between align-items-center py-1">
                  <span className="text-muted">Phone</span>
                  {displayProfile.phone ? (
                    <a
                      href={`tel:${displayProfile.phone}`}
                      className="text-decoration-none fw-semibold text-dark text-end"
                    >
                      {displayProfile.phone}
                    </a>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </div>

                <div className="d-flex justify-content-between align-items-center py-1">
                  <span className="text-muted">Email</span>
                  {displayProfile.email ? (
                    <a
                      href={`mailto:${displayProfile.email}`}
                      className="text-decoration-none fw-semibold text-dark text-end text-truncate"
                      style={{ maxWidth: "180px" }}
                    >
                      {displayProfile.email}
                    </a>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </div>

                <div className="d-flex justify-content-between align-items-center py-1">
                  <span className="text-muted">Owner</span>
                  <div className="d-flex align-items-center gap-1.5">
                    <div
                      className="text-white d-inline-flex align-items-center justify-content-center fw-bold fs-10"
                      style={{
                        width: "18px",
                        height: "18px",
                        borderRadius: 0,
                        backgroundColor: THEME.primary,
                      }}
                    >
                      {(displayProfile.ownerName[0] || "S").toUpperCase()}
                    </div>
                    <span className="text-dark fw-semibold">
                      {displayProfile.ownerName}
                    </span>
                  </div>
                </div>

                <div className="d-flex justify-content-between align-items-center py-1">
                  <span className="text-muted">Lead Source</span>
                  <span className="text-dark fw-semibold">
                    {displayProfile.leadSource}
                  </span>
                </div>

                <div className="d-flex justify-content-between align-items-center py-1">
                  <span className="text-muted">Status</span>
                  <span
                    className="badge px-2 py-1 fs-11"
                    style={{
                      borderRadius: 0,
                      backgroundColor: "#dcfce7",
                      color: "#15803d",
                      border: "1px solid #bbf7d0",
                      fontWeight: 600,
                      textTransform: "capitalize",
                    }}
                  >
                    {displayProfile.status}
                  </span>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Card 2: Interactive 2x3 Metric Grid with Filter Sync */}
          <Card
            className="border shadow-sm mb-3 bg-white"
            style={{ borderRadius: 0, borderColor: THEME.cardBorder }}
          >
            <CardBody className="p-3">
              <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
                <h6 className="fw-bold text-dark mb-0 fs-14">Interaction Stats</h6>
                <Dropdown
                  isOpen={statsPeriodOpen}
                  toggle={() => setStatsPeriodOpen(!statsPeriodOpen)}
                >
                  <DropdownToggle
                    color="link"
                    className="p-0 text-decoration-none fs-12 text-muted fw-semibold d-flex align-items-center gap-1"
                  >
                    <span>{statsPeriod}</span>
                    <i className="ri-arrow-down-s-line" />
                  </DropdownToggle>
                  <DropdownMenu
                    end
                    style={{
                      borderRadius: 0,
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    }}
                  >
                    <DropdownItem
                      onClick={() => setStatsPeriod("This Month")}
                      style={{ borderRadius: 0 }}
                    >
                      This Month
                    </DropdownItem>
                    <DropdownItem
                      onClick={() => setStatsPeriod("This Week")}
                      style={{ borderRadius: 0 }}
                    >
                      This Week
                    </DropdownItem>
                    <DropdownItem
                      onClick={() => setStatsPeriod("All Time")}
                      style={{ borderRadius: 0 }}
                    >
                      All Time
                    </DropdownItem>
                  </DropdownMenu>
                </Dropdown>
              </div>

              {/* 2x3 Interactive Metric Tiles */}
              <Row className="g-2 text-start">
                {/* 1. Calls */}
                <Col xs={6}>
                  <div
                    onClick={() => toggleFilterType("CALL")}
                    className="p-2.5 border d-flex align-items-center gap-2 cursor-pointer shadow-sm transition"
                    title={filterType === "CALL" ? "Click to show all" : "Click to filter Calls"}
                    style={{
                      borderRadius: 0,
                      borderColor: filterType === "CALL" ? "#059669" : "#e2e8f0",
                      backgroundColor: filterType === "CALL" ? "#ecfdf5" : "#ffffff",
                      cursor: "pointer",
                      borderWidth: filterType === "CALL" ? "1.5px" : "1px",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div
                      className="d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{
                        width: "34px",
                        height: "34px",
                        borderRadius: 0,
                        backgroundColor: "#ecfdf5",
                        color: "#059669",
                      }}
                    >
                      <i className="ri-phone-line fs-17" />
                    </div>
                    <div>
                      <div className="fw-bold fs-16 text-dark lh-1">
                        {stats.calls_count || 0}
                      </div>
                      <div className="text-muted fs-11 mt-1">Calls</div>
                    </div>
                  </div>
                </Col>

                {/* 2. Emails */}
                <Col xs={6}>
                  <div
                    onClick={() => toggleFilterType("EMAIL")}
                    className="p-2.5 border d-flex align-items-center gap-2 cursor-pointer shadow-sm transition"
                    title={filterType === "EMAIL" ? "Click to show all" : "Click to filter Emails"}
                    style={{
                      borderRadius: 0,
                      borderColor: filterType === "EMAIL" ? "#2563eb" : "#e2e8f0",
                      backgroundColor: filterType === "EMAIL" ? "#eff6ff" : "#ffffff",
                      cursor: "pointer",
                      borderWidth: filterType === "EMAIL" ? "1.5px" : "1px",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div
                      className="d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{
                        width: "34px",
                        height: "34px",
                        borderRadius: 0,
                        backgroundColor: "#eff6ff",
                        color: "#2563eb",
                      }}
                    >
                      <i className="ri-mail-line fs-17" />
                    </div>
                    <div>
                      <div className="fw-bold fs-16 text-dark lh-1">
                        {stats.emails_count || 0}
                      </div>
                      <div className="text-muted fs-11 mt-1">Emails</div>
                    </div>
                  </div>
                </Col>

                {/* 3. Meetings */}
                <Col xs={6}>
                  <div
                    onClick={() => toggleFilterType("MEETING")}
                    className="p-2.5 border d-flex align-items-center gap-2 cursor-pointer shadow-sm transition"
                    title={filterType === "MEETING" ? "Click to show all" : "Click to filter Meetings"}
                    style={{
                      borderRadius: 0,
                      borderColor: filterType === "MEETING" ? "#7c3aed" : "#e2e8f0",
                      backgroundColor: filterType === "MEETING" ? "#f5f3ff" : "#ffffff",
                      cursor: "pointer",
                      borderWidth: filterType === "MEETING" ? "1.5px" : "1px",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div
                      className="d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{
                        width: "34px",
                        height: "34px",
                        borderRadius: 0,
                        backgroundColor: "#f5f3ff",
                        color: "#7c3aed",
                      }}
                    >
                      <i className="ri-calendar-event-line fs-17" />
                    </div>
                    <div>
                      <div className="fw-bold fs-16 text-dark lh-1">
                        {stats.meetings_count || 0}
                      </div>
                      <div className="text-muted fs-11 mt-1">Meetings</div>
                    </div>
                  </div>
                </Col>

                {/* 4. Notes */}
                <Col xs={6}>
                  <div
                    onClick={() => toggleFilterType("NOTE")}
                    className="p-2.5 border d-flex align-items-center gap-2 cursor-pointer shadow-sm transition"
                    title={filterType === "NOTE" ? "Click to show all" : "Click to filter Notes"}
                    style={{
                      borderRadius: 0,
                      borderColor: filterType === "NOTE" ? "#d97706" : "#e2e8f0",
                      backgroundColor: filterType === "NOTE" ? "#fffbeb" : "#ffffff",
                      cursor: "pointer",
                      borderWidth: filterType === "NOTE" ? "1.5px" : "1px",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div
                      className="d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{
                        width: "34px",
                        height: "34px",
                        borderRadius: 0,
                        backgroundColor: "#fffbeb",
                        color: "#d97706",
                      }}
                    >
                      <i className="ri-file-text-line fs-17" />
                    </div>
                    <div>
                      <div className="fw-bold fs-16 text-dark lh-1">
                        {stats.notes_count || 0}
                      </div>
                      <div className="text-muted fs-11 mt-1">Notes</div>
                    </div>
                  </div>
                </Col>

                {/* 5. Tasks */}
                <Col xs={6}>
                  <div
                    onClick={() => toggleFilterType("TASK")}
                    className="p-2.5 border d-flex align-items-center gap-2 cursor-pointer shadow-sm transition"
                    title={filterType === "TASK" ? "Click to show all" : "Click to filter Tasks"}
                    style={{
                      borderRadius: 0,
                      borderColor: filterType === "TASK" ? "#0d9488" : "#e2e8f0",
                      backgroundColor: filterType === "TASK" ? "#f0fdfa" : "#ffffff",
                      cursor: "pointer",
                      borderWidth: filterType === "TASK" ? "1.5px" : "1px",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div
                      className="d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{
                        width: "34px",
                        height: "34px",
                        borderRadius: 0,
                        backgroundColor: "#f0fdfa",
                        color: "#0d9488",
                      }}
                    >
                      <i className="ri-checkbox-circle-line fs-17" />
                    </div>
                    <div>
                      <div className="fw-bold fs-16 text-dark lh-1">
                        {stats.tasks_count || 0}
                      </div>
                      <div className="text-muted fs-11 mt-1">Tasks</div>
                    </div>
                  </div>
                </Col>

                {/* 6. Documents */}
                <Col xs={6}>
                  <div
                    onClick={() => toggleFilterType("DOCUMENT")}
                    className="p-2.5 border d-flex align-items-center gap-2 cursor-pointer shadow-sm transition"
                    title={filterType === "DOCUMENT" ? "Click to show all" : "Click to filter Documents"}
                    style={{
                      borderRadius: 0,
                      borderColor: filterType === "DOCUMENT" ? "#7f1d1d" : "#e2e8f0",
                      backgroundColor: filterType === "DOCUMENT" ? "#fef2f2" : "#ffffff",
                      cursor: "pointer",
                      borderWidth: filterType === "DOCUMENT" ? "1.5px" : "1px",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div
                      className="d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{
                        width: "34px",
                        height: "34px",
                        borderRadius: 0,
                        backgroundColor: "#fef2f2",
                        color: "#7f1d1d",
                      }}
                    >
                      <i className="ri-folder-line fs-17" />
                    </div>
                    <div>
                      <div className="fw-bold fs-16 text-dark lh-1">
                        {stats.documents_count || 0}
                      </div>
                      <div className="text-muted fs-11 mt-1">Documents</div>
                    </div>
                  </div>
                </Col>
              </Row>
            </CardBody>
          </Card>

          {/* Card 3: Filter Timeline Panel with Live State Binding */}
          <Card
            className="border shadow-sm mb-3 bg-white"
            style={{ borderRadius: 0, borderColor: THEME.cardBorder }}
          >
            <CardBody className="p-3">
              <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
                <h6 className="fw-bold text-dark mb-0 fs-14">Filter Timeline</h6>
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="btn btn-link p-0 text-decoration-none fs-12 fw-semibold"
                  style={{ color: THEME.primary }}
                >
                  Clear All
                </button>
              </div>

              <div className="d-flex flex-column gap-3">
                {/* 1. Interaction Type Select */}
                <div>
                  <Label className="fs-12 fw-semibold text-muted mb-1">
                    Interaction Type
                  </Label>
                  <Input
                    type="select"
                    bsSize="sm"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    style={{ borderRadius: 0, borderColor: "#cbd5e1" }}
                  >
                    <option value="ALL">All Interaction Types</option>
                    <option value="CALL">Calls Only</option>
                    <option value="EMAIL">Emails Only</option>
                    <option value="MEETING">Meetings Only</option>
                    <option value="NOTE">Notes Only</option>
                    <option value="TASK">Tasks Only</option>
                    <option value="DOCUMENT">Documents Only</option>
                  </Input>
                </div>

                {/* 2. User / Sales Rep Select */}
                <div>
                  <Label className="fs-12 fw-semibold text-muted mb-1">
                    Sales Rep / User
                  </Label>
                  <Input
                    type="select"
                    bsSize="sm"
                    value={selectedOwnerId}
                    onChange={(e) => setSelectedOwnerId(e.target.value)}
                    style={{ borderRadius: 0, borderColor: "#cbd5e1" }}
                  >
                    <option value="">All Users</option>
                    {lookups.owners?.map((o) => (
                      <option key={o.employee_id} value={o.employee_id}>
                        {o.full_name}
                      </option>
                    ))}
                  </Input>
                </div>

                {/* 3. Date Range (From / To) */}
                <div>
                  <Label className="fs-12 fw-semibold text-muted mb-1">
                    Date Range
                  </Label>
                  <Row className="g-2">
                    <Col xs={6}>
                      <Input
                        type="date"
                        bsSize="sm"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        placeholder="From"
                        style={{ borderRadius: 0, borderColor: "#cbd5e1" }}
                      />
                    </Col>
                    <Col xs={6}>
                      <Input
                        type="date"
                        bsSize="sm"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        placeholder="To"
                        style={{ borderRadius: 0, borderColor: "#cbd5e1" }}
                      />
                    </Col>
                  </Row>
                </div>

                {/* 4. Export Button */}
                <Button
                  color="light"
                  size="sm"
                  className="border bg-white text-dark fw-semibold w-100 py-2 d-flex align-items-center justify-content-center gap-2 mt-1 shadow-sm"
                  onClick={handleExportCsv}
                  style={{
                    borderRadius: 0,
                    borderColor: "#cbd5e1",
                  }}
                >
                  <i className="ri-download-2-line fs-14" />
                  <span>Export Timeline</span>
                </Button>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* ======================================================== */}
      {/* IN-PAGE MODAL: Log Activity Modal                        */}
      {/* ======================================================== */}
      <Modal
        isOpen={logModalOpen}
        toggle={() => setLogModalOpen(!logModalOpen)}
        centered
        size="lg"
        style={{ borderRadius: 0 }}
      >
        <ModalHeader
          toggle={() => setLogModalOpen(false)}
          className="border-bottom"
          style={{ backgroundColor: "#ffffff" }}
        >
          <span className="fw-bold fs-16 text-dark d-flex align-items-center gap-2">
            <span
              className="d-inline-flex align-items-center justify-content-center"
              style={{
                width: "28px",
                height: "28px",
                borderRadius: 0,
                backgroundColor: "#fef2f2",
                color: THEME.primary,
              }}
            >
              <i className="ri-calendar-event-line" />
            </span>
            Log Customer Interaction
          </span>
        </ModalHeader>
        <Form onSubmit={handleLogSubmit}>
          <ModalBody className="p-4 bg-white">
            {/* Modal Sub-tabs for Activity Type */}
            <div
              className="d-flex align-items-center gap-2 mb-4 p-1 border"
              style={{ backgroundColor: "#f8fafc", borderRadius: 0 }}
            >
              {[
                { id: "CALL", label: "Call", icon: "ri-phone-line" },
                { id: "EMAIL", label: "Email", icon: "ri-mail-line" },
                { id: "MEETING", label: "Meeting", icon: "ri-calendar-event-line" },
                { id: "NOTE", label: "Note", icon: "ri-file-text-line" },
                { id: "TASK", label: "Task", icon: "ri-checkbox-circle-line" },
              ].map((t) => {
                const isSelected = logForm.interactionType === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() =>
                      setLogForm((prev) => ({
                        ...prev,
                        interactionType: t.id,
                        direction:
                          t.id === "CALL" || t.id === "EMAIL"
                            ? "Outbound"
                            : t.id === "MEETING"
                            ? "In Person"
                            : "General",
                      }))
                    }
                    className="btn btn-sm flex-fill fw-semibold d-inline-flex align-items-center justify-content-center gap-1"
                    style={{
                      borderRadius: 0,
                      backgroundColor: isSelected ? THEME.primary : "transparent",
                      color: isSelected ? "#ffffff" : "#475569",
                      border: "none",
                      height: "36px",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <i className={t.icon} />
                    {t.label}
                  </button>
                );
              })}
            </div>

            <Row className="g-3">
              {/* Subject / Title */}
              <Col md={8}>
                <FormGroup className="mb-0">
                  <Label className="fs-12 fw-semibold text-dark">
                    Subject / Title <span className="text-danger">*</span>
                  </Label>
                  <Input
                    type="text"
                    required
                    value={logForm.title}
                    onChange={(e) =>
                      setLogForm((prev) => ({ ...prev, title: e.target.value }))
                    }
                    placeholder="e.g. Follow-up discussion regarding quotation"
                    style={{ borderRadius: 0, borderColor: "#cbd5e1" }}
                  />
                </FormGroup>
              </Col>

              {/* Direction */}
              <Col md={4}>
                <FormGroup className="mb-0">
                  <Label className="fs-12 fw-semibold text-dark">Direction</Label>
                  <Input
                    type="select"
                    value={logForm.direction}
                    onChange={(e) =>
                      setLogForm((prev) => ({ ...prev, direction: e.target.value }))
                    }
                    style={{ borderRadius: 0, borderColor: "#cbd5e1" }}
                  >
                    <option value="Outbound">Outbound</option>
                    <option value="Inbound">Inbound</option>
                    <option value="In Person">In Person</option>
                    <option value="Online">Online</option>
                  </Input>
                </FormGroup>
              </Col>

              {/* Contact Person */}
              <Col md={6}>
                <FormGroup className="mb-0">
                  <Label className="fs-12 fw-semibold text-dark">
                    Contact Person
                  </Label>
                  <Input
                    type="select"
                    value={logForm.contactName}
                    onChange={(e) => {
                      const selected = lookups.contacts?.find(
                        (c) => c.full_name === e.target.value
                      );
                      setLogForm((prev) => ({
                        ...prev,
                        contactName: e.target.value,
                        contactInfo: selected?.mobile || selected?.email || prev.contactInfo,
                      }));
                    }}
                    style={{ borderRadius: 0, borderColor: "#cbd5e1" }}
                  >
                    <option value="">Select Customer Contact</option>
                    {lookups.contacts?.map((c) => (
                      <option key={c.contact_person_id} value={c.full_name}>
                        {c.full_name} {c.is_primary ? "(Primary)" : ""}
                      </option>
                    ))}
                  </Input>
                </FormGroup>
              </Col>

              {/* Contact Info (Phone / Email) */}
              <Col md={6}>
                <FormGroup className="mb-0">
                  <Label className="fs-12 fw-semibold text-dark">
                    Contact Phone / Email
                  </Label>
                  <Input
                    type="text"
                    value={logForm.contactInfo}
                    onChange={(e) =>
                      setLogForm((prev) => ({ ...prev, contactInfo: e.target.value }))
                    }
                    placeholder="e.g. +91 98765 43210"
                    style={{ borderRadius: 0, borderColor: "#cbd5e1" }}
                  />
                </FormGroup>
              </Col>

              {/* Date & Time */}
              <Col md={4}>
                <FormGroup className="mb-0">
                  <Label className="fs-12 fw-semibold text-dark">Date & Time</Label>
                  <Input
                    type="datetime-local"
                    value={logForm.interactionTime}
                    onChange={(e) =>
                      setLogForm((prev) => ({
                        ...prev,
                        interactionTime: e.target.value,
                      }))
                    }
                    style={{ borderRadius: 0, borderColor: "#cbd5e1" }}
                  />
                </FormGroup>
              </Col>

              {/* Duration Minutes */}
              <Col md={4}>
                <FormGroup className="mb-0">
                  <Label className="fs-12 fw-semibold text-dark">
                    Duration (Minutes)
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={600}
                    value={logForm.durationMinutes}
                    onChange={(e) =>
                      setLogForm((prev) => ({
                        ...prev,
                        durationMinutes: e.target.value,
                      }))
                    }
                    style={{ borderRadius: 0, borderColor: "#cbd5e1" }}
                  />
                </FormGroup>
              </Col>

              {/* Sales Rep / Owner */}
              <Col md={4}>
                <FormGroup className="mb-0">
                  <Label className="fs-12 fw-semibold text-dark">
                    Sales Rep / Owner
                  </Label>
                  <Input
                    type="select"
                    value={logForm.ownerId}
                    onChange={(e) =>
                      setLogForm((prev) => ({ ...prev, ownerId: e.target.value }))
                    }
                    style={{ borderRadius: 0, borderColor: "#cbd5e1" }}
                  >
                    <option value="">Select Rep</option>
                    {lookups.owners?.map((o) => (
                      <option key={o.employee_id} value={o.employee_id}>
                        {o.full_name}
                      </option>
                    ))}
                  </Input>
                </FormGroup>
              </Col>

              {/* Notes / Description */}
              <Col md={12}>
                <FormGroup className="mb-0">
                  <Label className="fs-12 fw-semibold text-dark">
                    Notes & Discussion Points
                  </Label>
                  <Input
                    type="textarea"
                    rows={4}
                    value={logForm.description}
                    onChange={(e) =>
                      setLogForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Log summary of customer discussion, requirements, next steps, feedback..."
                    style={{ borderRadius: 0, borderColor: "#cbd5e1" }}
                  />
                </FormGroup>
              </Col>
            </Row>
          </ModalBody>
          <ModalFooter
            className="border-top bg-light d-flex justify-content-end gap-2"
            style={{ borderRadius: 0 }}
          >
            <Button
              type="button"
              color="light"
              className="border"
              onClick={() => setLogModalOpen(false)}
              disabled={logSubmitting}
              style={{ borderRadius: 0 }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="text-white fw-semibold px-4"
              disabled={logSubmitting}
              style={{
                backgroundColor: THEME.primary,
                borderColor: THEME.primary,
                borderRadius: 0,
              }}
            >
              {logSubmitting ? (
                <>
                  <Spinner size="sm" className="me-2" /> Saving...
                </>
              ) : (
                "Save Activity"
              )}
            </Button>
          </ModalFooter>
        </Form>
      </Modal>

      {/* ======================================================== */}
      {/* IN-PAGE MODAL: View Details Modal                        */}
      {/* ======================================================== */}
      <Modal
        isOpen={detailModalOpen}
        toggle={() => setDetailModalOpen(!detailModalOpen)}
        centered
        style={{ borderRadius: 0 }}
      >
        <ModalHeader
          toggle={() => setDetailModalOpen(false)}
          className="border-bottom"
        >
          <span className="fw-bold fs-16 text-dark">Interaction Details</span>
        </ModalHeader>
        <ModalBody className="p-4 bg-white">
          {activeItem && (
            <div className="d-flex flex-column gap-3 fs-13">
              <div>
                <div className="text-muted fs-11 text-uppercase fw-bold mb-1">
                  Title & Type
                </div>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <span className="fw-bold fs-15 text-dark">
                    {activeItem.title}
                  </span>
                  {getDirectionBadge(activeItem.direction)}
                </div>
              </div>

              <Row className="g-2 pt-2 border-top">
                <Col xs={6}>
                  <div className="text-muted fs-11">Date & Time</div>
                  <div className="fw-semibold text-dark mt-1">
                    {activeItem.date_label} at {activeItem.time_label}
                  </div>
                </Col>
                <Col xs={6}>
                  <div className="text-muted fs-11">Duration</div>
                  <div className="fw-semibold text-dark mt-1">
                    {activeItem.duration_label || "—"}
                  </div>
                </Col>
              </Row>

              <Row className="g-2 pt-2 border-top">
                <Col xs={6}>
                  <div className="text-muted fs-11">Contact Person</div>
                  <div className="fw-semibold text-dark mt-1">
                    {activeItem.contact_person || "—"}
                  </div>
                  {activeItem.contact_info && (
                    <div className="text-muted fs-12">
                      {activeItem.contact_info}
                    </div>
                  )}
                </Col>
                <Col xs={6}>
                  <div className="text-muted fs-11">Assigned Sales Rep</div>
                  <div className="fw-semibold text-dark mt-1">
                    {activeItem.employee_name || "—"}
                  </div>
                </Col>
              </Row>

              {activeItem.description && (
                <div className="pt-2 border-top">
                  <div className="text-muted fs-11 text-uppercase fw-bold mb-1">
                    Discussion Notes
                  </div>
                  <div
                    className="p-3 bg-light border text-dark"
                    style={{
                      borderRadius: 0,
                      borderColor: "#e2e8f0",
                      whiteSpace: "pre-line",
                      lineHeight: 1.55,
                    }}
                  >
                    {cleanDescription(activeItem.description)}
                  </div>
                </div>
              )}
            </div>
          )}
        </ModalBody>
        <ModalFooter className="border-top bg-light" style={{ borderRadius: 0 }}>
          <Button
            color="light"
            className="border"
            onClick={() => setDetailModalOpen(false)}
            style={{ borderRadius: 0 }}
          >
            Close
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default CommunicationTimelineTab;
