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

/**
 * GET /api/reports/catalog
 * Retrieves the catalog of all 14 CRM reports categorized into 6 business segments.
 */
export const getReportCatalog = () => api.get("/api/reports/catalog");

/**
 * POST /api/reports/run
 * Executes a report with given code and filters.
 * @param {Object} payload { reportCode, dateFrom, dateTo, ownerEmployeeId, extraFilter }
 */
export const runReport = (payload) => api.create("/api/reports/run", payload);

/**
 * GET /api/reports/run
 * Alternative execution via query params.
 */
export const runReportGet = (params = {}) =>
  api.get("/api/reports/run", cleanParams(params));

