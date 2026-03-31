import React, { useState, useEffect } from 'react';
import { FolderOpen, Trash2, Clock, History, RotateCcw, Loader2 } from 'lucide-react';
import type { WorkflowListItem, WorkflowVersionItem } from '../types/workflow';
import { getWorkflowVersions, restoreWorkflowVersion, deleteWorkflow } from '../api/client';

interface WorkflowBrowserProps {
  workflows: WorkflowListItem[];
  currentWorkflowId: string | null;
  onLoad: (id: string) => void;
  onRefresh: () => void;
}

export default function WorkflowBrowser({ workflows, currentWorkflowId, onLoad, onRefresh }: WorkflowBrowserProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [versions, setVersions] = useState<WorkflowVersionItem[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [restoringVersion, setRestoringVersion] = useState<number | null>(null);

  const handleToggleVersions = async (workflowId: string) => {
    if (expandedId === workflowId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(workflowId);
    setLoadingVersions(true);
    try {
      const v = await getWorkflowVersions(workflowId);
      setVersions(v);
    } catch (err) {
      console.error('Failed to load versions', err);
    }
    setLoadingVersions(false);
  };

  const handleRestore = async (workflowId: string, versionNumber: number) => {
    setRestoringVersion(versionNumber);
    try {
      await restoreWorkflowVersion(workflowId, versionNumber);
      onLoad(workflowId);
      onRefresh();
    } catch (err) {
      console.error('Failed to restore version', err);
    }
    setRestoringVersion(null);
  };

  const handleDelete = async (workflowId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this workflow? This cannot be undone.')) return;
    try {
      await deleteWorkflow(workflowId);
      onRefresh();
    } catch (err) {
      console.error('Failed to delete workflow', err);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + 
           ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col gap-3">
      {workflows.length === 0 ? (
        <div className="text-center py-8 text-text-muted text-sm border border-dashed border-border rounded-xl">
          <FolderOpen className="w-6 h-6 mx-auto mb-2 opacity-50" />
          No saved workflows yet.
          <br />
          <span className="text-[11px] opacity-60">Use the Save button to persist your first workflow.</span>
        </div>
      ) : (
        workflows.map((wf) => (
          <div key={wf.id} className="workflow-card group">
            <div
              className={`workflow-card-main ${currentWorkflowId === wf.id ? 'workflow-card-main--active' : ''}`}
              onClick={() => onLoad(wf.id)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text-primary truncate">{wf.name}</span>
                  <span className="version-badge text-[9px]">v{wf.version}</span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-[10px] text-text-muted">
                  <span className="flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {formatDate(wf.updated_at)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  className="p-1.5 rounded-lg hover:bg-white/10 text-text-muted hover:text-info transition-colors"
                  onClick={(e) => { e.stopPropagation(); handleToggleVersions(wf.id); }}
                  title="Version history"
                >
                  <History className="w-3.5 h-3.5" />
                </button>
                <button
                  className="p-1.5 rounded-lg hover:bg-error/20 text-text-muted hover:text-error transition-colors"
                  onClick={(e) => handleDelete(wf.id, e)}
                  title="Delete workflow"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Version History Expandable */}
            {expandedId === wf.id && (
              <div className="workflow-versions">
                {loadingVersions ? (
                  <div className="flex items-center gap-2 text-text-muted text-xs py-2">
                    <Loader2 className="w-3 h-3 animate-spin" /> Loading versions...
                  </div>
                ) : versions.length === 0 ? (
                  <div className="text-text-muted text-[11px] py-2">No previous versions</div>
                ) : (
                  versions.map((v) => (
                    <div key={v.id} className="workflow-version-item">
                      <div className="flex-1">
                        <span className="text-[11px] font-medium text-text-secondary">Version {v.version_number}</span>
                        <span className="text-[10px] text-text-muted ml-2">{formatDate(v.created_at)}</span>
                      </div>
                      <button
                        className="flex items-center gap-1 text-[10px] text-info hover:text-accent transition-colors"
                        onClick={() => handleRestore(wf.id, v.version_number)}
                        disabled={restoringVersion === v.version_number}
                      >
                        {restoringVersion === v.version_number
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <RotateCcw className="w-3 h-3" />
                        }
                        Restore
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
