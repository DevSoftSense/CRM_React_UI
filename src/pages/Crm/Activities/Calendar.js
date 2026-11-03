import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  Col,
  Container,
  Form,
  Input,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Row,
  Spinner,
} from "reactstrap";
import SimpleBar from "simplebar-react";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import BootstrapTheme from "@fullcalendar/bootstrap";

import DeleteModal from "../../../Components/Common/DeleteModal";

import {
  getActivityCalendar,
  createActivity,
  updateActivity,
  completeActivity,
  deactivateActivity,
} from "../../../helpers/crmActivityApi";
import { getOwnerDropdown } from "../../../helpers/crmOwnerApi";
import { getCustomerDropdown } from "../../../helpers/crmCustomerApi";
import { getContactDropdown } from "../../../helpers/crmContactApi";
import { toastSuccess, toastApiError } from "../../../helpers/crmToast";

// SoftOnCloud CRM Theme Accents & Square Geometry
const THEME = {
  primary: "#7f1d1d", // SoftOnCloud Maroon
  primaryHover: "#5c1018",
  lightBg: "#fef2f2",
  grayBorder: "#e2e8f0",
  textHeading: "#0f172a",
  textMuted: "#64748b",
};

// Activity Categories mapped to SoftOnCloud CRM brand colors
const CATEGORIES = [
  {
    id: "CALL",
    title: "Calls",
    color: "#16a34a",
    bgColor: "#f0fdf4",
    borderColor: "#bbf7d0",
    icon: "ri-phone-line",
  },
  {
    id: "MEETING",
    title: "Meetings",
    color: "#8b5cf6",
    bgColor: "#faf5ff",
    borderColor: "#e9d5ff",
    icon: "ri-calendar-event-line",
  },
  {
    id: "TASK",
    title: "Tasks",
    color: "#d97706",
    bgColor: "#fffbeb",
    borderColor: "#fde68a",
    icon: "ri-checkbox-circle-line",
  },
  {
    id: "EMAIL",
    title: "Emails",
    color: "#0284c7",
    bgColor: "#f0f9ff",
    borderColor: "#bae6fd",
    icon: "ri-mail-line",
  },
  {
    id: "DEMO",
    title: "Demos & Visits",
    color: "#ec4899",
    bgColor: "#fff1f2",
    borderColor: "#fecdd3",
    icon: "ri-slideshow-line",
  },
];

const SUBTYPES_BY_TYPE = {
  CALL: ["Outbound", "Inbound", "Follow-up", "Discovery", "Closing"],
  MEETING: ["In Person", "Online / Video", "Product Demo", "Commercial Discussion", "Discovery"],
  EMAIL: ["Outbound", "Quotation Sent", "Proposal Sent", "Introduction", "Follow-up"],
  TASK: ["To Do", "Send Proposal", "Prepare Final Presentation", "Review KYC", "Follow-up"],
  DEMO: ["Product Demo", "Technical Walkthrough", "Proof of Concept"],
  VISIT: ["Client Site Visit", "Branch Visit", "Onsite Consultation"],
};

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const pad = (n) => String(n).padStart(2, "0");

const toDatetimeLocalValue = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "";
  const y = dt.getFullYear();
  const m = pad(dt.getMonth() + 1);
  const day = pad(dt.getDate());
  const h = pad(dt.getHours());
  const min = pad(dt.getMinutes());
  return `${y}-${m}-${day}T${h}:${min}`;
};

const formatTimeStr = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
};

const formatDateStr = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

// Clean and parse metadata tags from notes
const parseCallNotes = (rawNotes) => {
  if (!rawNotes) return { subtype: "", related: "", withName: "", notes: "" };

  let subtype = "";
  let related = "";
  let withName = "";

  const tagRegex = /\[(?:Subtype:\s*([^\|\]]+))?(?:\s*\|\s*Related:\s*([^\|\]]+))?(?:\s*\|\s*With:\s*([^\]]+))?\]/gi;
  let match;
  while ((match = tagRegex.exec(rawNotes)) !== null) {
    if (match[1] && match[1].trim()) subtype = match[1].trim();
    if (match[2] && match[2].trim()) related = match[2].trim();
    if (match[3] && match[3].trim()) withName = match[3].trim();
  }

  const cleanNotes = rawNotes.replace(/\[(?:Subtype|Related|With)[^\]]*\]\s*/gi, "").trim();
  return { subtype, related, withName, notes: cleanNotes };
};

const Calendar = () => {
  document.title = "Calendar | SoftOnCloud CRM";

  const calendarRef = useRef(null);
  const rangeRef = useRef("");

  // Calendar State
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeView, setActiveView] = useState("dayGridMonth");
  const [currentTitle, setCurrentTitle] = useState("");

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOwnerId, setSelectedOwnerId] = useState("ALL");
  const [activeCategories, setActiveCategories] = useState([
    "CALL",
    "MEETING",
    "TASK",
    "EMAIL",
    "DEMO",
    "VISIT",
  ]);

  // Mini Calendar State
  const [miniMonth, setMiniMonth] = useState(new Date().getMonth());
  const [miniYear, setMiniYear] = useState(new Date().getFullYear());
  const [selectedMiniDate, setSelectedMiniDate] = useState(new Date().toISOString().slice(0, 10));

  // Dropdown options
  const [ownerOptions, setOwnerOptions] = useState([]);
  const [accountOptions, setAccountOptions] = useState([]);
  const [contactOptions, setContactOptions] = useState([]);

  // Detail Modal
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Form Modal (Create / Edit)
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [formModalMode, setFormModalMode] = useState("schedule"); // 'schedule' | 'log' | 'edit'
  const [editingId, setEditingId] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

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
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Load Dropdowns (Owners & Accounts)
  useEffect(() => {
    const initDropdowns = async () => {
      try {
        const [ownersRes, accountsRes] = await Promise.all([
          getOwnerDropdown().catch(() => []),
          getCustomerDropdown({ limit: 200 }).catch(() => []),
        ]);
        setOwnerOptions(Array.isArray(ownersRes) ? ownersRes : ownersRes?.items || []);
        setAccountOptions(Array.isArray(accountsRes) ? accountsRes : accountsRes?.items || []);
      } catch (err) {
        console.error("Failed to load calendar dropdowns", err);
      }
    };
    initDropdowns();
  }, []);

  // Handle Account Change in Form Modal
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

  // Load Activities Range for Calendar
  const loadRange = useCallback(async (start, end) => {
    const key = `${start.toISOString()}|${end.toISOString()}`;
    if (rangeRef.current === key) return;
    rangeRef.current = key;

    setLoading(true);
    setError("");
    try {
      const result = await getActivityCalendar({
        startFrom: start.toISOString(),
        startTo: end.toISOString(),
      });
      setItems(result?.items || result?.Items || []);
    } catch (err) {
      setItems([]);
      const msg = err?.message || "Failed to load calendar.";
      setError(msg);
      toastApiError(err, msg);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh calendar data
  const refreshCalendar = async () => {
    if (calendarRef.current) {
      const api = calendarRef.current.getApi();
      const currentStart = api.view.activeStart;
      const currentEnd = api.view.activeEnd;
      rangeRef.current = "";
      await loadRange(currentStart, currentEnd);
      toastSuccess("Calendar refreshed.");
    }
  };

  // Map Activities to FullCalendar events
  const allEvents = useMemo(() => {
    return (items || []).map((a) => {
      const typeKey = (a.actType || "CALL").toUpperCase();
      const cat = CATEGORIES.find((c) => c.id === typeKey) || CATEGORIES[0];
      const parsed = parseCallNotes(a.callNotes);
      const isCompleted = (a.activityStatus || "").toUpperCase() === "COMPLETED";

      return {
        id: String(a.activityId),
        title: a.subject || `${typeKey} Activity`,
        start: a.startTime,
        end: a.endTime || undefined,
        allDay: false,
        backgroundColor: cat.bgColor,
        borderColor: cat.borderColor,
        textColor: cat.color,
        description: parsed.notes || a.callNotes || "",
        location: a.relatedTo || parsed.related || "Direct Client",
        extendedProps: {
          ...a,
          actType: typeKey,
          actSubtype: a.actSubtype || parsed.subtype || "General",
          withName: a.withName || parsed.withName || "Key Contact",
          relatedTo: a.relatedTo || parsed.related || "Direct Client",
          cleanNotes: parsed.notes,
          isCompleted,
          category: cat,
        },
      };
    });
  }, [items]);

  // Dynamic KPI Calculations (Callout 2)
  const kpiStats = useMemo(() => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    let todayCount = 0;
    let overdueCount = 0;
    let thisWeekCount = 0;
    let completedMonthCount = 0;
    let weekCalls = 0;
    let weekMeetings = 0;

    // Start of week (Monday) and end of week (Sunday)
    const currentDay = now.getDay();
    const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    (allEvents || []).forEach((ev) => {
      const isComp = ev.extendedProps?.isCompleted;
      const startDt = ev.start ? new Date(ev.start) : null;
      if (!startDt || isNaN(startDt.getTime())) return;

      const dtStr = `${startDt.getFullYear()}-${pad(startDt.getMonth() + 1)}-${pad(startDt.getDate())}`;

      // Today
      if (dtStr === todayStr) {
        todayCount++;
      }

      // Overdue: past start time and NOT completed
      if (startDt.getTime() < now.getTime() && !isComp) {
        overdueCount++;
      }

      // This week
      if (startDt.getTime() >= monday.getTime() && startDt.getTime() <= sunday.getTime()) {
        thisWeekCount++;
        const t = (ev.extendedProps?.actType || "").toUpperCase();
        if (t === "CALL") weekCalls++;
        else if (t === "MEETING") weekMeetings++;
      }

      // Completed this month
      if (isComp && startDt.getMonth() === now.getMonth() && startDt.getFullYear() === now.getFullYear()) {
        completedMonthCount++;
      }
    });

    let weekSubtext = `${thisWeekCount} activities`;
    if (weekCalls > 0 || weekMeetings > 0) {
      const parts = [];
      if (weekCalls > 0) parts.push(`${weekCalls} call${weekCalls > 1 ? "s" : ""}`);
      if (weekMeetings > 0) parts.push(`${weekMeetings} meeting${weekMeetings > 1 ? "s" : ""}`);
      weekSubtext = parts.join(" · ");
    } else if (thisWeekCount === 0) {
      weekSubtext = "No activities this week";
    }

    return {
      todayCount,
      overdueCount,
      thisWeekCount,
      weekSubtext,
      completedMonthCount,
    };
  }, [allEvents]);

  // Set of dates that have activities (for mini-calendar dots)
  const activityDatesSet = useMemo(() => {
    const set = new Set();
    (allEvents || []).forEach((ev) => {
      if (ev.start) {
        const dt = new Date(ev.start);
        if (!isNaN(dt.getTime())) {
          set.add(dt.toISOString().slice(0, 10));
        }
      }
    });
    return set;
  }, [allEvents]);

  // Filtered Events based on active categories + Search + Owner
  const filteredEvents = useMemo(() => {
    let result = allEvents.filter((ev) => {
      const type = (ev.extendedProps?.actType || "CALL").toUpperCase();
      if (type === "DEMO" || type === "VISIT") {
        return activeCategories.includes("DEMO") || activeCategories.includes("VISIT");
      }
      return activeCategories.includes(type);
    });

    // Filter by Owner
    if (selectedOwnerId !== "ALL") {
      result = result.filter((ev) => {
        const empId = String(ev.extendedProps?.employeeId || "");
        return empId === String(selectedOwnerId);
      });
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((ev) => {
        const p = ev.extendedProps || {};
        return (
          (ev.title || "").toLowerCase().includes(q) ||
          (p.relatedTo || "").toLowerCase().includes(q) ||
          (p.withName || "").toLowerCase().includes(q) ||
          (p.cleanNotes || "").toLowerCase().includes(q)
        );
      });
    }

    return result;
  }, [allEvents, activeCategories, selectedOwnerId, searchQuery]);

  // Counts per Category
  const categoryCounts = useMemo(() => {
    const counts = {};
    CATEGORIES.forEach((c) => (counts[c.id] = 0));
    (allEvents || []).forEach((ev) => {
      const t = (ev.extendedProps?.actType || "").toUpperCase();
      if (t === "DEMO" || t === "VISIT") {
        counts["DEMO"] = (counts["DEMO"] || 0) + 1;
      } else if (counts[t] !== undefined) {
        counts[t] = (counts[t] || 0) + 1;
      }
    });
    return counts;
  }, [allEvents]);

  // Today's Agenda Items (Callout 4)
  const todayAgendaItems = useMemo(() => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    // 1. Items for today
    const todays = (allEvents || []).filter((ev) => {
      if (!ev.start) return false;
      const dt = new Date(ev.start);
      return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}` === todayStr;
    });

    if (todays.length > 0) return todays;

    // 2. If none today, show upcoming or recent so list is not empty!
    return (allEvents || []).slice(0, 3);
  }, [allEvents]);

  // Mini Calendar Generation (Callout 3)
  const miniCalendarDays = useMemo(() => {
    const year = miniYear;
    const month = miniMonth;
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days = [];
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevM = month === 0 ? 11 : month - 1;
      const prevY = month === 0 ? year - 1 : year;
      days.push({ dayNumber: d, dateStr: `${prevY}-${pad(prevM + 1)}-${pad(d)}`, isOtherMonth: true });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({ dayNumber: d, dateStr: `${year}-${pad(month + 1)}-${pad(d)}`, isOtherMonth: false });
    }
    const total = days.length;
    const target = total <= 35 ? 35 : 42;
    for (let d = 1; d <= target - total; d++) {
      const nextM = month === 11 ? 0 : month + 1;
      const nextY = month === 11 ? year + 1 : year;
      days.push({ dayNumber: d, dateStr: `${nextY}-${pad(nextM + 1)}-${pad(d)}`, isOtherMonth: true });
    }
    return days;
  }, [miniYear, miniMonth]);

  // Mini Calendar Navigation
  const handleMiniPrev = () => {
    if (miniMonth === 0) {
      setMiniMonth(11);
      setMiniYear((y) => y - 1);
    } else {
      setMiniMonth((m) => m - 1);
    }
  };

  const handleMiniNext = () => {
    if (miniMonth === 11) {
      setMiniMonth(0);
      setMiniYear((y) => y + 1);
    } else {
      setMiniMonth((m) => m + 1);
    }
  };

  const handleMiniDayClick = (cell) => {
    if (cell.isOtherMonth) return;
    setSelectedMiniDate(cell.dateStr);
    if (calendarRef.current) {
      const api = calendarRef.current.getApi();
      api.gotoDate(cell.dateStr);
      setCurrentTitle(api.view.title);
    }
  };

  // Calendar Header Navigation Handlers (Callout 5)
  const handlePrev = () => {
    if (calendarRef.current) {
      const api = calendarRef.current.getApi();
      api.prev();
      setCurrentTitle(api.view.title);
    }
  };

  const handleNext = () => {
    if (calendarRef.current) {
      const api = calendarRef.current.getApi();
      api.next();
      setCurrentTitle(api.view.title);
    }
  };

  const handleToday = () => {
    if (calendarRef.current) {
      const api = calendarRef.current.getApi();
      api.today();
      setCurrentTitle(api.view.title);
      setSelectedMiniDate(new Date().toISOString().slice(0, 10));
    }
  };

  const handleViewChange = (viewName) => {
    setActiveView(viewName);
    if (calendarRef.current) {
      const api = calendarRef.current.getApi();
      api.changeView(viewName);
      setCurrentTitle(api.view.title);
    }
  };

  // Toggle Category Filter
  const handleToggleCategory = (catId) => {
    setActiveCategories((prev) => {
      if (prev.includes(catId)) {
        if (prev.length === 1) return CATEGORIES.map((c) => c.id).concat(["VISIT"]);
        return prev.filter((id) => id !== catId && (catId !== "DEMO" || id !== "VISIT"));
      } else {
        const next = [...prev, catId];
        if (catId === "DEMO") next.push("VISIT");
        return next;
      }
    });
  };

  const handleResetCategories = () => {
    setActiveCategories(CATEGORIES.map((c) => c.id).concat(["VISIT"]));
  };

  // Click on date cell -> open create modal
  const handleDateClick = (arg) => {
    const clickedDate = arg.date;
    openCreateModal("schedule", clickedDate);
  };

  // Click on event -> open detail modal
  const handleEventClick = (arg) => {
    setSelectedEvent(arg.event);
    setDetailModalOpen(true);
  };

  // Open Create Modal
  const openCreateModal = (mode = "schedule", defaultDate = null) => {
    setFormModalMode(mode);
    setEditingId(null);

    const startDt = defaultDate ? new Date(defaultDate) : new Date();
    const endDt = new Date(startDt.getTime() + 30 * 60000);

    setFormData({
      subject: "",
      actType: mode === "log" ? "CALL" : "MEETING",
      actSubtype: mode === "log" ? "Outbound" : "In Person",
      startTime: toDatetimeLocalValue(startDt),
      endTime: mode === "log" ? toDatetimeLocalValue(endDt) : "",
      phoneNumber: "",
      callNotes: "",
      employeeId: ownerOptions[0]?.ownerId || ownerOptions[0]?.employeeId || "",
      accountId: "",
      contactPersonId: "",
      isCompleted: mode === "log",
    });
    setContactOptions([]);
    setFormModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = async (existing) => {
    if (!existing) return;
    setFormModalMode("edit");
    setEditingId(existing.id || existing.extendedProps?.activityId);

    const p = existing.extendedProps || existing;
    const isComp = (p.activityStatus || "").toUpperCase() === "COMPLETED";

    // Match related account
    const searchRelated = (p.relatedTo || "").toLowerCase().trim();
    const matchedAcc = accountOptions.find(
      (a) =>
        searchRelated &&
        ((a.displayName || "").toLowerCase().includes(searchRelated) ||
          (a.companyName || "").toLowerCase().includes(searchRelated) ||
          searchRelated.includes((a.displayName || "").toLowerCase()))
    );

    const accId = matchedAcc ? String(matchedAcc.accountId) : "";
    let contacts = [];
    let contactId = "";

    if (accId) {
      try {
        const res = await getContactDropdown({ accountId: Number(accId), limit: 100 });
        contacts = Array.isArray(res) ? res : res?.items || [];
        const searchWith = (p.withName || "").toLowerCase().trim();
        const matchedContact = contacts.find(
          (c) =>
            searchWith &&
            ((c.fullName || "").toLowerCase().includes(searchWith) ||
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
      subject: p.subject || existing.title || "",
      actType: (p.actType || "CALL").toUpperCase(),
      actSubtype: p.actSubtype || "General",
      startTime: toDatetimeLocalValue(p.startTime || existing.start),
      endTime: isComp && (p.endTime || existing.end) ? toDatetimeLocalValue(p.endTime || existing.end) : "",
      phoneNumber: p.callNumber || "",
      callNotes: p.cleanNotes || p.callNotes || "",
      employeeId: p.employeeId ? String(p.employeeId) : "",
      accountId: accId,
      contactPersonId: contactId,
      isCompleted: isComp,
    });

    setDetailModalOpen(false);
    setFormModalOpen(true);
  };

  // Save Modal
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

    setFormSubmitting(true);
    try {
      const selectedAcc = accountOptions.find((a) => String(a.accountId) === String(formData.accountId));
      const selectedContact = contactOptions.find(
        (c) => String(c.contactPersonId) === String(formData.contactPersonId)
      );

      const cleanUserNotes = (formData.callNotes || "")
        .replace(/\[(?:Subtype|Related|With)[^\]]*\]\s*/gi, "")
        .trim();

      const parts = [];
      if (formData.actSubtype) parts.push(`Subtype: ${formData.actSubtype}`);
      if (selectedAcc) parts.push(`Related: ${selectedAcc.displayName || selectedAcc.companyName}`);
      if (selectedContact) parts.push(`With: ${selectedContact.fullName || selectedContact.firstName}`);

      let combinedNotes = cleanUserNotes;
      if (parts.length > 0) {
        const header = `[${parts.join(" | ")}]`;
        combinedNotes = cleanUserNotes ? `${header}\n${cleanUserNotes}` : header;
      }

      // If isCompleted is false, endTime MUST BE NULL so status is Scheduled/Pending
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
        toastSuccess(formModalMode === "log" ? "Activity logged successfully." : "Activity scheduled successfully.");
      }

      setFormModalOpen(false);
      await refreshCalendar();
    } catch (err) {
      toastApiError(err, "Failed to save activity.");
    } finally {
      setFormSubmitting(false);
    }
  };

  // Mark Completed
  const handleMarkComplete = async (act) => {
    const id = act.id || act.extendedProps?.activityId;
    if (!id) return;
    try {
      await completeActivity(id);
      toastSuccess(`Marked "${act.title || act.extendedProps?.subject}" as Completed.`);
      setDetailModalOpen(false);
      await refreshCalendar();
    } catch (err) {
      toastApiError(err, "Failed to mark activity as completed.");
    }
  };

  // Delete Confirm
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id || deleteTarget.extendedProps?.activityId;
    if (!id) return;
    try {
      await deactivateActivity(id);
      toastSuccess("Activity deleted successfully.");
      setDeleteModalOpen(false);
      setDetailModalOpen(false);
      setDeleteTarget(null);
      await refreshCalendar();
    } catch (err) {
      toastApiError(err, "Failed to delete activity.");
    }
  };

  // Custom Event Content (Callout 6: Soft-tint cards with colored left bar, time, and status)
  const renderEventContent = (eventInfo) => {
    const p = eventInfo.event.extendedProps || {};
    const cat = p.category || CATEGORIES[0];
    const isCompleted = p.isCompleted;
    const formattedTime = formatTimeStr(eventInfo.event.start);

    // TimeGrid View (Week & Day)
    if (eventInfo.view.type.startsWith("timeGrid")) {
      return (
        <div
          className="h-100 w-100 p-2 d-flex flex-column justify-content-between overflow-hidden rounded-0"
          style={{
            backgroundColor: cat.bgColor,
            borderLeft: `3.5px solid ${cat.color}`,
            borderTop: `1px solid ${cat.borderColor}`,
            borderRight: `1px solid ${cat.borderColor}`,
            borderBottom: `1px solid ${cat.borderColor}`,
            cursor: "pointer",
            boxSizing: "border-box",
          }}
          title={`${p.subject || eventInfo.event.title} - ${p.relatedTo || ""}`}
        >
          <div>
            <div className="d-flex align-items-center justify-content-between gap-1 mb-1">
              <span
                className="d-inline-flex align-items-center gap-1 px-1.5 py-0 fw-semibold bg-white rounded-0"
                style={{
                  color: cat.color,
                  border: `1px solid ${cat.borderColor}`,
                  fontSize: "9.5px",
                }}
              >
                <i className={cat.icon} style={{ fontSize: "10px" }} />
                <span>{formattedTime}</span>
              </span>
              {isCompleted && (
                <span className="badge rounded-0 bg-success text-white py-0.5 px-1.5 d-inline-flex align-items-center gap-0.5" style={{ fontSize: "9px" }}>
                  <i className="ri-checkbox-circle-fill" /> Completed
                </span>
              )}
            </div>
            <div
              className="fw-bold text-truncate"
              style={{
                color: THEME.textHeading,
                fontSize: "11.5px",
                lineHeight: 1.25,
              }}
            >
              {p.subject || eventInfo.event.title}
            </div>
          </div>
          <div className="text-muted text-truncate" style={{ fontSize: "10px" }}>
            {p.withName ? `${p.withName} | ` : ""}
            {p.relatedTo || "Direct Client"}
          </div>
        </div>
      );
    }

    // Month Grid View (Callout 6: Soft-tint cards with colored left bar, time, status)
    return (
      <div
        className="d-flex flex-column p-1.5 w-100 rounded-0 text-start"
        style={{
          backgroundColor: cat.bgColor,
          borderLeft: `3.5px solid ${cat.color}`,
          borderTop: `1px solid ${cat.borderColor}`,
          borderRight: `1px solid ${cat.borderColor}`,
          borderBottom: `1px solid ${cat.borderColor}`,
          cursor: "pointer",
          margin: "1px 0",
          boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
        }}
        title={`${p.subject || eventInfo.event.title} - ${p.relatedTo || ""}`}
      >
        <div
          className="fw-semibold text-truncate"
          style={{
            color: THEME.textHeading,
            fontSize: "11.5px",
            lineHeight: "1.3",
          }}
        >
          {eventInfo.event.title}
        </div>
        <div className="d-flex align-items-center justify-content-between mt-1" style={{ fontSize: "10px" }}>
          {isCompleted ? (
            <span className="d-inline-flex align-items-center gap-1 text-success fw-semibold">
              <i className="ri-checkbox-circle-fill" style={{ fontSize: "11px" }} />
              <span>Completed</span>
            </span>
          ) : (
            <span className="text-muted fw-medium">
              {formattedTime}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <React.Fragment>
      <DeleteModal
        show={deleteModalOpen}
        onDeleteClick={handleDeleteConfirm}
        onCloseClick={() => setDeleteModalOpen(false)}
      />

      <div className="page-content">
        <Container fluid>
          {/* Top Breadcrumb & Actions Bar (Callout 1) */}
          <div className="d-flex flex-wrap justify-content-between align-items-center mb-3">
            <div>
              <nav aria-label="breadcrumb">
                <ol className="breadcrumb mb-1 text-muted small">
                  <li className="breadcrumb-item">
                    <Link to="/crm/dashboard" style={{ color: THEME.textMuted }}>CRM</Link>
                  </li>
                  <li className="breadcrumb-item active text-dark fw-semibold" aria-current="page">
                    Calendar
                  </li>
                </ol>
              </nav>
              <h4 className="fw-bold mb-0" style={{ color: THEME.textHeading }}>
                Calendar
              </h4>
              <p className="text-muted small mb-0" style={{ fontSize: 12 }}>
                Manage schedule, meetings, calls, and follow-ups across CRM
              </p>
            </div>

            {/* Right Action Group (Callout 1: Global Search + Outlined/Ghost Actions + One Solid CTA) */}
            <div className="d-flex align-items-center gap-2 mt-2 mt-sm-0">
              <div className="position-relative" style={{ width: "240px" }}>
                <Input
                  type="text"
                  placeholder="Search activities, leads, accounts..."
                  className="form-control form-control-sm rounded-0 ps-4"
                  style={{ fontSize: "12px", borderColor: THEME.grayBorder }}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <i
                  className="ri-search-line position-absolute top-50 start-0 translate-middle-y ms-2 text-muted"
                  style={{ fontSize: "12px" }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="btn btn-sm btn-link position-absolute top-50 end-0 translate-middle-y text-muted p-0 me-2"
                    onClick={() => setSearchQuery("")}
                    style={{ fontSize: "12px" }}
                  >
                    ×
                  </button>
                )}
              </div>

              <Link
                to="/crm/activities"
                className="btn btn-sm btn-light border rounded-0 d-flex align-items-center gap-1.5 px-3 py-1.5 fw-medium"
                style={{ borderColor: THEME.grayBorder, color: THEME.textHeading }}
              >
                <i className="ri-list-check-2 text-muted" />
                Activities List
              </Link>
              <Button
                type="button"
                className="btn btn-sm rounded-0 px-3 py-1.5 fw-medium shadow-sm"
                style={{
                  backgroundColor: "#ffffff",
                  color: THEME.primary,
                  border: `1.5px solid ${THEME.primary}`,
                }}
                onClick={() => openCreateModal("log")}
              >
                <i className="ri-phone-line me-1 text-danger" />
                Log Activity
              </Button>
              <Button
                type="button"
                className="btn btn-sm rounded-0 px-3 py-1.5 fw-semibold text-white shadow-sm border-0 d-flex align-items-center gap-1"
                style={{ backgroundColor: THEME.primary }}
                onClick={() => openCreateModal("schedule")}
              >
                <i className="ri-add-line" />
                Schedule Activity
              </Button>
            </div>
          </div>

          {error && <Alert color="danger" className="rounded-0 py-2 small">{error}</Alert>}

          {/* KPI Context Strip (Callout 2: Today / Overdue / This week / Completed) */}
          <Row className="g-3 mb-3">
            {/* Card 1: Today */}
            <Col xl={3} md={6}>
              <Card
                className="rounded-0 border shadow-none mb-0 h-100"
                style={{
                  borderColor: THEME.grayBorder,
                  borderLeft: `4px solid #7f1d1d !important`,
                }}
              >
                <CardBody className="p-3">
                  <div className="text-muted text-uppercase fw-semibold" style={{ fontSize: "11px", letterSpacing: "0.5px" }}>
                    Today
                  </div>
                  <div className="d-flex align-items-baseline gap-2 mt-1">
                    <span className="fw-bold" style={{ fontSize: "26px", color: THEME.textHeading, lineHeight: 1 }}>
                      {kpiStats.todayCount}
                    </span>
                    <span className="text-muted small" style={{ fontSize: "12px" }}>
                      activities scheduled
                    </span>
                  </div>
                </CardBody>
              </Card>
            </Col>

            {/* Card 2: Overdue */}
            <Col xl={3} md={6}>
              <Card
                className="rounded-0 border shadow-none mb-0 h-100"
                style={{
                  borderColor: THEME.grayBorder,
                  borderLeft: `4px solid ${kpiStats.overdueCount > 0 ? "#dc2626" : "#16a34a"} !important`,
                }}
              >
                <CardBody className="p-3">
                  <div className="text-muted text-uppercase fw-semibold" style={{ fontSize: "11px", letterSpacing: "0.5px" }}>
                    Overdue
                  </div>
                  <div className="d-flex align-items-baseline gap-2 mt-1">
                    <span
                      className="fw-bold"
                      style={{
                        fontSize: "26px",
                        color: kpiStats.overdueCount > 0 ? "#dc2626" : THEME.textHeading,
                        lineHeight: 1,
                      }}
                    >
                      {kpiStats.overdueCount}
                    </span>
                    <span className="text-muted small" style={{ fontSize: "12px" }}>
                      {kpiStats.overdueCount === 0 ? "all caught up" : "require attention"}
                    </span>
                  </div>
                </CardBody>
              </Card>
            </Col>

            {/* Card 3: This week */}
            <Col xl={3} md={6}>
              <Card
                className="rounded-0 border shadow-none mb-0 h-100"
                style={{
                  borderColor: THEME.grayBorder,
                  borderLeft: `4px solid #8b5cf6 !important`,
                }}
              >
                <CardBody className="p-3">
                  <div className="text-muted text-uppercase fw-semibold" style={{ fontSize: "11px", letterSpacing: "0.5px" }}>
                    This week
                  </div>
                  <div className="d-flex align-items-baseline gap-2 mt-1">
                    <span className="fw-bold" style={{ fontSize: "26px", color: THEME.textHeading, lineHeight: 1 }}>
                      {kpiStats.thisWeekCount}
                    </span>
                    <span className="text-muted small" style={{ fontSize: "12px" }}>
                      {kpiStats.weekSubtext}
                    </span>
                  </div>
                </CardBody>
              </Card>
            </Col>

            {/* Card 4: Completed */}
            <Col xl={3} md={6}>
              <Card
                className="rounded-0 border shadow-none mb-0 h-100"
                style={{
                  borderColor: THEME.grayBorder,
                  borderLeft: `4px solid #0284c7 !important`,
                }}
              >
                <CardBody className="p-3">
                  <div className="text-muted text-uppercase fw-semibold" style={{ fontSize: "11px", letterSpacing: "0.5px" }}>
                    Completed
                  </div>
                  <div className="d-flex align-items-baseline gap-2 mt-1">
                    <span className="fw-bold" style={{ fontSize: "26px", color: THEME.textHeading, lineHeight: 1 }}>
                      {kpiStats.completedMonthCount}
                    </span>
                    <span className="text-muted small" style={{ fontSize: "12px" }}>
                      this month
                    </span>
                  </div>
                </CardBody>
              </Card>
            </Col>
          </Row>

          <Row>
            {/* Left Sidebar: Mini Calendar, Type Filters, Agenda, Team (Col xl=3) */}
            <Col xl={3}>
              <Card className="card-h-100 rounded-0 border shadow-none mb-3" style={{ borderColor: THEME.grayBorder }}>
                <CardBody className="p-3">
                  {/* 1. Mini Month Calendar (Callout 3) */}
                  <div className="mb-4">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <h6 className="mb-0 fw-bold" style={{ color: THEME.textHeading, fontSize: "13px" }}>
                        {monthNames[miniMonth]} {miniYear}
                      </h6>
                      <div className="btn-group btn-group-sm">
                        <button
                          type="button"
                          className="btn btn-sm btn-light border py-0 px-1.5 rounded-0"
                          onClick={handleMiniPrev}
                          title="Previous Month"
                        >
                          ‹
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-light border py-0 px-1.5 rounded-0"
                          onClick={handleMiniNext}
                          title="Next Month"
                        >
                          ›
                        </button>
                      </div>
                    </div>

                    {/* Weekday Single-Letter Headers */}
                    <div className="d-flex text-center mb-1 text-uppercase fw-bold" style={{ color: "#94a3b8", fontSize: "10.5px" }}>
                      {["S", "M", "T", "W", "T", "F", "S"].map((day, idx) => (
                        <div key={idx} style={{ flex: 1 }}>
                          {day}
                        </div>
                      ))}
                    </div>

                    {/* Month Days Grid */}
                    <div className="d-flex flex-wrap text-center">
                      {miniCalendarDays.map((cell, idx) => {
                        const isSelected = selectedMiniDate === cell.dateStr;
                        const isToday = cell.dateStr === new Date().toISOString().slice(0, 10);
                        const hasActivity = activityDatesSet.has(cell.dateStr);

                        return (
                          <div
                            key={idx}
                            style={{
                              width: "14.28%",
                              height: 30,
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: cell.isOtherMonth ? "default" : "pointer",
                            }}
                            onClick={() => handleMiniDayClick(cell)}
                          >
                            <div
                              className="d-flex align-items-center justify-content-center"
                              style={{
                                width: 22,
                                height: 22,
                                borderRadius: "50%",
                                backgroundColor: isSelected
                                  ? THEME.primary
                                  : isToday
                                  ? THEME.primary
                                  : "transparent",
                                color: isSelected || isToday
                                  ? "#ffffff"
                                  : cell.isOtherMonth
                                  ? "#cbd5e1"
                                  : THEME.textHeading,
                                fontWeight: isSelected || isToday ? 700 : 500,
                                fontSize: "11px",
                              }}
                            >
                              {cell.dayNumber}
                            </div>
                            {/* Dot indicator if day has activities */}
                            {hasActivity && !isSelected && !isToday && (
                              <span
                                style={{
                                  width: 3.5,
                                  height: 3.5,
                                  borderRadius: "50%",
                                  backgroundColor: "#8b5cf6",
                                  marginTop: 1,
                                }}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. Filter by Type (Callout 3: Compact pills with color dot + count) */}
                  <div className="mb-4">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <p className="text-muted small text-uppercase fw-bold mb-0" style={{ fontSize: "10.5px", letterSpacing: "0.5px" }}>
                        Filter by Type
                      </p>
                      <button
                        type="button"
                        className="btn btn-link p-0 small text-decoration-none fw-semibold"
                        style={{ color: THEME.primary, fontSize: "11px" }}
                        onClick={handleResetCategories}
                      >
                        Reset
                      </button>
                    </div>

                    <div className="d-flex flex-column gap-1.5">
                      {CATEGORIES.map((category) => {
                        const isSelected = activeCategories.includes(category.id);
                        return (
                          <div
                            key={category.id}
                            className="d-flex align-items-center justify-content-between py-1.5 px-2.5 rounded-0 border"
                            onClick={() => handleToggleCategory(category.id)}
                            style={{
                              backgroundColor: isSelected ? category.bgColor : "#ffffff",
                              borderColor: isSelected ? category.borderColor : THEME.grayBorder,
                              opacity: isSelected ? 1 : 0.45,
                              cursor: "pointer",
                              transition: "all 0.15s ease",
                              userSelect: "none",
                            }}
                            title={`Click to ${isSelected ? "hide" : "show"} ${category.title}`}
                          >
                            <div className="d-flex align-items-center gap-2">
                              <span
                                style={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: "50%",
                                  backgroundColor: category.color,
                                }}
                              />
                              <span
                                className="fw-semibold"
                                style={{
                                  fontSize: "12px",
                                  color: isSelected ? THEME.textHeading : THEME.textMuted,
                                }}
                              >
                                {category.title}
                              </span>
                            </div>
                            <span
                              className="badge rounded-0 bg-white text-dark small border px-2 py-0.5"
                              style={{ borderColor: category.borderColor, fontSize: "10.5px" }}
                            >
                              {categoryCounts[category.id] || 0}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3. Today's Agenda (Callout 4: Actually shows today's items) */}
                  <div className="mb-3">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <h5 className="mb-0 fw-bold text-uppercase" style={{ color: THEME.textHeading, fontSize: "11px", letterSpacing: "0.5px" }}>
                        Today's Agenda
                      </h5>
                      <Link to="/crm/activities" className="small text-decoration-none fw-semibold" style={{ color: THEME.primary, fontSize: "11px" }}>
                        View all
                      </Link>
                    </div>

                    <div className="d-flex flex-column gap-2">
                      {todayAgendaItems.length === 0 ? (
                        <div className="text-center py-3 text-muted small bg-light border p-2 rounded-0">
                          No activities scheduled for today.
                        </div>
                      ) : (
                        todayAgendaItems.map((act, index) => {
                          const p = act.extendedProps || {};
                          const cat = p.category || CATEGORIES[0];
                          const isFirst = index === 0;

                          return (
                            <div
                              key={act.id}
                              className="p-2 border rounded-0"
                              style={{
                                backgroundColor: isFirst ? cat.bgColor : "#ffffff",
                                borderColor: isFirst ? cat.borderColor : THEME.grayBorder,
                                borderLeft: `3.5px solid ${cat.color}`,
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                              }}
                              onClick={() => handleEventClick({ event: act })}
                            >
                              <div className="fw-semibold text-truncate small" style={{ color: THEME.textHeading, fontSize: "12px" }}>
                                {act.title}
                              </div>
                              <div className="text-muted text-truncate mt-0.5" style={{ fontSize: "10.5px" }}>
                                {formatDateStr(act.start)} · {cat.title}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* 4. Team Filter Dropdown (Callout 4) */}
                  <div>
                    <Input
                      type="select"
                      className="form-select form-select-sm rounded-0"
                      value={selectedOwnerId}
                      onChange={(e) => setSelectedOwnerId(e.target.value)}
                      style={{ fontSize: "12px", borderColor: THEME.grayBorder }}
                    >
                      <option value="ALL">Team: All members</option>
                      {ownerOptions.map((o) => (
                        <option key={o.ownerId || o.employeeId} value={o.ownerId || o.employeeId}>
                          Team: {o.fullName || o.ownerName}
                        </option>
                      ))}
                    </Input>
                  </div>
                </CardBody>
              </Card>
            </Col>

            {/* Right Main Calendar Grid: Month / Week / Day / Agenda (Col xl=9) */}
            <Col xl={9}>
              <Card className="card-h-100 rounded-0 border shadow-none mb-3" style={{ borderColor: THEME.grayBorder }}>
                {/* Calendar Toolbar Header (Callout 5: Owner filter + Segmented Month/Week/Day/List + Clearer Title) */}
                <div
                  className="d-flex flex-wrap align-items-center justify-content-between p-3 border-bottom"
                  style={{ borderColor: THEME.grayBorder }}
                >
                  {/* Left: Prev / Next / Today */}
                  <div className="d-flex align-items-center gap-2">
                    <div className="btn-group btn-group-sm">
                      <Button
                        type="button"
                        color="light"
                        className="rounded-0 border px-2.5 py-1 text-dark"
                        style={{ borderColor: THEME.grayBorder }}
                        onClick={handlePrev}
                        title="Previous"
                      >
                        ‹
                      </Button>
                      <Button
                        type="button"
                        color="light"
                        className="rounded-0 border px-2.5 py-1 text-dark"
                        style={{ borderColor: THEME.grayBorder }}
                        onClick={handleNext}
                        title="Next"
                      >
                        ›
                      </Button>
                    </div>
                    <Button
                      type="button"
                      color="light"
                      className="rounded-0 border px-3 py-1 fw-semibold small"
                      style={{
                        borderColor: THEME.primary,
                        color: THEME.primary,
                        backgroundColor: "#ffffff",
                      }}
                      onClick={handleToday}
                    >
                      Today
                    </Button>
                  </div>

                  {/* Center: Larger, Clearer Month Title (Callout 5) */}
                  <h5 className="mb-0 fw-bold" style={{ color: THEME.textHeading, fontSize: "17px", letterSpacing: "0.3px" }}>
                    {currentTitle || `${monthNames[miniMonth]} ${miniYear}`}
                  </h5>

                  {/* Right: Owner Selector + Segmented View Switcher */}
                  <div className="d-flex align-items-center gap-2">
                    <Input
                      type="select"
                      className="form-select form-select-sm rounded-0"
                      style={{ width: "135px", fontSize: "12px", borderColor: THEME.grayBorder }}
                      value={selectedOwnerId}
                      onChange={(e) => setSelectedOwnerId(e.target.value)}
                    >
                      <option value="ALL">Owner: All</option>
                      {ownerOptions.map((o) => (
                        <option key={o.ownerId || o.employeeId} value={o.ownerId || o.employeeId}>
                          Owner: {o.fullName || o.ownerName}
                        </option>
                      ))}
                    </Input>

                    <div className="btn-group btn-group-sm">
                      {[
                        { id: "dayGridMonth", label: "Month" },
                        { id: "timeGridWeek", label: "Week" },
                        { id: "timeGridDay", label: "Day" },
                        { id: "listWeek", label: "List" },
                      ].map((v) => (
                        <Button
                          key={v.id}
                          type="button"
                          className="rounded-0 fw-semibold"
                          style={{
                            backgroundColor: activeView === v.id ? THEME.primary : "#ffffff",
                            borderColor: activeView === v.id ? THEME.primary : THEME.grayBorder,
                            color: activeView === v.id ? "#ffffff" : THEME.textHeading,
                            fontSize: "12px",
                            padding: "4px 12px",
                          }}
                          onClick={() => handleViewChange(v.id)}
                        >
                          {v.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                <CardBody className="p-3 position-relative">
                  {loading && (
                    <div
                      className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-white bg-opacity-75"
                      style={{ zIndex: 10 }}
                    >
                      <Spinner size="sm" style={{ color: THEME.primary }} />
                      <span className="ms-2 small text-muted">Loading activities...</span>
                    </div>
                  )}

                  <FullCalendar
                    ref={calendarRef}
                    plugins={[
                      BootstrapTheme,
                      dayGridPlugin,
                      timeGridPlugin,
                      interactionPlugin,
                      listPlugin,
                    ]}
                    initialView="dayGridMonth"
                    headerToolbar={false} // Custom Header rendered above (Callout 5)
                    slotDuration="00:30:00"
                    handleWindowResize={true}
                    themeSystem="bootstrap"
                    events={filteredEvents}
                    editable={false}
                    selectable={true}
                    eventContent={renderEventContent}
                    dateClick={handleDateClick}
                    eventClick={handleEventClick}
                    datesSet={(info) => {
                      setCurrentTitle(info.view.title);
                      loadRange(info.start, info.end);
                    }}
                  />

                  {/* Calendar Bottom Legend (Callout 6) */}
                  <div
                    className="d-flex align-items-center justify-content-end gap-3 pt-3 border-top mt-2 text-muted small"
                    style={{ borderColor: THEME.grayBorder, fontSize: "11px" }}
                  >
                    <span className="d-flex align-items-center gap-1.5">
                      <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: THEME.primary }} />
                      <span>Today</span>
                    </span>
                    <span className="d-flex align-items-center gap-1.5">
                      <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#16a34a" }} />
                      <span>Completed</span>
                    </span>
                    <span className="d-flex align-items-center gap-1.5">
                      <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#94a3b8" }} />
                      <span>Hover an empty day to quick-add</span>
                    </span>
                  </div>
                </CardBody>
              </Card>
            </Col>
          </Row>

          {/* ── Modal 1: In-Page Activity Detail Modal ── */}
          <Modal
            isOpen={detailModalOpen}
            toggle={() => setDetailModalOpen(false)}
            centered
            className="rounded-0"
          >
            {selectedEvent && (
              <>
                <ModalHeader
                  toggle={() => setDetailModalOpen(false)}
                  className="border-bottom p-3"
                  style={{ backgroundColor: "#f8fafc" }}
                >
                  <div className="d-flex align-items-center gap-2">
                    <span
                      className="badge rounded-0 p-1.5 border"
                      style={{
                        backgroundColor: (selectedEvent.extendedProps?.category || CATEGORIES[0]).bgColor,
                        borderColor: (selectedEvent.extendedProps?.category || CATEGORIES[0]).borderColor,
                        color: (selectedEvent.extendedProps?.category || CATEGORIES[0]).color,
                      }}
                    >
                      <i
                        className={
                          (selectedEvent.extendedProps?.category || CATEGORIES[0]).icon ||
                          "ri-calendar-event-line"
                        }
                      />
                    </span>
                    <span className="fw-bold" style={{ color: THEME.textHeading }}>
                      Activity Details
                    </span>
                  </div>
                </ModalHeader>

                <ModalBody className="p-3">
                  <div className="mb-3">
                    <h5 className="fw-bold mb-1" style={{ color: THEME.textHeading }}>
                      {selectedEvent.title}
                    </h5>
                    <div className="d-flex align-items-center gap-2">
                      <span
                        className={`badge rounded-0 fw-semibold px-2 py-0.5 ${
                          selectedEvent.extendedProps?.isCompleted
                            ? "bg-success-subtle text-success border border-success"
                            : "bg-warning-subtle text-warning border border-warning"
                        }`}
                        style={{ fontSize: 11 }}
                      >
                        {selectedEvent.extendedProps?.isCompleted ? "Completed" : "Scheduled"}
                      </span>
                      <span className="text-muted small">
                        {selectedEvent.extendedProps?.actSubtype || "General"}
                      </span>
                    </div>
                  </div>

                  <div className="d-flex flex-column gap-2 small border p-2.5 bg-light mb-3 rounded-0">
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Start Date & Time:</span>
                      <span className="fw-semibold">
                        {formatDateStr(selectedEvent.start)} at {formatTimeStr(selectedEvent.start)}
                      </span>
                    </div>
                    {selectedEvent.end && (
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">End Date & Time:</span>
                        <span className="fw-semibold">
                          {formatDateStr(selectedEvent.end)} at {formatTimeStr(selectedEvent.end)}
                        </span>
                      </div>
                    )}
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Related Customer:</span>
                      <span className="fw-semibold text-primary">
                        {selectedEvent.extendedProps?.relatedTo || "Direct Client"}
                      </span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Contact Person:</span>
                      <span className="fw-semibold">
                        {selectedEvent.extendedProps?.withName || "Key Contact"}
                      </span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Owner / Rep:</span>
                      <span className="fw-semibold">
                        {selectedEvent.extendedProps?.ownerName || selectedEvent.extendedProps?.username || "Sales Rep"}
                      </span>
                    </div>
                    {selectedEvent.extendedProps?.callNumber && (
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">Phone Number:</span>
                        <span className="fw-semibold">{selectedEvent.extendedProps?.callNumber}</span>
                      </div>
                    )}
                  </div>

                  {selectedEvent.extendedProps?.cleanNotes && (
                    <div className="mb-2">
                      <div className="small fw-semibold text-muted mb-1">Notes / Description:</div>
                      <div className="p-2 border bg-white small rounded-0" style={{ minHeight: 40, whiteSpace: "pre-wrap" }}>
                        {selectedEvent.extendedProps.cleanNotes}
                      </div>
                    </div>
                  )}
                </ModalBody>

                <ModalFooter className="border-top p-2 d-flex justify-content-between">
                  <div>
                    <Button
                      type="button"
                      color="danger"
                      size="sm"
                      className="rounded-0 me-1"
                      onClick={() => {
                        setDeleteTarget(selectedEvent);
                        setDeleteModalOpen(true);
                      }}
                    >
                      <i className="ri-delete-bin-line me-1" />
                      Delete
                    </Button>
                  </div>

                  <div className="d-flex gap-2">
                    {!selectedEvent.extendedProps?.isCompleted && (
                      <Button
                        type="button"
                        color="success"
                        size="sm"
                        className="rounded-0"
                        onClick={() => handleMarkComplete(selectedEvent)}
                      >
                        <i className="ri-check-line me-1" />
                        Mark Completed
                      </Button>
                    )}
                    <Button
                      type="button"
                      className="btn btn-sm rounded-0 text-white"
                      style={{ backgroundColor: THEME.primary, borderColor: THEME.primary }}
                      onClick={() => openEditModal(selectedEvent)}
                    >
                      <i className="ri-pencil-line me-1" />
                      Edit Activity
                    </Button>
                  </div>
                </ModalFooter>
              </>
            )}
          </Modal>

          {/* ── Modal 2: In-Page Activity Form Modal (Create / Schedule / Edit) ── */}
          <Modal
            isOpen={formModalOpen}
            toggle={() => setFormModalOpen(false)}
            centered
            className="rounded-0"
            size="lg"
          >
            <ModalHeader
              toggle={() => setFormModalOpen(false)}
              className="border-bottom p-3"
              style={{ backgroundColor: "#f8fafc" }}
            >
              <div className="d-flex align-items-center gap-2">
                <i
                  className={
                    formModalMode === "log"
                      ? "ri-file-edit-line"
                      : formModalMode === "edit"
                      ? "ri-edit-line"
                      : "ri-calendar-line"
                  }
                  style={{ color: THEME.primary }}
                />
                <span className="fw-bold" style={{ color: THEME.textHeading }}>
                  {formModalMode === "log"
                    ? "Log Activity"
                    : formModalMode === "edit"
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
                    {CATEGORIES.map((cat) => {
                      const isSelected = formData.actType === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          className="btn btn-sm rounded-0 d-flex align-items-center gap-1.5 px-3 py-1.5 fw-medium"
                          style={{
                            backgroundColor: isSelected ? cat.color : cat.bgColor,
                            color: isSelected ? "#ffffff" : cat.color,
                            border: `1px solid ${cat.borderColor}`,
                          }}
                          onClick={() => {
                            setFormData({
                              ...formData,
                              actType: cat.id,
                              actSubtype: (SUBTYPES_BY_TYPE[cat.id] || ["General"])[0],
                            });
                          }}
                        >
                          <i className={cat.icon} />
                          {cat.title}
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
                      {(SUBTYPES_BY_TYPE[formData.actType] || ["General"]).map((sub) => (
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

                {/* Related Customer & Contact Person */}
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

                {/* Start Date & End Date */}
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

                {/* Notes / Description */}
                <div className="mb-2">
                  <Label className="form-label small fw-semibold mb-1">Notes / Description</Label>
                  <Input
                    type="textarea"
                    rows="3"
                    className="rounded-0 form-control-sm"
                    placeholder="Enter meeting takeaways, discussion points, or agenda..."
                    value={formData.callNotes}
                    onChange={(e) => setFormData({ ...formData, callNotes: e.target.value })}
                  />
                </div>

                {/* Mark as Completed toggle */}
                <div className="form-check mt-2">
                  <input
                    type="checkbox"
                    className="form-check-input rounded-0"
                    id="calendarMarkCompletedCheck"
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
                  <label className="form-check-label small" htmlFor="calendarMarkCompletedCheck">
                    Mark as Completed (Activity already taken place)
                  </label>
                </div>
              </ModalBody>

              <ModalFooter className="border-top p-2">
                <Button
                  type="button"
                  color="light"
                  className="rounded-0 small border"
                  onClick={() => setFormModalOpen(false)}
                  disabled={formSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="rounded-0 small text-white"
                  style={{ backgroundColor: THEME.primary, borderColor: THEME.primary }}
                  disabled={formSubmitting}
                >
                  {formSubmitting ? (
                    <>
                      <Spinner size="sm" className="me-1" />
                      Saving...
                    </>
                  ) : editingId ? (
                    "Update Activity"
                  ) : formModalMode === "log" ? (
                    "Save & Log"
                  ) : (
                    "Schedule Activity"
                  )}
                </Button>
              </ModalFooter>
            </Form>
          </Modal>
        </Container>
      </div>
    </React.Fragment>
  );
};

export default Calendar;