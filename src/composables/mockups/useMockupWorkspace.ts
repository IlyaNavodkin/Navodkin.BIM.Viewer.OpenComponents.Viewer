import { computed, ref } from "vue";
import type {
  CreateMockupProjectPayload,
  MockupModel,
  MockupProject,
  MockupPropertySet,
  MockupTreeNode,
} from "../../types/mockups";

const currentProject = ref<MockupProject | null>(null);
const models = ref<MockupModel[]>([]);
const treeRoots = ref<MockupTreeNode[]>([]);
const selectedElementId = ref<string | null>(null);
const highlightedElementIds = ref<string[]>([]);
const selectionAnchorId = ref<string | null>(null);
const activityMessage = ref(
  "Создайте проект и загрузите IFC-модели, чтобы наполнить рабочее пространство."
);
const isUploading = ref(false);
const uploadQueue = ref<string[]>([]);

let sequence = 1;

const selectedElement = computed(() => {
  if (!selectedElementId.value) {
    return null;
  }

  return findNodeById(treeRoots.value, selectedElementId.value);
});

const totalElements = computed(() => countNodes(treeRoots.value));

const highlightedCount = computed(() => highlightedElementIds.value.length);

function createProject(payload: CreateMockupProjectPayload) {
  currentProject.value = {
    id: createId("project"),
    name: payload.name.trim(),
    description: payload.description.trim(),
    createdAt: new Date().toISOString(),
  };

  const initialModels = buildInitialModels();
  models.value = initialModels;
  treeRoots.value = initialModels.flatMap((model) => buildModelTree(model));
  setSingleSelection(treeRoots.value[0]?.children[0]?.children[0]?.id ?? null);
  activityMessage.value =
    "Проект создан. Откройте диспетчер моделей или работайте с деревом элементов.";
}

async function uploadIfcFiles(files: readonly File[]) {
  if (files.length === 0) {
    return;
  }

  isUploading.value = true;
  uploadQueue.value = files.map((file) => file.name);

  for (const file of files) {
    const processingModel: MockupModel = {
      id: createId("model"),
      name: file.name.replace(/\.ifc$/i, ""),
      discipline: detectDiscipline(file.name),
      uploadedAt: new Date().toISOString(),
      status: "processing",
    };

    models.value = [processingModel, ...models.value];
    activityMessage.value = `Загрузка ${file.name} в mock workspace...`;
    await wait(750);

    processingModel.status = "ready";
    treeRoots.value = [...buildModelTree(processingModel), ...treeRoots.value];
    setSingleSelection(treeRoots.value[0]?.children[0]?.children[0]?.id ?? null);
    activityMessage.value = `Модель ${processingModel.name} добавлена в пространство.`;
  }

  uploadQueue.value = [];
  isUploading.value = false;
}

function removeModel(modelId: string) {
  const model = models.value.find((item) => item.id === modelId);
  if (!model) {
    return;
  }

  models.value = models.value.filter((item) => item.id !== modelId);
  treeRoots.value = treeRoots.value.filter((item) => item.modelId !== modelId);

  if (
    selectedElementId.value &&
    !findNodeById(treeRoots.value, selectedElementId.value)
  ) {
    selectedElementId.value = treeRoots.value[0]?.children[0]?.children[0]?.id ?? null;
  }

  highlightedElementIds.value = highlightedElementIds.value.filter((id) =>
    Boolean(findNodeById(treeRoots.value, id))
  );

  if (!highlightedElementIds.value.length && selectedElementId.value) {
    highlightedElementIds.value = [selectedElementId.value];
  }

  if (
    selectionAnchorId.value &&
    !findNodeById(treeRoots.value, selectionAnchorId.value)
  ) {
    selectionAnchorId.value = selectedElementId.value;
  }

  activityMessage.value = `Модель ${model.name} удалена из mock workspace.`;
}

function selectElement(
  nodeId: string,
  visibleNodeIds: string[],
  event?: MouseEvent
) {
  const node = findNodeById(treeRoots.value, nodeId);
  if (!node) {
    return;
  }

  const additive = Boolean(event?.ctrlKey || event?.metaKey);
  const rangeSelection = Boolean(event?.shiftKey);
  const sanitizedSelection = highlightedElementIds.value.filter((id) =>
    Boolean(findNodeById(treeRoots.value, id))
  );
  const anchorId =
    selectionAnchorId.value && visibleNodeIds.includes(selectionAnchorId.value)
      ? selectionAnchorId.value
      : selectedElementId.value && visibleNodeIds.includes(selectedElementId.value)
        ? selectedElementId.value
        : visibleNodeIds.includes(nodeId)
          ? nodeId
          : null;

  if (rangeSelection && anchorId) {
    const rangeIds = collectRangeIds(visibleNodeIds, anchorId, nodeId);
    highlightedElementIds.value = additive
      ? uniqueIds([...sanitizedSelection, ...rangeIds])
      : rangeIds;
    selectedElementId.value = nodeId;
    activityMessage.value = additive
      ? `Диапазон до ${node.label} добавлен в текущее выделение.`
      : `Выделен диапазон по дереву до ${node.label}.`;
    return;
  }

  if (additive) {
    if (sanitizedSelection.includes(nodeId)) {
      highlightedElementIds.value = sanitizedSelection.filter((item) => item !== nodeId);
      selectedElementId.value =
        selectedElementId.value === nodeId
          ? highlightedElementIds.value.at(-1) ?? null
          : selectedElementId.value;
      selectionAnchorId.value = nodeId;
      activityMessage.value = `Элемент ${node.label} снят с выделения.`;
      return;
    }

    highlightedElementIds.value = uniqueIds([...sanitizedSelection, nodeId]);
    selectedElementId.value = nodeId;
    selectionAnchorId.value = nodeId;
    activityMessage.value = `Элемент ${node.label} добавлен в выделение.`;
    return;
  }

  setSingleSelection(nodeId);
  activityMessage.value = `Выбран элемент ${node.label}.`;
}

function focusElement(nodeId: string) {
  const node = findNodeById(treeRoots.value, nodeId);
  if (!node) {
    return;
  }

  setSingleSelection(nodeId);
  activityMessage.value = `Элемент ${node.label} выделен и показан в 3D viewport.`;
}

async function copyElementId(nodeId: string) {
  const node = findNodeById(treeRoots.value, nodeId);
  if (!node) {
    return;
  }

  await navigator.clipboard.writeText(node.id);
  activityMessage.value = `ID элемента ${node.label} скопирован в буфер обмена.`;
}

async function copyElementName(nodeId: string) {
  const node = findNodeById(treeRoots.value, nodeId);
  if (!node) {
    return;
  }

  await navigator.clipboard.writeText(node.label);
  activityMessage.value = `Имя элемента ${node.label} скопировано в буфер обмена.`;
}

function selectNestedElements(nodeId: string) {
  const node = findNodeById(treeRoots.value, nodeId);
  if (!node) {
    return;
  }

  const descendantIds = [nodeId, ...collectDescendantIds(node)];
  selectedElementId.value = nodeId;
  highlightedElementIds.value = descendantIds;
  selectionAnchorId.value = nodeId;
  activityMessage.value = `Узел ${node.label} выделен по дереву вместе с ${descendantIds.length - 1} вложенными элементами.`;
}

function resetMockupState() {
  currentProject.value = null;
  models.value = [];
  treeRoots.value = [];
  selectedElementId.value = null;
  highlightedElementIds.value = [];
  selectionAnchorId.value = null;
  isUploading.value = false;
  uploadQueue.value = [];
  activityMessage.value =
    "Создайте проект и загрузите IFC-модели, чтобы наполнить рабочее пространство.";
}

export function useMockupWorkspace() {
  return {
    activityMessage,
    currentProject,
    highlightedCount,
    highlightedElementIds,
    isUploading,
    models,
    selectedElement,
    selectedElementId,
    totalElements,
    treeRoots,
    uploadQueue,
    createProject,
    copyElementId,
    copyElementName,
    focusElement,
    removeModel,
    resetMockupState,
    selectElement,
    selectNestedElements,
    uploadIfcFiles,
  };
}

function buildInitialModels(): MockupModel[] {
  return [
    {
      id: createId("model"),
      name: "ARC_Tower_A",
      discipline: "Architecture",
      uploadedAt: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
      status: "ready",
    },
    {
      id: createId("model"),
      name: "STR_Podium",
      discipline: "Structure",
      uploadedAt: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
      status: "ready",
    },
  ];
}

function buildModelTree(model: MockupModel): MockupTreeNode[] {
  const levelCount = model.discipline === "Architecture" ? 3 : 2;
  const levels = Array.from({ length: levelCount }, (_, index) =>
    buildLevelNode(model, index + 1)
  );

  return [
    {
      id: createId("node"),
      modelId: model.id,
      label: model.name,
      type: "MODEL",
      container: true,
      children: levels,
      propertySets: buildPropertySets(model.name, "Model metadata", [
        ["Discipline", "Enum", model.discipline],
        ["Status", "Status", model.status],
        ["Source", "File", `${model.name}.ifc`],
      ]),
    },
  ];
}

function buildLevelNode(model: MockupModel, index: number): MockupTreeNode {
  const levelLabel = `LEVEL ${index.toString().padStart(2, "0")}`;
  const spaces = Array.from({ length: 2 + (index % 2) }, (_, spaceIndex) =>
    buildSpaceNode(model, levelLabel, spaceIndex + 1)
  );

  return {
    id: createId("node"),
    modelId: model.id,
    label: levelLabel,
    type: "LEVEL",
    container: true,
    children: spaces,
    propertySets: buildPropertySets(levelLabel, "Placement", [
      ["Elevation", "Length", `${(index - 1) * 4200} mm`],
      ["Long name", "Text", `Floor ${index}`],
      ["Model", "Reference", model.name],
    ]),
  };
}

function buildSpaceNode(
  model: MockupModel,
  levelLabel: string,
  spaceIndex: number
): MockupTreeNode {
  const label = `Zone ${spaceIndex}${levelLabel.slice(-2)}`;
  const elementTypes =
    model.discipline === "Structure"
      ? ["Column", "Beam", "Slab"]
      : ["Wall", "Door", "Window"];
  const elements = elementTypes.map((type, elementIndex) =>
    buildLeafNode(model, label, type, elementIndex + 1)
  );

  return {
    id: createId("node"),
    modelId: model.id,
    label,
    type: "SPACE",
    container: true,
    children: elements,
    propertySets: buildPropertySets(label, "Identity", [
      ["Category", "Enum", "Space"],
      ["Level", "Reference", levelLabel],
      ["Occupancy", "Integer", `${12 + spaceIndex * 4}`],
    ]),
  };
}

function buildLeafNode(
  model: MockupModel,
  zoneLabel: string,
  type: string,
  index: number
): MockupTreeNode {
  const label = `${type}-${zoneLabel.replace(/\s+/g, "")}-${index}`;
  const dimensions =
    type === "Wall"
      ? "8200 x 3000 x 200 mm"
      : type === "Door"
        ? "1100 x 2300 mm"
        : type === "Window"
          ? "1800 x 1500 mm"
          : type === "Column"
            ? "400 x 400 x 3600 mm"
            : type === "Beam"
              ? "6000 x 350 x 650 mm"
              : "7200 x 3200 x 250 mm";

  return {
    id: createId("node"),
    modelId: model.id,
    label,
    type: type.toUpperCase(),
    container: false,
    children: [],
    propertySets: [
      ...buildPropertySets(label, "Identity Data", [
        ["Type", "Enum", type],
        ["Model", "Reference", model.name],
        ["Zone", "Reference", zoneLabel],
      ]),
      ...buildPropertySets(label, "Dimensions", [
        ["Overall", "Dimensions", dimensions],
        [
          "Material",
          "Material",
          model.discipline === "Structure" ? "Concrete C35/45" : "Composite",
        ],
        ["Fire rating", "Classification", index % 2 === 0 ? "EI 60" : "EI 90"],
      ]),
    ],
  };
}

function buildPropertySets(
  entityLabel: string,
  title: string,
  rows: Array<[string, string, string]>
): MockupPropertySet[] {
  return [
    {
      id: createId("pset"),
      name: title,
      properties: rows.map(([name, dataType, value]) => ({
        id: createId("prop"),
        name,
        dataType,
        value: value || entityLabel,
      })),
    },
  ];
}

function setSingleSelection(nodeId: string | null) {
  selectedElementId.value = nodeId;
  highlightedElementIds.value = nodeId ? [nodeId] : [];
  selectionAnchorId.value = nodeId;
}

function collectDescendantIds(node: MockupTreeNode): string[] {
  return node.children.flatMap((child) => [child.id, ...collectDescendantIds(child)]);
}

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids)];
}

function collectRangeIds(
  visibleNodeIds: string[],
  anchorId: string,
  nodeId: string
): string[] {
  const anchorIndex = visibleNodeIds.indexOf(anchorId);
  const targetIndex = visibleNodeIds.indexOf(nodeId);

  if (anchorIndex === -1 || targetIndex === -1) {
    return [nodeId];
  }

  const [start, end] =
    anchorIndex <= targetIndex
      ? [anchorIndex, targetIndex]
      : [targetIndex, anchorIndex];

  return visibleNodeIds.slice(start, end + 1);
}

function countNodes(nodes: MockupTreeNode[]): number {
  return nodes.reduce((count, node) => count + 1 + countNodes(node.children), 0);
}

function findNodeById(nodes: MockupTreeNode[], nodeId: string): MockupTreeNode | null {
  for (const node of nodes) {
    if (node.id === nodeId) {
      return node;
    }

    const nested = findNodeById(node.children, nodeId);
    if (nested) {
      return nested;
    }
  }

  return null;
}

function detectDiscipline(fileName: string): string {
  const normalized = fileName.toLowerCase();
  if (normalized.includes("str") || normalized.includes("struct")) {
    return "Structure";
  }

  if (normalized.includes("mep")) {
    return "MEP";
  }

  return "Architecture";
}

function createId(prefix: string): string {
  sequence += 1;
  return `${prefix}-${sequence}`;
}

function wait(timeoutMs: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, timeoutMs);
  });
}
