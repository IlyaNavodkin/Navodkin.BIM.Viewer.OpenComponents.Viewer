import { computed } from "vue";
import * as THREE from "three";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import type * as FRAGS from "@thatopen/fragments";
import Stats from "stats.js";
import workerUrl from "@thatopen/fragments/dist/Worker/worker.mjs?url";
import webIfcWasmUrl from "web-ifc/web-ifc.wasm?url";
import type {
  IfcViewerPropertyEntry,
  IfcViewerPropertyGroup,
  IfcViewerSelectionState,
  IfcViewerTreeNode,
} from "../types/ifcViewer";
import type { IIfcViewerProjectComposable } from "./useIfcViewerProject";
import type { IIfcViewerSelectionComposable } from "./useIfcViewerSelection";
import type { IIfcViewerStoreByIdComposable } from "./useIfcViewerStoreById";

interface RuntimeModelEntry {
  sourceFileName: string;
}

export interface IIfcViewerEngineComposableParams {
  viewerStore: IIfcViewerStoreByIdComposable;
  project: IIfcViewerProjectComposable;
  selection: IIfcViewerSelectionComposable;
}

export interface IIfcViewerEngineComposable {
  isMounted: Readonly<ReturnType<typeof computed<boolean>>>;
  mount(container: HTMLDivElement): Promise<void>;
  unmount(): void;
  loadFiles(files: File[]): Promise<void>;
  selectElement(modelId: string, localId: number): Promise<void>;
  applySelection(
    activeElementId: string | null,
    highlightedElementIds: string[],
  ): Promise<void>;
  focusElements(elementIds: string[]): Promise<void>;
  removeModel(modelId: string): Promise<void>;
}

const ITEM_BATCH_SIZE = 200;
const MAX_PROPERTY_GROUP_DEPTH = 3;
const MAX_PROPERTY_GROUP_ITEMS = 24;
const PROPERTY_RELATION_KEYS = new Set([
  "IsDefinedBy",
  "HasPropertySets",
  "HasProperties",
  "Quantities",
  "IsTypedBy",
]);

function createElementId(modelId: string, localId: number) {
  return `${modelId}:${localId}`;
}

function parseElementId(elementId: string) {
  const separatorIndex = elementId.lastIndexOf(":");
  if (separatorIndex === -1) {
    return null;
  }

  const modelId = elementId.slice(0, separatorIndex);
  const localId = Number(elementId.slice(separatorIndex + 1));
  if (!modelId || Number.isNaN(localId)) {
    return null;
  }

  return {
    modelId,
    localId,
  };
}

function createTreeNodeId(
  modelId: string,
  localId: number | null,
  category: string | null,
  path: string,
) {
  if (localId !== null) {
    return `${modelId}:node:${localId}`;
  }

  return `${modelId}:virtual:${path}:${category ?? "unknown"}`;
}

function createModelId(fileName: string, index: number) {
  const normalized = fileName
    .replace(/\.ifc$/i, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return `${normalized || "ifc-model"}-${index}`;
}

function uniqueIds(ids: string[]) {
  return [...new Set(ids)];
}

function resolveWasmDirectoryPath(wasmAssetUrl: string) {
  const resolvedUrl = new URL(wasmAssetUrl, window.location.href);
  const directoryPath = resolvedUrl.pathname.replace(/[^/]+$/, "");
  return `${resolvedUrl.origin}${directoryPath}`;
}

function isItemAttribute(
  value: FRAGS.ItemAttribute | FRAGS.ItemData[],
): value is FRAGS.ItemAttribute {
  return !Array.isArray(value);
}

function toPropertyValue(value: unknown) {
  if (value === null || value === undefined) {
    return "-";
  }

  if (Array.isArray(value)) {
    return value.join(", ");
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function getDisplayName(item: FRAGS.ItemData, localId: number, fallback: string) {
  const name = item.Name;
  if (name && !Array.isArray(name) && name.value) {
    return String(name.value);
  }

  const globalId = item.GlobalId;
  if (globalId && !Array.isArray(globalId) && globalId.value) {
    return String(globalId.value);
  }

  return `${fallback} #${localId}`;
}

function collectOwnEntries(item: FRAGS.ItemData): IfcViewerPropertyEntry[] {
  return Object.entries(item)
    .filter(([, value]) => isItemAttribute(value))
    .map(([name, value]) => ({
      name,
      value: toPropertyValue(value.value),
    }));
}

function resolveNestedGroupName(
  key: string,
  item: FRAGS.ItemData,
  index: number,
  parentName: string,
) {
  const label = collectOwnEntries(item).find((entry) => entry.name === "Name");
  const suffix = label?.value && label.value !== "-" ? label.value : `${key} ${index + 1}`;
  return parentName ? `${parentName} / ${suffix}` : suffix;
}

function createPropertyGroups(
  item: FRAGS.ItemData,
  groupName = "General",
  depth = 0,
): IfcViewerPropertyGroup[] {
  const groups: IfcViewerPropertyGroup[] = [];
  const ownEntries = collectOwnEntries(item);

  if (ownEntries.length > 0) {
    groups.push({
      name: groupName,
      entries: ownEntries,
    });
  }

  if (depth >= MAX_PROPERTY_GROUP_DEPTH) {
    return groups;
  }

  for (const [key, value] of Object.entries(item)) {
    if (!Array.isArray(value) || !PROPERTY_RELATION_KEYS.has(key)) {
      continue;
    }

    value.slice(0, MAX_PROPERTY_GROUP_ITEMS).forEach((nestedItem, index) => {
      groups.push(
        ...createPropertyGroups(
          nestedItem,
          resolveNestedGroupName(key, nestedItem, index, key),
          depth + 1,
        ),
      );
    });
  }

  return groups;
}

function collectSpatialLocalIds(
  item: FRAGS.SpatialTreeItem,
  collector: Set<number>,
) {
  if (typeof item.localId === "number") {
    collector.add(item.localId);
  }

  for (const child of item.children ?? []) {
    collectSpatialLocalIds(child, collector);
  }
}

async function getItemLabelMap(model: FRAGS.FragmentsModel, localIds: number[]) {
  const labelMap = new Map<number, string>();

  for (let index = 0; index < localIds.length; index += ITEM_BATCH_SIZE) {
    const batchIds = localIds.slice(index, index + ITEM_BATCH_SIZE);
    const batchData = await model.getItemsData(batchIds, {
      attributesDefault: false,
      attributes: ["Name", "GlobalId"],
      relationsDefault: {
        attributes: false,
        relations: false,
      },
    });

    batchData.forEach((itemData, batchIndex) => {
      const localId = batchIds[batchIndex];
      labelMap.set(
        localId,
        getDisplayName(itemData, localId, itemData._category?.value ?? "Element"),
      );
    });
  }

  return labelMap;
}

function createTreeNodeLabel(
  item: FRAGS.SpatialTreeItem,
  labelMap: Map<number, string>,
) {
  if (typeof item.localId === "number") {
    return labelMap.get(item.localId) ?? `${item.category ?? "Element"} #${item.localId}`;
  }

  return item.category ?? "Group";
}

function createSpatialTreeNodes(
  modelId: string,
  item: FRAGS.SpatialTreeItem,
  labelMap: Map<number, string>,
  path: string,
  depth: number,
): IfcViewerTreeNode {
  const children = (item.children ?? []).map((child, index) =>
    createSpatialTreeNodes(
      modelId,
      child,
      labelMap,
      `${path}.${index}`,
      depth + 1,
    ),
  );

  return {
    id: createTreeNodeId(modelId, item.localId, item.category, path),
    modelId,
    localId: item.localId,
    ifcCategory: item.category,
    label: createTreeNodeLabel(item, labelMap),
    childCount: children.length,
    isExpanded: depth < 2,
    children,
  };
}

function findTreeNodeById(nodes: IfcViewerTreeNode[], nodeId: string): IfcViewerTreeNode | null {
  for (const node of nodes) {
    if (node.id === nodeId) {
      return node;
    }

    const nestedMatch = findTreeNodeById(node.children, nodeId);
    if (nestedMatch) {
      return nestedMatch;
    }
  }

  return null;
}

function findTreeNodeByElementId(
  nodes: IfcViewerTreeNode[],
  elementId: string,
): IfcViewerTreeNode | null {
  const parsed = parseElementId(elementId);
  if (!parsed) {
    return null;
  }

  for (const node of nodes) {
    if (
      node.modelId === parsed.modelId &&
      node.localId === parsed.localId
    ) {
      return node;
    }

    const nestedMatch = findTreeNodeByElementId(node.children, elementId);
    if (nestedMatch) {
      return nestedMatch;
    }
  }

  return null;
}

function buildSelectionStateFromElementIds(
  models: { rootNodes: IfcViewerTreeNode[] }[],
  highlightedElementIds: string[],
  activeElementId: string | null,
): IfcViewerSelectionState {
  const highlightedTreeNodeIds = uniqueIds(
    highlightedElementIds
      .map((elementId) => {
        for (const model of models) {
          const match = findTreeNodeByElementId(model.rootNodes, elementId);
          if (match) {
            return match.id;
          }
        }

        return null;
      })
      .filter((nodeId): nodeId is string => Boolean(nodeId)),
  );

  const activeTreeNodeId = activeElementId
    ? highlightedTreeNodeIds.find((nodeId) => {
        for (const model of models) {
          const node = findTreeNodeById(model.rootNodes, nodeId);
          if (!node || node.localId === null) {
            continue;
          }

          return createElementId(node.modelId, node.localId) === activeElementId;
        }

        return false;
      }) ?? highlightedTreeNodeIds[0] ?? null
    : highlightedTreeNodeIds[0] ?? null;

  return {
    activeTreeNodeId,
    highlightedTreeNodeIds,
    selectionAnchorTreeNodeId: activeTreeNodeId,
    highlightedElementIds: uniqueIds(highlightedElementIds),
  };
}

export function useIfcViewerEngine(
  params: IIfcViewerEngineComposableParams,
): IIfcViewerEngineComposable {
  let components: OBC.Components | null = null;
  let world:
    | OBC.World<
        OBC.SimpleScene,
        OBC.OrthoPerspectiveCamera,
        OBC.SimpleRenderer
      >
    | null = null;
  let fragments: OBC.FragmentsManager | null = null;
  let ifcLoader: OBC.IfcLoader | null = null;
  let highlighter: OBF.Highlighter | null = null;
  let mountedContainer: HTMLDivElement | null = null;
  let performanceStats: Stats | null = null;
  let onRendererBeforeUpdate: (() => void) | null = null;
  let onRendererAfterUpdate: (() => void) | null = null;
  let modelSequence = 0;
  let selectionRequestId = 0;
  let suppressedSelectionEvents = 0;
  let pendingActiveElementId: string | null = null;

  const runtimeModels = new Map<string, RuntimeModelEntry>();
  const isMounted = computed(() => mountedContainer !== null);

  const getModel = (modelId: string) => fragments?.list.get(modelId) ?? null;

  const createModelIdMap = (elementIds: string[]) => {
    const modelIdMap: OBC.ModelIdMap = {};

    for (const elementId of uniqueIds(elementIds)) {
      const parsed = parseElementId(elementId);
      if (!parsed) {
        continue;
      }

      const entry = modelIdMap[parsed.modelId] ?? new Set<number>();
      entry.add(parsed.localId);
      modelIdMap[parsed.modelId] = entry;
    }

    return modelIdMap;
  };

  const resolveActiveElementId = (highlightedElementIds: string[]) => {
    if (
      pendingActiveElementId &&
      highlightedElementIds.includes(pendingActiveElementId)
    ) {
      return pendingActiveElementId;
    }

    const currentActiveElementId = params.selection.selectedElement.value?.elementId ?? null;
    if (
      currentActiveElementId &&
      highlightedElementIds.includes(currentActiveElementId)
    ) {
      return currentActiveElementId;
    }

    return highlightedElementIds[0] ?? null;
  };

  const loadSelectedElementDetails = async (elementId: string | null) => {
    if (!elementId) {
      params.selection.setSelectedElement(null);
      return;
    }

    const parsed = parseElementId(elementId);
    if (!parsed) {
      params.selection.setSelectedElement(null);
      return;
    }

    const model = getModel(parsed.modelId);
    if (!model) {
      params.selection.setSelectedElement(null);
      return;
    }

    selectionRequestId += 1;
    const requestId = selectionRequestId;
    const [detailsData] = await model.getItemsData([parsed.localId], {
      attributesDefault: true,
      relations: {
        IsDefinedBy: { attributes: true, relations: true },
        IsTypedBy: { attributes: true, relations: false },
        HasPropertySets: { attributes: true, relations: true },
      },
      relationsDefault: {
        attributes: false,
        relations: false,
      },
    });

    if (!detailsData || requestId !== selectionRequestId) {
      return;
    }

    params.selection.setSelectedElement({
      elementId,
      modelId: parsed.modelId,
      localId: parsed.localId,
      displayName: getDisplayName(detailsData, parsed.localId, "Element"),
      properties: createPropertyGroups(detailsData),
    });
  };

  const setIdleStatus = () => {
    const count = params.project.models.value.length;
    const statusText =
      count > 0 ? `${count} model${count > 1 ? "s" : ""} loaded` : "Empty project";

    params.viewerStore.setLoading({
      isLoading: false,
      progress: null,
      statusText,
    });
  };

  const syncSelectionFromMap = async (modelIdMap: OBC.ModelIdMap) => {
    if (suppressedSelectionEvents > 0) {
      suppressedSelectionEvents -= 1;
      return;
    }

    const highlightedElementIds = Object.entries(modelIdMap).flatMap(
      ([modelId, localIds]) =>
        [...localIds].map((localId) => createElementId(modelId, localId)),
    );

    if (highlightedElementIds.length === 0) {
      params.selection.clearSelection();
      pendingActiveElementId = null;
      return;
    }

    const activeElementId = resolveActiveElementId(highlightedElementIds);
    params.selection.setSelectionState(
      buildSelectionStateFromElementIds(
        params.project.models.value,
        highlightedElementIds,
        activeElementId,
      ),
    );
    pendingActiveElementId = null;
    await loadSelectedElementDetails(activeElementId);
  };

  const buildTreeForModel = async (
    modelId: string,
    model: FRAGS.FragmentsModel,
  ) => {
    const spatialTree = await model.getSpatialStructure();
    const localIdSet = new Set<number>();

    collectSpatialLocalIds(spatialTree, localIdSet);
    const localIds = [...localIdSet];
    const labelMap = await getItemLabelMap(model, localIds);
    const rootNode = createSpatialTreeNodes(
      modelId,
      spatialTree,
      labelMap,
      "0",
      0,
    );

    params.project.setModelTree(modelId, [rootNode]);
  };

  const initializeRuntime = async (container: HTMLDivElement) => {
    components = new OBC.Components();

    const worlds = components.get(OBC.Worlds);
    world = worlds.create<
      OBC.SimpleScene,
      OBC.OrthoPerspectiveCamera,
      OBC.SimpleRenderer
    >();

    world.scene = new OBC.SimpleScene(components);
    world.scene.setup();
    world.scene.three.background = new THREE.Color("#0b1627");

    world.renderer = new OBC.SimpleRenderer(components, container);
    world.camera = new OBC.OrthoPerspectiveCamera(components);
    await world.camera.controls.setLookAt(32, 24, 32, 0, 0, 0);

    components.init();
    components.get(OBC.Grids).create(world);

    fragments = components.get(OBC.FragmentsManager);
    fragments.init(workerUrl);

    world.camera.controls.addEventListener("update", () => {
      void fragments?.core.update();
    });

    world.onCameraChanged.add((camera) => {
      if (!fragments) {
        return;
      }

      for (const [, model] of fragments.list) {
        model.useCamera(camera.three);
      }

      void fragments.core.update(true);
    });

    fragments.list.onItemSet.add(({ value: model }) => {
      if (!world || !fragments) {
        return;
      }

      model.useCamera(world.camera.three);
      world.scene.three.add(model.object);
      void fragments.core.update(true);
    });

    fragments.list.onBeforeDelete.add(({ value: model }) => {
      world?.scene.three.remove(model.object);
    });

    fragments.core.models.materials.list.onItemSet.add(({ value: material }) => {
      if (!("isLodMaterial" in material && material.isLodMaterial)) {
        material.polygonOffset = true;
        material.polygonOffsetFactor = 1;
        material.polygonOffsetUnits = 1;
      }
    });

    ifcLoader = components.get(OBC.IfcLoader);
    await ifcLoader.setup({
      autoSetWasm: false,
      wasm: {
        path: resolveWasmDirectoryPath(webIfcWasmUrl),
        absolute: true,
      },
    });

    components.get(OBC.Raycasters).get(world);

    highlighter = components.get(OBF.Highlighter);
    highlighter.multiple = "ctrlKey";
    highlighter.zoomToSelection = false;
    highlighter.setup({
      world,
      selectMaterialDefinition: {
        color: new THREE.Color("#38bdf8"),
        opacity: 1,
        transparent: false,
        renderedFaces: 0,
      },
    });

    highlighter.events.select.onHighlight.add((modelIdMap) => {
      void syncSelectionFromMap(modelIdMap);
    });

    highlighter.events.select.onClear.add(() => {
      if (suppressedSelectionEvents > 0) {
        suppressedSelectionEvents -= 1;
        return;
      }

      pendingActiveElementId = null;
      params.selection.clearSelection();
    });

    performanceStats = new Stats();
    performanceStats.showPanel("memory" in performance ? 2 : 0);
    performanceStats.dom.style.position = "absolute";
    performanceStats.dom.style.top = "0";
    performanceStats.dom.style.left = "0";
    performanceStats.dom.style.zIndex = "unset";
    container.append(performanceStats.dom);

    onRendererBeforeUpdate = () => {
      performanceStats?.begin();
    };
    onRendererAfterUpdate = () => {
      performanceStats?.end();
    };

    world.renderer.onBeforeUpdate.add(onRendererBeforeUpdate);
    world.renderer.onAfterUpdate.add(onRendererAfterUpdate);

    mountedContainer = container;
    params.viewerStore.setReady(true);
    setIdleStatus();
  };

  const disposeRuntime = () => {
    params.selection.clearSelection();
    runtimeModels.clear();

    if (world && onRendererBeforeUpdate) {
      world.renderer.onBeforeUpdate.remove(onRendererBeforeUpdate);
    }

    if (world && onRendererAfterUpdate) {
      world.renderer.onAfterUpdate.remove(onRendererAfterUpdate);
    }

    performanceStats?.dom.remove();

    mountedContainer = null;
    highlighter = null;
    ifcLoader = null;
    fragments = null;
    world = null;
    performanceStats = null;
    onRendererBeforeUpdate = null;
    onRendererAfterUpdate = null;

    if (components) {
      components.dispose();
      components = null;
    }

    params.viewerStore.setReady(false);
  };

  const loadIfcFile = async (file: File) => {
    if (!ifcLoader) {
      throw new Error("Viewer runtime is not ready.");
    }

    modelSequence += 1;
    const modelId = createModelId(file.name, modelSequence);
    const modelName = file.name.replace(/\.ifc$/i, "") || modelId;

    params.viewerStore.setError(null);
    params.viewerStore.setLoading({
      isLoading: true,
      progress: 0,
      statusText: `Loading ${file.name}`,
    });

    const data = new Uint8Array(await file.arrayBuffer());
    const model = await ifcLoader.load(data, false, modelId, {
      processData: {
        progressCallback: (progress) => {
          params.viewerStore.setLoading({
            isLoading: true,
            progress: Math.round(progress * 100),
            statusText: `Loading ${file.name}`,
          });
        },
      },
    });

    const localIds = await model.getLocalIds();
    runtimeModels.set(modelId, {
      sourceFileName: file.name,
    });

    params.project.registerModel({
      id: modelId,
      name: modelName,
      sourceFileName: file.name,
      categoryCount: 0,
      elementCount: localIds.length,
      isExpanded: true,
      rootNodes: [],
    });

    await buildTreeForModel(modelId, model);
    setIdleStatus();
  };

  return {
    isMounted,
    mount: async (container) => {
      if (mountedContainer === container && components) {
        return;
      }

      disposeRuntime();
      await initializeRuntime(container);
    },
    unmount: () => {
      disposeRuntime();
    },
    loadFiles: async (files) => {
      if (files.length === 0) {
        return;
      }

      try {
        for (const file of files) {
          await loadIfcFile(file);
        }
      } catch (error) {
        params.viewerStore.setError(
          error instanceof Error ? error.message : "Failed to load IFC model.",
        );
        params.viewerStore.setLoading({
          isLoading: false,
          progress: null,
          statusText: "Load failed",
        });
      }
    },
    selectElement: async (modelId, localId) => {
      if (!highlighter) {
        await loadSelectedElementDetails(createElementId(modelId, localId));
        return;
      }

      pendingActiveElementId = createElementId(modelId, localId);
      await highlighter?.highlightByID(
        "select",
        {
          [modelId]: new Set([localId]),
        },
        true,
        false,
      );
    },
    applySelection: async (activeElementId, highlightedElementIds) => {
      if (!highlighter) {
        await loadSelectedElementDetails(activeElementId);
        pendingActiveElementId = null;
        return;
      }

      if (highlightedElementIds.length === 0) {
        pendingActiveElementId = null;
        suppressedSelectionEvents += 1;
        await highlighter.clear("select");
        params.selection.setSelectedElement(null);
        return;
      }

      pendingActiveElementId = activeElementId;
      suppressedSelectionEvents += 1;
      await highlighter.highlightByID(
        "select",
        createModelIdMap(highlightedElementIds),
        true,
        false,
      );
      await loadSelectedElementDetails(activeElementId);
      pendingActiveElementId = null;
    },
    focusElements: async (elementIds) => {
      if (!highlighter || elementIds.length === 0) {
        return;
      }

      pendingActiveElementId = resolveActiveElementId(elementIds);
      suppressedSelectionEvents += 1;
      await highlighter.highlightByID(
        "select",
        createModelIdMap(elementIds),
        true,
        true,
      );
      pendingActiveElementId = null;
    },
    removeModel: async (modelId) => {
      const model = getModel(modelId);
      if (!model || !fragments) {
        params.project.removeModelState(modelId);
        return;
      }

      if (params.selection.selectedElement.value?.modelId === modelId) {
        if (highlighter) {
          await highlighter.clear("select");
        }
        params.selection.clearSelection();
      }

      await fragments.core.disposeModel(modelId);
      runtimeModels.delete(modelId);
      params.project.removeModelState(modelId);
      setIdleStatus();
    },
  };
}
