import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardBody,
  Col,
  Container,
  Form,
  FormFeedback,
  FormGroup,
  Input,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Row,
  Spinner,
  Table,
} from "reactstrap";
import { Link, useNavigate } from "react-router-dom";
import BreadCrumb from "../../../Components/Common/BreadCrumb";
import DeleteModal from "../../../Components/Common/DeleteModal";
import {
  createCampaign,
  deactivateCampaign,
  getCampaignLookups,
  getCampaigns,
  getCampaignStats,
  updateCampaign,
} from "../../../helpers/crmCampaignApi";
import { toastApiError, toastSuccess } from "../../../helpers/crmToast";

const MAROON = "#7f1d1d";
const SLATE = "#475569";

const formatCurrency = (amount, currencyCode = "INR") => {
  const num = Number(amount) || 0;
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currencyCode || "INR",
      maximumFractionDigits: 0,
    }).format(num);
  } catch {
    return `₹${num.toLocaleString("en-IN")}`;
  }
};

const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
};

const getStatusBadgeClass = (statusCode) => {
  switch ((statusCode || "").toUpperCase()) {
    case "ACTIVE":
      return "bg-success-subtle text-success border border-success-subtle";
    case "PLANNED":
      return "bg-info-subtle text-info border border-info-subtle";
    case "COMPLETED":
      return "bg-primary-subtle text-primary border border-primary-subtle";
    case "PAUSED":
      return "bg-warning-subtle text-warning border border-warning-subtle";
    case "CANCELLED":
      return "bg-danger-subtle text-danger border border-danger-subtle";
    default:
      return "bg-secondary-subtle text-secondary border border-secondary-subtle";
  }
};

const getChannelIcon = (channelCode) => {
  switch ((channelCode || "").toUpperCase()) {
    case "EMAIL":
      return "ri-mail-line";
    case "SOCIAL_MEDIA":
      return "ri-share-line";
    case "GOOGLE_ADS":
      return "ri-google-line";
    case "TRADE_SHOW":
      return "ri-calendar-event-line";
    case "WEBINAR":
      return "ri-video-line";
    case "COLD_OUTREACH":
      return "ri-phone-line";
    case "REFERRAL":
      return "ri-user-shared-line";
    default:
      return "ri-megaphone-line";
  }
};

const emptyForm = () => ({
  campaignName: "",
  channelId: "",
  statusId: "",
  startDate: "",
  endDate: "",
  budget: "",
  currencyCode: "INR",
  ownerEmployeeId: "",
  description: "",
});

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const Campaigns = () => {
  document.title = "Campaigns | SoftOnCloud CRM";
  const navigate = useNavigate();

  // State: Lists & Stats
  const [campaigns, setCampaigns] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState(null);
  const [lookups, setLookups] = useState({
    channels: [],
    statuses: [],
    owners: [],
    currencies: [],
  });

  // State: Loading & Feedback
  const [loadingList, setLoadingList] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // State: Filters
  const [search, setSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [startFrom, setStartFrom] = useState("");
  const [startTo, setStartTo] = useState("");

  // State: Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // State: Modals
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingCampaignId, setEditingCampaignId] = useState(null);
  const [formData, setFormData] = useState(emptyForm());
  const [formErrors, setFormErrors] = useState({});

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState(null);

  // Fetch Lookups once on mount
  useEffect(() => {
    let active = true;
    getCampaignLookups()
      .then((data) => {
        if (active && data) {
          setLookups({
            channels: data.channels || [],
            statuses: data.statuses || [],
            owners: data.owners || [],
            currencies: data.currencies || [],
          });
        }
      })
      .catch((err) => toastApiError(err, "Failed to load campaign lookups."));
    return () => {
      active = false;
    };
  }, []);

  // Fetch Stats
  const loadStats = useCallback(async () => {
    try {
      setLoadingStats(true);
      const res = await getCampaignStats();
      setStats(res || null);
    } catch (err) {
      toastApiError(err, "Failed to load campaign statistics.");
    } finally {
      setLoadingStats(false);
    }
  }, []);

  // Fetch Campaigns List
  const loadCampaigns = useCallback(async () => {
    try {
      setLoadingList(true);
      const res = await getCampaigns({
        search: search.trim() || undefined,
        channelId: channelFilter ? Number(channelFilter) : undefined,
        statusId: statusFilter ? Number(statusFilter) : undefined,
        ownerEmployeeId: ownerFilter ? Number(ownerFilter) : undefined,
        startFrom: startFrom || undefined,
        startTo: startTo || undefined,
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
      });

      setCampaigns(res?.items || []);
      setTotalCount(res?.totalCount || 0);
    } catch (err) {
      toastApiError(err, "Failed to load campaigns.");
    } finally {
      setLoadingList(false);
    }
  }, [search, channelFilter, statusFilter, ownerFilter, startFrom, startTo, pageSize, currentPage]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  // Total pages
  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(totalCount / pageSize));
  }, [totalCount, pageSize]);

  // Reset Filters
  const handleResetFilters = () => {
    setSearch("");
    setChannelFilter("");
    setStatusFilter("");
    setOwnerFilter("");
    setStartFrom("");
    setStartTo("");
    setCurrentPage(1);
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingCampaignId(null);
    const initial = emptyForm();
    if (lookups.statuses.length > 0) {
      const planned = lookups.statuses.find((s) => s.masterCode === "PLANNED");
      initial.statusId = planned ? planned.masterId : lookups.statuses[0].masterId;
    }
    setFormData(initial);
    setFormErrors({});
    setFormModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (c) => {
    setEditingCampaignId(c.campaignId);
    setFormData({
      campaignName: c.campaignName || "",
      channelId: c.channelId || "",
      statusId: c.statusId || "",
      startDate: c.startDate || "",
      endDate: c.endDate || "",
      budget: c.budget != null ? String(c.budget) : "",
      currencyCode: c.currencyCode || "INR",
      ownerEmployeeId: c.ownerEmployeeId || "",
      description: c.description || "",
    });
    setFormErrors({});
    setFormModalOpen(true);
  };

  // Form Validation
  const validateForm = () => {
    const errors = {};
    if (!formData.campaignName.trim()) {
      errors.campaignName = "Campaign name is required.";
    }
    if (formData.startDate && formData.endDate && formData.startDate > formData.endDate) {
      errors.endDate = "End date cannot be earlier than start date.";
    }
    if (formData.budget && Number(formData.budget) < 0) {
      errors.budget = "Budget cannot be negative.";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Create / Edit
  const handleSaveCampaign = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      const payload = {
        campaignName: formData.campaignName.trim(),
        channelId: formData.channelId ? Number(formData.channelId) : null,
        statusId: formData.statusId ? Number(formData.statusId) : null,
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
        budget: formData.budget !== "" ? Number(formData.budget) : null,
        currencyCode: formData.currencyCode || "INR",
        ownerEmployeeId: formData.ownerEmployeeId ? Number(formData.ownerEmployeeId) : null,
        description: formData.description.trim() || null,
      };

      if (editingCampaignId) {
        await updateCampaign(editingCampaignId, payload);
        toastSuccess("Campaign updated successfully.");
      } else {
        await createCampaign(payload);
        toastSuccess("Campaign created successfully.");
      }

      setFormModalOpen(false);
      loadCampaigns();
      loadStats();
    } catch (err) {
      toastApiError(err, "Failed to save campaign.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete Click
  const handleOpenDeleteModal = (c) => {
    setCampaignToDelete(c);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!campaignToDelete) return;
    try {
      setDeleting(true);
      await deactivateCampaign(campaignToDelete.campaignId);
      toastSuccess("Campaign deleted successfully.");
      setDeleteModalOpen(false);
      setCampaignToDelete(null);
      loadCampaigns();
      loadStats();
    } catch (err) {
      toastApiError(err, "Failed to delete campaign.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="page-content">
      <Container fluid>
        <BreadCrumb title="Campaigns" pageTitle="CRM" />

        {/* ─── Top Executive Summary Cards (100% Dynamic) ───────────────── */}
        <Row className="g-3 mb-4">
          {/* Card 1: Total Campaigns */}
          <Col xl={3} md={6}>
            <Card className="border-0 shadow-sm rounded-0 mb-0 h-100" style={{ borderLeft: `4px solid ${MAROON}` }}>
              <CardBody className="p-3">
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <p className="text-uppercase fw-semibold text-muted text-truncate mb-1 fs-12">Total Campaigns</p>
                    <h4 className="fs-22 fw-bold ff-secondary mb-0 text-dark">
                      {loadingStats ? <Spinner size="sm" color="danger" /> : stats?.totalCampaigns ?? 0}
                    </h4>
                  </div>
                  <div
                    className="avatar-sm flex-shrink-0 d-flex align-items-center justify-content-center rounded-0"
                    style={{ backgroundColor: "#fef2f2", color: MAROON }}
                  >
                    <i className="ri-megaphone-line fs-20"></i>
                  </div>
                </div>
                <div className="mt-3 d-flex align-items-center justify-content-between text-muted fs-11 border-top pt-2">
                  <span>Planned: <strong>{stats?.plannedCampaigns ?? 0}</strong></span>
                  <span>Completed: <strong>{stats?.completedCampaigns ?? 0}</strong></span>
                </div>
              </CardBody>
            </Card>
          </Col>

          {/* Card 2: Active Campaigns */}
          <Col xl={3} md={6}>
            <Card className="border-0 shadow-sm rounded-0 mb-0 h-100" style={{ borderLeft: "4px solid #10b981" }}>
              <CardBody className="p-3">
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <p className="text-uppercase fw-semibold text-muted text-truncate mb-1 fs-12">Active Campaigns</p>
                    <h4 className="fs-22 fw-bold ff-secondary mb-0 text-dark">
                      {loadingStats ? <Spinner size="sm" color="success" /> : stats?.activeCampaigns ?? 0}
                    </h4>
                  </div>
                  <div
                    className="avatar-sm flex-shrink-0 d-flex align-items-center justify-content-center rounded-0"
                    style={{ backgroundColor: "#ecfdf5", color: "#10b981" }}
                  >
                    <i className="ri-pulse-line fs-20"></i>
                  </div>
                </div>
                <div className="mt-3 d-flex align-items-center text-muted fs-11 border-top pt-2">
                  <span className="text-success fw-medium me-1">
                    <i className="ri-checkbox-circle-line align-middle"></i> Live
                  </span>
                  <span>Currently generating leads</span>
                </div>
              </CardBody>
            </Card>
          </Col>

          {/* Card 3: Total Budget & Leads Generated */}
          <Col xl={3} md={6}>
            <Card className="border-0 shadow-sm rounded-0 mb-0 h-100" style={{ borderLeft: "4px solid #0284c7" }}>
              <CardBody className="p-3">
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <p className="text-uppercase fw-semibold text-muted text-truncate mb-1 fs-12">Total Budget</p>
                    <h4 className="fs-22 fw-bold ff-secondary mb-0 text-dark">
                      {loadingStats ? <Spinner size="sm" color="info" /> : formatCurrency(stats?.totalBudget ?? 0)}
                    </h4>
                  </div>
                  <div
                    className="avatar-sm flex-shrink-0 d-flex align-items-center justify-content-center rounded-0"
                    style={{ backgroundColor: "#f0f9ff", color: "#0284c7" }}
                  >
                    <i className="ri-money-dollar-circle-line fs-20"></i>
                  </div>
                </div>
                <div className="mt-3 d-flex align-items-center justify-content-between text-muted fs-11 border-top pt-2">
                  <span>Total Leads: <strong>{stats?.totalLeadsGenerated ?? 0}</strong></span>
                  <span>Pipeline: <strong>{formatCurrency(stats?.totalPipelineValue ?? 0)}</strong></span>
                </div>
              </CardBody>
            </Card>
          </Col>

          {/* Card 4: Won Revenue & Net ROI */}
          <Col xl={3} md={6}>
            <Card className="border-0 shadow-sm rounded-0 mb-0 h-100" style={{ borderLeft: "4px solid #8b5cf6" }}>
              <CardBody className="p-3">
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <p className="text-uppercase fw-semibold text-muted text-truncate mb-1 fs-12">Won Revenue</p>
                    <h4 className="fs-22 fw-bold ff-secondary mb-0 text-dark">
                      {loadingStats ? <Spinner size="sm" color="primary" /> : formatCurrency(stats?.totalWonRevenue ?? 0)}
                    </h4>
                  </div>
                  <div
                    className="avatar-sm flex-shrink-0 d-flex align-items-center justify-content-center rounded-0"
                    style={{ backgroundColor: "#f5f3ff", color: "#8b5cf6" }}
                  >
                    <i className="ri-trophy-line fs-20"></i>
                  </div>
                </div>
                <div className="mt-3 d-flex align-items-center justify-content-between text-muted fs-11 border-top pt-2">
                  <span>Overall ROI:</span>
                  <Badge
                    className={`rounded-0 px-2 py-1 ${
                      (stats?.overallRoi ?? 0) >= 0 ? "bg-success-subtle text-success" : "bg-danger-subtle text-danger"
                    }`}
                  >
                    {(stats?.overallRoi ?? 0) >= 0 ? "+" : ""}
                    {Number(stats?.overallRoi ?? 0).toFixed(1)}%
                  </Badge>
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>

        {/* ─── Main Action Bar & Filter Controls ─────────────────────────── */}
        <Card className="border-0 shadow-sm rounded-0 mb-4">
          <CardBody className="p-3">
            <Row className="g-2 align-items-center">
              {/* Search */}
              <Col lg={3} sm={6}>
                <div className="position-relative">
                  <Input
                    type="text"
                    className="form-control rounded-0 ps-5"
                    placeholder="Search campaign name or notes..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                  <i className="ri-search-line position-absolute top-50 start-0 translate-middle-y ms-3 text-muted fs-16"></i>
                </div>
              </Col>

              {/* Channel Filter */}
              <Col lg={2} sm={6}>
                <Input
                  type="select"
                  className="form-select rounded-0"
                  value={channelFilter}
                  onChange={(e) => {
                    setChannelFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="">All Channels</option>
                  {lookups.channels.map((ch) => (
                    <option key={ch.masterId} value={ch.masterId}>
                      {ch.masterName}
                    </option>
                  ))}
                </Input>
              </Col>

              {/* Status Filter */}
              <Col lg={2} sm={6}>
                <Input
                  type="select"
                  className="form-select rounded-0"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="">All Statuses</option>
                  {lookups.statuses.map((st) => (
                    <option key={st.masterId} value={st.masterId}>
                      {st.masterName}
                    </option>
                  ))}
                </Input>
              </Col>

              {/* Owner Filter */}
              <Col lg={2} sm={6}>
                <Input
                  type="select"
                  className="form-select rounded-0"
                  value={ownerFilter}
                  onChange={(e) => {
                    setOwnerFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="">All Owners</option>
                  {lookups.owners.map((emp) => (
                    <option key={emp.ownerId} value={emp.ownerId}>
                      {emp.fullName}
                    </option>
                  ))}
                </Input>
              </Col>

              {/* Actions & Buttons */}
              <Col lg={3} className="text-lg-end d-flex justify-content-lg-end gap-2">
                <Button
                  color="light"
                  className="rounded-0 px-3"
                  onClick={handleResetFilters}
                  title="Reset Filters"
                >
                  <i className="ri-refresh-line"></i>
                </Button>
                <Button
                  className="rounded-0 text-white px-3"
                  style={{ backgroundColor: MAROON, borderColor: MAROON }}
                  onClick={handleOpenCreateModal}
                >
                  <i className="ri-add-line align-middle me-1"></i> New Campaign
                </Button>
              </Col>
            </Row>
          </CardBody>
        </Card>

        {/* ─── Campaigns Table ───────────────────────────────────────────── */}
        <Card className="border-0 shadow-sm rounded-0">
          <CardBody className="p-0">
            {loadingList ? (
              <div className="text-center py-5">
                <Spinner color="danger" />
                <p className="mt-2 text-muted fs-13">Loading campaigns from product database...</p>
              </div>
            ) : campaigns.length === 0 ? (
              <div className="text-center py-5">
                <div
                  className="avatar-lg mx-auto mb-3 d-flex align-items-center justify-content-center rounded-0"
                  style={{ backgroundColor: "#fef2f2", color: MAROON }}
                >
                  <i className="ri-megaphone-line fs-32"></i>
                </div>
                <h5 className="fs-16 fw-semibold text-dark">No Campaigns Found</h5>
                <p className="text-muted fs-13 mb-3">
                  {search || channelFilter || statusFilter || ownerFilter
                    ? "No campaigns match your filter criteria. Try resetting filters."
                    : "Create your first sales campaign to track leads, pipeline, and ROI."}
                </p>
                {search || channelFilter || statusFilter || ownerFilter ? (
                  <Button color="light" className="rounded-0" onClick={handleResetFilters}>
                    Reset Filters
                  </Button>
                ) : (
                  <Button
                    className="rounded-0 text-white"
                    style={{ backgroundColor: MAROON, borderColor: MAROON }}
                    onClick={handleOpenCreateModal}
                  >
                    <i className="ri-add-line align-middle me-1"></i> Create First Campaign
                  </Button>
                )}
              </div>
            ) : (
              <div className="table-responsive">
                <Table className="table align-middle table-nowrap table-hover mb-0">
                  <thead className="table-light text-uppercase fs-11 text-muted" style={{ letterSpacing: "0.5px" }}>
                    <tr>
                      <th scope="col" style={{ width: "105px" }} className="text-center">Actions</th>
                      <th scope="col" style={{ width: "24%" }}>Campaign</th>
                      <th scope="col" style={{ width: "12%" }}>Channel</th>
                      <th scope="col" style={{ width: "10%" }}>Status</th>
                      <th scope="col" style={{ width: "14%" }}>Timeline</th>
                      <th scope="col" style={{ width: "10%" }}>Budget</th>
                      <th scope="col" className="text-center" style={{ width: "8%" }}>Leads</th>
                      <th scope="col" style={{ width: "10%" }}>Pipeline</th>
                      <th scope="col" style={{ width: "10%" }}>Won Rev / ROI</th>
                      <th scope="col" style={{ width: "12%" }}>Owner</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map((c) => (
                      <tr key={c.campaignId}>
                        {/* Actions (Column 1) */}
                        <td className="text-center">
                          <div className="d-inline-flex gap-1">
                            <Link
                              to={`/crm/campaigns/${c.campaignId}`}
                              className="btn btn-sm btn-light border rounded-0 p-1"
                              title="View Campaign Details"
                            >
                              <i className="ri-eye-line fs-14"></i>
                            </Link>
                            <Button
                              color="light"
                              className="btn btn-sm border rounded-0 p-1 text-primary"
                              onClick={() => handleOpenEditModal(c)}
                              title="Edit Campaign"
                            >
                              <i className="ri-pencil-line fs-14"></i>
                            </Button>
                            <Button
                              color="light"
                              className="btn btn-sm border rounded-0 p-1 text-danger"
                              onClick={() => handleOpenDeleteModal(c)}
                              title="Delete Campaign"
                            >
                              <i className="ri-delete-bin-line fs-14"></i>
                            </Button>
                          </div>
                        </td>

                        {/* Campaign Name & Description */}
                        <td>
                          <div className="d-flex align-items-center">
                            <div
                              className="avatar-xs flex-shrink-0 d-flex align-items-center justify-content-center me-2 rounded-0"
                              style={{ backgroundColor: "#fef2f2", color: MAROON }}
                            >
                              <i className={`${getChannelIcon(c.channelCode)} fs-14`}></i>
                            </div>
                            <div className="overflow-hidden">
                              <Link
                                to={`/crm/campaigns/${c.campaignId}`}
                                className="fw-semibold text-dark text-truncate d-block hover-maroon"
                                style={{ maxWidth: "260px" }}
                              >
                                {c.campaignName}
                              </Link>
                              {c.description && (
                                <span className="text-muted fs-11 text-truncate d-block" style={{ maxWidth: "260px" }}>
                                  {c.description}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Channel */}
                        <td>
                          <span className="badge rounded-0 bg-light text-dark border fw-medium px-2 py-1">
                            <i className={`${getChannelIcon(c.channelCode)} me-1 text-muted`}></i>
                            {c.channelName || "General"}
                          </span>
                        </td>

                        {/* Status */}
                        <td>
                          <span className={`badge rounded-0 px-2 py-1 ${getStatusBadgeClass(c.statusCode)}`}>
                            {c.statusName || "Planned"}
                          </span>
                        </td>

                        {/* Timeline */}
                        <td>
                          <div className="fs-12 text-dark fw-medium">
                            {formatDate(c.startDate)}
                          </div>
                          <div className="fs-11 text-muted">
                            to {formatDate(c.endDate)}
                          </div>
                        </td>

                        {/* Budget */}
                        <td>
                          <span className="fw-semibold text-dark fs-13">
                            {formatCurrency(c.budget, c.currencyCode)}
                          </span>
                        </td>

                        {/* Leads Generated */}
                        <td className="text-center">
                          <Badge className="rounded-0 bg-info-subtle text-info border border-info-subtle px-2 py-1 fs-12">
                            {c.leadsCount}
                          </Badge>
                        </td>

                        {/* Pipeline Value */}
                        <td>
                          <div className="fw-semibold text-dark fs-12">
                            {formatCurrency(c.pipelineValue, c.currencyCode)}
                          </div>
                          <div className="fs-11 text-muted">
                            {c.opportunitiesCount} {c.opportunitiesCount === 1 ? "Deal" : "Deals"}
                          </div>
                        </td>

                        {/* Won Revenue & ROI */}
                        <td>
                          <div className="fw-semibold text-success fs-12">
                            {formatCurrency(c.wonRevenue, c.currencyCode)}
                          </div>
                          <div className="fs-11">
                            <Badge
                              className={`rounded-0 px-1 py-0 ${
                                (c.roiPercentage || 0) >= 0
                                  ? "bg-success-subtle text-success"
                                  : "bg-danger-subtle text-danger"
                              }`}
                            >
                              ROI: {(c.roiPercentage || 0) >= 0 ? "+" : ""}
                              {Number(c.roiPercentage || 0).toFixed(0)}%
                            </Badge>
                          </div>
                        </td>

                        {/* Owner */}
                        <td>
                          <div className="d-flex align-items-center">
                            <div
                              className="avatar-xxs rounded-0 text-white d-flex align-items-center justify-content-center me-2 fs-10 fw-bold"
                              style={{ backgroundColor: SLATE, width: 22, height: 22 }}
                            >
                              {(c.ownerName || "A").charAt(0).toUpperCase()}
                            </div>
                            <span className="fs-12 text-dark text-truncate" style={{ maxWidth: "110px" }}>
                              {c.ownerName || "Unassigned"}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}

            {/* ─── Pagination Footer ─────────────────────────────────────── */}
            {campaigns.length > 0 && (
              <div className="d-flex align-items-center justify-content-between p-3 border-top">
                <div className="d-flex align-items-center gap-2">
                  <span className="text-muted fs-12">
                    Showing {(currentPage - 1) * pageSize + 1} to{" "}
                    {Math.min(currentPage * pageSize, totalCount)} of {totalCount} campaigns
                  </span>
                  <Input
                    type="select"
                    className="form-select form-select-sm rounded-0"
                    style={{ width: "90px" }}
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                  >
                    {PAGE_SIZE_OPTIONS.map((sz) => (
                      <option key={sz} value={sz}>
                        {sz} / page
                      </option>
                    ))}
                  </Input>
                </div>

                <div className="d-flex gap-1">
                  <Button
                    color="light"
                    size="sm"
                    className="rounded-0"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  >
                    <i className="ri-arrow-left-s-line align-middle"></i> Previous
                  </Button>
                  <span className="d-flex align-items-center px-2 fs-12 text-muted">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    color="light"
                    size="sm"
                    className="rounded-0"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next <i className="ri-arrow-right-s-line align-middle"></i>
                  </Button>
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        {/* ─── Create / Edit Campaign Modal (100% Square Standard) ─────────── */}
        <Modal
          isOpen={formModalOpen}
          toggle={() => !submitting && setFormModalOpen(false)}
          size="lg"
          centered
          className="rounded-0"
        >
          <Form onSubmit={handleSaveCampaign}>
            <ModalHeader
              toggle={() => !submitting && setFormModalOpen(false)}
              className="border-bottom rounded-0 py-3"
            >
              <span className="fw-bold text-dark fs-16">
                {editingCampaignId ? "Edit Campaign" : "Create New Campaign"}
              </span>
            </ModalHeader>

            <ModalBody className="p-4">
              <Row className="g-3">
                {/* Campaign Name */}
                <Col md={12}>
                  <FormGroup className="mb-0">
                    <Label className="form-label fw-medium fs-12 mb-1">
                      Campaign Name <span className="text-danger">*</span>
                    </Label>
                    <Input
                      type="text"
                      className="form-control rounded-0"
                      placeholder="e.g. Q4 Enterprise Software Outreach"
                      value={formData.campaignName}
                      invalid={!!formErrors.campaignName}
                      onChange={(e) => setFormData({ ...formData, campaignName: e.target.value })}
                    />
                    {formErrors.campaignName && <FormFeedback>{formErrors.campaignName}</FormFeedback>}
                  </FormGroup>
                </Col>

                {/* Channel & Status */}
                <Col md={6}>
                  <FormGroup className="mb-0">
                    <Label className="form-label fw-medium fs-12 mb-1">Marketing Channel</Label>
                    <Input
                      type="select"
                      className="form-select rounded-0"
                      value={formData.channelId}
                      onChange={(e) => setFormData({ ...formData, channelId: e.target.value })}
                    >
                      <option value="">-- Select Channel --</option>
                      {lookups.channels.map((ch) => (
                        <option key={ch.masterId} value={ch.masterId}>
                          {ch.masterName}
                        </option>
                      ))}
                    </Input>
                  </FormGroup>
                </Col>

                <Col md={6}>
                  <FormGroup className="mb-0">
                    <Label className="form-label fw-medium fs-12 mb-1">Status</Label>
                    <Input
                      type="select"
                      className="form-select rounded-0"
                      value={formData.statusId}
                      onChange={(e) => setFormData({ ...formData, statusId: e.target.value })}
                    >
                      <option value="">-- Select Status --</option>
                      {lookups.statuses.map((st) => (
                        <option key={st.masterId} value={st.masterId}>
                          {st.masterName}
                        </option>
                      ))}
                    </Input>
                  </FormGroup>
                </Col>

                {/* Owner & Currency */}
                <Col md={6}>
                  <FormGroup className="mb-0">
                    <Label className="form-label fw-medium fs-12 mb-1">Campaign Owner</Label>
                    <Input
                      type="select"
                      className="form-select rounded-0"
                      value={formData.ownerEmployeeId}
                      onChange={(e) => setFormData({ ...formData, ownerEmployeeId: e.target.value })}
                    >
                      <option value="">-- Select Owner --</option>
                      {lookups.owners.map((emp) => (
                        <option key={emp.ownerId} value={emp.ownerId}>
                          {emp.fullName} ({emp.ownerCode || "Sales"})
                        </option>
                      ))}
                    </Input>
                  </FormGroup>
                </Col>

                <Col md={6}>
                  <FormGroup className="mb-0">
                    <Label className="form-label fw-medium fs-12 mb-1">Budget</Label>
                    <div className="input-group">
                      <Input
                        type="select"
                        className="form-select rounded-0"
                        style={{ maxWidth: "100px" }}
                        value={formData.currencyCode}
                        onChange={(e) => setFormData({ ...formData, currencyCode: e.target.value })}
                      >
                        {lookups.currencies.length > 0 ? (
                          lookups.currencies.map((cur) => (
                            <option key={cur.code} value={cur.code}>
                              {cur.code}
                            </option>
                          ))
                        ) : (
                          <option value="INR">INR</option>
                        )}
                      </Input>
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        className="form-control rounded-0"
                        placeholder="0.00"
                        value={formData.budget}
                        invalid={!!formErrors.budget}
                        onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                      />
                    </div>
                    {formErrors.budget && <FormFeedback className="d-block">{formErrors.budget}</FormFeedback>}
                  </FormGroup>
                </Col>

                {/* Dates */}
                <Col md={6}>
                  <FormGroup className="mb-0">
                    <Label className="form-label fw-medium fs-12 mb-1">Start Date</Label>
                    <Input
                      type="date"
                      className="form-control rounded-0"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    />
                  </FormGroup>
                </Col>

                <Col md={6}>
                  <FormGroup className="mb-0">
                    <Label className="form-label fw-medium fs-12 mb-1">End Date</Label>
                    <Input
                      type="date"
                      className="form-control rounded-0"
                      value={formData.endDate}
                      invalid={!!formErrors.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    />
                    {formErrors.endDate && <FormFeedback>{formErrors.endDate}</FormFeedback>}
                  </FormGroup>
                </Col>

                {/* Description */}
                <Col md={12}>
                  <FormGroup className="mb-0">
                    <Label className="form-label fw-medium fs-12 mb-1">Description / Campaign Goals</Label>
                    <Input
                      type="textarea"
                      rows={3}
                      className="form-control rounded-0"
                      placeholder="Specify campaign target audience, key selling propositions, goals..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </FormGroup>
                </Col>
              </Row>
            </ModalBody>

            <ModalFooter className="border-top rounded-0 py-2">
              <Button
                color="light"
                className="rounded-0 px-3"
                disabled={submitting}
                onClick={() => setFormModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="rounded-0 text-white px-4"
                style={{ backgroundColor: MAROON, borderColor: MAROON }}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Spinner size="sm" className="me-1" /> Saving...
                  </>
                ) : editingCampaignId ? (
                  "Update Campaign"
                ) : (
                  "Create Campaign"
                )}
              </Button>
            </ModalFooter>
          </Form>
        </Modal>

        {/* ─── Delete Confirmation Modal ─────────────────────────────────── */}
        <DeleteModal
          show={deleteModalOpen}
          isLoading={deleting}
          onDeleteClick={handleConfirmDelete}
          onCloseClick={() => !deleting && setDeleteModalOpen(false)}
        />
      </Container>
    </div>
  );
};

export default Campaigns;

