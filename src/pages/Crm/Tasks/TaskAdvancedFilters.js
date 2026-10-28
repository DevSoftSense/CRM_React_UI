import React from "react";
import { Button, Input, Label, Offcanvas, OffcanvasBody, OffcanvasHeader } from "reactstrap";

/** Appointment-style advanced filters drawer for Tasks */
const TaskAdvancedFilters = ({
  isOpen,
  onClose,
  draft,
  onDraftChange,
  onApply,
  onDisplayAll,
  onClearDraft,
  taskStatuses = [],
  taskPriorities = [],
  taskTypes = [],
  owners = [],
}) => {
  const setField = (key, value) => {
    onDraftChange({ ...draft, [key]: value });
  };

  return (
    <Offcanvas direction="end" isOpen={isOpen} toggle={onClose} className="apt-adv-filters">
      <OffcanvasHeader toggle={onClose} className="apt-adv-filters__header">
        Advanced Filters
      </OffcanvasHeader>
      <OffcanvasBody className="apt-adv-filters__body d-flex flex-column">
        <div className="apt-adv-filters__fields flex-grow-1">
          <div className="mb-3">
            <Label className="apt-adv-filters__label">Status</Label>
            <Input
              type="select"
              value={draft.status || ""}
              onChange={(e) => setField("status", e.target.value)}
            >
              <option value="">All statuses</option>
              {taskStatuses.map((s) => (
                <option key={s.masterId || s.masterCode} value={s.masterCode}>
                  {s.masterName}
                </option>
              ))}
            </Input>
          </div>
          <div className="mb-3">
            <Label className="apt-adv-filters__label">Priority</Label>
            <Input
              type="select"
              value={draft.priority || ""}
              onChange={(e) => setField("priority", e.target.value)}
            >
              <option value="">All priorities</option>
              {taskPriorities.map((s) => (
                <option key={s.masterId || s.masterCode} value={s.masterCode}>
                  {s.masterName}
                </option>
              ))}
            </Input>
          </div>
          <div className="mb-3">
            <Label className="apt-adv-filters__label">Type</Label>
            <Input
              type="select"
              value={draft.taskType || ""}
              onChange={(e) => setField("taskType", e.target.value)}
            >
              <option value="">All types</option>
              {taskTypes.map((s) => (
                <option key={s.masterId || s.masterCode} value={s.masterCode}>
                  {s.masterName}
                </option>
              ))}
            </Input>
          </div>
          <div className="mb-3">
            <Label className="apt-adv-filters__label">Owner</Label>
            <Input
              type="select"
              value={draft.employeeId || ""}
              onChange={(e) => setField("employeeId", e.target.value)}
            >
              <option value="">All owners</option>
              {owners.map((o) => (
                <option key={o.ownerId} value={o.ownerId}>
                  {o.fullName}
                </option>
              ))}
            </Input>
          </div>
          <div className="mb-3">
            <Label className="apt-adv-filters__label">Due from</Label>
            <Input
              type="date"
              value={draft.dueFrom || ""}
              onChange={(e) => setField("dueFrom", e.target.value)}
            />
          </div>
          <div className="mb-3">
            <Label className="apt-adv-filters__label">Due to</Label>
            <Input
              type="date"
              value={draft.dueTo || ""}
              onChange={(e) => setField("dueTo", e.target.value)}
            />
          </div>
          <p className="apt-adv-filters__hint mb-0">
            Column filters under each header search the current page. Advanced filters reload from the
            server.
          </p>
        </div>
        <div className="apt-adv-filters__actions d-grid gap-2 mt-3">
          <Button color="primary" onClick={onApply}>
            Apply filters
          </Button>
          <Button color="light" onClick={onDisplayAll}>
            Display all
          </Button>
          <Button color="link" className="text-muted" onClick={onClearDraft}>
            Clear draft
          </Button>
        </div>
      </OffcanvasBody>
    </Offcanvas>
  );
};

export default TaskAdvancedFilters;
