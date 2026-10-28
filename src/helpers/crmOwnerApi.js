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

/** GET /api/owners */
export const getOwners = (params = {}) =>
  api.get(
    "/api/owners",
    cleanParams({
      search: params.search,
      status: params.status,
      limit: params.limit ?? 50,
      offset: params.offset ?? 0,
    })
  );

/** GET /api/owners/dropdown — Owner select on Lead / Opportunity */
export const getOwnerDropdown = (params = {}) =>
  api.get(
    "/api/owners/dropdown",
    cleanParams({
      search: params.search,
      limit: params.limit ?? 200,
      ensureSeed: params.ensureSeed !== false,
    })
  );

/** GET /api/owners/:ownerId */
export const getOwnerById = (ownerId) => api.get(`/api/owners/${ownerId}`);

/** POST /api/owners */
export const createOwner = (payload) => api.create("/api/owners", payload);

/** PUT /api/owners/:ownerId */
export const updateOwner = (ownerId, payload) =>
  api.put(`/api/owners/${ownerId}`, payload);

/** DELETE /api/owners/:ownerId */
export const deactivateOwner = (ownerId) => api.delete(`/api/owners/${ownerId}`);
