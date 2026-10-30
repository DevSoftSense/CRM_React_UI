import React from "react";
import { Button, Input, Label, Offcanvas, OffcanvasBody, OffcanvasHeader } from "reactstrap";

/**
 * Enterprise Advanced Filters Drawer for Leads
 * Supports Status, Source, Rating, and Owner filters with real database lookup options.
 */
const LeadAdvancedFilters = ({
  isOpen,
  onClose,
  filters,
  draft,
  onChange,
  onDraftChange,
  onApply,
  onReset,
  onDisplayAll,
  onClearDraft,
  lookups = {},
  ownerOptions = [],
  leadStatuses = [],
  leadSources = [],
  leadRatings = [],
}) => {
  const currentFilters = filters || draft || {};
  const handleChange = (key, val) => {
    if (typeof onChange === "function") {
      onChange(key, val);
    } else if (typeof onDraftChange === "function") {
      onDraftChange({ ...currentFilters, [key]: val });
    }
  };

  const handleReset = () => {
    if (typeof onReset === "function") {
      onReset();
    } else if (typeof onClearDraft === "function") {
      onClearDraft();
    } else if (typeof onDisplayAll === "function") {
      onDisplayAll();
    }
  };

  const statuses = lookups.leadStatus || leadStatuses || [];
  const sources = lookups.leadSource || leadSources || [];
  const ratings = lookups.leadRating || leadRatings || [];
  const owners = ownerOptions || [];

  return (
    <Offcanvas
      direction="end"
      isOpen={isOpen}
      toggle={onClose}
      className="apt-adv-filters"
      style={{ width: "340px" }}
    >
      <OffcanvasHeader toggle={onClose} className="border-bottom py-3 px-3 bg-light">
        <span className="fs-15 fw-bold text-dark">
          <i className="ri-filter-3-line me-2 text-primary" />
          Advanced Lead Filters
        </span>
      </OffcanvasHeader>
      <OffcanvasBody className="d-flex flex-column p-3">
        <div className="flex-grow-1">
          {/* Status Filter */}
          <div className="mb-3">
            <Label className="fs-12 fw-medium text-dark mb-1">Lead Status</Label>
            <Input
              type="select"
              bsSize="sm"
              style={{ borderRadius: "3px" }}
              value={currentFilters.statusId || ""}
              onChange={(e) => handleChange("statusId", e.target.value)}
            >
              <option value="">All Statuses</option>
              {statuses.map((s) => (
                <option key={s.masterId} value={s.masterId}>
                  {s.masterName}
                </option>
              ))}
            </Input>
          </div>

          {/* Source Filter */}
          <div className="mb-3">
            <Label className="fs-12 fw-medium text-dark mb-1">Lead Source</Label>
            <Input
              type="select"
              bsSize="sm"
              style={{ borderRadius: "3px" }}
              value={currentFilters.sourceId || ""}
              onChange={(e) => handleChange("sourceId", e.target.value)}
            >
              <option value="">All Sources</option>
              {sources.map((s) => (
                <option key={s.masterId} value={s.masterId}>
                  {s.masterName}
                </option>
              ))}
            </Input>
          </div>

          {/* Rating Filter */}
          <div className="mb-3">
            <Label className="fs-12 fw-medium text-dark mb-1">Lead Rating</Label>
            <Input
              type="select"
              bsSize="sm"
              style={{ borderRadius: "3px" }}
              value={currentFilters.ratingId || ""}
              onChange={(e) => handleChange("ratingId", e.target.value)}
            >
              <option value="">All Ratings</option>
              {ratings.map((r) => (
                <option key={r.masterId} value={r.masterId}>
                  {r.masterName}
                </option>
              ))}
            </Input>
          </div>

          {/* Owner Filter */}
          <div className="mb-3">
            <Label className="fs-12 fw-medium text-dark mb-1">Lead Owner (Sales Rep)</Label>
            <Input
              type="select"
              bsSize="sm"
              style={{ borderRadius: "3px" }}
              value={currentFilters.ownerEmployeeId || ""}
              onChange={(e) => handleChange("ownerEmployeeId", e.target.value)}
            >
              <option value="">All Owners</option>
              {owners.map((o) => (
                <option key={o.ownerId} value={o.ownerId}>
                  {o.fullName}
                </option>
              ))}
            </Input>
          </div>

          <div className="p-2 bg-light border rounded text-muted fs-11 mt-4" style={{ borderRadius: "3px" }}>
            <i className="ri-information-line me-1 text-primary" />
            Applying filters reloads active lead records from the database. Click <strong>Clear All</strong> to restore full view.
          </div>
        </div>

        {/* Drawer Footer Actions */}
        <div className="d-grid gap-2 pt-3 border-top">
          <Button
            color="primary"
            size="sm"
            style={{ borderRadius: "3px", fontWeight: 600, backgroundColor: "#7f1d1d", borderColor: "#7f1d1d" }}
            onClick={onApply}
          >
            <i className="ri-check-line me-1" />
            Apply Filters
          </Button>
          <Button
            color="light"
            size="sm"
            className="border"
            style={{ borderRadius: "3px" }}
            onClick={handleReset}
          >
            <i className="ri-refresh-line me-1" />
            Clear All
          </Button>
        </div>
      </OffcanvasBody>
    </Offcanvas>
  );
};

export default LeadAdvancedFilters;
