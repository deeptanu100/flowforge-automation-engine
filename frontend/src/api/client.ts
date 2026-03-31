/** API client for FlowForge backend */
import axios from 'axios';
import type {
  WorkflowData,
  WorkflowListItem,
  WorkflowVersionItem,
  Credential,
  TokenStats,
  TokenUsageEntry,
  ExecutionResult,
  DeviceAvailability,
  ScheduleData,
} from '../types/workflow';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// ===== Workflows =====
export const getWorkflows = (): Promise<WorkflowListItem[]> =>
  api.get('/workflows/').then((r) => r.data);

export const getWorkflow = (id: string): Promise<WorkflowData & { version: number }> =>
  api.get(`/workflows/${id}`).then((r) => r.data);

export const createWorkflow = (data: Partial<WorkflowData>) =>
  api.post('/workflows/', data).then((r) => r.data);

export const updateWorkflow = (id: string, data: Partial<WorkflowData>) =>
  api.put(`/workflows/${id}`, data).then((r) => r.data);

export const deleteWorkflow = (id: string) =>
  api.delete(`/workflows/${id}`).then((r) => r.data);

// ===== Workflow Versions =====
export const getWorkflowVersions = (id: string): Promise<WorkflowVersionItem[]> =>
  api.get(`/workflows/${id}/versions`).then((r) => r.data);

export const restoreWorkflowVersion = (id: string, versionNumber: number) =>
  api.post(`/workflows/${id}/restore/${versionNumber}`).then((r) => r.data);

// ===== Execution =====
export const executeWorkflow = (id: string): Promise<ExecutionResult> =>
  api.post(`/execute/${id}`).then((r) => r.data);

export const testExecute = (flowData: any): Promise<ExecutionResult> =>
  api.post('/execute/test', flowData).then((r) => r.data);

export const getExecutionLogs = (workflowId: string) =>
  api.get(`/execute/logs/${workflowId}`).then((r) => r.data);

// ===== Credentials =====
export const getCredentials = (): Promise<Credential[]> =>
  api.get('/credentials/').then((r) => r.data);

export const createCredential = (data: { name: string; service_name: string; api_key: string }) =>
  api.post('/credentials/', data).then((r) => r.data);

export const deleteCredential = (id: string) =>
  api.delete(`/credentials/${id}`).then((r) => r.data);

// ===== Stats =====
export const getTokenStats = (): Promise<TokenStats> =>
  api.get('/stats/tokens').then((r) => r.data);

export const getWorkflowTokenUsage = (workflowId: string): Promise<TokenUsageEntry[]> =>
  api.get(`/stats/tokens/workflow/${workflowId}`).then((r) => r.data);

// ===== Schedules =====
export const getSchedules = (): Promise<ScheduleData[]> =>
  api.get('/schedules/').then((r) => r.data);

export const getScheduleForWorkflow = (workflowId: string): Promise<ScheduleData> =>
  api.get(`/schedules/${workflowId}`).then((r) => r.data);

export const createSchedule = (workflowId: string, cronExpression: string) =>
  api.post('/schedules/', { workflow_id: workflowId, cron_expression: cronExpression }).then((r) => r.data);

export const updateSchedule = (scheduleId: string, data: { cron_expression?: string; is_active?: boolean }) =>
  api.put(`/schedules/${scheduleId}`, data).then((r) => r.data);

export const deleteSchedule = (scheduleId: string) =>
  api.delete(`/schedules/${scheduleId}`).then((r) => r.data);

// ===== System =====
export const getDevices = (): Promise<DeviceAvailability> =>
  api.get('/devices').then((r) => r.data);

export default api;
