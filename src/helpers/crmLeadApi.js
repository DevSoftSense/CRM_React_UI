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

/** GET /api/leads — list (items + totalCount) */
export const getLeads = (params = {}) =>
  api.get(
    "/api/leads",
    cleanParams({
      search: params.search,
      statusId: params.statusId,
      sourceId: params.sourceId,
      ratingId: params.ratingId,
      ownerEmployeeId: params.ownerEmployeeId,
      limit: params.limit ?? 50,
      offset: params.offset ?? 0,
    })
  );

/** GET /api/leads/lookups — source / status / rating for this org+app */
export const getLeadLookups = () => api.get("/api/leads/lookups");

/** GET /api/leads/:leadId */
export const getLeadById = (leadId) => api.get(`/api/leads/${leadId}`);

/** POST /api/leads */
export const createLead = (payload) => api.create("/api/leads", payload);

/** PUT /api/leads/:leadId */
export const updateLead = (leadId, payload) => api.put(`/api/leads/${leadId}`, payload);

/** DELETE /api/leads/:leadId — soft delete */
export const deactivateLead = (leadId) => api.delete(`/api/leads/${leadId}`);
