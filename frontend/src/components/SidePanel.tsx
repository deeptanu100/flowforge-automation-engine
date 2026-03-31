import React, { useState, useEffect } from 'react';
import { X, Key, Trash2, Plus, BarChart3, ShieldCheck, TerminalSquare, FolderOpen } from 'lucide-react';
import type { TokenUsageEntry, Credential, NodeExecutionResult, WorkflowListItem } from '../types/workflow';
import { getCredentials, createCredential, deleteCredential } from '../api/client';
import WorkflowBrowser from './WorkflowBrowser';
import SchedulePanel from './SchedulePanel';

interface SidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  tokenUsage: TokenUsageEntry[];
  executionResults: NodeExecutionResult[];
  // Workflow browser props
  workflows: WorkflowListItem[];
  currentWorkflowId: string | null;
  onLoadWorkflow: (id: string) => void;
  onRefreshWorkflows: () => void;
}

export default function SidePanel({
  isOpen, onClose, tokenUsage, executionResults,
  workflows, currentWorkflowId, onLoadWorkflow, onRefreshWorkflows,
}: SidePanelProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'output' | 'workflows'>('dashboard');
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [isAddingCred, setIsAddingCred] = useState(false);
  const [newCred, setNewCred] = useState({ name: '', service_name: 'OpenAI', api_key: '' });

  useEffect(() => {
    if (isOpen) {
      loadCredentials();
      if (activeTab === 'workflows') {
        onRefreshWorkflows();
      }
    }
  }, [isOpen, activeTab]);

  const loadCredentials = async () => {
    try {
      const creds = await getCredentials();
      setCredentials(creds);
    } catch (err) {
      console.error('Failed to load credentials', err);
    }
  };

  const handleAddCredential = async () => {
    if (!newCred.name || !newCred.api_key) return;
    try {
      await createCredential(newCred);
      setNewCred({ name: '', service_name: 'OpenAI', api_key: '' });
      setIsAddingCred(false);
      loadCredentials();
    } catch (err) {
      console.error('Failed to add credential', err);
    }
  };

  const handleDeleteCredential = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this credential?')) return;
    try {
      await deleteCredential(id);
      loadCredentials();
    } catch (err) {
      console.error('Failed to delete credential', err);
    }
  };

  const totalWorkflowTokens = tokenUsage.reduce((acc, curr) => acc + curr.total_tokens, 0);
  const totalRequests = tokenUsage.reduce((acc, curr) => acc + curr.execution_count, 0);
  const totalCostEstimate = totalWorkflowTokens * 0.000002; // Very rough estimate

  const tabConfig = [
    { key: 'dashboard' as const, label: 'Overview', color: 'accent' },
    { key: 'output' as const, label: 'Output', color: 'info' },
    { key: 'workflows' as const, label: 'Workflows', color: 'success' },
  ];

  return (
    <div className={`side-panel ${isOpen ? 'side-panel--open' : ''} shadow-[0_0_60px_rgba(0,0,0,0.5)] backdrop-blur-2xl bg-surface-0/80`}>
      <div className="side-panel-header">
        <h2 className="flex items-center gap-2">
          {activeTab === 'dashboard' && <BarChart3 className="w-4 h-4 text-accent" />}
          {activeTab === 'output' && <TerminalSquare className="w-4 h-4 text-info" />}
          {activeTab === 'workflows' && <FolderOpen className="w-4 h-4 text-success" />}
          {activeTab === 'dashboard' ? 'Dashboard' : activeTab === 'output' ? 'Output Log' : 'Workflows'}
        </h2>
        <button className="side-panel-close group" onClick={onClose} title="Close Panel">
          <X className="w-5 h-5 group-hover:scale-110 transition-transform" />
        </button>
      </div>

      <div className="flex px-6 pt-4 gap-4 border-b border-white/5">
        {tabConfig.map((tab) => (
          <button
            key={tab.key}
            className={`pb-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === tab.key
                ? `text-white border-${tab.color}`
                : 'text-text-muted border-transparent hover:text-white/80'
            }`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="side-panel-content custom-scrollbar">
        {activeTab === 'dashboard' ? (
          <>
            <h3 className="section-heading tracking-[0.15em] text-[10px] text-text-muted mt-2">Usage Overview</h3>
            
            <div className="stats-grid">
              <div className="stat-card ring-1 ring-border/50 hover:ring-accent/30 transition-shadow">
                <div className="stat-value">{totalWorkflowTokens.toLocaleString()}</div>
                <div className="stat-label">Total Tokens</div>
              </div>
              <div className="stat-card ring-1 ring-border/50 hover:ring-accent/30 transition-shadow">
                <div className="stat-value">${totalCostEstimate.toFixed(4)}</div>
                <div className="stat-label">Est. Cost</div>
              </div>
              <div className="stat-card ring-1 ring-border/50 hover:ring-accent/30 transition-shadow">
                <div className="stat-value">{totalRequests}</div>
                <div className="stat-label">Requests</div>
              </div>
              <div className="stat-card ring-1 ring-border/50 hover:ring-accent/30 transition-shadow">
                <div className="stat-value">{tokenUsage.length}</div>
                <div className="stat-label">Active Nodes</div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-6 border-b border-border pb-2">
              <h3 className="section-heading border-none pb-0 m-0 tracking-[0.15em] text-[10px] text-text-muted flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                API Credentials
              </h3>
              <button 
                className="text-text-muted hover:text-accent transition-colors"
                onClick={() => setIsAddingCred(!isAddingCred)}
                title="Add new credential"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {isAddingCred && (
              <div className="add-cred-form shadow-lg ring-1 ring-accent/20 animate-in fade-in slide-in-from-top-2">
                <input
                  type="text"
                  placeholder="Name (e.g. OpenAI Prod)"
                  value={newCred.name}
                  onChange={e => setNewCred({...newCred, name: e.target.value})}
                  autoFocus
                />
                <input
                  type="text"
                  placeholder="Service (e.g. OpenAI, Anthropic)"
                  value={newCred.service_name}
                  onChange={e => setNewCred({...newCred, service_name: e.target.value})}
                />
                <input
                  type="password"
                  placeholder="API Key (sk-...)"
                  value={newCred.api_key}
                  onChange={e => setNewCred({...newCred, api_key: e.target.value})}
                />
                <button 
                  className="add-cred-btn mt-1"
                  disabled={!newCred.name || !newCred.api_key}
                  onClick={handleAddCredential}
                >
                  Save Secure Credential
                </button>
              </div>
            )}

            {credentials.length === 0 && !isAddingCred ? (
              <div className="text-center py-8 text-text-muted text-sm border border-dashed border-border rounded-xl">
                No credentials saved securely yet.
              </div>
            ) : (
              <div className="flex flex-col gap-2 relative">
                {credentials.map(attr => (
                  <div key={attr.id} className="cred-item group relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                    <div className="cred-info z-10">
                      <span className="cred-name flex items-center gap-1.5">
                        <Key className="w-3 h-3 text-text-muted/60" />
                        {attr.name}
                      </span>
                      <span className="cred-preview ml-4">{attr.key_preview}</span>
                    </div>
                    <button 
                      className="cred-delete z-10"
                      onClick={(e) => handleDeleteCredential(attr.id, e)}
                      title="Delete Credential"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : activeTab === 'output' ? (
          <div className="flex flex-col gap-4 mt-2">
            {executionResults.length === 0 ? (
              <div className="text-center py-8 text-text-muted text-sm border border-dashed border-border rounded-xl">
                Run a workflow to see output logs.
              </div>
            ) : (
              executionResults.map((res, idx) => (
                <div key={res.node_id} className="bg-surface-1 border border-white/10 rounded-xl overflow-hidden shadow-lg animate-in slide-in-from-bottom-2 fade-in" style={{ animationDelay: `${idx * 100}ms` }}>
                  <div className={`px-4 py-2 flex items-center justify-between text-[11px] font-bold tracking-widest uppercase ${
                    res.status === 'success' ? 'bg-success/20 text-success' 
                    : res.status === 'skipped' ? 'bg-white/5 text-text-muted'
                    : 'bg-error/20 text-error'
                  }`}>
                    <span>Node: {res.node_id.split('-')[0]}</span>
                    <span>{res.status}</span>
                  </div>
                  <div className="p-4 bg-black/40 overflow-x-auto text-[11px] font-mono text-white/70">
                    <pre>{res.error ? res.error : JSON.stringify(res.data, null, 2)}</pre>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* Workflows Tab */
          <div className="flex flex-col gap-6 mt-2">
            <WorkflowBrowser
              workflows={workflows}
              currentWorkflowId={currentWorkflowId}
              onLoad={onLoadWorkflow}
              onRefresh={onRefreshWorkflows}
            />
            
            <div className="h-px bg-white/5" />
            
            <SchedulePanel workflowId={currentWorkflowId} />
          </div>
        )}
      </div>
    </div>
  );
}
