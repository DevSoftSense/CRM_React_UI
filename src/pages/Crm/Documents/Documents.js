import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  CardBody,
  Button,
  Input,
  Table,
  Spinner,
  Dropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
} from "reactstrap";
import ReactApexChart from "react-apexcharts";
import {
  getDocuments,
  getDocumentStats,
  getDocumentLookups,
  getDocumentDownloadUrl,
} from "../../../helpers/crmDocumentApi";
import { toastApiError, toastSuccess } from "../../../helpers/crmToast";
import UploadDocumentModal from "./UploadDocumentModal";
import NewFolderModal from "./NewFolderModal";
import DocumentDetailModal from "./DocumentDetailModal";
import DeleteConfirmModal from "./DeleteConfirmModal";

const TAB_OPTIONS = [
  { id: "all", label: "All Documents" },
  { id: "my", label: "My Documents" },
  { id: "shared", label: "Shared With Me" },
  { id: "recent", label: "Recent" },
  { id: "trash", label: "Trash" },
];

const FILE_TYPE_CONFIG = {
  pdf: { icon: "ri-file-pdf-line", color: "#7f1d1d", bg: "#fef2f2", label: "PDF" },
  xlsx: { icon: "ri-file-excel-line", color: "#10b981", bg: "#ecfdf5", label: "XLSX" },
  xls: { icon: "ri-file-excel-line", color: "#10b981", bg: "#ecfdf5", label: "XLS" },
  csv: { icon: "ri-file-excel-line", color: "#10b981", bg: "#ecfdf5", label: "CSV" },
  docx: { icon: "ri-file-word-line", color: "#475569", bg: "#f1f5f9", label: "DOCX" },
  doc: { icon: "ri-file-word-line", color: "#475569", bg: "#f1f5f9", label: "DOC" },
  pptx: { icon: "ri-file-ppt-line", color: "#d97706", bg: "#fffbeb", label: "PPTX" },
  ppt: { icon: "ri-file-ppt-line", color: "#d97706", bg: "#fffbeb", label: "PPT" },
  zip: { icon: "ri-file-zip-line", color: "#6b21a8", bg: "#faf5ff", label: "ZIP" },
  rar: { icon: "ri-file-zip-line", color: "#6b21a8", bg: "#faf5ff", label: "RAR" },
  png: { icon: "ri-image-line", color: "#0f766e", bg: "#f0fdfa", label: "PNG" },
  jpg: { icon: "ri-image-line", color: "#0f766e", bg: "#f0fdfa", label: "JPG" },
  jpeg: { icon: "ri-image-line", color: "#0f766e", bg: "#f0fdfa", label: "JPEG" },
};

const getFileTypeMeta = (ext) => {
  const norm = String(ext || "").toLowerCase().replace(".", "");
  return (
    FILE_TYPE_CONFIG[norm] || {
      icon: "ri-file-line",
      color: "#64748b",
      bg: "#f8fafc",
      label: (norm || "FILE").toUpperCase(),
    }
  );
};

const Documents = () => {
  document.title = "Documents | SoftOnCloud CRM";

  // Data state
  const [documents, setDocuments] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total_documents: 0,
    used_bytes: 0,
    quota_bytes: 21474836480,
    used_gb: 0,
    quota_gb: 20,
    available_gb: 20,
    used_percentage: 0,
    folders: [],
    recent_activity: [],
    type_distribution: [],
  });
  const [lookups, setLookups] = useState({
    folders: [],
    owners: [],
    accounts: [],
    opportunities: [],
    leads: [],
    types: ["PDF", "DOCX", "XLSX", "PPTX", "ZIP", "PNG", "JPG", "OTHER"],
  });

  // Filter state
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedOwner, setSelectedOwner] = useState("");
  const [selectedFolder, setSelectedFolder] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  // Selection state
  const [selectedDocIds, setSelectedDocIds] = useState([]);

  // Modals state (All strictly in-page)
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [newFolderModalOpen, setNewFolderModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [activeDocForDetail, setActiveDocForDetail] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [activeDocForDelete, setActiveDocForDelete] = useState(null);

  // Header & Row menu states
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [actionMenuOpenId, setActionMenuOpenId] = useState(null);

  // Load Lookups & Stats
  const loadLookupsAndStats = useCallback(async () => {
    try {
      const [statsRes, lookupsRes] = await Promise.all([
        getDocumentStats(),
        getDocumentLookups(),
      ]);
      if (statsRes) setStats(statsRes);
      if (lookupsRes) setLookups(lookupsRes);
    } catch (err) {
      console.error("Failed to load document stats/lookups", err);
    }
  }, []);

  // Load Document List
  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const offset = (page - 1) * pageSize;
      const res = await getDocuments({
        search,
        folder: selectedFolder,
        fileType: selectedType,
        ownerId: selectedOwner ? Number(selectedOwner) : undefined,
        tab: activeTab,
        limit: pageSize,
        offset,
      });

      const items = res?.items || (Array.isArray(res) ? res : []);
      const total = res?.totalCount ?? res?.total_count ?? (items ? items.length : 0);
      setDocuments(items);
      setTotalCount(total);
    } catch (err) {
      toastApiError(err, "Failed to load documents.");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, selectedFolder, selectedType, selectedOwner, activeTab]);

  useEffect(() => {
    loadLookupsAndStats();
  }, [loadLookupsAndStats]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Handle Tab Switch
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setPage(1);
    setSelectedDocIds([]);
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearch("");
    setSelectedType("");
    setSelectedOwner("");
    setSelectedFolder("");
    setPage(1);
  };

  // Selection Checkboxes
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedDocIds(documents.map((d) => d.document_id));
    } else {
      setSelectedDocIds([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedDocIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Donut chart config for Storage Overview (SoftOnCloud Maroon `#7f1d1d`)
  const storagePercentage = Number(stats?.used_percentage || 0);
  const radialChartSeries = [storagePercentage];
  const radialChartOptions = useMemo(
    () => ({
      chart: {
        type: "radialBar",
        sparkline: { enabled: true },
      },
      plotOptions: {
        radialBar: {
          startAngle: -110,
          endAngle: 110,
          hollow: {
            margin: 0,
            size: "68%",
          },
          track: {
            background: "#e2e8f0",
            strokeWidth: "100%",
            margin: 0,
          },
          dataLabels: {
            name: { show: false },
            value: {
              offsetY: 6,
              fontSize: "17px",
              fontWeight: 700,
              color: "#1e293b",
              formatter: function (val) {
                return (val || 0) + "% Used";
              },
            },
          },
        },
      },
      fill: {
        colors: ["#7f1d1d"],
      },
      stroke: {
        lineCap: "round",
      },
      labels: ["Used"],
    }),
    []
  );

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // Resolved folders list from stats or lookups
  const displayFolders = useMemo(() => {
    if (stats?.folders && stats.folders.length > 0) return stats.folders;
    if (lookups?.folders && lookups.folders.length > 0) return lookups.folders;
    return [];
  }, [stats?.folders, lookups?.folders]);

  // File Type Distribution mapping (Theme-aligned palette)
  const distributionList = useMemo(() => {
    const backendDist = stats?.type_distribution || [];
    const defaults = [
      { file_type: "PDF", count: 0, color: "#7f1d1d" },
      { file_type: "DOCX", count: 0, color: "#475569" },
      { file_type: "XLSX", count: 0, color: "#10b981" },
      { file_type: "PPTX", count: 0, color: "#d97706" },
      { file_type: "Others", count: 0, color: "#94a3b8" },
    ];

    if (backendDist.length === 0) return defaults;

    return defaults.map((def) => {
      const match = backendDist.find(
        (b) =>
          b.file_type?.toLowerCase() === def.file_type.toLowerCase() ||
          (def.file_type === "Others" &&
            !["pdf", "docx", "xlsx", "pptx"].includes(b.file_type?.toLowerCase()))
      );
      return {
        ...def,
        count: match ? match.count : 0,
      };
    });
  }, [stats?.type_distribution]);

  return (
    <div className="page-content" style={{ backgroundColor: "#f8fafc", minHeight: "100vh" }}>
      <Container fluid className="px-4 py-3">
        {/* Top Header Row */}
        <Row className="align-items-center mb-3">
          <Col sm={6}>
            <div>
              <h4 className="fw-bold text-dark mb-1" style={{ fontSize: "22px" }}>
                Documents
              </h4>
              <p className="text-muted small mb-0">Store, manage and share important files</p>
            </div>
          </Col>
          <Col sm={6} className="text-sm-end mt-3 mt-sm-0 d-flex justify-content-sm-end gap-2">
            <Button
              type="button"
              className="rounded-0 text-white d-flex align-items-center gap-2 px-3 py-2 fw-semibold"
              style={{ backgroundColor: "#7f1d1d", borderColor: "#7f1d1d" }}
              onClick={() => setUploadModalOpen(true)}
            >
              <i className="ri-add-line fs-16" /> Upload Document
            </Button>
            <Button
              type="button"
              color="light"
              className="rounded-0 border d-flex align-items-center gap-2 px-3 py-2 text-dark bg-white"
              onClick={() => setNewFolderModalOpen(true)}
            >
              <i className="ri-folder-add-line text-muted" /> New Folder
            </Button>

            {/* Header More Dropdown (matching mockup) */}
            <Dropdown
              isOpen={headerMenuOpen}
              toggle={() => setHeaderMenuOpen((prev) => !prev)}
            >
              <DropdownToggle
                tag="button"
                className="btn btn-light rounded-0 border px-3 text-muted bg-white d-flex align-items-center justify-content-center"
                style={{ height: "38px" }}
              >
                <i className="ri-more-fill fs-16" />
              </DropdownToggle>
              <DropdownMenu end className="rounded-0 shadow-sm border">
                <DropdownItem
                  onClick={() => {
                    fetchDocuments();
                    loadLookupsAndStats();
                    toastSuccess("Documents refreshed.");
                  }}
                  className="small"
                >
                  <i className="ri-refresh-line me-2 text-muted" /> Refresh Data
                </DropdownItem>
                <DropdownItem onClick={handleResetFilters} className="small">
                  <i className="ri-filter-off-line me-2 text-muted" /> Clear Filters
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </Col>
        </Row>

        {/* Main 2-Column Content Layout */}
        <Row className="g-4">
          {/* Left Column: Tabs, Filters, Table (Approx 72% width) */}
          <Col lg={8} xl={9}>
            <Card className="rounded-0 border bg-white shadow-sm mb-4">
              <CardBody className="p-0">
                {/* Tabs Row */}
                <div className="d-flex align-items-center border-bottom px-4 pt-2 gap-4 overflow-auto">
                  {TAB_OPTIONS.map((t) => {
                    const isActive = activeTab === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleTabChange(t.id)}
                        className="btn btn-link text-decoration-none px-2 py-3 rounded-0 fw-semibold position-relative"
                        style={{
                          color: isActive ? "#7f1d1d" : "#64748b",
                          borderBottom: isActive ? "3px solid #7f1d1d" : "3px solid transparent",
                          fontSize: "14px",
                        }}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>

                {/* Filter Toolbar */}
                <div className="p-3 bg-light border-bottom">
                  <Row className="g-2 align-items-center">
                    {/* Search Input */}
                    <Col md={4} sm={12}>
                      <div className="position-relative">
                        <Input
                          type="text"
                          className="rounded-0 ps-5 bg-white border"
                          placeholder="Search documents..."
                          value={search}
                          onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                          }}
                          style={{ height: "38px" }}
                        />
                        <i
                          className="ri-search-line position-absolute text-muted"
                          style={{ left: "14px", top: "10px", fontSize: "16px" }}
                        />
                      </div>
                    </Col>

                    {/* Type Filter */}
                    <Col md={2} sm={4}>
                      <Input
                        type="select"
                        className="rounded-0 bg-white border"
                        value={selectedType}
                        onChange={(e) => {
                          setSelectedType(e.target.value);
                          setPage(1);
                        }}
                        style={{ height: "38px" }}
                      >
                        <option value="">All Types</option>
                        <option value="PDF">PDF</option>
                        <option value="DOCX">DOCX</option>
                        <option value="XLSX">XLSX</option>
                        <option value="PPTX">PPTX</option>
                        <option value="ZIP">ZIP</option>
                        <option value="PNG">PNG / Image</option>
                      </Input>
                    </Col>

                    {/* Owner Filter */}
                    <Col md={3} sm={4}>
                      <Input
                        type="select"
                        className="rounded-0 bg-white border"
                        value={selectedOwner}
                        onChange={(e) => {
                          setSelectedOwner(e.target.value);
                          setPage(1);
                        }}
                        style={{ height: "38px" }}
                      >
                        <option value="">All Owners</option>
                        {lookups.owners.map((o) => (
                          <option key={o.employee_id} value={o.employee_id}>
                            {o.full_name}
                          </option>
                        ))}
                      </Input>
                    </Col>

                    {/* Folder Filter */}
                    <Col md={2} sm={4}>
                      <Input
                        type="select"
                        className="rounded-0 bg-white border"
                        value={selectedFolder}
                        onChange={(e) => {
                          setSelectedFolder(e.target.value);
                          setPage(1);
                        }}
                        style={{ height: "38px" }}
                      >
                        <option value="">All Folders</option>
                        {displayFolders.map((f) => (
                          <option key={f.folder_id || f.folder_name} value={f.folder_name}>
                            {f.folder_name}
                          </option>
                        ))}
                      </Input>
                    </Col>

                    {/* Reset Button */}
                    <Col md={1} sm={12} className="text-end">
                      <Button
                        type="button"
                        color="light"
                        className="rounded-0 border w-100 bg-white"
                        onClick={handleResetFilters}
                        title="Clear Filters"
                        style={{ height: "38px" }}
                      >
                        <i className="ri-filter-off-line text-muted" />
                      </Button>
                    </Col>
                  </Row>
                </div>

                {/* Documents Table */}
                <div className="table-responsive" style={{ minHeight: "360px" }}>
                  {loading ? (
                    <div className="text-center py-5">
                      <Spinner style={{ color: "#7f1d1d" }} />
                      <p className="text-muted small mt-2">Loading documents...</p>
                    </div>
                  ) : documents.length === 0 ? (
                    <div className="text-center py-5">
                      <div
                        className="mx-auto mb-3 d-flex align-items-center justify-content-center"
                        style={{
                          width: "64px",
                          height: "64px",
                          backgroundColor: "#fef2f2",
                          borderRadius: 0,
                          color: "#7f1d1d",
                          fontSize: "32px",
                        }}
                      >
                        <i className="ri-folder-open-line" />
                      </div>
                      <h5 className="fw-bold text-dark mb-1">No documents found</h5>
                      <p className="text-muted small mb-3">
                        {search || selectedFolder || selectedType || selectedOwner
                          ? "Try adjusting your filters or search term."
                          : "Upload your first file to keep sales assets organized."}
                      </p>
                      <Button
                        type="button"
                        className="rounded-0 text-white px-4 fw-semibold"
                        style={{ backgroundColor: "#7f1d1d", borderColor: "#7f1d1d" }}
                        onClick={() => setUploadModalOpen(true)}
                      >
                        <i className="ri-add-line me-1" /> Upload Document
                      </Button>
                    </div>
                  ) : (
                    <Table hover className="align-middle mb-0 table-nowrap">
                      <thead className="table-light text-muted small text-uppercase">
                        <tr>
                          <th style={{ width: "40px" }} className="text-center">
                            <Input
                              type="checkbox"
                              className="rounded-0"
                              checked={
                                documents.length > 0 &&
                                selectedDocIds.length === documents.length
                              }
                              onChange={handleSelectAll}
                            />
                          </th>
                          <th style={{ minWidth: "220px" }}>Document Name</th>
                          <th>Folder</th>
                          <th>Related To</th>
                          <th>Type</th>
                          <th>Size</th>
                          <th>Owner</th>
                          <th>Modified On</th>
                          <th className="text-end" style={{ width: "100px" }}>
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {documents.map((doc) => {
                          const meta = getFileTypeMeta(doc.file_type);
                          const isSelected = selectedDocIds.includes(doc.document_id);
                          const downloadUrl = getDocumentDownloadUrl(doc.document_id);

                          return (
                            <tr key={doc.document_id} className={isSelected ? "table-active" : ""}>
                              {/* Checkbox */}
                              <td className="text-center">
                                <Input
                                  type="checkbox"
                                  className="rounded-0"
                                  checked={isSelected}
                                  onChange={() => handleSelectOne(doc.document_id)}
                                />
                              </td>

                              {/* Document Name */}
                              <td>
                                <div className="d-flex align-items-center gap-3">
                                  <div
                                    className="d-flex align-items-center justify-content-center flex-shrink-0"
                                    style={{
                                      width: "38px",
                                      height: "38px",
                                      backgroundColor: meta.bg,
                                      color: meta.color,
                                      fontSize: "20px",
                                      borderRadius: 0,
                                    }}
                                  >
                                    <i className={meta.icon} />
                                  </div>
                                  <div className="overflow-hidden">
                                    <button
                                      type="button"
                                      className="btn btn-link p-0 text-decoration-none text-start d-block fw-semibold text-dark text-truncate"
                                      style={{ maxWidth: "240px", fontSize: "14px" }}
                                      onClick={() => {
                                        setActiveDocForDetail(doc);
                                        setDetailModalOpen(true);
                                      }}
                                    >
                                      {doc.file_name}
                                    </button>
                                    <span
                                      className="text-muted small text-truncate d-block"
                                      style={{ maxWidth: "240px", fontSize: "12px" }}
                                    >
                                      {doc.description || "No description"}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              {/* Folder */}
                              <td>
                                <span className="text-dark small d-flex align-items-center gap-1">
                                  <i className="ri-folder-line text-muted" />
                                  {doc.folder_name || "General"}
                                </span>
                              </td>

                              {/* Related To */}
                              <td>
                                <span
                                  className="small fw-semibold"
                                  style={{ color: "#7f1d1d", cursor: "pointer" }}
                                  onClick={() => {
                                    setActiveDocForDetail(doc);
                                    setDetailModalOpen(true);
                                  }}
                                >
                                  {doc.related_to || "All Customers"}
                                </span>
                              </td>

                              {/* Type Badge (Square, no bootstrap blue) */}
                              <td>
                                <span
                                  className="rounded-0 px-2 py-1 fw-bold text-uppercase d-inline-block"
                                  style={{
                                    backgroundColor: meta.bg,
                                    color: meta.color,
                                    border: `1px solid ${meta.color}40`,
                                    fontSize: "11px",
                                    letterSpacing: "0.5px",
                                  }}
                                >
                                  {meta.label}
                                </span>
                              </td>

                              {/* Size */}
                              <td className="text-muted small">
                                {doc.file_size_label || "—"}
                              </td>

                              {/* Owner */}
                              <td>
                                <div className="d-flex align-items-center gap-2">
                                  <div
                                    className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold flex-shrink-0"
                                    style={{
                                      width: "26px",
                                      height: "26px",
                                      backgroundColor: "#7f1d1d",
                                      fontSize: "11px",
                                    }}
                                  >
                                    {(doc.owner_name || "U").charAt(0).toUpperCase()}
                                  </div>
                                  <span className="small text-dark fw-medium">
                                    {doc.owner_name || "Staff"}
                                  </span>
                                </div>
                              </td>

                              {/* Modified On */}
                              <td className="text-muted small">
                                {doc.modified_label ||
                                  (doc.modified_on ? new Date(doc.modified_on).toLocaleDateString() : "—")}
                              </td>

                              {/* Actions */}
                              <td className="text-end">
                                <div className="d-flex align-items-center justify-content-end gap-1">
                                  {/* Download button */}
                                  <a
                                    href={downloadUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="btn btn-sm btn-light rounded-0 text-muted border p-1 px-2"
                                    title="Download"
                                  >
                                    <i className="ri-download-2-line" />
                                  </a>

                                  {/* More actions dropdown */}
                                  <Dropdown
                                    isOpen={actionMenuOpenId === doc.document_id}
                                    toggle={() =>
                                      setActionMenuOpenId((prev) =>
                                        prev === doc.document_id ? null : doc.document_id
                                      )
                                    }
                                  >
                                    <DropdownToggle
                                      tag="button"
                                      className="btn btn-sm btn-light rounded-0 text-muted border p-1 px-2"
                                    >
                                      <i className="ri-more-fill" />
                                    </DropdownToggle>
                                    <DropdownMenu end className="rounded-0 shadow-sm border">
                                      <DropdownItem
                                        onClick={() => {
                                          setActiveDocForDetail(doc);
                                          setDetailModalOpen(true);
                                        }}
                                        className="small"
                                      >
                                        <i className="ri-eye-line me-2 text-muted" /> View Details
                                      </DropdownItem>
                                      <DropdownItem
                                        href={downloadUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="small"
                                      >
                                        <i className="ri-download-line me-2 text-muted" /> Download
                                      </DropdownItem>
                                      <DropdownItem divider />
                                      <DropdownItem
                                        className="text-danger small"
                                        onClick={() => {
                                          setActiveDocForDelete(doc);
                                          setDeleteModalOpen(true);
                                        }}
                                      >
                                        <i className="ri-delete-bin-line me-2" /> Delete
                                      </DropdownItem>
                                    </DropdownMenu>
                                  </Dropdown>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </Table>
                  )}
                </div>

                {/* Table Footer: Pagination & Page Size */}
                <div className="d-flex align-items-center justify-content-between p-3 border-top bg-light flex-wrap gap-2">
                  <div className="text-muted small">
                    Showing {totalCount === 0 ? 0 : (page - 1) * pageSize + 1} to{" "}
                    {Math.min(page * pageSize, totalCount)} of {totalCount} documents
                  </div>

                  <div className="d-flex align-items-center gap-2">
                    {/* Page buttons */}
                    <div className="btn-group rounded-0" role="group">
                      <Button
                        type="button"
                        color="light"
                        size="sm"
                        className="rounded-0 border bg-white"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                      >
                        ‹
                      </Button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .slice(Math.max(0, page - 3), Math.min(totalPages, page + 2))
                        .map((p) => (
                          <Button
                            key={p}
                            type="button"
                            size="sm"
                            className="rounded-0 border"
                            style={{
                              backgroundColor: p === page ? "#7f1d1d" : "#ffffff",
                              borderColor: p === page ? "#7f1d1d" : "#e2e8f0",
                              color: p === page ? "#ffffff" : "#334155",
                              fontWeight: p === page ? 600 : 400,
                            }}
                            onClick={() => setPage(p)}
                          >
                            {p}
                          </Button>
                        ))}
                      <Button
                        type="button"
                        color="light"
                        size="sm"
                        className="rounded-0 border bg-white"
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      >
                        ›
                      </Button>
                    </div>

                    {/* Page Size select */}
                    <Input
                      type="select"
                      className="rounded-0 form-select-sm border bg-white"
                      style={{ width: "110px" }}
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setPage(1);
                      }}
                    >
                      <option value={10}>10 / page</option>
                      <option value={25}>25 / page</option>
                      <option value={50}>50 / page</option>
                    </Input>
                  </div>
                </div>
              </CardBody>
            </Card>
          </Col>

          {/* Right Column: Storage Overview, Folders, Activity, Type Distribution (Approx 28% width) */}
          <Col lg={4} xl={3}>
            {/* 1. Storage Overview Card */}
            <Card className="rounded-0 border bg-white shadow-sm mb-4">
              <CardBody className="p-3">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <h6 className="fw-bold text-dark mb-0" style={{ fontSize: "14px" }}>
                    Storage Overview
                  </h6>
                  <button
                    type="button"
                    className="btn btn-link p-0 text-decoration-none small fw-semibold"
                    style={{ color: "#7f1d1d" }}
                    onClick={() => toastSuccess(`Storage Quota: ${stats.quota_gb ?? 20} GB`)}
                  >
                    Manage
                  </button>
                </div>

                <div className="d-flex align-items-center justify-content-between py-2">
                  <div style={{ width: "110px", height: "110px" }}>
                    <ReactApexChart
                      options={radialChartOptions}
                      series={radialChartSeries}
                      type="radialBar"
                      height={130}
                    />
                  </div>
                  <div className="flex-grow-1 ps-3">
                    <div className="fw-bold text-dark" style={{ fontSize: "16px" }}>
                      {Number(stats.used_gb || 0).toFixed(2)} GB Used
                    </div>
                    <div className="text-muted small">
                      of {Number(stats.quota_gb || 20).toFixed(0)} GB
                    </div>
                    {/* Linear bar (Maroon accent) */}
                    <div className="progress rounded-0 mt-2" style={{ height: "6px", backgroundColor: "#f1f5f9" }}>
                      <div
                        className="progress-bar"
                        role="progressbar"
                        style={{
                          width: `${Math.min(100, Math.max(storagePercentage, 2))}%`,
                          backgroundColor: "#7f1d1d",
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Storage Legend */}
                <div className="border-top pt-2 mt-2">
                  <div className="d-flex align-items-center justify-content-between py-1 small">
                    <span className="d-flex align-items-center gap-2 text-muted">
                      <span
                        className="rounded-circle"
                        style={{ width: "8px", height: "8px", backgroundColor: "#7f1d1d" }}
                      />
                      Documents
                    </span>
                    <span className="fw-semibold text-dark">
                      {Number(stats.used_gb || 0).toFixed(2)} GB
                    </span>
                  </div>
                  <div className="d-flex align-items-center justify-content-between py-1 small">
                    <span className="d-flex align-items-center gap-2 text-muted">
                      <span
                        className="rounded-circle"
                        style={{ width: "8px", height: "8px", backgroundColor: "#cbd5e1" }}
                      />
                      Available
                    </span>
                    <span className="fw-semibold text-dark">
                      {Number(stats.available_gb || 20).toFixed(2)} GB
                    </span>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* 2. Document Folders Card */}
            <Card className="rounded-0 border bg-white shadow-sm mb-4">
              <CardBody className="p-3">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <h6 className="fw-bold text-dark mb-0" style={{ fontSize: "14px" }}>
                    Document Folders
                  </h6>
                  <button
                    type="button"
                    className="btn btn-link p-0 text-decoration-none small fw-semibold"
                    style={{ color: "#7f1d1d" }}
                    onClick={() => setNewFolderModalOpen(true)}
                  >
                    + New Folder
                  </button>
                </div>

                <div className="d-flex flex-column gap-2">
                  {displayFolders.length === 0 ? (
                    <p className="text-muted small mb-0 py-2 text-center">No folders available</p>
                  ) : (
                    displayFolders.slice(0, 8).map((fc) => {
                      const isFilterActive = selectedFolder === fc.folder_name;
                      return (
                        <div
                          key={fc.folder_id || fc.folder_name}
                          onClick={() => {
                            setSelectedFolder(isFilterActive ? "" : fc.folder_name);
                            setPage(1);
                          }}
                          className="d-flex align-items-center justify-content-between px-2 py-2 rounded-0 border"
                          style={{
                            cursor: "pointer",
                            backgroundColor: isFilterActive ? "#fef2f2" : "#f8fafc",
                            borderColor: isFilterActive ? "#7f1d1d" : "#e2e8f0",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <span className="d-flex align-items-center gap-2 small fw-medium text-dark">
                            <i
                              className="ri-folder-2-line"
                              style={{ color: isFilterActive ? "#7f1d1d" : "#64748b" }}
                            />
                            {fc.folder_name}
                          </span>
                          <span
                            className="rounded-0 px-2 py-1 fw-semibold text-center"
                            style={{
                              backgroundColor: isFilterActive ? "#7f1d1d" : "#f1f5f9",
                              color: isFilterActive ? "#ffffff" : "#475569",
                              border: isFilterActive ? "1px solid #7f1d1d" : "1px solid #e2e8f0",
                              fontSize: "11px",
                              minWidth: "22px",
                              display: "inline-block",
                            }}
                          >
                            {fc.doc_count ?? 0}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>

                {displayFolders.length > 8 && (
                  <button
                    type="button"
                    className="btn btn-link p-0 text-decoration-none small text-muted mt-2 d-block"
                    onClick={() => setSelectedFolder("")}
                  >
                    View All Folders →
                  </button>
                )}
              </CardBody>
            </Card>

            {/* 3. Recent Activity Card */}
            <Card className="rounded-0 border bg-white shadow-sm mb-4">
              <CardBody className="p-3">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <h6 className="fw-bold text-dark mb-0" style={{ fontSize: "14px" }}>
                    Recent Activity
                  </h6>
                  <button
                    type="button"
                    className="btn btn-link p-0 text-decoration-none small text-muted"
                    onClick={loadLookupsAndStats}
                  >
                    Refresh
                  </button>
                </div>

                <div className="d-flex flex-column gap-3">
                  {(stats?.recent_activity || []).length === 0 ? (
                    <div className="text-center py-2 text-muted small">
                      <i className="ri-history-line fs-18 d-block mb-1 text-muted" />
                      No recent activity yet
                    </div>
                  ) : (
                    stats.recent_activity.slice(0, 5).map((act) => {
                      const isUpload = (act.title || "").toLowerCase().includes("upload");
                      return (
                        <div key={act.activity_id} className="d-flex align-items-start gap-2">
                          <div
                            className="d-flex align-items-center justify-content-center flex-shrink-0 mt-1"
                            style={{
                              width: "28px",
                              height: "28px",
                              backgroundColor: isUpload ? "#ecfdf5" : "#fef2f2",
                              color: isUpload ? "#10b981" : "#7f1d1d",
                              fontSize: "14px",
                            }}
                          >
                            <i
                              className={
                                isUpload
                                  ? "ri-upload-2-line"
                                  : "ri-download-2-line"
                              }
                            />
                          </div>
                          <div className="flex-grow-1 overflow-hidden">
                            <div className="small text-dark text-truncate">
                              <strong>{act.employee_name}</strong> {act.title}
                            </div>
                            {act.description && (
                              <div
                                className="text-truncate fw-medium"
                                style={{ fontSize: "12px", color: "#7f1d1d" }}
                              >
                                {act.description}
                              </div>
                            )}
                            <div className="text-muted" style={{ fontSize: "11px" }}>
                              {act.time_label}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardBody>
            </Card>

            {/* 4. File Type Distribution Card */}
            <Card className="rounded-0 border bg-white shadow-sm mb-4">
              <CardBody className="p-3">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <h6 className="fw-bold text-dark mb-0" style={{ fontSize: "14px" }}>
                    File Type Distribution
                  </h6>
                  <span className="text-muted small">All Time</span>
                </div>

                <div className="d-flex flex-column gap-3">
                  {distributionList.map((dist) => {
                    const totalDocs = totalCount || 1;
                    const percent =
                      totalCount > 0 ? Math.round((dist.count / totalDocs) * 100) : 0;

                    return (
                      <div key={dist.file_type}>
                        <div className="d-flex align-items-center justify-content-between small mb-1">
                          <span className="fw-semibold text-dark">{dist.file_type}</span>
                          <span className="text-muted">{dist.count}</span>
                        </div>
                        <div className="progress rounded-0" style={{ height: "6px", backgroundColor: "#f1f5f9" }}>
                          <div
                            className="progress-bar"
                            role="progressbar"
                            style={{
                              width: `${percent > 0 ? Math.max(6, percent) : 0}%`,
                              backgroundColor: dist.color,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* In-Page Modals */}
      <UploadDocumentModal
        isOpen={uploadModalOpen}
        toggle={() => setUploadModalOpen(false)}
        folders={displayFolders}
        owners={lookups.owners}
        accounts={lookups.accounts}
        opportunities={lookups.opportunities}
        leads={lookups.leads}
        onSuccess={() => {
          fetchDocuments();
          loadLookupsAndStats();
        }}
      />

      <NewFolderModal
        isOpen={newFolderModalOpen}
        toggle={() => setNewFolderModalOpen(false)}
        onSuccess={() => {
          loadLookupsAndStats();
        }}
      />

      <DocumentDetailModal
        isOpen={detailModalOpen}
        toggle={() => {
          setDetailModalOpen(false);
          setActiveDocForDetail(null);
        }}
        document={activeDocForDetail}
        onDelete={(doc) => {
          setActiveDocForDelete(doc);
          setDeleteModalOpen(true);
        }}
      />

      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        toggle={() => {
          setDeleteModalOpen(false);
          setActiveDocForDelete(null);
        }}
        document={activeDocForDelete}
        onSuccess={() => {
          fetchDocuments();
          loadLookupsAndStats();
        }}
      />
    </div>
  );
};

export default Documents;
