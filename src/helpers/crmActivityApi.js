import { APIClient } from "./api_helper";

const api = new APIClient();

const cleanParams = (params) => {
  const next = {};
  Object.keys(params || {}).forEach((key) => {
    const value = params[key];
    if (value === undefined || value === null || value === "") return;
    next[key] = value;
  });
  return next;
};

/** GET /api/activities */
export const getActivities = (params = {}) =>
  api.get(
    "/api/activities",
    cleanParams({
      search: params.search,
      actType: params.actType,
      activityStatus: params.activityStatus,
      employeeId: params.employeeId,
      startFrom: params.startFrom,
      startTo: params.startTo,
      limit: params.limit ?? 50,
      offset: params.offset ?? 0,
    })
  );

/** GET /api/activities/calendar */
export const getActivityCalendar = (params = {}) =>
  api.get(
    "/api/activities/calendar",
    cleanParams({
      startFrom: params.startFrom,
      startTo: params.startTo,
      employeeId: params.employeeId,
      actType: params.actType,
    })
  );

/** GET /api/activities/lookups */
export const getActivityLookups = () => api.get("/api/activities/lookups");

/** GET /api/activities/:activityId */
export const getActivityById = (activityId) => api.get(`/api/activities/${activityId}`);

/** POST /api/activities */
export const createActivity = (payload) => api.create("/api/activities", payload);

/** PUT /api/activities/:activityId */
export const updateActivity = (activityId, payload) =>
  api.put(`/api/activities/${activityId}`, payload);

/** POST /api/activities/:activityId/complete */
export const completeActivity = (activityId) =>
  api.create(`/api/activities/${activityId}/complete`, {});

/** DELETE /api/activities/:activityId */
export const deactivateActivity = (activityId) => api.delete(`/api/activities/${activityId}`);
