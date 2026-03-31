import type { NodeTypes } from '@xyflow/react';
import ApiRequestNode from './ApiRequestNode';
import LocalComputeNode from './LocalComputeNode';
import TutorialNode from './TutorialNode';
import ConditionalNode from './ConditionalNode';
import LoopNode from './LoopNode';

export const nodeTypes: NodeTypes = {
  apiRequest: ApiRequestNode,
  localCompute: LocalComputeNode,
  tutorialNode: TutorialNode,
  conditional: ConditionalNode,
  loop: LoopNode,
};
