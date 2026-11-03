import React, { useState } from "react";
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
      contentClassName="rounded-0 border-0 shadow-lg"
    >
      <ModalHeader
        toggle={() => {
          if (!submitting) {
            toggle();
            setFolderName("");
          }
        }}
        className="rounded-0 bg-light border-bottom py-3"
      >
        <span className="fw-semibold text-dark" style={{ fontSize: "16px" }}>
          Create New Folder
        </span>
      </ModalHeader>
      <Form onSubmit={handleSubmit}>
        <ModalBody className="p-4">
          <FormGroup className="mb-3">
            <Label className="form-label text-muted small fw-semibold">
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
            />
          </FormGroup>
          <p className="text-muted small mb-0">
            Folders help organize sales documents, agreements, proposals, and customer attachments.
          </p>
        </ModalBody>
        <ModalFooter className="rounded-0 bg-light border-top py-2 px-4 d-flex justify-content-end gap-2">
          <Button
            type="button"
            color="light"
            className="rounded-0 px-4"
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
    </Modal>
  );
};

export default NewFolderModal;

