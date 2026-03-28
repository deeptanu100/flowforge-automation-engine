import { useState, useEffect } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { Monitor, Cpu, Server, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import type { LocalComputeNodeData, DeviceAvailability } from '../types/workflow';
import { getDevices } from '../api/client';

export type LocalComputeNodeType = Node<LocalComputeNodeData & { onChange: (field: string, value: string) => void }, 'localCompute'>;

export default function LocalComputeNode({ data, isConnectable }: NodeProps<LocalComputeNodeType>) {
  const [devices, setDevices] = useState<DeviceAvailability | null>(null);

  useEffect(() => {
    getDevices().then(setDevices).catch(console.error);
  }, []);

  const getStatusIcon = () => {
    switch (data.status) {
      case 'running': return <Loader2 className="w-4 h-4 animate-spin text-warning" />;
      case 'success': return <CheckCircle className="w-4 h-4 text-success" />;
      case 'error': return <XCircle className="w-4 h-4 text-error" />;
      default: return <span className="status-dot status-dot--idle" />;
    }
  };

  return (
    <div className={`flow-node flow-node--compute`}>
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} />
      
      <div className="flow-node-header backdrop-blur-md bg-opacity-70">
        <Monitor className="node-icon w-4 h-4" />
        <span className="flex-1 truncate">{data.label || 'Local Compute'}</span>
        {getStatusIcon()}
      </div>

      <div className="flow-node-body">
        <div className="flow-node-field">
          <label className="flow-node-label">Hardware Device</label>
          <div className="relative flex items-center">
            <select
              className="flow-node-select w-full"
              value={data.device}
              onChange={(e) => data.onChange('device', e.target.value)}
            >
              <option value="cpu">💻 CPU Compute</option>
              <option value="gpu" disabled={!devices?.gpu}>🎮 GPU (CUDA{devices && !devices.gpu ? ' - missing' : ''})</option>
              <option value="npu" disabled={!devices?.npu}>🧠 NPU (ONNX{devices && !devices.npu ? ' - missing' : ''})</option>
            </select>
          </div>
        </div>

        <div className="flow-node-field mt-1">
          <label className="flow-node-label">Python Script</label>
          <textarea
            className="flow-node-input font-mono text-[11px] leading-relaxed custom-scrollbar resize-y min-h-[100px]"
            value={data.script}
            onChange={(e) => data.onChange('script', e.target.value)}
            placeholder="import sys&#10;import json&#10;&#10;raw = sys.environ.get('FLOWFORGE_INPUT', '{}')&#10;print(f'Processed: {raw}')"
            spellCheck="false"
          />
        </div>

        <div className="flow-node-field mt-1">
          <label className="flow-node-label flex justify-between">
            <span>Global Variables</span>
            <span className="text-[9px] opacity-60">JSON format</span>
          </label>
          <textarea
            className="flow-node-input font-mono text-xs custom-scrollbar resize-none h-[40px]"
            value={JSON.stringify(data.params || {})}
            onChange={(e) => {
              try {
                // We keep it as string in state until valid
                data.onChange('params', e.target.value);
              } catch(err) {} 
            }}
            placeholder='{"batch_size": 32}'
          />
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} />
    </div>
  );
}
