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

/** GET /api/customers */
export const getCustomers = (params = {}) =>
  api.get(
    "/api/customers",
    cleanParams({
      search: params.search,
      status: params.status,
      accountTypeId: params.accountTypeId,
      limit: params.limit ?? 50,
      offset: params.offset ?? 0,
    })
  );

/** GET /api/customers/dropdown — for Opportunity Account select */
export const getCustomerDropdown = (params = {}) =>
  api.get(
    "/api/customers/dropdown",
    cleanParams({
      search: params.search,
      limit: params.limit ?? 200,
    })
  );

/** GET /api/customers/lookups */
export const getCustomerLookups = () => api.get("/api/customers/lookups");

/** GET /api/customers/:accountId */
export const getCustomerById = (accountId) => api.get(`/api/customers/${accountId}`);

/** POST /api/customers */
export const createCustomer = (payload) => api.create("/api/customers", payload);

/** PUT /api/customers/:accountId */
export const updateCustomer = (accountId, payload) =>
  api.put(`/api/customers/${accountId}`, payload);

/** DELETE /api/customers/:accountId */
export const deactivateCustomer = (accountId) => api.delete(`/api/customers/${accountId}`);
