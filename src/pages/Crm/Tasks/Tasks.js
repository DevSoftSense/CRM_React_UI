import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  Col,
  Container,
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
  Nav,
  NavItem,
  NavLink,
  Row,
  Spinner,
  UncontrolledDropdown,
} from "reactstrap";
import classnames from "classnames";
import DeleteModal from "../../../Components/Common/DeleteModal";
import {
  completeTask,
  createTask,
  deactivateTask,
  getTaskById,
  getTaskLookups,
  getTasks,
  getTaskStats,
  updateTask,
} from "../../../helpers/crmTaskApi";
import { getOwnerDropdown } from "../../../helpers/crmOwnerApi";
import { toastApiError, toastSuccess } from "../../../helpers/crmToast";

const toLocalIsoDate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const todayIso = () => toLocalIsoDate(new Date());
const tomorrowIso = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return toLocalIsoDate(d);
};

const emptyForm = () => ({
  title: "",
  taskType: "TASK",
  priority: "MEDIUM",
  status: "TO_DO",
  company: "",
  contactPerson: "",
  dueDate: todayIso(),
  startDate: todayIso(),
  employeeId: "",
  notes: "",
});

const TYPE_CONFIG = {
  CALL: { label: "Call", icon: "ri-phone-line", color: "#10b981", bg: "#ecfdf5", text: "#065f46" },
  MEETING: { label: "Meeting", icon: "ri-calendar-event-line", color: "#8b5cf6", bg: "#f5f3ff", text: "#5b21b6" },
  EMAIL: { label: "Email", icon: "ri-mail-line", color: "#3b82f6", bg: "#eff6ff", text: "#1e40af" },
  TASK: { label: "Task", icon: "ri-checkbox-line", color: "#f59e0b", bg: "#fffbeb", text: "#92400e" },
  FOLLOW_UP: { label: "Follow-up", icon: "ri-flag-line", color: "#06b6d4", bg: "#ecfeff", text: "#155e75" },
  REVIEW: { label: "Review", icon: "ri-eye-line", color: "#6366f1", bg: "#eef2ff", text: "#3730a3" },
};

const getTypeConfig = (type, isDark = false) => {
  const key = String(type || "TASK").toUpperCase();
  const base = TYPE_CONFIG[key] || {
    label: type || "Task",
    icon: "ri-task-line",
    color: "#64748b",
    bg: "#f8fafc",
    text: "#334155",
  };
  if (!isDark) return base;
  const darkMap = {
    CALL: { color: "#34d399", bg: "rgba(16, 185, 129, 0.18)", text: "#34d399" },
    MEETING: { color: "#c084fc", bg: "rgba(139, 92, 246, 0.18)", text: "#c084fc" },
    EMAIL: { color: "#60a5fa", bg: "rgba(59, 130, 246, 0.18)", text: "#60a5fa" },
    TASK: { color: "#fbbf24", bg: "rgba(245, 158, 11, 0.18)", text: "#fbbf24" },
    FOLLOW_UP: { color: "#22d3ee", bg: "rgba(6, 182, 212, 0.18)", text: "#22d3ee" },
    REVIEW: { color: "#a5b4fc", bg: "rgba(99, 102, 241, 0.18)", text: "#a5b4fc" },
  };
  return {
    ...base,
    color: darkMap[key]?.color || base.color,
    bg: darkMap[key]?.bg || base.bg,
    text: darkMap[key]?.text || base.text,
  };
};

const getPriorityDot = (priority) => {
  const p = String(priority || "MEDIUM").toUpperCase();
  if (p === "HIGH") return { color: "#ef4444", label: "High" };
  if (p === "LOW") return { color: "#10b981", label: "Low" };
  return { color: "#f59e0b", label: "Medium" };
};

const getStatusBadge = (status, isOverdue, isDark = false) => {
  const s = String(status || "TO_DO").toUpperCase();
  if (s === "COMPLETED") {
    return isDark
      ? { bg: "rgba(16, 185, 129, 0.2)", text: "#34d399", border: "rgba(16, 185, 129, 0.35)", label: "Completed" }
      : { bg: "#ecfdf5", text: "#065f46", border: "#a7f3d0", label: "Completed" };
  }
  if (isOverdue || s === "OVERDUE") {
    return isDark
      ? { bg: "rgba(239, 68, 68, 0.25)", text: "#f87171", border: "rgba(239, 68, 68, 0.4)", label: "Overdue" }
      : { bg: "#fef2f2", text: "#991b1b", border: "#fecaca", label: "Overdue" };
  }
  if (s === "IN_PROGRESS") {
    return isDark
      ? { bg: "rgba(127, 29, 29, 0.25)", text: "#fca5a5", border: "rgba(127, 29, 29, 0.45)", label: "In Progress" }
      : { bg: "#fef2f2", text: "#7f1d1d", border: "#fecaca", label: "In Progress" };
  }
  return isDark
    ? { bg: "rgba(245, 158, 11, 0.2)", text: "#fbbf24", border: "rgba(245, 158, 11, 0.35)", label: "To Do" }
    : { bg: "#fffbeb", text: "#92400e", border: "#fde68a", label: "To Do" };
};

const getInitials = (name) => {
  if (!name) return "UN";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const Tasks = () => {
  document.title = "Tasks | SoftOnCloud CRM";

  // Redux Dark Mode detection
  const { layoutModeType } = useSelector((state) => ({
    layoutModeType: state.Layout.layoutModeType,
  }));
  const isDark =
    layoutModeType === "dark" ||
    (typeof document !== "undefined" &&
      (document.documentElement.getAttribute("data-bs-theme") === "dark" ||
        document.documentElement.getAttribute("data-layout-mode") === "dark"));

  const primaryColor = isDark ? "#fca5a5" : "#7f1d1d";
  const cardBg = isDark ? "#121212" : "#ffffff";
  const cardBorder = isDark ? "#262626" : "#e2e8f0";
  const subtleBg = isDark ? "#161b22" : "#f8fafc";
  const subtleBorder = isDark ? "#2d3748" : "#cbd5e1";
  const textTitle = isDark ? "#f1f5f9" : "#0f172a";
  const textSub = isDark ? "#94a3b8" : "#64748b";

  // Data states from DB
  const [items, setItems] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [stats, setStats] = useState({
    totalTasks: 0,
    toDoTasks: 0,
    inProgressTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
    distribution: [],
    pendingTasks: [],
  });

  // Filter states
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [dueDateFrom, setDueDateFrom] = useState("");
  const [dueDateTo, setDueDateTo] = useState("");
  const [dateRangeLabel, setDateRangeLabel] = useState("All Dates");
  const [selectedIds, setSelectedIds] = useState([]);

  // Lookups and Owners from DB (Zero hardcoded data)
  const [owners, setOwners] = useState([]);
  const [lookups, setLookups] = useState({
    taskStatus: [],
    taskPriority: [],
    taskType: [],
    accounts: [],
  });

  // UI / Loading states
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState("");

  // In-Page Create / Edit Modal
  const [modal, setModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // In-Page Task Details Modal
  const [detailModal, setDetailModal] = useState(false);
  const [detailTask, setDetailTask] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [completingDetail, setCompletingDetail] = useState(false);

  // In-Page Delete Modal
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Load Lookups and Owners from Database
  const loadLookups = useCallback(async () => {
    try {
      const [lu, own] = await Promise.all([
        getTaskLookups(),
        getOwnerDropdown(),
      ]);
      setLookups({
        taskStatus: lu?.taskStatus || lu?.TaskStatus || [],
        taskPriority: lu?.taskPriority || lu?.TaskPriority || [],
        taskType: lu?.taskType || lu?.TaskType || [],
        accounts: lu?.accounts || lu?.Accounts || [],
      });
      setOwners(Array.isArray(own) ? own : own?.items || []);
    } catch (err) {
      console.warn("Failed to load lookups from DB:", err);
    }
  }, []);

  useEffect(() => {
    loadLookups();
  }, [loadLookups]);

  // Load Stats from Database
  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await getTaskStats();
      setStats({
        totalTasks: res?.totalTasks ?? res?.total_tasks ?? 0,
        toDoTasks: res?.toDoTasks ?? res?.to_do_tasks ?? 0,
        inProgressTasks: res?.inProgressTasks ?? res?.in_progress_tasks ?? 0,
        completedTasks: res?.completedTasks ?? res?.completed_tasks ?? 0,
        overdueTasks: res?.overdueTasks ?? res?.overdue_tasks ?? 0,
        distribution: res?.distribution || [],
        pendingTasks: res?.pendingTasks || res?.pending_tasks || [],
      });
    } catch (err) {
      console.warn("Failed to load task stats from DB:", err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Load Task List from Database
  const loadList = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getTasks({
        search: search || undefined,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        taskType: typeFilter || undefined,
        employeeId: ownerFilter || undefined,
        dueFrom: dueDateFrom || undefined,
        dueTo: dueDateTo || undefined,
        tab: activeTab || "all",
        limit: pageSize,
        offset: page * pageSize,
      });
      const rows = res?.items || res?.Items || [];
      setItems(rows);
      setTotalCount(Number(res?.totalCount ?? res?.TotalCount ?? rows[0]?.totalCount ?? 0));
    } catch (err) {
      setItems([]);
      setTotalCount(0);
      const msg = err?.message || "Failed to load tasks.";
      setError(msg);
      toastApiError(err, msg);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, priorityFilter, typeFilter, ownerFilter, dueDateFrom, dueDateTo, activeTab, page, pageSize]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setPage(0);
  };

  // Quick KPI Card Filter
  const handleKpiClick = (status) => {
    if (statusFilter === status) {
      setStatusFilter("");
    } else {
      setStatusFilter(status);
    }
    setPage(0);
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearchInput("");
    setSearch("");
    setStatusFilter("");
    setPriorityFilter("");
    setTypeFilter("");
    setOwnerFilter("");
    setDueDateFrom("");
    setDueDateTo("");
    setDateRangeLabel("All Dates");
    setActiveTab("all");
    setPage(0);
  };

  // Date range presets helper
  const handlePresetRange = (preset) => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const toIso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const fmt = (d) =>
      d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

    if (preset === "THIS_MONTH") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setDueDateFrom(toIso(start));
      setDueDateTo(toIso(end));
      setDateRangeLabel(`${fmt(start)} - ${fmt(end)}`);
    } else if (preset === "TODAY") {
      const today = toIso(now);
      setDueDateFrom(today);
      setDueDateTo(today);
      setDateRangeLabel(`Today: ${fmt(now)}`);
    } else if (preset === "THIS_WEEK") {
      const day = now.getDay() || 7;
      const start = new Date(now);
      start.setDate(now.getDate() - day + 1);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      setDueDateFrom(toIso(start));
      setDueDateTo(toIso(end));
      setDateRangeLabel(`${fmt(start)} - ${fmt(end)}`);
    } else if (preset === "NEXT_30") {
      const end = new Date(now);
      end.setDate(now.getDate() + 30);
      setDueDateFrom(toIso(now));
      setDueDateTo(toIso(end));
      setDateRangeLabel(`${fmt(now)} - ${fmt(end)}`);
    } else {
      setDueDateFrom("");
      setDueDateTo("");
      setDateRangeLabel("All Dates");
    }
    setPage(0);
  };

  // Checkbox selection
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(items.map((t) => t.taskId));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // In-Page Create Task Modal
  const openCreateModal = (presetType = "TASK") => {
    setEditMode(false);
    setEditId(null);
    setFormError("");
    const next = emptyForm();
    next.taskType = presetType;
    if (owners[0]?.ownerId || owners[0]?.employee_id) {
      next.employeeId = String(owners[0].ownerId || owners[0].employee_id);
    }
    setForm(next);
    setModal(true);
  };

  // In-Page Edit Task Modal
  const openEditModal = (task) => {
    setEditMode(true);
    setEditId(task.taskId);
    setFormError("");
    setForm({
      title: task.title || "",
      taskType: task.taskType || "TASK",
      priority: task.priority || "MEDIUM",
      status: task.taskStatus === "OVERDUE" ? "TO_DO" : task.taskStatus || "TO_DO",
      company: task.company || "",
      contactPerson: task.contactPerson || "",
      dueDate: task.dueDate || todayIso(),
      startDate: task.startDate || todayIso(),
      employeeId: task.employeeId ? String(task.employeeId) : owners[0]?.ownerId ? String(owners[0].ownerId) : "",
      notes: task.notes || "",
    });
    setModal(true);
  };

  // Save Task (Create or Update) to Database
  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setFormError("Task title is required.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const payload = {
        title: form.title.trim(),
        taskType: form.taskType || "TASK",
        priority: form.priority || "MEDIUM",
        status: form.status || "TO_DO",
        company: form.company?.trim() || null,
        contactPerson: form.contactPerson?.trim() || null,
        dueDate: form.dueDate || todayIso(),
        startDate: form.startDate || todayIso(),
        employeeId: form.employeeId ? parseInt(form.employeeId, 10) : null,
        notes: form.notes?.trim() || null,
      };

      if (editMode && editId) {
        await updateTask(editId, payload);
        toastSuccess("Task updated successfully.");
      } else {
        await createTask(payload);
        toastSuccess("Task created successfully.");
      }
      setModal(false);
      await Promise.all([loadList(), loadStats()]);
    } catch (err) {
      const msg = err?.message || "Failed to save task.";
      setFormError(msg);
      toastApiError(err, msg);
    } finally {
      setSaving(false);
    }
  };

  // In-Page Task Details Modal
  const openDetailModal = async (taskId) => {
    setDetailLoading(true);
    setDetailModal(true);
    try {
      const data = await getTaskById(taskId);
      setDetailTask(data);
    } catch (err) {
      toastApiError(err, "Failed to load task details.");
      setDetailModal(false);
    } finally {
      setDetailLoading(false);
    }
  };

  // Complete Task In-Page
  const handleCompleteTask = async (taskId) => {
    setCompletingDetail(true);
    try {
      await completeTask(taskId);
      toastSuccess("Task marked as completed.");
      if (detailModal && detailTask?.taskId === taskId) {
        const updated = await getTaskById(taskId);
        setDetailTask(updated);
      }
      await Promise.all([loadList(), loadStats()]);
    } catch (err) {
      toastApiError(err, "Failed to complete task.");
    } finally {
      setCompletingDetail(false);
    }
  };

  // In-Page Delete Confirmation
  const openDeleteModal = (task) => {
    setDeleteTarget(task);
    setDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deactivateTask(deleteTarget.taskId);
      toastSuccess("Task deleted successfully.");
      setDeleteModal(false);
      setDeleteTarget(null);
      if (detailModal && detailTask?.taskId === deleteTarget.taskId) {
        setDetailModal(false);
      }
      await Promise.all([loadList(), loadStats()]);
    } catch (err) {
      toastApiError(err, "Failed to delete task.");
    } finally {
      setDeleting(false);
    }
  };

  // Export current list as CSV
  const handleExportCsv = () => {
    if (items.length === 0) {
      toastApiError({ message: "No tasks to export." });
      return;
    }
    const headers = ["Task Code", "Title", "Type", "Priority", "Status", "Due Date", "Owner", "Company", "Contact"];
    const rows = items.map((t) => [
      `"${t.taskCode || ""}"`,
      `"${(t.title || "").replace(/"/g, '""')}"`,
      `"${t.taskTypeName || t.taskType || ""}"`,
      `"${t.priorityName || t.priority || ""}"`,
      `"${t.taskStatusName || t.taskStatus || ""}"`,
      `"${t.dueDate || ""}"`,
      `"${(t.ownerName || "").replace(/"/g, '""')}"`,
      `"${(t.company || "").replace(/"/g, '""')}"`,
      `"${(t.contactPerson || "").replace(/"/g, '""')}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `crm_tasks_${todayIso()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toastSuccess("Tasks exported successfully as CSV.");
  };

  // Pagination calculation
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const startItem = totalCount > 0 ? page * pageSize + 1 : 0;
  const endItem = Math.min((page + 1) * pageSize, totalCount);

  return (
    <div className="page-content" style={{ minHeight: "100vh" }}>
      <style>{`
        .crm-pending-task-row {
          border-bottom: 1px solid ${isDark ? "#262626" : "#f1f5f9"};
          transition: background-color 0.15s ease;
          padding: 8px 6px;
        }
        .crm-pending-task-row:last-child {
          border-bottom: none;
        }
        .crm-pending-task-row:hover {
          background-color: ${isDark ? "rgba(255, 255, 255, 0.05)" : "#f8fafc"};
        }
        .crm-custom-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .crm-custom-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .crm-custom-scroll::-webkit-scrollbar-thumb {
          background: ${isDark ? "#334155" : "#cbd5e1"};
          border-radius: 0px;
        }
        .crm-custom-scroll::-webkit-scrollbar-thumb:hover {
          background: ${isDark ? "#475569" : "#94a3b8"};
        }
      `}</style>
      <Container fluid>
        {/* Clean Top Header (No duplicate title) */}
        <div className="d-flex flex-wrap align-items-center justify-content-between mb-3 pb-1">
          <div>
            <h4 className="fs-18 fw-bold mb-1" style={{ color: textTitle }}>Tasks</h4>
            <div className="fs-12" style={{ color: textSub }}>Create, assign and track tasks across your sales pipeline</div>
          </div>
          <div className="d-flex align-items-center gap-2 mt-2 mt-sm-0">
            <Button
              color="secondary"
              outline
              className="rounded-0 d-flex align-items-center gap-1 fs-12"
              style={{
                borderRadius: 0,
                borderColor: subtleBorder,
                backgroundColor: subtleBg,
                color: textTitle,
              }}
              onClick={handleExportCsv}
            >
              <i className="ri-download-2-line"></i> Export CSV
            </Button>
            <Button
              className="rounded-0 d-flex align-items-center gap-1 fs-12 text-white"
              style={{
                borderRadius: 0,
                backgroundColor: primaryColor,
                borderColor: primaryColor,
              }}
              onClick={() => openCreateModal("TASK")}
            >
              <i className="ri-add-line"></i> New Task
            </Button>
            <UncontrolledDropdown>
              <DropdownToggle
                tag="button"
                className="btn rounded-0 px-2 py-1"
                style={{
                  borderRadius: 0,
                  border: `1px solid ${subtleBorder}`,
                  backgroundColor: subtleBg,
                  color: textTitle,
                }}
              >
                <i className="ri-more-2-fill fs-15"></i>
              </DropdownToggle>
              <DropdownMenu
                end
                className="rounded-0 shadow-sm fs-12"
                style={{
                  borderRadius: 0,
                  backgroundColor: cardBg,
                  borderColor: cardBorder,
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.2)",
                }}
              >
                <DropdownItem
                  onClick={() => { loadList(); loadStats(); }}
                  style={{ borderRadius: 0, color: textTitle }}
                >
                  <i className="ri-refresh-line me-2"></i> Refresh Data
                </DropdownItem>
                <DropdownItem
                  onClick={handleResetFilters}
                  style={{ borderRadius: 0, color: textTitle }}
                >
                  <i className="ri-filter-off-line me-2"></i> Reset Filters
                </DropdownItem>
              </DropdownMenu>
            </UncontrolledDropdown>
          </div>
        </div>

        {/* Error Alert */}
        {error ? (
          <Alert color="danger" className="rounded-0 mb-3 fs-12">
            {error}
          </Alert>
        ) : null}

        {/* ================================================================= */}
        {/* 1. TOP KPI SUMMARY STRIP (5 Cards in 1 Row)                       */}
        {/* ================================================================= */}
        <Row className="g-3 mb-3">
          {/* Card 1: All Tasks */}
          <Col xs={12} sm={6} md={4} lg={true}>
            <Card
              className="rounded-0 shadow-sm h-100 cursor-pointer"
              style={{
                borderRadius: 0,
                border: `1px solid ${cardBorder}`,
                borderLeft: !statusFilter
                  ? `3px solid ${primaryColor}`
                  : `3px solid ${subtleBorder}`,
                cursor: "pointer",
                transition: "all 0.15s ease-in-out",
                backgroundColor: !statusFilter
                  ? (isDark ? "rgba(127, 29, 29, 0.25)" : "#fef2f2")
                  : cardBg,
              }}
              onClick={() => handleKpiClick("")}
            >
              <CardBody className="p-3">
                <div className="d-flex align-items-center gap-3">
                  <div
                    className="d-flex align-items-center justify-content-center"
                    style={{
                      width: "42px",
                      height: "42px",
                      backgroundColor: isDark ? "rgba(127, 29, 29, 0.3)" : "#fef2f2",
                      color: primaryColor,
                      borderRadius: "0px",
                    }}
                  >
                    <i className="ri-checkbox-multiple-line fs-20"></i>
                  </div>
                  <div>
                    <h3 className="fw-bold mb-0 fs-20" style={{ color: textTitle }}>
                      {statsLoading ? <Spinner size="sm" /> : stats.totalTasks}
                    </h3>
                    <div className="fw-semibold fs-12" style={{ color: textTitle }}>All Tasks</div>
                    <div className="fs-11" style={{ color: textSub }}>View all tasks</div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </Col>

          {/* Card 2: To Do */}
          <Col xs={12} sm={6} md={4} lg={true}>
            <Card
              className="rounded-0 shadow-sm h-100 cursor-pointer"
              style={{
                borderRadius: 0,
                border: `1px solid ${cardBorder}`,
                borderLeft: statusFilter === "TO_DO"
                  ? "3px solid #f59e0b"
                  : `3px solid ${isDark ? "rgba(245, 158, 11, 0.35)" : "#fde68a"}`,
                cursor: "pointer",
                transition: "all 0.15s ease-in-out",
                backgroundColor: statusFilter === "TO_DO"
                  ? (isDark ? "rgba(245, 158, 11, 0.2)" : "#fffbeb")
                  : cardBg,
              }}
              onClick={() => handleKpiClick("TO_DO")}
            >
              <CardBody className="p-3">
                <div className="d-flex align-items-center gap-3">
                  <div
                    className="d-flex align-items-center justify-content-center"
                    style={{
                      width: "42px",
                      height: "42px",
                      backgroundColor: isDark ? "rgba(245, 158, 11, 0.2)" : "#fffbeb",
                      color: "#f59e0b",
                      borderRadius: "0px",
                    }}
                  >
                    <i className="ri-time-line fs-20"></i>
                  </div>
                  <div>
                    <h3 className="fw-bold mb-0 fs-20" style={{ color: textTitle }}>
                      {statsLoading ? <Spinner size="sm" /> : stats.toDoTasks}
                    </h3>
                    <div className="fw-semibold fs-12" style={{ color: textTitle }}>To Do</div>
                    <div className="fs-11" style={{ color: textSub }}>Tasks to be started</div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </Col>

          {/* Card 3: In Progress */}
          <Col xs={12} sm={6} md={4} lg={true}>
            <Card
              className="rounded-0 shadow-sm h-100 cursor-pointer"
              style={{
                borderRadius: 0,
                border: `1px solid ${cardBorder}`,
                borderLeft: statusFilter === "IN_PROGRESS"
                  ? `3px solid ${primaryColor}`
                  : `3px solid ${isDark ? "rgba(127, 29, 29, 0.4)" : "#fecaca"}`,
                cursor: "pointer",
                transition: "all 0.15s ease-in-out",
                backgroundColor: statusFilter === "IN_PROGRESS"
                  ? (isDark ? "rgba(127, 29, 29, 0.25)" : "#fef2f2")
                  : cardBg,
              }}
              onClick={() => handleKpiClick("IN_PROGRESS")}
            >
              <CardBody className="p-3">
                <div className="d-flex align-items-center gap-3">
                  <div
                    className="d-flex align-items-center justify-content-center"
                    style={{
                      width: "42px",
                      height: "42px",
                      backgroundColor: isDark ? "rgba(127, 29, 29, 0.3)" : "#fef2f2",
                      color: primaryColor,
                      borderRadius: "0px",
                    }}
                  >
                    <i className="ri-play-circle-line fs-20"></i>
                  </div>
                  <div>
                    <h3 className="fw-bold mb-0 fs-20" style={{ color: textTitle }}>
                      {statsLoading ? <Spinner size="sm" /> : stats.inProgressTasks}
                    </h3>
                    <div className="fw-semibold fs-12" style={{ color: textTitle }}>In Progress</div>
                    <div className="fs-11" style={{ color: textSub }}>Tasks in progress</div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </Col>

          {/* Card 4: Completed */}
          <Col xs={12} sm={6} md={4} lg={true}>
            <Card
              className="rounded-0 shadow-sm h-100 cursor-pointer"
              style={{
                borderRadius: 0,
                border: `1px solid ${cardBorder}`,
                borderLeft: statusFilter === "COMPLETED"
                  ? "3px solid #10b981"
                  : `3px solid ${isDark ? "rgba(16, 185, 129, 0.35)" : "#a7f3d0"}`,
                cursor: "pointer",
                transition: "all 0.15s ease-in-out",
                backgroundColor: statusFilter === "COMPLETED"
                  ? (isDark ? "rgba(16, 185, 129, 0.2)" : "#ecfdf5")
                  : cardBg,
              }}
              onClick={() => handleKpiClick("COMPLETED")}
            >
              <CardBody className="p-3">
                <div className="d-flex align-items-center gap-3">
                  <div
                    className="d-flex align-items-center justify-content-center"
                    style={{
                      width: "42px",
                      height: "42px",
                      backgroundColor: isDark ? "rgba(16, 185, 129, 0.2)" : "#ecfdf5",
                      color: "#10b981",
                      borderRadius: "0px",
                    }}
                  >
                    <i className="ri-checkbox-circle-line fs-20"></i>
                  </div>
                  <div>
                    <h3 className="fw-bold mb-0 fs-20" style={{ color: textTitle }}>
                      {statsLoading ? <Spinner size="sm" /> : stats.completedTasks}
                    </h3>
                    <div className="fw-semibold fs-12" style={{ color: textTitle }}>Completed</div>
                    <div className="fs-11" style={{ color: textSub }}>Tasks completed</div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </Col>

          {/* Card 5: Overdue */}
          <Col xs={12} sm={6} md={4} lg={true}>
            <Card
              className="rounded-0 shadow-sm h-100 cursor-pointer"
              style={{
                borderRadius: 0,
                border: `1px solid ${cardBorder}`,
                borderLeft: statusFilter === "OVERDUE"
                  ? "3px solid #ef4444"
                  : `3px solid ${isDark ? "rgba(239, 68, 68, 0.35)" : "#fecaca"}`,
                cursor: "pointer",
                transition: "all 0.15s ease-in-out",
                backgroundColor: statusFilter === "OVERDUE"
                  ? (isDark ? "rgba(239, 68, 68, 0.25)" : "#fef2f2")
                  : cardBg,
              }}
              onClick={() => handleKpiClick("OVERDUE")}
            >
              <CardBody className="p-3">
                <div className="d-flex align-items-center gap-3">
                  <div
                    className="d-flex align-items-center justify-content-center"
                    style={{
                      width: "42px",
                      height: "42px",
                      backgroundColor: isDark ? "rgba(239, 68, 68, 0.25)" : "#fef2f2",
                      color: "#ef4444",
                      borderRadius: "0px",
                    }}
                  >
                    <i className="ri-error-warning-line fs-20"></i>
                  </div>
                  <div>
                    <h3 className="fw-bold mb-0 fs-20" style={{ color: textTitle }}>
                      {statsLoading ? <Spinner size="sm" /> : stats.overdueTasks}
                    </h3>
                    <div className="fw-semibold fs-12" style={{ color: textTitle }}>Overdue</div>
                    <div className="fs-11" style={{ color: textSub }}>Past due tasks</div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>

        {/* ================================================================= */}
        {/* 2. MAIN 2-COLUMN LAYOUT: Tasks Table (Col 8/9) + Sidebar (Col 4/3)  */}
        {/* ================================================================= */}
        <Row className="g-3">
          {/* LEFT / CENTER COLUMN: Tabs, Filters & Tasks Table */}
          <Col lg={8} xl={9}>
            <Card
              className="rounded-0 shadow-sm border-0 mb-3"
              style={{ borderRadius: 0, backgroundColor: cardBg, border: `1px solid ${cardBorder}` }}
            >
              <CardBody className="p-0">
                {/* Clean Underline Tabs Row with Date Range Filter on Right (Exact Mockup Match) */}
                <div
                  className="border-bottom px-3 pt-2 d-flex flex-wrap align-items-center justify-content-between gap-2"
                  style={{ borderColor: cardBorder }}
                >
                  <Nav className="border-bottom-0 d-flex gap-1">
                    {[
                      { key: "all", label: "All Tasks" },
                      { key: "my", label: "My Tasks" },
                      { key: "assigned", label: "Assigned To Me" },
                      { key: "created", label: "Created By Me" },
                      { key: "following", label: "Following" },
                    ].map((tab) => (
                      <NavItem key={tab.key}>
                        <button
                          type="button"
                          className="btn btn-link text-decoration-none fw-semibold fs-13 py-2 px-3 rounded-0"
                          style={{
                            color: activeTab === tab.key ? primaryColor : textSub,
                            borderBottom: activeTab === tab.key ? `3px solid ${primaryColor}` : "3px solid transparent",
                            backgroundColor: "transparent",
                          }}
                          onClick={() => handleTabChange(tab.key)}
                        >
                          {tab.label}
                        </button>
                      </NavItem>
                    ))}
                  </Nav>

                  {/* Date Range Picker & Filter Funnel (Exact Mockup Match) */}
                  <div className="d-flex align-items-center gap-2 pb-2 pb-sm-1">
                    <UncontrolledDropdown>
                      <DropdownToggle
                        tag="button"
                        className="btn d-flex align-items-center justify-content-between px-2 py-1 fs-12 rounded-0"
                        style={{
                          border: `1px solid ${subtleBorder}`,
                          minWidth: "190px",
                          backgroundColor: subtleBg,
                          color: textTitle,
                        }}
                      >
                        <span className="d-flex align-items-center gap-2 text-truncate">
                          <i className="ri-calendar-line fs-13" style={{ color: textSub }}></i>
                          <span className="fw-medium" style={{ color: textTitle }}>{dateRangeLabel || "All Dates"}</span>
                        </span>
                        <i className="ri-arrow-down-s-line fs-12 ms-2" style={{ color: textSub }}></i>
                      </DropdownToggle>
                      <DropdownMenu
                        end
                        className="rounded-0 shadow-sm fs-12 p-2"
                        style={{
                          borderRadius: 0,
                          backgroundColor: cardBg,
                          borderColor: cardBorder,
                          minWidth: "260px",
                          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.2)",
                        }}
                      >
                        <div className="fs-11 px-2 py-1 fw-semibold text-uppercase" style={{ color: textSub }}>Presets</div>
                        <DropdownItem
                          onClick={() => handlePresetRange("THIS_MONTH")}
                          style={{ borderRadius: 0, color: textTitle }}
                        >
                          <i className="ri-calendar-check-line me-2 text-primary"></i> This Month
                        </DropdownItem>
                        <DropdownItem
                          onClick={() => handlePresetRange("TODAY")}
                          style={{ borderRadius: 0, color: textTitle }}
                        >
                          <i className="ri-time-line me-2 text-success"></i> Today
                        </DropdownItem>
                        <DropdownItem
                          onClick={() => handlePresetRange("THIS_WEEK")}
                          style={{ borderRadius: 0, color: textTitle }}
                        >
                          <i className="ri-calendar-2-line me-2 text-info"></i> This Week
                        </DropdownItem>
                        <DropdownItem
                          onClick={() => handlePresetRange("NEXT_30")}
                          style={{ borderRadius: 0, color: textTitle }}
                        >
                          <i className="ri-calendar-todo-line me-2 text-warning"></i> Next 30 Days
                        </DropdownItem>
                        <DropdownItem divider style={{ borderColor: cardBorder }} />
                        <div className="px-2 py-1">
                          <div className="fs-11 mb-2 fw-semibold text-uppercase" style={{ color: textSub }}>Custom Range</div>
                          <div className="mb-2">
                            <label className="form-label fs-10 mb-0" style={{ color: textSub }}>From</label>
                            <Input
                              type="date"
                              className="form-control form-control-sm rounded-0 fs-11"
                              value={dueDateFrom}
                              onChange={(e) => setDueDateFrom(e.target.value)}
                              style={{
                                borderRadius: 0,
                                backgroundColor: isDark ? "#1a1d21" : "#ffffff",
                                borderColor: subtleBorder,
                                color: textTitle,
                              }}
                            />
                          </div>
                          <div className="mb-2">
                            <label className="form-label fs-10 mb-0" style={{ color: textSub }}>To</label>
                            <Input
                              type="date"
                              className="form-control form-control-sm rounded-0 fs-11"
                              value={dueDateTo}
                              onChange={(e) => setDueDateTo(e.target.value)}
                              style={{
                                borderRadius: 0,
                                backgroundColor: isDark ? "#1a1d21" : "#ffffff",
                                borderColor: subtleBorder,
                                color: textTitle,
                              }}
                            />
                          </div>
                          <div className="d-flex gap-1 mt-2">
                            <Button
                              size="sm"
                              className="w-100 rounded-0 text-white fs-11"
                              style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
                              onClick={() => {
                                if (dueDateFrom && dueDateTo) {
                                  setDateRangeLabel(`${dueDateFrom} - ${dueDateTo}`);
                                } else if (dueDateFrom) {
                                  setDateRangeLabel(`From: ${dueDateFrom}`);
                                } else if (dueDateTo) {
                                  setDateRangeLabel(`Up to: ${dueDateTo}`);
                                } else {
                                  setDateRangeLabel("All Dates");
                                }
                                setPage(0);
                              }}
                            >
                              Apply
                            </Button>
                            <Button
                              size="sm"
                              color="light"
                              className="rounded-0 fs-11"
                              style={{
                                borderRadius: 0,
                                border: `1px solid ${subtleBorder}`,
                                backgroundColor: subtleBg,
                                color: textTitle,
                              }}
                              onClick={() => handlePresetRange("ALL")}
                            >
                              Clear
                            </Button>
                          </div>
                        </div>
                      </DropdownMenu>
                    </UncontrolledDropdown>

                    {/* Filter Funnel Icon Button */}
                    <Button
                      color="light"
                      size="sm"
                      className="rounded-0 p-1 px-2 d-flex align-items-center justify-content-center"
                      title="Reset Filters"
                      onClick={handleResetFilters}
                      style={{
                        borderRadius: 0,
                        border: `1px solid ${subtleBorder}`,
                        backgroundColor: subtleBg,
                        color: textTitle,
                        height: "31px",
                        width: "31px",
                      }}
                    >
                      <i className="ri-filter-3-line fs-13" style={{ color: textSub }}></i>
                    </Button>
                  </div>
                </div>

                {/* Filters Controls Row (100% Dynamic from DB lookups) */}
                <div
                  className="p-3 border-bottom"
                  style={{
                    borderColor: cardBorder,
                    backgroundColor: isDark ? "#161b22" : "rgba(248, 250, 252, 0.5)",
                  }}
                >
                  <Row className="g-2 align-items-center">
                    {/* Owner Dropdown from DB */}
                    <Col xs={6} sm={4} md={2}>
                      <Input
                        type="select"
                        className="form-select form-select-sm rounded-0 fs-12"
                        value={ownerFilter}
                        onChange={(e) => { setOwnerFilter(e.target.value); setPage(0); }}
                        style={{
                          borderRadius: 0,
                          backgroundColor: isDark ? "#1a1d21" : "#ffffff",
                          borderColor: subtleBorder,
                          color: textTitle,
                        }}
                      >
                        <option value="">All Owners</option>
                        {owners.map((o) => (
                          <option key={o.ownerId || o.employee_id} value={o.ownerId || o.employee_id}>
                            {o.fullName || o.full_name}
                          </option>
                        ))}
                      </Input>
                    </Col>

                    {/* Type Dropdown from DB Lookups */}
                    <Col xs={6} sm={4} md={2}>
                      <Input
                        type="select"
                        className="form-select form-select-sm rounded-0 fs-12"
                        value={typeFilter}
                        onChange={(e) => { setTypeFilter(e.target.value); setPage(0); }}
                        style={{
                          borderRadius: 0,
                          backgroundColor: isDark ? "#1a1d21" : "#ffffff",
                          borderColor: subtleBorder,
                          color: textTitle,
                        }}
                      >
                        <option value="">All Types</option>
                        {lookups.taskType.map((t) => (
                          <option key={t.masterCode || t.master_code} value={t.masterCode || t.master_code}>
                            {t.masterName || t.master_name}
                          </option>
                        ))}
                      </Input>
                    </Col>

                    {/* Priority Dropdown from DB Lookups */}
                    <Col xs={6} sm={4} md={2}>
                      <Input
                        type="select"
                        className="form-select form-select-sm rounded-0 fs-12"
                        value={priorityFilter}
                        onChange={(e) => { setPriorityFilter(e.target.value); setPage(0); }}
                        style={{
                          borderRadius: 0,
                          backgroundColor: isDark ? "#1a1d21" : "#ffffff",
                          borderColor: subtleBorder,
                          color: textTitle,
                        }}
                      >
                        <option value="">All Priority</option>
                        {lookups.taskPriority.map((p) => (
                          <option key={p.masterCode || p.master_code} value={p.masterCode || p.master_code}>
                            {p.masterName || p.master_name}
                          </option>
                        ))}
                      </Input>
                    </Col>

                    {/* Status Dropdown from DB Lookups */}
                    <Col xs={6} sm={4} md={2}>
                      <Input
                        type="select"
                        className="form-select form-select-sm rounded-0 fs-12"
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
                        style={{
                          borderRadius: 0,
                          backgroundColor: isDark ? "#1a1d21" : "#ffffff",
                          borderColor: subtleBorder,
                          color: textTitle,
                        }}
                      >
                        <option value="">All Status</option>
                        {lookups.taskStatus.map((s) => (
                          <option key={s.masterCode || s.master_code} value={s.masterCode || s.master_code}>
                            {s.masterName || s.master_name}
                          </option>
                        ))}
                      </Input>
                    </Col>

                    {/* Search Input */}
                    <Col xs={12} sm={8} md={3}>
                      <div className="position-relative">
                        <Input
                          type="text"
                          placeholder="Search tasks, company..."
                          className="form-control form-control-sm rounded-0 fs-12 pe-4"
                          value={searchInput}
                          onChange={(e) => setSearchInput(e.target.value)}
                          style={{
                            borderRadius: 0,
                            backgroundColor: isDark ? "#1a1d21" : "#ffffff",
                            borderColor: subtleBorder,
                            color: textTitle,
                          }}
                        />
                        <i className="ri-search-line position-absolute top-50 end-0 translate-middle-y me-2 fs-13" style={{ color: textSub }}></i>
                      </div>
                    </Col>

                    {/* Reset Button */}
                    <Col xs={12} sm={4} md={1} className="text-end">
                      <Button
                        color="light"
                        size="sm"
                        className="rounded-0 w-100 p-1"
                        title="Reset Filters"
                        onClick={handleResetFilters}
                        style={{
                          borderRadius: 0,
                          border: `1px solid ${subtleBorder}`,
                          backgroundColor: subtleBg,
                          color: textTitle,
                        }}
                      >
                        <i className="ri-filter-off-line"></i>
                      </Button>
                    </Col>
                  </Row>
                </div>

                {/* Tasks Table */}
                <div className="table-responsive" style={{ minHeight: "340px" }}>
                  <table className="table table-hover align-middle mb-0" style={{ fontSize: "13px" }}>
                    <thead style={{ backgroundColor: subtleBg, borderBottom: `1px solid ${cardBorder}` }}>
                      <tr>
                        <th style={{ width: "35px" }} className="text-center px-2 py-3">
                          <input
                            type="checkbox"
                            className="form-check-input rounded-0"
                            checked={items.length > 0 && selectedIds.length === items.length}
                            onChange={handleSelectAll}
                          />
                        </th>
                        <th className="fw-semibold text-center py-3" style={{ width: "105px", color: textSub }}>
                          Actions
                        </th>
                        <th className="fw-semibold py-3" style={{ minWidth: "220px", color: textSub }}>
                          Task
                        </th>
                        <th className="fw-semibold py-3" style={{ minWidth: "150px", color: textSub }}>
                          Related To
                        </th>
                        <th className="fw-semibold py-3" style={{ minWidth: "100px", color: textSub }}>
                          Type
                        </th>
                        <th className="fw-semibold py-3" style={{ minWidth: "90px", color: textSub }}>
                          Priority
                        </th>
                        <th className="fw-semibold py-3" style={{ minWidth: "130px", color: textSub }}>
                          Owner
                        </th>
                        <th className="fw-semibold py-3" style={{ minWidth: "120px", color: textSub }}>
                          Due Date
                        </th>
                        <th className="fw-semibold py-3" style={{ minWidth: "100px", color: textSub }}>
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={9} className="text-center py-5" style={{ color: textSub }}>
                            <Spinner size="sm" className="me-2" style={{ color: primaryColor }} /> Loading tasks from database...
                          </td>
                        </tr>
                      ) : items.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="text-center py-5" style={{ color: textSub }}>
                            <i className="ri-inbox-line fs-32 d-block mb-2" style={{ color: textSub }}></i>
                            No tasks found matching your filters.
                          </td>
                        </tr>
                      ) : (
                        items.map((t) => {
                          const typeCfg = getTypeConfig(t.taskType, isDark);
                          const priDot = getPriorityDot(t.priority);
                          const stBadge = getStatusBadge(t.taskStatus, t.isOverdue, isDark);
                          const isComplete = String(t.taskStatus || "").toUpperCase() === "COMPLETED";

                          return (
                            <tr key={t.taskId} style={{ borderBottom: `1px solid ${cardBorder}` }}>
                              {/* Checkbox */}
                              <td className="text-center px-2 py-2">
                                <input
                                  type="checkbox"
                                  className="form-check-input rounded-0"
                                  checked={selectedIds.includes(t.taskId)}
                                  onChange={() => handleSelectOne(t.taskId)}
                                />
                              </td>

                              {/* Actions */}
                              <td className="text-center py-2" style={{ width: "105px" }}>
                                <div className="d-flex align-items-center justify-content-center gap-1 flex-nowrap">
                                  <Button
                                    color="light"
                                    size="sm"
                                    className="btn-icon p-1 rounded-0"
                                    title="View Task Details"
                                    onClick={() => openDetailModal(t.taskId)}
                                    style={{
                                      border: `1px solid ${subtleBorder}`,
                                      backgroundColor: subtleBg,
                                      width: "28px",
                                      height: "28px",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                    }}
                                  >
                                    <i className="ri-eye-line fs-14" style={{ color: textSub }}></i>
                                  </Button>
                                  <Button
                                    color="light"
                                    size="sm"
                                    className="btn-icon p-1 rounded-0"
                                    title="Edit Task"
                                    onClick={() => openEditModal(t)}
                                    style={{
                                      border: `1px solid ${subtleBorder}`,
                                      backgroundColor: subtleBg,
                                      width: "28px",
                                      height: "28px",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                    }}
                                  >
                                    <i className="ri-pencil-line fs-14" style={{ color: primaryColor }}></i>
                                  </Button>
                                  <Button
                                    color="light"
                                    size="sm"
                                    className="btn-icon p-1 rounded-0 text-danger"
                                    title="Delete Task"
                                    onClick={() => openDeleteModal(t)}
                                    style={{
                                      border: `1px solid ${subtleBorder}`,
                                      backgroundColor: subtleBg,
                                      width: "28px",
                                      height: "28px",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                    }}
                                  >
                                    <i className="ri-delete-bin-line fs-14"></i>
                                  </Button>
                                </div>
                              </td>

                              {/* Task Title & Notes */}
                              <td className="py-2">
                                <button
                                  type="button"
                                  className="btn btn-link p-0 text-start fw-semibold text-decoration-none d-block fs-13"
                                  style={{ lineHeight: "1.3", color: textTitle }}
                                  onClick={() => openDetailModal(t.taskId)}
                                >
                                  {t.title}
                                </button>
                                {t.notes ? (
                                  <div
                                    className="fs-11 text-truncate mt-1"
                                    style={{ maxWidth: "240px", color: textSub }}
                                  >
                                    {t.notes}
                                  </div>
                                ) : null}
                              </td>

                              {/* Related To (Company & Contact) */}
                              <td className="py-2">
                                <div className="fw-medium fs-12" style={{ color: textTitle }}>{t.company || "—"}</div>
                                <div className="fs-11" style={{ color: textSub }}>{t.contactPerson || "—"}</div>
                              </td>

                              {/* Type Badge */}
                              <td className="py-2">
                                <span
                                  className="d-inline-flex align-items-center gap-1 px-2 py-1 fs-11 fw-medium"
                                  style={{
                                    backgroundColor: typeCfg.bg,
                                    color: typeCfg.text,
                                    borderRadius: "0px",
                                    border: `1px solid ${typeCfg.color}33`,
                                  }}
                                >
                                  <i className={typeCfg.icon}></i> {typeCfg.label}
                                </span>
                              </td>

                              {/* Priority Dot (Square geometry) */}
                              <td className="py-2">
                                <div className="d-flex align-items-center gap-1">
                                  <span
                                    style={{
                                      width: "8px",
                                      height: "8px",
                                      borderRadius: "0px",
                                      backgroundColor: priDot.color,
                                    }}
                                  ></span>
                                  <span className="fs-12" style={{ color: textSub }}>{priDot.label}</span>
                                </div>
                              </td>

                              {/* Owner */}
                              <td className="py-2">
                                <div className="d-flex align-items-center gap-2">
                                  <div
                                    className="d-flex align-items-center justify-content-center text-white fw-bold fs-10"
                                    style={{
                                      width: "24px",
                                      height: "24px",
                                      backgroundColor: isDark ? "#334155" : "#475569",
                                      borderRadius: "0px",
                                    }}
                                  >
                                    {getInitials(t.ownerName)}
                                  </div>
                                  <span className="fs-12 text-truncate" style={{ maxWidth: "90px", color: textTitle }}>
                                    {t.ownerName || "Unassigned"}
                                  </span>
                                </div>
                              </td>

                              {/* Due Date & Overdue */}
                              <td className="py-2">
                                <div
                                  className={classnames("fs-12 fw-medium", {
                                    "text-danger": t.isOverdue,
                                  })}
                                  style={!t.isOverdue ? { color: textTitle } : {}}
                                >
                                  {t.dueLabel || t.dueDate || "—"}
                                </div>
                              </td>

                              {/* Status Badge */}
                              <td className="py-2">
                                <span
                                  className="d-inline-block px-2 py-1 fs-11 fw-medium text-center"
                                  style={{
                                    backgroundColor: stBadge.bg,
                                    color: stBadge.text,
                                    border: `1px solid ${stBadge.border}`,
                                    borderRadius: "0px",
                                    minWidth: "75px",
                                  }}
                                >
                                  {stBadge.label}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer with Pagination */}
                <div
                  className="d-flex flex-wrap align-items-center justify-content-between p-3 border-top"
                  style={{ borderColor: cardBorder }}
                >
                  <div className="fs-12 mb-2 mb-sm-0" style={{ color: textSub }}>
                    Showing <span className="fw-semibold" style={{ color: textTitle }}>{startItem}</span> to{" "}
                    <span className="fw-semibold" style={{ color: textTitle }}>{endItem}</span> of{" "}
                    <span className="fw-semibold" style={{ color: textTitle }}>{totalCount}</span> entries
                  </div>

                  <div className="d-flex align-items-center gap-2">
                    <Input
                      type="select"
                      className="form-select form-select-sm rounded-0 fs-12"
                      style={{
                        width: "95px",
                        borderRadius: 0,
                        backgroundColor: isDark ? "#1a1d21" : "#ffffff",
                        borderColor: subtleBorder,
                        color: textTitle,
                      }}
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
                        color="light"
                        className="rounded-0"
                        disabled={page === 0}
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                        style={{
                          borderRadius: 0,
                          border: `1px solid ${subtleBorder}`,
                          backgroundColor: subtleBg,
                          color: textTitle,
                        }}
                      >
                        <i className="ri-arrow-left-s-line"></i>
                      </Button>
                      {[...Array(totalPages)].map((_, i) => {
                        if (totalPages > 5 && Math.abs(i - page) > 2) return null;
                        return (
                          <Button
                            key={i}
                            className="rounded-0 fs-12 px-2"
                            style={{
                              borderRadius: 0,
                              backgroundColor: page === i ? primaryColor : subtleBg,
                              borderColor: page === i ? primaryColor : subtleBorder,
                              color: page === i ? "#ffffff" : textTitle,
                            }}
                            onClick={() => setPage(i)}
                          >
                            {i + 1}
                          </Button>
                        );
                      })}
                      <Button
                        color="light"
                        className="rounded-0"
                        disabled={page >= totalPages - 1}
                        onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                        style={{
                          borderRadius: 0,
                          border: `1px solid ${subtleBorder}`,
                          backgroundColor: subtleBg,
                          color: textTitle,
                        }}
                      >
                        <i className="ri-arrow-right-s-line"></i>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </Col>

          {/* RIGHT SIDEBAR COLUMN: Compact Task Summary, Pending Tasks, Quick Actions */}
          <Col lg={4} xl={3}>
            {/* 1. Task Summary Donut Card */}
            <Card
              className="rounded-0 shadow-sm border-0 mb-3"
              style={{ borderRadius: 0, backgroundColor: cardBg, border: `1px solid ${cardBorder}` }}
            >
              <CardBody className="p-3">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <h6 className="fw-semibold mb-0 fs-13" style={{ color: textTitle }}>Task Summary</h6>
                  <span className="fs-11 d-flex align-items-center gap-1" style={{ color: textSub }}>
                    This Month <i className="ri-arrow-down-s-line fs-12"></i>
                  </span>
                </div>

                {/* Donut representation (100% Data-Driven & Theme-Aligned) */}
                <div className="d-flex align-items-center justify-content-center py-1">
                  <div
                    className="position-relative d-flex align-items-center justify-content-center"
                    style={{ width: "110px", height: "110px" }}
                  >
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        borderRadius: "50%",
                        background: (() => {
                          if (!stats.distribution || stats.totalTasks === 0) return isDark ? "#262626" : "#e2e8f0";
                          let cumulative = 0;
                          const stops = [];
                          stats.distribution.forEach((d) => {
                            if (d.count > 0) {
                              const start = cumulative;
                              const end = cumulative + (d.count / stats.totalTasks) * 100;
                              stops.push(`${d.color} ${start}% ${end}%`);
                              cumulative = end;
                            }
                          });
                          return stops.length > 0 ? `conic-gradient(${stops.join(", ")})` : (isDark ? "#262626" : "#e2e8f0");
                        })(),
                      }}
                    ></div>
                    <div
                      className="position-absolute d-flex flex-column align-items-center justify-content-center"
                      style={{
                        width: "74px",
                        height: "74px",
                        borderRadius: "50%",
                        backgroundColor: cardBg,
                      }}
                    >
                      <span className="fw-bold fs-18 lh-1" style={{ color: primaryColor }}>
                        {stats.totalTasks}
                      </span>
                      <span className="fs-10 mt-1" style={{ color: textSub }}>Total</span>
                    </div>
                  </div>
                </div>

                {/* Legend list (Square geometry per Rule 4) */}
                <div className="mt-2 pt-2 border-top" style={{ borderColor: cardBorder }}>
                  {stats.distribution.map((d) => (
                    <div
                      key={d.code}
                      className="d-flex align-items-center justify-content-between py-1 px-1 fs-11 cursor-pointer pending-task-item"
                      style={{ borderRadius: "0px", transition: "background 0.15s ease" }}
                      onClick={() => handleKpiClick(d.code)}
                    >
                      <div className="d-flex align-items-center gap-2">
                        <span
                          style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "0px",
                            backgroundColor: d.color,
                          }}
                        ></span>
                        <span style={{ color: textSub }}>{d.label}</span>
                      </div>
                      <div className="fw-medium" style={{ color: textTitle }}>
                        {d.count}{" "}
                        <span className="fs-10" style={{ color: textSub }}>({d.percentage}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>

            {/* 2. My Pending Tasks Card (Sleek List & Perfect Visibility) */}
            <Card
              className="rounded-0 shadow-sm border-0 mb-3"
              style={{ borderRadius: 0, backgroundColor: cardBg, border: `1px solid ${cardBorder}` }}
            >
              <CardBody className="p-3">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <div className="d-flex align-items-center gap-1">
                    <h6 className="fw-semibold mb-0 fs-13" style={{ color: textTitle }}>My Pending Tasks</h6>
                    {stats.pendingTasks.length > 0 && (
                      <span
                        className="badge rounded-0 fs-10 px-1 py-0 ms-1 fw-semibold"
                        style={{ backgroundColor: subtleBg, color: textSub }}
                      >
                        {stats.pendingTasks.length}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn btn-link p-0 text-decoration-none fs-11 fw-medium"
                    style={{ color: primaryColor }}
                    onClick={() => handleKpiClick("TO_DO")}
                  >
                    View All
                  </button>
                </div>

                {stats.pendingTasks.length === 0 ? (
                  <div className="text-center py-3 fs-11" style={{ color: textSub }}>No pending tasks.</div>
                ) : (
                  <div
                    className="d-flex flex-column crm-custom-scroll"
                    style={{
                      maxHeight: "380px",
                      overflowY: "auto",
                      scrollbarWidth: "thin",
                      scrollbarColor: `${subtleBorder} transparent`,
                    }}
                  >
                    {stats.pendingTasks.slice(0, 5).map((pt, idx) => {
                      const typeCfg = getTypeConfig(pt.task_type || pt.taskType, isDark);
                      const isHigh = String(pt.priority).toUpperCase() === "HIGH";
                      const isLow = String(pt.priority).toUpperCase() === "LOW";
                      const isOver = pt.is_overdue || pt.isOverdue;

                      return (
                        <div
                          key={pt.task_id || pt.taskId || idx}
                          className="crm-pending-task-row d-flex align-items-center justify-content-between cursor-pointer"
                          style={{ cursor: "pointer" }}
                          onClick={() => openDetailModal(pt.task_id || pt.taskId)}
                        >
                          <div className="d-flex align-items-center gap-2 overflow-hidden flex-grow-1 me-2">
                            <div
                              className="d-flex align-items-center justify-content-center flex-shrink-0"
                              style={{
                                width: "32px",
                                height: "32px",
                                backgroundColor: typeCfg.bg,
                                color: typeCfg.text,
                                borderRadius: "0px",
                              }}
                            >
                              <i className={`${typeCfg.icon} fs-15`}></i>
                            </div>
                            <div className="overflow-hidden flex-grow-1">
                              <div className="fw-semibold fs-12 text-truncate" style={{ color: textTitle }} title={pt.title}>
                                {pt.title}
                              </div>
                              <div className="d-flex align-items-center gap-1 fs-11 mt-1 text-truncate" style={{ color: textSub }}>
                                <span className="text-truncate">{pt.company || "—"}</span>
                                <span>•</span>
                                <span
                                  className={classnames("fw-medium flex-shrink-0", {
                                    "text-danger": isOver,
                                  })}
                                  style={!isOver ? { color: textSub } : {}}
                                >
                                  {pt.due_label || pt.dueLabel || pt.due_date || pt.dueDate}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex-shrink-0 text-end">
                            <span
                              className="px-2 py-0 text-uppercase fw-semibold"
                              style={{
                                fontSize: "10px",
                                letterSpacing: "0.5px",
                                borderRadius: "0px",
                                backgroundColor: isHigh
                                  ? (isDark ? "rgba(239, 68, 68, 0.25)" : "#fef2f2")
                                  : isLow
                                  ? (isDark ? "rgba(16, 185, 129, 0.2)" : "#ecfdf5")
                                  : (isDark ? "rgba(245, 158, 11, 0.2)" : "#fffbeb"),
                                color: isHigh
                                  ? (isDark ? "#f87171" : "#dc2626")
                                  : isLow
                                  ? (isDark ? "#34d399" : "#16a34a")
                                  : (isDark ? "#fbbf24" : "#d97706"),
                                border: `1px solid ${
                                  isHigh
                                    ? (isDark ? "rgba(239, 68, 68, 0.4)" : "#fecaca")
                                    : isLow
                                    ? (isDark ? "rgba(16, 185, 129, 0.35)" : "#a7f3d0")
                                    : (isDark ? "rgba(245, 158, 11, 0.35)" : "#fde68a")
                                }`,
                              }}
                            >
                              {pt.priority}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardBody>
            </Card>

            {/* 3. Quick Actions 6-Button Grid Card */}
            <Card
              className="rounded-0 shadow-sm border-0 mb-3"
              style={{ borderRadius: 0, backgroundColor: cardBg, border: `1px solid ${cardBorder}` }}
            >
              <CardBody className="p-3">
                <h6 className="fw-semibold mb-2 fs-13" style={{ color: textTitle }}>Quick Actions</h6>
                <Row className="g-2">
                  <Col xs={6}>
                    <Button
                      color="light"
                      className="w-100 rounded-0 p-2 text-center d-flex flex-column align-items-center gap-1 fs-11"
                      style={{
                        borderRadius: 0,
                        border: `1px solid ${subtleBorder}`,
                        backgroundColor: subtleBg,
                        color: textTitle,
                      }}
                      onClick={() => openCreateModal("TASK")}
                    >
                      <i className="ri-add-circle-line fs-16 text-primary"></i>
                      <span>New Task</span>
                    </Button>
                  </Col>
                  <Col xs={6}>
                    <Button
                      color="light"
                      className="w-100 rounded-0 p-2 text-center d-flex flex-column align-items-center gap-1 fs-11"
                      style={{
                        borderRadius: 0,
                        border: `1px solid ${subtleBorder}`,
                        backgroundColor: subtleBg,
                        color: textTitle,
                      }}
                      onClick={() => openCreateModal("CALL")}
                    >
                      <i className="ri-phone-line fs-16 text-success"></i>
                      <span>New Call</span>
                    </Button>
                  </Col>
                  <Col xs={6}>
                    <Button
                      color="light"
                      className="w-100 rounded-0 p-2 text-center d-flex flex-column align-items-center gap-1 fs-11"
                      style={{
                        borderRadius: 0,
                        border: `1px solid ${subtleBorder}`,
                        backgroundColor: subtleBg,
                        color: textTitle,
                      }}
                      onClick={() => openCreateModal("MEETING")}
                    >
                      <i className="ri-calendar-event-line fs-16" style={{ color: "#8b5cf6" }}></i>
                      <span>New Meeting</span>
                    </Button>
                  </Col>
                  <Col xs={6}>
                    <Button
                      color="light"
                      className="w-100 rounded-0 p-2 text-center d-flex flex-column align-items-center gap-1 fs-11"
                      style={{
                        borderRadius: 0,
                        border: `1px solid ${subtleBorder}`,
                        backgroundColor: subtleBg,
                        color: textTitle,
                      }}
                      onClick={() => openCreateModal("EMAIL")}
                    >
                      <i className="ri-mail-line fs-16 text-info"></i>
                      <span>Send Email</span>
                    </Button>
                  </Col>
                  <Col xs={6}>
                    <Button
                      color="light"
                      className="w-100 rounded-0 p-2 text-center d-flex flex-column align-items-center gap-1 fs-11"
                      style={{
                        borderRadius: 0,
                        border: `1px solid ${subtleBorder}`,
                        backgroundColor: subtleBg,
                        color: textTitle,
                      }}
                      onClick={() => navigate("/crm/documents")}
                    >
                      <i className="ri-file-upload-line fs-16 text-warning"></i>
                      <span>Upload Doc</span>
                    </Button>
                  </Col>
                  <Col xs={6}>
                    <Button
                      color="light"
                      className="w-100 rounded-0 p-2 text-center d-flex flex-column align-items-center gap-1 fs-11"
                      style={{
                        borderRadius: 0,
                        border: `1px solid ${subtleBorder}`,
                        backgroundColor: subtleBg,
                        color: textTitle,
                      }}
                      onClick={() => navigate("/crm/opportunities")}
                    >
                      <i className="ri-file-text-line fs-16 text-danger"></i>
                      <span>Opportunities</span>
                    </Button>
                  </Col>
                </Row>
              </CardBody>
            </Card>
          </Col>
        </Row>

        {/* ================================================================= */}
        {/* IN-PAGE MODAL 1: Create / Edit Task Modal                         */}
        {/* ================================================================= */}
        <Modal
          isOpen={modal}
          toggle={() => setModal(!modal)}
          centered
          className="rounded-0"
          backdrop="static"
          size="lg"
        >
          <ModalHeader
            toggle={() => setModal(!modal)}
            className="rounded-0"
            style={{
              backgroundColor: subtleBg,
              borderBottom: `1px solid ${cardBorder}`,
            }}
          >
            <span className="fw-semibold fs-15" style={{ color: textTitle }}>
              {editMode ? `Edit Task — ${form.title}` : "New Task"}
            </span>
          </ModalHeader>
          <Form onSubmit={handleSave}>
            <ModalBody className="p-4" style={{ backgroundColor: cardBg, color: textTitle }}>
              {formError ? <Alert color="danger" className="rounded-0 py-2 fs-12">{formError}</Alert> : null}

              <Row className="g-3">
                {/* Title */}
                <Col md={12}>
                  <FormGroup className="mb-0">
                    <Label className="fw-medium fs-12" style={{ color: textTitle }}>
                      Task Title <span className="text-danger">*</span>
                    </Label>
                    <Input
                      type="text"
                      className="form-control rounded-0 fs-13"
                      placeholder="e.g. Follow-up call with Neha Shah"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      required
                      style={{
                        borderRadius: 0,
                        backgroundColor: isDark ? "#1a1d21" : "#ffffff",
                        borderColor: subtleBorder,
                        color: textTitle,
                      }}
                    />
                  </FormGroup>
                </Col>

                {/* Type & Priority & Status (Dynamic from DB lookups) */}
                <Col md={4}>
                  <FormGroup className="mb-0">
                    <Label className="fw-medium fs-12" style={{ color: textTitle }}>Type</Label>
                    <Input
                      type="select"
                      className="form-select rounded-0 fs-13"
                      value={form.taskType}
                      onChange={(e) => setForm({ ...form, taskType: e.target.value })}
                      style={{
                        borderRadius: 0,
                        backgroundColor: isDark ? "#1a1d21" : "#ffffff",
                        borderColor: subtleBorder,
                        color: textTitle,
                      }}
                    >
                      {lookups.taskType.map((t) => (
                        <option key={t.masterCode || t.master_code} value={t.masterCode || t.master_code}>
                          {t.masterName || t.master_name}
                        </option>
                      ))}
                    </Input>
                  </FormGroup>
                </Col>
                <Col md={4}>
                  <FormGroup className="mb-0">
                    <Label className="fw-medium fs-12" style={{ color: textTitle }}>Priority</Label>
                    <Input
                      type="select"
                      className="form-select rounded-0 fs-13"
                      value={form.priority}
                      onChange={(e) => setForm({ ...form, priority: e.target.value })}
                      style={{
                        borderRadius: 0,
                        backgroundColor: isDark ? "#1a1d21" : "#ffffff",
                        borderColor: subtleBorder,
                        color: textTitle,
                      }}
                    >
                      {lookups.taskPriority.map((p) => (
                        <option key={p.masterCode || p.master_code} value={p.masterCode || p.master_code}>
                          {p.masterName || p.master_name}
                        </option>
                      ))}
                    </Input>
                  </FormGroup>
                </Col>
                <Col md={4}>
                  <FormGroup className="mb-0">
                    <Label className="fw-medium fs-12" style={{ color: textTitle }}>Status</Label>
                    <Input
                      type="select"
                      className="form-select rounded-0 fs-13"
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                      style={{
                        borderRadius: 0,
                        backgroundColor: isDark ? "#1a1d21" : "#ffffff",
                        borderColor: subtleBorder,
                        color: textTitle,
                      }}
                    >
                      {lookups.taskStatus
                        .filter((s) => String(s.masterCode || s.master_code || "").toUpperCase() !== "OVERDUE")
                        .map((s) => (
                          <option key={s.masterCode || s.master_code} value={s.masterCode || s.master_code}>
                            {s.masterName || s.master_name}
                          </option>
                        ))}
                    </Input>
                  </FormGroup>
                </Col>

                {/* Related Company & Contact Person with Accounts Datalist */}
                <Col md={6}>
                  <FormGroup className="mb-0">
                    <Label className="fw-medium fs-12" style={{ color: textTitle }}>Related Company / Account</Label>
                    <Input
                      type="text"
                      list="accounts-list"
                      className="form-control rounded-0 fs-13"
                      placeholder="e.g. ABC Ltd."
                      value={form.company}
                      onChange={(e) => setForm({ ...form, company: e.target.value })}
                      style={{
                        borderRadius: 0,
                        backgroundColor: isDark ? "#1a1d21" : "#ffffff",
                        borderColor: subtleBorder,
                        color: textTitle,
                      }}
                    />
                    <datalist id="accounts-list">
                      {lookups.accounts.map((a) => (
                        <option key={a.accountId || a.account_id} value={a.companyName || a.displayName || a.display_name} />
                      ))}
                    </datalist>
                  </FormGroup>
                </Col>
                <Col md={6}>
                  <FormGroup className="mb-0">
                    <Label className="fw-medium fs-12" style={{ color: textTitle }}>Contact Person</Label>
                    <Input
                      type="text"
                      className="form-control rounded-0 fs-13"
                      placeholder="e.g. Neha Shah"
                      value={form.contactPerson}
                      onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                      style={{
                        borderRadius: 0,
                        backgroundColor: isDark ? "#1a1d21" : "#ffffff",
                        borderColor: subtleBorder,
                        color: textTitle,
                      }}
                    />
                  </FormGroup>
                </Col>

                {/* Owner & Dates */}
                <Col md={4}>
                  <FormGroup className="mb-0">
                    <Label className="fw-medium fs-12" style={{ color: textTitle }}>Assigned Owner</Label>
                    <Input
                      type="select"
                      className="form-select rounded-0 fs-13"
                      value={form.employeeId}
                      onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                      style={{
                        borderRadius: 0,
                        backgroundColor: isDark ? "#1a1d21" : "#ffffff",
                        borderColor: subtleBorder,
                        color: textTitle,
                      }}
                    >
                      {owners.map((o) => (
                        <option key={o.ownerId || o.employee_id} value={o.ownerId || o.employee_id}>
                          {o.fullName || o.full_name}
                        </option>
                      ))}
                    </Input>
                  </FormGroup>
                </Col>
                <Col md={4}>
                  <FormGroup className="mb-0">
                    <Label className="fw-medium fs-12" style={{ color: textTitle }}>Start Date</Label>
                    <Input
                      type="date"
                      className="form-control rounded-0 fs-13"
                      value={form.startDate}
                      onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                      style={{
                        borderRadius: 0,
                        backgroundColor: isDark ? "#1a1d21" : "#ffffff",
                        borderColor: subtleBorder,
                        color: textTitle,
                      }}
                    />
                  </FormGroup>
                </Col>
                <Col md={4}>
                  <FormGroup className="mb-0">
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <Label className="fw-medium fs-12 mb-0" style={{ color: textTitle }}>Due Date</Label>
                      <div className="d-flex gap-1">
                        <button
                          type="button"
                          className="btn btn-link p-0 fs-10 text-decoration-none"
                          style={{ color: primaryColor }}
                          onClick={() => setForm({ ...form, dueDate: todayIso() })}
                        >
                          Today
                        </button>
                        <span className="fs-10" style={{ color: textSub }}>|</span>
                        <button
                          type="button"
                          className="btn btn-link p-0 fs-10 text-decoration-none"
                          style={{ color: primaryColor }}
                          onClick={() => setForm({ ...form, dueDate: tomorrowIso() })}
                        >
                          Tmrw
                        </button>
                      </div>
                    </div>
                    <Input
                      type="date"
                      className="form-control rounded-0 fs-13"
                      value={form.dueDate}
                      onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                      style={{
                        borderRadius: 0,
                        backgroundColor: isDark ? "#1a1d21" : "#ffffff",
                        borderColor: subtleBorder,
                        color: textTitle,
                      }}
                    />
                  </FormGroup>
                </Col>

                {/* Notes */}
                <Col md={12}>
                  <FormGroup className="mb-0">
                    <Label className="fw-medium fs-12" style={{ color: textTitle }}>Notes / Description</Label>
                    <Input
                      type="textarea"
                      rows={3}
                      className="form-control rounded-0 fs-13"
                      placeholder="Add details, next steps or action items..."
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      style={{
                        borderRadius: 0,
                        backgroundColor: isDark ? "#1a1d21" : "#ffffff",
                        borderColor: subtleBorder,
                        color: textTitle,
                      }}
                    />
                  </FormGroup>
                </Col>
              </Row>
            </ModalBody>
            <ModalFooter
              className="rounded-0 py-2"
              style={{
                backgroundColor: subtleBg,
                borderTop: `1px solid ${cardBorder}`,
              }}
            >
              <Button
                color="light"
                type="button"
                className="rounded-0 fs-13"
                onClick={() => setModal(false)}
                disabled={saving}
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
                className="rounded-0 fs-13 text-white"
                style={{
                  borderRadius: 0,
                  backgroundColor: primaryColor,
                  borderColor: primaryColor,
                }}
                disabled={saving}
              >
                {saving ? <Spinner size="sm" className="me-1" /> : null}
                {editMode ? "Save Changes" : "Create Task"}
              </Button>
            </ModalFooter>
          </Form>
        </Modal>

        {/* ================================================================= */}
        {/* IN-PAGE MODAL 2: Task Details Modal (360 In-Page View)            */}
        {/* ================================================================= */}
        <Modal
          isOpen={detailModal}
          toggle={() => setDetailModal(!detailModal)}
          centered
          className="rounded-0"
          size="lg"
        >
          <ModalHeader
            toggle={() => setDetailModal(!detailModal)}
            className="rounded-0"
            style={{
              backgroundColor: subtleBg,
              borderBottom: `1px solid ${cardBorder}`,
            }}
          >
            <div className="d-flex align-items-center gap-2">
              <span
                className="badge rounded-0 fs-12"
                style={{
                  backgroundColor: subtleBg,
                  color: primaryColor,
                  border: `1px solid ${subtleBorder}`,
                }}
              >
                {detailTask?.taskCode || "TSK"}
              </span>
              <span className="fw-semibold fs-15" style={{ color: textTitle }}>Task Details</span>
            </div>
          </ModalHeader>
          <ModalBody className="p-4" style={{ backgroundColor: cardBg, color: textTitle }}>
            {detailLoading ? (
              <div className="text-center py-5" style={{ color: textSub }}>
                <Spinner size="sm" className="me-2" style={{ color: primaryColor }} /> Loading task details from database...
              </div>
            ) : detailTask ? (
              <div>
                {/* Title & Badges Header */}
                <div className="d-flex align-items-start justify-content-between mb-3">
                  <div>
                    <h5 className="fw-bold mb-1" style={{ color: textTitle }}>{detailTask.title}</h5>
                    <div className="d-flex align-items-center gap-2">
                      {/* Type Badge */}
                      {(() => {
                        const typeCfg = getTypeConfig(detailTask.taskType, isDark);
                        return (
                          <span
                            className="px-2 py-0 fs-11 fw-medium"
                            style={{
                              backgroundColor: typeCfg.bg,
                              color: typeCfg.text,
                              borderRadius: "0px",
                              border: `1px solid ${typeCfg.color}33`,
                            }}
                          >
                            <i className={typeCfg.icon}></i> {typeCfg.label}
                          </span>
                        );
                      })()}
                      {/* Status Badge */}
                      {(() => {
                        const stBadge = getStatusBadge(detailTask.taskStatus, detailTask.isOverdue, isDark);
                        return (
                          <span
                            className="px-2 py-0 fs-11 fw-medium"
                            style={{
                              backgroundColor: stBadge.bg,
                              color: stBadge.text,
                              border: `1px solid ${stBadge.border}`,
                              borderRadius: "0px",
                            }}
                          >
                            {stBadge.label}
                          </span>
                        );
                      })()}
                      {/* Priority Badge */}
                      <Badge
                        color={
                          String(detailTask.priority).toUpperCase() === "HIGH"
                            ? "danger"
                            : String(detailTask.priority).toUpperCase() === "LOW"
                              ? "success"
                              : "warning"
                        }
                        className="rounded-0 fs-11"
                      >
                        {detailTask.priorityName || detailTask.priority}
                      </Badge>
                    </div>
                  </div>

                  {/* Complete Action Button */}
                  {String(detailTask.taskStatus || "").toUpperCase() !== "COMPLETED" ? (
                    <Button
                      color="success"
                      size="sm"
                      className="rounded-0 fs-12 d-flex align-items-center gap-1"
                      onClick={() => handleCompleteTask(detailTask.taskId)}
                      disabled={completingDetail}
                      style={{ borderRadius: 0 }}
                    >
                      {completingDetail ? <Spinner size="sm" className="me-1" /> : <i className="ri-check-line"></i>}
                      Mark Completed
                    </Button>
                  ) : (
                    <span
                      className="badge rounded-0 fs-12 p-2"
                      style={{
                        backgroundColor: isDark ? "rgba(16, 185, 129, 0.2)" : "#ecfdf5",
                        color: isDark ? "#34d399" : "#047857",
                        border: `1px solid ${isDark ? "rgba(16, 185, 129, 0.35)" : "#a7f3d0"}`,
                      }}
                    >
                      <i className="ri-checkbox-circle-line me-1"></i> Completed
                    </span>
                  )}
                </div>

                {/* Metadata Grid */}
                <Row
                  className="g-3 p-3 border rounded-0 mb-3"
                  style={{
                    backgroundColor: subtleBg,
                    borderColor: cardBorder,
                  }}
                >
                  <Col md={6}>
                    <div className="fs-11" style={{ color: textSub }}>Related Company</div>
                    <div className="fw-semibold fs-13" style={{ color: textTitle }}>{detailTask.company || "—"}</div>
                  </Col>
                  <Col md={6}>
                    <div className="fs-11" style={{ color: textSub }}>Contact Person</div>
                    <div className="fw-semibold fs-13" style={{ color: textTitle }}>{detailTask.contactPerson || "—"}</div>
                  </Col>
                  <Col md={4}>
                    <div className="fs-11" style={{ color: textSub }}>Assigned Owner</div>
                    <div className="fw-semibold fs-13" style={{ color: textTitle }}>{detailTask.ownerName || "—"}</div>
                  </Col>
                  <Col md={4}>
                    <div className="fs-11" style={{ color: textSub }}>Start Date</div>
                    <div className="fw-semibold fs-13" style={{ color: textTitle }}>{detailTask.startDate || "—"}</div>
                  </Col>
                  <Col md={4}>
                    <div className="fs-11" style={{ color: textSub }}>Due Date</div>
                    <div
                      className={classnames("fw-semibold fs-13", {
                        "text-danger": detailTask.isOverdue,
                      })}
                      style={!detailTask.isOverdue ? { color: textTitle } : {}}
                    >
                      {detailTask.dueLabel || detailTask.dueDate || "—"}
                    </div>
                  </Col>
                </Row>

                {/* Notes Section */}
                <div className="mb-3">
                  <div className="fw-semibold fs-13 mb-1" style={{ color: textTitle }}>Notes / Description</div>
                  <div
                    className="p-3 border rounded-0 fs-13"
                    style={{
                      backgroundColor: isDark ? "#1a1d21" : "#ffffff",
                      borderColor: subtleBorder,
                      color: textTitle,
                      minHeight: "60px",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {detailTask.notes || "No notes provided for this task."}
                  </div>
                </div>

                {/* Activity History Log from tab_task_detail_tran */}
                {detailTask.history && detailTask.history.length > 0 ? (
                  <div>
                    <div className="fw-semibold fs-13 mb-2" style={{ color: textTitle }}>Activity History Log</div>
                    <div
                      className="border rounded-0 p-2"
                      style={{
                        borderColor: cardBorder,
                        backgroundColor: subtleBg,
                        maxHeight: "150px",
                        overflowY: "auto",
                      }}
                    >
                      {detailTask.history.map((h, idx) => (
                        <div
                          key={idx}
                          className="d-flex align-items-center justify-content-between py-1 border-bottom fs-12"
                          style={{ borderColor: cardBorder }}
                        >
                          <span style={{ color: textTitle }}>{h.remarks || h.status}</span>
                          <span className="fs-11" style={{ color: textSub }}>
                            {h.dateTime ? new Date(h.dateTime).toLocaleString() : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </ModalBody>
          <ModalFooter
            className="rounded-0 py-2"
            style={{
              backgroundColor: subtleBg,
              borderTop: `1px solid ${cardBorder}`,
            }}
          >
            {detailTask ? (
              <>
                <Button
                  color="danger"
                  outline
                  size="sm"
                  className="rounded-0 fs-12 me-auto"
                  onClick={() => openDeleteModal(detailTask)}
                  style={{ borderRadius: 0 }}
                >
                  <i className="ri-delete-bin-line me-1"></i> Delete
                </Button>
                <Button
                  color="warning"
                  outline
                  size="sm"
                  className="rounded-0 fs-12"
                  onClick={() => {
                    setDetailModal(false);
                    openEditModal(detailTask);
                  }}
                  style={{ borderRadius: 0 }}
                >
                  <i className="ri-edit-line me-1"></i> Edit
                </Button>
              </>
            ) : null}
            <Button
              color="light"
              size="sm"
              className="rounded-0 fs-12"
              onClick={() => setDetailModal(false)}
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

        {/* ================================================================= */}
        {/* IN-PAGE MODAL 3: Delete Confirmation Modal                        */}
        {/* ================================================================= */}
        <DeleteModal
          show={deleteModal}
          onDeleteClick={confirmDelete}
          onCloseClick={() => setDeleteModal(false)}
          isLoading={deleting}
          message={`Are you sure you want to delete task "${deleteTarget?.title}"? This cannot be undone.`}
        />
      </Container>
    </div>
  );
};

export default Tasks;
