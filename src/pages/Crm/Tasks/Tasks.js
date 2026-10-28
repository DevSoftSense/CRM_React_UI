import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { Link } from "react-router-dom";
import DeleteModal from "../../../Components/Common/DeleteModal";
import PageHeader from "../components/PageHeader";
import CrmListPagination from "../components/CrmListPagination";
import SortableHeader, { compareSortValues, matchesColumn } from "../components/SortableHeader";
import TaskAdvancedFilters from "./TaskAdvancedFilters";
import {
  completeTask,
  createTask,
  deactivateTask,
  getTaskById,
  getTaskLookups,
  getTasks,
  updateTask,
} from "../../../helpers/crmTaskApi";
import { getOwnerDropdown } from "../../../helpers/crmOwnerApi";
import { toastApiError, toastSuccess } from "../../../helpers/crmToast";

const PAGE_SIZE_OPTIONS = [
  { value: 100, label: "100" },
  { value: 500, label: "500" },
  { value: 1000, label: "1000" },
  { value: "all", label: "All" },
];
const ALL_PAGE_SIZE = 5000;

const resolvePageSize = (value) => {
  if (value === "all" || value === ALL_PAGE_SIZE) return ALL_PAGE_SIZE;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 100;
};

const todayIso = () => new Date().toISOString().slice(0, 10);

const emptyForm = () => ({
  title: "",
  taskType: "FOLLOW_UP",
  priority: "MEDIUM",
  status: "TO_DO",
  dueDate: todayIso(),
  startDate: todayIso(),
  employeeId: "",
  notes: "",
});

const emptyFilters = () => ({
  status: "",
  priority: "",
  taskType: "",
  employeeId: "",
  dueFrom: "",
  dueTo: "",
});

const emptyColumnFilters = () => ({
  code: "",
  title: "",
  type: "",
  due: "",
  owner: "",
  status: "",
  priority: "",
});

const taskCodeNumber = (code) => {
  const m = String(code || "").match(/(\d+)$/);
  return m ? Number(m[1]) : 0;
};

const SORT_COLUMNS = [
  { key: "code", label: "Code", getValue: (t) => taskCodeNumber(t.taskCode) },
  { key: "title", label: "Task", getValue: (t) => t.title || "" },
  { key: "type", label: "Type", getValue: (t) => t.taskTypeName || t.taskType || "" },
  { key: "due", label: "Due", getValue: (t) => t.dueDate || "" },
  { key: "owner", label: "Owner", getValue: (t) => t.ownerName || "" },
  { key: "priority", label: "Priority", getValue: (t) => t.priorityName || t.priority || "" },
  { key: "status", label: "Status", getValue: (t) => t.taskStatusName || t.taskStatus || "" },
];

const statusBadge = (status) => {
  const v = (status || "").toUpperCase();
  if (v === "COMPLETED") return "bg-success-subtle text-success";
  if (v === "OVERDUE") return "bg-danger-subtle text-danger";
  if (v === "IN_PROGRESS") return "bg-info-subtle text-info";
  return "bg-warning-subtle text-warning";
};

const Tasks = () => {
  document.title = "Tasks | SoftOnCloud CRM";

  const [items, setItems] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSizeChoice, setPageSizeChoice] = useState(100);
  const pageSize = resolvePageSize(pageSizeChoice);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState(emptyFilters);
  const [draftFilters, setDraftFilters] = useState(emptyFilters);
  const [filterOpen, setFilterOpen] = useState(false);

  const [columnFilterInput, setColumnFilterInput] = useState(emptyColumnFilters);
  const [columnFilters, setColumnFilters] = useState(emptyColumnFilters);
  const [sortConfig, setSortConfig] = useState({ key: "code", dir: "asc" });

  const [lookups, setLookups] = useState({ taskStatus: [], taskPriority: [], taskType: [] });
  const [owners, setOwners] = useState([]);

  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [modal, setModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(0);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    const t = setTimeout(() => setColumnFilters(columnFilterInput), 300);
    return () => clearTimeout(t);
  }, [columnFilterInput]);

  useEffect(() => {
    (async () => {
      try {
        const [lu, own] = await Promise.all([getTaskLookups(), getOwnerDropdown({ ensureSeed: true })]);
        setLookups({
          taskStatus: lu?.taskStatus || lu?.TaskStatus || [],
          taskPriority: lu?.taskPriority || lu?.TaskPriority || [],
          taskType: lu?.taskType || lu?.TaskType || [],
        });
        setOwners(Array.isArray(own) ? own : own?.items || []);
      } catch {
        /* list load surfaces API errors */
      }
    })();
  }, []);

  const toggleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return { key: null, dir: "asc" };
    });
  };

  const setColumnFilterValue = (key, value) => {
    setColumnFilterInput((prev) => ({ ...prev, [key]: value }));
  };

  const filteredItems = useMemo(() => {
    const cf = columnFilters;
    const hasCol = Object.values(cf).some((v) => String(v || "").trim());
    if (!hasCol) return items;
    return items.filter(
      (t) =>
        matchesColumn(t.taskCode, cf.code) &&
        matchesColumn(t.title, cf.title) &&
        matchesColumn(t.taskTypeName || t.taskType, cf.type) &&
        matchesColumn(t.dueDate, cf.due) &&
        matchesColumn(t.ownerName, cf.owner) &&
        matchesColumn(t.priorityName || t.priority, cf.priority) &&
        matchesColumn(t.taskStatusName || t.taskStatus, cf.status)
    );
  }, [items, columnFilters]);

  const sortedItems = useMemo(() => {
    if (!sortConfig.key) return filteredItems;
    const column = SORT_COLUMNS.find((col) => col.key === sortConfig.key);
    if (!column) return filteredItems;
    return [...filteredItems].sort((a, b) =>
      compareSortValues(column.getValue(a), column.getValue(b), sortConfig.dir)
    );
  }, [filteredItems, sortConfig]);

  const hasColumnFilters = useMemo(
    () => Object.values(columnFilters).some((v) => String(v || "").trim()),
    [columnFilters]
  );
  const displayCount = hasColumnFilters ? sortedItems.length : totalCount;

  const hasAdvancedFilters = useMemo(
    () =>
      !!(
        filters.status ||
        filters.priority ||
        filters.taskType ||
        filters.employeeId ||
        filters.dueFrom ||
        filters.dueTo
      ),
    [filters]
  );

  const loadList = useCallback(async () => {
    setListLoading(true);
    setListError("");
    try {
      const result = await getTasks({
        search: search || undefined,
        status: filters.status || undefined,
        priority: filters.priority || undefined,
        taskType: filters.taskType || undefined,
        employeeId: filters.employeeId || undefined,
        dueFrom: filters.dueFrom || undefined,
        dueTo: filters.dueTo || undefined,
        limit: pageSize,
        offset: page * pageSize,
      });
      const rows = result?.items || result?.Items || [];
      setItems(rows);
      setTotalCount(Number(result?.totalCount ?? result?.TotalCount ?? rows[0]?.totalCount ?? 0));
    } catch (err) {
      setItems([]);
      setTotalCount(0);
      const raw = String(err?.message || "");
      const isNetwork =
        /network error|cannot reach crm api/i.test(raw) || err?.code === "ERR_NETWORK";
      const msg = isNetwork
        ? "Cannot reach CRM API (http://localhost:5191). Start CRM.API (F5), then refresh."
        : raw || "Failed to load tasks.";
      setListError(msg);
      toastApiError({ message: msg }, msg);
    } finally {
      setListLoading(false);
    }
  }, [search, filters, page, pageSize]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const openFilters = () => {
    setDraftFilters({ ...filters });
    setFilterOpen(true);
  };

  const applyFilters = () => {
    setFilters({ ...draftFilters });
    setPage(0);
    setFilterOpen(false);
  };

  const clearDraft = () => {
    setDraftFilters(emptyFilters());
  };

  const displayAll = () => {
    const cleared = emptyFilters();
    setDraftFilters(cleared);
    setFilters(cleared);
    setSearchInput("");
    setSearch("");
    setColumnFilterInput(emptyColumnFilters());
    setColumnFilters(emptyColumnFilters());
    setSortConfig({ key: "code", dir: "asc" });
    setPage(0);
    setFilterOpen(false);
  };

  const openCreate = () => {
    setEditMode(false);
    setEditId(null);
    setFormError("");
    const next = emptyForm();
    if (owners[0]?.ownerId) next.employeeId = String(owners[0].ownerId);
    setForm(next);
    setModal(true);
  };

  const openEdit = async (taskId) => {
    setFormError("");
    setSaving(true);
    try {
      const t = await getTaskById(taskId);
      if (!t) {
        toastApiError(null, "Task not found.");
        return;
      }
      setEditMode(true);
      setEditId(taskId);
      setForm({
        title: t.title || "",
        taskType: t.taskType || "FOLLOW_UP",
        priority: t.priority || "MEDIUM",
        status: t.taskStatus === "OVERDUE" ? "TO_DO" : t.taskStatus || "TO_DO",
        dueDate: t.dueDate ? String(t.dueDate).slice(0, 10) : "",
        startDate: t.startDate ? String(t.startDate).slice(0, 10) : "",
        employeeId: t.employeeId ? String(t.employeeId) : "",
        notes: t.notes || "",
      });
      setModal(true);
    } catch (err) {
      toastApiError(err, "Failed to load task.");
    } finally {
      setSaving(false);
    }
  };

  const onFormChange = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const toPayload = () => ({
    title: form.title.trim(),
    taskType: form.taskType || "FOLLOW_UP",
    priority: form.priority || "MEDIUM",
    status: form.status || "TO_DO",
    dueDate: form.dueDate || null,
    startDate: form.startDate || null,
    employeeId: form.employeeId ? Number(form.employeeId) : null,
    notes: form.notes.trim() || null,
  });

  const saveTask = async (ev) => {
    ev.preventDefault();
    setFormError("");
    if (!form.title.trim()) {
      setFormError("Title is required.");
      return;
    }
    setSaving(true);
    try {
      const payload = toPayload();
      if (editMode) {
        await updateTask(editId, payload);
        toastSuccess("Task updated successfully.");
      } else {
        await createTask(payload);
        toastSuccess("Task created successfully.");
      }
      setModal(false);
      await loadList();
    } catch (err) {
      const msg = err?.message || "Save failed.";
      setFormError(msg);
      toastApiError(err, "Failed to save task.");
    } finally {
      setSaving(false);
    }
  };

  const markComplete = async (taskId) => {
    try {
      await completeTask(taskId);
      toastSuccess("Task marked completed.");
      await loadList();
    } catch (err) {
      toastApiError(err, "Failed to complete task.");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget?.taskId) return;
    setDeleting(true);
    try {
      await deactivateTask(deleteTarget.taskId);
      toastSuccess("Task deleted successfully.");
      setDeleteModal(false);
      setDeleteTarget(null);
      await loadList();
    } catch (err) {
      toastApiError(err, "Failed to delete task.");
    } finally {
      setDeleting(false);
    }
  };

  const types = lookups.taskType || [];
  const statuses = lookups.taskStatus || [];
  const priorities = lookups.taskPriority || [];
  const formStatuses = statuses.filter((s) =>
    ["TO_DO", "IN_PROGRESS", "COMPLETED"].includes(String(s.masterCode || "").toUpperCase())
  );

  return (
    <div className="page-content">
      <Container fluid>
        <PageHeader
          title="Tasks"
          pageTitle="CRM"
          description="Follow-ups and to-dos on shared task detail (app 28). Overdue is calculated from due date."
          actions={
            <Button color="primary" onClick={openCreate}>
              <i className="ri-add-line align-bottom me-1" />
              New Task
            </Button>
          }
        />

        {listError ? <Alert color="danger" className="mb-3">{listError}</Alert> : null}

        <Card className="apt-list-card mb-0">
          <CardBody className="p-0">
            <div className="apt-list-toolbar">
              <div className="apt-list-toolbar__left">
                <h5 className="apt-list-toolbar__count mb-0">Results ({displayCount})</h5>
                <div className="apt-list-pagesize apt-list-pagesize--inline">
                  <span className="text-muted fs-13">Show</span>
                  <Input
                    type="select"
                    bsSize="sm"
                    className="apt-list-pagesize__select"
                    value={pageSizeChoice}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setPageSizeChoice(raw === "all" ? "all" : Number(raw));
                      setPage(0);
                    }}
                  >
                    {PAGE_SIZE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Input>
                  <span className="text-muted fs-13">entries</span>
                </div>
              </div>
              <div className="apt-list-toolbar__search search-box">
                <Input
                  type="text"
                  className="form-control"
                  placeholder="Search title, code, owner…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
                <i className="ri-search-line search-icon" />
              </div>
              <Button
                color="primary"
                className={`apt-list-toolbar__filter-btn ${hasAdvancedFilters ? "is-active" : ""}`}
                onClick={openFilters}
              >
                <i className="ri-filter-3-line me-1" />
                Advanced Filters
                {hasAdvancedFilters ? (
                  <span className="apt-list-toolbar__filter-dot" aria-hidden />
                ) : null}
              </Button>
            </div>

            <div className="table-responsive">
              <table className="table table-hover table-nowrap align-middle mb-0 apt-list-table">
                <thead className="apt-list-table__head">
                  <tr>
                    <th style={{ width: "150px" }} className="text-center">
                      Actions
                    </th>
                    {SORT_COLUMNS.map((column) => (
                      <SortableHeader
                        key={column.key}
                        column={column}
                        sortConfig={sortConfig}
                        onSort={toggleSort}
                        filterValue={columnFilterInput[column.key]}
                        onFilterChange={setColumnFilterValue}
                      />
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {listLoading ? (
                    <tr>
                      <td colSpan={8} className="text-center py-5">
                        <Spinner color="primary" />
                      </td>
                    </tr>
                  ) : sortedItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-5 text-muted">
                        <div>No tasks found.</div>
                        <div className="fs-12 mt-2">
                          Try{" "}
                          <button
                            type="button"
                            className="btn btn-link btn-sm p-0 align-baseline"
                            onClick={displayAll}
                          >
                            Display All
                          </button>{" "}
                          or adjust filters. Or click <strong>New Task</strong>.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    sortedItems.map((t) => (
                      <tr key={t.taskId}>
                        <td className="text-center">
                          <div className="d-flex align-items-center justify-content-center gap-1">
                            <Button
                              color="soft-primary"
                              size="sm"
                              tag={Link}
                              to={`/crm/tasks/${t.taskId}`}
                              title="View"
                            >
                              <i className="ri-eye-line" />
                            </Button>
                            <Button
                              color="soft-primary"
                              size="sm"
                              onClick={() => openEdit(t.taskId)}
                              title="Edit"
                            >
                              <i className="ri-pencil-line" />
                            </Button>
                            {String(t.taskStatus || "").toUpperCase() !== "COMPLETED" ? (
                              <Button
                                color="soft-success"
                                size="sm"
                                onClick={() => markComplete(t.taskId)}
                                title="Mark completed"
                              >
                                <i className="ri-check-line" />
                              </Button>
                            ) : null}
                            <Button
                              color="soft-danger"
                              size="sm"
                              onClick={() => {
                                setDeleteTarget(t);
                                setDeleteModal(true);
                              }}
                              title="Delete"
                            >
                              <i className="ri-delete-bin-line" />
                            </Button>
                          </div>
                        </td>
                        <td className="fs-13 fw-semibold">{t.taskCode || "—"}</td>
                        <td>
                          <Link to={`/crm/tasks/${t.taskId}`} className="fw-semibold">
                            {t.title || "—"}
                          </Link>
                        </td>
                        <td className="fs-13">{t.taskTypeName || t.taskType || "—"}</td>
                        <td className="fs-13">{t.dueDate || "—"}</td>
                        <td className="fs-13">{t.ownerName || "—"}</td>
                        <td className="fs-13">{t.priorityName || t.priority || "—"}</td>
                        <td>
                          <Badge className={statusBadge(t.taskStatus)}>
                            {t.taskStatusName || t.taskStatus || "—"}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <CrmListPagination
              page={page}
              pageSize={pageSize}
              totalCount={displayCount}
              onPageChange={setPage}
            />
          </CardBody>
        </Card>

        <TaskAdvancedFilters
          isOpen={filterOpen}
          onClose={() => setFilterOpen(false)}
          draft={draftFilters}
          onDraftChange={setDraftFilters}
          onApply={applyFilters}
          onDisplayAll={displayAll}
          onClearDraft={clearDraft}
          taskStatuses={statuses}
          taskPriorities={priorities}
          taskTypes={types}
          owners={owners}
        />

        <Modal isOpen={modal} toggle={() => !saving && setModal(false)} size="lg" centered>
          <ModalHeader toggle={() => !saving && setModal(false)}>
            {editMode ? "Edit Task" : "New Task"}
          </ModalHeader>
          <Form onSubmit={saveTask}>
            <ModalBody>
              {formError ? <Alert color="danger">{formError}</Alert> : null}
              <Row className="g-3">
                <Col md={8}>
                  <Label className="form-label">
                    Title <span className="text-danger">*</span>
                  </Label>
                  <Input
                    value={form.title}
                    onChange={(e) => onFormChange("title", e.target.value)}
                    required
                    placeholder="e.g. Send AMC quotation to Acme Solar"
                  />
                </Col>
                <Col md={4}>
                  <Label className="form-label">Type</Label>
                  <Input
                    type="select"
                    value={form.taskType}
                    onChange={(e) => onFormChange("taskType", e.target.value)}
                  >
                    {types.length === 0 ? <option value="FOLLOW_UP">Follow-up</option> : null}
                    {types.map((x) => (
                      <option key={x.masterId || x.masterCode} value={x.masterCode}>
                        {x.masterName}
                      </option>
                    ))}
                  </Input>
                </Col>
                <Col md={4}>
                  <Label className="form-label">Priority</Label>
                  <Input
                    type="select"
                    value={form.priority}
                    onChange={(e) => onFormChange("priority", e.target.value)}
                  >
                    {priorities.length === 0 ? (
                      <>
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                      </>
                    ) : null}
                    {priorities.map((x) => (
                      <option key={x.masterId || x.masterCode} value={x.masterCode}>
                        {x.masterName}
                      </option>
                    ))}
                  </Input>
                </Col>
                <Col md={4}>
                  <Label className="form-label">Status</Label>
                  <Input
                    type="select"
                    value={form.status}
                    onChange={(e) => onFormChange("status", e.target.value)}
                  >
                    {formStatuses.length === 0 ? (
                      <>
                        <option value="TO_DO">To Do</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="COMPLETED">Completed</option>
                      </>
                    ) : null}
                    {formStatuses.map((x) => (
                      <option key={x.masterId || x.masterCode} value={x.masterCode}>
                        {x.masterName}
                      </option>
                    ))}
                  </Input>
                </Col>
                <Col md={4}>
                  <Label className="form-label">Owner</Label>
                  <Input
                    type="select"
                    value={form.employeeId}
                    onChange={(e) => onFormChange("employeeId", e.target.value)}
                  >
                    <option value="">(first active owner)</option>
                    {owners.map((o) => (
                      <option key={o.ownerId} value={o.ownerId}>
                        {o.fullName}
                      </option>
                    ))}
                  </Input>
                </Col>
                <Col md={6}>
                  <Label className="form-label">Start date</Label>
                  <Input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => onFormChange("startDate", e.target.value)}
                  />
                </Col>
                <Col md={6}>
                  <Label className="form-label">Due date</Label>
                  <Input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => onFormChange("dueDate", e.target.value)}
                  />
                </Col>
                <Col md={12}>
                  <Label className="form-label">Notes</Label>
                  <Input
                    type="textarea"
                    rows={3}
                    value={form.notes}
                    onChange={(e) => onFormChange("notes", e.target.value)}
                  />
                </Col>
              </Row>
            </ModalBody>
            <ModalFooter>
              <Button color="light" type="button" disabled={saving} onClick={() => setModal(false)}>
                Cancel
              </Button>
              <Button color="primary" type="submit" disabled={saving}>
                {saving ? <Spinner size="sm" className="me-1" /> : null}
                {editMode ? "Update" : "Create"}
              </Button>
            </ModalFooter>
          </Form>
        </Modal>

        <DeleteModal
          show={deleteModal}
          onDeleteClick={confirmDelete}
          onCloseClick={() => !deleting && setDeleteModal(false)}
        />
      </Container>
    </div>
  );
};

export default Tasks;
