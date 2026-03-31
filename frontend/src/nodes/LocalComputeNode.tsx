import { useState, useEffect } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { Monitor, CheckCircle, XCircle, Loader2, ChevronDown } from 'lucide-react';
import type { LocalComputeNodeData, DeviceAvailability } from '../types/workflow';
import { getDevices } from '../api/client';
import NodeDeleteButton from './NodeDeleteButton';

export type LocalComputeNodeType = Node<LocalComputeNodeData & { onChange: (field: string, value: string) => void; onDelete: () => void }, 'localCompute'>;

export default function LocalComputeNode({ data, isConnectable }: NodeProps<LocalComputeNodeType>) {
  const [devices, setDevices] = useState<DeviceAvailability | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

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
        <NodeDeleteButton onDelete={data.onDelete} nodeLabel={data.label || 'Local Compute'} />
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
            placeholder={"import sys\nimport json\n\nraw = sys.environ.get('FLOWFORGE_INPUT', '{}')\nprint(f'Processed: {raw}')"}
            spellCheck={false}
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

        {/* Advanced: Retry & Error Handling */}
        <button
          className="flow-node-advanced-toggle"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
          <span>Advanced</span>
        </button>

        {showAdvanced && (
          <div className="flow-node-advanced">
            <div className="flow-node-field">
              <label className="flow-node-label">Retry Count</label>
              <input
                type="number"
                className="flow-node-input w-24"
                value={data.retryCount || 0}
                onChange={(e) => data.onChange('retryCount', e.target.value)}
                min={0}
                max={5}
              />
            </div>
            <div className="flow-node-field mt-1">
              <label className="flow-node-label">Retry Delay (ms)</label>
              <input
                type="number"
                className="flow-node-input w-32"
                value={data.retryDelay || 1000}
                onChange={(e) => data.onChange('retryDelay', e.target.value)}
                min={100}
                step={100}
              />
            </div>
            <div className="flow-node-field mt-1">
              <label className="flow-node-label">Backoff Strategy</label>
              <select
                className="flow-node-select"
                value={data.retryBackoff || 'linear'}
                onChange={(e) => data.onChange('retryBackoff', e.target.value)}
              >
                <option value="linear">Linear</option>
                <option value="exponential">Exponential</option>
              </select>
            </div>
            <div className="flow-node-field mt-1">
              <label className="flow-node-label flex items-center justify-between">
                <span>Continue on Error</span>
                <button
                  className={`toggle-switch ${data.continueOnError ? 'toggle-switch--on' : ''}`}
                  onClick={() => data.onChange('continueOnError', data.continueOnError ? '' : 'true')}
                >
                  <span className="toggle-switch-knob" />
                </button>
              </label>
            </div>
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} />
    </div>
  );
}
