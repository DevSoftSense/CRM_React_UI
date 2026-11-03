import axios from "axios";
import { APIClient, getCrmApiBaseUrl } from "./api_helper";

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

export const getDocuments = (params = {}) =>
  api.get(
    "/api/documents",
    cleanParams({
      search: params.search,
      folder: params.folder,
      fileType: params.fileType,
      ownerId: params.ownerId,
      entityType: params.entityType,
      entityId: params.entityId,
      tab: params.tab,
      limit: params.limit ?? 50,
      offset: params.offset ?? 0,
    })
  );

export const getDocumentStats = () => api.get("/api/documents/stats");

export const getDocumentLookups = () => api.get("/api/documents/lookups");

export const getDocumentById = (id) => api.get(`/api/documents/${id}`);

export const uploadDocument = (formData) => {
  return axios.post("/api/documents/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

export const createDocumentFolder = (folderName) =>
  api.create("/api/documents/folder", { folderName });

export const deactivateDocument = (id) => api.delete(`/api/documents/${id}`);

export const getDocumentDownloadUrl = (id) => {
  const base = getCrmApiBaseUrl() || "";
  return `${base.replace(/\/+$/, "")}/api/documents/${id}/download`;
};

