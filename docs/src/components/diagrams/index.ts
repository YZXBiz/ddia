// Legacy exports (kept for compatibility)
export { default as FlowDiagram } from './FlowDiagram';
export { default as ArchitectureDiagram } from './ArchitectureDiagram';
export { default as SignalFlow } from './SignalFlow';
export { default as PipelineDiagram } from './PipelineDiagram';
export { default as LayerDiagram } from './LayerDiagram';
export { default as ComparisonDiagram } from './ComparisonDiagram';

// New diagram system
export {
  Box,
  Arrow,
  Row,
  Column,
  Group,
  DiagramContainer,
  ProcessFlow,
  TreeDiagram,
  CardGrid,
  ConnectionDiagram,
  StackDiagram,
  ComparisonTable,
  colors
} from './Diagram';
