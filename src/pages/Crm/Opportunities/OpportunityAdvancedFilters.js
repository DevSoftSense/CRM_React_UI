import React from "react";
import { useSelector } from "react-redux";
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
  const layoutModeType = useSelector((state) => state.Layout?.layoutModeType);
  const isDark =
    layoutModeType === "dark" ||
    (typeof document !== "undefined" &&
      (document.documentElement.getAttribute("data-bs-theme") === "dark" ||
        document.documentElement.getAttribute("data-layout-mode") === "dark"));

  const setField = (key, value) => {
    onDraftChange({ ...draft, [key]: value });
  };

  const selectStyle = {
    backgroundColor: isDark ? "#0d1117" : "#ffffff",
    borderColor: isDark ? "#30363d" : "#ced4da",
    color: isDark ? "#f0f6fc" : "#0f172a",
  };

  return (
    <Offcanvas
      direction="end"
      isOpen={isOpen}
      toggle={onClose}
      className="apt-adv-filters"
      style={{
        backgroundColor: isDark ? "#161b22" : "#ffffff",
        color: isDark ? "#f0f6fc" : "#0f172a",
      }}
    >
      <OffcanvasHeader
        toggle={onClose}
        className="apt-adv-filters__header"
        style={{
          borderBottomColor: isDark ? "#21262d" : "#e2e8f0",
          color: isDark ? "#f0f6fc" : "#0f172a",
        }}
      >
        Advanced Filters
      </OffcanvasHeader>
      <OffcanvasBody className="apt-adv-filters__body d-flex flex-column">
        <div className="apt-adv-filters__fields flex-grow-1">
          <div className="mb-3">
            <Label className="apt-adv-filters__label" style={{ color: isDark ? "#f0f6fc" : "#0f172a" }}>Stage</Label>
            <Input
              type="select"
              className="rounded-0"
              style={selectStyle}
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
            <Label className="apt-adv-filters__label" style={{ color: isDark ? "#f0f6fc" : "#0f172a" }}>Type</Label>
            <Input
              type="select"
              className="rounded-0"
              style={selectStyle}
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
            <Label className="apt-adv-filters__label" style={{ color: isDark ? "#f0f6fc" : "#0f172a" }}>Priority</Label>
            <Input
              type="select"
              className="rounded-0"
              style={selectStyle}
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
          <p className="apt-adv-filters__hint mb-0" style={{ color: isDark ? "#8b949e" : "#878a99" }}>
            Column filters under each header search the current page. Advanced filters reload from the
            server.
          </p>
        </div>
        <div className="apt-adv-filters__actions d-grid gap-2 mt-3">
          <Button
            className="rounded-0 text-white shadow-none"
            style={{ backgroundColor: "#7f1d1d", borderColor: "#7f1d1d" }}
            onClick={onApply}
          >
            Apply filters
          </Button>
          <Button
            className="rounded-0 border"
            style={{
              backgroundColor: isDark ? "#21262d" : "#f8fafc",
              borderColor: isDark ? "#30363d" : "#e2e8f0",
              color: isDark ? "#f0f6fc" : "#0f172a",
            }}
            onClick={onDisplayAll}
          >
            Display all
          </Button>
          <Button
            color="link"
            className="rounded-0"
            style={{ color: isDark ? "#8b949e" : "#64748b" }}
            onClick={onClearDraft}
          >
            Clear draft
          </Button>
        </div>
      </OffcanvasBody>
    </Offcanvas>
  );
};

export default OpportunityAdvancedFilters;
