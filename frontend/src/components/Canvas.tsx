import React, { useRef, useState, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useWorkflow } from '../hooks/useWorkflow';
import { nodeTypes } from '../nodes/nodeTypes';
import Toolbar from './Toolbar';
import SidePanel from './SidePanel';
import { CheckCircle, XCircle, Loader2, ChartBar } from 'lucide-react';

function FlowBuilder() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
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
  } = useWorkflow();

  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      // Handle drag-and-drop node creation if implemented later
    },
    []
  );

  return (
    <div className="w-full h-full relative" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ maxZoom: 1, padding: 3 }}
        className="bg-canvas-bg"
        minZoom={0.2}
        maxZoom={2}
        defaultEdgeOptions={{ animated: true, style: { strokeWidth: 2 } }}
      >
        <Background color="rgba(255,255,255,0.05)" gap={24} size={2} />
        <Controls position="bottom-left" className="!m-6" />
        <MiniMap 
          position="bottom-right" 
          className="!m-6 !bg-surface-0 border !border-border rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden" 
          maskColor="rgba(10, 10, 15, 0.7)"
          nodeColor={(n: any) => {
            if (n.type === 'apiRequest') return '#7c5cfc';
            if (n.type === 'localCompute') return '#06b6d4';
            return '#f59e0b';
          }}
        />

        <Panel position="top-center" className="w-full pointer-events-none">
          <div className="pointer-events-auto">
            <Toolbar
              workflowName={workflowName}
              setWorkflowName={setWorkflowName}
              onAddNode={addNode}
              onSave={saveWorkflow}
              onExecute={runWorkflow}
              isSaving={isSaving}
              isExecuting={isExecuting}
            />
          </div>
        </Panel>
      </ReactFlow>

      {/* Slide-out Side Panel */}
      <SidePanel 
        isOpen={isSidePanelOpen} 
        onClose={() => setIsSidePanelOpen(false)} 
        tokenUsage={nodeTokenUsage}
        executionResults={executionResults}
      />

      {/* Main UI Toggle Overlay (Fixed) */}
      {!isSidePanelOpen && (
        <button 
          className="panel-toggle hover:scale-105 active:scale-95" 
          onClick={() => setIsSidePanelOpen(true)}
          title="Toggle dashboard panel"
        >
          <ChartBar className="w-5 h-5 text-accent" />
        </button>
      )}

      {/* Execution Status Banner Overlay */}
      {execStatus && (
        <div className={`exec-banner exec-banner--${execStatus}`}>
          {execStatus === 'running' && <Loader2 className="w-5 h-5 animate-spin" />}
          {execStatus === 'success' && <CheckCircle className="w-5 h-5" />}
          {execStatus === 'failed' && <XCircle className="w-5 h-5" />}
          <span className="flex-1">{execMessage}</span>
          <button 
            onClick={dismissExecStatus}
            className="ml-2 hover:bg-white/10 p-1 rounded transition-colors"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

export default function Canvas() {
  return (
    <ReactFlowProvider>
      <FlowBuilder />
    </ReactFlowProvider>
  );
}
