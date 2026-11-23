import React, { useState } from "react";
import { useSelector } from "react-redux";
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
  Spinner,
} from "reactstrap";
import { createDocumentFolder } from "../../../helpers/crmDocumentApi";
import { toastSuccess, toastApiError } from "../../../helpers/crmToast";

const NewFolderModal = ({ isOpen, toggle, onSuccess }) => {
  const [folderName, setFolderName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const layoutModeType = useSelector((state) => state.Layout.layoutModeType);
  const isDark = layoutModeType === "dark";

  const modalBg = isDark ? "#121212" : "#ffffff";
  const headerFooterBg = isDark ? "#1a202c" : "#f8fafc";
  const modalBorder = isDark ? "#2d3748" : "#e2e8f0";
  const inputBg = isDark ? "#1a202c" : "#ffffff";
  const inputBorder = isDark ? "#334155" : "#ced4da";
  const textTitle = isDark ? "#f8fafc" : "#0f172a";
  const textSub = isDark ? "#94a3b8" : "#64748b";

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = folderName.trim();
    if (!trimmed) {
      toastApiError({ message: "Please enter a folder name." });
      return;
    }

    try {
      setSubmitting(true);
      await createDocumentFolder(trimmed);
      toastSuccess(`Folder "${trimmed}" created successfully.`);
      setFolderName("");
      toggle();
      if (onSuccess) onSuccess();
    } catch (err) {
      toastApiError(err, "Failed to create folder.");
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
          setFolderName("");
        }
      }}
      centered
      contentClassName="rounded-0 border shadow-lg"
      style={{ borderRadius: 0 }}
    >
      <div style={{ backgroundColor: modalBg, color: textTitle }}>
        <ModalHeader
          toggle={() => {
            if (!submitting) {
              toggle();
              setFolderName("");
            }
          }}
          className="rounded-0 border-bottom py-3"
          style={{ backgroundColor: headerFooterBg, borderColor: modalBorder }}
        >
          <span className="fw-semibold" style={{ fontSize: "16px", color: textTitle }}>
            Create New Folder
          </span>
        </ModalHeader>
        <Form onSubmit={handleSubmit}>
          <ModalBody className="p-4" style={{ backgroundColor: modalBg }}>
            <FormGroup className="mb-3">
              <Label className="form-label small fw-semibold" style={{ color: textSub }}>
                Folder Name <span className="text-danger">*</span>
              </Label>
              <Input
                type="text"
                className="rounded-0"
                placeholder="e.g. Compliance, NDAs, Invoices"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                required
                autoFocus
                style={{ backgroundColor: inputBg, borderColor: inputBorder, color: textTitle }}
              />
            </FormGroup>
            <p className="small mb-0" style={{ color: textSub }}>
              Folders help organize sales documents, agreements, proposals, and customer attachments.
            </p>
          </ModalBody>
          <ModalFooter
            className="rounded-0 border-top py-2 px-4 d-flex justify-content-end gap-2"
            style={{ backgroundColor: headerFooterBg, borderColor: modalBorder }}
          >
            <Button
              type="button"
              className="rounded-0 px-4 border"
              style={{ backgroundColor: inputBg, borderColor: inputBorder, color: textTitle }}
              onClick={() => {
                toggle();
                setFolderName("");
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
                  <Spinner size="sm" className="me-2" /> Creating...
                </>
              ) : (
                "Create Folder"
              )}
            </Button>
          </ModalFooter>
        </Form>
      </div>
    </Modal>
  );
};

export default NewFolderModal;

