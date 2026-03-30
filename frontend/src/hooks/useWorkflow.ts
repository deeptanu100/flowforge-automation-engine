/** Workflow state management hook */
import { useState, useCallback } from 'react';
import {
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type OnConnect,
} from '@xyflow/react';
import type { TokenUsageEntry } from '../types/workflow';
import { createWorkflow, updateWorkflow, executeWorkflow } from '../api/client';

const defaultApiData = {
  label: 'API Request',
  url: '',
  method: 'GET',
  headers: '',
  body: '',
  apiKey: '',
  status: 'idle',
};

const defaultComputeData = {
  label: 'Local Compute',
  device: 'cpu',
  script: '',
  params: {},
  status: 'idle',
};

export function useWorkflow() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [workflowName, setWorkflowName] = useState('Untitled Workflow');
  const [isSaving, setIsSaving] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [execStatus, setExecStatus] = useState<'idle' | 'running' | 'success' | 'failed' | null>(null);
  const [execMessage, setExecMessage] = useState('');
  const [nodeTokenUsage, setNodeTokenUsage] = useState<TokenUsageEntry[]>([]);
  const [executionResults, setExecutionResults] = useState<any[]>([]);

  const onConnect: OnConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    [setEdges]
  );

  const deleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    },
    [setNodes, setEdges]
  );

  const addNode = useCallback(
    (type: 'apiRequest' | 'localCompute' | 'tutorialNode') => {
      const id = `${type}-${Date.now()}`;

      const data = type === 'apiRequest' 
          ? { ...defaultApiData } 
          : type === 'localCompute' 
            ? { ...defaultComputeData }
            : { title: 'New Note', content: '' };

      // Add onChange handler to each node's data
      const nodeData = {
        ...data,
        onDelete: () => deleteNode(id),
        onChange: (field: string, value: string) => {
          setNodes((nds) =>
            nds.map((n) => {
              if (n.id === id) {
                if (field === 'params') {
                  return { ...n, data: { ...n.data, params: JSON.parse(value) } };
                }
                return { ...n, data: { ...n.data, [field]: value } };
              }
              return n;
            })
          );
        },
      };

      setNodes((nds) => {
        // Prevent layout overlap by calculating positions sequentially on a grid
        const position = {
          x: (window.innerWidth / 2 || 600) - 220 + (nds.length % 3) * 480, // Center initial node + 480px horizontal spacing
          y: 200 + Math.floor(nds.length / 3) * 300, // 300px vertical spacing to clear node height
        };
        const newNode: Node = { id, type, position, data: nodeData };
        return [...nds, newNode];
      });
    },
    [setNodes, deleteNode]
  );

  const saveWorkflow = useCallback(async () => {
    setIsSaving(true);
    try {
      const flowData = {
        nodes: nodes.map((n) => ({
          id: n.id,
          type: n.type as 'apiRequest' | 'localCompute' | 'tutorialNode',
          position: n.position,
          data: { ...n.data, onChange: undefined } as any, // Strip function before serializing
        })) as any,
        edges: edges as any,
      };

      if (workflowId) {
        await updateWorkflow(workflowId, { name: workflowName, workflow_json_data: flowData });
      } else {
        const result = await createWorkflow({ name: workflowName, workflow_json_data: flowData });
        setWorkflowId(result.id);
      }
    } catch (err) {
      console.error('Save failed:', err);
    }
    setIsSaving(false);
  }, [nodes, edges, workflowId, workflowName]);

  const runWorkflow = useCallback(async () => {
    if (!workflowId) {
      // Auto-save first
      await saveWorkflow();
    }
    if (!workflowId) return;

    setIsExecuting(true);
    setExecStatus('running');
    setExecMessage('Executing workflow...');

    // Set all nodes to running
    setNodes((nds) => nds.map((n) => ({ ...n, data: { ...n.data, status: 'running' } })));

    try {
      const result = await executeWorkflow(workflowId);

      // Update node statuses based on results
      setNodes((nds) =>
        nds.map((n) => {
          const nodeResult = result.results.find((r: any) => r.node_id === n.id);
          return {
            ...n,
            data: { ...n.data, status: nodeResult ? nodeResult.status : 'idle' },
          };
        })
      );

      setExecutionResults(result.results);

      // Update token usage
      const usage: TokenUsageEntry[] = result.results
        .filter((r: any) => r.tokens_used > 0)
        .map((r: any) => ({
          node_id: r.node_id,
          node_label: nodes.find((n) => n.id === r.node_id)?.data?.label as string || r.node_id,
          total_tokens: r.tokens_used,
          total_cost: 0,
          total_request_bytes: r.request_bytes,
          total_response_bytes: r.response_bytes,
          execution_count: 1,
        }));
      setNodeTokenUsage(usage);

      setExecStatus(result.status === 'success' ? 'success' : 'failed');
      setExecMessage(
        result.status === 'success'
          ? `Workflow completed — ${result.nodes_executed}/${result.nodes_total} nodes executed`
          : `Workflow failed at node ${result.nodes_executed}/${result.nodes_total}`
      );
    } catch (err: any) {
      setExecStatus('failed');
      setExecMessage(err.response?.data?.detail || 'Execution failed');
      setNodes((nds) => nds.map((n) => ({ ...n, data: { ...n.data, status: 'error' } })));
    }
    setIsExecuting(false);
  }, [workflowId, nodes, edges, saveWorkflow, setNodes]);

  const dismissExecStatus = useCallback(() => {
    setExecStatus(null);
    setExecMessage('');
  }, []);

  return {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    workflowId,
    workflowName,
    setWorkflowName,
    saveWorkflow,
    runWorkflow,
    isSaving,
    isExecuting,
    execStatus,
    execMessage,
    dismissExecStatus,
    nodeTokenUsage,
    executionResults,
  };
}
