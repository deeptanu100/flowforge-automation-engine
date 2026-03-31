import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { GitBranch, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import type { ConditionalNodeData } from '../types/workflow';
import NodeDeleteButton from './NodeDeleteButton';

export type ConditionalNodeType = Node<ConditionalNodeData & { onChange: (field: string, value: string) => void; onDelete: () => void }, 'conditional'>;

export default function ConditionalNode({ data, isConnectable }: NodeProps<ConditionalNodeType>) {
  const getStatusIcon = () => {
    switch (data.status) {
      case 'running': return <Loader2 className="w-4 h-4 animate-spin text-warning" />;
      case 'success': return <CheckCircle className="w-4 h-4 text-success" />;
      case 'error': return <XCircle className="w-4 h-4 text-error" />;
      default: return <span className="status-dot status-dot--idle" />;
    }
  };

  return (
    <div className="flow-node flow-node--conditional">
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} />
      
      <div className="flow-node-header backdrop-blur-md bg-opacity-70">
        <GitBranch className="node-icon w-4 h-4" />
        <span className="flex-1 truncate">{data.label || 'Conditional'}</span>
        {getStatusIcon()}
        <NodeDeleteButton onDelete={data.onDelete} nodeLabel={data.label || 'Conditional'} />
      </div>

      <div className="flow-node-body">
        <div className="flow-node-field">
          <label className="flow-node-label">Node Label</label>
          <input
            type="text"
            className="flow-node-input"
            value={data.label}
            onChange={(e) => data.onChange('label', e.target.value)}
            placeholder="My Condition"
          />
        </div>

        <div className="flow-node-field mt-1">
          <label className="flow-node-label flex justify-between">
            <span>Condition Expression</span>
            <span className="text-[9px] opacity-60 normal-case">Uses {'{{ node_id }}'} syntax</span>
          </label>
          <textarea
            className="flow-node-input font-mono text-xs custom-scrollbar resize-none"
            value={data.condition}
            onChange={(e) => data.onChange('condition', e.target.value)}
            placeholder={'{{ upstream_id }}.status_code == 200'}
            rows={3}
            spellCheck={false}
          />
        </div>

        <div className="conditional-handles-legend">
          <div className="conditional-handle-label conditional-handle-label--true">
            <span className="conditional-handle-dot conditional-handle-dot--true" />
            True Path
          </div>
          <div className="conditional-handle-label conditional-handle-label--false">
            <span className="conditional-handle-dot conditional-handle-dot--false" />
            False Path
          </div>
        </div>
      </div>

      {/* Dual output handles */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="true-output"
        isConnectable={isConnectable}
        className="!left-[30%] conditional-handle--true"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="false-output"
        isConnectable={isConnectable}
        className="!left-[70%] conditional-handle--false"
      />
    </div>
  );
}
