import React from "react";
import { Button, Input, Label, Offcanvas, OffcanvasBody, OffcanvasHeader } from "reactstrap";

/** Appointment-style advanced filters drawer for Opportunities */
const OpportunityAdvancedFilters = ({
  isOpen,
  onClose,
  draft,
  onDraftChange,
  onApply,
  onDisplayAll,
  onClearDraft,
  stages = [],
  types = [],
  priorities = [],
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
            <Label className="apt-adv-filters__label">Stage</Label>
            <Input
              type="select"
              value={draft.stageId || ""}
              onChange={(e) => setField("stageId", e.target.value)}
            >
              <option value="">All stages</option>
              {stages.map((s) => (
                <option key={s.masterId} value={s.masterId}>
                  {s.masterName}
                </option>
              ))}
            </Input>
          </div>
          <div className="mb-3">
            <Label className="apt-adv-filters__label">Type</Label>
            <Input
              type="select"
              value={draft.opportunityTypeId || ""}
              onChange={(e) => setField("opportunityTypeId", e.target.value)}
            >
              <option value="">All types</option>
              {types.map((s) => (
                <option key={s.masterId} value={s.masterId}>
                  {s.masterName}
                </option>
              ))}
            </Input>
          </div>
          <div className="mb-3">
            <Label className="apt-adv-filters__label">Priority</Label>
            <Input
              type="select"
              value={draft.priorityId || ""}
              onChange={(e) => setField("priorityId", e.target.value)}
            >
              <option value="">All priorities</option>
              {priorities.map((s) => (
                <option key={s.masterId} value={s.masterId}>
                  {s.masterName}
                </option>
              ))}
            </Input>
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

export default OpportunityAdvancedFilters;
