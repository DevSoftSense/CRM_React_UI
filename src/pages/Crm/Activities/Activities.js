import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  Col,
  Container,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownToggle,
  Form,
  Input,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Row,
  Spinner,
  Table,
} from "reactstrap";
import { Link } from "react-router-dom";
import DeleteModal from "../../../Components/Common/DeleteModal";
import PageHeader from "../components/PageHeader";
import {
  completeActivity,
  createActivity,
  deactivateActivity,
  getActivityById,
  getActivityLookups,
  getActivities,
  getActivityStats,
  getActivityCalendar,
  updateActivity,
} from "../../../helpers/crmActivityApi";
import { getOwnerDropdown } from "../../../helpers/crmOwnerApi";
import { getCustomerDropdown } from "../../../helpers/crmCustomerApi";
import { getContactDropdown } from "../../../helpers/crmContactApi";
import { toastApiError, toastSuccess } from "../../../helpers/crmToast";

const THEME = {
  primary: "#7f1d1d",
  primaryHover: "#991b1b",
  lightBg: "#fef2f2",
  grayBorder: "#e2e8f0",
  textMuted: "#64748b",
  textHeading: "#0f172a",
};

// Activity Type metadata (icons & brand colors)
const TYPE_CONFIG = {
  CALL: {
    label: "Call",
    icon: "ri-phone-line",
    bgColor: "#f0fdf4",
    textColor: "#16a34a",
    subtypes: ["Outbound", "Inbound"],
  },
  MEETING: {
    label: "Meeting",
    icon: "ri-calendar-event-line",
    bgColor: "#eff6ff",
    textColor: "#2563eb",
    subtypes: ["In Person", "Online", "Demo"],
  },
  EMAIL: {
    label: "Email",
    icon: "ri-mail-line",
    bgColor: "#f0f9ff",
    textColor: "#0284c7",
    subtypes: ["Outbound", "Inbound"],
  },
  TASK: {
    label: "Task",
    icon: "ri-checkbox-circle-line",
    bgColor: "#fffbeb",
    textColor: "#d97706",
    subtypes: ["Follow-up", "To Do", "Review"],
  },
  DEMO: {
    label: "Demo",
    icon: "ri-slideshow-line",
    bgColor: "#faf5ff",
    textColor: "#9333ea",
    subtypes: ["Product Demo", "Technical Walkthrough"],
  },
  VISIT: {
    label: "Visit",
    icon: "ri-map-pin-line",
    bgColor: "#fdf2f8",
    textColor: "#db2777",
    subtypes: ["On-Site", "Office Visit"],
  },
};

const pad = (n) => String(n).padStart(2, "0");

const toDatetimeLocalValue = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const formatTimeStr = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const formatDateStr = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const Activities = () => {
  document.title = "Activities | SoftOnCloud CRM";

  // Active Tab: 'ALL' | 'CALL' | 'MEETING' | 'EMAIL' | 'TASK'
  const [activeTab, setActiveTab] = useState("ALL");

  // Filters State
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateRangeFrom, setDateRangeFrom] = useState("");
  const [dateRangeTo, setDateRangeTo] = useState("");
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(null);

  // Pagination
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Data lists
  const [activities, setActivities] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");

  // Lookups & Dropdowns
  const [lookups, setLookups] = useState({ activity_type: [], activity_status: [] });
  const [ownerOptions, setOwnerOptions] = useState([]);
  const [accountOptions, setAccountOptions] = useState([]);
  const [contactOptions, setContactOptions] = useState([]);

  // Stats State (KPIs, Donut chart, Today's schedule)
  const [stats, setStats] = useState({
    total_activities: 0,
    meetings_count: 0,
    calls_count: 0,
    emails_count: 0,
    tasks_count: 0,
    summary: {
      meetings_count: 0,
      meetings_pct: 0,
      calls_count: 0,
      calls_pct: 0,
      emails_count: 0,
      emails_pct: 0,
      tasks_count: 0,
      tasks_pct: 0,
    },
    today_schedule: [],
  });

  // Calendar View State (Month/Year)
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

  // Modal State (Log / Schedule / Edit)
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("schedule"); // 'schedule' | 'log' | 'edit'
  const [editingId, setEditingId] = useState(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    subject: "",
    actType: "CALL",
    actSubtype: "Outbound",
    startTime: toDatetimeLocalValue(new Date()),
    endTime: "",
    phoneNumber: "",
    callNotes: "",
    employeeId: "",
    accountId: "",
    contactPersonId: "",
    isCompleted: false,
  });

  // Delete Modal
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // More Options Header Dropdown
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(0);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Load Lookups, Owners, Accounts
  useEffect(() => {
    const initLookups = async () => {
      try {
        const [lookupRes, ownersRes, accountsRes] = await Promise.all([
          getActivityLookups().catch(() => ({})),
          getOwnerDropdown().catch(() => []),
          getCustomerDropdown({ limit: 200 }).catch(() => []),
        ]);
        setLookups(lookupRes || {});
        setOwnerOptions(Array.isArray(ownersRes) ? ownersRes : ownersRes?.items || []);
        setAccountOptions(Array.isArray(accountsRes) ? accountsRes : accountsRes?.items || []);
      } catch (err) {
        console.error("Init lookups failed", err);
      }
    };
    initLookups();
  }, []);

  // Load Contacts when Account changes in Modal
  const handleAccountChange = async (accId) => {
    setFormData((prev) => ({ ...prev, accountId: accId, contactPersonId: "" }));
    if (accId) {
      try {
        const res = await getContactDropdown({ accountId: Number(accId), limit: 100 });
        setContactOptions(Array.isArray(res) ? res : res?.items || []);
      } catch {
        setContactOptions([]);
      }
    } else {
      setContactOptions([]);
    }
  };

  // Load Stats from backend (or compute fallback)
  const loadStats = useCallback(async () => {
    try {
      const res = await getActivityStats();
      if (res && res.total_activities != null) {
        setStats(res);
        return;
      }
    } catch {
      // Backend stats endpoint fallback calculation
    }

    // Fallback calculation using calendar/month items
    try {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
      const monthData = await getActivities({ startFrom: firstDay, startTo: lastDay, limit: 500 });
      const rows = monthData?.items || monthData?.Items || [];
      const total = rows.length;
      const meetings = rows.filter((r) => (r.actType || "").toUpperCase() === "MEETING").length;
      const calls = rows.filter((r) => (r.actType || "").toUpperCase() === "CALL").length;
      const emails = rows.filter((r) => (r.actType || "").toUpperCase() === "EMAIL").length;
      const tasks = rows.filter((r) => (r.actType || "").toUpperCase() === "TASK").length;

      const base = total > 0 ? total : 1;
      const todayStr = new Date().toISOString().slice(0, 10);
      const todaySched = rows
        .filter((r) => r.startTime && String(r.startTime).slice(0, 10) === todayStr)
        .map((r) => ({
          activity_id: r.activityId,
          subject: r.subject,
          act_type: r.actType,
          start_time: r.startTime,
          time_str: formatTimeStr(r.startTime),
          related_to: r.relatedTo || "Direct Client",
          with_name: r.withName || "Decision Maker",
          activity_status: r.activityStatus,
        }));

      setStats({
        total_activities: total,
        meetings_count: meetings,
        calls_count: calls,
        emails_count: emails,
        tasks_count: tasks,
        summary: {
          meetings_count: meetings,
          meetings_pct: Number(((meetings * 100) / base).toFixed(1)),
          calls_count: calls,
          calls_pct: Number(((calls * 100) / base).toFixed(1)),
          emails_count: emails,
          emails_pct: Number(((emails * 100) / base).toFixed(1)),
          tasks_count: tasks,
          tasks_pct: Number(((tasks * 100) / base).toFixed(1)),
        },
        today_schedule: todaySched,
      });
    } catch {
      // silent fallback
    }
  }, []);

  // Load Main Activity Table
  const loadActivitiesList = useCallback(async () => {
    setListLoading(true);
    setListError("");
    try {
      // Effective type from tab or filter
      const effectiveType = activeTab !== "ALL" ? activeTab : typeFilter || undefined;

      // Effective date filter (either specific day from calendar, or date range)
      let fromDate = dateRangeFrom ? new Date(dateRangeFrom).toISOString() : undefined;
      let toDate = dateRangeTo ? new Date(dateRangeTo + "T23:59:59").toISOString() : undefined;

      if (selectedCalendarDate) {
        fromDate = new Date(selectedCalendarDate + "T00:00:00").toISOString();
        toDate = new Date(selectedCalendarDate + "T23:59:59").toISOString();
      }

      const res = await getActivities({
        search: search || undefined,
        actType: effectiveType,
        activityStatus: statusFilter || undefined,
        employeeId: ownerFilter ? Number(ownerFilter) : undefined,
        startFrom: fromDate,
        startTo: toDate,
        limit: pageSize,
        offset: page * pageSize,
      });

      const rows = res?.items || res?.Items || [];
      setActivities(rows);
      setTotalCount(Number(res?.totalCount ?? res?.TotalCount ?? rows[0]?.totalCount ?? 0));
    } catch (err) {
      setActivities([]);
      setTotalCount(0);
      const msg = err?.message || "Failed to load activities.";
      setListError(msg);
      toastApiError(err, msg);
    } finally {
      setListLoading(false);
    }
  }, [
    activeTab,
    typeFilter,
    statusFilter,
    ownerFilter,
    dateRangeFrom,
    dateRangeTo,
    selectedCalendarDate,
    search,
    pageSize,
    page,
  ]);

  // Load Calendar dots for current month
  const loadCalendarMonthData = useCallback(async () => {
    try {
      const start = new Date(calendarYear, calendarMonth, 1).toISOString();
      const end = new Date(calendarYear, calendarMonth + 1, 0, 23, 59, 59).toISOString();
      const res = await getActivityCalendar({ startFrom: start, startTo: end });
      const events = res?.items || res?.Items || [];
      setCalendarEvents(events);
    } catch {
      setCalendarEvents([]);
    }
  }, [calendarYear, calendarMonth]);

  useEffect(() => {
    loadActivitiesList();
  }, [loadActivitiesList]);

  useEffect(() => {
    loadStats();
    loadCalendarMonthData();
  }, [loadStats, loadCalendarMonthData]);

  // Handle Tab Switch
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setPage(0);
  };

  // Clean and parse metadata tags from call notes
  const parseCallNotes = (rawNotes) => {
    if (!rawNotes) return { subtype: "", related: "", withName: "", notes: "" };

    let subtype = "";
    let related = "";
    let withName = "";

    // Match structured tag: [Subtype: X | Related: Y | With: Z]
    const tagRegex = /\[(?:Subtype:\s*([^\|\]]+))?(?:\s*\|\s*Related:\s*([^\|\]]+))?(?:\s*\|\s*With:\s*([^\]]+))?\]/gi;
    let match;
    while ((match = tagRegex.exec(rawNotes)) !== null) {
      if (match[1] && match[1].trim()) subtype = match[1].trim();
      if (match[2] && match[2].trim()) related = match[2].trim();
      if (match[3] && match[3].trim()) withName = match[3].trim();
    }

    // Also catch standalone [Subtype: X], [Related: Y], [With: Z]
    const subMatch = rawNotes.match(/\[Subtype:\s*([^\|\]]+)\]/i);
    if (subMatch && subMatch[1]) subtype = subMatch[1].trim();

    const relMatch = rawNotes.match(/\[Related:\s*([^\|\]]+)\]/i);
    if (relMatch && relMatch[1]) related = relMatch[1].trim();

    const withMatch = rawNotes.match(/\[With:\s*([^\|\]]+)\]/i);
    if (withMatch && withMatch[1]) withName = withMatch[1].trim();

    // Strip ALL bracket metadata lines/tags from the actual user notes
    const cleanNotes = rawNotes
      .replace(/\[(?:Subtype|Related|With)[^\]]*\]\s*/gi, "")
      .trim();

    return { subtype, related, withName, notes: cleanNotes };
  };

  // Open Create / Schedule / Edit Modal
  const openModal = async (mode = "schedule", existing = null) => {
    setModalMode(mode);
    setEditingId(existing ? existing.activityId : null);

    if (existing) {
      const parsed = parseCallNotes(existing.callNotes);
      const isComp = (existing.activityStatus || "").toUpperCase() === "COMPLETED";

      // Match related account
      const searchRelated = (existing.relatedTo || parsed.related || "").toLowerCase().trim();
      const matchedAcc = accountOptions.find(
        (a) =>
          (searchRelated &&
            ((a.displayName || "").toLowerCase().includes(searchRelated) ||
             (a.companyName || "").toLowerCase().includes(searchRelated) ||
             searchRelated.includes((a.displayName || "").toLowerCase()) ||
             searchRelated.includes((a.companyName || "").toLowerCase()))) ||
          (existing.accountId && String(a.accountId) === String(existing.accountId))
      );

      const accId = matchedAcc ? String(matchedAcc.accountId) : "";
      let contacts = [];
      let contactId = "";

      if (accId) {
        try {
          const res = await getContactDropdown({ accountId: Number(accId), limit: 100 });
          contacts = Array.isArray(res) ? res : res?.items || [];
          const searchWith = (existing.withName || parsed.withName || "").toLowerCase().trim();
          const matchedContact = contacts.find(
            (c) =>
              searchWith &&
              ((c.fullName || "").toLowerCase().includes(searchWith) ||
               `${c.firstName || ""} ${c.lastName || ""}`.trim().toLowerCase().includes(searchWith) ||
               searchWith.includes((c.fullName || "").toLowerCase()))
          );
          if (matchedContact) {
            contactId = String(matchedContact.contactPersonId);
          }
        } catch {
          contacts = [];
        }
      }
      setContactOptions(contacts);

      setFormData({
        subject: existing.subject || "",
        actType: (existing.actType || "CALL").toUpperCase(),
        actSubtype: existing.actSubtype || parsed.subtype || "General",
        startTime: toDatetimeLocalValue(existing.startTime),
        endTime: isComp && existing.endTime ? toDatetimeLocalValue(existing.endTime) : "",
        phoneNumber: existing.callNumber || "",
        callNotes: parsed.notes || "",
        employeeId: existing.employeeId ? String(existing.employeeId) : "",
        accountId: accId,
        contactPersonId: contactId,
        isCompleted: isComp,
      });
    } else {
      const now = new Date();
      const later = new Date(now.getTime() + 30 * 60000);
      setFormData({
        subject: "",
        actType: mode === "log" ? "CALL" : "MEETING",
        actSubtype: mode === "log" ? "Outbound" : "In Person",
        startTime: toDatetimeLocalValue(now),
        endTime: mode === "log" ? toDatetimeLocalValue(later) : "",
        phoneNumber: "",
        callNotes: "",
        employeeId: ownerOptions[0]?.ownerId || ownerOptions[0]?.employeeId || "",
        accountId: "",
        contactPersonId: "",
        isCompleted: mode === "log",
      });
      setContactOptions([]);
    }
    setModalOpen(true);
  };

  // Submit Modal (Create / Update)
  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!formData.subject.trim()) {
      toastApiError(null, "Subject is required.");
      return;
    }
    if (!formData.startTime) {
      toastApiError(null, "Start time is required.");
      return;
    }

    setModalSubmitting(true);
    try {
      // Build clean structured notes without repetitive headers
      const selectedAcc = accountOptions.find((a) => String(a.accountId) === String(formData.accountId));
      const selectedContact = contactOptions.find(
        (c) => String(c.contactPersonId) === String(formData.contactPersonId)
      );

      // Strip any bracket tags from formData.callNotes
      const cleanUserNotes = (formData.callNotes || "")
        .replace(/\[(?:Subtype|Related|With)[^\]]*\]\s*/gi, "")
        .trim();

      const parts = [];
      if (formData.actSubtype) {
        parts.push(`Subtype: ${formData.actSubtype}`);
      }
      if (selectedAcc) {
        parts.push(`Related: ${selectedAcc.displayName || selectedAcc.companyName}`);
      }
      if (selectedContact) {
        parts.push(`With: ${selectedContact.fullName || selectedContact.firstName}`);
      }

      let combinedNotes = cleanUserNotes;
      if (parts.length > 0) {
        const header = `[${parts.join(" | ")}]`;
        combinedNotes = cleanUserNotes ? `${header}\n${cleanUserNotes}` : header;
      }

      // Determine final endTime based on isCompleted
      // If user checked "Mark as Completed", provide timestamp.
      // If user UNCHECKED "Mark as Completed", endTime MUST BE NULL so status is SCHEDULED or PENDING!
      let finalEndTime = null;
      if (formData.isCompleted) {
        finalEndTime = formData.endTime ? new Date(formData.endTime).toISOString() : new Date().toISOString();
      } else {
        finalEndTime = null;
      }

      const payload = {
        subject: formData.subject.trim(),
        actType: formData.actType || "CALL",
        startTime: new Date(formData.startTime).toISOString(),
        endTime: finalEndTime,
        callNumber: formData.phoneNumber.trim() || null,
        callNotes: combinedNotes || null,
        employeeId: formData.employeeId ? Number(formData.employeeId) : undefined,
      };

      if (editingId) {
        await updateActivity(editingId, payload);
        toastSuccess("Activity updated successfully.");
      } else {
        await createActivity(payload);
        toastSuccess(modalMode === "log" ? "Activity logged successfully." : "Activity scheduled successfully.");
      }

      setModalOpen(false);
      await Promise.all([loadActivitiesList(), loadStats(), loadCalendarMonthData()]);
    } catch (err) {
      toastApiError(err, "Failed to save activity.");
    } finally {
      setModalSubmitting(false);
    }
  };

  // Mark Activity Completed
  const handleMarkComplete = async (act) => {
    try {
      await completeActivity(act.activityId);
      toastSuccess(`Marked "${act.subject}" as Completed.`);
      await Promise.all([loadActivitiesList(), loadStats()]);
    } catch (err) {
      toastApiError(err, "Failed to mark activity as completed.");
    }
  };

  // Delete Activity
  const handleDeleteActivity = (act) => {
    setDeleteTarget(act);
    setDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget?.activityId) return;
    setDeleting(true);
    try {
      await deactivateActivity(deleteTarget.activityId);
      toastSuccess("Activity deleted.");
      setDeleteModal(false);
      setDeleteTarget(null);
      await Promise.all([loadActivitiesList(), loadStats(), loadCalendarMonthData()]);
    } catch (err) {
      toastApiError(err, "Failed to delete activity.");
    } finally {
      setDeleting(false);
    }
  };

  // Calendar Helpers (Generate days of month with previous/next month trailing days)
  const calendarDays = useMemo(() => {
    const year = calendarYear;
    const month = calendarMonth;
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days = [];

    // 1. Trailing days of previous month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      const dateStr = `${prevYear}-${pad(prevMonth + 1)}-${pad(d)}`;
      days.push({
        dayNumber: d,
        dateStr,
        isOtherMonth: true,
        events: [],
      });
    }

    // 2. Days of current month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${pad(month + 1)}-${pad(d)}`;
      const dayEvents = calendarEvents.filter(
        (ev) => ev.startTime && String(ev.startTime).slice(0, 10) === dateStr
      );
      days.push({
        dayNumber: d,
        dateStr,
        isOtherMonth: false,
        events: dayEvents,
        hasCall: dayEvents.some((e) => (e.actType || "").toUpperCase() === "CALL"),
        hasMeeting: dayEvents.some((e) => (e.actType || "").toUpperCase() === "MEETING"),
        hasEmail: dayEvents.some((e) => (e.actType || "").toUpperCase() === "EMAIL"),
        hasTask: dayEvents.some((e) => (e.actType || "").toUpperCase() === "TASK"),
      });
    }

    // 3. Leading days of next month to balance grid (35 or 42 cells)
    const totalCells = days.length;
    const targetCells = totalCells <= 35 ? 35 : 42;
    const nextDaysCount = targetCells - totalCells;
    for (let d = 1; d <= nextDaysCount; d++) {
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      const dateStr = `${nextYear}-${pad(nextMonth + 1)}-${pad(d)}`;
      days.push({
        dayNumber: d,
        dateStr,
        isOtherMonth: true,
        events: [],
      });
    }

    return days;
  }, [calendarYear, calendarMonth, calendarEvents]);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear((y) => y - 1);
    } else {
      setCalendarMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear((y) => y + 1);
    } else {
      setCalendarMonth((m) => m + 1);
    }
  };

  const handleDayClick = (day) => {
    if (!day.dateStr || day.isOtherMonth) return;
    if (selectedCalendarDate === day.dateStr) {
      setSelectedCalendarDate(null);
    } else {
      setSelectedCalendarDate(day.dateStr);
    }
    setPage(0);
  };

  return (
    <div className="page-content">
      <Container fluid>
        {/* Top Header Bar */}
        <div className="d-flex flex-wrap justify-content-between align-items-center mb-3">
          <div>
            <nav aria-label="breadcrumb">
              <ol className="breadcrumb mb-1 text-muted small">
                <li className="breadcrumb-item">
                  <Link to="/crm/dashboard" style={{ color: THEME.textMuted }}>CRM</Link>
                </li>
                <li className="breadcrumb-item active text-dark fw-semibold" aria-current="page">
                  Activities
                </li>
              </ol>
            </nav>
            <h4 className="fw-bold mb-0" style={{ color: THEME.textHeading }}>
              Activities
            </h4>
            <p className="text-muted small mb-0">Manage calls, meetings, emails and tasks</p>
          </div>

          <div className="d-flex align-items-center gap-2 mt-2 mt-sm-0">
            <Button
              type="button"
              className="rounded-0 px-3 fw-medium text-white shadow-sm"
              style={{ backgroundColor: THEME.primary, borderColor: THEME.primary }}
              onClick={() => openModal("log")}
            >
              <i className="ri-add-line me-1" />
              Log Activity
            </Button>
            <Button
              type="button"
              className="rounded-0 px-3 fw-medium shadow-sm"
              style={{
                backgroundColor: "#ffffff",
                color: THEME.primary,
                border: `1px solid ${THEME.primary}`,
              }}
              onClick={() => openModal("schedule")}
            >
              <i className="ri-calendar-line me-1" />
              Schedule Activity
            </Button>

            <Dropdown isOpen={moreOptionsOpen} toggle={() => setMoreOptionsOpen(!moreOptionsOpen)}>
              <DropdownToggle
                color="light"
                className="rounded-0 border px-2 text-muted shadow-none"
              >
                <i className="ri-more-2-fill fs-5" />
              </DropdownToggle>
              <DropdownMenu end className="rounded-0 shadow-sm border">
                <DropdownItem onClick={() => { loadActivitiesList(); loadStats(); }}>
                  <i className="ri-refresh-line me-2 text-muted" />
                  Refresh Activities
                </DropdownItem>
                <DropdownItem tag={Link} to="/crm/calendar">
                  <i className="ri-calendar-2-line me-2 text-muted" />
                  Open Full Calendar
                </DropdownItem>
                <DropdownItem divider />
                <DropdownItem onClick={() => {
                  setSelectedCalendarDate(null);
                  setTypeFilter("");
                  setOwnerFilter("");
                  setStatusFilter("");
                  setDateRangeFrom("");
                  setDateRangeTo("");
                  setSearchInput("");
                  setSearch("");
                }}>
                  <i className="ri-filter-off-line me-2 text-muted" />
                  Clear All Filters
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>
        </div>

        {/* 5 Stat Metric KPI Cards */}
        <Row className="g-3 mb-3">
          {/* Card 1: Total Activities */}
          <Col xl={2} lg={4} md={4} sm={6} className="flex-fill">
            <Card className="rounded-0 border shadow-none mb-0 h-100" style={{ borderColor: THEME.grayBorder }}>
              <CardBody className="p-3 d-flex align-items-center gap-3">
                <div
                  className="d-flex align-items-center justify-content-center rounded-0 flex-shrink-0"
                  style={{ width: 42, height: 42, backgroundColor: "#f5f3ff", color: "#8b5cf6", fontSize: 20 }}
                >
                  <i className="ri-pulse-line" />
                </div>
                <div>
                  <h3 className="fw-bold mb-0" style={{ color: THEME.textHeading, fontSize: 22, lineHeight: 1.1 }}>
                    {stats.total_activities}
                  </h3>
                  <div className="small fw-semibold text-muted">Total Activities</div>
                  <span className="text-muted" style={{ fontSize: 11 }}>This Month</span>
                </div>
              </CardBody>
            </Card>
          </Col>

          {/* Card 2: Meetings */}
          <Col xl={2} lg={4} md={4} sm={6} className="flex-fill">
            <Card className="rounded-0 border shadow-none mb-0 h-100" style={{ borderColor: THEME.grayBorder }}>
              <CardBody className="p-3 d-flex align-items-center gap-3">
                <div
                  className="d-flex align-items-center justify-content-center rounded-0 flex-shrink-0"
                  style={{ width: 42, height: 42, backgroundColor: "#eff6ff", color: "#2563eb", fontSize: 20 }}
                >
                  <i className="ri-calendar-event-line" />
                </div>
                <div>
                  <h3 className="fw-bold mb-0" style={{ color: THEME.textHeading, fontSize: 22, lineHeight: 1.1 }}>
                    {stats.meetings_count}
                  </h3>
                  <div className="small fw-semibold text-muted">Meetings</div>
                  <span className="text-muted" style={{ fontSize: 11 }}>This Month</span>
                </div>
              </CardBody>
            </Card>
          </Col>

          {/* Card 3: Calls */}
          <Col xl={2} lg={4} md={4} sm={6} className="flex-fill">
            <Card className="rounded-0 border shadow-none mb-0 h-100" style={{ borderColor: THEME.grayBorder }}>
              <CardBody className="p-3 d-flex align-items-center gap-3">
                <div
                  className="d-flex align-items-center justify-content-center rounded-0 flex-shrink-0"
                  style={{ width: 42, height: 42, backgroundColor: "#f0fdf4", color: "#16a34a", fontSize: 20 }}
                >
                  <i className="ri-phone-line" />
                </div>
                <div>
                  <h3 className="fw-bold mb-0" style={{ color: THEME.textHeading, fontSize: 22, lineHeight: 1.1 }}>
                    {stats.calls_count}
                  </h3>
                  <div className="small fw-semibold text-muted">Calls</div>
                  <span className="text-muted" style={{ fontSize: 11 }}>This Month</span>
                </div>
              </CardBody>
            </Card>
          </Col>

          {/* Card 4: Emails */}
          <Col xl={2} lg={4} md={4} sm={6} className="flex-fill">
            <Card className="rounded-0 border shadow-none mb-0 h-100" style={{ borderColor: THEME.grayBorder }}>
              <CardBody className="p-3 d-flex align-items-center gap-3">
                <div
                  className="d-flex align-items-center justify-content-center rounded-0 flex-shrink-0"
                  style={{ width: 42, height: 42, backgroundColor: "#f0f9ff", color: "#0284c7", fontSize: 20 }}
                >
                  <i className="ri-mail-line" />
                </div>
                <div>
                  <h3 className="fw-bold mb-0" style={{ color: THEME.textHeading, fontSize: 22, lineHeight: 1.1 }}>
                    {stats.emails_count}
                  </h3>
                  <div className="small fw-semibold text-muted">Emails</div>
                  <span className="text-muted" style={{ fontSize: 11 }}>This Month</span>
                </div>
              </CardBody>
            </Card>
          </Col>

          {/* Card 5: Tasks */}
          <Col xl={2} lg={4} md={4} sm={6} className="flex-fill">
            <Card className="rounded-0 border shadow-none mb-0 h-100" style={{ borderColor: THEME.grayBorder }}>
              <CardBody className="p-3 d-flex align-items-center gap-3">
                <div
                  className="d-flex align-items-center justify-content-center rounded-0 flex-shrink-0"
                  style={{ width: 42, height: 42, backgroundColor: "#fffbeb", color: "#d97706", fontSize: 20 }}
                >
                  <i className="ri-checkbox-circle-line" />
                </div>
                <div>
                  <h3 className="fw-bold mb-0" style={{ color: THEME.textHeading, fontSize: 22, lineHeight: 1.1 }}>
                    {stats.tasks_count}
                  </h3>
                  <div className="small fw-semibold text-muted">Tasks</div>
                  <span className="text-muted" style={{ fontSize: 11 }}>This Month</span>
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>

        {/* Tabs & Filter Bar */}
        <div
          className="d-flex flex-wrap justify-content-between align-items-center mb-3 p-2 bg-white border"
          style={{ borderColor: THEME.grayBorder }}
        >
          {/* Left Tabs */}
          <div className="d-flex gap-1 overflow-auto">
            {[
              { id: "ALL", label: "All Activities" },
              { id: "CALL", label: "Calls" },
              { id: "MEETING", label: "Meetings" },
              { id: "EMAIL", label: "Emails" },
              { id: "TASK", label: "Tasks" },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  className="btn btn-sm rounded-0 fw-medium px-3 py-1 position-relative"
                  style={{
                    backgroundColor: isActive ? THEME.lightBg : "transparent",
                    color: isActive ? THEME.primary : THEME.textMuted,
                    borderBottom: isActive ? `2px solid ${THEME.primary}` : "2px solid transparent",
                    borderTop: "none",
                    borderLeft: "none",
                    borderRight: "none",
                  }}
                  onClick={() => handleTabChange(tab.id)}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Right Filter Dropdowns */}
          <div className="d-flex flex-wrap align-items-center gap-2 mt-2 mt-lg-0">
            {/* Search Input */}
            <div className="position-relative" style={{ width: 180 }}>
              <Input
                type="text"
                className="form-control form-control-sm rounded-0 pe-4"
                placeholder="Search activities..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              <i className="ri-search-line position-absolute top-50 end-0 translate-middle-y me-2 text-muted" />
            </div>

            {/* Owner Filter */}
            <Input
              type="select"
              className="form-select form-select-sm rounded-0"
              style={{ width: 130 }}
              value={ownerFilter}
              onChange={(e) => { setOwnerFilter(e.target.value); setPage(0); }}
            >
              <option value="">All Owners</option>
              {ownerOptions.map((o) => (
                <option key={o.ownerId || o.employeeId} value={o.ownerId || o.employeeId}>
                  {o.fullName || o.ownerName}
                </option>
              ))}
            </Input>

            {/* Type Filter */}
            {activeTab === "ALL" && (
              <Input
                type="select"
                className="form-select form-select-sm rounded-0"
                style={{ width: 110 }}
                value={typeFilter}
                onChange={(e) => { setTypeFilter(e.target.value); setPage(0); }}
              >
                <option value="">All Types</option>
                <option value="CALL">Call</option>
                <option value="MEETING">Meeting</option>
                <option value="EMAIL">Email</option>
                <option value="TASK">Task</option>
                <option value="DEMO">Demo</option>
                <option value="VISIT">Visit</option>
              </Input>
            )}

            {/* Status Filter */}
            <Input
              type="select"
              className="form-select form-select-sm rounded-0"
              style={{ width: 110 }}
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
            >
              <option value="">All Status</option>
              <option value="COMPLETED">Completed</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="PENDING">Pending</option>
            </Input>

            {/* Clear Filters (if active) */}
            {(ownerFilter || typeFilter || statusFilter || search || selectedCalendarDate) && (
              <Button
                type="button"
                size="sm"
                color="light"
                className="rounded-0 border text-muted py-1 px-2 small"
                onClick={() => {
                  setOwnerFilter("");
                  setTypeFilter("");
                  setStatusFilter("");
                  setSearchInput("");
                  setSearch("");
                  setSelectedCalendarDate(null);
                  setPage(0);
                }}
                title="Clear filters"
              >
                <i className="ri-close-line" />
              </Button>
            )}
          </div>
        </div>

        {/* Selected Calendar Date Banner */}
        {selectedCalendarDate && (
          <Alert color="info" className="rounded-0 py-2 small d-flex justify-content-between align-items-center mb-3">
            <div>
              <i className="ri-calendar-check-line me-2" />
              Filtering activities for <strong>{formatDateStr(selectedCalendarDate)}</strong>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-link text-decoration-none text-dark p-0"
              onClick={() => setSelectedCalendarDate(null)}
            >
              Show all dates ✕
            </button>
          </Alert>
        )}

        {/* Main 2-Column Section */}
        <Row>
          {/* Left Column: Activities Table (Col 8) */}
          <Col xl={8} lg={8}>
            <Card className="rounded-0 border shadow-none mb-3" style={{ borderColor: THEME.grayBorder }}>
              <div className="table-responsive">
                <Table className="align-middle mb-0" hover>
                  <thead style={{ backgroundColor: "#f8fafc", borderColor: THEME.grayBorder }}>
                    <tr className="small text-muted text-uppercase">
                      <th style={{ width: 140 }}>Activity</th>
                      <th>Subject / With</th>
                      <th>Related To</th>
                      <th style={{ width: 130 }}>Owner</th>
                      <th style={{ width: 140 }}>Date & Time</th>
                      <th style={{ width: 100 }}>Status</th>
                      <th style={{ width: 80 }} className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listLoading ? (
                      <tr>
                        <td colSpan="7" className="text-center py-5">
                          <Spinner size="sm" style={{ color: THEME.primary }} />
                          <span className="ms-2 small text-muted">Loading activities...</span>
                        </td>
                      </tr>
                    ) : activities.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center py-5 text-muted small">
                          <div className="mb-2">
                            <i className="ri-calendar-line fs-1" style={{ color: THEME.grayBorder }} />
                          </div>
                          No activities found matching criteria.
                          <div className="mt-2">
                            <Button
                              type="button"
                              size="sm"
                              className="rounded-0 text-white"
                              style={{ backgroundColor: THEME.primary, borderColor: THEME.primary }}
                              onClick={() => openModal("log")}
                            >
                              + Log First Activity
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      activities.map((act) => {
                        const typeCfg = TYPE_CONFIG[act.actType?.toUpperCase()] || TYPE_CONFIG.CALL;
                        const isCompleted = (act.activityStatus || "").toUpperCase() === "COMPLETED";
                        const isScheduled = (act.activityStatus || "").toUpperCase() === "SCHEDULED";
                        const parsed = parseCallNotes(act.callNotes);
                        const rowSubtype = act.actSubtype || parsed.subtype || "General";
                        const rowWith = act.withName || parsed.withName || "Decision Maker";
                        const rowRelated = act.relatedTo || parsed.related || "Client Account";

                        return (
                          <tr key={act.activityId} style={{ borderColor: THEME.grayBorder }}>
                            {/* 1. Activity Type Icon + Name */}
                            <td>
                              <div className="d-flex align-items-center gap-2">
                                <div
                                  className="d-flex align-items-center justify-content-center rounded-0"
                                  style={{
                                    width: 32,
                                    height: 32,
                                    backgroundColor: typeCfg.bgColor,
                                    color: typeCfg.textColor,
                                    fontSize: 14,
                                  }}
                                >
                                  <i className={typeCfg.icon} />
                                </div>
                                <div>
                                  <div className="fw-semibold small" style={{ color: THEME.textHeading }}>
                                    {typeCfg.label}
                                  </div>
                                  <div className="text-muted" style={{ fontSize: 10 }}>
                                    {rowSubtype}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* 2. Subject / With */}
                            <td>
                              <div className="fw-semibold small" style={{ color: THEME.textHeading }}>
                                {act.subject}
                              </div>
                              <div className="text-muted small" style={{ fontSize: 11 }}>
                                with {rowWith}
                              </div>
                            </td>

                            {/* 3. Related To */}
                            <td>
                              <div className="fw-medium small" style={{ color: THEME.textHeading }}>
                                {rowRelated}
                              </div>
                              <div className="text-muted" style={{ fontSize: 11 }}>
                                {rowWith}
                              </div>
                            </td>

                            {/* 4. Owner */}
                            <td>
                              <div className="d-flex align-items-center gap-2">
                                <div
                                  className="d-flex align-items-center justify-content-center rounded-circle small fw-bold"
                                  style={{
                                    width: 26,
                                    height: 26,
                                    backgroundColor: "#f1f5f9",
                                    color: THEME.textHeading,
                                    fontSize: 10,
                                  }}
                                >
                                  {act.ownerAvatar || "AK"}
                                </div>
                                <span className="small text-truncate" style={{ maxWidth: 90 }}>
                                  {act.ownerName || "Sales Rep"}
                                </span>
                              </div>
                            </td>

                            {/* 5. Date & Time */}
                            <td>
                              <div className="small fw-medium" style={{ color: THEME.textHeading }}>
                                {formatDateStr(act.startTime)}
                              </div>
                              <div className="text-muted" style={{ fontSize: 11 }}>
                                {formatTimeStr(act.startTime)}
                              </div>
                            </td>

                            {/* 6. Status Badge */}
                            <td>
                              <span
                                className="badge rounded-0 fw-semibold px-2 py-1"
                                style={{
                                  backgroundColor: isCompleted ? "#dcfce7" : isScheduled ? "#ede9fe" : "#fef3c7",
                                  color: isCompleted ? "#166534" : isScheduled ? "#6b21a8" : "#92400e",
                                  fontSize: 11,
                                }}
                              >
                                {isCompleted ? "Completed" : isScheduled ? "Scheduled" : "Pending"}
                              </span>
                            </td>

                            {/* 7. Actions */}
                            <td className="text-end">
                              <div className="d-flex align-items-center justify-content-end gap-1">
                                {!isCompleted && (
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-light border rounded-0 text-success"
                                    style={{
                                      borderColor: THEME.grayBorder,
                                      width: 28,
                                      height: 28,
                                      display: "inline-flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      padding: 0,
                                    }}
                                    title="Mark Completed"
                                    onClick={() => handleMarkComplete(act)}
                                  >
                                    <i className="ri-check-line" style={{ fontSize: 14 }} />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="btn btn-sm btn-light border rounded-0 text-muted"
                                  style={{
                                    borderColor: THEME.grayBorder,
                                    width: 28,
                                    height: 28,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    padding: 0,
                                  }}
                                  title="Edit"
                                  onClick={() => openModal("edit", act)}
                                >
                                  <i className="ri-pencil-line" style={{ fontSize: 13 }} />
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-light border rounded-0 text-danger"
                                  style={{
                                    borderColor: THEME.grayBorder,
                                    width: 28,
                                    height: 28,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    padding: 0,
                                  }}
                                  title="Delete"
                                  onClick={() => handleDeleteActivity(act)}
                                >
                                  <i className="ri-delete-bin-line" style={{ fontSize: 13 }} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </Table>
              </div>

              {/* Table Pagination */}
              <div
                className="d-flex flex-wrap justify-content-between align-items-center p-3 border-top"
                style={{ borderColor: THEME.grayBorder }}
              >
                <div className="text-muted small">
                  Showing {activities.length > 0 ? page * pageSize + 1 : 0} to{" "}
                  {Math.min((page + 1) * pageSize, totalCount)} of {totalCount} entries
                </div>

                <div className="d-flex align-items-center gap-2">
                  <Input
                    type="select"
                    className="form-select form-select-sm rounded-0"
                    style={{ width: 115 }}
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(0);
                    }}
                  >
                    <option value={10}>10 / page</option>
                    <option value={25}>25 / page</option>
                    <option value={50}>50 / page</option>
                    <option value={100}>100 / page</option>
                  </Input>

                  <div className="btn-group btn-group-sm">
                    <Button
                      type="button"
                      color="light"
                      className="rounded-0 border"
                      disabled={page === 0}
                      onClick={() => setPage((p) => Math.max(p - 1, 0))}
                    >
                      ‹
                    </Button>
                    <Button type="button" color="light" className="rounded-0 border fw-bold text-dark" disabled>
                      {page + 1}
                    </Button>
                    <Button
                      type="button"
                      color="light"
                      className="rounded-0 border"
                      disabled={(page + 1) * pageSize >= totalCount}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      ›
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </Col>

          {/* Right Column: 3 Sidebar Cards (Col 4) */}
          <Col xl={4} lg={4}>
            {/* Sidebar Card 1: My Calendar */}
            <Card className="rounded-0 border shadow-none mb-3" style={{ borderColor: THEME.grayBorder }}>
              <div
                className="px-3 py-2 border-bottom d-flex align-items-center justify-content-between"
                style={{ backgroundColor: "#f8fafc", borderColor: THEME.grayBorder }}
              >
                <h6 className="mb-0 fw-bold" style={{ color: THEME.textHeading }}>
                  My Calendar
                </h6>
                <div className="d-flex align-items-center gap-2">
                  <span className="small fw-semibold" style={{ color: THEME.textHeading }}>
                    {monthNames[calendarMonth]} {calendarYear}
                  </span>
                  <div className="btn-group btn-group-sm">
                    <button
                      type="button"
                      className="btn btn-sm btn-light border py-0 px-2 rounded-0"
                      onClick={handlePrevMonth}
                      title="Previous Month"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-light border py-0 px-2 rounded-0"
                      onClick={handleNextMonth}
                      title="Next Month"
                    >
                      ›
                    </button>
                  </div>
                </div>
              </div>

              <CardBody className="p-3">
                {/* Calendar Days Header */}
                <div className="d-flex text-center mb-2 text-uppercase fw-bold" style={{ color: "#94a3b8", fontSize: 10, letterSpacing: 0.5 }}>
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                    <div key={day} style={{ flex: 1 }}>
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Month Grid */}
                <div className="d-flex flex-wrap text-center">
                  {calendarDays.map((cell, idx) => {
                    const isSelected = selectedCalendarDate === cell.dateStr;
                    const isToday = cell.dateStr === new Date().toISOString().slice(0, 10);

                    return (
                      <div
                        key={idx}
                        style={{
                          width: "14.28%",
                          height: 38,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: cell.isOtherMonth ? "default" : "pointer",
                        }}
                        onClick={() => handleDayClick(cell)}
                      >
                        <div
                          className="d-flex flex-column align-items-center justify-content-center position-relative"
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: 0,
                            backgroundColor: isSelected
                              ? THEME.primary
                              : isToday
                              ? "#fef2f2"
                              : "transparent",
                            color: isSelected
                              ? "#ffffff"
                              : cell.isOtherMonth
                              ? "#cbd5e1"
                              : isToday
                              ? THEME.primary
                              : THEME.textHeading,
                            fontWeight: isSelected || isToday ? 700 : 500,
                            fontSize: 12,
                            border: isToday && !isSelected ? `1.5px solid #fecaca` : "none",
                            boxShadow: isSelected ? "0 2px 4px rgba(127, 29, 29, 0.25)" : "none",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <span>{cell.dayNumber}</span>
                        </div>

                        {/* Activity Indicator Dots */}
                        {!cell.isOtherMonth && cell.events && cell.events.length > 0 && (
                          <div className="d-flex gap-1 justify-content-center" style={{ marginTop: 1, height: 4 }}>
                            {cell.hasMeeting && (
                              <span style={{ width: 4, height: 4, borderRadius: "50%", backgroundColor: "#8b5cf6" }} />
                            )}
                            {cell.hasCall && (
                              <span style={{ width: 4, height: 4, borderRadius: "50%", backgroundColor: "#16a34a" }} />
                            )}
                            {cell.hasTask && (
                              <span style={{ width: 4, height: 4, borderRadius: "50%", backgroundColor: "#d97706" }} />
                            )}
                            {cell.hasEmail && (
                              <span style={{ width: 4, height: 4, borderRadius: "50%", backgroundColor: "#0284c7" }} />
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Calendar Legend */}
                <div
                  className="d-flex justify-content-around align-items-center pt-2 mt-2 border-top text-muted"
                  style={{ fontSize: 11, borderColor: THEME.grayBorder }}
                >
                  <span className="d-flex align-items-center gap-1">
                    <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#8b5cf6" }} /> Meeting
                  </span>
                  <span className="d-flex align-items-center gap-1">
                    <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#16a34a" }} /> Call
                  </span>
                  <span className="d-flex align-items-center gap-1">
                    <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#d97706" }} /> Task
                  </span>
                  <span className="d-flex align-items-center gap-1">
                    <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#0284c7" }} /> Email
                  </span>
                </div>
              </CardBody>
            </Card>

            {/* Sidebar Card 2: Today's Schedule */}
            <Card className="rounded-0 border shadow-none mb-3" style={{ borderColor: THEME.grayBorder }}>
              <div
                className="px-3 py-2 border-bottom d-flex align-items-center justify-content-between"
                style={{ backgroundColor: "#f8fafc", borderColor: THEME.grayBorder }}
              >
                <h6 className="mb-0 fw-bold" style={{ color: THEME.textHeading }}>
                  Today's Schedule
                </h6>
                <button
                  type="button"
                  className="btn btn-link p-0 small text-decoration-none fw-semibold"
                  style={{ color: THEME.primary }}
                  onClick={() => {
                    const today = new Date().toISOString().slice(0, 10);
                    setSelectedCalendarDate(today);
                  }}
                >
                  View All
                </button>
              </div>

              <CardBody className="p-3">
                {stats.today_schedule && stats.today_schedule.length > 0 ? (
                  <div className="d-flex flex-column gap-2">
                    {stats.today_schedule.map((item, i) => {
                      const typeKey = (item.act_type || item.actType || "CALL").toUpperCase();
                      const cfg = TYPE_CONFIG[typeKey] || TYPE_CONFIG.CALL;
                      const isCompleted = (item.activity_status || "").toUpperCase() === "COMPLETED";

                      return (
                        <div
                          key={item.activity_id || item.activityId || i}
                          className="d-flex align-items-center justify-content-between p-2 bg-white border"
                          style={{
                            borderColor: THEME.grayBorder,
                            transition: "background-color 0.15s ease",
                          }}
                        >
                          {/* Left: Type Icon + Subject & Subtext */}
                          <div className="d-flex align-items-center gap-2 min-w-0">
                            <div
                              className="d-flex align-items-center justify-content-center flex-shrink-0 rounded-0"
                              style={{
                                width: 32,
                                height: 32,
                                backgroundColor: cfg.bgColor,
                                color: cfg.textColor,
                                fontSize: 13,
                              }}
                            >
                              <i className={cfg.icon} />
                            </div>

                            <div className="min-w-0 flex-grow-1">
                              <div
                                className="fw-semibold small text-truncate"
                                style={{
                                  color: THEME.textHeading,
                                  fontSize: 12.5,
                                  opacity: isCompleted ? 0.8 : 1,
                                }}
                                title={item.subject}
                              >
                                {item.subject}
                              </div>
                              <div className="text-muted text-truncate" style={{ fontSize: 11 }}>
                                {item.related_to || item.relatedTo || "Direct Client"}
                              </div>
                            </div>
                          </div>

                          {/* Right: Time Badge */}
                          <span
                            className="badge rounded-0 px-2 py-1 text-dark border flex-shrink-0"
                            style={{
                              backgroundColor: "#f8fafc",
                              borderColor: THEME.grayBorder,
                              fontSize: 11,
                              fontWeight: 600,
                            }}
                          >
                            {item.time_str || formatTimeStr(item.start_time || item.startTime)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-3 text-muted small">
                    <i className="ri-calendar-check-line fs-3 d-block mb-1 text-muted opacity-50" />
                    No activities scheduled for today.
                    <div className="mt-2">
                      <Button
                        type="button"
                        size="sm"
                        color="light"
                        className="rounded-0 border py-0 px-2 small"
                        onClick={() => openModal("schedule")}
                      >
                        + Schedule Activity
                      </Button>
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Sidebar Card 3: Activity Summary (Donut & Breakdown side-by-side) */}
            <Card className="rounded-0 border shadow-none mb-3" style={{ borderColor: THEME.grayBorder }}>
              <div
                className="px-3 py-2 border-bottom d-flex align-items-center justify-content-between"
                style={{ backgroundColor: "#f8fafc", borderColor: THEME.grayBorder }}
              >
                <h6 className="mb-0 fw-bold" style={{ color: THEME.textHeading }}>
                  Activity Summary
                </h6>
                <span className="badge rounded-0 bg-light text-muted border small fw-normal px-2 py-1">
                  This Month
                </span>
              </div>

              <CardBody className="p-3">
                {/* Donut Chart & Legend Side-by-Side */}
                <div className="d-flex align-items-center justify-content-between gap-3">
                  {/* Left: SVG Donut Chart */}
                  <div className="position-relative flex-shrink-0" style={{ width: 115, height: 115 }}>
                    <svg viewBox="0 0 36 36" className="w-100 h-100" style={{ transform: "rotate(-90deg)" }}>
                      {/* Background base circle */}
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#f1f5f9"
                        strokeWidth="3.6"
                      />
                      {/* Meetings segment (purple #8b5cf6) */}
                      {stats.summary.meetings_pct > 0 && (
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="#8b5cf6"
                          strokeWidth="3.6"
                          strokeDasharray={`${stats.summary.meetings_pct}, 100`}
                          strokeDashoffset="0"
                        />
                      )}
                      {/* Calls segment (green #16a34a) */}
                      {stats.summary.calls_pct > 0 && (
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="#16a34a"
                          strokeWidth="3.6"
                          strokeDasharray={`${stats.summary.calls_pct}, 100`}
                          strokeDashoffset={`-${stats.summary.meetings_pct}`}
                        />
                      )}
                      {/* Emails segment (blue #0284c7) */}
                      {stats.summary.emails_pct > 0 && (
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="#0284c7"
                          strokeWidth="3.6"
                          strokeDasharray={`${stats.summary.emails_pct}, 100`}
                          strokeDashoffset={`-${stats.summary.meetings_pct + stats.summary.calls_pct}`}
                        />
                      )}
                      {/* Tasks segment (amber #d97706) */}
                      {stats.summary.tasks_pct > 0 && (
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="#d97706"
                          strokeWidth="3.6"
                          strokeDasharray={`${stats.summary.tasks_pct}, 100`}
                          strokeDashoffset={`-${stats.summary.meetings_pct + stats.summary.calls_pct + stats.summary.emails_pct}`}
                        />
                      )}
                    </svg>
                    {/* Centered Total Count */}
                    <div
                      className="position-absolute top-50 start-50 translate-middle text-center"
                      style={{ pointerEvents: "none" }}
                    >
                      <h4 className="fw-bold mb-0" style={{ color: THEME.textHeading, fontSize: 20 }}>
                        {stats.total_activities}
                      </h4>
                      <span className="text-muted text-uppercase" style={{ fontSize: 9, letterSpacing: 0.5 }}>
                        Total
                      </span>
                    </div>
                  </div>

                  {/* Right: Legend Breakdown List */}
                  <div className="flex-grow-1 d-flex flex-column gap-2">
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="d-flex align-items-center gap-2 small text-muted">
                        <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#8b5cf6" }} />
                        Meetings
                      </span>
                      <span className="small fw-semibold" style={{ color: THEME.textHeading }}>
                        {stats.meetings_count}{" "}
                        <span className="text-muted fw-normal" style={{ fontSize: 11 }}>({stats.summary.meetings_pct}%)</span>
                      </span>
                    </div>

                    <div className="d-flex justify-content-between align-items-center">
                      <span className="d-flex align-items-center gap-2 small text-muted">
                        <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#16a34a" }} />
                        Calls
                      </span>
                      <span className="small fw-semibold" style={{ color: THEME.textHeading }}>
                        {stats.calls_count}{" "}
                        <span className="text-muted fw-normal" style={{ fontSize: 11 }}>({stats.summary.calls_pct}%)</span>
                      </span>
                    </div>

                    <div className="d-flex justify-content-between align-items-center">
                      <span className="d-flex align-items-center gap-2 small text-muted">
                        <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#0284c7" }} />
                        Emails
                      </span>
                      <span className="small fw-semibold" style={{ color: THEME.textHeading }}>
                        {stats.emails_count}{" "}
                        <span className="text-muted fw-normal" style={{ fontSize: 11 }}>({stats.summary.emails_pct}%)</span>
                      </span>
                    </div>

                    <div className="d-flex justify-content-between align-items-center">
                      <span className="d-flex align-items-center gap-2 small text-muted">
                        <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#d97706" }} />
                        Tasks
                      </span>
                      <span className="small fw-semibold" style={{ color: THEME.textHeading }}>
                        {stats.tasks_count}{" "}
                        <span className="text-muted fw-normal" style={{ fontSize: 11 }}>({stats.summary.tasks_pct}%)</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div
                  className="text-muted mt-3 pt-2 border-top text-center"
                  style={{ fontSize: 10, borderColor: THEME.grayBorder }}
                >
                  * Multiple activities may overlap across team schedules
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>

        {/* In-Page Activity Modal (Log / Schedule / Edit) */}
        <Modal
          isOpen={modalOpen}
          toggle={() => setModalOpen(false)}
          centered
          size="lg"
          className="rounded-0"
        >
          <ModalHeader
            toggle={() => setModalOpen(false)}
            className="rounded-0 bg-light border-bottom"
          >
            <div className="d-flex align-items-center gap-2">
              <i
                className={
                  modalMode === "log"
                    ? "ri-file-edit-line"
                    : modalMode === "edit"
                    ? "ri-edit-line"
                    : "ri-calendar-line"
                }
                style={{ color: THEME.primary }}
              />
              <span className="fw-bold" style={{ color: THEME.textHeading }}>
                {modalMode === "log"
                  ? "Log Activity"
                  : modalMode === "edit"
                  ? "Edit Activity"
                  : "Schedule New Activity"}
              </span>
            </div>
          </ModalHeader>

          <Form onSubmit={handleModalSubmit}>
            <ModalBody className="p-3">
              {/* Activity Type Selection Tabs */}
              <div className="mb-3">
                <Label className="form-label small fw-semibold mb-1">
                  Activity Type <span className="text-danger">*</span>
                </Label>
                <div className="d-flex flex-wrap gap-2">
                  {Object.keys(TYPE_CONFIG).map((k) => {
                    const cfg = TYPE_CONFIG[k];
                    const isSelected = formData.actType === k;
                    return (
                      <button
                        key={k}
                        type="button"
                        className="btn btn-sm rounded-0 d-flex align-items-center gap-1 px-3 py-1 fw-medium"
                        style={{
                          backgroundColor: isSelected ? cfg.bgColor : "#f8fafc",
                          color: isSelected ? cfg.textColor : THEME.textMuted,
                          border: `1px solid ${isSelected ? cfg.textColor : THEME.grayBorder}`,
                        }}
                        onClick={() => {
                          setFormData({
                            ...formData,
                            actType: k,
                            actSubtype: cfg.subtypes[0] || "General",
                          });
                        }}
                      >
                        <i className={cfg.icon} />
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Subtype & Subject Row */}
              <Row className="g-2 mb-2">
                <Col md={4}>
                  <Label className="form-label small fw-semibold mb-1">Subtype</Label>
                  <Input
                    type="select"
                    className="rounded-0 form-control-sm"
                    value={formData.actSubtype}
                    onChange={(e) => setFormData({ ...formData, actSubtype: e.target.value })}
                  >
                    {(TYPE_CONFIG[formData.actType]?.subtypes || ["General"]).map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </Input>
                </Col>
                <Col md={8}>
                  <Label className="form-label small fw-semibold mb-1">
                    Subject / Title <span className="text-danger">*</span>
                  </Label>
                  <Input
                    type="text"
                    className="rounded-0 form-control-sm"
                    required
                    placeholder="e.g. Follow-up call with Acme Solar"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  />
                </Col>
              </Row>

              {/* Related Customer & Contact */}
              <Row className="g-2 mb-2">
                <Col md={6}>
                  <Label className="form-label small fw-semibold mb-1">Related Customer / Account</Label>
                  <Input
                    type="select"
                    className="rounded-0 form-control-sm"
                    value={formData.accountId}
                    onChange={(e) => handleAccountChange(e.target.value)}
                  >
                    <option value="">Select Customer / Company...</option>
                    {accountOptions.map((acc) => (
                      <option key={acc.accountId} value={acc.accountId}>
                        {acc.displayName || acc.companyName || `#${acc.accountId}`}
                      </option>
                    ))}
                  </Input>
                </Col>
                <Col md={6}>
                  <Label className="form-label small fw-semibold mb-1">Contact Person</Label>
                  <Input
                    type="select"
                    className="rounded-0 form-control-sm"
                    value={formData.contactPersonId}
                    onChange={(e) => setFormData({ ...formData, contactPersonId: e.target.value })}
                    disabled={!formData.accountId}
                  >
                    <option value="">
                      {!formData.accountId
                        ? "Select a customer first"
                        : contactOptions.length === 0
                        ? "No contacts found"
                        : "Select contact person..."}
                    </option>
                    {contactOptions.map((c) => (
                      <option key={c.contactPersonId} value={c.contactPersonId}>
                        {c.fullName || `${c.firstName || ""} ${c.lastName || ""}`.trim()}{" "}
                        {c.isPrimary ? "(Primary)" : ""}
                      </option>
                    ))}
                  </Input>
                </Col>
              </Row>

              {/* Start Time & End Time */}
              <Row className="g-2 mb-2">
                <Col md={6}>
                  <Label className="form-label small fw-semibold mb-1">
                    Start Date & Time <span className="text-danger">*</span>
                  </Label>
                  <Input
                    type="datetime-local"
                    className="rounded-0 form-control-sm"
                    required
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  />
                </Col>
                <Col md={6}>
                  <Label className="form-label small fw-semibold mb-1">End Date & Time</Label>
                  <Input
                    type="datetime-local"
                    className="rounded-0 form-control-sm"
                    value={formData.endTime}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData((prev) => ({
                        ...prev,
                        endTime: val,
                        isCompleted: !!val,
                      }));
                    }}
                  />
                </Col>
              </Row>

              {/* Owner & Phone Number */}
              <Row className="g-2 mb-2">
                <Col md={6}>
                  <Label className="form-label small fw-semibold mb-1">Owner (Sales Rep)</Label>
                  <Input
                    type="select"
                    className="rounded-0 form-control-sm"
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  >
                    <option value="">Select owner...</option>
                    {ownerOptions.map((o) => (
                      <option key={o.ownerId || o.employeeId} value={o.ownerId || o.employeeId}>
                        {o.fullName || o.ownerName}
                      </option>
                    ))}
                  </Input>
                </Col>
                <Col md={6}>
                  <Label className="form-label small fw-semibold mb-1">Phone Number (Optional)</Label>
                  <Input
                    type="text"
                    className="rounded-0 form-control-sm"
                    placeholder="Customer contact number"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  />
                </Col>
              </Row>

              {/* Call Notes / Description */}
              <div className="mb-2">
                <Label className="form-label small fw-semibold mb-1">Notes / Description</Label>
                <Input
                  type="textarea"
                  rows="3"
                  className="rounded-0 form-control-sm"
                  placeholder="Enter meeting takeaways, call discussion, or action items..."
                  value={formData.callNotes}
                  onChange={(e) => setFormData({ ...formData, callNotes: e.target.value })}
                />
              </div>

              {/* Mark as Completed toggle */}
              <div className="form-check mt-2">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="markCompletedCheck"
                  checked={formData.isCompleted}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setFormData((prev) => ({
                      ...prev,
                      isCompleted: checked,
                      endTime: checked ? (prev.endTime || toDatetimeLocalValue(new Date())) : "",
                    }));
                  }}
                  style={{ accentColor: THEME.primary }}
                />
                <label className="form-check-label small" htmlFor="markCompletedCheck">
                  Mark as Completed (Activity already taken place)
                </label>
              </div>
            </ModalBody>

            <ModalFooter className="border-top p-2">
              <Button
                type="button"
                color="light"
                className="rounded-0 small border"
                onClick={() => setModalOpen(false)}
                disabled={modalSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="rounded-0 small text-white"
                style={{ backgroundColor: THEME.primary, borderColor: THEME.primary }}
                disabled={modalSubmitting}
              >
                {modalSubmitting ? (
                  <>
                    <Spinner size="sm" className="me-1" />
                    Saving...
                  </>
                ) : editingId ? (
                  "Update Activity"
                ) : modalMode === "log" ? (
                  "Save & Log"
                ) : (
                  "Schedule Activity"
                )}
              </Button>
            </ModalFooter>
          </Form>
        </Modal>

        {/* Delete Confirmation Modal */}
        <DeleteModal
          show={deleteModal}
          onDeleteClick={confirmDelete}
          onCloseClick={() => {
            setDeleteModal(false);
            setDeleteTarget(null);
          }}
          disabled={deleting}
        />
      </Container>
    </div>
  );
};

export default Activities;
