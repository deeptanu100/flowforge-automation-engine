import React, { useState, useEffect } from 'react';
import { Timer, Power, Loader2, Trash2 } from 'lucide-react';
import type { ScheduleData } from '../types/workflow';
import { getScheduleForWorkflow, createSchedule, updateSchedule, deleteSchedule } from '../api/client';

interface SchedulePanelProps {
  workflowId: string | null;
}

const CRON_PRESETS = [
  { label: 'Every 1 min', value: '*/1 * * * *' },
  { label: 'Every 5 min', value: '*/5 * * * *' },
  { label: 'Every 15 min', value: '*/15 * * * *' },
  { label: 'Hourly', value: '0 * * * *' },
  { label: 'Daily (midnight)', value: '0 0 * * *' },
  { label: 'Weekly (Mon)', value: '0 0 * * 1' },
];

function describeCron(expr: string): string {
  const parts = expr.trim().split(' ');
  if (parts.length !== 5) return expr;
  const [min, hour, day, month, dow] = parts;

  if (min.startsWith('*/') && hour === '*')
    return `Every ${min.slice(2)} minute${parseInt(min.slice(2)) > 1 ? 's' : ''}`;
  if (min === '0' && hour === '*') return 'Every hour at :00';
  if (min === '0' && hour === '0' && dow === '*') return 'Daily at midnight';
  if (min === '0' && hour === '0' && dow === '1') return 'Every Monday at midnight';
  return expr;
}

export default function SchedulePanel({ workflowId }: SchedulePanelProps) {
  const [schedule, setSchedule] = useState<ScheduleData | null>(null);
  const [cronInput, setCronInput] = useState('*/5 * * * *');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!workflowId) {
      setSchedule(null);
      return;
    }
    setLoading(true);
    getScheduleForWorkflow(workflowId)
      .then((s) => {
        setSchedule(s);
        setCronInput(s.cron_expression);
      })
      .catch(() => setSchedule(null))
      .finally(() => setLoading(false));
  }, [workflowId]);

  const handleCreate = async () => {
    if (!workflowId) return;
    setSaving(true);
    try {
      const result = await createSchedule(workflowId, cronInput);
      setSchedule({ ...result, workflow_id: workflowId, cron_expression: cronInput, is_active: true, last_run_at: null, next_run_at: null, created_at: new Date().toISOString() });
    } catch (err) {
      console.error('Failed to create schedule', err);
    }
    setSaving(false);
  };

  const handleUpdate = async (data: { cron_expression?: string; is_active?: boolean }) => {
    if (!schedule) return;
    setSaving(true);
    try {
      await updateSchedule(schedule.id, data);
      setSchedule({ ...schedule, ...data });
    } catch (err) {
      console.error('Failed to update schedule', err);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!schedule || !confirm('Remove this schedule?')) return;
    try {
      await deleteSchedule(schedule.id);
      setSchedule(null);
    } catch (err) {
      console.error('Failed to delete schedule', err);
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (!workflowId) {
    return (
      <div className="text-center py-4 text-text-muted text-[11px]">
        Save a workflow first to enable scheduling.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4 text-text-muted text-xs gap-2">
        <Loader2 className="w-3 h-3 animate-spin" /> Loading schedule...
      </div>
    );
  }

  return (
    <div className="schedule-panel">
      <div className="flex items-center gap-2 mb-3">
        <Timer className="w-3.5 h-3.5 text-accent" />
        <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-text-muted">Automation Schedule</span>
      </div>

      {/* Cron Expression Input */}
      <div className="flex flex-col gap-2">
        <input
          type="text"
          className="bg-black/30 border border-white/8 rounded-lg px-3 py-2 text-xs font-mono text-text-primary outline-none focus:border-accent transition-colors"
          value={cronInput}
          onChange={(e) => setCronInput(e.target.value)}
          placeholder="*/5 * * * *"
        />
        <div className="text-[10px] text-text-muted">{describeCron(cronInput)}</div>

        {/* Preset Buttons */}
        <div className="flex flex-wrap gap-1.5">
          {CRON_PRESETS.map((p) => (
            <button
              key={p.value}
              className={`text-[9px] px-2 py-1 rounded-md border transition-all ${
                cronInput === p.value
                  ? 'border-accent/40 bg-accent/10 text-accent'
                  : 'border-white/6 bg-white/3 text-text-muted hover:bg-white/6 hover:text-text-secondary'
              }`}
              onClick={() => setCronInput(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      {schedule ? (
        <div className="mt-3 flex flex-col gap-2">
          {/* Active toggle */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-text-secondary">Active</span>
            <button
              className={`toggle-switch ${schedule.is_active ? 'toggle-switch--on' : ''}`}
              onClick={() => handleUpdate({ is_active: !schedule.is_active })}
            >
              <span className="toggle-switch-knob" />
            </button>
          </div>

          {/* Metadata */}
          <div className="flex flex-col gap-1 text-[10px] text-text-muted mt-1">
            <div className="flex justify-between">
              <span>Last run</span>
              <span className="text-text-secondary">{formatDate(schedule.last_run_at)}</span>
            </div>
            <div className="flex justify-between">
              <span>Next run</span>
              <span className="text-text-secondary">{formatDate(schedule.next_run_at)}</span>
            </div>
          </div>

          {/* Update / Delete */}
          <div className="flex gap-2 mt-2">
            <button
              className="flex-1 text-[11px] px-3 py-1.5 bg-accent/10 text-accent border border-accent/20 rounded-lg hover:bg-accent/20 transition-colors"
              onClick={() => handleUpdate({ cron_expression: cronInput })}
              disabled={saving}
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : 'Update Schedule'}
            </button>
            <button
              className="p-1.5 text-text-muted hover:text-error hover:bg-error/10 rounded-lg transition-colors"
              onClick={handleDelete}
              title="Delete schedule"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <button
          className="mt-3 w-full text-[11px] px-3 py-2 bg-accent/10 text-accent border border-accent/20 rounded-lg hover:bg-accent/20 transition-colors font-medium"
          onClick={handleCreate}
          disabled={saving}
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : '⚡ Enable Schedule'}
        </button>
      )}
    </div>
  );
}
