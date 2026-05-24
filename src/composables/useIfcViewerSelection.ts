import { computed, type ComputedRef } from "vue";
import type {
  IfcViewerSelectionState,
  IfcViewerSelectedElement,
} from "../types/ifcViewer";
import type { IIfcViewerStoreByIdComposable } from "./useIfcViewerStoreById";

export interface IIfcViewerSelectionComposableParams {
  viewerStore: IIfcViewerStoreByIdComposable;
}

export interface IIfcViewerSelectionComposable {
  selectionState: ComputedRef<IfcViewerSelectionState>;
  selectedElement: ComputedRef<IfcViewerSelectedElement | null>;
  setSelectionState(selection: IfcViewerSelectionState): void;
  setSelectedElement(element: IfcViewerSelectedElement | null): void;
  clearSelection(): void;
}

export function useIfcViewerSelection(
  params: IIfcViewerSelectionComposableParams,
): IIfcViewerSelectionComposable {
  const selectionState = computed(
    () => params.viewerStore.state.value.selection,
  );
  const selectedElement = computed(
    () => params.viewerStore.state.value.selectedElement,
  );

  return {
    selectionState,
    selectedElement,
    setSelectionState: (selection) =>
      params.viewerStore.setSelectionState(selection),
    setSelectedElement: (element) => params.viewerStore.setSelectedElement(element),
    clearSelection: () => {
      params.viewerStore.setSelectedElement(null);
      params.viewerStore.setSelectionState({
        activeTreeNodeId: null,
        highlightedTreeNodeIds: [],
        selectionAnchorTreeNodeId: null,
        highlightedElementIds: [],
      });
    },
  };
}
