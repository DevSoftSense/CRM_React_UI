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

/** GET /api/campaigns — Paginated and filtered campaigns */
export const getCampaigns = (params = {}) =>
  api.get(
    "/api/campaigns",
    cleanParams({
      search: params.search,
      channelId: params.channelId,
      statusId: params.statusId,
      ownerEmployeeId: params.ownerEmployeeId,
      startFrom: params.startFrom,
      startTo: params.startTo,
      limit: params.limit ?? 50,
      offset: params.offset ?? 0,
    })
  );

/** GET /api/campaigns/lookups — channels, statuses, owners, currencies */
export const getCampaignLookups = () => api.get("/api/campaigns/lookups");

/** GET /api/campaigns/dropdown — lightweight picker for lead/deal forms */
export const getCampaignDropdown = () => api.get("/api/campaigns/dropdown");

/** GET /api/campaigns/stats — executive KPI overview & channel distribution */
export const getCampaignStats = () => api.get("/api/campaigns/stats");

/** GET /api/campaigns/:id — full campaign details with recent leads and deals */
export const getCampaignById = (campaignId) => api.get(`/api/campaigns/${campaignId}`);

/** POST /api/campaigns — create new campaign */
export const createCampaign = (payload) => api.create("/api/campaigns", payload);

/** PUT /api/campaigns/:id — update existing campaign */
export const updateCampaign = (campaignId, payload) =>
  api.put(`/api/campaigns/${campaignId}`, payload);

/** DELETE /api/campaigns/:id — deactivate/soft-delete campaign */
export const deactivateCampaign = (campaignId) =>
  api.delete(`/api/campaigns/${campaignId}`);

