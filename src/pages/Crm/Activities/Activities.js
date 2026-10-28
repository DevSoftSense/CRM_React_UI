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
import {
  completeActivity,
  createActivity,
  deactivateActivity,
  getActivityById,
  getActivityLookups,
  getActivities,
  updateActivity,
} from "../../../helpers/crmActivityApi";
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

const pad = (n) => String(n).padStart(2, "0");

const toDatetimeLocalValue = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const defaultStartLocal = () => {
  const d = new Date();
  d.setSeconds(0, 0);
  d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15);
  return toDatetimeLocalValue(d);
};

const defaultEndLocal = (startLocal) => {
  const d = startLocal ? new Date(startLocal) : new Date();
  if (Number.isNaN(d.getTime())) return "";
  d.setMinutes(d.getMinutes() + 30);
  return toDatetimeLocalValue(d);
};

const formatWhen = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
};

const emptyForm = () => {
  const startTime = defaultStartLocal();
  return {
    subject: "",
    actType: "CALL",
    startTime,
    endTime: defaultEndLocal(startTime),
    callNumber: "",
    callNotes: "",
    employeeId: "",
  };
};

const emptyColumnFilters = () => ({
  subject: "",
  type: "",
  when: "",
  owner: "",
  status: "",
});

const SORT_COLUMNS = [
  { key: "subject", label: "Subject", getValue: (a) => a.subject || "" },
  { key: "type", label: "Type", getValue: (a) => a.actTypeName || a.actType || "" },
  { key: "when", label: "Start", getValue: (a) => a.startTime || "" },
  { key: "owner", label: "Owner", getValue: (a) => a.ownerName || "" },
  { key: "status", label: "Status", getValue: (a) => a.activityStatusName || a.activityStatus || "" },
];

const statusBadge = (status) => {
  const v = (status || "").toUpperCase();
  if (v === "COMPLETED") return "bg-success-subtle text-success";
  if (v === "SCHEDULED") return "bg-info-subtle text-info";
  if (v === "PENDING") return "bg-warning-subtle text-warning";
  return "bg-secondary-subtle text-body";
};

const Activities = () => {
  document.title = "Activities | SoftOnCloud CRM";

  const [items, setItems] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSizeChoice, setPageSizeChoice] = useState(100);
  const pageSize = resolvePageSize(pageSizeChoice);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [actTypeFilter, setActTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [columnFilterInput, setColumnFilterInput] = useState(emptyColumnFilters);
  const [columnFilters, setColumnFilters] = useState(emptyColumnFilters);
  const [sortConfig, setSortConfig] = useState({ key: null, dir: "asc" });

  const [lookups, setLookups] = useState({ activityType: [], activityStatus: [] });
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
        const [lu, own] = await Promise.all([getActivityLookups(), getOwnerDropdown({ ensureSeed: true })]);
        setLookups({
          activityType: lu?.activityType || lu?.ActivityType || [],
          activityStatus: lu?.activityStatus || lu?.ActivityStatus || [],
        });
        setOwners(Array.isArray(own) ? own : own?.items || []);
      } catch {
        /* list load will surface API errors */
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
      (a) =>
        matchesColumn(a.subject, cf.subject) &&
        matchesColumn(a.actTypeName || a.actType, cf.type) &&
        matchesColumn(formatWhen(a.startTime), cf.when) &&
        matchesColumn(a.ownerName, cf.owner) &&
        matchesColumn(a.activityStatusName || a.activityStatus, cf.status)
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

  const loadList = useCallback(async () => {
    setListLoading(true);
    setListError("");
    try {
      const result = await getActivities({
        search: search || undefined,
        actType: actTypeFilter || undefined,
        activityStatus: statusFilter || undefined,
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
        : raw || "Failed to load activities.";
      setListError(msg);
      toastApiError({ message: msg }, msg);
    } finally {
      setListLoading(false);
    }
  }, [search, actTypeFilter, statusFilter, page, pageSize]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const openCreate = () => {
    setEditMode(false);
    setEditId(null);
    setFormError("");
    const next = emptyForm();
    if (owners[0]?.ownerId) next.employeeId = String(owners[0].ownerId);
    setForm(next);
    setModal(true);
  };

  const openEdit = async (activityId) => {
    setFormError("");
    setSaving(true);
    try {
      const a = await getActivityById(activityId);
      if (!a) {
        toastApiError(null, "Activity not found.");
        return;
      }
      setEditMode(true);
      setEditId(activityId);
      setForm({
        subject: a.subject || "",
        actType: a.actType || "CALL",
        startTime: toDatetimeLocalValue(a.startTime),
        endTime: toDatetimeLocalValue(a.endTime),
        callNumber: a.callNumber || "",
        callNotes: a.callNotes || "",
        employeeId: a.employeeId ? String(a.employeeId) : "",
      });
      setModal(true);
    } catch (err) {
      toastApiError(err, "Failed to load activity.");
    } finally {
      setSaving(false);
    }
  };

  const onFormChange = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const toLocalStamp = (value) => {
    if (!value) return null;
    return value.length === 16 ? `${value}:00` : value;
  };

  const toPayload = () => ({
    subject: form.subject.trim(),
    actType: form.actType || "CALL",
    startTime: toLocalStamp(form.startTime),
    endTime: toLocalStamp(form.endTime),
    callNumber: form.callNumber.trim() || null,
    callNotes: form.callNotes.trim() || null,
    employeeId: form.employeeId ? Number(form.employeeId) : null,
  });

  const saveActivity = async (ev) => {
    ev.preventDefault();
    setFormError("");
    if (!form.subject.trim()) {
      setFormError("Subject is required.");
      return;
    }
    if (!form.startTime) {
      setFormError("Start time is required.");
      return;
    }

    setSaving(true);
    try {
      const payload = toPayload();
      if (editMode) {
        await updateActivity(editId, payload);
        toastSuccess("Activity updated successfully.");
      } else {
        await createActivity(payload);
        toastSuccess("Activity created successfully.");
      }
      setModal(false);
      await loadList();
    } catch (err) {
      const msg = err?.message || "Save failed.";
      setFormError(msg);
      toastApiError(err, "Failed to save activity.");
    } finally {
      setSaving(false);
    }
  };

  const markComplete = async (activityId) => {
    try {
      await completeActivity(activityId);
      toastSuccess("Activity marked completed.");
      await loadList();
    } catch (err) {
      toastApiError(err, "Failed to complete activity.");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget?.activityId) return;
    setDeleting(true);
    try {
      await deactivateActivity(deleteTarget.activityId);
      toastSuccess("Activity deleted successfully.");
      setDeleteModal(false);
      setDeleteTarget(null);
      await loadList();
    } catch (err) {
      toastApiError(err, "Failed to delete activity.");
    } finally {
      setDeleting(false);
    }
  };

  const types = lookups.activityType || [];
  const statuses = (lookups.activityStatus || []).filter((s) =>
    ["SCHEDULED", "PENDING", "COMPLETED"].includes(String(s.masterCode || "").toUpperCase())
  );

  return (
    <div className="page-content">
      <Container fluid>
        <PageHeader
          title="Activities"
          pageTitle="CRM"
          description="Calls, meetings, visits — stored on shared employee activities (app 28)."
          actions={
            <div className="d-flex gap-2">
              <Button color="light" tag={Link} to="/crm/calendar">
                <i className="ri-calendar-2-line align-bottom me-1" />
                Calendar
              </Button>
              <Button color="primary" onClick={openCreate}>
                <i className="ri-add-line align-bottom me-1" />
                New Activity
              </Button>
            </div>
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
                <Input
                  type="select"
                  bsSize="sm"
                  style={{ width: 140 }}
                  value={actTypeFilter}
                  onChange={(e) => {
                    setActTypeFilter(e.target.value);
                    setPage(0);
                  }}
                >
                  <option value="">All types</option>
                  {types.map((t) => (
                    <option key={t.masterId || t.masterCode} value={t.masterCode}>
                      {t.masterName}
                    </option>
                  ))}
                </Input>
                <Input
                  type="select"
                  bsSize="sm"
                  style={{ width: 140 }}
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(0);
                  }}
                >
                  <option value="">All status</option>
                  {statuses.map((s) => (
                    <option key={s.masterId || s.masterCode} value={s.masterCode}>
                      {s.masterName}
                    </option>
                  ))}
                </Input>
              </div>
              <div className="apt-list-toolbar__search search-box">
                <Input
                  type="text"
                  className="form-control"
                  placeholder="Search subject, type, owner, phone…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
                <i className="ri-search-line search-icon" />
              </div>
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
                      <td colSpan={6} className="text-center py-5">
                        <Spinner color="primary" />
                      </td>
                    </tr>
                  ) : sortedItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-5 text-muted">
                        No activities found. Click <strong>New Activity</strong> to add one.
                      </td>
                    </tr>
                  ) : (
                    sortedItems.map((a) => (
                      <tr key={a.activityId}>
                        <td className="text-center">
                          <div className="d-flex align-items-center justify-content-center gap-1">
                            <Button
                              color="soft-primary"
                              size="sm"
                              tag={Link}
                              to={`/crm/activities/${a.activityId}`}
                              title="View"
                            >
                              <i className="ri-eye-line" />
                            </Button>
                            <Button
                              color="soft-primary"
                              size="sm"
                              onClick={() => openEdit(a.activityId)}
                              title="Edit"
                            >
                              <i className="ri-pencil-line" />
                            </Button>
                            {String(a.activityStatus || "").toUpperCase() !== "COMPLETED" ? (
                              <Button
                                color="soft-success"
                                size="sm"
                                onClick={() => markComplete(a.activityId)}
                                title="Mark completed"
                              >
                                <i className="ri-check-line" />
                              </Button>
                            ) : null}
                            <Button
                              color="soft-danger"
                              size="sm"
                              onClick={() => {
                                setDeleteTarget(a);
                                setDeleteModal(true);
                              }}
                              title="Delete"
                            >
                              <i className="ri-delete-bin-line" />
                            </Button>
                          </div>
                        </td>
                        <td>
                          <Link to={`/crm/activities/${a.activityId}`} className="fw-semibold">
                            {a.subject || "—"}
                          </Link>
                          {a.callNumber ? <div className="text-muted fs-12">{a.callNumber}</div> : null}
                        </td>
                        <td className="fs-13">{a.actTypeName || a.actType || "—"}</td>
                        <td className="fs-13">{formatWhen(a.startTime)}</td>
                        <td className="fs-13">{a.ownerName || "—"}</td>
                        <td>
                          <Badge className={statusBadge(a.activityStatus)}>
                            {a.activityStatusName || a.activityStatus || "—"}
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

        <Modal isOpen={modal} toggle={() => !saving && setModal(false)} size="lg" centered>
          <ModalHeader toggle={() => !saving && setModal(false)}>
            {editMode ? "Edit Activity" : "New Activity"}
          </ModalHeader>
          <Form onSubmit={saveActivity}>
            <ModalBody>
              {formError ? <Alert color="danger">{formError}</Alert> : null}
              <Row className="g-3">
                <Col md={8}>
                  <Label className="form-label">
                    Subject <span className="text-danger">*</span>
                  </Label>
                  <Input
                    value={form.subject}
                    onChange={(e) => onFormChange("subject", e.target.value)}
                    required
                    placeholder="e.g. Follow-up call with Acme Solar"
                  />
                </Col>
                <Col md={4}>
                  <Label className="form-label">Type</Label>
                  <Input
                    type="select"
                    value={form.actType}
                    onChange={(e) => onFormChange("actType", e.target.value)}
                  >
                    {types.length === 0 ? <option value="CALL">Call</option> : null}
                    {types.map((t) => (
                      <option key={t.masterId || t.masterCode} value={t.masterCode}>
                        {t.masterName}
                      </option>
                    ))}
                  </Input>
                </Col>
                <Col md={6}>
                  <Label className="form-label">
                    Start <span className="text-danger">*</span>
                  </Label>
                  <Input
                    type="datetime-local"
                    value={form.startTime}
                    onChange={(e) => onFormChange("startTime", e.target.value)}
                    required
                  />
                </Col>
                <Col md={6}>
                  <Label className="form-label">End</Label>
                  <Input
                    type="datetime-local"
                    value={form.endTime}
                    onChange={(e) => onFormChange("endTime", e.target.value)}
                  />
                </Col>
                <Col md={6}>
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
                  <Label className="form-label">Phone</Label>
                  <Input
                    value={form.callNumber}
                    onChange={(e) => onFormChange("callNumber", e.target.value)}
                    placeholder="Optional call number"
                  />
                </Col>
                <Col md={12}>
                  <Label className="form-label">Notes</Label>
                  <Input
                    type="textarea"
                    rows={3}
                    value={form.callNotes}
                    onChange={(e) => onFormChange("callNotes", e.target.value)}
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

export default Activities;
