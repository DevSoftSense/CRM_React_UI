import React, { useCallback, useEffect, useMemo, useState } from "react";
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

const todayIso = () => new Date().toISOString().slice(0, 10);
const tomorrowIso = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
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

const getTypeConfig = (type) => {
  const key = String(type || "TASK").toUpperCase();
  return TYPE_CONFIG[key] || {
    label: type || "Task",
    icon: "ri-task-line",
    color: "#64748b",
    bg: "#f8fafc",
    text: "#334155",
  };
};

const getPriorityDot = (priority) => {
  const p = String(priority || "MEDIUM").toUpperCase();
  if (p === "HIGH") return { color: "#ef4444", label: "High" };
  if (p === "LOW") return { color: "#10b981", label: "Low" };
  return { color: "#f59e0b", label: "Medium" };
};

const getStatusBadge = (status, isOverdue) => {
  const s = String(status || "TO_DO").toUpperCase();
  if (s === "COMPLETED") {
    return { bg: "#ecfdf5", text: "#065f46", border: "#a7f3d0", label: "Completed" };
  }
  if (isOverdue || s === "OVERDUE") {
    return { bg: "#fef2f2", text: "#991b1b", border: "#fecaca", label: "Overdue" };
  }
  if (s === "IN_PROGRESS") {
    return { bg: "#fef2f2", text: "#7f1d1d", border: "#fecaca", label: "In Progress" };
  }
  return { bg: "#fffbeb", text: "#92400e", border: "#fde68a", label: "To Do" };
};

const getInitials = (name) => {
  if (!name) return "AK";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const Tasks = () => {
  document.title = "Tasks | SoftOnCloud CRM";

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

  // Quick Action Modals (In-page)
  const [uploadDocModal, setUploadDocModal] = useState(false);
  const [createQuoteModal, setCreateQuoteModal] = useState(false);
  const [uploadFileName, setUploadFileName] = useState("");
  const [uploadFileEntity, setUploadFileEntity] = useState("");
  const [quoteAccount, setQuoteAccount] = useState("");
  const [quoteAmount, setQuoteAmount] = useState("");

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
    <div className="page-content" style={{ backgroundColor: "#f8fafc", minHeight: "100vh" }}>
      <style>{`
        .crm-pending-task-row {
          border-bottom: 1px solid #f1f5f9;
          transition: background-color 0.15s ease;
          padding: 8px 6px;
        }
        .crm-pending-task-row:last-child {
          border-bottom: none;
        }
        .crm-pending-task-row:hover {
          background-color: #f8fafc;
        }
        .crm-custom-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .crm-custom-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .crm-custom-scroll::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 0px;
        }
        .crm-custom-scroll::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
      <Container fluid>
        {/* Clean Top Header (No duplicate title) */}
        <div className="d-flex flex-wrap align-items-center justify-content-between mb-3 pb-1">
          <div>
            <h4 className="fs-18 fw-bold mb-1 text-dark">Tasks</h4>
            <div className="text-muted fs-12">Create, assign and track tasks across your sales pipeline</div>
          </div>
          <div className="d-flex align-items-center gap-2 mt-2 mt-sm-0">
            <Button
              color="secondary"
              outline
              className="rounded-0 d-flex align-items-center gap-1 fs-12"
              style={{ borderColor: "#cbd5e1", color: "#475569" }}
              onClick={handleExportCsv}
            >
              <i className="ri-download-2-line"></i> Export CSV
            </Button>
            <Button
              className="rounded-0 d-flex align-items-center gap-1 fs-12 text-white"
              style={{ backgroundColor: "#7f1d1d", borderColor: "#7f1d1d" }}
              onClick={() => openCreateModal("TASK")}
            >
              <i className="ri-add-line"></i> New Task
            </Button>
            <UncontrolledDropdown>
              <DropdownToggle
                tag="button"
                className="btn btn-light rounded-0 px-2 py-1"
                style={{ border: "1px solid #cbd5e1" }}
              >
                <i className="ri-more-2-fill fs-15"></i>
              </DropdownToggle>
              <DropdownMenu end className="rounded-0 shadow-sm fs-12">
                <DropdownItem onClick={() => { loadList(); loadStats(); }}>
                  <i className="ri-refresh-line me-2"></i> Refresh Data
                </DropdownItem>
                <DropdownItem onClick={handleResetFilters}>
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
              className="rounded-0 shadow-sm border-0 h-100 cursor-pointer"
              style={{
                borderLeft: !statusFilter ? "3px solid #7f1d1d" : "3px solid #cbd5e1",
                cursor: "pointer",
                transition: "all 0.15s ease-in-out",
                backgroundColor: !statusFilter ? "#fef2f2" : "#ffffff",
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
                      backgroundColor: "#fef2f2",
                      color: "#7f1d1d",
                      borderRadius: "0px",
                    }}
                  >
                    <i className="ri-checkbox-multiple-line fs-20"></i>
                  </div>
                  <div>
                    <h3 className="fw-bold mb-0 text-dark fs-20">
                      {statsLoading ? <Spinner size="sm" /> : stats.totalTasks}
                    </h3>
                    <div className="fw-semibold text-dark fs-12">All Tasks</div>
                    <div className="text-muted fs-11">View all tasks</div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </Col>

          {/* Card 2: To Do */}
          <Col xs={12} sm={6} md={4} lg={true}>
            <Card
              className="rounded-0 shadow-sm border-0 h-100 cursor-pointer"
              style={{
                borderLeft: statusFilter === "TO_DO" ? "3px solid #f59e0b" : "3px solid #fde68a",
                cursor: "pointer",
                transition: "all 0.15s ease-in-out",
                backgroundColor: statusFilter === "TO_DO" ? "#fffbeb" : "#ffffff",
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
                      backgroundColor: "#fffbeb",
                      color: "#f59e0b",
                      borderRadius: "0px",
                    }}
                  >
                    <i className="ri-time-line fs-20"></i>
                  </div>
                  <div>
                    <h3 className="fw-bold mb-0 text-dark fs-20">
                      {statsLoading ? <Spinner size="sm" /> : stats.toDoTasks}
                    </h3>
                    <div className="fw-semibold text-dark fs-12">To Do</div>
                    <div className="text-muted fs-11">Tasks to be started</div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </Col>

          {/* Card 3: In Progress */}
          <Col xs={12} sm={6} md={4} lg={true}>
            <Card
              className="rounded-0 shadow-sm border-0 h-100 cursor-pointer"
              style={{
                borderLeft: statusFilter === "IN_PROGRESS" ? "3px solid #7f1d1d" : "3px solid #fecaca",
                cursor: "pointer",
                transition: "all 0.15s ease-in-out",
                backgroundColor: statusFilter === "IN_PROGRESS" ? "#fef2f2" : "#ffffff",
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
                      backgroundColor: "#fef2f2",
                      color: "#7f1d1d",
                      borderRadius: "0px",
                    }}
                  >
                    <i className="ri-play-circle-line fs-20"></i>
                  </div>
                  <div>
                    <h3 className="fw-bold mb-0 text-dark fs-20">
                      {statsLoading ? <Spinner size="sm" /> : stats.inProgressTasks}
                    </h3>
                    <div className="fw-semibold text-dark fs-12">In Progress</div>
                    <div className="text-muted fs-11">Tasks in progress</div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </Col>

          {/* Card 4: Completed */}
          <Col xs={12} sm={6} md={4} lg={true}>
            <Card
              className="rounded-0 shadow-sm border-0 h-100 cursor-pointer"
              style={{
                borderLeft: statusFilter === "COMPLETED" ? "3px solid #10b981" : "3px solid #a7f3d0",
                cursor: "pointer",
                transition: "all 0.15s ease-in-out",
                backgroundColor: statusFilter === "COMPLETED" ? "#ecfdf5" : "#ffffff",
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
                      backgroundColor: "#ecfdf5",
                      color: "#10b981",
                      borderRadius: "0px",
                    }}
                  >
                    <i className="ri-checkbox-circle-line fs-20"></i>
                  </div>
                  <div>
                    <h3 className="fw-bold mb-0 text-dark fs-20">
                      {statsLoading ? <Spinner size="sm" /> : stats.completedTasks}
                    </h3>
                    <div className="fw-semibold text-dark fs-12">Completed</div>
                    <div className="text-muted fs-11">Tasks completed</div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </Col>

          {/* Card 5: Overdue */}
          <Col xs={12} sm={6} md={4} lg={true}>
            <Card
              className="rounded-0 shadow-sm border-0 h-100 cursor-pointer"
              style={{
                borderLeft: statusFilter === "OVERDUE" ? "3px solid #ef4444" : "3px solid #fecaca",
                cursor: "pointer",
                transition: "all 0.15s ease-in-out",
                backgroundColor: statusFilter === "OVERDUE" ? "#fef2f2" : "#ffffff",
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
                      backgroundColor: "#fef2f2",
                      color: "#ef4444",
                      borderRadius: "0px",
                    }}
                  >
                    <i className="ri-error-warning-line fs-20"></i>
                  </div>
                  <div>
                    <h3 className="fw-bold mb-0 text-dark fs-20">
                      {statsLoading ? <Spinner size="sm" /> : stats.overdueTasks}
                    </h3>
                    <div className="fw-semibold text-dark fs-12">Overdue</div>
                    <div className="text-muted fs-11">Past due tasks</div>
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
            <Card className="rounded-0 shadow-sm border-0 mb-3" style={{ backgroundColor: "#ffffff" }}>
              <CardBody className="p-0">
                {/* Clean Underline Tabs Row with Date Range Filter on Right (Exact Mockup Match) */}
                <div
                  className="border-bottom px-3 pt-2 d-flex flex-wrap align-items-center justify-content-between gap-2"
                  style={{ borderColor: "#e2e8f0" }}
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
                            color: activeTab === tab.key ? "#7f1d1d" : "#64748b",
                            borderBottom: activeTab === tab.key ? "3px solid #7f1d1d" : "3px solid transparent",
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
                        className="btn btn-white bg-white d-flex align-items-center justify-content-between px-2 py-1 fs-12 text-dark rounded-0"
                        style={{ border: "1px solid #e2e8f0", minWidth: "190px" }}
                      >
                        <span className="d-flex align-items-center gap-2 text-truncate">
                          <i className="ri-calendar-line text-secondary fs-13"></i>
                          <span className="fw-medium text-dark">{dateRangeLabel || "All Dates"}</span>
                        </span>
                        <i className="ri-arrow-down-s-line text-muted fs-12 ms-2"></i>
                      </DropdownToggle>
                      <DropdownMenu end className="rounded-0 shadow-sm fs-12 p-2" style={{ minWidth: "260px" }}>
                        <div className="text-muted fs-11 px-2 py-1 fw-semibold text-uppercase">Presets</div>
                        <DropdownItem onClick={() => handlePresetRange("THIS_MONTH")}>
                          <i className="ri-calendar-check-line me-2 text-primary"></i> This Month
                        </DropdownItem>
                        <DropdownItem onClick={() => handlePresetRange("TODAY")}>
                          <i className="ri-time-line me-2 text-success"></i> Today
                        </DropdownItem>
                        <DropdownItem onClick={() => handlePresetRange("THIS_WEEK")}>
                          <i className="ri-calendar-2-line me-2 text-info"></i> This Week
                        </DropdownItem>
                        <DropdownItem onClick={() => handlePresetRange("NEXT_30")}>
                          <i className="ri-calendar-todo-line me-2 text-warning"></i> Next 30 Days
                        </DropdownItem>
                        <DropdownItem divider />
                        <div className="px-2 py-1">
                          <div className="text-muted fs-11 mb-2 fw-semibold text-uppercase">Custom Range</div>
                          <div className="mb-2">
                            <label className="form-label fs-10 text-muted mb-0">From</label>
                            <Input
                              type="date"
                              className="form-control form-control-sm rounded-0 fs-11"
                              value={dueDateFrom}
                              onChange={(e) => setDueDateFrom(e.target.value)}
                            />
                          </div>
                          <div className="mb-2">
                            <label className="form-label fs-10 text-muted mb-0">To</label>
                            <Input
                              type="date"
                              className="form-control form-control-sm rounded-0 fs-11"
                              value={dueDateTo}
                              onChange={(e) => setDueDateTo(e.target.value)}
                            />
                          </div>
                          <div className="d-flex gap-1 mt-2">
                            <Button
                              size="sm"
                              className="w-100 rounded-0 text-white fs-11"
                              style={{ backgroundColor: "#7f1d1d", borderColor: "#7f1d1d" }}
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
                              style={{ border: "1px solid #cbd5e1" }}
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
                      style={{ border: "1px solid #e2e8f0", height: "31px", width: "31px" }}
                    >
                      <i className="ri-filter-3-line text-secondary fs-13"></i>
                    </Button>
                  </div>
                </div>

                {/* Filters Controls Row (100% Dynamic from DB lookups) */}
                <div className="p-3 border-bottom bg-light bg-opacity-25" style={{ borderColor: "#f1f5f9" }}>
                  <Row className="g-2 align-items-center">
                    {/* Owner Dropdown from DB */}
                    <Col xs={6} sm={4} md={2}>
                      <Input
                        type="select"
                        className="form-select form-select-sm rounded-0 fs-12"
                        value={ownerFilter}
                        onChange={(e) => { setOwnerFilter(e.target.value); setPage(0); }}
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
                        />
                        <i className="ri-search-line position-absolute top-50 end-0 translate-middle-y me-2 text-muted fs-13"></i>
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
                        style={{ border: "1px solid #cbd5e1" }}
                      >
                        <i className="ri-filter-off-line"></i>
                      </Button>
                    </Col>
                  </Row>
                </div>

                {/* Tasks Table */}
                <div className="table-responsive" style={{ minHeight: "340px" }}>
                  <table className="table table-hover align-middle mb-0" style={{ fontSize: "13px" }}>
                    <thead style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                      <tr>
                        <th style={{ width: "35px" }} className="text-center px-2 py-3">
                          <input
                            type="checkbox"
                            className="form-check-input rounded-0"
                            checked={items.length > 0 && selectedIds.length === items.length}
                            onChange={handleSelectAll}
                          />
                        </th>
                        <th className="fw-semibold text-secondary py-3" style={{ minWidth: "220px" }}>
                          Task
                        </th>
                        <th className="fw-semibold text-secondary py-3" style={{ minWidth: "150px" }}>
                          Related To
                        </th>
                        <th className="fw-semibold text-secondary py-3" style={{ minWidth: "100px" }}>
                          Type
                        </th>
                        <th className="fw-semibold text-secondary py-3" style={{ minWidth: "90px" }}>
                          Priority
                        </th>
                        <th className="fw-semibold text-secondary py-3" style={{ minWidth: "130px" }}>
                          Owner
                        </th>
                        <th className="fw-semibold text-secondary py-3" style={{ minWidth: "120px" }}>
                          Due Date
                        </th>
                        <th className="fw-semibold text-secondary py-3" style={{ minWidth: "100px" }}>
                          Status
                        </th>
                        <th className="fw-semibold text-secondary text-end pe-3 py-3" style={{ width: "90px" }}>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={9} className="text-center py-5">
                            <Spinner size="sm" className="me-2" /> Loading tasks from database...
                          </td>
                        </tr>
                      ) : items.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="text-center py-5 text-muted">
                            <i className="ri-inbox-line fs-32 d-block mb-2 text-secondary"></i>
                            No tasks found matching your filters.
                          </td>
                        </tr>
                      ) : (
                        items.map((t) => {
                          const typeCfg = getTypeConfig(t.taskType);
                          const priDot = getPriorityDot(t.priority);
                          const stBadge = getStatusBadge(t.taskStatus, t.isOverdue);
                          const isComplete = String(t.taskStatus || "").toUpperCase() === "COMPLETED";

                          return (
                            <tr key={t.taskId} style={{ borderBottom: "1px solid #f1f5f9" }}>
                              {/* Checkbox */}
                              <td className="text-center px-2 py-2">
                                <input
                                  type="checkbox"
                                  className="form-check-input rounded-0"
                                  checked={selectedIds.includes(t.taskId)}
                                  onChange={() => handleSelectOne(t.taskId)}
                                />
                              </td>

                              {/* Task Title & Notes */}
                              <td className="py-2">
                                <button
                                  type="button"
                                  className="btn btn-link p-0 text-start text-dark fw-semibold text-decoration-none d-block fs-13"
                                  style={{ lineHeight: "1.3" }}
                                  onClick={() => openDetailModal(t.taskId)}
                                >
                                  {t.title}
                                </button>
                                {t.notes ? (
                                  <div
                                    className="text-muted fs-11 text-truncate mt-1"
                                    style={{ maxWidth: "240px" }}
                                  >
                                    {t.notes}
                                  </div>
                                ) : null}
                              </td>

                              {/* Related To (Company & Contact) */}
                              <td className="py-2">
                                <div className="fw-medium text-dark fs-12">{t.company || "—"}</div>
                                <div className="text-muted fs-11">{t.contactPerson || "—"}</div>
                              </td>

                              {/* Type Badge */}
                              <td className="py-2">
                                <span
                                  className="d-inline-flex align-items-center gap-1 px-2 py-1 fs-11 fw-medium"
                                  style={{
                                    backgroundColor: typeCfg.bg,
                                    color: typeCfg.text,
                                    borderRadius: "0px",
                                    border: `1px solid ${typeCfg.color}22`,
                                  }}
                                >
                                  <i className={typeCfg.icon}></i> {typeCfg.label}
                                </span>
                              </td>

                              {/* Priority Dot */}
                              <td className="py-2">
                                <div className="d-flex align-items-center gap-1">
                                  <span
                                    style={{
                                      width: "7px",
                                      height: "7px",
                                      borderRadius: "50%",
                                      backgroundColor: priDot.color,
                                    }}
                                  ></span>
                                  <span className="fs-12 text-secondary">{priDot.label}</span>
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
                                      backgroundColor: "#475569",
                                      borderRadius: "50%",
                                    }}
                                  >
                                    {getInitials(t.ownerName)}
                                  </div>
                                  <span className="fs-12 text-dark text-truncate" style={{ maxWidth: "90px" }}>
                                    {t.ownerName || "Unassigned"}
                                  </span>
                                </div>
                              </td>

                              {/* Due Date & Overdue */}
                              <td className="py-2">
                                <div
                                  className={classnames("fs-12 fw-medium", {
                                    "text-danger": t.isOverdue,
                                    "text-dark": !t.isOverdue,
                                  })}
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

                              {/* Actions */}
                              <td className="text-end pe-3 py-2">
                                <div className="d-flex align-items-center justify-content-end gap-1">
                                  {/* Quick complete button */}
                                  {!isComplete ? (
                                    <Button
                                      color="light"
                                      size="sm"
                                      className="btn-icon p-1 rounded-0"
                                      title="Mark Complete"
                                      onClick={() => handleCompleteTask(t.taskId)}
                                      style={{ border: "1px solid #e2e8f0" }}
                                    >
                                      <i className="ri-check-line text-success fs-14"></i>
                                    </Button>
                                  ) : null}

                                  {/* Quick edit button */}
                                  <Button
                                    color="light"
                                    size="sm"
                                    className="btn-icon p-1 rounded-0"
                                    title="Edit Task"
                                    onClick={() => openEditModal(t)}
                                    style={{ border: "1px solid #e2e8f0" }}
                                  >
                                    <i className="ri-edit-line text-secondary fs-14"></i>
                                  </Button>

                                  {/* More options dropdown */}
                                  <UncontrolledDropdown>
                                    <DropdownToggle
                                      tag="button"
                                      className="btn btn-light btn-sm btn-icon p-1 rounded-0"
                                      style={{ border: "1px solid #e2e8f0" }}
                                    >
                                      <i className="ri-more-fill text-muted fs-14"></i>
                                    </DropdownToggle>
                                    <DropdownMenu end className="rounded-0 shadow-sm fs-12">
                                      <DropdownItem onClick={() => openDetailModal(t.taskId)}>
                                        <i className="ri-eye-line me-2 text-primary"></i> View Details
                                      </DropdownItem>
                                      {!isComplete ? (
                                        <DropdownItem onClick={() => handleCompleteTask(t.taskId)}>
                                          <i className="ri-checkbox-circle-line me-2 text-success"></i> Mark Complete
                                        </DropdownItem>
                                      ) : null}
                                      <DropdownItem onClick={() => openEditModal(t)}>
                                        <i className="ri-edit-line me-2 text-warning"></i> Edit Task
                                      </DropdownItem>
                                      <DropdownItem divider />
                                      <DropdownItem className="text-danger" onClick={() => openDeleteModal(t)}>
                                        <i className="ri-delete-bin-line me-2"></i> Delete Task
                                      </DropdownItem>
                                    </DropdownMenu>
                                  </UncontrolledDropdown>
                                </div>
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
                  style={{ borderColor: "#e2e8f0" }}
                >
                  <div className="text-muted fs-12 mb-2 mb-sm-0">
                    Showing <span className="fw-semibold text-dark">{startItem}</span> to{" "}
                    <span className="fw-semibold text-dark">{endItem}</span> of{" "}
                    <span className="fw-semibold text-dark">{totalCount}</span> entries
                  </div>

                  <div className="d-flex align-items-center gap-2">
                    <Input
                      type="select"
                      className="form-select form-select-sm rounded-0 fs-12"
                      style={{ width: "95px" }}
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
                        style={{ border: "1px solid #cbd5e1" }}
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
                              backgroundColor: page === i ? "#7f1d1d" : "#ffffff",
                              borderColor: page === i ? "#7f1d1d" : "#cbd5e1",
                              color: page === i ? "#ffffff" : "#334155",
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
                        style={{ border: "1px solid #cbd5e1" }}
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
            <Card className="rounded-0 shadow-sm border-0 mb-3" style={{ backgroundColor: "#ffffff" }}>
              <CardBody className="p-3">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <h6 className="fw-semibold text-dark mb-0 fs-13">Task Summary</h6>
                  <span className="text-muted fs-11 d-flex align-items-center gap-1">
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
                          if (!stats.distribution || stats.totalTasks === 0) return "#e2e8f0";
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
                          return stops.length > 0 ? `conic-gradient(${stops.join(", ")})` : "#e2e8f0";
                        })(),
                      }}
                    ></div>
                    <div
                      className="position-absolute bg-white d-flex flex-column align-items-center justify-content-center"
                      style={{ width: "74px", height: "74px", borderRadius: "50%" }}
                    >
                      <span className="fw-bold fs-18 lh-1" style={{ color: "#7f1d1d" }}>
                        {stats.totalTasks}
                      </span>
                      <span className="text-muted fs-10 mt-1">Total</span>
                    </div>
                  </div>
                </div>

                {/* Legend list (Square geometry per Rule 4) */}
                <div className="mt-2 pt-2 border-top" style={{ borderColor: "#f1f5f9" }}>
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
                        <span className="text-secondary">{d.label}</span>
                      </div>
                      <div className="fw-medium text-dark">
                        {d.count}{" "}
                        <span className="text-muted fs-10">({d.percentage}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>

            {/* 2. My Pending Tasks Card (Sleek List & Perfect Visibility) */}
            <Card className="rounded-0 shadow-sm border-0 mb-3" style={{ backgroundColor: "#ffffff" }}>
              <CardBody className="p-3">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <div className="d-flex align-items-center gap-1">
                    <h6 className="fw-semibold text-dark mb-0 fs-13">My Pending Tasks</h6>
                    {stats.pendingTasks.length > 0 && (
                      <span
                        className="badge rounded-0 fs-10 px-1 py-0 ms-1 fw-semibold"
                        style={{ backgroundColor: "#f1f5f9", color: "#475569" }}
                      >
                        {stats.pendingTasks.length}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn btn-link p-0 text-decoration-none fs-11 fw-medium"
                    style={{ color: "#7f1d1d" }}
                    onClick={() => handleKpiClick("TO_DO")}
                  >
                    View All
                  </button>
                </div>

                {stats.pendingTasks.length === 0 ? (
                  <div className="text-center py-3 text-muted fs-11">No pending tasks.</div>
                ) : (
                  <div
                    className="d-flex flex-column crm-custom-scroll"
                    style={{
                      maxHeight: "380px",
                      overflowY: "auto",
                      scrollbarWidth: "thin",
                      scrollbarColor: "#cbd5e1 transparent",
                    }}
                  >
                    {stats.pendingTasks.slice(0, 5).map((pt, idx) => {
                      const typeCfg = getTypeConfig(pt.task_type || pt.taskType);
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
                              <div className="fw-semibold text-dark fs-12 text-truncate" title={pt.title}>
                                {pt.title}
                              </div>
                              <div className="d-flex align-items-center gap-1 text-muted fs-11 mt-1 text-truncate">
                                <span className="text-truncate">{pt.company || "—"}</span>
                                <span>•</span>
                                <span
                                  className={classnames("fw-medium flex-shrink-0", {
                                    "text-danger": isOver,
                                    "text-secondary": !isOver,
                                  })}
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
                                backgroundColor: isHigh ? "#fef2f2" : isLow ? "#ecfdf5" : "#fffbeb",
                                color: isHigh ? "#dc2626" : isLow ? "#16a34a" : "#d97706",
                                border: `1px solid ${isHigh ? "#fecaca" : isLow ? "#a7f3d0" : "#fde68a"}`,
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
            <Card className="rounded-0 shadow-sm border-0 mb-3" style={{ backgroundColor: "#ffffff" }}>
              <CardBody className="p-3">
                <h6 className="fw-semibold text-dark mb-2 fs-13">Quick Actions</h6>
                <Row className="g-2">
                  <Col xs={6}>
                    <Button
                      color="light"
                      className="w-100 rounded-0 p-2 text-center d-flex flex-column align-items-center gap-1 fs-11 text-secondary"
                      style={{ border: "1px solid #e2e8f0" }}
                      onClick={() => openCreateModal("TASK")}
                    >
                      <i className="ri-add-circle-line fs-16 text-primary"></i>
                      <span>New Task</span>
                    </Button>
                  </Col>
                  <Col xs={6}>
                    <Button
                      color="light"
                      className="w-100 rounded-0 p-2 text-center d-flex flex-column align-items-center gap-1 fs-11 text-secondary"
                      style={{ border: "1px solid #e2e8f0" }}
                      onClick={() => openCreateModal("CALL")}
                    >
                      <i className="ri-phone-line fs-16 text-success"></i>
                      <span>New Call</span>
                    </Button>
                  </Col>
                  <Col xs={6}>
                    <Button
                      color="light"
                      className="w-100 rounded-0 p-2 text-center d-flex flex-column align-items-center gap-1 fs-11 text-secondary"
                      style={{ border: "1px solid #e2e8f0" }}
                      onClick={() => openCreateModal("MEETING")}
                    >
                      <i className="ri-calendar-event-line fs-16" style={{ color: "#8b5cf6" }}></i>
                      <span>New Meeting</span>
                    </Button>
                  </Col>
                  <Col xs={6}>
                    <Button
                      color="light"
                      className="w-100 rounded-0 p-2 text-center d-flex flex-column align-items-center gap-1 fs-11 text-secondary"
                      style={{ border: "1px solid #e2e8f0" }}
                      onClick={() => openCreateModal("EMAIL")}
                    >
                      <i className="ri-mail-line fs-16 text-info"></i>
                      <span>Send Email</span>
                    </Button>
                  </Col>
                  <Col xs={6}>
                    <Button
                      color="light"
                      className="w-100 rounded-0 p-2 text-center d-flex flex-column align-items-center gap-1 fs-11 text-secondary"
                      style={{ border: "1px solid #e2e8f0" }}
                      onClick={() => setUploadDocModal(true)}
                    >
                      <i className="ri-file-upload-line fs-16 text-warning"></i>
                      <span>Upload Doc</span>
                    </Button>
                  </Col>
                  <Col xs={6}>
                    <Button
                      color="light"
                      className="w-100 rounded-0 p-2 text-center d-flex flex-column align-items-center gap-1 fs-11 text-secondary"
                      style={{ border: "1px solid #e2e8f0" }}
                      onClick={() => setCreateQuoteModal(true)}
                    >
                      <i className="ri-file-text-line fs-16 text-danger"></i>
                      <span>Create Quote</span>
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
            className="rounded-0 bg-light"
            style={{ borderBottom: "1px solid #e2e8f0" }}
          >
            <span className="fw-semibold text-dark fs-15">
              {editMode ? `Edit Task — ${form.title}` : "New Task"}
            </span>
          </ModalHeader>
          <Form onSubmit={handleSave}>
            <ModalBody className="p-4">
              {formError ? <Alert color="danger" className="rounded-0 py-2 fs-12">{formError}</Alert> : null}

              <Row className="g-3">
                {/* Title */}
                <Col md={12}>
                  <FormGroup className="mb-0">
                    <Label className="fw-medium fs-12 text-dark">
                      Task Title <span className="text-danger">*</span>
                    </Label>
                    <Input
                      type="text"
                      className="form-control rounded-0 fs-13"
                      placeholder="e.g. Follow-up call with Neha Shah"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      required
                    />
                  </FormGroup>
                </Col>

                {/* Type & Priority & Status (Dynamic from DB lookups) */}
                <Col md={4}>
                  <FormGroup className="mb-0">
                    <Label className="fw-medium fs-12 text-dark">Type</Label>
                    <Input
                      type="select"
                      className="form-select rounded-0 fs-13"
                      value={form.taskType}
                      onChange={(e) => setForm({ ...form, taskType: e.target.value })}
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
                    <Label className="fw-medium fs-12 text-dark">Priority</Label>
                    <Input
                      type="select"
                      className="form-select rounded-0 fs-13"
                      value={form.priority}
                      onChange={(e) => setForm({ ...form, priority: e.target.value })}
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
                    <Label className="fw-medium fs-12 text-dark">Status</Label>
                    <Input
                      type="select"
                      className="form-select rounded-0 fs-13"
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                    >
                      {lookups.taskStatus.map((s) => (
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
                    <Label className="fw-medium fs-12 text-dark">Related Company / Account</Label>
                    <Input
                      type="text"
                      list="accounts-list"
                      className="form-control rounded-0 fs-13"
                      placeholder="e.g. ABC Ltd."
                      value={form.company}
                      onChange={(e) => setForm({ ...form, company: e.target.value })}
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
                    <Label className="fw-medium fs-12 text-dark">Contact Person</Label>
                    <Input
                      type="text"
                      className="form-control rounded-0 fs-13"
                      placeholder="e.g. Neha Shah"
                      value={form.contactPerson}
                      onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                    />
                  </FormGroup>
                </Col>

                {/* Owner & Dates */}
                <Col md={4}>
                  <FormGroup className="mb-0">
                    <Label className="fw-medium fs-12 text-dark">Assigned Owner</Label>
                    <Input
                      type="select"
                      className="form-select rounded-0 fs-13"
                      value={form.employeeId}
                      onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
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
                    <Label className="fw-medium fs-12 text-dark">Start Date</Label>
                    <Input
                      type="date"
                      className="form-control rounded-0 fs-13"
                      value={form.startDate}
                      onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    />
                  </FormGroup>
                </Col>
                <Col md={4}>
                  <FormGroup className="mb-0">
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <Label className="fw-medium fs-12 text-dark mb-0">Due Date</Label>
                      <div className="d-flex gap-1">
                        <button
                          type="button"
                          className="btn btn-link p-0 text-muted fs-10 text-decoration-none"
                          onClick={() => setForm({ ...form, dueDate: todayIso() })}
                        >
                          Today
                        </button>
                        <span className="text-muted fs-10">|</span>
                        <button
                          type="button"
                          className="btn btn-link p-0 text-muted fs-10 text-decoration-none"
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
                    />
                  </FormGroup>
                </Col>

                {/* Notes */}
                <Col md={12}>
                  <FormGroup className="mb-0">
                    <Label className="fw-medium fs-12 text-dark">Notes / Description</Label>
                    <Input
                      type="textarea"
                      rows={3}
                      className="form-control rounded-0 fs-13"
                      placeholder="Add details, next steps or action items..."
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    />
                  </FormGroup>
                </Col>
              </Row>
            </ModalBody>
            <ModalFooter className="rounded-0 bg-light py-2" style={{ borderTop: "1px solid #e2e8f0" }}>
              <Button
                color="light"
                type="button"
                className="rounded-0 fs-13"
                onClick={() => setModal(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="rounded-0 fs-13 text-white"
                style={{ backgroundColor: "#7f1d1d", borderColor: "#7f1d1d" }}
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
            className="rounded-0 bg-light"
            style={{ borderBottom: "1px solid #e2e8f0" }}
          >
            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-secondary-subtle text-secondary rounded-0 fs-12">
                {detailTask?.taskCode || "TSK"}
              </span>
              <span className="fw-semibold text-dark fs-15">Task Details</span>
            </div>
          </ModalHeader>
          <ModalBody className="p-4">
            {detailLoading ? (
              <div className="text-center py-5">
                <Spinner size="sm" className="me-2" /> Loading task details from database...
              </div>
            ) : detailTask ? (
              <div>
                {/* Title & Badges Header */}
                <div className="d-flex align-items-start justify-content-between mb-3">
                  <div>
                    <h5 className="fw-bold text-dark mb-1">{detailTask.title}</h5>
                    <div className="d-flex align-items-center gap-2">
                      {/* Type Badge */}
                      {(() => {
                        const typeCfg = getTypeConfig(detailTask.taskType);
                        return (
                          <span
                            className="px-2 py-0 fs-11 fw-medium"
                            style={{
                              backgroundColor: typeCfg.bg,
                              color: typeCfg.text,
                              borderRadius: "0px",
                              border: `1px solid ${typeCfg.color}22`,
                            }}
                          >
                            <i className={typeCfg.icon}></i> {typeCfg.label}
                          </span>
                        );
                      })()}
                      {/* Status Badge */}
                      {(() => {
                        const stBadge = getStatusBadge(detailTask.taskStatus, detailTask.isOverdue);
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
                          String(detailTask.priority).toUpperCase() === "HIGH" ? "danger" : "warning"
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
                    >
                      {completingDetail ? <Spinner size="sm" className="me-1" /> : <i className="ri-check-line"></i>}
                      Mark Completed
                    </Button>
                  ) : (
                    <span className="badge bg-success-subtle text-success rounded-0 fs-12 p-2">
                      <i className="ri-checkbox-circle-line me-1"></i> Completed
                    </span>
                  )}
                </div>

                {/* Metadata Grid */}
                <Row className="g-3 p-3 bg-light bg-opacity-50 border rounded-0 mb-3" style={{ borderColor: "#e2e8f0" }}>
                  <Col md={6}>
                    <div className="text-muted fs-11">Related Company</div>
                    <div className="fw-semibold text-dark fs-13">{detailTask.company || "—"}</div>
                  </Col>
                  <Col md={6}>
                    <div className="text-muted fs-11">Contact Person</div>
                    <div className="fw-semibold text-dark fs-13">{detailTask.contactPerson || "—"}</div>
                  </Col>
                  <Col md={4}>
                    <div className="text-muted fs-11">Assigned Owner</div>
                    <div className="fw-semibold text-dark fs-13">{detailTask.ownerName || "—"}</div>
                  </Col>
                  <Col md={4}>
                    <div className="text-muted fs-11">Start Date</div>
                    <div className="fw-semibold text-dark fs-13">{detailTask.startDate || "—"}</div>
                  </Col>
                  <Col md={4}>
                    <div className="text-muted fs-11">Due Date</div>
                    <div
                      className={classnames("fw-semibold fs-13", {
                        "text-danger": detailTask.isOverdue,
                        "text-dark": !detailTask.isOverdue,
                      })}
                    >
                      {detailTask.dueLabel || detailTask.dueDate || "—"}
                    </div>
                  </Col>
                </Row>

                {/* Notes Section */}
                <div className="mb-3">
                  <div className="fw-semibold text-dark fs-13 mb-1">Notes / Description</div>
                  <div
                    className="p-3 bg-white border rounded-0 fs-13 text-secondary"
                    style={{ borderColor: "#e2e8f0", minHeight: "60px", whiteSpace: "pre-wrap" }}
                  >
                    {detailTask.notes || "No notes provided for this task."}
                  </div>
                </div>

                {/* Activity History Log from tab_task_detail_tran */}
                {detailTask.history && detailTask.history.length > 0 ? (
                  <div>
                    <div className="fw-semibold text-dark fs-13 mb-2">Activity History Log</div>
                    <div className="border rounded-0 p-2" style={{ borderColor: "#f1f5f9", maxHeight: "150px", overflowY: "auto" }}>
                      {detailTask.history.map((h, idx) => (
                        <div key={idx} className="d-flex align-items-center justify-content-between py-1 border-bottom fs-12">
                          <span className="text-dark">{h.remarks || h.status}</span>
                          <span className="text-muted fs-11">
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
          <ModalFooter className="rounded-0 bg-light py-2" style={{ borderTop: "1px solid #e2e8f0" }}>
            {detailTask ? (
              <>
                <Button
                  color="danger"
                  outline
                  size="sm"
                  className="rounded-0 fs-12 me-auto"
                  onClick={() => openDeleteModal(detailTask)}
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
            >
              Close
            </Button>
          </ModalFooter>
        </Modal>

        {/* ================================================================= */}
        {/* IN-PAGE MODAL 3: Quick Action - Upload Document                   */}
        {/* ================================================================= */}
        <Modal
          isOpen={uploadDocModal}
          toggle={() => setUploadDocModal(!uploadDocModal)}
          centered
          className="rounded-0"
        >
          <ModalHeader
            toggle={() => setUploadDocModal(!uploadDocModal)}
            className="rounded-0 bg-light"
            style={{ borderBottom: "1px solid #e2e8f0" }}
          >
            <span className="fw-semibold text-dark fs-15">Upload Task Document</span>
          </ModalHeader>
          <ModalBody className="p-4">
            <FormGroup className="mb-3">
              <Label className="fw-medium fs-12 text-dark">Document Name</Label>
              <Input
                type="text"
                className="form-control rounded-0 fs-13"
                placeholder="e.g. Requirement_Spec.pdf"
                value={uploadFileName}
                onChange={(e) => setUploadFileName(e.target.value)}
              />
            </FormGroup>
            <FormGroup className="mb-3">
              <Label className="fw-medium fs-12 text-dark">Related Company</Label>
              <Input
                type="select"
                className="form-select rounded-0 fs-13"
                value={uploadFileEntity}
                onChange={(e) => setUploadFileEntity(e.target.value)}
              >
                <option value="">Select Company / Account</option>
                {lookups.accounts.map((a) => (
                  <option key={a.accountId || a.account_id} value={a.companyName || a.displayName}>
                    {a.companyName || a.displayName}
                  </option>
                ))}
              </Input>
            </FormGroup>
            <div
              className="p-4 border border-dashed rounded-0 text-center bg-light cursor-pointer"
              style={{ borderColor: "#cbd5e1" }}
            >
              <i className="ri-upload-cloud-2-line fs-32 text-primary d-block mb-1"></i>
              <div className="fw-medium fs-13 text-dark">Drop file here or click to browse</div>
              <div className="text-muted fs-11">Supports PDF, XLSX, DOCX up to 10MB</div>
            </div>
          </ModalBody>
          <ModalFooter className="rounded-0 bg-light py-2">
            <Button color="light" size="sm" className="rounded-0" onClick={() => setUploadDocModal(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="rounded-0 text-white"
              style={{ backgroundColor: "#7f1d1d", borderColor: "#7f1d1d" }}
              onClick={() => {
                toastSuccess("Document attachment recorded.");
                setUploadDocModal(false);
              }}
            >
              Upload
            </Button>
          </ModalFooter>
        </Modal>

        {/* ================================================================= */}
        {/* IN-PAGE MODAL 4: Quick Action - Create Quote                      */}
        {/* ================================================================= */}
        <Modal
          isOpen={createQuoteModal}
          toggle={() => setCreateQuoteModal(!createQuoteModal)}
          centered
          className="rounded-0"
        >
          <ModalHeader
            toggle={() => setCreateQuoteModal(!createQuoteModal)}
            className="rounded-0 bg-light"
            style={{ borderBottom: "1px solid #e2e8f0" }}
          >
            <span className="fw-semibold text-dark fs-15">Quick Quotation</span>
          </ModalHeader>
          <ModalBody className="p-4">
            <FormGroup className="mb-3">
              <Label className="fw-medium fs-12 text-dark">Customer Account</Label>
              <Input
                type="select"
                className="form-select rounded-0 fs-13"
                value={quoteAccount}
                onChange={(e) => setQuoteAccount(e.target.value)}
              >
                <option value="">Select Customer Account</option>
                {lookups.accounts.map((a) => (
                  <option key={a.accountId || a.account_id} value={a.companyName || a.displayName}>
                    {a.companyName || a.displayName}
                  </option>
                ))}
              </Input>
            </FormGroup>
            <FormGroup className="mb-3">
              <Label className="fw-medium fs-12 text-dark">Quotation Amount (INR)</Label>
              <Input
                type="number"
                className="form-control rounded-0 fs-13"
                placeholder="e.g. 150000"
                value={quoteAmount}
                onChange={(e) => setQuoteAmount(e.target.value)}
              />
            </FormGroup>
          </ModalBody>
          <ModalFooter className="rounded-0 bg-light py-2">
            <Button color="light" size="sm" className="rounded-0" onClick={() => setCreateQuoteModal(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="rounded-0 text-white"
              style={{ backgroundColor: "#7f1d1d", borderColor: "#7f1d1d" }}
              onClick={() => {
                toastSuccess("Quotation draft generated.");
                setCreateQuoteModal(false);
              }}
            >
              Create Quote
            </Button>
          </ModalFooter>
        </Modal>

        {/* ================================================================= */}
        {/* IN-PAGE MODAL 5: Delete Confirmation Modal                        */}
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
