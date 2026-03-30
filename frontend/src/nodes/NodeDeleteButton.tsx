import { useState, useRef, useEffect } from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';

interface NodeDeleteButtonProps {
  onDelete: () => void;
  nodeLabel?: string;
}

export default function NodeDeleteButton({ onDelete, nodeLabel }: NodeDeleteButtonProps) {
  const [phase, setPhase] = useState<'idle' | 'confirm'>('idle');
  const [checked, setChecked] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Reset state when clicking outside
  useEffect(() => {
    if (phase !== 'confirm') return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as HTMLElement)) {
        setPhase('idle');
        setChecked(false);
      }
    };
    // Delay listener registration so the opening click doesn't immediately close the panel
    const raf = requestAnimationFrame(() => {
      document.addEventListener('mousedown', handler);
    });
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('mousedown', handler);
    };
  }, [phase]);

  // Auto-close after 8 seconds
  useEffect(() => {
    if (phase !== 'confirm') return;
    const timer = setTimeout(() => {
      setPhase('idle');
      setChecked(false);
    }, 8000);
    return () => clearTimeout(timer);
  }, [phase]);

  const handleInitialClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPhase('confirm');
    setChecked(false);
  };

  const handleConfirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (checked) {
      onDelete();
    }
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPhase('idle');
    setChecked(false);
  };

  const handleCheckbox = (e: React.MouseEvent) => {
    e.stopPropagation();
    setChecked(!checked);
  };

  if (phase === 'idle') {
    return (
      <button
        className="node-delete-btn"
        onClick={handleInitialClick}
        title="Delete this node"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    );
  }

  return (
    <div className="node-delete-confirm" ref={panelRef} onClick={(e) => e.stopPropagation()}>
      <div className="node-delete-confirm-header">
        <AlertTriangle className="w-4 h-4 text-warning" />
        <span>Delete Node?</span>
      </div>
      <p className="node-delete-confirm-text">
        This will permanently remove <strong>"{nodeLabel || 'this node'}"</strong> and all its connections.
      </p>
      <label className="node-delete-checkbox" onClick={handleCheckbox}>
        <div className={`node-delete-checkbox-box ${checked ? 'node-delete-checkbox-box--checked' : ''}`}>
          {checked && (
            <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3">
              <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
        <span>I confirm I want to delete this node</span>
      </label>
      <div className="node-delete-actions">
        <button className="node-delete-cancel" onClick={handleCancel}>Cancel</button>
        <button
          className={`node-delete-confirm-btn ${checked ? 'node-delete-confirm-btn--active' : ''}`}
          onClick={handleConfirmDelete}
          disabled={!checked}
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete
        </button>
      </div>
    </div>
  );
}
