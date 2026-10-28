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

export const getTasks = (params = {}) =>
  api.get(
    "/api/tasks",
    cleanParams({
      search: params.search,
      status: params.status,
      priority: params.priority,
      taskType: params.taskType,
      employeeId: params.employeeId,
      dueFrom: params.dueFrom,
      dueTo: params.dueTo,
      limit: params.limit ?? 50,
      offset: params.offset ?? 0,
    })
  );

export const getTaskLookups = () => api.get("/api/tasks/lookups");

export const getTaskById = (taskId) => api.get(`/api/tasks/${taskId}`);

export const createTask = (payload) => api.create("/api/tasks", payload);

export const updateTask = (taskId, payload) => api.put(`/api/tasks/${taskId}`, payload);

export const completeTask = (taskId) => api.create(`/api/tasks/${taskId}/complete`, {});

export const deactivateTask = (taskId) => api.delete(`/api/tasks/${taskId}`);
