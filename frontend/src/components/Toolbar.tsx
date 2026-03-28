import React from 'react';
import { Plus, Save, Play, Loader2 } from 'lucide-react';

interface ToolbarProps {
  workflowName: string;
  setWorkflowName: (name: string) => void;
  onAddNode: (type: 'apiRequest' | 'localCompute' | 'tutorialNode') => void;
  onSave: () => void;
  onExecute: () => void;
  isSaving: boolean;
  isExecuting: boolean;
}

export default function Toolbar({
  workflowName,
  setWorkflowName,
  onAddNode,
  onSave,
  onExecute,
  isSaving,
  isExecuting,
}: ToolbarProps) {
  return (
    <div className="toolbar group">
      <input
        type="text"
        className="toolbar-name-input"
        value={workflowName}
        onChange={(e) => setWorkflowName(e.target.value)}
        placeholder="Untitled Workflow"
      />
      
      <div className="toolbar-divider" />

      <div className="relative group/dropdown">
        <button className="toolbar-btn">
          <Plus className="w-4 h-4" />
          <span>Add Node</span>
        </button>
        <div className="absolute top-full left-0 mt-2 w-48 bg-surface-1 border border-border rounded-xl shadow-2xl opacity-0 invisible group-hover/dropdown:opacity-100 group-hover/dropdown:visible transition-all flex flex-col p-1 backdrop-blur-xl z-20 overflow-hidden transform origin-top scale-95 group-hover/dropdown:scale-100">
          <button className="flex items-center gap-2 p-2 px-3 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-2 rounded-lg transition-colors text-left" onClick={() => onAddNode('apiRequest')}>
            <span className="w-2 h-2 rounded-full bg-node-api shadow-[0_0_8px_var(--color-node-api)]"></span> API Request
          </button>
          <button className="flex items-center gap-2 p-2 px-3 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-2 rounded-lg transition-colors text-left" onClick={() => onAddNode('localCompute')}>
            <span className="w-2 h-2 rounded-full bg-node-compute shadow-[0_0_8px_var(--color-node-compute)]"></span> Local Compute
          </button>
          <button className="flex items-center gap-2 p-2 px-3 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-2 rounded-lg transition-colors text-left" onClick={() => onAddNode('tutorialNode')}>
            <span className="w-2 h-2 rounded-full bg-warning shadow-[0_0_8px_var(--color-warning)]"></span> Tutorial Note
          </button>
        </div>
      </div>

      <button className="toolbar-btn" onClick={onSave} disabled={isSaving}>
        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        <span>Save</span>
      </button>

      <button className="toolbar-btn toolbar-btn--primary ml-2" onClick={onExecute} disabled={isExecuting}>
        {isExecuting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
        <span>Execute</span>
      </button>
    </div>
  );
}
