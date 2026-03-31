/** TypeScript type definitions for FlowForge */

export interface FlowNode {
  id: string;
  type: 'apiRequest' | 'localCompute' | 'tutorialNode' | 'conditional' | 'loop';
  position: { x: number; y: number };
  data: ApiRequestNodeData | LocalComputeNodeData | TutorialNodeData | ConditionalNodeData | LoopNodeData;
}

export type TutorialNodeData = {
  title: string;
  content: string;
}

export type ApiRequestNodeData = {
  label: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers: string; // JSON string
  body: string;
  apiKey: string;
  credentialId?: string;
  status: 'idle' | 'running' | 'success' | 'error';
  // Retry & error handling
  retryCount?: number;
  retryDelay?: number;
  retryBackoff?: 'linear' | 'exponential';
  continueOnError?: boolean;
}

export type LocalComputeNodeData = {
  label: string;
  device: 'cpu' | 'gpu' | 'npu';
  script: string;
  params: Record<string, string>;
  status: 'idle' | 'running' | 'success' | 'error';
  // Retry & error handling
  retryCount?: number;
  retryDelay?: number;
  retryBackoff?: 'linear' | 'exponential';
  continueOnError?: boolean;
}

export type ConditionalNodeData = {
  label: string;
  condition: string;
  status: 'idle' | 'running' | 'success' | 'error';
}

export type LoopNodeData = {
  label: string;
  arrayPath: string;
  maxIterations: number;
  status: 'idle' | 'running' | 'success' | 'error';
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface WorkflowData {
  id?: string;
  name: string;
  description?: string;
  version?: number;
  workflow_json_data: {
    nodes: FlowNode[];
    edges: FlowEdge[];
  };
}

export interface WorkflowListItem {
  id: string;
  name: string;
  description?: string;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface WorkflowVersionItem {
  id: string;
  version_number: number;
  name: string;
  created_at: string;
}

export interface TokenUsageEntry {
  node_id: string;
  node_label: string | null;
  total_tokens: number;
  total_cost: number;
  total_request_bytes: number;
  total_response_bytes: number;
  execution_count: number;
}

export interface TokenStats {
  total_tokens: number;
  total_cost: number;
  total_requests: number;
}

export interface Credential {
  id: string;
  name: string;
  service_name: string;
  key_preview: string;
  created_at: string;
}

export interface ExecutionResult {
  execution_id: string;
  status: 'success' | 'failed' | 'partial';
  results: NodeExecutionResult[];
  nodes_executed: number;
  nodes_total: number;
}

export interface NodeExecutionResult {
  node_id: string;
  status: 'success' | 'error' | 'skipped';
  data: any;
  error: string | null;
  tokens_used: number;
  request_bytes: number;
  response_bytes: number;
  duration_ms: number;
}

export interface DeviceAvailability {
  cpu: boolean;
  gpu: boolean;
  npu: boolean;
}

export interface ScheduleData {
  id: string;
  workflow_id: string;
  cron_expression: string;
  is_active: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  created_at: string;
}
