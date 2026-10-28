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
import OpportunityAdvancedFilters from "./OpportunityAdvancedFilters";
import {
  createOpportunity,
  deactivateOpportunity,
  getOpportunityById,
  getOpportunityLookups,
  getOpportunities,
  updateOpportunity,
} from "../../../helpers/crmOpportunityApi";
import { getCustomerDropdown } from "../../../helpers/crmCustomerApi";
import { getContactDropdown } from "../../../helpers/crmContactApi";
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
  name: "",
  accountId: "",
  primaryContactId: "",
  leadId: "",
  campaignId: "",
  stageId: "",
  opportunityTypeId: "",
  sourceId: "",
  amount: "",
  currencyCode: "INR",
  probability: "10",
  expectedCloseDate: "",
  actualCloseDate: "",
  forecastCategoryId: "",
  priorityId: "",
  nextStep: "",
  closedReason: "",
  ownerEmployeeId: "",
});

const emptyFilters = () => ({
  stageId: "",
  opportunityTypeId: "",
  priorityId: "",
});

const emptyColumnFilters = () => ({
  name: "",
  account: "",
  stage: "",
  type: "",
  amount: "",
  probability: "",
  close: "",
});

const SORT_COLUMNS = [
  { key: "name", label: "Opportunity", getValue: (o) => o.name || "" },
  { key: "account", label: "Customer", getValue: (o) => o.accountName || String(o.accountId || "") },
  { key: "stage", label: "Stage", getValue: (o) => o.stageName || "" },
  { key: "type", label: "Type", getValue: (o) => o.opportunityTypeName || "" },
  {
    key: "amount",
    label: "Amount",
    getValue: (o) => (o.amount != null ? Number(o.amount) : null),
    isNumeric: true,
  },
  {
    key: "probability",
    label: "Prob %",
    getValue: (o) => (o.probability != null ? Number(o.probability) : null),
    isNumeric: true,
  },
  {
    key: "close",
    label: "Expected close",
    getValue: (o) => (o.expectedCloseDate ? String(o.expectedCloseDate).slice(0, 10) : ""),
  },
];

const stageBadge = (name) => {
  const v = (name || "").toLowerCase();
  if (v.includes("won")) return "bg-success-subtle text-success";
  if (v.includes("lost")) return "bg-danger-subtle text-danger";
  if (v.includes("proposal") || v.includes("negotiation")) return "bg-warning-subtle text-warning";
  if (v.includes("qualified") || v.includes("prospect")) return "bg-info-subtle text-info";
  return "bg-secondary-subtle text-body";
};

const formatAmount = (opp) => {
  if (opp?.amount == null) return "—";
  return `${opp.currencyCode || "INR"} ${opp.amount}`;
};

const Opportunities = () => {
  document.title = "Opportunities | SoftOnCloud CRM";

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
  const [sortConfig, setSortConfig] = useState({ key: null, dir: "asc" });

  const [lookups, setLookups] = useState({
    opportunityStage: [],
    opportunityType: [],
    forecastCategory: [],
    priority: [],
    leadSource: [],
  });
  const [accountOptions, setAccountOptions] = useState([]);
  const [contactOptions, setContactOptions] = useState([]);
  const [ownerOptions, setOwnerOptions] = useState([]);

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
      (o) =>
        matchesColumn(o.name, cf.name) &&
        matchesColumn(o.accountName || String(o.accountId || ""), cf.account) &&
        matchesColumn(o.stageName, cf.stage) &&
        matchesColumn(o.opportunityTypeName, cf.type) &&
        matchesColumn(formatAmount(o), cf.amount) &&
        matchesColumn(o.probability != null ? String(o.probability) : "", cf.probability) &&
        matchesColumn(
          o.expectedCloseDate ? String(o.expectedCloseDate).slice(0, 10) : "",
          cf.close
        )
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
    () => !!(filters.stageId || filters.opportunityTypeId || filters.priorityId),
    [filters]
  );

  const loadAccountOptions = useCallback(async () => {
    try {
      const rows = await getCustomerDropdown({ limit: 300 });
      const list = Array.isArray(rows) ? rows : rows?.items || rows?.Items || [];
      setAccountOptions(list);
      return list;
    } catch (err) {
      setAccountOptions([]);
      toastApiError(err, "Failed to load customers for Customer dropdown. Create Customers first.");
      return [];
    }
  }, []);

  const loadContactOptions = useCallback(async (accountId) => {
    if (!accountId || Number(accountId) <= 0) {
      setContactOptions([]);
      return [];
    }
    try {
      const rows = await getContactDropdown({ accountId: Number(accountId), limit: 300 });
      const list = Array.isArray(rows) ? rows : rows?.items || rows?.Items || [];
      setContactOptions(list);
      return list;
    } catch (err) {
      setContactOptions([]);
      toastApiError(err, "Failed to load contacts for this Customer.");
      return [];
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

  const loadLookups = useCallback(async () => {
    try {
      const data = await getOpportunityLookups();
      const opportunityStage = data?.opportunityStage || data?.opportunity_stage || [];
      const opportunityType = data?.opportunityType || data?.opportunity_type || [];
      const forecastCategory = data?.forecastCategory || data?.forecast_category || [];
      const priority = data?.priority || [];
      const leadSource = data?.leadSource || data?.lead_source || [];
      const next = { opportunityStage, opportunityType, forecastCategory, priority, leadSource };
      setLookups(next);
      return next;
    } catch (err) {
      toastApiError(err, "Failed to load opportunity lookups.");
      return {
        opportunityStage: [],
        opportunityType: [],
        forecastCategory: [],
        priority: [],
        leadSource: [],
      };
    }
  }, []);

  const loadList = useCallback(async () => {
    setListLoading(true);
    setListError("");
    try {
      const result = await getOpportunities({
        search: search || undefined,
        stageId: filters.stageId || undefined,
        opportunityTypeId: filters.opportunityTypeId || undefined,
        priorityId: filters.priorityId || undefined,
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
        : raw || "Failed to load opportunities.";
      setListError(msg);
      toastApiError({ message: msg }, msg);
    } finally {
      setListLoading(false);
    }
  }, [search, filters, page, pageSize]);

  useEffect(() => {
    loadLookups();
  }, [loadLookups]);

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

  const clearDraft = () => setDraftFilters(emptyFilters());

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
    setEditId(null);
    setFormError("");
    setContactOptions([]);
    const [lu, accounts] = await Promise.all([
      loadLookups(),
      loadAccountOptions(),
      loadOwnerOptions(),
    ]);
    const prospecting = (lu.opportunityStage || []).find(
      (s) => String(s.masterCode || s.master_code || "").toUpperCase() === "PROSPECTING"
    );
    setForm({
      ...emptyForm(),
      stageId: prospecting?.masterId != null ? String(prospecting.masterId) : "",
    });
    if (!accounts.length) {
      setFormError("No customers yet. Go to CRM → Customers, create one, then come back.");
    }
    setModal(true);
  };

  const openEdit = async (opportunityId) => {
    setFormError("");
    setSaving(true);
    try {
      await Promise.all([loadAccountOptions(), loadOwnerOptions()]);
      const opp = await getOpportunityById(opportunityId);
      if (!opp) {
        toastApiError(null, "Opportunity not found.");
        return;
      }
      setEditMode(true);
      setEditId(opportunityId);
      const accountId = opp.accountId != null ? String(opp.accountId) : "";
      setForm({
        name: opp.name || "",
        accountId,
        primaryContactId: opp.primaryContactId != null ? String(opp.primaryContactId) : "",
        leadId: opp.leadId != null ? String(opp.leadId) : "",
        campaignId: opp.campaignId != null ? String(opp.campaignId) : "",
        stageId: opp.stageId != null ? String(opp.stageId) : "",
        opportunityTypeId: opp.opportunityTypeId != null ? String(opp.opportunityTypeId) : "",
        sourceId: opp.sourceId != null ? String(opp.sourceId) : "",
        amount: opp.amount != null ? String(opp.amount) : "",
        currencyCode: opp.currencyCode || "INR",
        probability: opp.probability != null ? String(opp.probability) : "10",
        expectedCloseDate: opp.expectedCloseDate
          ? String(opp.expectedCloseDate).slice(0, 10)
          : "",
        actualCloseDate: opp.actualCloseDate ? String(opp.actualCloseDate).slice(0, 10) : "",
        forecastCategoryId: opp.forecastCategoryId != null ? String(opp.forecastCategoryId) : "",
        priorityId: opp.priorityId != null ? String(opp.priorityId) : "",
        nextStep: opp.nextStep || "",
        closedReason: opp.closedReason || "",
        ownerEmployeeId: opp.ownerEmployeeId != null ? String(opp.ownerEmployeeId) : "",
      });
      await loadContactOptions(accountId);
      setModal(true);
    } catch (err) {
      toastApiError(err, "Failed to load opportunity.");
    } finally {
      setSaving(false);
    }
  };

  const onFormChange = (key, value) => {
    if (key === "accountId") {
      setForm((prev) => ({ ...prev, accountId: value, primaryContactId: "" }));
      loadContactOptions(value);
      return;
    }
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const optionalPositiveInt = (raw) => {
    if (raw === "" || raw == null) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  const toPayload = () => {
    const currencyRaw = (form.currencyCode || "").trim().toUpperCase();
    const currencyCode = currencyRaw.length === 3 ? currencyRaw : "INR";
    return {
      name: form.name.trim(),
      accountId: Number(form.accountId),
      primaryContactId: optionalPositiveInt(form.primaryContactId),
      leadId: optionalPositiveInt(form.leadId),
      campaignId: optionalPositiveInt(form.campaignId),
      stageId: optionalPositiveInt(form.stageId),
      opportunityTypeId: optionalPositiveInt(form.opportunityTypeId),
      sourceId: optionalPositiveInt(form.sourceId),
      amount: form.amount !== "" ? Number(form.amount) : 0,
      currencyCode,
      probability: form.probability !== "" ? Number(form.probability) : 10,
      expectedCloseDate: form.expectedCloseDate || null,
      actualCloseDate: form.actualCloseDate || null,
      forecastCategoryId: optionalPositiveInt(form.forecastCategoryId),
      priorityId: optionalPositiveInt(form.priorityId),
      nextStep: form.nextStep.trim() || null,
      closedReason: form.closedReason.trim() || null,
      ownerEmployeeId: optionalPositiveInt(form.ownerEmployeeId),
    };
  };

  const friendlySaveError = (err) => {
    const raw = String(err?.message || err?.response?.data?.message || "");
    if (/tab_opportunity_lead_id_fkey|Lead ID .* was not found/i.test(raw)) {
      return "Lead ID is invalid for this organisation. Leave Lead ID empty, or pick a real Lead from CRM → Leads.";
    }
    if (/tab_opportunity_campaign_id_fkey|Campaign ID .* was not found/i.test(raw)) {
      return "Campaign ID is invalid. Leave it empty until Campaigns is ready.";
    }
    if (/foreign key constraint/i.test(raw)) {
      return "A related ID is invalid (Lead / Campaign / Account). Clear optional IDs or use real CRM records.";
    }
    return raw || "Save failed.";
  };

  const saveOpportunity = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!form.name.trim()) {
      setFormError("Opportunity name is required.");
      return;
    }
    if (!form.accountId || Number(form.accountId) <= 0) {
      setFormError("Select a Customer from the dropdown (create under CRM → Customers first).");
      return;
    }
    if (editMode && !form.stageId) {
      setFormError("Stage is required.");
      return;
    }
    const currencyRaw = (form.currencyCode || "").trim();
    if (currencyRaw && currencyRaw.length !== 3) {
      setFormError("Currency must be a 3-letter code (e.g. INR, USD). Leave blank to use INR.");
      return;
    }
    const prob = form.probability !== "" ? Number(form.probability) : 10;
    if (!Number.isFinite(prob) || prob < 0 || prob > 100) {
      setFormError("Probability must be between 0 and 100.");
      return;
    }

    setSaving(true);
    try {
      const payload = toPayload();
      if (editMode) {
        await updateOpportunity(editId, { ...payload, stageId: Number(form.stageId) });
        toastSuccess("Opportunity updated successfully.");
      } else {
        await createOpportunity(payload);
        toastSuccess("Opportunity created successfully.");
      }
      setModal(false);
      await loadList();
    } catch (err) {
      const msg = friendlySaveError(err);
      setFormError(msg);
      toastApiError({ message: msg }, msg);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget?.opportunityId) return;
    setDeleting(true);
    try {
      await deactivateOpportunity(deleteTarget.opportunityId);
      toastSuccess("Opportunity deleted successfully.");
      setDeleteModal(false);
      setDeleteTarget(null);
      await loadList();
    } catch (err) {
      toastApiError(err, "Failed to delete opportunity.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="page-content">
      <Container fluid>
        <PageHeader
          title="Opportunities"
          pageTitle="CRM"
          actions={
            <Button color="primary" onClick={openCreate}>
              <i className="ri-add-line align-bottom me-1" />
              New Opportunity
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
                  placeholder="Search name, customer, next step…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  aria-label="Search opportunities"
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
                  ) : sortedItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-5 text-muted">
                        <div>No opportunities found.</div>
                        <div className="fs-12 mt-2">
                          Try{" "}
                          <button
                            type="button"
                            className="btn btn-link btn-sm p-0 align-baseline"
                            onClick={displayAll}
                          >
                            Display All
                          </button>{" "}
                          or click <strong>New Opportunity</strong>.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    sortedItems.map((opp) => (
                      <tr key={opp.opportunityId}>
                        <td className="text-center">
                          <div className="d-flex align-items-center justify-content-center gap-1 flex-nowrap">
                            <Link
                              to={`/crm/opportunities/${opp.opportunityId}`}
                              className="btn btn-sm btn-soft-primary"
                              title="View"
                            >
                              <i className="ri-eye-line" />
                            </Link>
                            <Button
                              color="soft-primary"
                              size="sm"
                              onClick={() => openEdit(opp.opportunityId)}
                              disabled={deleting}
                              title="Edit"
                            >
                              <i className="ri-pencil-line" />
                            </Button>
                            <Button
                              color="soft-danger"
                              size="sm"
                              onClick={() => {
                                setDeleteTarget(opp);
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
                            to={`/crm/opportunities/${opp.opportunityId}`}
                            className="fw-semibold text-primary"
                          >
                            {opp.name}
                          </Link>
                        </td>
                        <td>
                          {opp.accountName || opp.accountId || "—"}
                          {opp.accountName && opp.accountId ? (
                            <div className="text-muted fs-12">#{opp.accountId}</div>
                          ) : null}
                        </td>
                        <td>
                          <Badge className={stageBadge(opp.stageName)}>
                            {opp.stageName || "—"}
                          </Badge>
                        </td>
                        <td>{opp.opportunityTypeName || "—"}</td>
                        <td className="fs-13">{formatAmount(opp)}</td>
                        <td className="fs-13">
                          {opp.probability != null ? `${opp.probability}%` : "—"}
                        </td>
                        <td className="fs-13">
                          {opp.expectedCloseDate
                            ? String(opp.expectedCloseDate).slice(0, 10)
                            : "—"}
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

        <OpportunityAdvancedFilters
          isOpen={filterOpen}
          onClose={() => setFilterOpen(false)}
          draft={draftFilters}
          onDraftChange={setDraftFilters}
          onApply={applyFilters}
          onDisplayAll={displayAll}
          onClearDraft={clearDraft}
          stages={lookups.opportunityStage}
          types={lookups.opportunityType}
          priorities={lookups.priority}
        />

        <div className="pb-4" aria-hidden="true" />

        <Modal isOpen={modal} toggle={() => !saving && setModal(false)} size="lg" centered>
          <ModalHeader toggle={() => !saving && setModal(false)}>
            {editMode ? "Edit Opportunity" : "New Opportunity"}
          </ModalHeader>
          <Form onSubmit={saveOpportunity}>
            <ModalBody>
              {formError ? <Alert color="danger">{formError}</Alert> : null}
              <Row className="g-3">
                <Col md={8}>
                  <Label className="form-label">
                    Name <span className="text-danger">*</span>
                  </Label>
                  <Input
                    value={form.name}
                    onChange={(e) => onFormChange("name", e.target.value)}
                    required
                  />
                </Col>
                <Col md={4}>
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
                        {a.partyCode ? ` (${a.partyCode})` : ""}
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
                  ) : (
                    <div className="form-text">From CRM → Customers.</div>
                  )}
                </Col>
                <Col md={4}>
                  <Label className="form-label">
                    Stage {editMode ? <span className="text-danger">*</span> : null}
                  </Label>
                  <Input
                    type="select"
                    value={form.stageId}
                    onChange={(e) => onFormChange("stageId", e.target.value)}
                  >
                    <option value="">{editMode ? "Select" : "Default (Prospecting)"}</option>
                    {(lookups.opportunityStage || []).map((s) => (
                      <option key={s.masterId} value={s.masterId}>
                        {s.masterName}
                      </option>
                    ))}
                  </Input>
                </Col>
                <Col md={4}>
                  <Label className="form-label">Type</Label>
                  <Input
                    type="select"
                    value={form.opportunityTypeId}
                    onChange={(e) => onFormChange("opportunityTypeId", e.target.value)}
                  >
                    <option value="">Select</option>
                    {(lookups.opportunityType || []).map((s) => (
                      <option key={s.masterId} value={s.masterId}>
                        {s.masterName}
                      </option>
                    ))}
                  </Input>
                </Col>
                <Col md={4}>
                  <Label className="form-label">Priority</Label>
                  <Input
                    type="select"
                    value={form.priorityId}
                    onChange={(e) => onFormChange("priorityId", e.target.value)}
                  >
                    <option value="">Select</option>
                    {(lookups.priority || []).map((s) => (
                      <option key={s.masterId} value={s.masterId}>
                        {s.masterName}
                      </option>
                    ))}
                  </Input>
                </Col>
                <Col md={4}>
                  <Label className="form-label">Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => onFormChange("amount", e.target.value)}
                  />
                </Col>
                <Col md={4}>
                  <Label className="form-label">Currency</Label>
                  <Input
                    value={form.currencyCode}
                    maxLength={3}
                    placeholder="INR"
                    onChange={(e) => onFormChange("currencyCode", e.target.value.toUpperCase())}
                  />
                  <div className="form-text">3 letters only (INR, USD…)</div>
                </Col>
                <Col md={4}>
                  <Label className="form-label">Probability %</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={form.probability}
                    onChange={(e) => onFormChange("probability", e.target.value)}
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
                  <Label className="form-label">Forecast</Label>
                  <Input
                    type="select"
                    value={form.forecastCategoryId}
                    onChange={(e) => onFormChange("forecastCategoryId", e.target.value)}
                  >
                    <option value="">Select</option>
                    {(lookups.forecastCategory || []).map((s) => (
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
                  <div className="form-text">Sales owner — pick Amit / Neha / Vikram.</div>
                </Col>
                <Col md={4}>
                  <Label className="form-label">Next step</Label>
                  <Input
                    value={form.nextStep}
                    onChange={(e) => onFormChange("nextStep", e.target.value)}
                  />
                </Col>
                <Col md={2}>
                  <Label className="form-label">Lead ID (optional)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={form.leadId}
                    onChange={(e) => onFormChange("leadId", e.target.value)}
                    placeholder="Leave empty"
                  />
                  <div className="form-text">Only a real Lead from CRM → Leads. Do not invent IDs.</div>
                </Col>
                <Col md={3}>
                  <Label className="form-label">Primary Contact</Label>
                  <Input
                    type="select"
                    value={form.primaryContactId}
                    onChange={(e) => onFormChange("primaryContactId", e.target.value)}
                    disabled={!form.accountId}
                  >
                    <option value="">None</option>
                    {contactOptions.map((c) => (
                      <option key={c.contactPersonId} value={c.contactPersonId}>
                        {c.displayName ||
                          [c.firstName, c.lastName].filter(Boolean).join(" ") ||
                          `Contact #${c.contactPersonId}`}
                        {c.isPrimary ? " (primary)" : ""}
                      </option>
                    ))}
                  </Input>
                  {form.accountId && !contactOptions.length ? (
                    <div className="form-text">
                      No contacts for this customer.{" "}
                      <Link to="/crm/contacts" className="fw-medium">
                        Create a Contact
                      </Link>
                      .
                    </div>
                  ) : (
                    <div className="form-text">From CRM → Contacts (for selected Customer).</div>
                  )}
                </Col>
                <Col xs={12}>
                  <Label className="form-label">Closed reason</Label>
                  <Input
                    type="textarea"
                    rows={2}
                    value={form.closedReason}
                    onChange={(e) => onFormChange("closedReason", e.target.value)}
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

export default Opportunities;
