import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  Col,
  Container,
  Dropdown,
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
  Row,
  Spinner,
} from "reactstrap";
import { Link, useNavigate } from "react-router-dom";
import DeleteModal from "../../../Components/Common/DeleteModal";
import { compareSortValues, matchesColumn } from "../components/SortableHeader";
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
import { createCustomer } from "../../../helpers/crmCustomerApi";
import { createContact } from "../../../helpers/crmContactApi";
import { createActivity } from "../../../helpers/crmActivityApi";
import { toastApiError, toastSuccess } from "../../../helpers/crmToast";

const PAGE_SIZE_OPTIONS = [
  { value: 10, label: "10 per page" },
  { value: 25, label: "25 per page" },
  { value: 50, label: "50 per page" },
  { value: 100, label: "100 per page" },
  { value: "all", label: "Show All" },
];

const ALL_PAGE_SIZE = 5000;

const resolvePageSize = (value) => {
  if (value === "all" || value === ALL_PAGE_SIZE) return ALL_PAGE_SIZE;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 10;
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

const TERRITORY_OPTIONS = [
  "Gujarat",
  "Maharashtra",
  "Delhi NCR",
  "Karnataka",
  "Tamil Nadu",
  "North India",
  "South India",
  "West India",
  "East India",
  "International (Export)",
];

const DEFAULT_VISIBLE_COLUMNS = {
  lead: true,
  company: true,
  mobile: true,
  email: true,
  source: true,
  status: true,
  owner: true,
  rating: true,
  createdOn: true,
  followUp: true,
};

const emptyFilters = () => ({
  statusId: "",
  sourceId: "",
  ratingId: "",
  ownerEmployeeId: "",
  territory: "",
});

const emptyColumnFilters = () => ({
  lead: "",
  company: "",
  mobile: "",
  email: "",
  source: "",
  status: "",
  owner: "",
  rating: "",
  createdOn: "",
  followUp: "",
});

const SORT_COLUMNS = [
  { key: "lead", label: "Lead Name", width: "220px", getValue: (l) => l.leadName || l.companyName || "" },
  { key: "company", label: "Company", width: "150px", getValue: (l) => l.companyName || "" },
  { key: "mobile", label: "Mobile", width: "130px", getValue: (l) => l.mobile || "" },
  { key: "email", label: "Email", width: "180px", getValue: (l) => l.email || "" },
  { key: "source", label: "Lead Source", width: "115px", getValue: (l) => l.sourceName || "" },
  { key: "status", label: "Status", width: "110px", getValue: (l) => l.statusName || "" },
  { key: "owner", label: "Owner", width: "140px", getValue: (l) => l.ownerName || "" },
  { key: "rating", label: "Rating", width: "95px", getValue: (l) => l.ratingName || "" },
  { key: "createdOn", label: "Created On", width: "110px", getValue: (l) => l.createdAt || "" },
  { key: "followUp", label: "Next Follow-up", width: "130px", getValue: (l) => l.expectedCloseDate || "" },
];

const statusBadge = (name) => {
  const v = (name || "").toLowerCase();
  if (v.includes("new")) return "bg-primary-subtle text-primary border border-primary-subtle";
  if (v.includes("contacted")) return "bg-info-subtle text-info border border-info-subtle";
  if (v.includes("qualified") || v.includes("converted"))
    return "bg-success-subtle text-success border border-success-subtle";
  if (v.includes("proposal") || v.includes("negotiation"))
    return "bg-warning-subtle text-warning border border-warning-subtle";
  if (v.includes("lost")) return "bg-danger-subtle text-danger border border-danger-subtle";
  return "bg-secondary-subtle text-secondary border border-secondary-subtle";
};

const sourceBadge = (name) => {
  const v = (name || "").toLowerCase();
  if (v.includes("website")) return "bg-primary-subtle text-primary border border-primary-subtle";
  if (v.includes("whatsapp")) return "bg-success-subtle text-success border border-success-subtle";
  if (v.includes("referral")) return "bg-warning-subtle text-warning border border-warning-subtle";
  if (v.includes("linkedin")) return "bg-info-subtle text-info border border-info-subtle";
  if (v.includes("walk")) return "bg-warning-subtle text-warning border border-warning-subtle";
  if (v.includes("mail")) return "bg-primary-subtle text-primary border border-primary-subtle";
  return "bg-light text-dark border border-secondary-subtle";
};

const renderRating = (ratingName) => {
  if (!ratingName) return <span className="text-muted">—</span>;
  const r = String(ratingName).toUpperCase();
  let stars = 3;
  if (r.includes("HOT")) stars = 5;
  else if (r.includes("WARM")) stars = 4;
  else if (r.includes("COLD")) stars = 2;

  return (
    <div className="d-flex align-items-center gap-1 flex-nowrap">
      <span className="text-warning fs-12 text-nowrap">
        {[1, 2, 3, 4, 5].map((s) => (
          <i
            key={s}
            className={s <= stars ? "ri-star-fill text-warning me-1" : "ri-star-line text-muted opacity-40 me-1"}
          />
        ))}
      </span>
    </div>
  );
};

const formatDate = (val) => {
  if (!val) return "—";
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
};

const resolveFollowUp = (lead) => {
  if (lead?.description && lead.description.includes("Next Follow-up Reminder:")) {
    const line = lead.description.split("\n").find((l) => l.trim().startsWith("Next Follow-up Reminder:"));
    if (line) {
      const val = line.replace("Next Follow-up Reminder:", "").trim();
      return val.split("(")[0].trim();
    }
  }
  if (lead?.expectedCloseDate) {
    return formatDate(lead.expectedCloseDate);
  }
  return null;
};

const formatFollowUpDisplay = (val) => {
  if (!val) return <span className="text-muted fs-12">—</span>;
  const s = String(val).toLowerCase();
  if (s.includes("today") || s.includes("tomorrow")) {
    return <span className="fw-semibold text-success fs-12 text-nowrap">{val}</span>;
  }
  return <span className="fw-semibold fs-12 text-nowrap" style={{ color: "#d97706" }}>{val}</span>;
};

// Pastel colors for avatar initials
const AVATAR_BG_COLORS = ["#e0e7ff", "#fee2e2", "#ecfdf5", "#fef3c7", "#f3e8ff", "#e0f2fe", "#fce7f3"];
const getAvatarBg = (text) => {
  if (!text) return AVATAR_BG_COLORS[0];
  const charCode = text.charCodeAt(0) || 0;
  return AVATAR_BG_COLORS[charCode % AVATAR_BG_COLORS.length];
};

const Leads = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [lookups, setLookups] = useState({
    leadSource: [],
    leadStatus: [],
    leadRating: [],
  });
  const [ownerOptions, setOwnerOptions] = useState([]);

  // Filters
  const [filters, setFilters] = useState(emptyFilters);
  const [draftFilters, setDraftFilters] = useState(emptyFilters);
  const [searchInput, setSearchInput] = useState("");
  const [activeKpi, setActiveKpi] = useState("all");
  const [kpiCounts, setKpiCounts] = useState({
    total: 0,
    new: 0,
    contacted: 0,
    qualified: 0,
    converted: 0,
    lost: 0,
  });

  // Table pagination & sorting
  const [page, setPage] = useState(0);
  const [pageSizeChoice, setPageSizeChoice] = useState(10);
  const pageSize = resolvePageSize(pageSizeChoice);
  const [sortConfig, setSortConfig] = useState({ key: "createdOn", dir: "desc" });
  const [columnFilters, setColumnFilters] = useState(emptyColumnFilters);
  const [columnFilterInput, setColumnFilterInput] = useState(emptyColumnFilters);

  // Column Visibility
  const [visibleColumns, setVisibleColumns] = useState(DEFAULT_VISIBLE_COLUMNS);

  // Multi-selection checkboxes
  const [selectedLeads, setSelectedLeads] = useState([]);

  // Active row dropdown state
  const [openDropdownId, setOpenDropdownId] = useState(null);

  // Modals & Menus
  const [filterOpen, setFilterOpen] = useState(false);
  const [exportDropdown, setExportDropdown] = useState(false);
  const [moreMenuDropdown, setMoreMenuDropdown] = useState(false);
  const [importModal, setImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);

  // Edit / Delete Modal
  const [editModal, setEditModal] = useState(false);
  const [editLeadId, setEditLeadId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Quick Action Modals (Call & Convert)
  const [quickActivityModal, setQuickActivityModal] = useState(false);
  const [quickActivityLead, setQuickActivityLead] = useState(null);
  const [activityForm, setActivityForm] = useState({ actType: "CALL", reason: "", callNotes: "" });
  const [savingActivity, setSavingActivity] = useState(false);

  const [convertModal, setConvertModal] = useState(false);
  const [convertLeadData, setConvertLeadData] = useState(null);
  const [convertCompanyName, setConvertCompanyName] = useState("");
  const [converting, setConverting] = useState(false);

  const loadLookups = useCallback(async () => {
    try {
      const data = await getLeadLookups();
      const leadSource = data?.leadSource || data?.lead_source || [];
      const leadStatus = data?.leadStatus || data?.lead_status || [];
      const leadRating = data?.leadRating || data?.lead_rating || [];
      setLookups({ leadSource, leadStatus, leadRating });
      return { leadSource, leadStatus, leadRating };
    } catch (err) {
      toastApiError(err, "Failed to load lead lookups.");
      return { leadSource: [], leadStatus: [], leadRating: [] };
    }
  }, []);

  const loadOwners = useCallback(async () => {
    try {
      const data = await getOwnerDropdown({ limit: 200 });
      setOwnerOptions(Array.isArray(data) ? data : data?.items || []);
    } catch {
      setOwnerOptions([]);
    }
  }, []);

  const loadKpis = useCallback(async () => {
    try {
      const res = await getLeads({ limit: 1000, offset: 0 });
      const items = res?.items || [];
      const counts = { total: res?.totalCount || items.length, new: 0, contacted: 0, qualified: 0, converted: 0, lost: 0 };

      items.forEach((l) => {
        const s = (l.statusName || "").toLowerCase();
        if (s.includes("new")) counts.new += 1;
        else if (s.includes("contacted")) counts.contacted += 1;
        else if (s.includes("qualified")) counts.qualified += 1;
        else if (s.includes("converted")) counts.converted += 1;
        else if (s.includes("lost")) counts.lost += 1;
      });
      setKpiCounts(counts);
    } catch {
      // ignore
    }
  }, []);

  const loadLeads = useCallback(async () => {
    setListLoading(true);
    setListError("");
    try {
      const offset = page * pageSize;
      const res = await getLeads({
        search: searchInput.trim() || undefined,
        statusId: filters.statusId ? Number(filters.statusId) : undefined,
        sourceId: filters.sourceId ? Number(filters.sourceId) : undefined,
        ratingId: filters.ratingId ? Number(filters.ratingId) : undefined,
        ownerEmployeeId: filters.ownerEmployeeId ? Number(filters.ownerEmployeeId) : undefined,
        limit: pageSize,
        offset,
      });

      setLeads(res?.items || []);
      setTotalCount(res?.totalCount || 0);
    } catch (err) {
      setListError(err?.message || "Failed to load leads from database.");
      toastApiError(err, "Failed to load leads.");
    } finally {
      setListLoading(false);
    }
  }, [filters, page, pageSize, searchInput]);

  useEffect(() => {
    loadLookups();
    loadOwners();
    loadKpis();
    try {
      const saved = localStorage.getItem("crm_leads_view_prefs");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.visibleColumns) setVisibleColumns(parsed.visibleColumns);
        if (parsed.pageSizeChoice) setPageSizeChoice(parsed.pageSizeChoice);
        if (parsed.sortConfig) setSortConfig(parsed.sortConfig);
      }
    } catch {
      // ignore
    }
  }, [loadLookups, loadOwners, loadKpis]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  // Handle client-side sorting & column filtering
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const matchesSearch =
        !searchInput ||
        (lead.leadName || "").toLowerCase().includes(searchInput.toLowerCase()) ||
        (lead.companyName || "").toLowerCase().includes(searchInput.toLowerCase()) ||
        (lead.mobile || "").toLowerCase().includes(searchInput.toLowerCase()) ||
        (lead.email || "").toLowerCase().includes(searchInput.toLowerCase());

      const matchesStatus =
        !filters.statusId || String(lead.statusId) === String(filters.statusId);
      const matchesSource =
        !filters.sourceId || String(lead.sourceId) === String(filters.sourceId);
      const matchesRating =
        !filters.ratingId || String(lead.ratingId) === String(filters.ratingId);
      const matchesOwner =
        !filters.ownerEmployeeId || String(lead.ownerEmployeeId) === String(filters.ownerEmployeeId);
      const matchesTerritory =
        !filters.territory ||
        (lead.description && lead.description.includes(`Territory: ${filters.territory}`));

      const matchesCol =
        matchesColumn(lead.leadName, columnFilters.lead) &&
        matchesColumn(lead.companyName, columnFilters.company) &&
        matchesColumn(lead.mobile, columnFilters.mobile) &&
        matchesColumn(lead.email, columnFilters.email) &&
        matchesColumn(lead.sourceName, columnFilters.source) &&
        matchesColumn(lead.statusName, columnFilters.status) &&
        matchesColumn(lead.ownerName, columnFilters.owner) &&
        matchesColumn(lead.ratingName, columnFilters.rating);

      return matchesSearch && matchesStatus && matchesSource && matchesRating && matchesOwner && matchesTerritory && matchesCol;
    });
  }, [leads, searchInput, filters, columnFilters]);

  const sortedLeads = useMemo(() => {
    const column = SORT_COLUMNS.find((col) => col.key === sortConfig.key);
    if (!column) return filteredLeads;
    return [...filteredLeads].sort((a, b) =>
      compareSortValues(column.getValue(a), column.getValue(b), sortConfig.dir)
    );
  }, [filteredLeads, sortConfig]);

  const toggleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, dir: prev.dir === "asc" ? "desc" : "asc" };
      }
      return { key, dir: "asc" };
    });
  };

  const handleKpiClick = (key) => {
    if (activeKpi === key) {
      setActiveKpi("all");
      setFilters((prev) => ({ ...prev, statusId: "" }));
      setPage(0);
      return;
    }

    setActiveKpi(key);
    if (key === "all") {
      setFilters((prev) => ({ ...prev, statusId: "" }));
    } else {
      const match = (lookups.leadStatus || []).find((s) =>
        (s.masterName || s.masterCode || "").toLowerCase().includes(key)
      );
      if (match?.masterId) {
        setFilters((prev) => ({ ...prev, statusId: String(match.masterId) }));
      }
    }
    setPage(0);
  };

  const openFilters = () => {
    setDraftFilters({ ...filters });
    setFilterOpen(true);
  };

  const applyFilters = () => {
    setFilters({ ...draftFilters });
    setActiveKpi(draftFilters.statusId ? "custom" : "all");
    setPage(0);
    setFilterOpen(false);
  };

  const resetAll = () => {
    setFilters(emptyFilters());
    setDraftFilters(emptyFilters());
    setColumnFilters(emptyColumnFilters());
    setColumnFilterInput(emptyColumnFilters());
    setSearchInput("");
    setActiveKpi("all");
    setSelectedLeads([]);
    setPage(0);
    setVisibleColumns(DEFAULT_VISIBLE_COLUMNS);
    try {
      localStorage.removeItem("crm_leads_view_prefs");
    } catch {
      // ignore
    }
    toastSuccess("Filters and view reset to defaults.");
  };

  // Multi-select Checkboxes
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedLeads(sortedLeads.map((l) => l.leadId));
    } else {
      setSelectedLeads([]);
    }
  };

  const handleSelectOne = (leadId) => {
    setSelectedLeads((prev) =>
      prev.includes(leadId) ? prev.filter((id) => id !== leadId) : [...prev, leadId]
    );
  };

  const [bulkDeleting, setBulkDeleting] = useState(false);

  const handleBulkDelete = async () => {
    if (!selectedLeads.length) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedLeads.length} selected lead(s)?`)) return;
    setBulkDeleting(true);
    try {
      await Promise.all(selectedLeads.map((id) => deactivateLead(id)));
      toastSuccess(`${selectedLeads.length} lead(s) deleted successfully.`);
      setSelectedLeads([]);
      await loadLeads();
      await loadKpis();
    } catch (err) {
      toastApiError(err, "Failed to delete selected leads.");
      await loadLeads();
      await loadKpis();
    } finally {
      setBulkDeleting(false);
    }
  };

  // CSV Export
  const handleExportCsv = () => {
    if (sortedLeads.length === 0) {
      toastSuccess("No leads to export.");
      return;
    }
    const headers = ["Lead ID", "Contact Person", "Company Name", "Mobile", "Email", "Source", "Status", "Owner", "Rating", "Created On"];
    const rows = sortedLeads.map((l) => [
      l.leadId,
      `"${(l.leadName || "").replace(/"/g, '""')}"`,
      `"${(l.companyName || "").replace(/"/g, '""')}"`,
      `"${l.mobile || ""}"`,
      `"${l.email || ""}"`,
      `"${l.sourceName || ""}"`,
      `"${l.statusName || ""}"`,
      `"${l.ownerName || ""}"`,
      `"${l.ratingName || ""}"`,
      `"${formatDate(l.createdAt)}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Leads_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toastSuccess("Leads exported successfully.");
  };

  // Process Real CSV Import
  const handleProcessImport = async () => {
    if (!importFile) {
      toastSuccess("Please select a .csv file first.");
      return;
    }
    setImporting(true);
    try {
      const text = await importFile.text();
      const lines = text.split("\n").filter((l) => l.trim().length > 0);
      if (lines.length <= 1) {
        toastSuccess("CSV file is empty or contains only headers.");
        setImporting(false);
        return;
      }

      // Default status 'New'
      const newStatus = (lookups.leadStatus || []).find((s) =>
        (s.masterName || s.masterCode || "").toLowerCase().includes("new")
      );
      const defaultStatusId = newStatus?.masterId || (lookups.leadStatus[0]?.masterId ?? 1);

      let importedCount = 0;
      // Skip header, process each row
      for (let i = 1; i < lines.length; i += 1) {
        const parts = lines[i].split(",").map((p) => p.replace(/^"|"$/g, "").trim());
        if (parts.length >= 2 && parts[0]) {
          const leadName = parts[0];
          const companyName = parts[1] || "";
          const mobile = parts[2] || "9876543210";
          const email = parts[3] || "";

          try {
            await createLead({
              leadName,
              companyName: companyName || null,
              mobile,
              email: email || null,
              statusId: defaultStatusId,
            });
            importedCount += 1;
          } catch {
            // continue on duplicate
          }
        }
      }

      toastSuccess(`Import completed! ${importedCount} leads added to database.`);
      setImportModal(false);
      setImportFile(null);
      await Promise.all([loadLeads(), loadKpis()]);
    } catch (err) {
      toastApiError(err, "Failed to import leads file.");
    } finally {
      setImporting(false);
    }
  };

  const handleSaveView = () => {
    try {
      localStorage.setItem(
        "crm_leads_view_prefs",
        JSON.stringify({ visibleColumns, pageSizeChoice, sortConfig })
      );
      toastSuccess("Custom table view preferences saved.");
    } catch {
      toastSuccess("View preferences updated.");
    }
  };

  // Edit Lead Modal Actions
  const openEdit = async (leadId) => {
    setEditLeadId(leadId);
    setFormError("");
    setOpenDropdownId(null);
    try {
      const data = await getLeadById(leadId);
      setForm({
        leadName: data.leadName || "",
        companyName: data.companyName || "",
        designation: data.designation || "",
        industry: data.industry || "",
        email: data.email || "",
        mobile: data.mobile || "",
        phone: data.phone || "",
        website: data.website || "",
        sourceId: data.sourceId ? String(data.sourceId) : "",
        statusId: data.statusId ? String(data.statusId) : "",
        ratingId: data.ratingId ? String(data.ratingId) : "",
        estimatedValue: data.estimatedValue != null ? String(data.estimatedValue) : "",
        expectedCloseDate: data.expectedCloseDate || "",
        description: data.description || "",
        ownerEmployeeId: data.ownerEmployeeId ? String(data.ownerEmployeeId) : "",
      });
      setEditModal(true);
    } catch (err) {
      toastApiError(err, "Failed to load lead details.");
    }
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!form.leadName.trim()) {
      setFormError("Lead name is required.");
      return;
    }
    if (!form.mobile.trim()) {
      setFormError("Mobile is required.");
      return;
    }
    setSaving(true);
    try {
      await updateLead(editLeadId, {
        leadName: form.leadName.trim(),
        companyName: form.companyName?.trim() || null,
        designation: form.designation?.trim() || null,
        industry: form.industry?.trim() || null,
        email: form.email?.trim() || null,
        mobile: form.mobile.trim(),
        phone: form.phone?.trim() || null,
        website: form.website?.trim() || null,
        sourceId: form.sourceId ? Number(form.sourceId) : null,
        statusId: Number(form.statusId),
        ratingId: form.ratingId ? Number(form.ratingId) : null,
        estimatedValue: form.estimatedValue ? Number(form.estimatedValue) : null,
        expectedCloseDate: form.expectedCloseDate || null,
        description: form.description?.trim() || null,
        ownerEmployeeId: form.ownerEmployeeId ? Number(form.ownerEmployeeId) : null,
      });
      toastSuccess("Lead updated successfully.");
      setEditModal(false);
      await Promise.all([loadLeads(), loadKpis()]);
    } catch (err) {
      setFormError(err?.message || "Failed to update lead.");
      toastApiError(err, "Update failed.");
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
      await Promise.all([loadLeads(), loadKpis()]);
    } catch (err) {
      toastApiError(err, "Failed to delete lead.");
    } finally {
      setDeleting(false);
    }
  };

  // Convert Lead from table action menu
  const openConvertModal = (lead) => {
    setConvertLeadData(lead);
    setConvertCompanyName(lead.companyName || lead.leadName || "");
    setOpenDropdownId(null);
    setConvertModal(true);
  };

  const handleConvertLead = async () => {
    if (!convertLeadData) return;
    setConverting(true);
    try {
      const custRes = await createCustomer({
        displayName: convertCompanyName.trim(),
        companyName: convertCompanyName.trim(),
        email: convertLeadData.email || null,
        phoneMobile: convertLeadData.mobile,
        partyType: "CUSTOMER",
      });
      const newAccountId = custRes?.accountId || custRes?.account_id;

      if (newAccountId) {
        await createContact({
          accountId: newAccountId,
          firstName: convertLeadData.leadName || convertCompanyName,
          email: convertLeadData.email || null,
          mobile: convertLeadData.mobile,
          isPrimary: true,
        });

        const convStatus = (lookups.leadStatus || []).find((s) =>
          (s.masterName || s.masterCode || "").toLowerCase().includes("convert")
        );

        await updateLead(convertLeadData.leadId, {
          leadName: convertLeadData.leadName,
          mobile: convertLeadData.mobile,
          statusId: convStatus?.masterId || convertLeadData.statusId,
          convertedAccountId: newAccountId,
        });
      }

      toastSuccess(`Lead converted into Customer Account "${convertCompanyName}".`);
      setConvertModal(false);
      await Promise.all([loadLeads(), loadKpis()]);
    } catch (err) {
      toastApiError(err, "Failed to convert lead.");
    } finally {
      setConverting(false);
    }
  };

  // Quick Log Call Action
  const openQuickActivity = (lead) => {
    setQuickActivityLead(lead);
    setActivityForm({ actType: "CALL", reason: `Phone call with ${lead.leadName}`, callNotes: "" });
    setQuickActivityModal(true);
  };

  const handleSaveActivity = async (e) => {
    e.preventDefault();
    if (!quickActivityLead) return;
    setSavingActivity(true);
    try {
      await createActivity({
        actType: activityForm.actType,
        reason: activityForm.reason.trim(),
        callNotes: activityForm.callNotes?.trim() || null,
        startTime: new Date().toISOString(),
        employeeId: quickActivityLead.ownerEmployeeId || null,
      });
      toastSuccess("Activity recorded in database.");
      setQuickActivityModal(false);
    } catch (err) {
      toastApiError(err, "Failed to log activity.");
    } finally {
      setSavingActivity(false);
    }
  };

  // 6 Top KPI Cards metadata with 100% dynamic percentage computation
  const total = kpiCounts.total || 0;
  const kpiList = [
    {
      key: "all",
      label: "Total Leads",
      count: total,
      iconClass: "ri-user-shared-line",
      iconColor: "#7f1d1d",
      iconBg: "#fef2f2",
      trendBadge: "100% active total",
      trendColor: "text-muted",
    },
    {
      key: "new",
      label: "New Leads",
      count: kpiCounts.new,
      iconClass: "ri-sparkling-line",
      iconColor: "#991b1b",
      iconBg: "#fee2e2",
      trendBadge: total > 0 ? `${Math.round((kpiCounts.new / total) * 100)}% of total` : "0% of total",
      trendColor: "text-success",
    },
    {
      key: "contacted",
      label: "Contacted",
      count: kpiCounts.contacted,
      iconClass: "ri-phone-line",
      iconColor: "#0284c7",
      iconBg: "#f0f9ff",
      trendBadge: total > 0 ? `${Math.round((kpiCounts.contacted / total) * 100)}% of total` : "0% of total",
      trendColor: "text-success",
    },
    {
      key: "qualified",
      label: "Qualified",
      count: kpiCounts.qualified,
      iconClass: "ri-checkbox-circle-line",
      iconColor: "#d97706",
      iconBg: "#fffbeb",
      trendBadge: total > 0 ? `${Math.round((kpiCounts.qualified / total) * 100)}% of total` : "0% of total",
      trendColor: "text-success",
    },
    {
      key: "converted",
      label: "Converted",
      count: kpiCounts.converted,
      iconClass: "ri-exchange-dollar-line",
      iconColor: "#059669",
      iconBg: "#ecfdf5",
      trendBadge: total > 0 ? `${Math.round((kpiCounts.converted / total) * 100)}% of total` : "0% of total",
      trendColor: "text-success",
    },
    {
      key: "lost",
      label: "Lost Leads",
      count: kpiCounts.lost,
      iconClass: "ri-close-circle-line",
      iconColor: "#dc2626",
      iconBg: "#fef2f2",
      trendBadge: total > 0 ? `${Math.round((kpiCounts.lost / total) * 100)}% of total` : "0% of total",
      trendColor: "text-danger",
    },
  ];

  const hasAnyFilter = Boolean(
    filters.statusId || filters.sourceId || filters.ratingId || filters.ownerEmployeeId || filters.territory || searchInput || activeKpi !== "all"
  );

  return (
    <div className="page-content">
      <Container fluid>
        {/* Top Header: Title, Breadcrumb & Action Buttons matching CRM_02_Leads.png */}
        <div className="d-flex align-items-center justify-content-between mb-3 pb-1 flex-wrap gap-2">
          <div>
            <h4 className="fw-bold fs-18 mb-1 text-dark">Leads</h4>
            <div className="text-muted fs-12 d-flex align-items-center gap-1">
              <span>CRM</span>
              <span className="text-muted opacity-50">&gt;</span>
              <span className="text-dark fw-medium">Leads</span>
            </div>
          </div>

          <div className="d-flex align-items-center gap-2 flex-wrap">
            <Button
              color="primary"
              size="sm"
              className="px-3 fw-semibold d-inline-flex align-items-center"
              style={{ borderRadius: "3px", backgroundColor: "#7f1d1d", borderColor: "#7f1d1d", height: "34px" }}
              tag={Link}
              to="/crm/leads/create"
            >
              <i className="ri-add-line align-middle me-1 fs-15" />
              New Lead
            </Button>
            <Button
              color="light"
              size="sm"
              className="px-3 border bg-white d-inline-flex align-items-center"
              style={{ borderRadius: "3px", fontWeight: 500, height: "34px" }}
              onClick={() => setImportModal(true)}
            >
              <i className="ri-download-2-line align-middle me-1 text-primary fs-14" />
              Import Leads
            </Button>

            <Dropdown isOpen={exportDropdown} toggle={() => setExportDropdown(!exportDropdown)}>
              <DropdownToggle
                color="light"
                size="sm"
                className="px-3 border bg-white d-inline-flex align-items-center"
                style={{ borderRadius: "3px", fontWeight: 500, height: "34px" }}
              >
                <i className="ri-upload-2-line align-middle me-1 text-success fs-14" />
                Export
                <i className="ri-arrow-down-s-line ms-1" />
              </DropdownToggle>
              <DropdownMenu end container="body">
                <DropdownItem onClick={handleExportCsv}>
                  <i className="ri-file-excel-line me-2 text-success" />
                  Export to Excel / CSV (.csv)
                </DropdownItem>
                <DropdownItem onClick={() => window.print()}>
                  <i className="ri-printer-line me-2 text-muted" />
                  Print Lead Table
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>

            <Dropdown isOpen={moreMenuDropdown} toggle={() => setMoreMenuDropdown(!moreMenuDropdown)}>
              <DropdownToggle
                color="light"
                size="sm"
                className="px-2 border bg-white d-inline-flex align-items-center justify-content-center"
                style={{ borderRadius: "3px", width: "34px", height: "34px" }}
              >
                <i className="ri-more-fill fs-14" />
              </DropdownToggle>
              <DropdownMenu end container="body">
                <DropdownItem onClick={loadLeads}>
                  <i className="ri-refresh-line me-2" />
                  Refresh List
                </DropdownItem>
                <DropdownItem onClick={resetAll}>
                  <i className="ri-filter-off-line me-2" />
                  Clear All Filters
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>
        </div>

        {listError ? <Alert color="danger" className="mb-3">{listError}</Alert> : null}

        {/* Top 6 KPI Summary Cards with 100% Dynamic Data */}
        <Row className="g-3 mb-3">
          {kpiList.map((card) => {
            const isSelected = activeKpi === card.key;
            return (
              <Col key={card.key} xs={12} sm={6} md={4} xl={2}>
                <Card
                  className="mb-0 h-100 border bg-white"
                  style={{
                    cursor: "pointer",
                    borderRadius: "4px",
                    border: isSelected ? "2px solid #7f1d1d" : "1px solid #e2e8f0",
                    borderTop: isSelected ? "3px solid #7f1d1d" : "1px solid #e2e8f0",
                    backgroundColor: isSelected ? "#fff5f5" : "#ffffff",
                    transition: "all 0.15s ease-in-out",
                  }}
                  onClick={() => handleKpiClick(card.key)}
                >
                  <CardBody className="p-3">
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <div
                        className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                        style={{ width: "32px", height: "32px", backgroundColor: card.iconBg, color: card.iconColor }}
                      >
                        <i className={`${card.iconClass} fs-15`} />
                      </div>
                      <span className="text-muted text-uppercase fw-semibold fs-11 text-truncate" style={{ letterSpacing: "0.3px" }}>
                        {card.label}
                      </span>
                    </div>

                    <div className="d-flex align-items-baseline justify-content-between">
                      <div className="fs-20 fw-bold text-dark lh-1">
                        {card.count.toLocaleString("en-IN")}
                      </div>
                      <div className={`fs-11 fw-medium ${card.trendColor}`}>
                        {card.trendBadge}
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </Col>
            );
          })}
        </Row>

        {/* Table Container Card */}
        <Card className="mb-0 border bg-white" style={{ borderRadius: "4px", borderColor: "#e2e8f0" }}>
          <CardBody className="p-0">
            {/* Unified Horizontal Filter Strip */}
            <div className="d-flex align-items-center justify-content-between p-3 border-bottom flex-wrap gap-2 bg-white">
              <div className="d-flex align-items-center gap-2 flex-wrap flex-grow-1">
                {/* Search Input */}
                <div className="search-box position-relative" style={{ minWidth: "260px", maxWidth: "340px" }}>
                  <Input
                    type="text"
                    bsSize="sm"
                    className="ps-4"
                    style={{ borderRadius: "3px" }}
                    placeholder="Search leads by name, email, phone, company…"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                  />
                  <i
                    className="ri-search-line search-icon position-absolute text-muted"
                    style={{ top: "8px", left: "10px", fontSize: "14px" }}
                  />
                </div>

                {/* All Lead Sources Dropdown */}
                <div style={{ width: "160px" }}>
                  <Input
                    type="select"
                    bsSize="sm"
                    style={{ borderRadius: "3px" }}
                    value={filters.sourceId || ""}
                    onChange={(e) => {
                      setFilters((prev) => ({ ...prev, sourceId: e.target.value }));
                      setPage(0);
                    }}
                  >
                    <option value="">All Lead Sources</option>
                    {(lookups.leadSource || []).map((s) => (
                      <option key={s.masterId} value={s.masterId}>{s.masterName}</option>
                    ))}
                  </Input>
                </div>

                {/* All Status Dropdown */}
                <div style={{ width: "140px" }}>
                  <Input
                    type="select"
                    bsSize="sm"
                    style={{ borderRadius: "3px" }}
                    value={filters.statusId || ""}
                    onChange={(e) => {
                      setFilters((prev) => ({ ...prev, statusId: e.target.value }));
                      setActiveKpi(e.target.value ? "custom" : "all");
                      setPage(0);
                    }}
                  >
                    <option value="">All Status</option>
                    {(lookups.leadStatus || []).map((s) => (
                      <option key={s.masterId} value={s.masterId}>{s.masterName}</option>
                    ))}
                  </Input>
                </div>

                {/* All Owners Dropdown */}
                <div style={{ width: "150px" }}>
                  <Input
                    type="select"
                    bsSize="sm"
                    style={{ borderRadius: "3px" }}
                    value={filters.ownerEmployeeId || ""}
                    onChange={(e) => {
                      setFilters((prev) => ({ ...prev, ownerEmployeeId: e.target.value }));
                      setPage(0);
                    }}
                  >
                    <option value="">All Owners</option>
                    {ownerOptions.map((o) => (
                      <option key={o.ownerId} value={o.ownerId}>{o.fullName}</option>
                    ))}
                  </Input>
                </div>

                {/* All Territories Dropdown matching CRM_02_Leads.png */}
                <div style={{ width: "145px" }}>
                  <Input
                    type="select"
                    bsSize="sm"
                    style={{ borderRadius: "3px" }}
                    value={filters.territory || ""}
                    onChange={(e) => {
                      setFilters((prev) => ({ ...prev, territory: e.target.value }));
                      setPage(0);
                    }}
                  >
                    <option value="">All Territories</option>
                    {TERRITORY_OPTIONS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </Input>
                </div>

                {/* All Ratings Dropdown */}
                <div style={{ width: "140px" }}>
                  <Input
                    type="select"
                    bsSize="sm"
                    style={{ borderRadius: "3px" }}
                    value={filters.ratingId || ""}
                    onChange={(e) => {
                      setFilters((prev) => ({ ...prev, ratingId: e.target.value }));
                      setPage(0);
                    }}
                  >
                    <option value="">All Ratings</option>
                    {(lookups.leadRating || []).map((r) => (
                      <option key={r.masterId} value={r.masterId}>{r.masterName}</option>
                    ))}
                  </Input>
                </div>
              </div>

              {/* Right Filter Actions */}
              <div className="d-flex align-items-center gap-2">
                {hasAnyFilter && (
                  <Button
                    color="light"
                    size="sm"
                    className="border"
                    style={{ borderRadius: "3px" }}
                    onClick={resetAll}
                    title="Reset all filters"
                  >
                    <i className="ri-refresh-line me-1" />
                    Reset
                  </Button>
                )}

                <Button
                  color="light"
                  size="sm"
                  className="border"
                  style={{ borderRadius: "3px", fontWeight: 500 }}
                  onClick={openFilters}
                >
                  <i className="ri-filter-3-line me-1 text-primary" />
                  More Filters
                </Button>

                <Button
                  color="light"
                  size="sm"
                  className="border"
                  style={{ borderRadius: "3px", fontWeight: 500 }}
                  onClick={handleSaveView}
                >
                  <i className="ri-save-line me-1 text-muted" />
                  Save View
                </Button>
              </div>
            </div>

            {/* Main Leads Table */}
            <div className="table-responsive">
              <table className="table table-hover table-nowrap align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    {/* Col 1: Checkbox */}
                    <th style={{ width: "40px" }} className="text-center">
                      <Input
                        type="checkbox"
                        checked={sortedLeads.length > 0 && selectedLeads.length === sortedLeads.length}
                        onChange={handleSelectAll}
                      />
                    </th>

                    {/* Columns 2-11: Clean Headers with Sorting matching CRM_02_Leads.png */}
                    {SORT_COLUMNS.filter((col) => visibleColumns[col.key] !== false).map((col) => {
                      const isSorted = sortConfig.key === col.key;
                      return (
                        <th
                          key={col.key}
                          style={{
                            cursor: "pointer",
                            userSelect: "none",
                            fontSize: "12px",
                            fontWeight: 600,
                            letterSpacing: "0.2px",
                            color: isSorted ? "#7f1d1d" : "#495057",
                            width: col.width,
                          }}
                          onClick={() => toggleSort(col.key)}
                          className="text-nowrap py-3"
                        >
                          <div className="d-flex align-items-center gap-1">
                            <span>{col.label}</span>
                            <span className="fs-11 text-muted">
                              {isSorted ? (
                                sortConfig.dir === "asc" ? (
                                  <i className="ri-arrow-up-s-line text-primary fw-bold" style={{ color: "#7f1d1d" }} />
                                ) : (
                                  <i className="ri-arrow-down-s-line text-primary fw-bold" style={{ color: "#7f1d1d" }} />
                                )
                              ) : (
                                <i className="ri-expand-up-down-line opacity-30" />
                              )}
                            </span>
                          </div>
                        </th>
                      );
                    })}

                    {/* Col 12: Actions Header on FAR RIGHT */}
                    <th style={{ width: "100px" }} className="text-end pe-3 py-3">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {listLoading ? (
                    <tr>
                      <td colSpan={SORT_COLUMNS.filter((col) => visibleColumns[col.key] !== false).length + 2} className="text-center py-5">
                        <Spinner color="primary" /> <span className="ms-2">Loading leads from database…</span>
                      </td>
                    </tr>
                  ) : sortedLeads.length === 0 ? (
                    <tr>
                      <td colSpan={SORT_COLUMNS.filter((col) => visibleColumns[col.key] !== false).length + 2} className="text-center py-5 text-muted">
                        <div className="fs-15 fw-semibold text-dark">No leads found in this view.</div>
                        <div className="fs-12 mt-1">
                          Try adjusting the status or source dropdowns, or click <strong>New Lead</strong>.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    sortedLeads.map((lead) => {
                      const isSelected = selectedLeads.includes(lead.leadId);
                      const followUpText = resolveFollowUp(lead);
                      const initials = (lead.companyName || lead.leadName || "L")
                        .split(" ")
                        .filter(Boolean)
                        .map((w) => w[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase();

                      return (
                        <tr key={lead.leadId} className={isSelected ? "table-active" : ""}>
                          {/* Col 1: Checkbox */}
                          <td className="text-center">
                            <Input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleSelectOne(lead.leadId)}
                            />
                          </td>

                          {/* Col 2: Lead Name (Monogram Avatar + Contact + Company) */}
                          {visibleColumns.lead !== false && (
                            <td>
                              <div className="d-flex align-items-center gap-2">
                                <div
                                  className="rounded-circle d-flex align-items-center justify-content-center fw-bold fs-11 text-dark"
                                  style={{
                                    width: "32px",
                                    height: "32px",
                                    backgroundColor: getAvatarBg(lead.companyName || lead.leadName),
                                    flexShrink: 0,
                                  }}
                                >
                                  {initials}
                                </div>
                                <div className="min-w-0">
                                  <Link
                                    to={`/crm/leads/${lead.leadId}`}
                                    className="text-dark fw-bold d-block text-truncate fs-13"
                                    style={{ maxWidth: "200px" }}
                                  >
                                    {lead.companyName || lead.leadName}
                                  </Link>
                                  <span className="text-muted d-block text-truncate fs-11" style={{ maxWidth: "200px" }}>
                                    {lead.leadName}
                                  </span>
                                </div>
                              </div>
                            </td>
                          )}

                          {/* Col 3: Company */}
                          {visibleColumns.company !== false && (
                            <td>
                              <span className="text-dark fw-medium">{lead.companyName || "—"}</span>
                            </td>
                          )}

                          {/* Col 4: Mobile */}
                          {visibleColumns.mobile !== false && (
                            <td>
                              {lead.mobile ? (
                                <a href={`tel:${lead.mobile}`} className="text-dark text-nowrap d-inline-flex align-items-center gap-1">
                                  {lead.mobile}
                                </a>
                              ) : "—"}
                            </td>
                          )}

                          {/* Col 5: Email */}
                          {visibleColumns.email !== false && (
                            <td>
                              {lead.email ? (
                                <a href={`mailto:${lead.email}`} className="text-muted text-truncate d-inline-flex align-items-center gap-1" style={{ maxWidth: "180px" }}>
                                  {lead.email}
                                </a>
                              ) : "—"}
                            </td>
                          )}

                          {/* Col 6: Lead Source */}
                          {visibleColumns.source !== false && (
                            <td>
                              {lead.sourceName ? (
                                <span className={`badge ${sourceBadge(lead.sourceName)}`} style={{ borderRadius: "3px", fontSize: "11px", fontWeight: 500 }}>
                                  {lead.sourceName}
                                </span>
                              ) : "—"}
                            </td>
                          )}

                          {/* Col 7: Status */}
                          {visibleColumns.status !== false && (
                            <td>
                              <span className={`badge ${statusBadge(lead.statusName)}`} style={{ borderRadius: "3px", fontSize: "11px", fontWeight: 600 }}>
                                {lead.statusName || "New"}
                              </span>
                            </td>
                          )}

                          {/* Col 8: Owner */}
                          {visibleColumns.owner !== false && (
                            <td>
                              {lead.ownerName ? (
                                <div className="d-flex align-items-center gap-1">
                                  <div
                                    className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold fs-10"
                                    style={{ width: "20px", height: "20px", backgroundColor: "#7f1d1d", flexShrink: 0 }}
                                  >
                                    {(lead.ownerName || "U")[0]}
                                  </div>
                                  <span className="text-dark fs-12 fw-medium text-truncate">{lead.ownerName}</span>
                                </div>
                              ) : (
                                <span className="text-muted fs-12">—</span>
                              )}
                            </td>
                          )}

                          {/* Col 9: Rating (5 Stars) */}
                          {visibleColumns.rating !== false && (
                            <td>{renderRating(lead.ratingName)}</td>
                          )}

                          {/* Col 10: Created On */}
                          {visibleColumns.createdOn !== false && (
                            <td>
                              <span className="text-muted fs-12 text-nowrap">{formatDate(lead.createdAt)}</span>
                            </td>
                          )}

                          {/* Col 11: Next Follow-up */}
                          {visibleColumns.followUp !== false && (
                            <td>{formatFollowUpDisplay(followUpText)}</td>
                          )}

                          {/* Col 12: Actions (Quick Call, Quick Email, Functional Dropdown) */}
                          <td className="text-end pe-3">
                            <div className="d-inline-flex align-items-center gap-1">
                              {/* Quick Call */}
                              <Button
                                color="light"
                                size="sm"
                                className="border p-0 d-inline-flex align-items-center justify-content-center"
                                style={{ width: "28px", height: "28px", borderRadius: "3px" }}
                                onClick={() => openQuickActivity(lead)}
                                title="Log Call / Activity"
                              >
                                <i className="ri-phone-line text-success fs-14" />
                              </Button>

                              {/* Quick Email */}
                              {lead.email ? (
                                <a
                                  href={`mailto:${lead.email}`}
                                  className="btn btn-sm btn-light border p-0 d-inline-flex align-items-center justify-content-center"
                                  style={{ width: "28px", height: "28px", borderRadius: "3px" }}
                                  title="Send Email"
                                >
                                  <i className="ri-mail-line text-primary fs-14" />
                                </a>
                              ) : null}

                              {/* Functional Row More Dropdown - container="body" portals menu so it never clips or causes table scrollbars */}
                              <Dropdown
                                isOpen={openDropdownId === lead.leadId}
                                toggle={() => setOpenDropdownId(openDropdownId === lead.leadId ? null : lead.leadId)}
                              >
                                <DropdownToggle
                                  color="light"
                                  size="sm"
                                  className="border p-0 d-inline-flex align-items-center justify-content-center"
                                  style={{ width: "28px", height: "28px", borderRadius: "3px" }}
                                >
                                  <i className="ri-more-fill text-muted fs-14" />
                                </DropdownToggle>
                                <DropdownMenu end container="body" className="shadow border-0 py-1" style={{ borderRadius: "4px" }}>
                                  <DropdownItem
                                    onClick={() => {
                                      setOpenDropdownId(null);
                                      navigate(`/crm/leads/${lead.leadId}`);
                                    }}
                                    className="fs-12 py-1 px-3"
                                  >
                                    <i className="ri-eye-line me-2 text-primary" />
                                    View 360° Profile
                                  </DropdownItem>
                                  <DropdownItem onClick={() => openEdit(lead.leadId)} className="fs-12 py-1 px-3">
                                    <i className="ri-pencil-line me-2 text-warning" />
                                    Edit Lead
                                  </DropdownItem>
                                  <DropdownItem onClick={() => openConvertModal(lead)} className="fs-12 py-1 px-3">
                                    <i className="ri-user-follow-line me-2 text-success" />
                                    Convert to Customer
                                  </DropdownItem>
                                  <DropdownItem divider className="my-1" />
                                  <DropdownItem
                                    className="text-danger fs-12 py-1 px-3"
                                    onClick={() => {
                                      setDeleteTarget(lead);
                                      setDeleteModal(true);
                                      setOpenDropdownId(null);
                                    }}
                                  >
                                    <i className="ri-delete-bin-line me-2" />
                                    Delete Lead
                                  </DropdownItem>
                                </DropdownMenu>
                              </Dropdown>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="p-3 border-top d-flex align-items-center justify-content-between flex-wrap gap-2">
              <div className="text-muted fs-13">
                Showing <span className="fw-semibold text-dark">{sortedLeads.length > 0 ? page * pageSize + 1 : 0}</span> to{" "}
                <span className="fw-semibold text-dark">{Math.min((page + 1) * pageSize, totalCount)}</span> of{" "}
                <span className="fw-semibold text-dark">{totalCount.toLocaleString("en-IN")}</span> leads
              </div>

              <div className="d-flex align-items-center gap-3">
                {/* Page Size Selector */}
                <div style={{ width: "135px" }}>
                  <Input
                    type="select"
                    bsSize="sm"
                    style={{ borderRadius: "3px" }}
                    value={pageSizeChoice}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setPageSizeChoice(raw === "all" ? "all" : Number(raw));
                      setPage(0);
                    }}
                  >
                    {PAGE_SIZE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </Input>
                </div>

                {/* Pagination Controls matching CRM_02_Leads.png */}
                {(() => {
                  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
                  const currentPage = page + 1;

                  // Generate smart page numbers
                  const pages = [];
                  if (totalPages <= 7) {
                    for (let i = 1; i <= totalPages; i += 1) pages.push(i);
                  } else {
                    pages.push(1);
                    if (currentPage > 3) pages.push("...");
                    const start = Math.max(2, currentPage - 1);
                    const end = Math.min(totalPages - 1, currentPage + 1);
                    for (let i = start; i <= end; i += 1) pages.push(i);
                    if (currentPage < totalPages - 2) pages.push("...");
                    pages.push(totalPages);
                  }

                  return (
                    <div className="btn-group btn-group-sm">
                      <Button
                        color="light"
                        className="border bg-white"
                        disabled={page === 0}
                        onClick={() => setPage(0)}
                        title="First Page"
                      >
                        <i className="ri-skip-back-line" />
                      </Button>
                      <Button
                        color="light"
                        className="border bg-white"
                        disabled={page === 0}
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                        title="Previous Page"
                      >
                        <i className="ri-arrow-left-s-line" />
                      </Button>
                      {pages.map((p, idx) =>
                        p === "..." ? (
                          <Button key={`dots_${idx}`} color="light" className="border bg-white" disabled>
                            …
                          </Button>
                        ) : (
                          <Button
                            key={`page_${p}`}
                            color={p === currentPage ? "primary" : "light"}
                            className={`border ${p === currentPage ? "fw-bold text-white" : "bg-white text-dark"}`}
                            style={
                              p === currentPage
                                ? { backgroundColor: "#7f1d1d", borderColor: "#7f1d1d" }
                                : { minWidth: "32px" }
                            }
                            onClick={() => setPage(p - 1)}
                          >
                            {p}
                          </Button>
                        )
                      )}
                      <Button
                        color="light"
                        className="border bg-white"
                        disabled={(page + 1) * pageSize >= totalCount}
                        onClick={() => setPage((p) => p + 1)}
                        title="Next Page"
                      >
                        <i className="ri-arrow-right-s-line" />
                      </Button>
                      <Button
                        color="light"
                        className="border bg-white"
                        disabled={(page + 1) * pageSize >= totalCount}
                        onClick={() => setPage(totalPages - 1)}
                        title="Last Page"
                      >
                        <i className="ri-skip-forward-line" />
                      </Button>
                    </div>
                  );
                })()}
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Floating Batch Action Bar */}
        {selectedLeads.length > 0 && (
          <div
            className="position-fixed bottom-0 start-50 translate-middle-x mb-4 shadow-lg bg-dark text-white p-2 px-4 d-flex align-items-center gap-3"
            style={{ borderRadius: "8px", zIndex: 1050, border: "1px solid #334155" }}
          >
            <span className="fs-13 fw-semibold">
              <i className="ri-checkbox-circle-fill text-success me-1" />
              {selectedLeads.length} lead{selectedLeads.length > 1 ? "s" : ""} selected
            </span>
            <div className="vr bg-secondary opacity-50 my-1" />
            <Button
              color="danger"
              size="sm"
              className="px-3"
              style={{ borderRadius: "4px", fontWeight: 500 }}
              disabled={bulkDeleting}
              onClick={handleBulkDelete}
            >
              {bulkDeleting ? <Spinner size="sm" className="me-1" /> : <i className="ri-delete-bin-line me-1" />}
              Delete Selected
            </Button>
            <Button
              color="light"
              size="sm"
              className="px-3"
              style={{ borderRadius: "4px", fontWeight: 500 }}
              onClick={() => setSelectedLeads([])}
            >
              Deselect All
            </Button>
          </div>
        )}

        {/* Filter Drawer */}
        <LeadAdvancedFilters
          isOpen={filterOpen}
          onClose={() => setFilterOpen(false)}
          filters={draftFilters}
          onChange={(k, v) => setDraftFilters((prev) => ({ ...prev, [k]: v }))}
          onApply={applyFilters}
          onReset={() => {
            setDraftFilters(emptyFilters());
            setFilters(emptyFilters());
            setActiveKpi("all");
            setPage(0);
            setFilterOpen(false);
          }}
          lookups={lookups}
          ownerOptions={ownerOptions}
        />

        {/* Real CSV Import Leads Modal */}
        <Modal isOpen={importModal} toggle={() => setImportModal(!importModal)} centered>
          <ModalHeader toggle={() => setImportModal(!importModal)} className="bg-light">
            <i className="ri-download-2-line text-primary me-2" />
            Import Leads Spreadsheet (CSV)
          </ModalHeader>
          <ModalBody>
            <div className="p-4 border border-dashed rounded text-center bg-light mb-3">
              <i className="ri-file-upload-line fs-28 text-muted d-block mb-1" />
              <span className="fw-semibold text-dark fs-13">Choose a .csv spreadsheet file to import</span>
              <div className="text-muted fs-11 mt-1">Expected columns: Lead Name, Company Name, Mobile, Email</div>
            </div>
            <Input
              type="file"
              accept=".csv"
              bsSize="sm"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
            />
          </ModalBody>
          <ModalFooter>
            <Button color="light" size="sm" onClick={() => setImportModal(false)}>Cancel</Button>
            <Button
              color="primary"
              size="sm"
              disabled={!importFile || importing}
              onClick={handleProcessImport}
              style={{ backgroundColor: "#7f1d1d", borderColor: "#7f1d1d" }}
            >
              {importing ? <Spinner size="sm" className="me-1" /> : null}
              Process &amp; Import Leads
            </Button>
          </ModalFooter>
        </Modal>

        {/* Quick Log Call Activity Modal */}
        <Modal isOpen={quickActivityModal} toggle={() => setQuickActivityModal(!quickActivityModal)} centered>
          <ModalHeader toggle={() => setQuickActivityModal(!quickActivityModal)} className="bg-light">
            <i className="ri-phone-line text-success me-2" />
            Log Call Activity
          </ModalHeader>
          <ModalBody>
            <Form onSubmit={handleSaveActivity}>
              <div className="mb-2">
                <span className="text-muted fs-12">Lead:</span>{" "}
                <strong className="text-dark fs-13">{quickActivityLead?.companyName || quickActivityLead?.leadName}</strong>
              </div>
              <FormGroup>
                <Label className="fs-12 fw-medium">Subject / Discussion Topic *</Label>
                <Input
                  bsSize="sm"
                  style={{ borderRadius: "3px" }}
                  value={activityForm.reason}
                  onChange={(e) => setActivityForm({ ...activityForm, reason: e.target.value })}
                  required
                />
              </FormGroup>
              <FormGroup>
                <Label className="fs-12 fw-medium">Call Notes &amp; Outcome</Label>
                <Input
                  type="textarea"
                  rows={3}
                  style={{ borderRadius: "3px" }}
                  placeholder="Enter notes from call conversation…"
                  value={activityForm.callNotes}
                  onChange={(e) => setActivityForm({ ...activityForm, callNotes: e.target.value })}
                />
              </FormGroup>
              <div className="d-flex justify-content-end gap-2">
                <Button color="light" size="sm" onClick={() => setQuickActivityModal(false)}>Cancel</Button>
                <Button color="primary" size="sm" type="submit" disabled={savingActivity} style={{ backgroundColor: "#7f1d1d", borderColor: "#7f1d1d" }}>
                  {savingActivity ? <Spinner size="sm" className="me-1" /> : null}
                  Save Activity to DB
                </Button>
              </div>
            </Form>
          </ModalBody>
        </Modal>

        {/* Real Convert Lead Modal */}
        <Modal isOpen={convertModal} toggle={() => setConvertModal(!convertModal)} centered>
          <ModalHeader toggle={() => setConvertModal(!convertModal)} className="bg-light">
            <i className="ri-user-follow-line text-primary me-2" />
            Convert Lead to Customer Account
          </ModalHeader>
          <ModalBody>
            <Alert color="info" className="fs-12 mb-3">
              Converting will create a new Customer in <strong>tab_account_master</strong> and a Primary Contact in <strong>tab_party_contact_persons</strong>.
            </Alert>
            <FormGroup>
              <Label className="fs-12 fw-medium">Customer Account Name *</Label>
              <Input
                bsSize="sm"
                style={{ borderRadius: "3px" }}
                value={convertCompanyName}
                onChange={(e) => setConvertCompanyName(e.target.value)}
                required
              />
            </FormGroup>
          </ModalBody>
          <ModalFooter>
            <Button color="light" size="sm" onClick={() => setConvertModal(false)}>Cancel</Button>
            <Button color="primary" size="sm" onClick={handleConvertLead} disabled={converting} style={{ backgroundColor: "#7f1d1d", borderColor: "#7f1d1d" }}>
              {converting ? <Spinner size="sm" className="me-1" /> : <i className="ri-check-line me-1" />}
              Confirm Convert in DB
            </Button>
          </ModalFooter>
        </Modal>

        {/* Edit Lead Modal */}
        <Modal isOpen={editModal} toggle={() => setEditModal(!editModal)} size="lg" centered>
          <ModalHeader toggle={() => setEditModal(!editModal)} className="bg-light">
            <i className="ri-pencil-line text-primary me-2" />
            Edit Lead
          </ModalHeader>
          <Form onSubmit={saveEdit}>
            <ModalBody>
              {formError ? <Alert color="danger" className="mb-3">{formError}</Alert> : null}
              <Row className="g-3">
                <Col md={6}>
                  <Label className="fs-12 fw-medium">Lead Name *</Label>
                  <Input
                    bsSize="sm"
                    style={{ borderRadius: "3px" }}
                    value={form.leadName}
                    onChange={(e) => setForm({ ...form, leadName: e.target.value })}
                    required
                  />
                </Col>
                <Col md={6}>
                  <Label className="fs-12 fw-medium">Company Name</Label>
                  <Input
                    bsSize="sm"
                    style={{ borderRadius: "3px" }}
                    value={form.companyName}
                    onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                  />
                </Col>
                <Col md={6}>
                  <Label className="fs-12 fw-medium">Mobile *</Label>
                  <Input
                    bsSize="sm"
                    style={{ borderRadius: "3px" }}
                    value={form.mobile}
                    onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                    required
                  />
                </Col>
                <Col md={6}>
                  <Label className="fs-12 fw-medium">Email</Label>
                  <Input
                    bsSize="sm"
                    style={{ borderRadius: "3px" }}
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </Col>
                <Col md={4}>
                  <Label className="fs-12 fw-medium">Status *</Label>
                  <Input
                    type="select"
                    bsSize="sm"
                    style={{ borderRadius: "3px" }}
                    value={form.statusId}
                    onChange={(e) => setForm({ ...form, statusId: e.target.value })}
                    required
                  >
                    <option value="">Select status…</option>
                    {(lookups.leadStatus || []).map((s) => (
                      <option key={s.masterId} value={s.masterId}>{s.masterName}</option>
                    ))}
                  </Input>
                </Col>
                <Col md={4}>
                  <Label className="fs-12 fw-medium">Source</Label>
                  <Input
                    type="select"
                    bsSize="sm"
                    style={{ borderRadius: "3px" }}
                    value={form.sourceId}
                    onChange={(e) => setForm({ ...form, sourceId: e.target.value })}
                  >
                    <option value="">Select source…</option>
                    {(lookups.leadSource || []).map((s) => (
                      <option key={s.masterId} value={s.masterId}>{s.masterName}</option>
                    ))}
                  </Input>
                </Col>
                <Col md={4}>
                  <Label className="fs-12 fw-medium">Rating</Label>
                  <Input
                    type="select"
                    bsSize="sm"
                    style={{ borderRadius: "3px" }}
                    value={form.ratingId}
                    onChange={(e) => setForm({ ...form, ratingId: e.target.value })}
                  >
                    <option value="">Select rating…</option>
                    {(lookups.leadRating || []).map((r) => (
                      <option key={r.masterId} value={r.masterId}>{r.masterName}</option>
                    ))}
                  </Input>
                </Col>
                <Col md={6}>
                  <Label className="fs-12 fw-medium">Estimated Value (₹)</Label>
                  <Input
                    type="number"
                    bsSize="sm"
                    style={{ borderRadius: "3px" }}
                    value={form.estimatedValue}
                    onChange={(e) => setForm({ ...form, estimatedValue: e.target.value })}
                  />
                </Col>
                <Col md={6}>
                  <Label className="fs-12 fw-medium">Owner</Label>
                  <Input
                    type="select"
                    bsSize="sm"
                    style={{ borderRadius: "3px" }}
                    value={form.ownerEmployeeId}
                    onChange={(e) => setForm({ ...form, ownerEmployeeId: e.target.value })}
                  >
                    <option value="">Select owner…</option>
                    {ownerOptions.map((o) => (
                      <option key={o.ownerId} value={o.ownerId}>{o.fullName}</option>
                    ))}
                  </Input>
                </Col>
              </Row>
            </ModalBody>
            <ModalFooter>
              <Button color="light" size="sm" onClick={() => setEditModal(false)}>Cancel</Button>
              <Button color="primary" size="sm" type="submit" disabled={saving} style={{ backgroundColor: "#7f1d1d", borderColor: "#7f1d1d" }}>
                {saving ? <Spinner size="sm" className="me-1" /> : null}
                Save Changes to DB
              </Button>
            </ModalFooter>
          </Form>
        </Modal>

        {/* Delete Confirmation Modal */}
        <DeleteModal
          show={deleteModal}
          onDeleteClick={confirmDelete}
          onCloseClick={() => setDeleteModal(false)}
          isLoading={deleting}
        />
      </Container>
    </div>
  );
};

export default Leads;
