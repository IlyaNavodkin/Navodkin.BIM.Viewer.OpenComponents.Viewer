import { computed, type ComputedRef } from "vue";
import { storeToRefs } from "pinia";
import { useIfcViewerRegistryStore } from "../stores/ifcViewerRegistry";
import type {
  IfcViewerCurrentModel,
  IfcViewerStateSnapshot,
} from "../types/ifcViewer";

export interface IIfcViewerStoreByIdParams {
  viewerId: string;
}

export interface IIfcViewerStoreByIdComposable {
  viewerId: string;
  state: ComputedRef<IfcViewerStateSnapshot>;
  initializeEmptyProject(): void;
  dispose(): void;
  setReady(isReady: boolean): void;
  setLoading(payload: {
    isLoading: boolean;
    statusText?: string;
    progress?: number | null;
  }): void;
  setError(errorMessage: string | null): void;
  setProjectName(projectName: string): void;
  setStatusText(statusText: string): void;
  setCurrentModel(currentModel: IfcViewerCurrentModel | null): void;
}

export function useIfcViewerStoreById(
  params: IIfcViewerStoreByIdParams,
): IIfcViewerStoreByIdComposable {
  const registryStore = useIfcViewerRegistryStore();
  const { viewers } = storeToRefs(registryStore);

  registryStore.ensureViewer(params.viewerId);

  const state = computed<IfcViewerStateSnapshot>(() => {
    registryStore.ensureViewer(params.viewerId);
    return viewers.value[params.viewerId];
  });

  return {
    viewerId: params.viewerId,
    state,
    initializeEmptyProject: () => registryStore.resetViewer(params.viewerId),
    dispose: () => registryStore.disposeViewer(params.viewerId),
    setReady: (isReady) => registryStore.setViewerReady(params.viewerId, isReady),
    setLoading: (payload) =>
      registryStore.setViewerLoading(params.viewerId, payload),
    setError: (errorMessage) =>
      registryStore.setViewerError(params.viewerId, errorMessage),
    setProjectName: (projectName) =>
      registryStore.setProjectName(params.viewerId, projectName),
    setStatusText: (statusText) =>
      registryStore.setStatusText(params.viewerId, statusText),
    setCurrentModel: (currentModel) =>
      registryStore.setCurrentModel(params.viewerId, currentModel),
  };
}
