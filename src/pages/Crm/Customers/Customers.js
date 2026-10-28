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
  createCustomer,
  deactivateCustomer,
  getCustomerById,
  getCustomerLookups,
  getCustomers,
  updateCustomer,
} from "../../../helpers/crmCustomerApi";
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
  displayName: "",
  firstName: "",
  lastName: "",
  companyName: "",
  email: "",
  phoneMobile: "",
  phoneWork: "",
  websiteUrl: "",
  accountTypeId: "",
  status: "active",
  remarks: "",
});

const emptyColumnFilters = () => ({
  name: "",
  company: "",
  mobile: "",
  email: "",
  type: "",
  code: "",
  status: "",
});

const SORT_COLUMNS = [
  { key: "name", label: "Customer", getValue: (c) => c.displayName || "" },
  { key: "company", label: "Company", getValue: (c) => c.companyName || "" },
  { key: "mobile", label: "Mobile", getValue: (c) => c.phoneMobile || "" },
  { key: "email", label: "Email", getValue: (c) => c.email || "" },
  { key: "type", label: "Type", getValue: (c) => c.accountTypeName || "" },
  { key: "code", label: "Code", getValue: (c) => c.partyCode || "" },
  { key: "status", label: "Status", getValue: (c) => c.status || "" },
];

const statusBadge = (status) => {
  const v = (status || "").toLowerCase();
  if (v === "active") return "bg-success-subtle text-success";
  if (v === "inactive") return "bg-secondary-subtle text-body";
  return "bg-info-subtle text-info";
};

const Customers = () => {
  document.title = "Customers | SoftOnCloud CRM";

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

  const [lookups, setLookups] = useState({ accountTypes: [] });
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
      (c) =>
        matchesColumn(c.displayName, cf.name) &&
        matchesColumn(c.companyName, cf.company) &&
        matchesColumn(c.phoneMobile, cf.mobile) &&
        matchesColumn(c.email, cf.email) &&
        matchesColumn(c.accountTypeName, cf.type) &&
        matchesColumn(c.partyCode, cf.code) &&
        matchesColumn(c.status, cf.status)
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

  const loadLookups = useCallback(async () => {
    try {
      const data = await getCustomerLookups();
      const accountTypes = data?.accountTypes || data?.account_types || [];
      setLookups({ accountTypes });
      return { accountTypes };
    } catch (err) {
      toastApiError(err, "Failed to load customer types.");
      return { accountTypes: [] };
    }
  }, []);

  const loadList = useCallback(async () => {
    setListLoading(true);
    setListError("");
    try {
      const result = await getCustomers({
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
        : raw || "Failed to load customers.";
      setListError(msg);
      toastApiError({ message: msg }, msg);
    } finally {
      setListLoading(false);
    }
  }, [search, statusFilter, page, pageSize]);

  useEffect(() => {
    loadLookups();
  }, [loadLookups]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const openCreate = async () => {
    setEditMode(false);
    setEditId(null);
    setFormError("");
    await loadLookups();
    setForm(emptyForm());
    setModal(true);
  };

  const openEdit = async (accountId) => {
    setFormError("");
    setSaving(true);
    try {
      const c = await getCustomerById(accountId);
      if (!c) {
        toastApiError(null, "Customer not found.");
        return;
      }
      setEditMode(true);
      setEditId(accountId);
      setForm({
        displayName: c.displayName || "",
        firstName: c.firstName || "",
        lastName: c.lastName || "",
        companyName: c.companyName || "",
        email: c.email || "",
        phoneMobile: c.phoneMobile || "",
        phoneWork: c.phoneWork || "",
        websiteUrl: c.websiteUrl || "",
        accountTypeId: c.accountTypeId != null ? String(c.accountTypeId) : "",
        status: c.status || "active",
        remarks: c.remarks || "",
      });
      setModal(true);
    } catch (err) {
      toastApiError(err, "Failed to load customer.");
    } finally {
      setSaving(false);
    }
  };

  const onFormChange = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const toPayload = () => ({
    displayName: form.displayName.trim() || null,
    firstName: form.firstName.trim() || null,
    lastName: form.lastName.trim() || null,
    companyName: form.companyName.trim() || null,
    email: form.email.trim() || null,
    phoneMobile: form.phoneMobile.trim(),
    phoneWork: form.phoneWork.trim() || null,
    websiteUrl: form.websiteUrl.trim() || null,
    accountTypeId: form.accountTypeId ? Number(form.accountTypeId) : null,
    remarks: form.remarks.trim() || null,
    ...(editMode ? { status: form.status || "active" } : {}),
  });

  const saveCustomer = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!form.phoneMobile.trim()) {
      setFormError("Mobile is required.");
      return;
    }
    if (!form.displayName.trim() && !form.companyName.trim() && !form.firstName.trim()) {
      setFormError("Enter display name, company, or first name.");
      return;
    }

    setSaving(true);
    try {
      const payload = toPayload();
      if (editMode) {
        await updateCustomer(editId, payload);
        toastSuccess("Customer updated successfully.");
      } else {
        await createCustomer(payload);
        toastSuccess("Customer created successfully.");
      }
      setModal(false);
      await loadList();
    } catch (err) {
      const msg = err?.message || "Save failed.";
      setFormError(msg);
      toastApiError(err, "Failed to save customer.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget?.accountId) return;
    setDeleting(true);
    try {
      await deactivateCustomer(deleteTarget.accountId);
      toastSuccess("Customer deleted successfully.");
      setDeleteModal(false);
      setDeleteTarget(null);
      await loadList();
    } catch (err) {
      toastApiError(err, "Failed to delete customer.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="page-content">
      <Container fluid>
        <PageHeader
          title="Customers"
          pageTitle="CRM"
          description="Customers from SoftOnCloud common master — used by Contacts and Opportunities."
          actions={
            <Button color="primary" onClick={openCreate}>
              <i className="ri-add-line align-bottom me-1" />
              New Customer
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
                  placeholder="Search name, company, mobile, email…"
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
                      <td colSpan={8} className="text-center py-5">
                        <Spinner color="primary" />
                      </td>
                    </tr>
                  ) : sortedItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-5 text-muted">
                        No customers found. Click <strong>New Customer</strong> first — then use them
                        on Opportunities.
                      </td>
                    </tr>
                  ) : (
                    sortedItems.map((c) => (
                      <tr key={c.accountId}>
                        <td className="text-center">
                          <div className="d-flex align-items-center justify-content-center gap-1">
                            <Link
                              to={`/crm/customers/${c.accountId}`}
                              className="btn btn-sm btn-soft-primary"
                              title="View"
                            >
                              <i className="ri-eye-line" />
                            </Link>
                            <Button
                              color="soft-primary"
                              size="sm"
                              onClick={() => openEdit(c.accountId)}
                              title="Edit"
                            >
                              <i className="ri-pencil-line" />
                            </Button>
                            <Button
                              color="soft-danger"
                              size="sm"
                              onClick={() => {
                                setDeleteTarget(c);
                                setDeleteModal(true);
                              }}
                              title="Delete"
                            >
                              <i className="ri-delete-bin-line" />
                            </Button>
                          </div>
                        </td>
                        <td>
                          <Link
                            to={`/crm/customers/${c.accountId}`}
                            className="fw-semibold text-primary"
                          >
                            {c.displayName}
                          </Link>
                          <div className="text-muted fs-12">#{c.accountId}</div>
                        </td>
                        <td>{c.companyName || "—"}</td>
                        <td className="fs-13">{c.phoneMobile || "—"}</td>
                        <td className="fs-13">{c.email || "—"}</td>
                        <td>{c.accountTypeName || "—"}</td>
                        <td className="fs-13">{c.partyCode || "—"}</td>
                        <td>
                          <Badge className={statusBadge(c.status)}>{c.status || "—"}</Badge>
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
            {editMode ? "Edit Customer" : "New Customer"}
          </ModalHeader>
          <Form onSubmit={saveCustomer}>
            <ModalBody>
              {formError ? <Alert color="danger">{formError}</Alert> : null}
              <Row className="g-3">
                <Col md={6}>
                  <Label className="form-label">Display name</Label>
                  <Input
                    value={form.displayName}
                    onChange={(e) => onFormChange("displayName", e.target.value)}
                    placeholder="Shown on lists / Opportunity dropdown"
                  />
                </Col>
                <Col md={6}>
                  <Label className="form-label">Company</Label>
                  <Input
                    value={form.companyName}
                    onChange={(e) => onFormChange("companyName", e.target.value)}
                  />
                </Col>
                <Col md={6}>
                  <Label className="form-label">First name</Label>
                  <Input
                    value={form.firstName}
                    onChange={(e) => onFormChange("firstName", e.target.value)}
                  />
                </Col>
                <Col md={6}>
                  <Label className="form-label">Last name</Label>
                  <Input
                    value={form.lastName}
                    onChange={(e) => onFormChange("lastName", e.target.value)}
                  />
                </Col>
                <Col md={6}>
                  <Label className="form-label">
                    Mobile <span className="text-danger">*</span>
                  </Label>
                  <Input
                    value={form.phoneMobile}
                    onChange={(e) => onFormChange("phoneMobile", e.target.value)}
                    required
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
                  <Label className="form-label">Work phone</Label>
                  <Input
                    value={form.phoneWork}
                    onChange={(e) => onFormChange("phoneWork", e.target.value)}
                  />
                </Col>
                <Col md={6}>
                  <Label className="form-label">Website</Label>
                  <Input
                    value={form.websiteUrl}
                    onChange={(e) => onFormChange("websiteUrl", e.target.value)}
                  />
                </Col>
                <Col md={6}>
                  <Label className="form-label">Account type</Label>
                  <Input
                    type="select"
                    value={form.accountTypeId}
                    onChange={(e) => onFormChange("accountTypeId", e.target.value)}
                  >
                    <option value="">Default</option>
                    {(lookups.accountTypes || []).map((t) => (
                      <option key={t.accountTypeId} value={t.accountTypeId}>
                        {t.partyTypeName}
                      </option>
                    ))}
                  </Input>
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
                <Col xs={12}>
                  <Label className="form-label">Remarks</Label>
                  <Input
                    type="textarea"
                    rows={2}
                    value={form.remarks}
                    onChange={(e) => onFormChange("remarks", e.target.value)}
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

export default Customers;
