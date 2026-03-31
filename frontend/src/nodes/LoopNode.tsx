import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { Repeat, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import type { LoopNodeData } from '../types/workflow';
import NodeDeleteButton from './NodeDeleteButton';

export type LoopNodeType = Node<LoopNodeData & { onChange: (field: string, value: string) => void; onDelete: () => void }, 'loop'>;

export default function LoopNode({ data, isConnectable }: NodeProps<LoopNodeType>) {
  const getStatusIcon = () => {
    switch (data.status) {
      case 'running': return <Loader2 className="w-4 h-4 animate-spin text-warning" />;
      case 'success': return <CheckCircle className="w-4 h-4 text-success" />;
      case 'error': return <XCircle className="w-4 h-4 text-error" />;
      default: return <span className="status-dot status-dot--idle" />;
    }
  };

  return (
    <div className="flow-node flow-node--loop">
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} />

      <div className="flow-node-header backdrop-blur-md bg-opacity-70">
        <Repeat className="node-icon w-4 h-4" />
        <span className="flex-1 truncate">{data.label || 'Loop Iterator'}</span>
        {getStatusIcon()}
        <NodeDeleteButton onDelete={data.onDelete} nodeLabel={data.label || 'Loop Iterator'} />
      </div>

      <div className="flow-node-body">
        <div className="flow-node-field">
          <label className="flow-node-label">Node Label</label>
          <input
            type="text"
            className="flow-node-input"
            value={data.label}
            onChange={(e) => data.onChange('label', e.target.value)}
            placeholder="Iterate API Results"
          />
        </div>

        <div className="flow-node-field mt-1">
          <label className="flow-node-label flex justify-between">
            <span>Array Path</span>
            <span className="text-[9px] opacity-60 normal-case">JSONPath from upstream</span>
          </label>
          <input
            type="text"
            className="flow-node-input font-mono text-xs"
            value={data.arrayPath}
            onChange={(e) => data.onChange('arrayPath', e.target.value)}
            placeholder="body.items"
          />
        </div>

        <div className="flow-node-field mt-1">
          <label className="flow-node-label flex justify-between">
            <span>Max Iterations</span>
            <span className="text-[9px] opacity-60">Safety cap</span>
          </label>
          <input
            type="number"
            className="flow-node-input w-32"
            value={data.maxIterations}
            onChange={(e) => data.onChange('maxIterations', e.target.value)}
            min={1}
            max={10000}
          />
        </div>

        <div className="loop-info-badge">
          <Repeat className="w-3 h-3" />
          <span>Each downstream node runs once per array item</span>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} />
    </div>
  );
}
