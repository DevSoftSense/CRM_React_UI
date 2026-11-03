import React, { useState } from "react";
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
      contentClassName="rounded-0 border-0 shadow-lg"
    >
      <ModalHeader toggle={() => !submitting && toggle()} className="rounded-0 bg-light border-bottom py-3">
        <span className="fw-semibold text-danger" style={{ fontSize: "16px" }}>
          Delete Document
        </span>
      </ModalHeader>
      <ModalBody className="p-4 text-center">
        <div
          className="mx-auto mb-3 d-flex align-items-center justify-content-center"
          style={{
            width: "56px",
            height: "56px",
            backgroundColor: "#fef2f2",
            color: "#dc2626",
            fontSize: "28px",
          }}
        >
          <i className="ri-delete-bin-line" />
        </div>
        <h5 className="fw-bold text-dark mb-2">Are you sure?</h5>
        <p className="text-muted small mb-0">
          Do you really want to delete{" "}
          <strong className="text-dark">"{document.file_name}"</strong>? This action will remove the
          file from your sales documents.
        </p>
      </ModalBody>
      <ModalFooter className="rounded-0 bg-light border-top py-2 px-4 d-flex justify-content-end gap-2">
        <Button
          type="button"
          color="light"
          className="rounded-0 px-4"
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
    </Modal>
  );
};

export default DeleteConfirmModal;
