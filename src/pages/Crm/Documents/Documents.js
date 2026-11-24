import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
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
  downloadDocumentBlob,
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

const FILE_TYPE_CONFIG_LIGHT = {
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

const FILE_TYPE_CONFIG_DARK = {
  pdf: { icon: "ri-file-pdf-line", color: "#f87171", bg: "rgba(239, 68, 68, 0.2)", label: "PDF" },
  xlsx: { icon: "ri-file-excel-line", color: "#34d399", bg: "rgba(16, 185, 129, 0.2)", label: "XLSX" },
  xls: { icon: "ri-file-excel-line", color: "#34d399", bg: "rgba(16, 185, 129, 0.2)", label: "XLS" },
  csv: { icon: "ri-file-excel-line", color: "#34d399", bg: "rgba(16, 185, 129, 0.2)", label: "CSV" },
  docx: { icon: "ri-file-word-line", color: "#94a3b8", bg: "rgba(148, 163, 184, 0.2)", label: "DOCX" },
  doc: { icon: "ri-file-word-line", color: "#94a3b8", bg: "rgba(148, 163, 184, 0.2)", label: "DOC" },
  pptx: { icon: "ri-file-ppt-line", color: "#fbbf24", bg: "rgba(245, 158, 11, 0.2)", label: "PPTX" },
  ppt: { icon: "ri-file-ppt-line", color: "#fbbf24", bg: "rgba(245, 158, 11, 0.2)", label: "PPT" },
  zip: { icon: "ri-file-zip-line", color: "#c084fc", bg: "rgba(168, 85, 247, 0.2)", label: "ZIP" },
  rar: { icon: "ri-file-zip-line", color: "#c084fc", bg: "rgba(168, 85, 247, 0.2)", label: "RAR" },
  png: { icon: "ri-image-line", color: "#2dd4bf", bg: "rgba(20, 184, 166, 0.2)", label: "PNG" },
  jpg: { icon: "ri-image-line", color: "#2dd4bf", bg: "rgba(20, 184, 166, 0.2)", label: "JPG" },
  jpeg: { icon: "ri-image-line", color: "#2dd4bf", bg: "rgba(20, 184, 166, 0.2)", label: "JPEG" },
};

const getFileTypeMeta = (ext, isDark = false) => {
  const norm = String(ext || "").toLowerCase().replace(".", "");
  const config = isDark ? FILE_TYPE_CONFIG_DARK : FILE_TYPE_CONFIG_LIGHT;
  return (
    config[norm] || {
      icon: "ri-file-line",
      color: isDark ? "#94a3b8" : "#64748b",
      bg: isDark ? "rgba(148, 163, 184, 0.15)" : "#f8fafc",
      label: (norm || "FILE").toUpperCase(),
    }
  );
};

const formatStorageAmount = (usedGb, usedBytes) => {
  if (usedBytes && usedBytes > 0 && Number(usedGb || 0) < 0.01) {
    const mb = (usedBytes / (1024 * 1024)).toFixed(2);
    return `${mb} MB`;
  }
  return `${Number(usedGb || 0).toFixed(2)} GB`;
};

const Documents = () => {
  document.title = "Documents | SoftOnCloud CRM";

  const layoutModeType = useSelector(
    (state) => state.Layout.layoutModeType
  );
  const isDark = layoutModeType === "dark";

  // Dynamic Theme Palette
  const cardBg = isDark ? "#121212" : "#ffffff";
  const cardBorder = isDark ? "#2d3748" : "#e2e8f0";
  const subtleBg = isDark ? "#1a202c" : "#f8fafc";
  const subtleBorder = isDark ? "#334155" : "#cbd5e1";
  const textTitle = isDark ? "#f8fafc" : "#0f172a";
  const textSub = isDark ? "#94a3b8" : "#64748b";
  const primaryColor = isDark ? "#fca5a5" : "#7f1d1d";

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

  // Header menu & sidebar folder expansion
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [showAllFolders, setShowAllFolders] = useState(false);

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
            background: isDark ? "#21262d" : "#e2e8f0",
            strokeWidth: "100%",
            margin: 0,
          },
          dataLabels: {
            name: { show: false },
            value: {
              offsetY: 6,
              fontSize: "17px",
              fontWeight: 700,
              color: isDark ? "#f8fafc" : "#1e293b",
              formatter: function (val) {
                return (val || 0) + "% Used";
              },
            },
          },
        },
      },
      fill: {
        colors: [isDark ? "#f87171" : "#7f1d1d"],
      },
      stroke: {
        lineCap: "round",
      },
      labels: ["Used"],
    }),
    [isDark]
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
      { file_type: "PDF", count: 0, color: isDark ? "#f87171" : "#7f1d1d" },
      { file_type: "DOCX", count: 0, color: isDark ? "#94a3b8" : "#475569" },
      { file_type: "XLSX", count: 0, color: isDark ? "#34d399" : "#10b981" },
      { file_type: "PPTX", count: 0, color: isDark ? "#fbbf24" : "#d97706" },
      { file_type: "Others", count: 0, color: isDark ? "#64748b" : "#94a3b8" },
    ];

    if (backendDist.length === 0) return defaults;

    return defaults.map((def) => {
      if (def.file_type === "Others") {
        const othersCount = backendDist
          .filter((b) => !["pdf", "docx", "xlsx", "pptx"].includes(String(b.file_type || "").toLowerCase()))
          .reduce((sum, b) => sum + Number(b.count || 0), 0);
        return { ...def, count: othersCount };
      }
      const match = backendDist.find(
        (b) => String(b.file_type || "").toLowerCase() === def.file_type.toLowerCase()
      );
      return {
        ...def,
        count: match ? Number(match.count || 0) : 0,
      };
    });
  }, [stats?.type_distribution, isDark]);

  const handleDownloadDocument = async (doc) => {
    try {
      await downloadDocumentBlob(doc.document_id, doc.file_name);
    } catch (err) {
      toastApiError(err, "Failed to download document.");
    }
  };

  return (
    <div className="page-content" style={{ backgroundColor: isDark ? "#0d1117" : "#f8fafc", minHeight: "100vh" }}>
      <Container fluid className="px-4 py-3">
        {/* Top Header Row */}
        <Row className="align-items-center mb-3">
          <Col sm={6}>
            <div>
              <h4 className="fw-bold mb-1" style={{ fontSize: "22px", color: textTitle }}>
                Documents
              </h4>
              <p className="small mb-0" style={{ color: textSub }}>Store, manage and share important files</p>
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
              className="rounded-0 border d-flex align-items-center gap-2 px-3 py-2"
              style={{
                backgroundColor: subtleBg,
                borderColor: subtleBorder,
                color: textTitle,
              }}
              onClick={() => setNewFolderModalOpen(true)}
            >
              <i className="ri-folder-add-line" style={{ color: textSub }} /> New Folder
            </Button>

            {/* Header More Dropdown (matching mockup) */}
            <Dropdown
              isOpen={headerMenuOpen}
              toggle={() => setHeaderMenuOpen((prev) => !prev)}
            >
              <DropdownToggle
                tag="button"
                className="btn rounded-0 border px-3 d-flex align-items-center justify-content-center"
                style={{
                  height: "38px",
                  backgroundColor: subtleBg,
                  borderColor: subtleBorder,
                  color: textSub,
                }}
              >
                <i className="ri-more-fill fs-16" />
              </DropdownToggle>
              <DropdownMenu end className="rounded-0 shadow-sm border" style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
                <DropdownItem
                  onClick={() => {
                    fetchDocuments();
                    loadLookupsAndStats();
                    toastSuccess("Documents refreshed.");
                  }}
                  className="small"
                  style={{ color: textTitle }}
                >
                  <i className="ri-refresh-line me-2" style={{ color: textSub }} /> Refresh Data
                </DropdownItem>
                <DropdownItem onClick={handleResetFilters} className="small" style={{ color: textTitle }}>
                  <i className="ri-filter-off-line me-2" style={{ color: textSub }} /> Clear Filters
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </Col>
        </Row>

        {/* Main 2-Column Content Layout */}
        <Row className="g-4">
          {/* Left Column: Tabs, Filters, Table (Approx 72% width) */}
          <Col lg={8} xl={9}>
            <Card className="rounded-0 border shadow-sm mb-4" style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
              <CardBody className="p-0">
                {/* Tabs Row */}
                <div className="d-flex align-items-center border-bottom px-4 pt-2 gap-4 overflow-auto" style={{ borderColor: cardBorder }}>
                  {TAB_OPTIONS.map((t) => {
                    const isActive = activeTab === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleTabChange(t.id)}
                        className="btn btn-link text-decoration-none px-2 py-3 rounded-0 fw-semibold position-relative"
                        style={{
                          color: isActive ? primaryColor : textSub,
                          borderBottom: isActive ? `3px solid ${primaryColor}` : "3px solid transparent",
                          fontSize: "14px",
                        }}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>

                {/* Filter Toolbar */}
                <div className="p-3 border-bottom" style={{ backgroundColor: subtleBg, borderColor: cardBorder }}>
                  <Row className="g-2 align-items-center">
                    {/* Search Input */}
                    <Col md={4} sm={12}>
                      <div className="position-relative">
                        <Input
                          type="text"
                          className="rounded-0 ps-5 border"
                          placeholder="Search documents..."
                          value={search}
                          onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                          }}
                          style={{
                            height: "38px",
                            backgroundColor: isDark ? "#121212" : "#ffffff",
                            borderColor: subtleBorder,
                            color: textTitle,
                          }}
                        />
                        <i
                          className="ri-search-line position-absolute"
                          style={{ left: "14px", top: "10px", fontSize: "16px", color: textSub }}
                        />
                      </div>
                    </Col>

                    {/* Type Filter */}
                    <Col md={2} sm={4}>
                      <Input
                        type="select"
                        className="rounded-0 border"
                        value={selectedType}
                        onChange={(e) => {
                          setSelectedType(e.target.value);
                          setPage(1);
                        }}
                        style={{
                          height: "38px",
                          backgroundColor: isDark ? "#121212" : "#ffffff",
                          borderColor: subtleBorder,
                          color: textTitle,
                        }}
                      >
                        <option value="">All Types</option>
                        {(lookups.types && lookups.types.length > 0
                          ? lookups.types
                          : ["PDF", "DOCX", "XLSX", "PPTX", "ZIP", "PNG", "JPG", "OTHER"]
                        ).map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </Input>
                    </Col>

                    {/* Owner Filter */}
                    <Col md={3} sm={4}>
                      <Input
                        type="select"
                        className="rounded-0 border"
                        value={selectedOwner}
                        onChange={(e) => {
                          setSelectedOwner(e.target.value);
                          setPage(1);
                        }}
                        style={{
                          height: "38px",
                          backgroundColor: isDark ? "#121212" : "#ffffff",
                          borderColor: subtleBorder,
                          color: textTitle,
                        }}
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
                        className="rounded-0 border"
                        value={selectedFolder}
                        onChange={(e) => {
                          setSelectedFolder(e.target.value);
                          setPage(1);
                        }}
                        style={{
                          height: "38px",
                          backgroundColor: isDark ? "#121212" : "#ffffff",
                          borderColor: subtleBorder,
                          color: textTitle,
                        }}
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
                        className="rounded-0 border w-100"
                        onClick={handleResetFilters}
                        title="Clear Filters"
                        style={{
                          height: "38px",
                          backgroundColor: isDark ? "#121212" : "#ffffff",
                          borderColor: subtleBorder,
                          color: textSub,
                        }}
                      >
                        <i className="ri-filter-off-line" style={{ color: textSub }} />
                      </Button>
                    </Col>
                  </Row>
                </div>

                {/* Documents Table */}
                <div className="table-responsive" style={{ minHeight: "360px" }}>
                  {loading ? (
                    <div className="text-center py-5">
                      <Spinner style={{ color: primaryColor }} />
                      <p className="small mt-2" style={{ color: textSub }}>Loading documents...</p>
                    </div>
                  ) : documents.length === 0 ? (
                    <div className="text-center py-5">
                      <div
                        className="mx-auto mb-3 d-flex align-items-center justify-content-center"
                        style={{
                          width: "64px",
                          height: "64px",
                          backgroundColor: isDark ? "rgba(239, 68, 68, 0.15)" : "#fef2f2",
                          borderRadius: 0,
                          color: isDark ? "#f87171" : "#7f1d1d",
                          fontSize: "32px",
                        }}
                      >
                        <i className="ri-folder-open-line" />
                      </div>
                      <h5 className="fw-bold mb-1" style={{ color: textTitle }}>No documents found</h5>
                      <p className="small mb-3" style={{ color: textSub }}>
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
                    <Table responsive hover className="align-middle mb-0 table-nowrap">
                      <thead className="small text-uppercase" style={{ backgroundColor: subtleBg }}>
                        <tr>
                          <th style={{ width: "40px", backgroundColor: subtleBg, borderColor: cardBorder, color: textSub }} className="text-center">
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
                          <th style={{ width: "105px", backgroundColor: subtleBg, borderColor: cardBorder, color: textSub }} className="text-center">
                            Actions
                          </th>
                          <th style={{ minWidth: "220px", backgroundColor: subtleBg, borderColor: cardBorder, color: textSub }}>Document Name</th>
                          <th style={{ backgroundColor: subtleBg, borderColor: cardBorder, color: textSub }}>Folder</th>
                          <th style={{ backgroundColor: subtleBg, borderColor: cardBorder, color: textSub }}>Related To</th>
                          <th style={{ backgroundColor: subtleBg, borderColor: cardBorder, color: textSub }}>Type</th>
                          <th style={{ backgroundColor: subtleBg, borderColor: cardBorder, color: textSub }}>Size</th>
                          <th style={{ backgroundColor: subtleBg, borderColor: cardBorder, color: textSub }}>Owner</th>
                          <th style={{ backgroundColor: subtleBg, borderColor: cardBorder, color: textSub }}>Modified On</th>
                        </tr>
                      </thead>
                      <tbody>
                        {documents.map((doc) => {
                          const meta = getFileTypeMeta(doc.file_type, isDark);
                          const isSelected = selectedDocIds.includes(doc.document_id);

                          return (
                            <tr key={doc.document_id} className={isSelected ? "table-active" : ""}>
                              {/* Checkbox */}
                              <td className="text-center" style={{ borderColor: cardBorder }}>
                                <Input
                                  type="checkbox"
                                  className="rounded-0"
                                  checked={isSelected}
                                  onChange={() => handleSelectOne(doc.document_id)}
                                />
                              </td>

                              {/* Actions */}
                              <td className="text-center" style={{ width: "105px", borderColor: cardBorder }}>
                                <div className="d-flex align-items-center justify-content-center gap-1 flex-nowrap">
                                  <Button
                                    size="sm"
                                    className="border rounded-0 p-1"
                                    style={{
                                      width: "28px",
                                      height: "28px",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      backgroundColor: subtleBg,
                                      borderColor: subtleBorder,
                                      color: textSub,
                                    }}
                                    title="View Details"
                                    onClick={() => {
                                      setActiveDocForDetail(doc);
                                      setDetailModalOpen(true);
                                    }}
                                  >
                                    <i className="ri-eye-line fs-14" />
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => handleDownloadDocument(doc)}
                                    className="border rounded-0 p-1"
                                    style={{
                                      width: "28px",
                                      height: "28px",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      backgroundColor: subtleBg,
                                      borderColor: subtleBorder,
                                      color: isDark ? "#60a5fa" : "#2563eb",
                                    }}
                                    title="Download Document"
                                  >
                                    <i className="ri-download-2-line fs-14" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    className="border rounded-0 p-1 text-danger"
                                    style={{
                                      width: "28px",
                                      height: "28px",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      backgroundColor: subtleBg,
                                      borderColor: subtleBorder,
                                    }}
                                    title="Delete Document"
                                    onClick={() => {
                                      setActiveDocForDelete(doc);
                                      setDeleteModalOpen(true);
                                    }}
                                  >
                                    <i className="ri-delete-bin-line fs-14" />
                                  </Button>
                                </div>
                              </td>

                              {/* Document Name */}
                              <td style={{ borderColor: cardBorder }}>
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
                                      border: `1px solid ${meta.color}33`,
                                    }}
                                  >
                                    <i className={meta.icon} />
                                  </div>
                                  <div className="overflow-hidden">
                                    <button
                                      type="button"
                                      className="btn btn-link p-0 text-decoration-none text-start d-block fw-semibold text-truncate"
                                      style={{ maxWidth: "240px", fontSize: "14px", color: textTitle }}
                                      onClick={() => {
                                        setActiveDocForDetail(doc);
                                        setDetailModalOpen(true);
                                      }}
                                    >
                                      {doc.file_name}
                                    </button>
                                    <span
                                      className="small text-truncate d-block"
                                      style={{ maxWidth: "240px", fontSize: "12px", color: textSub }}
                                    >
                                      {doc.description || "No description"}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              {/* Folder */}
                              <td style={{ borderColor: cardBorder }}>
                                <span className="small d-flex align-items-center gap-1" style={{ color: textTitle }}>
                                  <i className="ri-folder-line" style={{ color: textSub }} />
                                  {doc.folder_name || "General"}
                                </span>
                              </td>

                              {/* Related To */}
                              <td style={{ borderColor: cardBorder }}>
                                {doc.entity_type === "OPPORTUNITY" && doc.entity_id ? (
                                  <Link
                                    to={`/crm/opportunities/${doc.entity_id}`}
                                    className="small fw-semibold text-decoration-none"
                                    style={{ color: primaryColor }}
                                    title="View Opportunity"
                                  >
                                    {doc.related_to || "Opportunity"}
                                  </Link>
                                ) : doc.entity_type === "CUSTOMER" && doc.entity_id ? (
                                  <Link
                                    to={`/crm/customers/${doc.entity_id}`}
                                    className="small fw-semibold text-decoration-none"
                                    style={{ color: primaryColor }}
                                    title="View Customer"
                                  >
                                    {doc.related_to || "Customer Account"}
                                  </Link>
                                ) : doc.entity_type === "LEAD" && doc.entity_id ? (
                                  <Link
                                    to={`/crm/leads/${doc.entity_id}`}
                                    className="small fw-semibold text-decoration-none"
                                    style={{ color: primaryColor }}
                                    title="View Lead"
                                  >
                                    {doc.related_to || "Lead"}
                                  </Link>
                                ) : (
                                  <span className="small" style={{ color: textSub }}>
                                    {doc.related_to || "All Customers"}
                                  </span>
                                )}
                              </td>

                              {/* Type Badge (Square, no bootstrap blue) */}
                              <td style={{ borderColor: cardBorder }}>
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
                              <td className="small" style={{ borderColor: cardBorder, color: textSub }}>
                                {doc.file_size_label || "—"}
                              </td>

                              {/* Owner */}
                              <td style={{ borderColor: cardBorder }}>
                                <div className="d-flex align-items-center gap-2">
                                  <div
                                    className="rounded-0 d-flex align-items-center justify-content-center text-white fw-bold flex-shrink-0"
                                    style={{
                                      width: "26px",
                                      height: "26px",
                                      backgroundColor: isDark ? "#334155" : "#7f1d1d",
                                      fontSize: "11px",
                                    }}
                                  >
                                    {(doc.owner_name || "U").charAt(0).toUpperCase()}
                                  </div>
                                  <span className="small fw-medium" style={{ color: textTitle }}>
                                    {doc.owner_name || "Staff"}
                                  </span>
                                </div>
                              </td>

                              {/* Modified On */}
                              <td className="small" style={{ borderColor: cardBorder, color: textSub }}>
                                {doc.modified_label ||
                                  (doc.modified_on ? new Date(doc.modified_on).toLocaleDateString() : "—")}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </Table>
                  )}
                </div>

                {/* Table Footer: Pagination & Page Size */}
                <div className="d-flex align-items-center justify-content-between p-3 border-top flex-wrap gap-2" style={{ backgroundColor: subtleBg, borderColor: cardBorder }}>
                  <div className="small" style={{ color: textSub }}>
                    Showing {totalCount === 0 ? 0 : (page - 1) * pageSize + 1} to{" "}
                    {Math.min(page * pageSize, totalCount)} of {totalCount} documents
                  </div>

                  <div className="d-flex align-items-center gap-2">
                    {/* Page buttons */}
                    <div className="btn-group rounded-0" role="group">
                      <Button
                        type="button"
                        size="sm"
                        className="rounded-0 border"
                        style={{
                          backgroundColor: isDark ? "#121212" : "#ffffff",
                          borderColor: subtleBorder,
                          color: textTitle,
                        }}
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
                              backgroundColor: p === page ? "#7f1d1d" : (isDark ? "#121212" : "#ffffff"),
                              borderColor: p === page ? "#7f1d1d" : subtleBorder,
                              color: p === page ? "#ffffff" : textTitle,
                              fontWeight: p === page ? 600 : 400,
                            }}
                            onClick={() => setPage(p)}
                          >
                            {p}
                          </Button>
                        ))}
                      <Button
                        type="button"
                        size="sm"
                        className="rounded-0 border"
                        style={{
                          backgroundColor: isDark ? "#121212" : "#ffffff",
                          borderColor: subtleBorder,
                          color: textTitle,
                        }}
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      >
                        ›
                      </Button>
                    </div>

                    {/* Page Size select */}
                    <Input
                      type="select"
                      className="rounded-0 form-select-sm border"
                      style={{
                        width: "110px",
                        backgroundColor: isDark ? "#121212" : "#ffffff",
                        borderColor: subtleBorder,
                        color: textTitle,
                      }}
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
            <Card className="rounded-0 border shadow-sm mb-4" style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
              <CardBody className="p-3">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <h6 className="fw-bold mb-0" style={{ fontSize: "14px", color: textTitle }}>
                    Storage Overview
                  </h6>
                  <button
                    type="button"
                    className="btn btn-link p-0 text-decoration-none small fw-semibold"
                    style={{ color: primaryColor }}
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
                    <div className="fw-bold" style={{ fontSize: "16px", color: textTitle }}>
                      {formatStorageAmount(stats.used_gb, stats.used_bytes)} Used
                    </div>
                    <div className="small" style={{ color: textSub }}>
                      of {Number(stats.quota_gb || 20).toFixed(0)} GB
                    </div>
                    {/* Linear bar (Maroon accent) */}
                    <div className="progress rounded-0 mt-2" style={{ height: "6px", backgroundColor: subtleBg }}>
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
                <div className="border-top pt-2 mt-2" style={{ borderColor: cardBorder }}>
                  <div className="d-flex align-items-center justify-content-between py-1 small">
                    <span className="d-flex align-items-center gap-2" style={{ color: textSub }}>
                      <span
                        className="rounded-0"
                        style={{ width: "8px", height: "8px", backgroundColor: "#7f1d1d", display: "inline-block" }}
                      />
                      Documents
                    </span>
                    <span className="fw-semibold" style={{ color: textTitle }}>
                      {formatStorageAmount(stats.used_gb, stats.used_bytes)}
                    </span>
                  </div>
                  <div className="d-flex align-items-center justify-content-between py-1 small">
                    <span className="d-flex align-items-center gap-2" style={{ color: textSub }}>
                      <span
                        className="rounded-0"
                        style={{ width: "8px", height: "8px", backgroundColor: isDark ? "#475569" : "#cbd5e1", display: "inline-block" }}
                      />
                      Available
                    </span>
                    <span className="fw-semibold" style={{ color: textTitle }}>
                      {Number(stats.available_gb ?? 0).toFixed(2)} GB
                    </span>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* 2. Document Folders Card */}
            <Card className="rounded-0 border shadow-sm mb-4" style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
              <CardBody className="p-3">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <h6 className="fw-bold mb-0" style={{ fontSize: "14px", color: textTitle }}>
                    Document Folders
                  </h6>
                  <button
                    type="button"
                    className="btn btn-link p-0 text-decoration-none small fw-semibold"
                    style={{ color: primaryColor }}
                    onClick={() => setNewFolderModalOpen(true)}
                  >
                    + New Folder
                  </button>
                </div>

                <div className="d-flex flex-column gap-2">
                  {displayFolders.length === 0 ? (
                    <p className="small mb-0 py-2 text-center" style={{ color: textSub }}>No folders available</p>
                  ) : (
                    (showAllFolders ? displayFolders : displayFolders.slice(0, 8)).map((fc) => {
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
                            backgroundColor: isFilterActive
                              ? (isDark ? "rgba(127, 29, 29, 0.3)" : "#fef2f2")
                              : (isDark ? "#1a202c" : "#f8fafc"),
                            borderColor: isFilterActive
                              ? (isDark ? "#f87171" : "#7f1d1d")
                              : cardBorder,
                            transition: "all 0.15s ease",
                          }}
                        >
                          <span className="d-flex align-items-center gap-2 small fw-medium" style={{ color: isFilterActive ? primaryColor : textTitle }}>
                            <i
                              className="ri-folder-2-line"
                              style={{ color: isFilterActive ? primaryColor : textSub }}
                            />
                            {fc.folder_name}
                          </span>
                          <span
                            className="rounded-0 px-2 py-1 fw-semibold text-center"
                            style={{
                              backgroundColor: isFilterActive
                                ? (isDark ? "#7f1d1d" : "#7f1d1d")
                                : (isDark ? "#21262d" : "#f1f5f9"),
                              color: isFilterActive ? "#ffffff" : textTitle,
                              border: isFilterActive
                                ? (isDark ? "1px solid #991b1b" : "1px solid #7f1d1d")
                                : `1px solid ${subtleBorder}`,
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
                    className="btn btn-link p-0 text-decoration-none small mt-2 d-block"
                    style={{ color: primaryColor }}
                    onClick={() => setShowAllFolders((prev) => !prev)}
                  >
                    {showAllFolders ? "Show Fewer Folders ↑" : `View All Folders (${displayFolders.length}) →`}
                  </button>
                )}
              </CardBody>
            </Card>

            {/* 3. Recent Activity Card */}
            <Card className="rounded-0 border shadow-sm mb-4" style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
              <CardBody className="p-3">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <h6 className="fw-bold mb-0" style={{ fontSize: "14px", color: textTitle }}>
                    Recent Activity
                  </h6>
                  <button
                    type="button"
                    className="btn btn-link p-0 text-decoration-none small"
                    style={{ color: textSub }}
                    onClick={loadLookupsAndStats}
                  >
                    Refresh
                  </button>
                </div>

                <div className="d-flex flex-column gap-3">
                  {(stats?.recent_activity || []).length === 0 ? (
                    <div className="text-center py-2 small" style={{ color: textSub }}>
                      <i className="ri-history-line fs-18 d-block mb-1" style={{ color: textSub }} />
                      No recent activity yet
                    </div>
                  ) : (
                    stats.recent_activity.slice(0, 5).map((act) => {
                      const lowerTitle = String(act.title || "").toLowerCase();
                      const isUpload = lowerTitle.includes("upload");
                      const isDelete = lowerTitle.includes("delet") || lowerTitle.includes("remov");
                      return (
                        <div key={act.activity_id} className="d-flex align-items-start gap-2">
                          <div
                            className="d-flex align-items-center justify-content-center flex-shrink-0 mt-1"
                            style={{
                              width: "28px",
                              height: "28px",
                              backgroundColor: isUpload
                                ? (isDark ? "rgba(16, 185, 129, 0.18)" : "#ecfdf5")
                                : (isDark ? "rgba(239, 68, 68, 0.18)" : "#fef2f2"),
                              color: isUpload
                                ? (isDark ? "#34d399" : "#10b981")
                                : (isDark ? "#f87171" : "#7f1d1d"),
                              fontSize: "14px",
                              borderRadius: 0,
                              border: `1px solid ${isUpload ? (isDark ? "rgba(16, 185, 129, 0.3)" : "transparent") : (isDark ? "rgba(239, 68, 68, 0.3)" : "transparent")}`,
                            }}
                          >
                            <i
                              className={
                                isUpload
                                  ? "ri-upload-2-line"
                                  : isDelete
                                    ? "ri-delete-bin-line"
                                    : "ri-download-2-line"
                              }
                            />
                          </div>
                          <div className="flex-grow-1 overflow-hidden">
                            <div className="small text-truncate" style={{ color: textTitle }}>
                              <strong>{act.employee_name}</strong> {act.title}
                            </div>
                            {act.description && (
                              <div
                                className="text-truncate fw-medium"
                                style={{ fontSize: "12px", color: isDark ? "#fca5a5" : "#7f1d1d" }}
                              >
                                {act.description}
                              </div>
                            )}
                            <div style={{ fontSize: "11px", color: textSub }}>
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
            <Card className="rounded-0 border shadow-sm mb-4" style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
              <CardBody className="p-3">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <h6 className="fw-bold mb-0" style={{ fontSize: "14px", color: textTitle }}>
                    File Type Distribution
                  </h6>
                  <span className="small" style={{ color: textSub }}>All Time</span>
                </div>

                <div className="d-flex flex-column gap-3">
                  {distributionList.map((dist) => {
                    const allTimeTotal = Number(stats?.total_documents || 0);
                    const percent =
                      allTimeTotal > 0 ? Math.round((dist.count / allTimeTotal) * 100) : 0;

                    return (
                      <div key={dist.file_type}>
                        <div className="d-flex align-items-center justify-content-between small mb-1">
                          <span className="fw-semibold" style={{ color: textTitle }}>{dist.file_type}</span>
                          <span style={{ color: textSub }}>{dist.count}</span>
                        </div>
                        <div className="progress rounded-0" style={{ height: "6px", backgroundColor: subtleBg }}>
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
