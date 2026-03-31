import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useReactFlow,
  ReactFlowProvider,
  useStore
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useWorkflow } from '../hooks/useWorkflow';
import { nodeTypes } from '../nodes/nodeTypes';
import Toolbar from './Toolbar';
import SidePanel from './SidePanel';
import { CheckCircle, XCircle, Loader2, ChartBar } from 'lucide-react';

// Custom, robust interactive dot grid that pans perfectly with React Flow
function CursorGlowBackground() {
  const transform = useStore((s) => s.transform);
  const glowRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    let animationFrameId: number;
    
    const handlePointerMove = (e: PointerEvent) => {
      // Throttle via rAF for ultimate buttery-smooth performance
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      
      animationFrameId = requestAnimationFrame(() => {
        const rfElement = document.querySelector('.react-flow');
        if (rfElement && glowRef.current) {
          const bounds = rfElement.getBoundingClientRect();
          const x = e.clientX - bounds.left;
          const y = e.clientY - bounds.top;
          glowRef.current.style.setProperty('--mouse-x', `${x}px`);
          glowRef.current.style.setProperty('--mouse-y', `${y}px`);
        }
      });
    };
    
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div 
      ref={glowRef}
      className="absolute inset-0 z-0 pointer-events-none"
      style={{
        backgroundImage: 'radial-gradient(circle 1.5px at 1.5px 1.5px, rgba(0, 229, 255, 1) 100%, transparent)',
        backgroundSize: `${24 * transform[2]}px ${24 * transform[2]}px`,
        backgroundPosition: `${transform[0]}px ${transform[1]}px`,
        // Start black (100% opaque) and fade to 15% baseline opacity (rgba 0,0,0,0.15) instead of transparent
        maskImage: `radial-gradient(circle 350px at var(--mouse-x, -1000px) var(--mouse-y, -1000px), black 0%, rgba(0,0,0,0.15) 100%)`,
        WebkitMaskImage: `radial-gradient(circle 350px at var(--mouse-x, -1000px) var(--mouse-y, -1000px), black 0%, rgba(0,0,0,0.15) 100%)`
      }}
    />
  );
}

function FlowBuilder() {
  const {
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
  } = useWorkflow();

  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

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
        className="bg-canvas-bg"
        minZoom={0.2}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        defaultEdgeOptions={{ animated: true, style: { strokeWidth: 2 } }}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
      >
        {/* Unified Interactive dot overlay - Handles both base grid and glow */}
        <CursorGlowBackground />
        
        <Controls position="bottom-left" className="!m-6" />
        <MiniMap 
          position="bottom-right" 
          className="!m-6 !bg-surface-0 border !border-border rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden" 
          maskColor="rgba(10, 10, 15, 0.7)"
          nodeColor={(n: any) => {
            if (n.type === 'apiRequest') return '#7c5cfc';
            if (n.type === 'localCompute') return '#06b6d4';
            if (n.type === 'conditional') return '#ffb703';
            if (n.type === 'loop') return '#10b981';
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
              workflowVersion={workflowVersion}
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
        workflows={savedWorkflows}
        currentWorkflowId={workflowId}
        onLoadWorkflow={loadWorkflow}
        onRefreshWorkflows={listWorkflows}
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
