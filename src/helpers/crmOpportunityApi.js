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

/** GET /api/opportunities */
export const getOpportunities = (params = {}) =>
  api.get(
    "/api/opportunities",
    cleanParams({
      search: params.search,
      stageId: params.stageId,
      opportunityTypeId: params.opportunityTypeId,
      sourceId: params.sourceId,
      priorityId: params.priorityId,
      ownerEmployeeId: params.ownerEmployeeId,
      accountId: params.accountId,
      limit: params.limit ?? 50,
      offset: params.offset ?? 0,
    })
  );

/** GET /api/opportunities/lookups */
export const getOpportunityLookups = () => api.get("/api/opportunities/lookups");

/** GET /api/opportunities/pipeline — kanban board by stage */
export const getOpportunityPipeline = (params = {}) =>
  api.get("/api/opportunities/pipeline", cleanParams({ search: params.search }));

/** PUT /api/opportunities/:id/stage — drag card to new stage */
export const moveOpportunityStage = (opportunityId, stageId) =>
  api.put(`/api/opportunities/${opportunityId}/stage`, { stageId: Number(stageId) });

/** GET /api/opportunities/:opportunityId */
export const getOpportunityById = (opportunityId) =>
  api.get(`/api/opportunities/${opportunityId}`);

/** POST /api/opportunities */
export const createOpportunity = (payload) => api.create("/api/opportunities", payload);

/** PUT /api/opportunities/:opportunityId */
export const updateOpportunity = (opportunityId, payload) =>
  api.put(`/api/opportunities/${opportunityId}`, payload);

/** DELETE /api/opportunities/:opportunityId — soft delete */
export const deactivateOpportunity = (opportunityId) =>
  api.delete(`/api/opportunities/${opportunityId}`);
