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
  createContact,
  deactivateContact,
  getContactById,
  getContacts,
  updateContact,
} from "../../../helpers/crmContactApi";
import { getCustomerDropdown } from "../../../helpers/crmCustomerApi";
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
  accountId: "",
  salutation: "",
  firstName: "",
  lastName: "",
  email: "",
  mobile: "",
  workPhone: "",
  isPrimary: false,
});

const emptyColumnFilters = () => ({
  name: "",
  account: "",
  mobile: "",
  email: "",
  primary: "",
});

const SORT_COLUMNS = [
  { key: "name", label: "Contact", getValue: (c) => c.displayName || "" },
  { key: "account", label: "Customer", getValue: (c) => c.accountName || String(c.accountId || "") },
  { key: "mobile", label: "Mobile", getValue: (c) => c.mobile || "" },
  { key: "email", label: "Email", getValue: (c) => c.email || "" },
  { key: "primary", label: "Primary", getValue: (c) => (c.isPrimary ? "Yes" : "No") },
];

const Contacts = () => {
  document.title = "Contacts | SoftOnCloud CRM";

  const [items, setItems] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSizeChoice, setPageSizeChoice] = useState(100);
  const pageSize = resolvePageSize(pageSizeChoice);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [accountFilter, setAccountFilter] = useState("");

  const [columnFilterInput, setColumnFilterInput] = useState(emptyColumnFilters);
  const [columnFilters, setColumnFilters] = useState(emptyColumnFilters);
  const [sortConfig, setSortConfig] = useState({ key: null, dir: "asc" });

  const [accountOptions, setAccountOptions] = useState([]);
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
        matchesColumn(c.accountName || String(c.accountId || ""), cf.account) &&
        matchesColumn(c.mobile, cf.mobile) &&
        matchesColumn(c.email, cf.email) &&
        matchesColumn(c.isPrimary ? "Yes" : "No", cf.primary)
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

  const loadAccountOptions = useCallback(async () => {
    try {
      const rows = await getCustomerDropdown({ limit: 300 });
      const list = Array.isArray(rows) ? rows : rows?.items || rows?.Items || [];
      setAccountOptions(list);
      return list;
    } catch (err) {
      setAccountOptions([]);
      toastApiError(err, "Failed to load customers for Customer dropdown.");
      return [];
    }
  }, []);

  const loadList = useCallback(async () => {
    setListLoading(true);
    setListError("");
    try {
      const result = await getContacts({
        search: search || undefined,
        accountId: accountFilter || undefined,
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
        : raw || "Failed to load contacts.";
      setListError(msg);
      toastApiError({ message: msg }, msg);
    } finally {
      setListLoading(false);
    }
  }, [search, accountFilter, page, pageSize]);

  useEffect(() => {
    loadAccountOptions();
  }, [loadAccountOptions]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const openCreate = async () => {
    setEditMode(false);
    setEditId(null);
    setFormError("");
    await loadAccountOptions();
    setForm(emptyForm());
    setModal(true);
  };

  const openEdit = async (contactPersonId) => {
    setFormError("");
    setSaving(true);
    try {
      await loadAccountOptions();
      const c = await getContactById(contactPersonId);
      if (!c) {
        toastApiError(null, "Contact not found.");
        return;
      }
      setEditMode(true);
      setEditId(contactPersonId);
      setForm({
        accountId: c.accountId != null ? String(c.accountId) : "",
        salutation: c.salutation || "",
        firstName: c.firstName || "",
        lastName: c.lastName || "",
        email: c.email || "",
        mobile: c.mobile || "",
        workPhone: c.workPhone || "",
        isPrimary: !!c.isPrimary,
      });
      setModal(true);
    } catch (err) {
      toastApiError(err, "Failed to load contact.");
    } finally {
      setSaving(false);
    }
  };

  const onFormChange = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const toPayload = () => ({
    accountId: Number(form.accountId),
    salutation: form.salutation.trim() || null,
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim() || null,
    email: form.email.trim() || null,
    mobile: form.mobile.trim(),
    workPhone: form.workPhone.trim() || null,
    isPrimary: !!form.isPrimary,
  });

  const saveContact = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!form.accountId || Number(form.accountId) <= 0) {
      setFormError("Select a Customer (create under CRM → Customers first).");
      return;
    }
    if (!form.firstName.trim()) {
      setFormError("First name is required.");
      return;
    }
    if (!form.mobile.trim()) {
      setFormError("Mobile is required.");
      return;
    }

    setSaving(true);
    try {
      const payload = toPayload();
      if (editMode) {
        await updateContact(editId, payload);
        toastSuccess("Contact updated successfully.");
      } else {
        await createContact(payload);
        toastSuccess("Contact created successfully.");
      }
      setModal(false);
      await loadList();
    } catch (err) {
      const msg = err?.message || "Save failed.";
      setFormError(msg);
      toastApiError(err, "Failed to save contact.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget?.contactPersonId) return;
    setDeleting(true);
    try {
      await deactivateContact(deleteTarget.contactPersonId);
      toastSuccess("Contact deleted successfully.");
      setDeleteModal(false);
      setDeleteTarget(null);
      await loadList();
    } catch (err) {
      toastApiError(err, "Failed to delete contact.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="page-content">
      <Container fluid>
        <PageHeader
          title="Contacts"
          pageTitle="CRM"
          description="Contact persons linked to a Customer — used as Opportunity Primary Contact."
          actions={
            <Button color="primary" onClick={openCreate}>
              <i className="ri-add-line align-bottom me-1" />
              New Contact
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
                  style={{ width: 200 }}
                  value={accountFilter}
                  onChange={(e) => {
                    setAccountFilter(e.target.value);
                    setPage(0);
                  }}
                >
                  <option value="">All customers</option>
                  {accountOptions.map((a) => (
                    <option key={a.accountId} value={a.accountId}>
                      {a.displayName || a.companyName || `Customer #${a.accountId}`}
                    </option>
                  ))}
                </Input>
              </div>
              <div className="apt-list-toolbar__search search-box">
                <Input
                  type="text"
                  className="form-control"
                  placeholder="Search name, mobile, email, customer…"
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
                        No contacts found. Create a{" "}
                        <Link to="/crm/customers" className="fw-medium">
                          Customer
                        </Link>{" "}
                        first, then <strong>New Contact</strong>.
                      </td>
                    </tr>
                  ) : (
                    sortedItems.map((c) => (
                      <tr key={c.contactPersonId}>
                        <td className="text-center">
                          <div className="d-flex align-items-center justify-content-center gap-1">
                            <Link
                              to={`/crm/contacts/${c.contactPersonId}`}
                              className="btn btn-sm btn-soft-primary"
                              title="View"
                            >
                              <i className="ri-eye-line" />
                            </Link>
                            <Button
                              color="soft-primary"
                              size="sm"
                              onClick={() => openEdit(c.contactPersonId)}
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
                            to={`/crm/contacts/${c.contactPersonId}`}
                            className="fw-semibold text-primary"
                          >
                            {c.displayName || [c.firstName, c.lastName].filter(Boolean).join(" ") || "—"}
                          </Link>
                          <div className="text-muted fs-12">#{c.contactPersonId}</div>
                        </td>
                        <td>
                          {c.accountName || c.accountId || "—"}
                          {c.accountName && c.accountId ? (
                            <div className="text-muted fs-12">#{c.accountId}</div>
                          ) : null}
                        </td>
                        <td className="fs-13">{c.mobile || "—"}</td>
                        <td className="fs-13">{c.email || "—"}</td>
                        <td>
                          {c.isPrimary ? (
                            <Badge className="bg-success-subtle text-success">Primary</Badge>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
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
            {editMode ? "Edit Contact" : "New Contact"}
          </ModalHeader>
          <Form onSubmit={saveContact}>
            <ModalBody>
              {formError ? <Alert color="danger">{formError}</Alert> : null}
              <Row className="g-3">
                <Col md={6}>
                  <Label className="form-label">
                    Customer <span className="text-danger">*</span>
                  </Label>
                  <Input
                    type="select"
                    value={form.accountId}
                    onChange={(e) => onFormChange("accountId", e.target.value)}
                    required
                  >
                    <option value="">Select customer…</option>
                    {accountOptions.map((a) => (
                      <option key={a.accountId} value={a.accountId}>
                        {a.displayName || a.companyName || `Customer #${a.accountId}`}
                      </option>
                    ))}
                  </Input>
                  {!accountOptions.length ? (
                    <div className="form-text text-danger">
                      No customers.{" "}
                      <Link to="/crm/customers" className="fw-medium">
                        Create a Customer
                      </Link>{" "}
                      first.
                    </div>
                  ) : null}
                </Col>
                <Col md={3}>
                  <Label className="form-label">Salutation</Label>
                  <Input
                    value={form.salutation}
                    onChange={(e) => onFormChange("salutation", e.target.value)}
                    placeholder="Mr / Ms"
                  />
                </Col>
                <Col md={3} className="d-flex align-items-end">
                  <div className="form-check mb-2">
                    <Input
                      type="checkbox"
                      className="form-check-input"
                      id="contactIsPrimary"
                      checked={!!form.isPrimary}
                      onChange={(e) => onFormChange("isPrimary", e.target.checked)}
                    />
                    <Label className="form-check-label" htmlFor="contactIsPrimary">
                      Primary contact
                    </Label>
                  </div>
                </Col>
                <Col md={6}>
                  <Label className="form-label">
                    First name <span className="text-danger">*</span>
                  </Label>
                  <Input
                    value={form.firstName}
                    onChange={(e) => onFormChange("firstName", e.target.value)}
                    required
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
                    value={form.mobile}
                    onChange={(e) => onFormChange("mobile", e.target.value)}
                    required
                  />
                </Col>
                <Col md={6}>
                  <Label className="form-label">Work phone</Label>
                  <Input
                    value={form.workPhone}
                    onChange={(e) => onFormChange("workPhone", e.target.value)}
                  />
                </Col>
                <Col md={12}>
                  <Label className="form-label">Email</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => onFormChange("email", e.target.value)}
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

export default Contacts;
