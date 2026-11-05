import React, { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
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
  Nav,
  NavItem,
  NavLink,
  Row,
  Spinner,
  TabContent,
  Table,
  TabPane,
} from "reactstrap";
import { Link, useNavigate, useParams } from "react-router-dom";
import classnames from "classnames";
import BreadCrumb from "../../../Components/Common/BreadCrumb";
import DeleteModal from "../../../Components/Common/DeleteModal";
import {
  deactivateCampaign,
  getCampaignById,
  getCampaignLookups,
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

const CampaignDetail = () => {
  const { campaignId } = useParams();
  const navigate = useNavigate();

  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("leads");

  const [lookups, setLookups] = useState({
    channels: [],
    statuses: [],
    owners: [],
    currencies: [],
  });

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [formData, setFormData] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Delete Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Load Campaign Details
  const loadCampaign = useCallback(async () => {
    if (!campaignId) return;
    try {
      setLoading(true);
      const data = await getCampaignById(campaignId);
      setCampaign(data);
    } catch (err) {
      toastApiError(err, "Failed to load campaign details.");
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    loadCampaign();
  }, [loadCampaign]);

  // Load Lookups for edit modal
  useEffect(() => {
    getCampaignLookups()
      .then((data) => {
        if (data) {
          setLookups({
            channels: data.channels || [],
            statuses: data.statuses || [],
            owners: data.owners || [],
            currencies: data.currencies || [],
          });
        }
      })
      .catch((err) => toastApiError(err, "Failed to load lookups."));
  }, []);

  // Open Edit Modal
  const handleOpenEdit = () => {
    if (!campaign) return;
    setFormData({
      campaignName: campaign.campaignName || "",
      channelId: campaign.channelId || "",
      statusId: campaign.statusId || "",
      startDate: campaign.startDate || "",
      endDate: campaign.endDate || "",
      budget: campaign.budget != null ? String(campaign.budget) : "",
      currencyCode: campaign.currencyCode || "INR",
      ownerEmployeeId: campaign.ownerEmployeeId || "",
      description: campaign.description || "",
    });
    setFormErrors({});
    setEditModalOpen(true);
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.campaignName?.trim()) {
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

  const handleSaveEdit = async (e) => {
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

      await updateCampaign(campaignId, payload);
      toastSuccess("Campaign updated successfully.");
      setEditModalOpen(false);
      loadCampaign();
    } catch (err) {
      toastApiError(err, "Failed to update campaign.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete
  const handleConfirmDelete = async () => {
    try {
      setDeleting(true);
      await deactivateCampaign(campaignId);
      toastSuccess("Campaign deleted successfully.");
      navigate("/crm/campaigns");
    } catch (err) {
      toastApiError(err, "Failed to delete campaign.");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="page-content">
        <Container fluid>
          <div className="text-center py-5">
            <Spinner color="danger" />
            <p className="mt-2 text-muted fs-13">Loading campaign details...</p>
          </div>
        </Container>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="page-content">
        <Container fluid>
          <div className="text-center py-5">
            <h5 className="fs-16 fw-semibold text-dark">Campaign Not Found</h5>
            <p className="text-muted fs-13 mb-3">This campaign may have been deleted or does not exist.</p>
            <Button
              className="rounded-0 text-white"
              style={{ backgroundColor: MAROON, borderColor: MAROON }}
              onClick={() => navigate("/crm/campaigns")}
            >
              Back to Campaigns
            </Button>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="page-content">
      <Container fluid>
        <BreadCrumb title={campaign.campaignName} pageTitle="Campaigns" />

        {/* ─── Header & Top Actions ───────────────────────────────────────── */}
        <Card className="border-0 shadow-sm rounded-0 mb-4">
          <CardBody className="p-4">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
              <div className="d-flex align-items-center">
                <Button
                  color="light"
                  className="rounded-0 me-3 p-2 d-flex align-items-center"
                  onClick={() => navigate("/crm/campaigns")}
                  title="Back to Campaigns List"
                >
                  <i className="ri-arrow-left-line fs-16"></i>
                </Button>
                <div>
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <h4 className="fs-20 fw-bold mb-0 text-dark">{campaign.campaignName}</h4>
                    <span className={`badge rounded-0 px-2 py-1 ${getStatusBadgeClass(campaign.statusCode)}`}>
                      {campaign.statusName || "Planned"}
                    </span>
                    <span className="badge rounded-0 bg-light text-dark border fw-medium px-2 py-1">
                      {campaign.channelName || "General"}
                    </span>
                  </div>
                  <p className="text-muted fs-13 mb-0">
                    <i className="ri-calendar-line align-middle me-1"></i>
                    {formatDate(campaign.startDate)} to {formatDate(campaign.endDate)}
                    <span className="mx-2">•</span>
                    <i className="ri-user-star-line align-middle me-1"></i>
                    Owner: <strong>{campaign.ownerName || "Unassigned"}</strong>
                  </p>
                </div>
              </div>

              <div className="d-flex gap-2">
                <Button
                  color="light"
                  className="rounded-0 border px-3"
                  onClick={handleOpenEdit}
                >
                  <i className="ri-pencil-line align-middle me-1"></i> Edit
                </Button>
                <Button
                  color="danger"
                  className="rounded-0 px-3"
                  onClick={() => setDeleteModalOpen(true)}
                >
                  <i className="ri-delete-bin-line align-middle me-1"></i> Delete
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* ─── Campaign 360 Performance Metrics ───────────────────────────── */}
        <Row className="g-3 mb-4">
          {/* Budget & CPL */}
          <Col xl={3} md={6}>
            <Card className="border-0 shadow-sm rounded-0 mb-0 h-100" style={{ borderLeft: `4px solid ${MAROON}` }}>
              <CardBody className="p-3">
                <p className="text-uppercase fw-semibold text-muted text-truncate mb-1 fs-12">Allocated Budget</p>
                <h4 className="fs-20 fw-bold ff-secondary mb-1 text-dark">
                  {formatCurrency(campaign.budget, campaign.currencyCode)}
                </h4>
                <div className="fs-11 text-muted border-top pt-2 mt-2">
                  Cost Per Lead: <strong>{formatCurrency(campaign.costPerLead, campaign.currencyCode)}</strong>
                </div>
              </CardBody>
            </Card>
          </Col>

          {/* Leads Generated */}
          <Col xl={3} md={6}>
            <Card className="border-0 shadow-sm rounded-0 mb-0 h-100" style={{ borderLeft: "4px solid #0284c7" }}>
              <CardBody className="p-3">
                <p className="text-uppercase fw-semibold text-muted text-truncate mb-1 fs-12">Leads Generated</p>
                <h4 className="fs-20 fw-bold ff-secondary mb-1 text-dark">
                  {campaign.leadsCount}
                </h4>
                <div className="fs-11 text-muted border-top pt-2 mt-2">
                  Prospects attributed to this campaign
                </div>
              </CardBody>
            </Card>
          </Col>

          {/* Pipeline Value */}
          <Col xl={3} md={6}>
            <Card className="border-0 shadow-sm rounded-0 mb-0 h-100" style={{ borderLeft: "4px solid #f59e0b" }}>
              <CardBody className="p-3">
                <p className="text-uppercase fw-semibold text-muted text-truncate mb-1 fs-12">Pipeline Value</p>
                <h4 className="fs-20 fw-bold ff-secondary mb-1 text-dark">
                  {formatCurrency(campaign.pipelineValue, campaign.currencyCode)}
                </h4>
                <div className="fs-11 text-muted border-top pt-2 mt-2">
                  Total Deals: <strong>{campaign.opportunitiesCount}</strong>
                </div>
              </CardBody>
            </Card>
          </Col>

          {/* Won Revenue & ROI */}
          <Col xl={3} md={6}>
            <Card className="border-0 shadow-sm rounded-0 mb-0 h-100" style={{ borderLeft: "4px solid #10b981" }}>
              <CardBody className="p-3">
                <p className="text-uppercase fw-semibold text-muted text-truncate mb-1 fs-12">Won Revenue</p>
                <h4 className="fs-20 fw-bold ff-secondary mb-1 text-success">
                  {formatCurrency(campaign.wonRevenue, campaign.currencyCode)}
                </h4>
                <div className="fs-11 text-muted border-top pt-2 mt-2 d-flex justify-content-between align-items-center">
                  <span>Deals Won: <strong>{campaign.wonCount}</strong></span>
                  <Badge
                    className={`rounded-0 px-2 py-1 ${
                      (campaign.roiPercentage || 0) >= 0 ? "bg-success-subtle text-success" : "bg-danger-subtle text-danger"
                    }`}
                  >
                    ROI: {(campaign.roiPercentage || 0) >= 0 ? "+" : ""}
                    {Number(campaign.roiPercentage || 0).toFixed(0)}%
                  </Badge>
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>

        {/* ─── Description / Overview Card ───────────────────────────────── */}
        {campaign.description && (
          <Card className="border-0 shadow-sm rounded-0 mb-4">
            <CardHeader className="bg-light border-bottom rounded-0 py-2">
              <span className="fw-semibold text-dark fs-13">Campaign Scope & Goals</span>
            </CardHeader>
            <CardBody className="p-3">
              <p className="text-muted fs-13 mb-0" style={{ whiteSpace: "pre-line" }}>
                {campaign.description}
              </p>
            </CardBody>
          </Card>
        )}

        {/* ─── Linked Records Tabs (Leads & Opportunities) ────────────────── */}
        <Card className="border-0 shadow-sm rounded-0">
          <CardHeader className="border-bottom rounded-0 p-0 bg-transparent">
            <Nav tabs className="nav-tabs-custom rounded-0 border-0">
              <NavItem>
                <NavLink
                  className={classnames("rounded-0 py-3 px-4 fw-medium", { active: activeTab === "leads" })}
                  onClick={() => setActiveTab("leads")}
                  style={{ cursor: "pointer" }}
                >
                  <i className="ri-user-follow-line me-2 align-middle"></i>
                  Attributed Leads ({campaign.recentLeads?.length || 0})
                </NavLink>
              </NavItem>
              <NavItem>
                <NavLink
                  className={classnames("rounded-0 py-3 px-4 fw-medium", { active: activeTab === "deals" })}
                  onClick={() => setActiveTab("deals")}
                  style={{ cursor: "pointer" }}
                >
                  <i className="ri-hand-coin-line me-2 align-middle"></i>
                  Attributed Deals ({campaign.recentOpportunities?.length || 0})
                </NavLink>
              </NavItem>
            </Nav>
          </CardHeader>

          <CardBody className="p-0">
            <TabContent activeTab={activeTab}>
              {/* Tab 1: Leads */}
              <TabPane tabId="leads">
                {(!campaign.recentLeads || campaign.recentLeads.length === 0) ? (
                  <div className="text-center py-5">
                    <p className="text-muted fs-13 mb-0">No leads linked to this campaign yet.</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <Table className="table align-middle table-hover mb-0">
                      <thead className="table-light fs-11 text-uppercase text-muted">
                        <tr>
                          <th>Lead Name</th>
                          <th>Company</th>
                          <th>Contact Info</th>
                          <th>Status</th>
                          <th>Estimated Value</th>
                          <th>Created On</th>
                        </tr>
                      </thead>
                      <tbody>
                        {campaign.recentLeads.map((lead) => (
                          <tr key={lead.leadId}>
                            <td>
                              <Link
                                to={`/crm/leads/${lead.leadId}`}
                                className="fw-semibold text-dark hover-maroon"
                              >
                                {lead.leadName}
                              </Link>
                            </td>
                            <td>{lead.companyName || "-"}</td>
                            <td>
                              <div className="fs-12">{lead.mobile}</div>
                              <div className="fs-11 text-muted">{lead.email || "-"}</div>
                            </td>
                            <td>
                              <Badge className="rounded-0 bg-light text-dark border">
                                {lead.statusName || "New"}
                              </Badge>
                            </td>
                            <td className="fw-semibold text-dark">
                              {formatCurrency(lead.estimatedValue, campaign.currencyCode)}
                            </td>
                            <td className="text-muted fs-12">{formatDate(lead.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                )}
              </TabPane>

              {/* Tab 2: Deals */}
              <TabPane tabId="deals">
                {(!campaign.recentOpportunities || campaign.recentOpportunities.length === 0) ? (
                  <div className="text-center py-5">
                    <p className="text-muted fs-13 mb-0">No opportunities linked to this campaign yet.</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <Table className="table align-middle table-hover mb-0">
                      <thead className="table-light fs-11 text-uppercase text-muted">
                        <tr>
                          <th>Deal Name</th>
                          <th>Amount</th>
                          <th>Stage</th>
                          <th>Probability</th>
                          <th>Expected Close</th>
                          <th>Created On</th>
                        </tr>
                      </thead>
                      <tbody>
                        {campaign.recentOpportunities.map((opp) => (
                          <tr key={opp.opportunityId}>
                            <td>
                              <Link
                                to={`/crm/opportunities/${opp.opportunityId}`}
                                className="fw-semibold text-dark hover-maroon"
                              >
                                {opp.name}
                              </Link>
                            </td>
                            <td className="fw-semibold text-dark">
                              {formatCurrency(opp.amount, campaign.currencyCode)}
                            </td>
                            <td>
                              <Badge
                                className={`rounded-0 ${
                                  opp.stageCode === "CLOSED_WON"
                                    ? "bg-success-subtle text-success"
                                    : "bg-light text-dark border"
                                }`}
                              >
                                {opp.stageName || "Prospecting"}
                              </Badge>
                            </td>
                            <td>{opp.probability}%</td>
                            <td className="text-muted fs-12">{formatDate(opp.expectedCloseDate)}</td>
                            <td className="text-muted fs-12">{formatDate(opp.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                )}
              </TabPane>
            </TabContent>
          </CardBody>
        </Card>

        {/* ─── Edit Modal ─────────────────────────────────────────────────── */}
        <Modal
          isOpen={editModalOpen}
          toggle={() => !submitting && setEditModalOpen(false)}
          size="lg"
          centered
          className="rounded-0"
        >
          <Form onSubmit={handleSaveEdit}>
            <ModalHeader
              toggle={() => !submitting && setEditModalOpen(false)}
              className="border-bottom rounded-0 py-3"
            >
              <span className="fw-bold text-dark fs-16">Edit Campaign</span>
            </ModalHeader>

            <ModalBody className="p-4">
              <Row className="g-3">
                <Col md={12}>
                  <FormGroup className="mb-0">
                    <Label className="form-label fw-medium fs-12 mb-1">
                      Campaign Name <span className="text-danger">*</span>
                    </Label>
                    <Input
                      type="text"
                      className="form-control rounded-0"
                      value={formData.campaignName}
                      invalid={!!formErrors.campaignName}
                      onChange={(e) => setFormData({ ...formData, campaignName: e.target.value })}
                    />
                    {formErrors.campaignName && <FormFeedback>{formErrors.campaignName}</FormFeedback>}
                  </FormGroup>
                </Col>

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
                          {emp.fullName}
                        </option>
                      ))}
                    </Input>
                  </FormGroup>
                </Col>

                <Col md={6}>
                  <FormGroup className="mb-0">
                    <Label className="form-label fw-medium fs-12 mb-1">Budget</Label>
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      className="form-control rounded-0"
                      value={formData.budget}
                      invalid={!!formErrors.budget}
                      onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    />
                    {formErrors.budget && <FormFeedback>{formErrors.budget}</FormFeedback>}
                  </FormGroup>
                </Col>

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

                <Col md={12}>
                  <FormGroup className="mb-0">
                    <Label className="form-label fw-medium fs-12 mb-1">Description / Goals</Label>
                    <Input
                      type="textarea"
                      rows={3}
                      className="form-control rounded-0"
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
                onClick={() => setEditModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="rounded-0 text-white px-4"
                style={{ backgroundColor: MAROON, borderColor: MAROON }}
                disabled={submitting}
              >
                {submitting ? "Saving..." : "Save Changes"}
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

export default CampaignDetail;

