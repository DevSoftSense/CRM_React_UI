import React, { useState, useRef } from "react";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Form,
  FormGroup,
  Label,
  Input,
  Row,
  Col,
  Spinner,
} from "reactstrap";
import { uploadDocument } from "../../../helpers/crmDocumentApi";
import { toastSuccess, toastApiError } from "../../../helpers/crmToast";

const UploadDocumentModal = ({
  isOpen,
  toggle,
  onSuccess,
  folders = [],
  owners = [],
  accounts = [],
  opportunities = [],
  leads = [],
}) => {
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [folder, setFolder] = useState("");
  const [description, setDescription] = useState("");
  const [entityType, setEntityType] = useState("GLOBAL");
  const [entityId, setEntityId] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Sync initial folder and owner when opened
  React.useEffect(() => {
    if (isOpen) {
      if (!folder && folders.length > 0) {
        setFolder(folders[0].folder_name);
      }
      if (!ownerId && owners.length > 0) {
        setOwnerId(String(owners[0].employee_id));
      }
    }
  }, [isOpen, folders, owners, folder, ownerId]);

  const resetForm = () => {
    setFile(null);
    setFileName("");
    setFolder(folders.length > 0 ? folders[0].folder_name : "Proposals");
    setDescription("");
    setEntityType("GLOBAL");
    setEntityId("");
    setOwnerId(owners.length > 0 ? String(owners[0].employee_id) : "");
    setSubmitting(false);
  };

  const handleFileChange = (selectedFile) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    if (!fileName) {
      setFileName(selectedFile.name);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      toastApiError({ message: "Please select a file to upload." });
      return;
    }
    if (!fileName.trim()) {
      toastApiError({ message: "Please enter a document title." });
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append("File", file);
      formData.append("FileName", fileName.trim());
      formData.append("Folder", folder || (folders[0]?.folder_name ?? "General"));
      formData.append("Description", description.trim());
      formData.append("EntityType", entityType || "GLOBAL");
      if (entityId) {
        formData.append("EntityId", String(entityId));
      }
      if (ownerId) {
        formData.append("OwnerId", String(ownerId));
      }

      await uploadDocument(formData);
      toastSuccess("Document uploaded successfully.");
      toggle();
      resetForm();
      if (onSuccess) onSuccess();
    } catch (err) {
      toastApiError(err, "Failed to upload document.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      toggle={() => {
        if (!submitting) {
          toggle();
          resetForm();
        }
      }}
      centered
      size="lg"
      contentClassName="rounded-0 border-0 shadow-lg"
    >
      <ModalHeader
        toggle={() => {
          if (!submitting) {
            toggle();
            resetForm();
          }
        }}
        className="rounded-0 bg-light border-bottom py-3"
      >
        <div className="d-flex align-items-center gap-2">
          <i className="ri-upload-cloud-2-line text-danger fs-18" />
          <span className="fw-semibold text-dark" style={{ fontSize: "16px" }}>
            Upload Document
          </span>
        </div>
      </ModalHeader>
      <Form onSubmit={handleSubmit}>
        <ModalBody className="p-4">
          {/* Drag & Drop Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            className="text-center p-4 mb-4"
            style={{
              border: `2px dashed ${dragOver ? "#7f1d1d" : "#cbd5e1"}`,
              backgroundColor: dragOver ? "#fef2f2" : "#f8fafc",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => handleFileChange(e.target.files[0])}
              style={{ display: "none" }}
            />
            <i
              className="ri-upload-cloud-2-line text-muted mb-2 d-block"
              style={{ fontSize: "42px", color: file ? "#7f1d1d" : undefined }}
            />
            {file ? (
              <div>
                <p className="fw-semibold text-dark mb-1">{file.name}</p>
                <p className="text-muted small mb-0">
                  {(file.size / 1024 / 1024).toFixed(2)} MB • Click or drag to replace
                </p>
              </div>
            ) : (
              <div>
                <p className="fw-medium text-dark mb-1">
                  Drag and drop your file here, or{" "}
                  <span style={{ color: "#7f1d1d", fontWeight: 600 }}>browse</span>
                </p>
                <p className="text-muted small mb-0">
                  Supports PDF, DOCX, XLSX, PPTX, ZIP, PNG, JPG (up to 50 MB)
                </p>
              </div>
            )}
          </div>

          <Row className="g-3">
            {/* Document Title */}
            <Col md={12}>
              <FormGroup className="mb-0">
                <Label className="form-label text-muted small fw-semibold">
                  Document Title <span className="text-danger">*</span>
                </Label>
                <Input
                  type="text"
                  className="rounded-0"
                  placeholder="e.g. Sales Proposal for ABC Ltd."
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  required
                />
              </FormGroup>
            </Col>

            {/* Folder Selection */}
            <Col md={6}>
              <FormGroup className="mb-0">
                <Label className="form-label text-muted small fw-semibold">
                  Folder <span className="text-danger">*</span>
                </Label>
                <Input
                  type="select"
                  className="rounded-0"
                  value={folder}
                  onChange={(e) => setFolder(e.target.value)}
                  required
                >
                  <option value="">Select Folder...</option>
                  {folders.map((f) => (
                    <option key={f.folder_id || f.folder_name} value={f.folder_name}>
                      {f.folder_name}
                    </option>
                  ))}
                  {folders.length === 0 && (
                    <>
                      <option value="Proposals">Proposals</option>
                      <option value="Pricing">Pricing</option>
                      <option value="Contracts">Contracts</option>
                      <option value="Quotations">Quotations</option>
                      <option value="Presentations">Presentations</option>
                      <option value="KYC">KYC</option>
                      <option value="Reports">Reports</option>
                    </>
                  )}
                </Input>
              </FormGroup>
            </Col>

            {/* Owner Selection */}
            <Col md={6}>
              <FormGroup className="mb-0">
                <Label className="form-label text-muted small fw-semibold">
                  Owner / Uploader
                </Label>
                <Input
                  type="select"
                  className="rounded-0"
                  value={ownerId}
                  onChange={(e) => setOwnerId(e.target.value)}
                >
                  <option value="">Current User</option>
                  {owners.map((o) => (
                    <option key={o.employee_id} value={o.employee_id}>
                      {o.full_name} ({o.email})
                    </option>
                  ))}
                </Input>
              </FormGroup>
            </Col>

            {/* Related Entity Type */}
            <Col md={6}>
              <FormGroup className="mb-0">
                <Label className="form-label text-muted small fw-semibold">
                  Related Entity
                </Label>
                <Input
                  type="select"
                  className="rounded-0"
                  value={entityType}
                  onChange={(e) => {
                    setEntityType(e.target.value);
                    setEntityId("");
                  }}
                >
                  <option value="GLOBAL">Global / All Customers</option>
                  <option value="CUSTOMER">Customer Account</option>
                  <option value="OPPORTUNITY">Opportunity / Deal</option>
                  <option value="LEAD">Lead</option>
                </Input>
              </FormGroup>
            </Col>

            {/* Related Entity Picker */}
            <Col md={6}>
              <FormGroup className="mb-0">
                <Label className="form-label text-muted small fw-semibold">
                  Related Record
                </Label>
                {entityType === "GLOBAL" ? (
                  <Input
                    type="text"
                    className="rounded-0"
                    value="All Customers (Global)"
                    disabled
                  />
                ) : entityType === "CUSTOMER" ? (
                  <Input
                    type="select"
                    className="rounded-0"
                    value={entityId}
                    onChange={(e) => setEntityId(e.target.value)}
                  >
                    <option value="">Select Customer...</option>
                    {accounts.map((a) => (
                      <option key={a.account_id} value={a.account_id}>
                        {a.display_name || a.company_name}
                      </option>
                    ))}
                  </Input>
                ) : entityType === "OPPORTUNITY" ? (
                  <Input
                    type="select"
                    className="rounded-0"
                    value={entityId}
                    onChange={(e) => setEntityId(e.target.value)}
                  >
                    <option value="">Select Opportunity...</option>
                    {opportunities.map((op) => (
                      <option key={op.opportunity_id} value={op.opportunity_id}>
                        {op.name}
                      </option>
                    ))}
                  </Input>
                ) : entityType === "LEAD" ? (
                  <Input
                    type="select"
                    className="rounded-0"
                    value={entityId}
                    onChange={(e) => setEntityId(e.target.value)}
                  >
                    <option value="">Select Lead...</option>
                    {leads.map((l) => (
                      <option key={l.lead_id} value={l.lead_id}>
                        {l.lead_name} {l.company_name ? `(${l.company_name})` : ""}
                      </option>
                    ))}
                  </Input>
                ) : (
                  <Input
                    type="text"
                    className="rounded-0"
                    placeholder="Enter entity ID"
                    value={entityId}
                    onChange={(e) => setEntityId(e.target.value)}
                  />
                )}
              </FormGroup>
            </Col>

            {/* Description */}
            <Col md={12}>
              <FormGroup className="mb-0">
                <Label className="form-label text-muted small fw-semibold">
                  Description / Notes
                </Label>
                <Input
                  type="textarea"
                  rows={3}
                  className="rounded-0"
                  placeholder="Add notes, document details, or action items..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </FormGroup>
            </Col>
          </Row>
        </ModalBody>
        <ModalFooter className="rounded-0 bg-light border-top py-2 px-4 d-flex justify-content-end gap-2">
          <Button
            type="button"
            color="light"
            className="rounded-0 px-4"
            onClick={() => {
              toggle();
              resetForm();
            }}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="rounded-0 px-4 text-white"
            style={{ backgroundColor: "#7f1d1d", borderColor: "#7f1d1d" }}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Spinner size="sm" className="me-2" /> Uploading...
              </>
            ) : (
              "Upload Document"
            )}
          </Button>
        </ModalFooter>
      </Form>
    </Modal>
  );
};

export default UploadDocumentModal;
