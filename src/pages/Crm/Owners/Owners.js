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
import DeleteModal from "../../../Components/Common/DeleteModal";
import PageHeader from "../components/PageHeader";
import CrmListPagination from "../components/CrmListPagination";
import SortableHeader, { compareSortValues, matchesColumn } from "../components/SortableHeader";
import {
  createOwner,
  deactivateOwner,
  getOwnerById,
  getOwners,
  updateOwner,
} from "../../../helpers/crmOwnerApi";
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

const emptyForm = () => ({
  fullName: "",
  email: "",
  phone: "",
  ownerCode: "",
  status: "active",
});

const emptyColumnFilters = () => ({
  name: "",
  code: "",
  phone: "",
  email: "",
  status: "",
});

const SORT_COLUMNS = [
  { key: "name", label: "Owner", getValue: (e) => e.fullName || "" },
  { key: "code", label: "Code", getValue: (e) => e.ownerCode || "" },
  { key: "phone", label: "Mobile", getValue: (e) => e.phone || "" },
  { key: "email", label: "Email", getValue: (e) => e.email || "" },
  { key: "status", label: "Status", getValue: (e) => e.status || "" },
];

const statusBadge = (status) => {
  const v = (status || "").toLowerCase();
  if (v === "active") return "bg-success-subtle text-success";
  if (v === "inactive") return "bg-secondary-subtle text-body";
  return "bg-info-subtle text-info";
};

const Owners = () => {
  document.title = "Owners | SoftOnCloud CRM";

  const [items, setItems] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSizeChoice, setPageSizeChoice] = useState(100);
  const pageSize = resolvePageSize(pageSizeChoice);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [columnFilterInput, setColumnFilterInput] = useState(emptyColumnFilters);
  const [columnFilters, setColumnFilters] = useState(emptyColumnFilters);
  const [sortConfig, setSortConfig] = useState({ key: null, dir: "asc" });

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
      (e) =>
        matchesColumn(e.fullName, cf.name) &&
        matchesColumn(e.ownerCode, cf.code) &&
        matchesColumn(e.phone, cf.phone) &&
        matchesColumn(e.email, cf.email) &&
        matchesColumn(e.status, cf.status)
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
      const result = await getOwners({
        search: search || undefined,
        status: statusFilter || undefined,
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
        : raw || "Failed to load owners.";
      setListError(msg);
      toastApiError({ message: msg }, msg);
    } finally {
      setListLoading(false);
    }
  }, [search, statusFilter, page, pageSize]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const openCreate = () => {
    setEditMode(false);
    setEditId(null);
    setFormError("");
    setForm(emptyForm());
    setModal(true);
  };

  const openEdit = async (ownerId) => {
    setFormError("");
    setSaving(true);
    try {
      const e = await getOwnerById(ownerId);
      if (!e) {
        toastApiError(null, "Owner not found.");
        return;
      }
      setEditMode(true);
      setEditId(ownerId);
      setForm({
        fullName: e.fullName || "",
        email: e.email || "",
        phone: e.phone || "",
        ownerCode: e.ownerCode || "",
        status: e.status || "active",
      });
      setModal(true);
    } catch (err) {
      toastApiError(err, "Failed to load owner.");
    } finally {
      setSaving(false);
    }
  };

  const onFormChange = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const toPayload = () => ({
    fullName: form.fullName.trim(),
    email: form.email.trim() || null,
    phone: form.phone.trim(),
    ownerCode: form.ownerCode.trim() || null,
    ...(editMode ? { status: form.status || "active" } : {}),
  });

  const saveOwner = async (ev) => {
    ev.preventDefault();
    setFormError("");
    if (!form.fullName.trim()) {
      setFormError("Full name is required.");
      return;
    }
    if (!form.phone.trim()) {
      setFormError("Mobile is required.");
      return;
    }

    setSaving(true);
    try {
      const payload = toPayload();
      if (editMode) {
        await updateOwner(editId, payload);
        toastSuccess("Owner updated successfully.");
      } else {
        await createOwner(payload);
        toastSuccess("Owner created successfully.");
      }
      setModal(false);
      await loadList();
    } catch (err) {
      const msg = err?.message || "Save failed.";
      setFormError(msg);
      toastApiError(err, "Failed to save owner.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget?.ownerId) return;
    setDeleting(true);
    try {
      await deactivateOwner(deleteTarget.ownerId);
      toastSuccess("Owner deleted successfully.");
      setDeleteModal(false);
      setDeleteTarget(null);
      await loadList();
    } catch (err) {
      toastApiError(err, "Failed to delete owner.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="page-content">
      <Container fluid>
        <PageHeader
          title="Owners"
          pageTitle="CRM"
          description="Sales owners used on Leads and Opportunities Owner dropdown."
          actions={
            <Button color="primary" onClick={openCreate}>
              <i className="ri-add-line align-bottom me-1" />
              New Owner
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
                <Input
                  type="select"
                  bsSize="sm"
                  style={{ width: 120 }}
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(0);
                  }}
                >
                  <option value="">All status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </Input>
              </div>
              <div className="apt-list-toolbar__search search-box">
                <Input
                  type="text"
                  className="form-control"
                  placeholder="Search name, code, mobile, email…"
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
                    <th style={{ width: "110px" }} className="text-center">
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
                        No owners found. Click <strong>New Owner</strong> to add one.
                      </td>
                    </tr>
                  ) : (
                    sortedItems.map((e) => (
                      <tr key={e.ownerId}>
                        <td className="text-center">
                          <div className="d-flex align-items-center justify-content-center gap-1">
                            <Button
                              color="soft-primary"
                              size="sm"
                              onClick={() => openEdit(e.ownerId)}
                              title="Edit"
                            >
                              <i className="ri-pencil-line" />
                            </Button>
                            <Button
                              color="soft-danger"
                              size="sm"
                              onClick={() => {
                                setDeleteTarget(e);
                                setDeleteModal(true);
                              }}
                              title="Delete"
                            >
                              <i className="ri-delete-bin-line" />
                            </Button>
                          </div>
                        </td>
                        <td>
                          <span className="fw-semibold">{e.fullName}</span>
                          <div className="text-muted fs-12">#{e.ownerId}</div>
                        </td>
                        <td className="fs-13">{e.ownerCode || "—"}</td>
                        <td className="fs-13">{e.phone || "—"}</td>
                        <td className="fs-13">{e.email || "—"}</td>
                        <td>
                          <Badge className={statusBadge(e.status)}>{e.status || "—"}</Badge>
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
            {editMode ? "Edit Owner" : "New Owner"}
          </ModalHeader>
          <Form onSubmit={saveOwner}>
            <ModalBody>
              {formError ? <Alert color="danger">{formError}</Alert> : null}
              <Row className="g-3">
                <Col md={6}>
                  <Label className="form-label">
                    Full name <span className="text-danger">*</span>
                  </Label>
                  <Input
                    value={form.fullName}
                    onChange={(e) => onFormChange("fullName", e.target.value)}
                    required
                    placeholder="e.g. Priya Mehta"
                  />
                </Col>
                <Col md={6}>
                  <Label className="form-label">
                    Mobile <span className="text-danger">*</span>
                  </Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => onFormChange("phone", e.target.value)}
                    required
                    placeholder="9876543210"
                  />
                </Col>
                <Col md={6}>
                  <Label className="form-label">Email</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => onFormChange("email", e.target.value)}
                  />
                </Col>
                <Col md={6}>
                  <Label className="form-label">Owner code</Label>
                  <Input
                    value={form.ownerCode}
                    onChange={(e) => onFormChange("ownerCode", e.target.value)}
                    placeholder="Auto if empty (OWN-CRM-00x)"
                  />
                </Col>
                {editMode ? (
                  <Col md={6}>
                    <Label className="form-label">Status</Label>
                    <Input
                      type="select"
                      value={form.status}
                      onChange={(e) => onFormChange("status", e.target.value)}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </Input>
                  </Col>
                ) : null}
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

export default Owners;
