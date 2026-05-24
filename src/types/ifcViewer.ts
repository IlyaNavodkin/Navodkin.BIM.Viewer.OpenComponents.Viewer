export interface IfcViewerPropertyEntry {
  name: string;
  value: string;
}

export interface IfcViewerPropertyGroup {
  name: string;
  entries: IfcViewerPropertyEntry[];
}

export interface IfcViewerTreeNode {
  id: string;
  modelId: string;
  localId: number | null;
  ifcCategory: string | null;
  label: string;
  childCount: number;
  isExpanded: boolean;
  children: IfcViewerTreeNode[];
}

export interface IfcViewerModelTreeNode {
  id: string;
  name: string;
  sourceFileName: string;
  categoryCount: number;
  elementCount: number;
  isExpanded: boolean;
  rootNodes: IfcViewerTreeNode[];
}

export interface IfcViewerSelectedElement {
  elementId: string;
  modelId: string;
  localId: number;
  displayName: string;
  properties: IfcViewerPropertyGroup[];
}

export interface IfcViewerSelectionState {
  activeTreeNodeId: string | null;
  highlightedTreeNodeIds: string[];
  selectionAnchorTreeNodeId: string | null;
  highlightedElementIds: string[];
}

export interface IfcViewerContextMenuState {
  isVisible: boolean;
  x: number;
  y: number;
  modelId: string | null;
}

export interface IfcViewerStateSnapshot {
  viewerId: string;
  projectName: string;
  isReady: boolean;
  isLoading: boolean;
  progress: number | null;
  statusText: string;
  errorMessage: string | null;
  models: IfcViewerModelTreeNode[];
  selectedElement: IfcViewerSelectedElement | null;
  selection: IfcViewerSelectionState;
  contextMenu: IfcViewerContextMenuState;
}

export interface IfcViewerStoreModelRegistration {
  id: string;
  name: string;
  sourceFileName: string;
  elementCount: number;
  rootNodes: IfcViewerTreeNode[];
}
