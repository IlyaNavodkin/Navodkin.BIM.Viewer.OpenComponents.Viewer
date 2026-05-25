import { defineStore } from "pinia";
import type {
  IfcViewerCurrentModel,
  IfcViewerStateSnapshot,
} from "../types/ifcViewer";

interface IfcViewerRegistryState {
  viewers: Record<string, IfcViewerStateSnapshot>;
}

function createViewerState(viewerId: string): IfcViewerStateSnapshot {
  return {
    viewerId,
    projectName: "IFC / FRAG Workspace",
    isReady: false,
    isLoading: false,
    progress: null,
    statusText: "Choose an IFC or FRAG file to start.",
    errorMessage: null,
    currentModel: null,
  };
}

export const useIfcViewerRegistryStore = defineStore("ifc-viewer-registry", {
  state: (): IfcViewerRegistryState => ({
    viewers: {},
  }),
  actions: {
    ensureViewer(viewerId: string) {
      if (!this.viewers[viewerId]) {
        this.viewers[viewerId] = createViewerState(viewerId);
      }
    },
    resetViewer(viewerId: string) {
      this.viewers[viewerId] = createViewerState(viewerId);
    },
    disposeViewer(viewerId: string) {
      delete this.viewers[viewerId];
    },
    setViewerReady(viewerId: string, isReady: boolean) {
      this.ensureViewer(viewerId);
      this.viewers[viewerId].isReady = isReady;
    },
    setViewerLoading(
      viewerId: string,
      payload: {
        isLoading: boolean;
        statusText?: string;
        progress?: number | null;
      },
    ) {
      this.ensureViewer(viewerId);
      const viewer = this.viewers[viewerId];
      viewer.isLoading = payload.isLoading;
      viewer.statusText = payload.statusText ?? viewer.statusText;
      viewer.progress =
        payload.progress === undefined ? viewer.progress : payload.progress;
    },
    setViewerError(viewerId: string, errorMessage: string | null) {
      this.ensureViewer(viewerId);
      this.viewers[viewerId].errorMessage = errorMessage;
    },
    setProjectName(viewerId: string, projectName: string) {
      this.ensureViewer(viewerId);
      this.viewers[viewerId].projectName = projectName;
    },
    setCurrentModel(
      viewerId: string,
      currentModel: IfcViewerCurrentModel | null,
    ) {
      this.ensureViewer(viewerId);
      this.viewers[viewerId].currentModel = currentModel;
    },
    setStatusText(viewerId: string, statusText: string) {
      this.ensureViewer(viewerId);
      this.viewers[viewerId].statusText = statusText;
    },
  },
});
