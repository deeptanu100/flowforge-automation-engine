import { useState, useEffect } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { Globe, Play, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import type { ApiRequestNodeData, Credential } from '../types/workflow';
import { getCredentials } from '../api/client';
import NodeDeleteButton from './NodeDeleteButton';

export type ApiRequestNodeType = Node<ApiRequestNodeData & { onChange: (field: string, value: string) => void; onDelete: () => void }, 'apiRequest'>;

export default function ApiRequestNode({ data, isConnectable }: NodeProps<ApiRequestNodeType>) {
  const [credentials, setCredentials] = useState<Credential[]>([]);

  useEffect(() => {
    getCredentials().then(setCredentials).catch(console.error);
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
    <div className={`flow-node flow-node--api`}>
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} />
      
      <div className="flow-node-header backdrop-blur-md bg-opacity-70">
        <Globe className="node-icon w-4 h-4" />
        <span className="flex-1 truncate">{data.label || 'API Request'}</span>
        {getStatusIcon()}
        <NodeDeleteButton onDelete={data.onDelete} nodeLabel={data.label || 'API Request'} />
      </div>

      <div className="flow-node-body">
        <div className="flow-node-field">
          <label className="flow-node-label">HTTP Method & URL</label>
          <div className="flex gap-2">
            <select
              className="flow-node-select w-24 flex-shrink-0"
              value={data.method}
              onChange={(e) => data.onChange('method', e.target.value)}
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
              <option value="PATCH">PATCH</option>
            </select>
            <input
              type="text"
              className="flow-node-input flex-1"
              value={data.url}
              onChange={(e) => data.onChange('url', e.target.value)}
              placeholder="https://api.example.com/v1/data"
            />
          </div>
        </div>

        <div className="flow-node-field mt-1">
          <label className="flow-node-label">Headers (JSON)</label>
          <textarea
            className="flow-node-input font-mono text-xs custom-scrollbar resize-none"
            value={data.headers}
            onChange={(e) => data.onChange('headers', e.target.value)}
            placeholder='{"Content-Type": "application/json"}'
            rows={2}
          />
        </div>

        {data.method !== 'GET' && data.method !== 'DELETE' && (
          <div className="flow-node-field mt-1">
            <label className="flow-node-label">Body (JSON / Text)</label>
            <textarea
              className="flow-node-input font-mono text-xs custom-scrollbar resize-y min-h-[40px]"
              value={data.body || ''}
              onChange={(e) => data.onChange('body', e.target.value)}
              placeholder='{"key": "value"}'
              rows={2}
            />
          </div>
        )}

        <div className="flow-node-field mt-1">
          <label className="flow-node-label flex justify-between">
            <span>Authentication</span>
            <span className="text-[9px] opacity-60">Optional</span>
          </label>
          <select
            className="flow-node-select"
            value={data.credentialId || ''}
            onChange={(e) => data.onChange('credentialId', e.target.value)}
          >
            <option value="">No Authentication</option>
            {Array.isArray(credentials) && credentials.map(c => (
              <option key={c.id} value={c.id}>{c.name} ({c.service_name})</option>
            ))}
          </select>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} />
    </div>
  );
}
