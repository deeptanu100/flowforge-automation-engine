import { type NodeProps, type Node } from '@xyflow/react';
import { NotebookPen } from 'lucide-react';
import type { TutorialNodeData } from '../types/workflow';

export type TutorialNodeType = Node<TutorialNodeData & { onChange: (field: string, value: string) => void }, 'tutorialNode'>;

export default function TutorialNode({ data }: NodeProps<TutorialNodeType>) {
  return (
    <div className={`flow-node transition-all group !w-[300px] bg-gradient-to-br from-[#2a2a3a]/80 to-[#1a1a24]/90 border border-t-accent/40 shadow-xl backdrop-blur-xl`}>
      <div className="flex items-center gap-2 p-3 pb-1">
        <NotebookPen className="w-3.5 h-3.5 text-accent opacity-80" />
        <input 
          className="bg-transparent text-sm font-semibold text-text-primary focus:outline-none placeholder-text-muted/60 flex-1 truncate"
          value={data.title}
          onChange={(e) => data.onChange('title', e.target.value)}
          placeholder="New Note"
        />
      </div>
      <div className="p-3 pt-1">
        <textarea
          className="bg-transparent w-full text-xs text-text-secondary leading-relaxed resize-none focus:outline-none placeholder-text-muted/40 custom-scrollbar min-h-[80px]"
          value={data.content}
          onChange={(e) => data.onChange('content', e.target.value)}
          placeholder="Write your note or markdown instructions here..."
        />
      </div>
    </div>
  );
}
