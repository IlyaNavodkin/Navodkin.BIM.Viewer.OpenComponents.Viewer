import { computed, type ComputedRef } from "vue";
import type { IfcViewerSelectedElement } from "../types/ifcViewer";
import type { IIfcViewerStoreByIdComposable } from "./useIfcViewerStoreById";

export interface IIfcViewerSelectionComposableParams {
  viewerStore: IIfcViewerStoreByIdComposable;
}

export interface IIfcViewerSelectionComposable {
  selectedElement: ComputedRef<IfcViewerSelectedElement | null>;
  setSelectedElement(element: IfcViewerSelectedElement | null): void;
  clearSelection(): void;
}

export function useIfcViewerSelection(
  params: IIfcViewerSelectionComposableParams,
): IIfcViewerSelectionComposable {
  const selectedElement = computed(
    () => params.viewerStore.state.value.selectedElement,
  );

  return {
    selectedElement,
    setSelectedElement: (element) => params.viewerStore.setSelectedElement(element),
    clearSelection: () => params.viewerStore.setSelectedElement(null),
  };
}
