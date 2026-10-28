import React from "react";
import { Button, Input, Label, Offcanvas, OffcanvasBody, OffcanvasHeader } from "reactstrap";

/** Appointment-style advanced filters drawer for Leads */
const LeadAdvancedFilters = ({
  isOpen,
  onClose,
  draft,
  onDraftChange,
  onApply,
  onDisplayAll,
  onClearDraft,
  leadStatuses = [],
  leadSources = [],
  leadRatings = [],
}) => {
  const setField = (key, value) => {
    onDraftChange({ ...draft, [key]: value });
  };

  return (
    <Offcanvas
      direction="end"
      isOpen={isOpen}
      toggle={onClose}
      className="apt-adv-filters"
    >
      <OffcanvasHeader toggle={onClose} className="apt-adv-filters__header">
        Advanced Filters
      </OffcanvasHeader>
      <OffcanvasBody className="apt-adv-filters__body d-flex flex-column">
        <div className="apt-adv-filters__fields flex-grow-1">
          <div className="mb-3">
            <Label className="apt-adv-filters__label">Status</Label>
            <Input
              type="select"
              value={draft.statusId || ""}
              onChange={(e) => setField("statusId", e.target.value)}
            >
              <option value="">All statuses</option>
              {leadStatuses.map((s) => (
                <option key={s.masterId} value={s.masterId}>
                  {s.masterName}
                </option>
              ))}
            </Input>
          </div>
          <div className="mb-3">
            <Label className="apt-adv-filters__label">Source</Label>
            <Input
              type="select"
              value={draft.sourceId || ""}
              onChange={(e) => setField("sourceId", e.target.value)}
            >
              <option value="">All sources</option>
              {leadSources.map((s) => (
                <option key={s.masterId} value={s.masterId}>
                  {s.masterName}
                </option>
              ))}
            </Input>
          </div>
          <div className="mb-3">
            <Label className="apt-adv-filters__label">Rating</Label>
            <Input
              type="select"
              value={draft.ratingId || ""}
              onChange={(e) => setField("ratingId", e.target.value)}
            >
              <option value="">All ratings</option>
              {leadRatings.map((s) => (
                <option key={s.masterId} value={s.masterId}>
                  {s.masterName}
                </option>
              ))}
            </Input>
          </div>
          <p className="apt-adv-filters__hint mb-0">
            Column filters under each header search the current page. Advanced filters reload from the server.
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

export default LeadAdvancedFilters;
