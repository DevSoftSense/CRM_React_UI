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

/** GET /api/contacts */
export const getContacts = (params = {}) =>
  api.get(
    "/api/contacts",
    cleanParams({
      search: params.search,
      accountId: params.accountId,
      isPrimary: params.isPrimary,
      limit: params.limit ?? 50,
      offset: params.offset ?? 0,
    })
  );

/** GET /api/contacts/dropdown — for Opportunity Primary Contact select */
export const getContactDropdown = (params = {}) =>
  api.get(
    "/api/contacts/dropdown",
    cleanParams({
      accountId: params.accountId,
      search: params.search,
      limit: params.limit ?? 200,
    })
  );

/** GET /api/contacts/:contactPersonId */
export const getContactById = (contactPersonId) =>
  api.get(`/api/contacts/${contactPersonId}`);

/** POST /api/contacts */
export const createContact = (payload) => api.create("/api/contacts", payload);

/** PUT /api/contacts/:contactPersonId */
export const updateContact = (contactPersonId, payload) =>
  api.put(`/api/contacts/${contactPersonId}`, payload);

/** DELETE /api/contacts/:contactPersonId */
export const deactivateContact = (contactPersonId) =>
  api.delete(`/api/contacts/${contactPersonId}`);
