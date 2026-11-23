import React, { useState } from "react";
import { useSelector } from "react-redux";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Spinner,
} from "reactstrap";
import { deactivateDocument } from "../../../helpers/crmDocumentApi";
import { toastSuccess, toastApiError } from "../../../helpers/crmToast";

const DeleteConfirmModal = ({ isOpen, toggle, document, onSuccess }) => {
  const [submitting, setSubmitting] = useState(false);

  const layoutModeType = useSelector((state) => state.Layout.layoutModeType);
  const isDark = layoutModeType === "dark";

  const modalBg = isDark ? "#121212" : "#ffffff";
  const headerFooterBg = isDark ? "#1a202c" : "#f8fafc";
  const modalBorder = isDark ? "#2d3748" : "#e2e8f0";
  const textTitle = isDark ? "#f8fafc" : "#0f172a";
  const textSub = isDark ? "#94a3b8" : "#64748b";

  if (!document) return null;

  const docId = document.document_id || document.task_file_id;

  const handleDelete = async () => {
    try {
      setSubmitting(true);
      await deactivateDocument(docId);
      toastSuccess(`Document "${document.file_name}" deleted successfully.`);
      toggle();
      if (onSuccess) onSuccess();
    } catch (err) {
      toastApiError(err, "Failed to delete document.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      toggle={() => !submitting && toggle()}
      centered
      contentClassName="rounded-0 border shadow-lg"
      style={{ borderRadius: 0 }}
    >
      <div style={{ backgroundColor: modalBg, color: textTitle }}>
        <ModalHeader
          toggle={() => !submitting && toggle()}
          className="rounded-0 border-bottom py-3"
          style={{ backgroundColor: headerFooterBg, borderColor: modalBorder }}
        >
          <span className="fw-semibold text-danger" style={{ fontSize: "16px" }}>
            Delete Document
          </span>
        </ModalHeader>
        <ModalBody className="p-4 text-center" style={{ backgroundColor: modalBg }}>
          <div
            className="mx-auto mb-3 d-flex align-items-center justify-content-center"
            style={{
              width: "56px",
              height: "56px",
              backgroundColor: isDark ? "rgba(239, 68, 68, 0.2)" : "#fef2f2",
              color: isDark ? "#f87171" : "#dc2626",
              fontSize: "28px",
              border: `1px solid ${isDark ? "rgba(239, 68, 68, 0.3)" : "#fecaca"}`,
            }}
          >
            <i className="ri-delete-bin-line" />
          </div>
          <h5 className="fw-bold mb-2" style={{ color: textTitle }}>Are you sure?</h5>
          <p className="small mb-0" style={{ color: textSub }}>
            Do you really want to delete{" "}
            <strong style={{ color: textTitle }}>"{document.file_name}"</strong>? This action will remove the
            file from your sales documents.
          </p>
        </ModalBody>
        <ModalFooter
          className="rounded-0 border-top py-2 px-4 d-flex justify-content-end gap-2"
          style={{ backgroundColor: headerFooterBg, borderColor: modalBorder }}
        >
          <Button
            type="button"
            className="rounded-0 px-4 border"
            style={{ backgroundColor: isDark ? "#1a202c" : "#ffffff", borderColor: modalBorder, color: textTitle }}
            onClick={toggle}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            color="danger"
            className="rounded-0 px-4"
            onClick={handleDelete}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Spinner size="sm" className="me-2" /> Deleting...
              </>
            ) : (
              "Yes, Delete"
            )}
          </Button>
        </ModalFooter>
      </div>
    </Modal>
  );
};

export default DeleteConfirmModal;
