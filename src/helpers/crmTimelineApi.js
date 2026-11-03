import { APIClient } from "./api_helper";

const api = new APIClient();

const cleanParams = (params) => {
  const next = {};
  Object.keys(params || {}).forEach((key) => {
    const value = params[key];
    if (
      value === undefined ||
      value === null ||
      value === "" ||
      value === "undefined" ||
      value === "null" ||
      Number.isNaN(value)
    )
      return;
    next[key] = value;
  });
  return next;
};

/** GET /api/timeline */
export const getTimeline = (params = {}) =>
  api.get(
    "/api/timeline",
    cleanParams({
      entityType: params.entityType || "CUSTOMER",
      entityId: params.entityId,
      interactionType: params.interactionType || "ALL",
      ownerId: params.ownerId,
      search: params.search,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      limit: params.limit ?? 50,
      offset: params.offset ?? 0,
    })
  );

/** GET /api/timeline/summary */
export const getTimelineSummary = (params = {}) =>
  api.get(
    "/api/timeline/summary",
    cleanParams({
      entityType: params.entityType || "CUSTOMER",
      entityId: params.entityId,
    })
  );

/** GET /api/timeline/stats */
export const getTimelineStats = (params = {}) =>
  api.get(
    "/api/timeline/stats",
    cleanParams({
      entityType: params.entityType || "CUSTOMER",
      entityId: params.entityId,
    })
  );

/** GET /api/timeline/lookups */
export const getTimelineLookups = (params = {}) =>
  api.get(
    "/api/timeline/lookups",
    cleanParams({
      entityId: params.entityId,
    })
  );

/** POST /api/timeline/activity */
export const logTimelineActivity = (payload) =>
  api.create("/api/timeline/activity", payload);

