import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
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
import { deactivateActivity } from "../../../helpers/crmActivityApi";
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

const getTypeConfig = (type, isDark = false) => {
  const base = TYPE_CONFIG[type] || TYPE_CONFIG.CALL;
  if (!isDark) return base;
  const darkMap = {
    CALL: { color: "#34d399", bgColor: "rgba(5, 150, 105, 0.18)", borderColor: "rgba(5, 150, 105, 0.35)" },
    EMAIL: { color: "#60a5fa", bgColor: "rgba(37, 99, 235, 0.18)", borderColor: "rgba(37, 99, 235, 0.35)" },
    MEETING: { color: "#c084fc", bgColor: "rgba(124, 58, 237, 0.18)", borderColor: "rgba(124, 58, 237, 0.35)" },
    NOTE: { color: "#fbbf24", bgColor: "rgba(217, 119, 6, 0.18)", borderColor: "rgba(217, 119, 6, 0.35)" },
    TASK: { color: "#2dd4bf", bgColor: "rgba(13, 148, 136, 0.18)", borderColor: "rgba(13, 148, 136, 0.35)" },
    DOCUMENT: { color: "#fca5a5", bgColor: "rgba(127, 29, 29, 0.22)", borderColor: "rgba(127, 29, 29, 0.4)" },
  };
  return {
    ...base,
    color: darkMap[type]?.color || base.color,
    bgColor: darkMap[type]?.bgColor || base.bgColor,
    borderColor: darkMap[type]?.borderColor || base.borderColor,
  };
};

const getDirectionBadge = (dir, isDark = false) => {
  if (!dir) return null;
  const d = String(dir).toLowerCase();
  let style = {
    backgroundColor: isDark ? "rgba(255, 255, 255, 0.08)" : "#f1f5f9",
    color: isDark ? "#cbd5e1" : "#475569",
    border: isDark ? "1px solid #334155" : "1px solid #cbd5e1",
  };
  if (d.includes("outbound")) {
    style = {
      backgroundColor: isDark ? "rgba(5, 150, 105, 0.18)" : "#ecfdf5",
      color: isDark ? "#34d399" : "#047857",
      border: isDark ? "1px solid rgba(5, 150, 105, 0.35)" : "1px solid #a7f3d0",
    };
  } else if (d.includes("inbound")) {
    style = {
      backgroundColor: isDark ? "rgba(37, 99, 235, 0.18)" : "#eff6ff",
      color: isDark ? "#60a5fa" : "#1d4ed8",
      border: isDark ? "1px solid rgba(37, 99, 235, 0.35)" : "1px solid #bfdbfe",
    };
  } else if (d.includes("in person") || d.includes("person")) {
    style = {
      backgroundColor: isDark ? "rgba(124, 58, 237, 0.18)" : "#f5f3ff",
      color: isDark ? "#c084fc" : "#6d28d9",
      border: isDark ? "1px solid rgba(124, 58, 237, 0.35)" : "1px solid #ddd6fe",
    };
  } else if (d.includes("online")) {
    style = {
      backgroundColor: isDark ? "rgba(2, 132, 199, 0.18)" : "#e0f2fe",
      color: isDark ? "#38bdf8" : "#0369a1",
      border: isDark ? "1px solid rgba(2, 132, 199, 0.35)" : "1px solid #bae6fd",
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

const renderDateLabel = (label, isDark = false) => {
  if (!label) return null;
  const parts = label.trim().split(/\s+/);
  const textTitle = isDark ? "#f1f5f9" : "#0f172a";
  const textSub = isDark ? "#94a3b8" : "#64748b";
  if (parts[0] === "Today" || parts[0] === "Yesterday") {
    return (
      <div className="lh-sm">
        <div className="fw-bold fs-12" style={{ color: textTitle }}>{parts[0]}</div>
        <div className="fs-11 mt-0.5" style={{ color: textSub }}>{parts.slice(1).join(" ")}</div>
      </div>
    );
  }
  return <div className="fw-bold fs-12" style={{ color: textTitle }}>{label}</div>;
};

const CommunicationTimelineTab = ({
  accountId,
  customer,
  onEditCustomer,
  initialLogType = null,
}) => {
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
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [selectedOwnerId, setSelectedOwnerId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [limit, setLimit] = useState(25);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  // UI Dropdowns
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [statsPeriod, setStatsPeriod] = useState("This Month");
  const [statsPeriodOpen, setStatsPeriodOpen] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState(null);

  // Modals
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [activeItem, setActiveItem] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [deletingTitle, setDeletingTitle] = useState("");
  const [deleting, setDeleting] = useState(false);

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
          dateFrom: dateFrom ? new Date(`${dateFrom}T00:00:00`).toISOString() : undefined,
          dateTo: dateTo ? new Date(`${dateTo}T23:59:59.999`).toISOString() : undefined,
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
    setSearchInput("");
    setSearch("");
    setSelectedOwnerId("");
    setDateFrom("");
    setDateTo("");
  };

  // Load More Interactions (single fetch triggered via useEffect on limit change)
  const handleLoadMore = () => {
    setLoadingMore(true);
    setLimit((prev) => prev + 25);
  };

  // Copy note to clipboard
  const handleCopyNote = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(cleanDescription(text));
    toastSuccess("Discussion notes copied to clipboard.");
  };

  // Effective customer profile data (merged from summary API and props — zero fake fallbacks)
  const displayProfile = useMemo(() => {
    return {
      displayName: summary?.display_name || customer?.displayName || customer?.companyName || "Customer",
      industry: summary?.industry || customer?.department || customer?.partyProfile || "—",
      website: summary?.website || customer?.websiteUrl || "",
      phone: summary?.phone || customer?.phoneWork || customer?.phoneMobile || "",
      email: summary?.email || customer?.email || "",
      ownerName: summary?.owner_name || customer?.assignedOwnerName || "Unassigned",
      leadSource: summary?.lead_source || customer?.acquisitionSource || "—",
      status: summary?.status || customer?.status || "Active",
      location: summary?.location || customer?.placeOfSupply || "—",
      customerSince: summary?.customer_since || "—",
      partyType: summary?.party_type || customer?.partyType || "Customer",
    };
  }, [summary, customer]);

  // Delete Activity Handler
  const confirmDelete = (timelineId, title = "this activity") => {
    if (timelineId && String(timelineId).startsWith("ACT_")) {
      const actId = Number(String(timelineId).replace("ACT_", ""));
      setDeletingId(actId);
      setDeletingTitle(title);
      setDeleteModalOpen(true);
    }
  };

  const handleDeleteActivity = async () => {
    if (!deletingId) return;
    setDeleting(true);
    try {
      await deactivateActivity(deletingId);
      toastSuccess("Activity removed from timeline successfully.");
      setDeleteModalOpen(false);
      setDeletingId(null);
      setDeletingTitle("");
      await Promise.all([loadTimeline(false, limit), loadStats()]);
    } catch (err) {
      toastApiError(err, "Failed to delete activity.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="communication-timeline-wrapper">
      <Row className="g-4">
        {/* ======================================================== */}
        {/* Left Column: Timeline Stream & Filter Bar (8 Cols)       */}
        {/* ======================================================== */}
        <Col lg={8} xl={8}>
          {/* Top Filter & Search Action Bar */}
          <div
            className="d-flex align-items-center justify-content-between flex-wrap gap-2 p-2 mb-4 border"
            style={{ borderRadius: 0, backgroundColor: cardBg, borderColor: cardBorder }}
          >
            {/* Left: Interaction Type Dropdown */}
            <Dropdown
              isOpen={typeDropdownOpen}
              toggle={() => setTypeDropdownOpen(!typeDropdownOpen)}
            >
              <DropdownToggle
                color="light"
                size="sm"
                className="border fw-semibold d-flex align-items-center gap-2 px-3"
                style={{
                  borderRadius: 0,
                  backgroundColor: subtleBg,
                  borderColor: subtleBorder,
                  color: textTitle,
                  height: "36px",
                }}
              >
                <span>
                  {filterType === "ALL"
                    ? "All Interactions"
                    : TYPE_CONFIG[filterType]?.label || filterType}
                </span>
                <i className="ri-arrow-down-s-line fs-14" style={{ color: textSub }} />
              </DropdownToggle>
              <DropdownMenu
                style={{
                  borderRadius: 0,
                  backgroundColor: cardBg,
                  borderColor: cardBorder,
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.2)",
                }}
              >
                <DropdownItem
                  active={filterType === "ALL"}
                  onClick={() => setFilterType("ALL")}
                  style={{ borderRadius: 0, color: textTitle }}
                >
                  All Interactions
                </DropdownItem>
                {Object.keys(TYPE_CONFIG).map((k) => {
                  const cfg = getTypeConfig(k, isDark);
                  return (
                    <DropdownItem
                      key={k}
                      active={filterType === k}
                      onClick={() => setFilterType(k)}
                      style={{ borderRadius: 0, color: textTitle }}
                    >
                      <i
                        className={`${cfg.icon} me-2`}
                        style={{ color: cfg.color }}
                      />
                      {cfg.label}s
                    </DropdownItem>
                  );
                })}
              </DropdownMenu>
            </Dropdown>

            {/* Middle & Right: Search Input + Log Activity Button */}
            <div className="d-flex align-items-center gap-2 flex-grow-1 justify-content-end">
              <div
                className="input-group input-group-sm"
                style={{ maxWidth: "280px" }}
              >
                <span
                  className="input-group-text border-end-0"
                  style={{
                    borderRadius: 0,
                    borderColor: subtleBorder,
                    backgroundColor: isDark ? "#1a1d21" : "#ffffff",
                    color: textSub,
                  }}
                >
                  <i className="ri-search-line" />
                </span>
                <Input
                  type="text"
                  placeholder="Search in timeline..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="border-start-0 ps-1"
                  style={{
                    borderRadius: 0,
                    borderColor: subtleBorder,
                    backgroundColor: isDark ? "#1a1d21" : "#ffffff",
                    color: textTitle,
                    height: "36px",
                  }}
                />
                {searchInput && (
                  <button
                    type="button"
                    className="btn btn-sm border border-start-0"
                    onClick={() => {
                      setSearchInput("");
                      setSearch("");
                    }}
                    style={{
                      borderRadius: 0,
                      borderColor: subtleBorder,
                      backgroundColor: isDark ? "#1a1d21" : "#ffffff",
                      color: textSub,
                    }}
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
                  backgroundColor: primaryColor,
                  borderColor: primaryColor,
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
                className="text-center py-5 border"
                style={{ borderRadius: 0, backgroundColor: cardBg, borderColor: cardBorder }}
              >
                <Spinner size="sm" style={{ color: primaryColor }} />
                <div className="fs-13 mt-2" style={{ color: textSub }}>Loading timeline touchpoints...</div>
              </div>
            ) : timelineItems.length === 0 ? (
              <div
                className="text-center py-5 border"
                style={{ borderRadius: 0, backgroundColor: cardBg, borderColor: cardBorder }}
              >
                <div
                  className="d-inline-flex align-items-center justify-content-center mb-2"
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: 0,
                    backgroundColor: isDark ? "rgba(127, 29, 29, 0.2)" : "#fef2f2",
                    color: primaryColor,
                  }}
                >
                  <i className="ri-history-line fs-24" />
                </div>
                <h6 className="fw-bold mb-1" style={{ color: textTitle }}>No Interactions Found</h6>
                <p className="fs-13 mb-3" style={{ color: textSub }}>
                  No communication activities match your selected filters.
                </p>
                <div className="d-flex justify-content-center gap-2">
                  <Button
                    size="sm"
                    className="text-white fw-semibold"
                    onClick={() => handleOpenLogModal("CALL")}
                    style={{
                      backgroundColor: primaryColor,
                      borderColor: primaryColor,
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
                      style={{
                        borderRadius: 0,
                        backgroundColor: subtleBg,
                        borderColor: subtleBorder,
                        color: textTitle,
                      }}
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
                    backgroundColor: isDark ? "#262626" : "#e2e8f0",
                    zIndex: 1,
                  }}
                />

                {timelineItems.map((item, index) => {
                  const typeCfg = getTypeConfig(item.interaction_type, isDark);
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
                          renderDateLabel(item.date_label, isDark)
                        ) : (
                          <div className="fs-11 fw-medium" style={{ color: textSub }}>{item.date_label}</div>
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
                            border: isDark ? "2px solid #121212" : "2px solid #ffffff",
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
                        className="flex-grow-1 border mb-0 shadow-sm"
                        style={{
                          borderRadius: 0,
                          backgroundColor: cardBg,
                          borderColor: cardBorder,
                        }}
                      >
                        <CardBody className="p-3">
                          {/* Card Top: Title, Direction Badge, Time, Duration, Context Menu */}
                          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
                            <div className="d-flex align-items-center gap-2 flex-wrap">
                              <h6 className="fw-bold mb-0 fs-14" style={{ color: textTitle }}>
                                {item.title}
                              </h6>
                              {getDirectionBadge(item.direction, isDark)}
                              {item.status_badge && (
                                <span
                                  className="badge px-2 py-0.5 fs-10"
                                  style={{
                                    borderRadius: 0,
                                    backgroundColor: subtleBg,
                                    color: textSub,
                                    border: `1px solid ${subtleBorder}`,
                                    fontWeight: 600,
                                  }}
                                >
                                  {item.status_badge}
                                </span>
                              )}
                            </div>

                            <div className="d-flex align-items-center gap-2 fs-12" style={{ color: textSub }}>
                              <span className="fw-medium">{item.time_label}</span>
                              {item.duration_label && (
                                <span
                                  className="badge px-2 py-0.5 fs-11"
                                  style={{
                                    borderRadius: 0,
                                    backgroundColor: subtleBg,
                                    color: textTitle,
                                    border: `1px solid ${subtleBorder}`,
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
                                    backgroundColor: subtleBg,
                                    color: textSub,
                                    border: `1px solid ${subtleBorder}`,
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
                                  className="p-0 text-decoration-none"
                                  style={{ color: textSub }}
                                >
                                  <i className="ri-more-2-fill fs-16" />
                                </DropdownToggle>
                                <DropdownMenu
                                  end
                                  style={{
                                    borderRadius: 0,
                                    backgroundColor: cardBg,
                                    borderColor: cardBorder,
                                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.2)",
                                  }}
                                >
                                  <DropdownItem
                                    onClick={() => {
                                      setActiveItem(item);
                                      setDetailModalOpen(true);
                                    }}
                                    style={{ borderRadius: 0, color: textTitle }}
                                  >
                                    <i className="ri-eye-line me-2" style={{ color: textSub }} /> View Details
                                  </DropdownItem>
                                  {cleanedNotes && (
                                    <DropdownItem
                                      onClick={() => handleCopyNote(cleanedNotes)}
                                      style={{ borderRadius: 0, color: textTitle }}
                                    >
                                      <i className="ri-file-copy-line me-2" style={{ color: textSub }} /> Copy Notes
                                    </DropdownItem>
                                  )}
                                  <DropdownItem
                                    onClick={() => handleOpenLogModal("CALL")}
                                    style={{ borderRadius: 0, color: textTitle }}
                                  >
                                    <i className="ri-reply-line me-2" style={{ color: textSub }} /> Log Follow-up
                                  </DropdownItem>
                                  {item.timeline_id && String(item.timeline_id).startsWith("ACT_") && (
                                    <>
                                      <DropdownItem divider style={{ borderColor: cardBorder }} />
                                      <DropdownItem
                                        onClick={() => confirmDelete(item.timeline_id, item.title)}
                                        className="text-danger"
                                        style={{ borderRadius: 0 }}
                                      >
                                        <i className="ri-delete-bin-line me-2 text-danger" /> Delete Activity
                                      </DropdownItem>
                                    </>
                                  )}
                                </DropdownMenu>
                              </Dropdown>
                            </div>
                          </div>

                          {/* Card Body: Clean Discussion Text */}
                          {cleanedNotes && (
                            <p
                              className="fs-13 mb-3"
                              style={{
                                whiteSpace: "pre-line",
                                lineHeight: 1.55,
                                color: isDark ? "#cbd5e1" : "#334155",
                              }}
                            >
                              {cleanedNotes}
                            </p>
                          )}

                          {/* Card Footer: Contact Person & Staff Owner */}
                          <div
                            className="d-flex align-items-center gap-3 fs-12 pt-2 border-top flex-wrap"
                            style={{ borderColor: cardBorder, color: textSub }}
                          >
                            {item.contact_person && (
                              <div className="d-flex align-items-center gap-1 fw-medium" style={{ color: textTitle }}>
                                <i className="ri-user-line" style={{ color: textSub }} />
                                <span>{item.contact_person}</span>
                                {item.contact_info && (
                                  <span className="fw-normal ms-1" style={{ color: textSub }}>
                                    ({item.contact_info})
                                  </span>
                                )}
                              </div>
                            )}

                            {item.contact_person && item.employee_name && (
                              <span style={{ color: textSub, opacity: 0.5 }}>
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
                                    backgroundColor: primaryColor,
                                  }}
                                >
                                  {(item.employee_name[0] || "S").toUpperCase()}
                                </div>
                                <span className="fw-medium" style={{ color: textTitle }}>
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
                      className="border fw-semibold px-4 py-2 shadow-sm"
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      style={{
                        borderRadius: 0,
                        backgroundColor: subtleBg,
                        borderColor: subtleBorder,
                        color: textTitle,
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
            className="border shadow-sm mb-3"
            style={{ borderRadius: 0, backgroundColor: cardBg, borderColor: cardBorder }}
          >
            <CardBody className="p-3">
              <div
                className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom"
                style={{ borderColor: cardBorder }}
              >
                <h6 className="fw-bold mb-0 fs-14" style={{ color: textTitle }}>
                  {displayProfile.partyType?.toLowerCase() === "lead" ? "Lead Summary" : "Customer Summary"}
                </h6>
                {onEditCustomer && (
                  <button
                    type="button"
                    onClick={onEditCustomer}
                    className="btn btn-link p-0 text-decoration-none fs-12 fw-semibold d-inline-flex align-items-center gap-1"
                    style={{ color: primaryColor }}
                  >
                    <i className="ri-pencil-line" /> Edit
                  </button>
                )}
              </div>

              <div className="summary-fields-list d-flex flex-column gap-2 fs-12">
                <div className="d-flex justify-content-between align-items-center py-1">
                  <span style={{ color: textSub }}>Industry</span>
                  <span className="fw-semibold text-end" style={{ color: textTitle }}>
                    {displayProfile.industry}
                  </span>
                </div>

                <div className="d-flex justify-content-between align-items-center py-1">
                  <span style={{ color: textSub }}>Website</span>
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
                      style={{ color: primaryColor }}
                    >
                      {displayProfile.website.replace(/^https?:\/\//, "")}
                      <i className="ri-external-link-line fs-11" />
                    </a>
                  ) : (
                    <span style={{ color: textSub }}>—</span>
                  )}
                </div>

                <div className="d-flex justify-content-between align-items-center py-1">
                  <span style={{ color: textSub }}>Phone</span>
                  {displayProfile.phone ? (
                    <a
                      href={`tel:${displayProfile.phone}`}
                      className="text-decoration-none fw-semibold text-end"
                      style={{ color: textTitle }}
                    >
                      {displayProfile.phone}
                    </a>
                  ) : (
                    <span style={{ color: textSub }}>—</span>
                  )}
                </div>

                <div className="d-flex justify-content-between align-items-center py-1">
                  <span style={{ color: textSub }}>Email</span>
                  {displayProfile.email ? (
                    <a
                      href={`mailto:${displayProfile.email}`}
                      className="text-decoration-none fw-semibold text-end text-truncate"
                      style={{ maxWidth: "180px", color: textTitle }}
                    >
                      {displayProfile.email}
                    </a>
                  ) : (
                    <span style={{ color: textSub }}>—</span>
                  )}
                </div>

                <div className="d-flex justify-content-between align-items-center py-1">
                  <span style={{ color: textSub }}>Owner</span>
                  <div className="d-flex align-items-center gap-1.5">
                    <div
                      className="text-white d-inline-flex align-items-center justify-content-center fw-bold fs-10"
                      style={{
                        width: "18px",
                        height: "18px",
                        borderRadius: 0,
                        backgroundColor: primaryColor,
                      }}
                    >
                      {(displayProfile.ownerName[0] || "S").toUpperCase()}
                    </div>
                    <span className="fw-semibold" style={{ color: textTitle }}>
                      {displayProfile.ownerName}
                    </span>
                  </div>
                </div>

                <div className="d-flex justify-content-between align-items-center py-1">
                  <span style={{ color: textSub }}>Lead Source</span>
                  <span className="fw-semibold" style={{ color: textTitle }}>
                    {displayProfile.leadSource}
                  </span>
                </div>

                <div className="d-flex justify-content-between align-items-center py-1">
                  <span style={{ color: textSub }}>Status</span>
                  <span
                    className="badge px-2 py-1 fs-11"
                    style={{
                      borderRadius: 0,
                      backgroundColor: isDark ? "rgba(22, 163, 74, 0.2)" : "#dcfce7",
                      color: isDark ? "#4ade80" : "#15803d",
                      border: isDark ? "1px solid rgba(22, 163, 74, 0.35)" : "1px solid #bbf7d0",
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
            className="border shadow-sm mb-3"
            style={{ borderRadius: 0, backgroundColor: cardBg, borderColor: cardBorder }}
          >
            <CardBody className="p-3">
              <div
                className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom"
                style={{ borderColor: cardBorder }}
              >
                <h6 className="fw-bold mb-0 fs-14" style={{ color: textTitle }}>Interaction Stats</h6>
                <Dropdown
                  isOpen={statsPeriodOpen}
                  toggle={() => setStatsPeriodOpen(!statsPeriodOpen)}
                >
                  <DropdownToggle
                    color="link"
                    className="p-0 text-decoration-none fs-12 fw-semibold d-flex align-items-center gap-1"
                    style={{ color: textSub }}
                  >
                    <span>{statsPeriod}</span>
                    <i className="ri-arrow-down-s-line" />
                  </DropdownToggle>
                  <DropdownMenu
                    end
                    style={{
                      borderRadius: 0,
                      backgroundColor: cardBg,
                      borderColor: cardBorder,
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.2)",
                    }}
                  >
                    <DropdownItem
                      onClick={() => setStatsPeriod("This Month")}
                      style={{ borderRadius: 0, color: textTitle }}
                    >
                      This Month
                    </DropdownItem>
                    <DropdownItem
                      onClick={() => setStatsPeriod("This Week")}
                      style={{ borderRadius: 0, color: textTitle }}
                    >
                      This Week
                    </DropdownItem>
                    <DropdownItem
                      onClick={() => setStatsPeriod("All Time")}
                      style={{ borderRadius: 0, color: textTitle }}
                    >
                      All Time
                    </DropdownItem>
                  </DropdownMenu>
                </Dropdown>
              </div>

              {/* 2x3 Interactive Metric Tiles */}
              <Row className="g-2 text-start">
                {[
                  { key: "CALL", label: "Calls", count: stats.calls_count, icon: "ri-phone-line", color: "#059669", darkColor: "#34d399", bgLight: "#ecfdf5", bgDark: "rgba(5, 150, 105, 0.18)", borderDark: "rgba(5, 150, 105, 0.35)" },
                  { key: "EMAIL", label: "Emails", count: stats.emails_count, icon: "ri-mail-line", color: "#2563eb", darkColor: "#60a5fa", bgLight: "#eff6ff", bgDark: "rgba(37, 99, 235, 0.18)", borderDark: "rgba(37, 99, 235, 0.35)" },
                  { key: "MEETING", label: "Meetings", count: stats.meetings_count, icon: "ri-calendar-event-line", color: "#7c3aed", darkColor: "#c084fc", bgLight: "#f5f3ff", bgDark: "rgba(124, 58, 237, 0.18)", borderDark: "rgba(124, 58, 237, 0.35)" },
                  { key: "NOTE", label: "Notes", count: stats.notes_count, icon: "ri-file-text-line", color: "#d97706", darkColor: "#fbbf24", bgLight: "#fffbeb", bgDark: "rgba(217, 119, 6, 0.18)", borderDark: "rgba(217, 119, 6, 0.35)" },
                  { key: "TASK", label: "Tasks", count: stats.tasks_count, icon: "ri-checkbox-circle-line", color: "#0d9488", darkColor: "#2dd4bf", bgLight: "#f0fdfa", bgDark: "rgba(13, 148, 136, 0.18)", borderDark: "rgba(13, 148, 136, 0.35)" },
                  { key: "DOCUMENT", label: "Documents", count: stats.documents_count, icon: "ri-folder-line", color: "#7f1d1d", darkColor: "#fca5a5", bgLight: "#fef2f2", bgDark: "rgba(127, 29, 29, 0.22)", borderDark: "rgba(127, 29, 29, 0.4)" },
                ].map((tile) => {
                  const isSelected = filterType === tile.key;
                  return (
                    <Col xs={6} key={tile.key}>
                      <div
                        onClick={() => toggleFilterType(tile.key)}
                        className="p-2.5 border d-flex align-items-center gap-2 cursor-pointer shadow-sm transition"
                        title={isSelected ? "Click to show all" : `Click to filter ${tile.label}`}
                        style={{
                          borderRadius: 0,
                          borderColor: isSelected
                            ? (isDark ? tile.borderDark : tile.color)
                            : (isDark ? "#262626" : "#e2e8f0"),
                          backgroundColor: isSelected
                            ? (isDark ? tile.bgDark : tile.bgLight)
                            : (isDark ? "#161b22" : "#ffffff"),
                          cursor: "pointer",
                          borderWidth: isSelected ? "1.5px" : "1px",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <div
                          className="d-flex align-items-center justify-content-center flex-shrink-0"
                          style={{
                            width: "34px",
                            height: "34px",
                            borderRadius: 0,
                            backgroundColor: isDark ? tile.bgDark : tile.bgLight,
                            color: isDark ? tile.darkColor : tile.color,
                          }}
                        >
                          <i className={`${tile.icon} fs-17`} />
                        </div>
                        <div>
                          <div className="fw-bold fs-16 lh-1" style={{ color: textTitle }}>
                            {tile.count || 0}
                          </div>
                          <div className="fs-11 mt-1" style={{ color: textSub }}>{tile.label}</div>
                        </div>
                      </div>
                    </Col>
                  );
                })}
              </Row>
            </CardBody>
          </Card>

          {/* Card 3: Filter Timeline Panel with Live State Binding */}
          <Card
            className="border shadow-sm mb-3"
            style={{ borderRadius: 0, backgroundColor: cardBg, borderColor: cardBorder }}
          >
            <CardBody className="p-3">
              <div
                className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom"
                style={{ borderColor: cardBorder }}
              >
                <h6 className="fw-bold mb-0 fs-14" style={{ color: textTitle }}>Filter Timeline</h6>
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="btn btn-link p-0 text-decoration-none fs-12 fw-semibold"
                  style={{ color: primaryColor }}
                >
                  Clear All
                </button>
              </div>

              <div className="d-flex flex-column gap-3">
                {/* 1. Interaction Type Select */}
                <div>
                  <Label className="fs-12 fw-semibold mb-1" style={{ color: textSub }}>
                    Interaction Type
                  </Label>
                  <Input
                    type="select"
                    bsSize="sm"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    style={{
                      borderRadius: 0,
                      borderColor: subtleBorder,
                      backgroundColor: isDark ? "#1a1d21" : "#ffffff",
                      color: textTitle,
                    }}
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
                  <Label className="fs-12 fw-semibold mb-1" style={{ color: textSub }}>
                    Sales Rep / User
                  </Label>
                  <Input
                    type="select"
                    bsSize="sm"
                    value={selectedOwnerId}
                    onChange={(e) => setSelectedOwnerId(e.target.value)}
                    style={{
                      borderRadius: 0,
                      borderColor: subtleBorder,
                      backgroundColor: isDark ? "#1a1d21" : "#ffffff",
                      color: textTitle,
                    }}
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
                  <Label className="fs-12 fw-semibold mb-1" style={{ color: textSub }}>
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
                        style={{
                          borderRadius: 0,
                          borderColor: subtleBorder,
                          backgroundColor: isDark ? "#1a1d21" : "#ffffff",
                          color: textTitle,
                        }}
                      />
                    </Col>
                    <Col xs={6}>
                      <Input
                        type="date"
                        bsSize="sm"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        placeholder="To"
                        style={{
                          borderRadius: 0,
                          borderColor: subtleBorder,
                          backgroundColor: isDark ? "#1a1d21" : "#ffffff",
                          color: textTitle,
                        }}
                      />
                    </Col>
                  </Row>
                </div>

                {/* 4. Export Button */}
                <Button
                  color="light"
                  size="sm"
                  className="border fw-semibold w-100 py-2 d-flex align-items-center justify-content-center gap-2 mt-1 shadow-sm"
                  onClick={handleExportCsv}
                  style={{
                    borderRadius: 0,
                    backgroundColor: subtleBg,
                    borderColor: subtleBorder,
                    color: textTitle,
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
          style={{ backgroundColor: subtleBg, borderColor: cardBorder }}
        >
          <span className="fw-bold fs-16 d-flex align-items-center gap-2" style={{ color: textTitle }}>
            <span
              className="d-inline-flex align-items-center justify-content-center"
              style={{
                width: "28px",
                height: "28px",
                borderRadius: 0,
                backgroundColor: isDark ? "rgba(127, 29, 29, 0.25)" : "#fef2f2",
                color: primaryColor,
              }}
            >
              <i className="ri-calendar-event-line" />
            </span>
            Log Customer Interaction
          </span>
        </ModalHeader>
        <Form onSubmit={handleLogSubmit}>
          <ModalBody className="p-4" style={{ backgroundColor: cardBg, color: textTitle }}>
            {/* Modal Sub-tabs for Activity Type */}
            <div
              className="d-flex align-items-center gap-2 mb-4 p-1 border"
              style={{ backgroundColor: subtleBg, borderColor: subtleBorder, borderRadius: 0 }}
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
                      backgroundColor: isSelected ? primaryColor : "transparent",
                      color: isSelected ? "#ffffff" : textSub,
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
                  <Label className="fs-12 fw-semibold" style={{ color: textTitle }}>
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
                    style={{
                      borderRadius: 0,
                      borderColor: subtleBorder,
                      backgroundColor: isDark ? "#1a1d21" : "#ffffff",
                      color: textTitle,
                    }}
                  />
                </FormGroup>
              </Col>

              {/* Direction */}
              <Col md={4}>
                <FormGroup className="mb-0">
                  <Label className="fs-12 fw-semibold" style={{ color: textTitle }}>Direction</Label>
                  <Input
                    type="select"
                    value={logForm.direction}
                    onChange={(e) =>
                      setLogForm((prev) => ({ ...prev, direction: e.target.value }))
                    }
                    style={{
                      borderRadius: 0,
                      borderColor: subtleBorder,
                      backgroundColor: isDark ? "#1a1d21" : "#ffffff",
                      color: textTitle,
                    }}
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
                  <Label className="fs-12 fw-semibold" style={{ color: textTitle }}>
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
                    style={{
                      borderRadius: 0,
                      borderColor: subtleBorder,
                      backgroundColor: isDark ? "#1a1d21" : "#ffffff",
                      color: textTitle,
                    }}
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
                  <Label className="fs-12 fw-semibold" style={{ color: textTitle }}>
                    Contact Phone / Email
                  </Label>
                  <Input
                    type="text"
                    value={logForm.contactInfo}
                    onChange={(e) =>
                      setLogForm((prev) => ({ ...prev, contactInfo: e.target.value }))
                    }
                    placeholder="e.g. +91 98765 43210"
                    style={{
                      borderRadius: 0,
                      borderColor: subtleBorder,
                      backgroundColor: isDark ? "#1a1d21" : "#ffffff",
                      color: textTitle,
                    }}
                  />
                </FormGroup>
              </Col>

              {/* Date & Time */}
              <Col md={4}>
                <FormGroup className="mb-0">
                  <Label className="fs-12 fw-semibold" style={{ color: textTitle }}>Date & Time</Label>
                  <Input
                    type="datetime-local"
                    value={logForm.interactionTime}
                    onChange={(e) =>
                      setLogForm((prev) => ({
                        ...prev,
                        interactionTime: e.target.value,
                      }))
                    }
                    style={{
                      borderRadius: 0,
                      borderColor: subtleBorder,
                      backgroundColor: isDark ? "#1a1d21" : "#ffffff",
                      color: textTitle,
                    }}
                  />
                </FormGroup>
              </Col>

              {/* Duration Minutes */}
              <Col md={4}>
                <FormGroup className="mb-0">
                  <Label className="fs-12 fw-semibold" style={{ color: textTitle }}>
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
                    style={{
                      borderRadius: 0,
                      borderColor: subtleBorder,
                      backgroundColor: isDark ? "#1a1d21" : "#ffffff",
                      color: textTitle,
                    }}
                  />
                </FormGroup>
              </Col>

              {/* Sales Rep / Owner */}
              <Col md={4}>
                <FormGroup className="mb-0">
                  <Label className="fs-12 fw-semibold" style={{ color: textTitle }}>
                    Sales Rep / Owner
                  </Label>
                  <Input
                    type="select"
                    value={logForm.ownerId}
                    onChange={(e) =>
                      setLogForm((prev) => ({ ...prev, ownerId: e.target.value }))
                    }
                    style={{
                      borderRadius: 0,
                      borderColor: subtleBorder,
                      backgroundColor: isDark ? "#1a1d21" : "#ffffff",
                      color: textTitle,
                    }}
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
                  <Label className="fs-12 fw-semibold" style={{ color: textTitle }}>
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
                    style={{
                      borderRadius: 0,
                      borderColor: subtleBorder,
                      backgroundColor: isDark ? "#1a1d21" : "#ffffff",
                      color: textTitle,
                    }}
                  />
                </FormGroup>
              </Col>
            </Row>
          </ModalBody>
          <ModalFooter
            className="border-top d-flex justify-content-end gap-2"
            style={{ borderRadius: 0, backgroundColor: subtleBg, borderColor: cardBorder }}
          >
            <Button
              type="button"
              color="light"
              className="border"
              onClick={() => setLogModalOpen(false)}
              disabled={logSubmitting}
              style={{
                borderRadius: 0,
                backgroundColor: isDark ? "#212529" : "#ffffff",
                borderColor: subtleBorder,
                color: textTitle,
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="text-white fw-semibold px-4"
              disabled={logSubmitting}
              style={{
                backgroundColor: primaryColor,
                borderColor: primaryColor,
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
          style={{ backgroundColor: subtleBg, borderColor: cardBorder }}
        >
          <span className="fw-bold fs-16" style={{ color: textTitle }}>Interaction Details</span>
        </ModalHeader>
        <ModalBody className="p-4" style={{ backgroundColor: cardBg, color: textTitle }}>
          {activeItem && (
            <div className="d-flex flex-column gap-3 fs-13">
              <div>
                <div className="fs-11 text-uppercase fw-bold mb-1" style={{ color: textSub }}>
                  Title & Type
                </div>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <span className="fw-bold fs-15" style={{ color: textTitle }}>
                    {activeItem.title}
                  </span>
                  {getDirectionBadge(activeItem.direction, isDark)}
                </div>
              </div>

              <Row className="g-2 pt-2 border-top" style={{ borderColor: cardBorder }}>
                <Col xs={6}>
                  <div className="fs-11" style={{ color: textSub }}>Date & Time</div>
                  <div className="fw-semibold mt-1" style={{ color: textTitle }}>
                    {activeItem.date_label} at {activeItem.time_label}
                  </div>
                </Col>
                <Col xs={6}>
                  <div className="fs-11" style={{ color: textSub }}>Duration</div>
                  <div className="fw-semibold mt-1" style={{ color: textTitle }}>
                    {activeItem.duration_label || "—"}
                  </div>
                </Col>
              </Row>

              <Row className="g-2 pt-2 border-top" style={{ borderColor: cardBorder }}>
                <Col xs={6}>
                  <div className="fs-11" style={{ color: textSub }}>Contact Person</div>
                  <div className="fw-semibold mt-1" style={{ color: textTitle }}>
                    {activeItem.contact_person || "—"}
                  </div>
                  {activeItem.contact_info && (
                    <div className="fs-12" style={{ color: textSub }}>
                      {activeItem.contact_info}
                    </div>
                  )}
                </Col>
                <Col xs={6}>
                  <div className="fs-11" style={{ color: textSub }}>Assigned Sales Rep</div>
                  <div className="fw-semibold mt-1" style={{ color: textTitle }}>
                    {activeItem.employee_name || "—"}
                  </div>
                </Col>
              </Row>

              {activeItem.description && (
                <div className="pt-2 border-top" style={{ borderColor: cardBorder }}>
                  <div className="fs-11 text-uppercase fw-bold mb-1" style={{ color: textSub }}>
                    Discussion Notes
                  </div>
                  <div
                    className="p-3 border"
                    style={{
                      borderRadius: 0,
                      backgroundColor: subtleBg,
                      borderColor: subtleBorder,
                      color: textTitle,
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
        <ModalFooter
          className="border-top"
          style={{ borderRadius: 0, backgroundColor: subtleBg, borderColor: cardBorder }}
        >
          <Button
            color="light"
            className="border"
            onClick={() => setDetailModalOpen(false)}
            style={{
              borderRadius: 0,
              backgroundColor: isDark ? "#212529" : "#ffffff",
              borderColor: subtleBorder,
              color: textTitle,
            }}
          >
            Close
          </Button>
        </ModalFooter>
      </Modal>

      {/* ======================================================== */}
      {/* IN-PAGE MODAL: Confirm Delete Activity Modal             */}
      {/* ======================================================== */}
      <Modal
        isOpen={deleteModalOpen}
        toggle={() => setDeleteModalOpen(false)}
        centered
        style={{ borderRadius: 0 }}
      >
        <ModalHeader
          toggle={() => setDeleteModalOpen(false)}
          className="border-bottom text-danger"
          style={{ backgroundColor: subtleBg, borderColor: cardBorder }}
        >
          <span className="fw-bold fs-16 d-flex align-items-center gap-2">
            <span
              className="d-inline-flex align-items-center justify-content-center"
              style={{
                width: "28px",
                height: "28px",
                borderRadius: 0,
                backgroundColor: isDark ? "rgba(220, 38, 38, 0.2)" : "#fee2e2",
                color: "#dc2626",
              }}
            >
              <i className="ri-delete-bin-line" />
            </span>
            Confirm Delete Activity
          </span>
        </ModalHeader>
        <ModalBody className="p-4" style={{ backgroundColor: cardBg, color: textTitle }}>
          <p className="fs-13 mb-2" style={{ color: textTitle }}>
            Are you sure you want to remove <strong>"{deletingTitle || "this activity"}"</strong> from the customer timeline?
          </p>
          <div className="fs-12" style={{ color: textSub }}>
            This will permanently remove the logged activity and update customer interaction statistics.
          </div>
        </ModalBody>
        <ModalFooter
          className="border-top d-flex justify-content-end gap-2"
          style={{ borderRadius: 0, backgroundColor: subtleBg, borderColor: cardBorder }}
        >
          <Button
            color="light"
            className="border"
            onClick={() => setDeleteModalOpen(false)}
            disabled={deleting}
            style={{
              borderRadius: 0,
              backgroundColor: isDark ? "#212529" : "#ffffff",
              borderColor: subtleBorder,
              color: textTitle,
            }}
          >
            Cancel
          </Button>
          <Button
            color="danger"
            className="fw-semibold px-4"
            onClick={handleDeleteActivity}
            disabled={deleting}
            style={{ borderRadius: 0 }}
          >
            {deleting ? (
              <>
                <Spinner size="sm" className="me-2" /> Deleting...
              </>
            ) : (
              "Delete Activity"
            )}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default CommunicationTimelineTab;
