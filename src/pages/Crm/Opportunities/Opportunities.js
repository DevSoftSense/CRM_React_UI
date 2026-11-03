import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  Container,
  Input,
  Spinner,
} from "reactstrap";
import { Link } from "react-router-dom";
import DeleteModal from "../../../Components/Common/DeleteModal";
import PageHeader from "../components/PageHeader";
import CrmListPagination from "../components/CrmListPagination";
import SortableHeader, { compareSortValues, matchesColumn } from "../components/SortableHeader";
import OpportunityAdvancedFilters from "./OpportunityAdvancedFilters";
import OpportunityCreateEdit from "./OpportunityCreateEdit";
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

const getStageBadgeStyle = (name) => {
  const s = String(name || "").toLowerCase();
  if (s.includes("won")) {
    return {
      backgroundColor: "#f0fdf4",
      color: "#15803d",
      border: "1px solid #bbf7d0",
    };
  }
  if (s.includes("lost")) {
    return {
      backgroundColor: "#fef2f2",
      color: "#b91c1c",
      border: "1px solid #fecaca",
    };
  }
  if (s.includes("proposal")) {
    return {
      backgroundColor: "#fffbeb",
      color: "#b45309",
      border: "1px solid #fde68a",
    };
  }
  if (s.includes("negot")) {
    return {
      backgroundColor: "#faf5ff",
      color: "#7e22ce",
      border: "1px solid #e9d5ff",
    };
  }
  if (s.includes("qualif")) {
    return {
      backgroundColor: "#fef2f2",
      color: "#7f1d1d", // SoftOnCloud Primary Maroon
      border: "1px solid #fecaca",
    };
  }
  // Default / Prospecting
  return {
    backgroundColor: "#f8fafc",
    color: "#475569",
    border: "1px solid #cbd5e1",
  };
};

const formatAmount = (opp) => {
  if (opp?.amount == null) return "—";
  return `${opp.currencyCode || "INR"} ${Number(opp.amount).toLocaleString()}`;
};

const Opportunities = () => {
  document.title = "Opportunities | SoftOnCloud CRM";

  // View mode: 'list' | 'create' | 'edit' (In-page view without opening a new tab)
  const [viewMode, setViewMode] = useState("list");
  const [selectedOpp, setSelectedOpp] = useState(null);

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
    pipeline: [],
    currency: [],
  });
  const [accountOptions, setAccountOptions] = useState([]);
  const [contactOptions, setContactOptions] = useState([]);
  const [ownerOptions, setOwnerOptions] = useState([]);

  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [editId, setEditId] = useState(null);
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
      const pipeline = data?.pipeline || [];
      const currency = data?.currency || [];
      const next = { opportunityStage, opportunityType, forecastCategory, priority, leadSource, pipeline, currency };
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
        pipeline: [],
        currency: [],
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
    if (viewMode === "list") {
      loadList();
    }
  }, [loadList, viewMode]);

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
    setEditId(null);
    setSelectedOpp(null);
    setContactOptions([]);
    await Promise.all([
      loadLookups(),
      loadAccountOptions(),
      loadOwnerOptions(),
    ]);
    setViewMode("create");
  };

  const openEdit = async (opportunityId) => {
    setSaving(true);
    try {
      await Promise.all([loadAccountOptions(), loadOwnerOptions(), loadLookups()]);
      const opp = await getOpportunityById(opportunityId);
      if (!opp) {
        toastApiError(null, "Opportunity not found.");
        return;
      }
      setEditId(opportunityId);
      setSelectedOpp(opp);
      if (opp.accountId) {
        await loadContactOptions(opp.accountId);
      }
      setViewMode("edit");
    } catch (err) {
      toastApiError(err, "Failed to load opportunity details.");
    } finally {
      setSaving(false);
    }
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

  const handleSaveOpportunity = async (payload, saveAndNew = false) => {
    setSaving(true);
    try {
      if (viewMode === "edit" && editId) {
        await updateOpportunity(editId, payload);
        toastSuccess("Opportunity updated successfully.");
        setViewMode("list");
        setEditId(null);
        setSelectedOpp(null);
        await loadList();
      } else {
        await createOpportunity(payload);
        toastSuccess("Opportunity created successfully.");
        if (saveAndNew) {
          setSelectedOpp(null);
          // keep viewMode create
        } else {
          setViewMode("list");
          await loadList();
        }
      }
    } catch (err) {
      const msg = friendlySaveError(err);
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

  // If in Create or Edit View Mode, render the In-Page 360° Form Component matching Image 2
  if (viewMode === "create" || viewMode === "edit") {
    return (
      <div className="page-content">
        <Container fluid>
          <OpportunityCreateEdit
            isEdit={viewMode === "edit"}
            opportunityId={editId}
            initialData={selectedOpp}
            lookups={lookups}
            accountOptions={accountOptions}
            ownerOptions={ownerOptions}
            contactOptions={contactOptions}
            onLoadContacts={loadContactOptions}
            onSave={handleSaveOpportunity}
            onCancel={() => {
              setViewMode("list");
              setEditId(null);
              setSelectedOpp(null);
            }}
            saving={saving}
          />
        </Container>
      </div>
    );
  }

  // Otherwise, render the Opportunities Table List View
  return (
    <div className="page-content">
      <Container fluid>
        <PageHeader
          title="Opportunities"
          pageTitle="CRM"
          actions={
            <Button
              className="rounded-0 text-white fw-medium shadow-none"
              style={{ backgroundColor: "#7f1d1d", borderColor: "#7f1d1d" }}
              onClick={openCreate}
            >
              <i className="ri-add-line align-bottom me-1" />
              New Opportunity
            </Button>
          }
        />

        {listError ? <Alert color="danger" className="mb-3 rounded-0">{listError}</Alert> : null}

        <Card className="apt-list-card mb-0 rounded-0 border" style={{ borderColor: "#e2e8f0" }}>
          <CardBody className="p-0">
            <div className="apt-list-toolbar">
              <div className="apt-list-toolbar__left">
                <h5 className="apt-list-toolbar__count mb-0">Results ({displayCount})</h5>
                <div className="apt-list-pagesize apt-list-pagesize--inline">
                  <span className="text-muted fs-13">Show</span>
                  <Input
                    type="select"
                    bsSize="sm"
                    className="apt-list-pagesize__select rounded-0"
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
                  className="form-control rounded-0"
                  placeholder="Search name, customer, next step…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  aria-label="Search opportunities"
                />
                <i className="ri-search-line search-icon" />
              </div>
              <Button
                className={`apt-list-toolbar__filter-btn rounded-0 ${hasAdvancedFilters ? "is-active" : ""}`}
                style={{
                  backgroundColor: hasAdvancedFilters ? "#7f1d1d" : "#ffffff",
                  color: hasAdvancedFilters ? "#ffffff" : "#475569",
                  borderColor: "#cbd5e1",
                }}
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
                        <Spinner style={{ color: "#7f1d1d" }} />
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
                            style={{ color: "#7f1d1d" }}
                            onClick={displayAll}
                          >
                            Display All
                          </button>{" "}
                          or click <strong style={{ color: "#7f1d1d" }}>New Opportunity</strong>.
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
                              className="btn btn-sm btn-light border rounded-0"
                              title="View 360° Profile"
                            >
                              <i className="ri-eye-line" />
                            </Link>
                            <Button
                              color="light"
                              size="sm"
                              className="border rounded-0"
                              onClick={() => openEdit(opp.opportunityId)}
                              disabled={deleting}
                              title="Edit Opportunity"
                            >
                              <i className="ri-pencil-line" />
                            </Button>
                            <Button
                              color="light"
                              size="sm"
                              className="border rounded-0 text-danger"
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
                            className="fw-semibold text-decoration-none"
                            style={{ color: "#7f1d1d" }}
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
                          {(() => {
                            const badge = getStageBadgeStyle(opp.stageName);
                            return (
                              <span
                                className="badge rounded-0 fs-11 fw-semibold px-2.5 py-1"
                                style={{
                                  backgroundColor: badge.backgroundColor,
                                  color: badge.color,
                                  border: badge.border,
                                  borderRadius: 0,
                                  textTransform: "capitalize",
                                  display: "inline-block",
                                }}
                              >
                                {opp.stageName || "—"}
                              </span>
                            );
                          })()}
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
