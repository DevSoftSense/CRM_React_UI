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
import LeadAdvancedFilters from "./LeadAdvancedFilters";
import {
  createLead,
  deactivateLead,
  getLeadById,
  getLeadLookups,
  getLeads,
  updateLead,
} from "../../../helpers/crmLeadApi";
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

const emptyForm = () => ({
  leadName: "",
  companyName: "",
  designation: "",
  industry: "",
  email: "",
  mobile: "",
  phone: "",
  website: "",
  sourceId: "",
  statusId: "",
  ratingId: "",
  estimatedValue: "",
  currencyCode: "INR",
  expectedCloseDate: "",
  description: "",
  ownerEmployeeId: "",
});

const emptyFilters = () => ({
  statusId: "",
  sourceId: "",
  ratingId: "",
});

const emptyColumnFilters = () => ({
  lead: "",
  company: "",
  mobile: "",
  source: "",
  status: "",
  rating: "",
  value: "",
});

const SORT_COLUMNS = [
  { key: "lead", label: "Lead", getValue: (l) => l.leadName || "" },
  { key: "company", label: "Company", getValue: (l) => l.companyName || "" },
  { key: "mobile", label: "Mobile", getValue: (l) => l.mobile || "" },
  { key: "source", label: "Source", getValue: (l) => l.sourceName || "" },
  { key: "status", label: "Status", getValue: (l) => l.statusName || "" },
  { key: "rating", label: "Rating", getValue: (l) => l.ratingName || "" },
  {
    key: "value",
    label: "Value",
    getValue: (l) => (l.estimatedValue != null ? Number(l.estimatedValue) : null),
    isNumeric: true,
  },
];

const statusBadge = (name) => {
  const v = (name || "").toLowerCase();
  if (v.includes("new")) return "bg-info-subtle text-info";
  if (v.includes("qualified") || v.includes("converted")) return "bg-success-subtle text-success";
  if (v.includes("lost")) return "bg-danger-subtle text-danger";
  if (v.includes("proposal") || v.includes("negotiation")) return "bg-warning-subtle text-warning";
  return "bg-secondary-subtle text-body";
};

const formatValue = (lead) => {
  if (lead?.estimatedValue == null) return "—";
  return `${lead.currencyCode || "INR"} ${lead.estimatedValue}`;
};

const Leads = () => {
  document.title = "Leads | SoftOnCloud CRM";

  const [leads, setLeads] = useState([]);
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
  const [sortConfig, setSortConfig] = useState({ key: null, dir: "asc" });

  const [lookups, setLookups] = useState({
    leadSource: [],
    leadStatus: [],
    leadRating: [],
  });
  const [ownerOptions, setOwnerOptions] = useState([]);

  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [modal, setModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editLeadId, setEditLeadId] = useState(null);
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

  const filteredLeads = useMemo(() => {
    const cf = columnFilters;
    const hasCol = Object.values(cf).some((v) => String(v || "").trim());
    if (!hasCol) return leads;
    return leads.filter(
      (l) =>
        matchesColumn(l.leadName, cf.lead) &&
        matchesColumn(l.companyName, cf.company) &&
        matchesColumn(l.mobile, cf.mobile) &&
        matchesColumn(l.sourceName, cf.source) &&
        matchesColumn(l.statusName, cf.status) &&
        matchesColumn(l.ratingName, cf.rating) &&
        matchesColumn(formatValue(l), cf.value)
    );
  }, [leads, columnFilters]);

  const sortedLeads = useMemo(() => {
    if (!sortConfig.key) return filteredLeads;
    const column = SORT_COLUMNS.find((col) => col.key === sortConfig.key);
    if (!column) return filteredLeads;
    return [...filteredLeads].sort((a, b) =>
      compareSortValues(column.getValue(a), column.getValue(b), sortConfig.dir)
    );
  }, [filteredLeads, sortConfig]);

  const hasColumnFilters = useMemo(
    () => Object.values(columnFilters).some((v) => String(v || "").trim()),
    [columnFilters]
  );

  const displayCount = hasColumnFilters ? sortedLeads.length : totalCount;

  const hasAdvancedFilters = useMemo(
    () => !!(filters.statusId || filters.sourceId || filters.ratingId),
    [filters]
  );

  const loadLookups = useCallback(async () => {
    try {
      const data = await getLeadLookups();
      const leadSource = data?.leadSource || data?.lead_source || [];
      const leadStatus = data?.leadStatus || data?.lead_status || [];
      const leadRating = data?.leadRating || data?.lead_rating || [];
      setLookups({ leadSource, leadStatus, leadRating });
      return { leadSource, leadStatus, leadRating };
    } catch (err) {
      toastApiError(err, "Failed to load lead lookups (source / status / rating).");
      return { leadSource: [], leadStatus: [], leadRating: [] };
    }
  }, []);

  const loadOwnerOptions = useCallback(async () => {
    try {
      const rows = await getOwnerDropdown({ limit: 200 });
      const list = Array.isArray(rows) ? rows : rows?.items || rows?.Items || [];
      setOwnerOptions(list);
      return list;
    } catch (err) {
      setOwnerOptions([]);
      toastApiError(err, "Failed to load owners.");
      return [];
    }
  }, []);

  const loadLeads = useCallback(async () => {
    setListLoading(true);
    setListError("");
    try {
      const result = await getLeads({
        search: search || undefined,
        statusId: filters.statusId || undefined,
        sourceId: filters.sourceId || undefined,
        ratingId: filters.ratingId || undefined,
        limit: pageSize,
        offset: page * pageSize,
      });
      const items = result?.items || result?.Items || [];
      setLeads(items);
      setTotalCount(Number(result?.totalCount ?? result?.TotalCount ?? items[0]?.totalCount ?? 0));
    } catch (err) {
      setLeads([]);
      setTotalCount(0);
      const raw = String(err?.message || "");
      const isNetwork =
        /network error|cannot reach crm api/i.test(raw) || err?.code === "ERR_NETWORK";
      const msg = isNetwork
        ? "Cannot reach CRM API (http://localhost:5191). Start CRM.API (F5), then refresh."
        : raw || "Failed to load leads.";
      setListError(msg);
      toastApiError({ message: msg }, msg);
    } finally {
      setListLoading(false);
    }
  }, [search, filters, page, pageSize]);

  useEffect(() => {
    loadLookups();
    loadOwnerOptions();
  }, [loadLookups, loadOwnerOptions]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

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
    setSortConfig({ key: null, dir: "asc" });
    setPage(0);
    setFilterOpen(false);
  };

  const openCreate = async () => {
    setEditMode(false);
    setEditLeadId(null);
    setFormError("");
    const [lu] = await Promise.all([loadLookups(), loadOwnerOptions()]);
    const newStatus = (lu.leadStatus || []).find(
      (s) => String(s.masterCode || s.master_code || "").toUpperCase() === "NEW"
    );
    setForm({
      ...emptyForm(),
      statusId: newStatus?.masterId != null ? String(newStatus.masterId) : "",
    });
    setModal(true);
  };

  const openEdit = async (leadId) => {
    setFormError("");
    setSaving(true);
    try {
      await loadOwnerOptions();
      const lead = await getLeadById(leadId);
      if (!lead) {
        toastApiError(null, "Lead not found.");
        return;
      }
      setEditMode(true);
      setEditLeadId(leadId);
      setForm({
        leadName: lead.leadName || "",
        companyName: lead.companyName || "",
        designation: lead.designation || "",
        industry: lead.industry || "",
        email: lead.email || "",
        mobile: lead.mobile || "",
        phone: lead.phone || "",
        website: lead.website || "",
        sourceId: lead.sourceId != null ? String(lead.sourceId) : "",
        statusId: lead.statusId != null ? String(lead.statusId) : "",
        ratingId: lead.ratingId != null ? String(lead.ratingId) : "",
        estimatedValue: lead.estimatedValue != null ? String(lead.estimatedValue) : "",
        currencyCode: lead.currencyCode || "INR",
        expectedCloseDate: lead.expectedCloseDate
          ? String(lead.expectedCloseDate).slice(0, 10)
          : "",
        description: lead.description || "",
        ownerEmployeeId: lead.ownerEmployeeId != null ? String(lead.ownerEmployeeId) : "",
      });
      setModal(true);
    } catch (err) {
      toastApiError(err, "Failed to load lead.");
    } finally {
      setSaving(false);
    }
  };

  const onFormChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toPayload = () => ({
    leadName: form.leadName.trim(),
    companyName: form.companyName.trim() || null,
    designation: form.designation.trim() || null,
    industry: form.industry.trim() || null,
    email: form.email.trim() || null,
    mobile: form.mobile.trim(),
    phone: form.phone.trim() || null,
    website: form.website.trim() || null,
    sourceId: form.sourceId ? Number(form.sourceId) : null,
    statusId: form.statusId ? Number(form.statusId) : null,
    ratingId: form.ratingId ? Number(form.ratingId) : null,
    estimatedValue: form.estimatedValue !== "" ? Number(form.estimatedValue) : null,
    currencyCode: form.currencyCode || "INR",
    expectedCloseDate: form.expectedCloseDate || null,
    description: form.description.trim() || null,
    ownerEmployeeId: form.ownerEmployeeId ? Number(form.ownerEmployeeId) : null,
  });

  const saveLead = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!form.leadName.trim()) {
      setFormError("Lead name is required.");
      return;
    }
    if (!form.mobile.trim()) {
      setFormError("Mobile is required.");
      return;
    }
    if (editMode && !form.statusId) {
      setFormError("Status is required.");
      return;
    }

    setSaving(true);
    try {
      const payload = toPayload();
      if (editMode) {
        await updateLead(editLeadId, { ...payload, statusId: Number(form.statusId) });
        toastSuccess("Lead updated successfully.");
      } else {
        await createLead(payload);
        toastSuccess("Lead created successfully.");
      }
      setModal(false);
      await loadLeads();
    } catch (err) {
      const msg = err?.message || "Save failed.";
      setFormError(msg);
      toastApiError(err, "Failed to save lead.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget?.leadId) return;
    setDeleting(true);
    try {
      await deactivateLead(deleteTarget.leadId);
      toastSuccess("Lead deleted successfully.");
      setDeleteModal(false);
      setDeleteTarget(null);
      await loadLeads();
    } catch (err) {
      toastApiError(err, "Failed to delete lead.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="page-content">
      <Container fluid>
        <PageHeader
          title="Leads"
          pageTitle="CRM"
          actions={
            <Button color="primary" onClick={openCreate}>
              <i className="ri-add-line align-bottom me-1" />
              New Lead
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
                    aria-label="Rows per page"
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
                  placeholder="Search name, company, mobile, email…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  aria-label="Search leads"
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
                    <th style={{ width: "110px", minWidth: "110px" }} className="text-center">
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
                  ) : sortedLeads.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-5 text-muted">
                        <div>No leads found.</div>
                        <div className="fs-12 mt-2">
                          Try{" "}
                          <button
                            type="button"
                            className="btn btn-link btn-sm p-0 align-baseline"
                            onClick={displayAll}
                          >
                            Display All
                          </button>{" "}
                          or adjust filters. Or click <strong>New Lead</strong>.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    sortedLeads.map((lead) => (
                      <tr key={lead.leadId}>
                        <td className="text-center">
                          <div className="d-flex align-items-center justify-content-center gap-1 flex-nowrap">
                            <Link
                              to={`/crm/leads/${lead.leadId}`}
                              className="btn btn-sm btn-soft-primary"
                              title="View"
                            >
                              <i className="ri-eye-line" />
                            </Link>
                            <Button
                              color="soft-primary"
                              size="sm"
                              onClick={() => openEdit(lead.leadId)}
                              disabled={deleting}
                              title="Edit"
                            >
                              <i className="ri-pencil-line" />
                            </Button>
                            <Button
                              color="soft-danger"
                              size="sm"
                              onClick={() => {
                                setDeleteTarget(lead);
                                setDeleteModal(true);
                              }}
                              disabled={deleting}
                              title="Delete"
                            >
                              <i className="ri-delete-bin-line" />
                            </Button>
                          </div>
                        </td>
                        <td>
                          <Link
                            to={`/crm/leads/${lead.leadId}`}
                            className="fw-semibold text-primary"
                          >
                            {lead.leadName}
                          </Link>
                          {lead.email ? (
                            <div className="text-muted fs-12">{lead.email}</div>
                          ) : null}
                        </td>
                        <td>{lead.companyName || "—"}</td>
                        <td className="fs-13">{lead.mobile || "—"}</td>
                        <td>{lead.sourceName || "—"}</td>
                        <td>
                          <Badge className={statusBadge(lead.statusName)}>
                            {lead.statusName || "—"}
                          </Badge>
                        </td>
                        <td>{lead.ratingName || "—"}</td>
                        <td className="fs-13">{formatValue(lead)}</td>
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

        <LeadAdvancedFilters
          isOpen={filterOpen}
          onClose={() => setFilterOpen(false)}
          draft={draftFilters}
          onDraftChange={setDraftFilters}
          onApply={applyFilters}
          onDisplayAll={displayAll}
          onClearDraft={clearDraft}
          leadStatuses={lookups.leadStatus}
          leadSources={lookups.leadSource}
          leadRatings={lookups.leadRating}
        />

        <div className="pb-4" aria-hidden="true" />

        <Modal isOpen={modal} toggle={() => !saving && setModal(false)} size="lg" centered>
          <ModalHeader toggle={() => !saving && setModal(false)}>
            {editMode ? "Edit Lead" : "New Lead"}
          </ModalHeader>
          <Form onSubmit={saveLead}>
            <ModalBody>
              {formError ? <Alert color="danger">{formError}</Alert> : null}
              <Row className="g-3">
                <Col md={6}>
                  <Label className="form-label">
                    Lead name <span className="text-danger">*</span>
                  </Label>
                  <Input
                    value={form.leadName}
                    onChange={(e) => onFormChange("leadName", e.target.value)}
                    required
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
                  <Label className="form-label">Email</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => onFormChange("email", e.target.value)}
                  />
                </Col>
                <Col md={4}>
                  <Label className="form-label">Source</Label>
                  <Input
                    type="select"
                    value={form.sourceId}
                    onChange={(e) => onFormChange("sourceId", e.target.value)}
                  >
                    <option value="">Select</option>
                    {(lookups.leadSource || []).map((s) => (
                      <option key={s.masterId} value={s.masterId}>
                        {s.masterName}
                      </option>
                    ))}
                  </Input>
                </Col>
                <Col md={4}>
                  <Label className="form-label">
                    Status {editMode ? <span className="text-danger">*</span> : null}
                  </Label>
                  <Input
                    type="select"
                    value={form.statusId}
                    onChange={(e) => onFormChange("statusId", e.target.value)}
                  >
                    <option value="">{editMode ? "Select" : "Default (New)"}</option>
                    {(lookups.leadStatus || []).map((s) => (
                      <option key={s.masterId} value={s.masterId}>
                        {s.masterName}
                      </option>
                    ))}
                  </Input>
                </Col>
                <Col md={4}>
                  <Label className="form-label">Rating</Label>
                  <Input
                    type="select"
                    value={form.ratingId}
                    onChange={(e) => onFormChange("ratingId", e.target.value)}
                  >
                    <option value="">Select</option>
                    {(lookups.leadRating || []).map((s) => (
                      <option key={s.masterId} value={s.masterId}>
                        {s.masterName}
                      </option>
                    ))}
                  </Input>
                </Col>
                <Col md={4}>
                  <Label className="form-label">Owner</Label>
                  <Input
                    type="select"
                    value={form.ownerEmployeeId}
                    onChange={(e) => onFormChange("ownerEmployeeId", e.target.value)}
                  >
                    <option value="">Select owner…</option>
                    {ownerOptions.map((e) => (
                      <option key={e.ownerId} value={e.ownerId}>
                        {e.fullName}
                        {e.ownerCode ? ` (${e.ownerCode})` : ""}
                      </option>
                    ))}
                  </Input>
                </Col>
                <Col md={4}>
                  <Label className="form-label">Estimated value</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.estimatedValue}
                    onChange={(e) => onFormChange("estimatedValue", e.target.value)}
                  />
                </Col>
                <Col md={4}>
                  <Label className="form-label">Currency</Label>
                  <Input
                    value={form.currencyCode}
                    onChange={(e) => onFormChange("currencyCode", e.target.value)}
                  />
                </Col>
                <Col md={4}>
                  <Label className="form-label">Expected close</Label>
                  <Input
                    type="date"
                    value={form.expectedCloseDate}
                    onChange={(e) => onFormChange("expectedCloseDate", e.target.value)}
                  />
                </Col>
                <Col md={6}>
                  <Label className="form-label">Designation</Label>
                  <Input
                    value={form.designation}
                    onChange={(e) => onFormChange("designation", e.target.value)}
                  />
                </Col>
                <Col md={6}>
                  <Label className="form-label">Industry</Label>
                  <Input
                    value={form.industry}
                    onChange={(e) => onFormChange("industry", e.target.value)}
                  />
                </Col>
                <Col xs={12}>
                  <Label className="form-label">Description</Label>
                  <Input
                    type="textarea"
                    rows={3}
                    value={form.description}
                    onChange={(e) => onFormChange("description", e.target.value)}
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

export default Leads;
