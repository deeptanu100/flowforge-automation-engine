/** Workflow state management hook */
import { useState, useCallback, useRef, useEffect } from 'react';
import {
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  type Node,
  type Edge,
  type OnConnect,
} from '@xyflow/react';
import type { TokenUsageEntry, WorkflowListItem } from '../types/workflow';
import { createWorkflow, updateWorkflow, executeWorkflow, getWorkflows, getWorkflow } from '../api/client';

const defaultApiData = {
  label: 'API Request',
  url: '',
  method: 'GET',
  headers: '',
  body: '',
  apiKey: '',
  status: 'idle',
  retryCount: 0,
  retryDelay: 1000,
  retryBackoff: 'linear',
  continueOnError: false,
};

const defaultComputeData = {
  label: 'Local Compute',
  device: 'cpu',
  script: '',
  params: {},
  status: 'idle',
  retryCount: 0,
  retryDelay: 1000,
  retryBackoff: 'linear',
  continueOnError: false,
};

const defaultConditionalData = {
  label: 'Conditional',
  condition: '',
  status: 'idle',
};

const defaultLoopData = {
  label: 'Loop Iterator',
  arrayPath: '',
  maxIterations: 100,
  status: 'idle',
};

type NodeType = 'apiRequest' | 'localCompute' | 'tutorialNode' | 'conditional' | 'loop';

export function useWorkflow() {
  const { updateNodeData } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [workflowName, setWorkflowName] = useState('Untitled Workflow');
  const [workflowVersion, setWorkflowVersion] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [execStatus, setExecStatus] = useState<'idle' | 'running' | 'success' | 'failed' | 'partial' | null>(null);
  const [execMessage, setExecMessage] = useState('');
  const [nodeTokenUsage, setNodeTokenUsage] = useState<TokenUsageEntry[]>([]);
  const [executionResults, setExecutionResults] = useState<any[]>([]);
  const [savedWorkflows, setSavedWorkflows] = useState<WorkflowListItem[]>([]);
  const workflowIdRef = useRef<string | null>(null);

  // Keep ref in sync
  useEffect(() => {
    workflowIdRef.current = workflowId;
  }, [workflowId]);

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

  const createNodeCallbacks = useCallback(
    (id: string) => ({
      onDelete: () => deleteNode(id),
      onChange: (field: string, value: string) => {
        if (field === 'params') {
          try {
            updateNodeData(id, { params: JSON.parse(value) });
          } catch {
            updateNodeData(id, { params: {} });
          }
          return;
        }
        // Handle boolean conversion for continueOnError
        if (field === 'continueOnError') {
          updateNodeData(id, { [field]: value === 'true' });
          return;
        }
        // Handle numeric fields
        if (['retryCount', 'retryDelay', 'maxIterations'].includes(field)) {
          updateNodeData(id, { [field]: parseInt(value) || 0 });
          return;
        }

        updateNodeData(id, { [field]: value });
      },
    }),
    [deleteNode, updateNodeData]
  );

  const addNode = useCallback(
    (type: NodeType) => {
      const id = `${type}-${Date.now()}`;

      const data = type === 'apiRequest'
        ? { ...defaultApiData }
        : type === 'localCompute'
          ? { ...defaultComputeData }
          : type === 'conditional'
            ? { ...defaultConditionalData }
            : type === 'loop'
              ? { ...defaultLoopData }
              : { title: 'New Note', content: '' };

      const nodeData = {
        ...data,
        ...createNodeCallbacks(id),
      };

      setNodes((nds) => {
        // Updated layout matrix for 600px massive node width
        const position = {
          x: (window.innerWidth / 2 || 800) - 300 + (nds.length % 3) * 640,
          y: 200 + Math.floor(nds.length / 3) * 400,
        };
        const newNode: Node = { id, type, position, data: nodeData };
        return [...nds, newNode];
      });
    },
    [setNodes, createNodeCallbacks]
  );

  const initRef = useRef(false);
  useEffect(() => {
    // Scaffold initial default workspace block to witness 600px node correctly from beginning
    if (!initRef.current) {
      initRef.current = true;
      setTimeout(() => addNode('apiRequest'), 50);
    }
  }, [addNode]);

  const saveWorkflow = useCallback(async () => {
    setIsSaving(true);
    try {
      const flowData = {
        nodes: nodes.map((n) => ({
          id: n.id,
          type: n.type as NodeType,
          position: n.position,
          data: { ...n.data, onChange: undefined, onDelete: undefined } as any,
        })) as any,
        edges: edges as any,
      };

      if (workflowIdRef.current) {
        const result = await updateWorkflow(workflowIdRef.current, { name: workflowName, workflow_json_data: flowData });
        setWorkflowVersion(result.version || workflowVersion + 1);
      } else {
        const result = await createWorkflow({ name: workflowName, workflow_json_data: flowData });
        setWorkflowId(result.id);
        workflowIdRef.current = result.id;
        setWorkflowVersion(result.version || 1);
      }
    } catch (err) {
      console.error('Save failed:', err);
    }
    setIsSaving(false);
  }, [nodes, edges, workflowName, workflowVersion]);

  const loadWorkflow = useCallback(async (id: string) => {
    try {
      const wf = await getWorkflow(id);
      setWorkflowId(wf.id!);
      workflowIdRef.current = wf.id!;
      setWorkflowName(wf.name);
      setWorkflowVersion(wf.version || 1);

      const flowData = wf.workflow_json_data;
      if (flowData && flowData.nodes) {
        const hydratedNodes: Node[] = flowData.nodes.map((n: any) => ({
          id: n.id,
          type: n.type,
          position: n.position,
          data: {
            ...n.data,
            ...createNodeCallbacks(n.id),
          },
        }));
        setNodes(hydratedNodes);
        setEdges(flowData.edges || []);
      }

      // Reset execution state
      setExecStatus(null);
      setExecMessage('');
      setExecutionResults([]);
      setNodeTokenUsage([]);
    } catch (err) {
      console.error('Load failed:', err);
    }
  }, [setNodes, setEdges, createNodeCallbacks]);

  const listWorkflows = useCallback(async () => {
    try {
      const list = await getWorkflows();
      setSavedWorkflows(list);
      return list;
    } catch (err) {
      console.error('Failed to list workflows:', err);
      return [];
    }
  }, []);

  const runWorkflow = useCallback(async () => {
    // Auto-save first if needed
    if (!workflowIdRef.current) {
      await saveWorkflow();
    }
    // Re-check after save — use ref for immediate value
    if (!workflowIdRef.current) return;

    setIsExecuting(true);
    setExecStatus('running');
    setExecMessage('Executing workflow...');

    // Set all nodes to running
    setNodes((nds) => nds.map((n) => ({ ...n, data: { ...n.data, status: 'running' } })));

    try {
      const result = await executeWorkflow(workflowIdRef.current);

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

      const statusMap: Record<string, 'success' | 'failed' | 'partial'> = {
        success: 'success',
        failed: 'failed',
        partial: 'partial',
      };
      setExecStatus(statusMap[result.status] || 'failed');
      setExecMessage(
        result.status === 'success'
          ? `Workflow completed — ${result.nodes_executed}/${result.nodes_total} nodes executed`
          : result.status === 'partial'
            ? `Workflow partially completed — some nodes continued on error`
            : `Workflow failed at node ${result.nodes_executed}/${result.nodes_total}`
      );
    } catch (err: any) {
      setExecStatus('failed');
      setExecMessage(err.response?.data?.detail || 'Execution failed');
      setNodes((nds) => nds.map((n) => ({ ...n, data: { ...n.data, status: 'error' } })));
    }
    setIsExecuting(false);
  }, [nodes, edges, saveWorkflow, setNodes]);

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
    workflowVersion,
    saveWorkflow,
    loadWorkflow,
    listWorkflows,
    savedWorkflows,
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
