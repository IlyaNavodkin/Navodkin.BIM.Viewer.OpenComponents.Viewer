<template>
  <div :class="$style.root" tabindex="0" @keydown.esc="handleEscape">
    <div :class="$style.toolbar">
      Toolbar
      <input type="file" @change="handleFileChange" />
    </div>
    <div :class="$style.content">
      <div :class="$style.leftPanel">
        <div :class="$style.leftPanelHeader">MODEL</div>
        <div :class="$style.leftPanelScroll">
          <button :class="$style.leftPanelButton3D" @click="resetTo3DView">
            3D View
          </button>
          <div
            v-if="viewsList.length > 0"
            :class="$style.leftPanelItem"
            v-for="(view, index) in viewsList"
            :key="index"
          >
            <div :class="$style.leftPanelItemTitle">{{ view[0] }}</div>
            <button :class="$style.leftPanelButton" @click="openView(view[0])">
              Открыть
            </button>
          </div>
        </div>
      </div>

      <div ref="container" :class="$style.viewport"></div>
      <div :class="$style.rightPanel">
        <div :class="$style.rightPanelHeader">Spatial Structure</div>
        <div :class="$style.rightPanelScroll">
          <div v-if="spatialTree">
            <component
              :is="TreeNodeComponent"
              :node="spatialTree"
              :level="0"
              :$style="$style"
              @contextmenu="handleContextMenu"
              @select="handleTreeNodeSelect"
            />
          </div>
          <div v-else :class="$style.emptyMessage">
            Загрузите IFC файл для отображения структуры
          </div>
        </div>
      </div>
    </div>

    <!-- Контекстное меню -->
    <Teleport to="body">
      <div
        v-if="contextMenu.visible"
        :class="$style.contextMenu"
        :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
        @click.stop
      >
        <div :class="$style.contextMenuItem" @click="handleHide">Скрыть</div>
        <div :class="$style.contextMenuItem" @click="handleIsolate">
          Изолировать
        </div>
        <div :class="$style.contextMenuItem" @click="handleShow">Показать</div>
      </div>
    </Teleport>

    <!-- Блок с элементами IFCFURNISHINGELEMENT -->
    <div :class="$style.bottomPanel">
      <div :class="$style.bottomPanelHeader">
        IFCFURNISHINGELEMENT ({{ furnishingElements.length }})
      </div>
      <div :class="$style.bottomPanelScroll">
        <div
          v-for="(element, index) in furnishingElements"
          :key="index"
          :class="[
            $style.furnishingItem,
            { [$style.selected]: isElementSelected(element.localId) },
          ]"
          @click="selectElement(element.localId)"
        >
          {{ element.name || `Element ${element.localId}` }}
        </div>
        <div
          v-if="furnishingElements.length === 0"
          :class="$style.emptyMessage"
        >
          Элементы не найдены
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import * as OBC from "@thatopen/components";
import {
  ref,
  shallowRef,
  computed,
  watch,
  onMounted,
  onUnmounted,
  h,
} from "vue";
import { FragmentsModel, LodMode } from "@thatopen/fragments";

// Типы для spatial structure
interface SpatialNode {
  category: string | null;
  localId: number;
  children?: SpatialNode[];
}

interface FurnishingElement {
  localId: number;
  name: string;
}

interface ContextMenu {
  visible: boolean;
  x: number;
  y: number;
  node: SpatialNode | null;
}

const container = ref<HTMLDivElement>();
const components = shallowRef<OBC.Components>();
const renderer = shallowRef<OBC.SimpleRenderer>();
const camera = shallowRef<OBC.SimpleCamera>();
const ifcLoader = shallowRef<OBC.IfcLoader>();
const model = shallowRef<FragmentsModel>();
const modelId = ref<string>("example");
const views = shallowRef<OBC.Views>();
const fragments = shallowRef<OBC.FragmentsManager>();
const hider = shallowRef<OBC.Hider>();
const handleMiddleMouseClick = ref<
  ((event: MouseEvent) => Promise<void>) | null
>(null);
const handleAuxClick = ref<((e: MouseEvent) => void) | null>(null);

// Реактивные переменные для spatial structure и элементов
const spatialTree = ref<SpatialNode | null>(null);
const furnishingElements = ref<FurnishingElement[]>([]);
const selectedElements = ref<Set<number>>(new Set());
const contextMenu = ref<ContextMenu>({
  visible: false,
  x: 0,
  y: 0,
  node: null,
});

// Реактивный триггер для принудительного обновления computed при изменении views.list
const viewsUpdateTrigger = ref(0);

// Реактивный список views для отображения в template
const viewsList = computed(() => {
  // Читаем триггер для создания зависимости
  viewsUpdateTrigger.value;

  if (!views.value || !views.value.list) return [];

  // SimpleList имеет метод entries(), который возвращает итератор
  // Преобразуем итератор в массив
  try {
    const entries = views.value.list.entries();
    const result = Array.from(entries);
    return result;
  } catch (error) {
    console.error("Error converting views.list to array:", error);
    return [];
  }
});

// Watch для отслеживания изменений в views.list.size
// Так как Map не является реактивным объектом Vue, мы отслеживаем размер
watch(
  () => views.value?.list?.size ?? 0,
  () => {
    // Принудительно обновляем триггер при изменении размера списка
    viewsUpdateTrigger.value++;
  },
  { immediate: true, flush: "post" }
);

// Watch для отслеживания загрузки новой модели и обновления views
watch(
  () => model.value,
  (newModel) => {
    if (newModel && views.value && views.value.world) {
      // Обновляем views при загрузке новой модели
      // createFromIfcStoreys создает 2D views для каждого этажа
      // По умолчанию показывает все элементы на уровне, включая столы
      views.value.createFromIfcStoreys();
      console.log(
        "createFromIfcStoreys called - views.value.list.size:",
        views.value?.list?.size
      );
    }
  },
  { flush: "post" }
);

// Сохраняем начальную позицию камеры для возврата к 3D виду
const defaultCameraPosition = { x: 10, y: 10, z: 10 };
const defaultCameraTarget = { x: 0, y: 0, z: 0 };

const resetTo3DView = async () => {
  if (!camera.value) return;

  await camera.value.controls.setLookAt(
    defaultCameraPosition.x,
    defaultCameraPosition.y,
    defaultCameraPosition.z,
    defaultCameraTarget.x,
    defaultCameraTarget.y,
    defaultCameraTarget.z,
    true
  );
};

const openView = (viewName: string) => {
  if (!viewName || !views.value || !components.value) return;

  const view = views.value.list.get(viewName);
  if (!view) {
    console.warn(`View "${viewName}" not found`);
    return;
  }

  view.range = 100;
  // view.distance = levelHeight + 0.5;

  view.helpersVisible = true;
  view.planesEnabled = true;

  views.value.open(viewName);
};

const handleResize = () => {
  if (renderer.value && camera.value) {
    renderer.value.resize();
    camera.value.updateAspect();
  }
};

const handleFileChange = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file) {
    const path = URL.createObjectURL(file);
    await loadIfc(path);
  }
};
// Рекурсивная функция для сбора всех localId из узла дерева
const collectNodeIds = (node: SpatialNode): number[] => {
  const ids: number[] = [node.localId];
  if (node.children) {
    for (const child of node.children) {
      ids.push(...collectNodeIds(child));
    }
  }
  return ids;
};

// Обработчик выбора элемента в дереве
const handleTreeNodeSelect = async (node: SpatialNode) => {
  if (!fragments.value || !model.value) return;

  try {
    const ids = collectNodeIds(node);
    // Сбрасываем предыдущее выделение
    if (selectedElements.value.size > 0) {
      const prevIds = Array.from(selectedElements.value);
      await model.value.resetHighlight(prevIds);
    }

    // Очищаем и добавляем новые выделенные элементы
    selectedElements.value.clear();
    ids.forEach((id) => selectedElements.value.add(id));

    // Выделяем все элементы узла
    await model.value.highlight(ids, {
      color: { r: 255, g: 255, b: 0 },
      opacity: 0.5,
      transparent: true,
    } as any);
    await fragments.value.core.update(true);
  } catch (error) {
    console.error("Ошибка при выделении элемента дерева:", error);
  }
};

// Обработчики контекстного меню
const handleContextMenu = (e: MouseEvent, node: SpatialNode) => {
  e.preventDefault();
  contextMenu.value = {
    visible: true,
    x: e.clientX,
    y: e.clientY,
    node,
  };
};

// Закрытие контекстного меню при клике вне его
const closeContextMenu = () => {
  contextMenu.value.visible = false;
};

// Функции для работы с видимостью элементов
const getModelIdMap = (localIds: number[]): OBC.ModelIdMap => {
  if (!model.value) return {};
  return {
    [modelId.value]: new Set(localIds),
  };
};

const handleHide = async () => {
  if (!contextMenu.value.node || !hider.value || !model.value) return;

  const ids = collectNodeIds(contextMenu.value.node);
  const modelIdMap = getModelIdMap(ids);
  await hider.value.set(false, modelIdMap);
  closeContextMenu();
};

const handleIsolate = async () => {
  if (!contextMenu.value.node || !hider.value || !model.value) return;

  const ids = collectNodeIds(contextMenu.value.node);
  const modelIdMap = getModelIdMap(ids);
  await hider.value.isolate(modelIdMap);
  closeContextMenu();
};

const handleShow = async () => {
  if (!contextMenu.value.node || !hider.value || !model.value) return;

  const ids = collectNodeIds(contextMenu.value.node);
  const modelIdMap = getModelIdMap(ids);
  await hider.value.set(true, modelIdMap);
  closeContextMenu();
};

// Функции для работы с выделением элементов
const isElementSelected = (localId: number): boolean => {
  return selectedElements.value.has(localId);
};

const selectElement = async (localId: number) => {
  if (!fragments.value || !model.value) return;

  try {
    if (selectedElements.value.has(localId)) {
      // Снимаем выделение
      selectedElements.value.delete(localId);
      await model.value.resetHighlight([localId]);
      await fragments.value.core.update(true);
    } else {
      // Добавляем выделение
      selectedElements.value.add(localId);
      // Выделяем элемент в 3D модели желтым цветом
      await model.value.highlight([localId], {
        color: { r: 255, g: 255, b: 0 },
        opacity: 0.5,
        transparent: true,
      } as any);
      await fragments.value.core.update(true);
    }
  } catch (error) {
    console.error("Ошибка при выделении элемента:", error);
  }
};

// Рекурсивный компонент для отображения дерева
const TreeNodeComponent = {
  name: "TreeNodeComponent",
  props: {
    node: { type: Object as () => SpatialNode, required: true },
    level: { type: Number, default: 0 },
  },
  emits: ["contextmenu"],
  setup(props: { node: SpatialNode; level: number }, { emit, attrs }: any) {
    return () => {
      const paddingLeft = props.level * 20;
      const treeNodeClass = attrs?.$style?.treeNode || "";
      const treeNodeLabelClass = attrs?.$style?.treeNodeLabel || "";

      return h(
        "div",
        {
          class: treeNodeClass,
          style: { paddingLeft: `${paddingLeft}px` },
          onClick: () => {
            emit("select", props.node);
          },
          onContextmenu: (e: MouseEvent) => {
            e.preventDefault();
            emit("contextmenu", e, props.node);
          },
        },
        [
          h(
            "span",
            { class: treeNodeLabelClass },
            `${props.node.category || "Unknown"} [${props.node.localId}]`
          ),
          props.node.children?.map((child, index) =>
            h(TreeNodeComponent, {
              key: index,
              node: child,
              level: props.level + 1,
              onContextmenu: (_e: MouseEvent, node: SpatialNode) =>
                emit("contextmenu", _e, node),
              onSelect: (node: SpatialNode) => emit("select", node),
            })
          ),
        ]
      );
    };
  },
};

// Сброс выделения по ESC
const handleEscape = async (e: KeyboardEvent) => {
  if (e.key !== "Escape") return;
  if (!fragments.value || !model.value || selectedElements.value.size === 0)
    return;

  try {
    const ids = Array.from(selectedElements.value);
    await model.value.resetHighlight(ids);
    await fragments.value.core.update(true);
    selectedElements.value.clear();
  } catch (error) {
    console.error("Ошибка при сбросе выделения:", error);
  }
};

// Загрузка элементов IFCFURNISHINGELEMENT
const loadFurnishingElements = async () => {
  if (!model.value) return;

  try {
    const furnishingItems = await model.value.getItemsOfCategories([
      /IFCFURNISHINGELEMENT/,
    ]);
    const furnishingIds = Object.values(furnishingItems).flat();

    if (furnishingIds.length === 0) {
      furnishingElements.value = [];
      return;
    }

    const itemsData = await model.value.getItemsData(furnishingIds, {
      attributesDefault: false,
      attributes: ["Name"],
    });

    furnishingElements.value = itemsData.map((item, index) => {
      const nameAttr = Array.isArray(item.Name) ? item.Name[0] : item.Name;
      const nameValue =
        nameAttr && typeof nameAttr === "object" && "value" in nameAttr
          ? (nameAttr as any).value
          : null;
      return {
        localId: furnishingIds[index],
        name: nameValue || `Element ${furnishingIds[index]}`,
      };
    });
  } catch (error) {
    console.error("Ошибка при загрузке элементов IFCFURNISHINGELEMENT:", error);
    furnishingElements.value = [];
  }
};

const loadIfc = async (path: string) => {
  if (!ifcLoader.value) return;
  const file = await fetch(path);
  const data = await file.arrayBuffer();
  const buffer = new Uint8Array(data);
  const currentModelId = "example";
  modelId.value = currentModelId;
  model.value = await ifcLoader.value.load(buffer, true, currentModelId, {
    processData: {
      progressCallback: (progress) => console.log(progress),
    },
  });

  if (model.value) {
    model.value.setLodMode(LodMode.ALL_VISIBLE);
    // Сохраняем spatial structure в реактивную переменную
    spatialTree.value = (await model.value.getSpatialStructure()) as any;
    console.log("Spatial structure loaded:", spatialTree.value);

    // Загружаем элементы IFCFURNISHINGELEMENT
    await loadFurnishingElements();
  }
};

// Обработчик клика вне контекстного меню
const handleClickOutside = () => {
  if (contextMenu.value.visible) {
    closeContextMenu();
  }
};

onMounted(async () => {
  // Добавляем обработчик клика для закрытия контекстного меню
  document.addEventListener("click", handleClickOutside);
  // Добавляем глобальный обработчик ESC
  window.addEventListener("keydown", handleEscape);

  if (!container.value) return;
  components.value = new OBC.Components();
  if (!components.value) return;
  const worlds = components.value.get(OBC.Worlds);

  const world = worlds.create<
    OBC.SimpleScene,
    OBC.SimpleCamera,
    OBC.SimpleRenderer
  >();

  const scene = new OBC.SimpleScene(components.value);
  renderer.value = new OBC.SimpleRenderer(components.value, container.value);
  camera.value = new OBC.SimpleCamera(components.value);

  if (!renderer.value || !camera.value) return;

  world.scene = scene;
  world.renderer = renderer.value;
  world.camera = camera.value;

  scene.setup();

  const grids = components.value.get(OBC.Grids);
  const grid = grids.create(world);
  grid.config.color.set(0x888888);

  components.value.init();

  // Устанавливаем начальную позицию камеры для 3D вида
  await camera.value.controls.setLookAt(
    defaultCameraPosition.x,
    defaultCameraPosition.y,
    defaultCameraPosition.z,
    defaultCameraTarget.x,
    defaultCameraTarget.y,
    defaultCameraTarget.z
  );

  ifcLoader.value = components.value.get(OBC.IfcLoader);

  if (!ifcLoader.value) return;

  ifcLoader.value.onIfcImporterInitialized.add((importer) => {
    console.log(importer.classes);
  });

  await ifcLoader.value.setup({
    autoSetWasm: false,
    wasm: {
      path: "https://unpkg.com/web-ifc@0.0.72/",
      absolute: true,
    },
  });

  const githubUrl =
    "https://thatopen.github.io/engine_fragment/resources/worker.mjs";
  const fetchedUrl = await fetch(githubUrl);
  const workerBlob = await fetchedUrl.blob();
  const workerFile = new File([workerBlob], "worker.mjs", {
    type: "text/javascript",
  });
  const workerUrl = URL.createObjectURL(workerFile);

  fragments.value = components.value.get(OBC.FragmentsManager);
  fragments.value.init(workerUrl);

  hider.value = components.value.get(OBC.Hider);

  fragments.value.list.onItemSet.add(({ value: model }) => {
    model.useCamera(world.camera.three);
    world.scene.three.add(model.object);
    fragments.value!.core.update(true);
  });

  views.value = components.value.get(OBC.Views);
  if (views.value) {
    views.value.world = world;

    // Подписываемся на события добавления/удаления views для реактивного обновления
    views.value.list.onItemSet.add(() => {
      console.log("View added - size:", views.value?.list?.size);
      viewsUpdateTrigger.value++;
    });

    views.value.list.onItemDeleted.add(() => {
      console.log("View deleted - size:", views.value?.list?.size);
      viewsUpdateTrigger.value++;
    });

    // Создаем начальные views (elevations)
    views.value.createElevations({ combine: true });
    // Принудительно обновляем триггер для реактивного обновления template
    viewsUpdateTrigger.value++;
    console.log(
      "After createElevations - views.value.list.size:",
      views.value.list.size
    );
  }
});

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
  window.removeEventListener("keydown", handleEscape);
  window.removeEventListener("resize", handleResize);
  if (container.value) {
    if (handleMiddleMouseClick.value) {
      container.value.removeEventListener(
        "mousedown",
        handleMiddleMouseClick.value
      );
    }
    if (handleAuxClick.value) {
      container.value.removeEventListener("auxclick", handleAuxClick.value);
    }
  }
  if (components.value) {
    components.value.dispose();
  }
});
</script>

<style module lang="scss">
.root {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 400px;
}

.content {
  display: flex;
  flex-direction: row;
  width: 100%;
  height: calc(100% - 200px);
  margin-bottom: 200px;
}

.toolbar {
  display: flex;
  width: 100%;
  height: 50px;
  background-color: #f0f0f0;
  padding: 10px;
  font-size: 14px;
  font-weight: bold;
}
.viewport {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 400px;
  overflow: hidden;
}

.leftPanel {
  width: 200px;
  height: 100%;
  background-color: #cf8d8d;
  display: flex;
  flex-direction: column;
  font-size: 12px;
}

.leftPanelHeader {
  padding: 8px;
  font-size: 12px;
  font-weight: bold;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

.leftPanelScroll {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 4px;
}

.leftPanelItem {
  padding: 6px 8px;
  margin-bottom: 4px;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.leftPanelItemTitle {
  font-size: 11px;
  font-weight: 500;
  color: #333;
  word-break: break-word;
}

.leftPanelButton3D {
  padding: 6px 10px;
  font-size: 11px;
  font-weight: 600;
  background-color: #2ecc71;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
  margin-bottom: 8px;
  width: 100%;
}

.leftPanelButton3D:hover {
  background-color: #27ae60;
}

.leftPanelButton3D:active {
  background-color: #229954;
}

.leftPanelButton {
  padding: 4px 8px;
  font-size: 10px;
  background-color: #4a90e2;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  transition: background-color 0.2s;
  align-self: flex-start;
}

.leftPanelButton:hover {
  background-color: #357abd;
}

.leftPanelButton:active {
  background-color: #2a5f8f;
}

.rightPanel {
  width: 250px;
  height: 100%;
  background-color: #8d8dcf;
  display: flex;
  flex-direction: column;
  font-size: 12px;
}

.rightPanelHeader {
  padding: 6px 8px;
  font-size: 10px;
  font-weight: bold;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
  background-color: rgba(0, 0, 0, 0.1);
}

.rightPanelScroll {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 2px;
}

.treeNode {
  padding: 2px 4px;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s;
  line-height: 1.2;
  width: 100%;
  box-sizing: border-box;
}

.treeNode:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

.treeNodeLabel {
  font-size: 9px;
  color: #333;
  word-wrap: break-word;
  word-break: break-word;
  overflow-wrap: break-word;
  white-space: normal;
  display: block;
  width: 100%;
  line-height: 1.2;
}

.emptyMessage {
  padding: 8px;
  font-size: 9px;
  color: #666;
  text-align: center;
}

.contextMenu {
  position: fixed;
  background-color: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  min-width: 150px;
}

.contextMenuItem {
  padding: 8px 12px;
  cursor: pointer;
  font-size: 12px;
  transition: background-color 0.2s;
}

.contextMenuItem:hover {
  background-color: #f0f0f0;
}

.bottomPanel {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 200px;
  background-color: #e8e8e8;
  border-top: 1px solid #ccc;
  display: flex;
  flex-direction: column;
  z-index: 100;
}

.bottomPanelHeader {
  padding: 8px;
  font-size: 12px;
  font-weight: bold;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  background-color: rgba(0, 0, 0, 0.05);
  flex-shrink: 0;
}

.bottomPanelScroll {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 4px;
}

.furnishingItem {
  padding: 6px 8px;
  margin-bottom: 2px;
  background-color: rgba(255, 255, 255, 0.5);
  border-radius: 3px;
  cursor: pointer;
  font-size: 11px;
  transition: all 0.2s;
}

.furnishingItem:hover {
  background-color: rgba(255, 255, 255, 0.8);
}

.furnishingItem.selected {
  background-color: #ffeb3b;
  font-weight: bold;
}
</style>
