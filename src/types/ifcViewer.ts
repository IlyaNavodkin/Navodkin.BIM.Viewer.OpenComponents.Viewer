export type IfcViewerModelSource = "ifc" | "frag";

export interface IfcViewerCurrentModel {
  id: string;
  name: string;
  sourceFileName: string;
  sourceType: IfcViewerModelSource;
  canExportFrag: boolean;
}

export interface IfcViewerStateSnapshot {
  viewerId: string;
  projectName: string;
  isReady: boolean;
  isLoading: boolean;
  progress: number | null;
  statusText: string;
  errorMessage: string | null;
  currentModel: IfcViewerCurrentModel | null;
}
