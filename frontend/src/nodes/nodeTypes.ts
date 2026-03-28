import type { NodeTypes } from '@xyflow/react';
import ApiRequestNode from './ApiRequestNode';
import LocalComputeNode from './LocalComputeNode';
import TutorialNode from './TutorialNode';

export const nodeTypes: NodeTypes = {
  apiRequest: ApiRequestNode,
  localCompute: LocalComputeNode,
  tutorialNode: TutorialNode,
};
