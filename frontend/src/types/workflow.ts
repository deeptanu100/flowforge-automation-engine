/** TypeScript type definitions for FlowForge */

export interface FlowNode {
  id: string;
  type: 'apiRequest' | 'localCompute' | 'tutorialNode';
  position: { x: number; y: number };
  data: ApiRequestNodeData | LocalComputeNodeData | TutorialNodeData;
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
}

export type LocalComputeNodeData = {
  label: string;
  device: 'cpu' | 'gpu' | 'npu';
  script: string;
  params: Record<string, string>;
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
  workflow_json_data: {
    nodes: FlowNode[];
    edges: FlowEdge[];
  };
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
  status: 'success' | 'failed';
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
