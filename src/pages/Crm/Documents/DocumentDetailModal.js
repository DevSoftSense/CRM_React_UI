import React from "react";
import { useSelector } from "react-redux";
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

const getFileTypeStyle = (ext, isDark = false) => {
  const normalized = String(ext || "").toLowerCase().replace(".", "");
  switch (normalized) {
    case "pdf":
      return { icon: "ri-file-pdf-line", color: isDark ? "#f87171" : "#ef4444", bg: isDark ? "rgba(239, 68, 68, 0.2)" : "#fef2f2", label: "PDF" };
    case "xlsx":
    case "xls":
    case "csv":
      return { icon: "ri-file-excel-line", color: isDark ? "#34d399" : "#10b981", bg: isDark ? "rgba(16, 185, 129, 0.2)" : "#ecfdf5", label: "XLSX" };
    case "docx":
    case "doc":
      return { icon: "ri-file-word-line", color: isDark ? "#94a3b8" : "#3b82f6", bg: isDark ? "rgba(148, 163, 184, 0.2)" : "#eff6ff", label: "DOCX" };
    case "pptx":
    case "ppt":
      return { icon: "ri-file-ppt-line", color: isDark ? "#fbbf24" : "#f59e0b", bg: isDark ? "rgba(245, 158, 11, 0.2)" : "#fffbeb", label: "PPTX" };
    case "zip":
    case "rar":
    case "7z":
      return { icon: "ri-file-zip-line", color: isDark ? "#c084fc" : "#8b5cf6", bg: isDark ? "rgba(168, 85, 247, 0.2)" : "#f5f3ff", label: "ZIP" };
    case "png":
    case "jpg":
    case "jpeg":
    case "svg":
      return { icon: "ri-image-line", color: isDark ? "#2dd4bf" : "#06b6d4", bg: isDark ? "rgba(20, 184, 166, 0.2)" : "#ecfeff", label: "IMAGE" };
    default:
      return { icon: "ri-file-line", color: isDark ? "#94a3b8" : "#64748b", bg: isDark ? "rgba(148, 163, 184, 0.15)" : "#f8fafc", label: normalized.toUpperCase() || "FILE" };
  }
};

const DocumentDetailModal = ({ isOpen, toggle, document, onDelete }) => {
  const layoutModeType = useSelector((state) => state.Layout.layoutModeType);
  const isDark = layoutModeType === "dark";

  const modalBg = isDark ? "#121212" : "#ffffff";
  const headerFooterBg = isDark ? "#1a202c" : "#f8fafc";
  const modalBorder = isDark ? "#2d3748" : "#e2e8f0";
  const cardBg = isDark ? "#1a202c" : "#ffffff";
  const textTitle = isDark ? "#f8fafc" : "#0f172a";
  const textSub = isDark ? "#94a3b8" : "#64748b";

  if (!document) return null;

  const style = getFileTypeStyle(document.file_type, isDark);
  const docId = document.document_id || document.task_file_id;
  const downloadUrl = getDocumentDownloadUrl(docId);

  return (
    <Modal
      isOpen={isOpen}
      toggle={toggle}
      centered
      size="lg"
      contentClassName="rounded-0 border shadow-lg"
      style={{ borderRadius: 0 }}
    >
      <div style={{ backgroundColor: modalBg, color: textTitle }}>
        <ModalHeader
          toggle={toggle}
          className="rounded-0 border-bottom py-3"
          style={{ backgroundColor: headerFooterBg, borderColor: modalBorder }}
        >
          <span className="fw-semibold" style={{ fontSize: "16px", color: textTitle }}>
            Document Details & Preview
          </span>
        </ModalHeader>
        <ModalBody className="p-4" style={{ backgroundColor: modalBg }}>
          {/* Header Preview Banner */}
          <div
            className="d-flex align-items-center gap-3 p-3 mb-4 border"
            style={{ backgroundColor: isDark ? "#1a202c" : "#f8fafc", borderColor: modalBorder }}
          >
            <div
              className="d-flex align-items-center justify-content-center"
              style={{
                width: "56px",
                height: "56px",
                backgroundColor: style.bg,
                color: style.color,
                fontSize: "28px",
                border: `1px solid ${style.color}40`,
              }}
            >
              <i className={style.icon} />
            </div>
            <div className="flex-grow-1 overflow-hidden">
              <h5 className="mb-1 text-truncate fw-bold" style={{ color: textTitle }}>{document.file_name}</h5>
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
                <span className="small" style={{ color: textSub }}>
                  {document.file_size_label || document.formatted_size || "Standard Size"}
                </span>
                <span className="small" style={{ color: textSub }}>•</span>
                <span className="small" style={{ color: textSub }}>
                  <i className="ri-folder-line me-1" />
                  {document.folder_name || "General"}
                </span>
              </div>
            </div>
          </div>

          {/* Metadata Details Grid */}
          <Row className="g-3">
            <Col md={6}>
              <div className="border p-3 h-100" style={{ backgroundColor: cardBg, borderColor: modalBorder }}>
                <span className="small text-uppercase fw-semibold d-block mb-1" style={{ color: textSub }}>
                  Folder
                </span>
                <span className="fw-semibold" style={{ color: textTitle }}>
                  📁 {document.folder_name || "General"}
                </span>
              </div>
            </Col>
            <Col md={6}>
              <div className="border p-3 h-100" style={{ backgroundColor: cardBg, borderColor: modalBorder }}>
                <span className="small text-uppercase fw-semibold d-block mb-1" style={{ color: textSub }}>
                  Related To
                </span>
                <span className="fw-semibold" style={{ color: textTitle }}>
                  {document.related_to || "Global / All Customers"}
                </span>
              </div>
            </Col>
            <Col md={6}>
              <div className="border p-3 h-100" style={{ backgroundColor: cardBg, borderColor: modalBorder }}>
                <span className="small text-uppercase fw-semibold d-block mb-1" style={{ color: textSub }}>
                  Uploaded By
                </span>
                <div className="d-flex align-items-center gap-2 mt-1">
                  <div
                    className="rounded-0 d-flex align-items-center justify-content-center text-white fw-bold"
                    style={{
                      width: "28px",
                      height: "28px",
                      backgroundColor: isDark ? "#334155" : "#7f1d1d",
                      fontSize: "12px",
                    }}
                  >
                    {(document.owner_name || "U").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="fw-semibold small" style={{ color: textTitle }}>{document.owner_name || "Staff"}</div>
                    {document.owner_id && (
                      <div style={{ fontSize: "11px", color: textSub }}>
                        ID: #{document.owner_id}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Col>
            <Col md={6}>
              <div className="border p-3 h-100" style={{ backgroundColor: cardBg, borderColor: modalBorder }}>
                <span className="small text-uppercase fw-semibold d-block mb-1" style={{ color: textSub }}>
                  Modified / Uploaded On
                </span>
                <span className="fw-semibold" style={{ color: textTitle }}>
                  {document.modified_label ||
                    document.uploaded_on_formatted ||
                    (document.modified_on ? new Date(document.modified_on).toLocaleString() : "-")}
                </span>
              </div>
            </Col>

            {document.description && (
              <Col md={12}>
                <div className="border p-3" style={{ backgroundColor: cardBg, borderColor: modalBorder }}>
                  <span className="small text-uppercase fw-semibold d-block mb-1" style={{ color: textSub }}>
                    Description / Notes
                  </span>
                  <p className="mb-0 small" style={{ whiteSpace: "pre-wrap", color: textTitle }}>
                    {document.description}
                  </p>
                </div>
              </Col>
            )}
          </Row>
        </ModalBody>
        <ModalFooter
          className="rounded-0 border-top py-2 px-4 d-flex justify-content-between"
          style={{ backgroundColor: headerFooterBg, borderColor: modalBorder }}
        >
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
            <Button
              type="button"
              className="rounded-0 px-4 border"
              style={{ backgroundColor: cardBg, borderColor: modalBorder, color: textTitle }}
              onClick={toggle}
            >
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
      </div>
    </Modal>
  );
};

export default DocumentDetailModal;
