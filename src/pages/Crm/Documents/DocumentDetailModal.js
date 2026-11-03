import React from "react";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Row,
  Col,
  Badge,
} from "reactstrap";
import { getDocumentDownloadUrl } from "../../../helpers/crmDocumentApi";

const getFileTypeStyle = (ext) => {
  const normalized = String(ext || "").toLowerCase().replace(".", "");
  switch (normalized) {
    case "pdf":
      return { icon: "ri-file-pdf-line", color: "#ef4444", bg: "#fef2f2", label: "PDF" };
    case "xlsx":
    case "xls":
    case "csv":
      return { icon: "ri-file-excel-line", color: "#10b981", bg: "#ecfdf5", label: "XLSX" };
    case "docx":
    case "doc":
      return { icon: "ri-file-word-line", color: "#3b82f6", bg: "#eff6ff", label: "DOCX" };
    case "pptx":
    case "ppt":
      return { icon: "ri-file-ppt-line", color: "#f59e0b", bg: "#fffbeb", label: "PPTX" };
    case "zip":
    case "rar":
    case "7z":
      return { icon: "ri-file-zip-line", color: "#8b5cf6", bg: "#f5f3ff", label: "ZIP" };
    case "png":
    case "jpg":
    case "jpeg":
    case "svg":
      return { icon: "ri-image-line", color: "#06b6d4", bg: "#ecfeff", label: "IMAGE" };
    default:
      return { icon: "ri-file-line", color: "#64748b", bg: "#f8fafc", label: normalized.toUpperCase() || "FILE" };
  }
};

const DocumentDetailModal = ({ isOpen, toggle, document, onDelete }) => {
  if (!document) return null;

  const style = getFileTypeStyle(document.file_type);
  const docId = document.document_id || document.task_file_id;
  const downloadUrl = getDocumentDownloadUrl(docId);

  return (
    <Modal
      isOpen={isOpen}
      toggle={toggle}
      centered
      size="lg"
      contentClassName="rounded-0 border-0 shadow-lg"
    >
      <ModalHeader toggle={toggle} className="rounded-0 bg-light border-bottom py-3">
        <span className="fw-semibold text-dark" style={{ fontSize: "16px" }}>
          Document Details & Preview
        </span>
      </ModalHeader>
      <ModalBody className="p-4">
        {/* Header Preview Banner */}
        <div className="d-flex align-items-center gap-3 p-3 mb-4 bg-light border">
          <div
            className="d-flex align-items-center justify-content-center"
            style={{
              width: "56px",
              height: "56px",
              backgroundColor: style.bg,
              color: style.color,
              fontSize: "28px",
            }}
          >
            <i className={style.icon} />
          </div>
          <div className="flex-grow-1 overflow-hidden">
            <h5 className="mb-1 text-truncate fw-bold text-dark">{document.file_name}</h5>
            <div className="d-flex align-items-center gap-2">
              <Badge
                className="rounded-0 px-2 py-1"
                style={{
                  backgroundColor: style.bg,
                  color: style.color,
                  border: `1px solid ${style.color}40`,
                }}
              >
                {style.label}
              </Badge>
              <span className="text-muted small">
                {document.file_size_label || document.formatted_size || "Standard Size"}
              </span>
              <span className="text-muted small">•</span>
              <span className="text-muted small">
                <i className="ri-folder-line me-1" />
                {document.folder_name || "General"}
              </span>
            </div>
          </div>
        </div>

        {/* Metadata Details Grid */}
        <Row className="g-3">
          <Col md={6}>
            <div className="border p-3 h-100 bg-white">
              <span className="text-muted small text-uppercase fw-semibold d-block mb-1">
                Folder
              </span>
              <span className="fw-semibold text-dark">
                📁 {document.folder_name || "General"}
              </span>
            </div>
          </Col>
          <Col md={6}>
            <div className="border p-3 h-100 bg-white">
              <span className="text-muted small text-uppercase fw-semibold d-block mb-1">
                Related To
              </span>
              <span className="fw-semibold text-dark">
                {document.related_to || "Global / All Customers"}
              </span>
            </div>
          </Col>
          <Col md={6}>
            <div className="border p-3 h-100 bg-white">
              <span className="text-muted small text-uppercase fw-semibold d-block mb-1">
                Uploaded By
              </span>
              <div className="d-flex align-items-center gap-2 mt-1">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
                  style={{
                    width: "28px",
                    height: "28px",
                    backgroundColor: "#7f1d1d",
                    fontSize: "12px",
                  }}
                >
                  {(document.owner_name || "U").charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="fw-semibold text-dark small">{document.owner_name || "Staff"}</div>
                  {document.owner_id && (
                    <div className="text-muted" style={{ fontSize: "11px" }}>
                      ID: #{document.owner_id}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Col>
          <Col md={6}>
            <div className="border p-3 h-100 bg-white">
              <span className="text-muted small text-uppercase fw-semibold d-block mb-1">
                Modified / Uploaded On
              </span>
              <span className="fw-semibold text-dark">
                {document.modified_label ||
                  document.uploaded_on_formatted ||
                  (document.modified_on ? new Date(document.modified_on).toLocaleString() : "-")}
              </span>
            </div>
          </Col>

          {document.description && (
            <Col md={12}>
              <div className="border p-3 bg-white">
                <span className="text-muted small text-uppercase fw-semibold d-block mb-1">
                  Description / Notes
                </span>
                <p className="text-dark mb-0 small" style={{ whiteSpace: "pre-wrap" }}>
                  {document.description}
                </p>
              </div>
            </Col>
          )}
        </Row>
      </ModalBody>
      <ModalFooter className="rounded-0 bg-light border-top py-2 px-4 d-flex justify-content-between">
        <Button
          type="button"
          color="danger"
          outline
          className="rounded-0 px-3"
          onClick={() => {
            toggle();
            if (onDelete) onDelete(document);
          }}
        >
          <i className="ri-delete-bin-line me-1" /> Delete
        </Button>
        <div className="d-flex gap-2">
          <Button type="button" color="light" className="rounded-0 px-4" onClick={toggle}>
            Close
          </Button>
          <a
            href={downloadUrl}
            target="_blank"
            rel="noreferrer"
            className="btn rounded-0 px-4 text-white"
            style={{ backgroundColor: "#7f1d1d", borderColor: "#7f1d1d" }}
          >
            <i className="ri-download-2-line me-1" /> Download
          </a>
        </div>
      </ModalFooter>
    </Modal>
  );
};

export default DocumentDetailModal;
