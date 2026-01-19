import { viewerService } from "../services/viewerService";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import { reactive, Ref, ref } from "vue";
import { FragmentsModel } from "@thatopen/fragments";
import * as THREE from "three";
import Stats from "stats.js";

export function useIFCViewer() {
  const loadingState = reactive({
    isLoading: false,
    progress: 0,
    modelName: null as string | null
  });

  const selectedElements = ref<any[]>([]);

  let fragments: OBC.FragmentsManager | null = null;
  let highlighter: OBF.Highlighter | null = null;
  let stats: Stats | null = null;
  let raycaster: OBC.Raycasters | null = null;
  let world: OBC.SimpleWorld<
    OBC.SimpleScene,
    OBC.SimpleCamera,
    OBF.PostproductionRenderer
  > | null = null;


  const disposeViewer = () => {
    if (world) {
      world!.dispose();
    }

    if (highlighter) {
      highlighter!.dispose();
    }

    if (stats && stats.dom.parentNode) {
      stats.dom.parentNode.removeChild(stats.dom);
    }

    // Сбрасываем состояние сервиса (но не удаляем components)
    viewerService.reset();
  };

  const setupViewer = async (containerRef: HTMLElement) => {
    viewerService.initViewer();
    const components = viewerService.getComponents();

    // Setup scene
    const worlds = components.get(OBC.Worlds);
    world = worlds.create<
      OBC.SimpleScene,
      OBC.SimpleCamera,
      OBF.PostproductionRenderer
    >();

    world.scene = new OBC.SimpleScene(components);
    world.scene.setup();
    world.scene.three.background = null;

    world.renderer = new OBF.PostproductionRenderer(components, containerRef);
    world.camera = new OBC.OrthoPerspectiveCamera(components);
    await world.camera.controls.setLookAt(68, 23, -8.5, 21.5, -5.5, 23);

    fragments = viewerService.getFragmentManager();

    world.camera.controls.addEventListener("rest", () =>
      fragments!.core.update(true),
    );

    world.onCameraChanged.add((camera: any) => {
      for (const [, model] of fragments!.list) {
        model.useCamera(camera.three);
      }
      fragments!.core.update(true);
    });

    viewerService.onModelLoaded((model: FragmentsModel) => {
      console.log("Model loaded", model);
      model.useCamera(world!.camera.three);
      world!.scene.three.add(model.object);
    });

    const fragPaths = ["/Test_IFC_Building.ifc"];

    for (const path of fragPaths) {
      const modelId = path.split("/").pop()?.split(".").shift();
      if (!modelId) continue;

      loadingState.modelName = modelId;
      loadingState.isLoading = true;
      loadingState.progress = 0;

      viewerService.onProgress(async (progress: number) => {
        console.log("Progress:", progress);
        loadingState.progress = progress * 100;
      });
    }

    viewerService.onModelLoadProgressDone((modelId: string) => {
      loadingState.isLoading = false;
      loadingState.progress = 100;
      loadingState.modelName = modelId;
    });

    await viewerService.loadModelByPath(fragPaths[0], "Test_IFC_Building");

    raycaster = components.get(OBC.Raycasters);
    raycaster.get(world);

    highlighter = components.get(OBF.Highlighter);
    highlighter.setup({
      world,
      selectMaterialDefinition: {
        color: new THREE.Color("#bcf124"),
        opacity: 1,
        transparent: false,
        renderedFaces: 0,
      },
    });

    highlighter.events.select.onHighlight.add(async (modelIdMap) => {
      console.log("Something was selected");

      const outliner = components.get(OBF.Outliner);
      outliner!.world = world!;
      outliner!.color = new THREE.Color("#bcf124");
      outliner!.thickness = 2;
      outliner!.fillColor = new THREE.Color("#bcf124");
      outliner!.fillOpacity = 1;

      outliner!.enabled = true;

      const promises = [];
      for (const [modelId, localIds] of Object.entries(modelIdMap)) {
        const model = fragments!.list.get(modelId);
        if (!model) continue;
        promises.push(model.getItemsData([...localIds]));
      }

      const data = (await Promise.all(promises)).flat();
      console.log(data);

      selectedElements.value = data;
    });

    highlighter.events.select.onClear.add(() => {
      console.log("Selection was cleared");
      selectedElements.value = [];
    });

    stats = new Stats();
    stats.showPanel(2);
    document.body.append(stats.dom);
    stats.dom.style.left = "0px";
    stats.dom.style.zIndex = "unset";
    world.renderer.onBeforeUpdate.add(() => stats!.begin());
    world.renderer.onAfterUpdate.add(() => stats!.end());

  }
  return {
    disposeViewer,
    setupViewer,

    selectedElements,
    loadingState
  }
}