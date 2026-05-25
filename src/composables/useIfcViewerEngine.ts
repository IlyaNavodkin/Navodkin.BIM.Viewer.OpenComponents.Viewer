import { computed } from "vue";
import * as THREE from "three";
import * as OBC from "@thatopen/components";
import workerUrl from "@thatopen/fragments/dist/Worker/worker.mjs?url";
import webIfcWasmUrl from "web-ifc/web-ifc.wasm?url";
import type { IfcViewerCurrentModel } from "../types/ifcViewer";
import type { IIfcViewerStoreByIdComposable } from "./useIfcViewerStoreById";

export interface IIfcViewerEngineComposableParams {
  viewerStore: IIfcViewerStoreByIdComposable;
}

export interface IIfcViewerEngineComposable {
  isMounted: Readonly<ReturnType<typeof computed<boolean>>>;
  mount(container: HTMLDivElement): Promise<void>;
  unmount(): void;
  loadIfcFile(file: File): Promise<void>;
  loadFragFile(file: File): Promise<void>;
  downloadCurrentFrag(): Promise<void>;
}

type RenderQualityMode = "interactive" | "settled";

interface IIfcViewerPerformanceOptions {
  enableManualRenderMode: boolean;
  enableInteractivePixelRatio: boolean;
  enableInteractiveFragmentsThrottle: boolean;
  enableSettledRenderDebounce: boolean;
  enableSettledRenderOnRestEvent: boolean;
  interactivePixelRatioCap: number;
  settledPixelRatioCap: number;
  interactiveFragmentsThrottleMs: number;
  settledRenderDebounceMs: number;
}

const IFC_VIEWER_PERFORMANCE_OPTIONS: IIfcViewerPerformanceOptions = {
  enableManualRenderMode: true,
  enableInteractivePixelRatio: true,
  enableInteractiveFragmentsThrottle: true,
  enableSettledRenderDebounce: true,
  enableSettledRenderOnRestEvent: false,
  interactivePixelRatioCap: 0.6,
  settledPixelRatioCap: 1.5,
  interactiveFragmentsThrottleMs: 1000,
  settledRenderDebounceMs: 100,
};

function createModelId(fileName: string, index: number) {
  const normalized = fileName
    .replace(/\.(ifc|frag)$/i, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return `${normalized || "model"}-${index}`;
}

function getModelName(fileName: string) {
  return fileName.replace(/\.(ifc|frag)$/i, "").trim() || fileName;
}

function getFragDownloadName(fileName: string) {
  const baseName = fileName.replace(/\.(ifc|frag)$/i, "").trim() || "model";
  return `${baseName}.frag`;
}

function resolveWasmDirectoryPath(wasmAssetUrl: string) {
  const resolvedUrl = new URL(wasmAssetUrl, window.location.href);
  const directoryPath = resolvedUrl.pathname.replace(/[^/]+$/, "");
  return `${resolvedUrl.origin}${directoryPath}`;
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
  let mountedContainer: HTMLDivElement | null = null;
  let currentModelId: string | null = null;
  let modelSequence = 0;
  let operationToken = 0;
  let renderQualityMode: RenderQualityMode | null = null;
  let lastInteractiveFragmentsUpdateAt = 0;
  let pendingInteractiveFragmentsUpdateTimeout: ReturnType<
    typeof window.setTimeout
  > | null = null;
  let pendingSettledRenderTimeout: ReturnType<typeof window.setTimeout> | null =
    null;

  const isMounted = computed(() => mountedContainer !== null);

  const setIdleStatus = () => {
    const currentModel = params.viewerStore.state.value.currentModel;
    params.viewerStore.setLoading({
      isLoading: false,
      progress: null,
      statusText: currentModel
        ? `${currentModel.name} is loaded in the viewer.`
        : "Choose an IFC or FRAG file to start.",
    });
  };

  const disposeLoadedModels = async () => {
    params.viewerStore.setCurrentModel(null);
    currentModelId = null;

    if (!fragments) {
      return;
    }

    const modelIds = [...fragments.list.keys()];
    await Promise.all(
      modelIds.map(async (modelId) => {
        await fragments?.core.disposeModel(modelId);
      }),
    );
  };

  const getCurrentRuntimeModel = () => {
    if (!fragments || !currentModelId) {
      return null;
    }

    return fragments.list.get(currentModelId) ?? null;
  };

  const markRendererDirty = () => {
    if (
      !world ||
      (IFC_VIEWER_PERFORMANCE_OPTIONS.enableManualRenderMode &&
        world.renderer.mode !== OBC.RendererMode.MANUAL)
    ) {
      return;
    }

    world.renderer.needsUpdate = true;
  };

  const getTargetPixelRatio = (mode: RenderQualityMode) => {
    const devicePixelRatio = window.devicePixelRatio || 1;
    if (!IFC_VIEWER_PERFORMANCE_OPTIONS.enableInteractivePixelRatio) {
      return Math.min(
        devicePixelRatio,
        IFC_VIEWER_PERFORMANCE_OPTIONS.settledPixelRatioCap,
      );
    }

    const cap =
      mode === "interactive"
        ? IFC_VIEWER_PERFORMANCE_OPTIONS.interactivePixelRatioCap
        : IFC_VIEWER_PERFORMANCE_OPTIONS.settledPixelRatioCap;

    return Math.min(devicePixelRatio, cap);
  };

  const applyRenderQuality = (mode: RenderQualityMode) => {
    if (!world) {
      return;
    }

    const targetPixelRatio = getTargetPixelRatio(mode);
    const currentPixelRatio = world.renderer.three.getPixelRatio();
    const qualityAlreadyApplied =
      renderQualityMode === mode &&
      Math.abs(currentPixelRatio - targetPixelRatio) < 0.001;

    if (qualityAlreadyApplied) {
      return;
    }

    renderQualityMode = mode;
    world.renderer.three.setPixelRatio(targetPixelRatio);
    world.renderer.resize();
    markRendererDirty();
  };

  const clearPendingInteractiveFragmentsUpdate = () => {
    if (pendingInteractiveFragmentsUpdateTimeout !== null) {
      window.clearTimeout(pendingInteractiveFragmentsUpdateTimeout);
      pendingInteractiveFragmentsUpdateTimeout = null;
    }
  };

  const clearPendingSettledRender = () => {
    if (pendingSettledRenderTimeout !== null) {
      window.clearTimeout(pendingSettledRenderTimeout);
      pendingSettledRenderTimeout = null;
    }
  };

  const runInteractiveFragmentsUpdate = () => {
    lastInteractiveFragmentsUpdateAt = performance.now();
    void fragments?.core.update();
  };

  const scheduleInteractiveFragmentsUpdate = () => {
    if (!IFC_VIEWER_PERFORMANCE_OPTIONS.enableInteractiveFragmentsThrottle) {
      runInteractiveFragmentsUpdate();
      return;
    }

    const now = performance.now();
    const elapsed = now - lastInteractiveFragmentsUpdateAt;
    const throttleMs =
      IFC_VIEWER_PERFORMANCE_OPTIONS.interactiveFragmentsThrottleMs;

    if (elapsed >= throttleMs) {
      clearPendingInteractiveFragmentsUpdate();
      runInteractiveFragmentsUpdate();
      return;
    }

    if (pendingInteractiveFragmentsUpdateTimeout !== null) {
      return;
    }

    pendingInteractiveFragmentsUpdateTimeout = window.setTimeout(() => {
      pendingInteractiveFragmentsUpdateTimeout = null;
      runInteractiveFragmentsUpdate();
      markRendererDirty();
    }, throttleMs - elapsed);
  };

  const requestInteractiveRender = () => {
    clearPendingSettledRender();
    applyRenderQuality("interactive");
    scheduleInteractiveFragmentsUpdate();
    markRendererDirty();

    if (!IFC_VIEWER_PERFORMANCE_OPTIONS.enableSettledRenderDebounce) {
      return;
    }

    pendingSettledRenderTimeout = window.setTimeout(() => {
      pendingSettledRenderTimeout = null;
      requestSettledRender();
    }, IFC_VIEWER_PERFORMANCE_OPTIONS.settledRenderDebounceMs);
  };

  const requestSettledRender = () => {
    clearPendingSettledRender();
    clearPendingInteractiveFragmentsUpdate();
    applyRenderQuality("settled");
    void fragments?.core.update(true);
    markRendererDirty();
  };

  const fitCurrentModel = async () => {
    if (!world || !currentModelId) {
      return;
    }

    try {
      await world.camera.fitToItems();
    } catch {
      await world.camera.controls.setLookAt(32, 24, 32, 0, 0, 0);
    }
  };

  const setCurrentModelState = (model: IfcViewerCurrentModel) => {
    currentModelId = model.id;
    params.viewerStore.setCurrentModel(model);
    params.viewerStore.setError(null);
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
    world.scene.three.background = new THREE.Color("#0a1224");

    world.renderer = new OBC.SimpleRenderer(components, container);
    if (IFC_VIEWER_PERFORMANCE_OPTIONS.enableManualRenderMode) {
      world.renderer.mode = OBC.RendererMode.MANUAL;
    }
    world.camera = new OBC.OrthoPerspectiveCamera(components);

    components.init();
    components.get(OBC.Grids).create(world);
    await world.camera.controls.setLookAt(32, 24, 32, 0, 0, 0);

    fragments = components.get(OBC.FragmentsManager);
    fragments.init(workerUrl);

    world.camera.controls.addEventListener("update", requestInteractiveRender);
    if (IFC_VIEWER_PERFORMANCE_OPTIONS.enableSettledRenderOnRestEvent) {
      world.camera.controls.addEventListener("rest", requestSettledRender);
    }
    world.renderer.onResize.add(markRendererDirty);

    world.onCameraChanged.add((camera) => {
      if (!fragments) {
        return;
      }

      for (const [, model] of fragments.list) {
        model.useCamera(camera.three);
      }

      void fragments.core.update(true);
      markRendererDirty();
    });

    fragments.list.onItemSet.add(({ value: model }) => {
      if (!world || !fragments) {
        return;
      }

      model.useCamera(world.camera.three);
      world.scene.three.add(model.object);
      void fragments.core.update(true);
      markRendererDirty();
    });

    fragments.list.onBeforeDelete.add(({ value: model }) => {
      world?.scene.three.remove(model.object);
      markRendererDirty();
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

    mountedContainer = container;
    params.viewerStore.setReady(true);
    setIdleStatus();
    requestSettledRender();
  };

  const disposeRuntime = () => {
    operationToken += 1;
    currentModelId = null;
    renderQualityMode = null;
    clearPendingInteractiveFragmentsUpdate();
    clearPendingSettledRender();
    mountedContainer = null;
    fragments = null;
    ifcLoader = null;
    world = null;

    if (components) {
      components.dispose();
      components = null;
    }

    params.viewerStore.setReady(false);
    params.viewerStore.setCurrentModel(null);
    params.viewerStore.setError(null);
    params.viewerStore.setLoading({
      isLoading: false,
      progress: null,
      statusText: "Choose an IFC or FRAG file to start.",
    });
  };

  const ensureRuntimeReady = () => {
    if (!world || !fragments || !ifcLoader) {
      throw new Error("Viewer runtime is not ready.");
    }

    return {
      world,
      fragments,
      ifcLoader,
    };
  };

  const handleLoadFailure = (token: number, fallbackMessage: string, error: unknown) => {
    if (token !== operationToken) {
      return;
    }

    params.viewerStore.setCurrentModel(null);
    params.viewerStore.setError(
      error instanceof Error ? error.message : fallbackMessage,
    );
    params.viewerStore.setLoading({
      isLoading: false,
      progress: null,
      statusText: "Load failed.",
    });
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
    loadIfcFile: async (file) => {
      const runtime = ensureRuntimeReady();
      const token = ++operationToken;
      modelSequence += 1;
      const modelId = createModelId(file.name, modelSequence);

      params.viewerStore.setError(null);
      params.viewerStore.setLoading({
        isLoading: true,
        progress: 0,
        statusText: `Loading IFC ${file.name}...`,
      });

      try {
        await disposeLoadedModels();
        const data = new Uint8Array(await file.arrayBuffer());
        const model = await runtime.ifcLoader.load(data, false, modelId, {
          processData: {
            progressCallback: (progress) => {
              if (token !== operationToken) {
                return;
              }

              params.viewerStore.setLoading({
                isLoading: true,
                progress: Math.round(progress * 100),
                statusText: `Converting IFC ${file.name}...`,
              });
            },
          },
        });

        if (token !== operationToken) {
          await runtime.fragments.core.disposeModel(modelId);
          return;
        }

        setCurrentModelState({
          id: model.modelId,
          name: getModelName(file.name),
          sourceFileName: file.name,
          sourceType: "ifc",
          canExportFrag: true,
        });
        await fitCurrentModel();
        requestSettledRender();
        setIdleStatus();
      } catch (error) {
        handleLoadFailure(token, "Failed to load IFC model.", error);
      }
    },
    loadFragFile: async (file) => {
      const runtime = ensureRuntimeReady();
      const token = ++operationToken;
      modelSequence += 1;
      const modelId = createModelId(file.name, modelSequence);

      params.viewerStore.setError(null);
      params.viewerStore.setLoading({
        isLoading: true,
        progress: null,
        statusText: `Loading FRAG ${file.name}...`,
      });

      try {
        await disposeLoadedModels();
        const buffer = await file.arrayBuffer();
        const model = await runtime.fragments.core.load(buffer, { modelId });

        if (token !== operationToken) {
          await runtime.fragments.core.disposeModel(modelId);
          return;
        }

        setCurrentModelState({
          id: model.modelId,
          name: getModelName(file.name),
          sourceFileName: file.name,
          sourceType: "frag",
          canExportFrag: false,
        });
        await fitCurrentModel();
        requestSettledRender();
        setIdleStatus();
      } catch (error) {
        handleLoadFailure(token, "Failed to load FRAG model.", error);
      }
    },
    downloadCurrentFrag: async () => {
      const currentModel = params.viewerStore.state.value.currentModel;
      if (!currentModel?.canExportFrag) {
        return;
      }

      const model = getCurrentRuntimeModel();
      if (!model) {
        params.viewerStore.setError("The current IFC model is not available for export.");
        return;
      }

      const fragmentBuffer = await model.getBuffer(false);
      const downloadFile = new File(
        [fragmentBuffer],
        getFragDownloadName(currentModel.sourceFileName),
      );
      const downloadUrl = URL.createObjectURL(downloadFile);
      const link = document.createElement("a");

      link.href = downloadUrl;
      link.download = downloadFile.name;
      link.click();
      URL.revokeObjectURL(downloadUrl);

      params.viewerStore.setStatusText(`Downloaded ${downloadFile.name}.`);
    },
  };
}
