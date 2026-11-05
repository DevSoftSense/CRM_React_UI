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

export const getSalesDashboard = (params = {}) =>
  api.get(
    "/api/sales-dashboard",
    cleanParams({
      period: params.period || "this_month",
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      ownerId: params.ownerId,
    })
  );

export const getSalesDashboardLookups = () =>
  api.get("/api/sales-dashboard/lookups");

