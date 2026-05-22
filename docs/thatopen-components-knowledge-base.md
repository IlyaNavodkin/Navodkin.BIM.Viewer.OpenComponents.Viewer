# That Open Components Knowledge Base

This note is a working knowledge base for `@thatopen/components`, `@thatopen/components-front`, `@thatopen/fragments`, and `@thatopen/ui` based on the local examples in:

- `engine_components-main/examples`
- `engine_components-main/packages/core/src/**/example.ts`
- `engine_components-main/packages/front/src/**/example.ts`

The goal is pragmatic: reduce time spent re-learning the library and keep the main integration patterns in one place.

## Critical warning for Vue integration

This is the first rule and the most important one when using That Open Components and Three.js inside Vue:

- do not make `Three.js` or `That Open` runtime objects reactive

Preferred Vue pattern for this stack:

- keep engine objects in plain `let` variables
- keep only UI state in `ref` / `computed`
- synchronize UI from library events and explicit handlers

This is usually better than wrapping engine objects in `ref()` or `shallowRef()`.

Recommended shape:

```ts
let components: OBC.Components | null = null;
let world: WorldType | null = null;
let fragments: OBC.FragmentsManager | null = null;

const isWorldLoaded = ref(false);
const progress = ref(0);
const selectedItems = ref<ItemDto[]>([]);
const currentTool = ref<"select" | "clip" | "measure">("select");
```

Why this is preferable:

- the viewer engine is imperative and mutable by design
- Vue does not need to observe `world` itself to keep the UI current
- the correct synchronization point is usually library events, not object proxying
- it keeps a hard boundary between runtime state and UI state

`shallowRef` is optional, not the default.

Use it only if Vue truly needs to react to replacement of the whole instance reference:

- `null -> world instance`
- `world instance -> null`
- `old viewer instance -> new viewer instance`

If the UI can instead depend on explicit state like `isWorldLoaded`, `progress`, `selectedItems`, or `error`, plain `let` variables are usually the better design.

Do not put these into `reactive()` or deep Vue state:

- `OBC.Components`
- `World`
- `THREE.Scene`
- `THREE.Camera`
- `THREE.Renderer`
- fragment models
- `THREE.Object3D`
- `THREE.Material`
- `THREE.Geometry` and buffers
- raw `ModelIdMap`, `Map`, `Set`, and other large mutable engine objects

Why:

- Vue proxying adds overhead to already heavy mutable runtime objects
- identity-sensitive library logic can break when proxied
- deep watchers over scene-like structures are expensive and usually wrong
- it mixes UI reactivity with engine state that should stay imperative

Recommended approach:

- keep engine/runtime objects in plain variables
- use `markRaw` only if an engine object must cross into Vue state accidentally or by design
- keep only UI-facing state reactive

Good reactive state examples:

- `isLoading`
- `progress`
- `currentTool`
- `selectedItemDtos`
- `sidebarOpen`
- `error`

Bad reactive state examples:

- `scene.children`
- `fragments.list`
- `world`
- `material`
- `mesh`
- full viewer selection maps as live engine objects

In practice:

- use Vue lifecycle for setup and disposal
- use That Open events to derive small UI state updates
- keep the viewer engine in a composable or service, not in a large reactive component object or Pinia store

## Scope and versions

Current project dependencies:

- `@thatopen/components`: `^3.2.7`
- `@thatopen/components-front`: `^3.2.17`
- `@thatopen/fragments`: `^3.2.13`
- `@thatopen/ui`: `^3.2.4`
- `three`: `^0.182.0`

Examples analyzed: 37 local `example.ts` files across `core` and `front`.

## Core mental model

The library is built around a single `Components` container.

- `new OBC.Components()` is the root service locator and lifecycle owner.
- Most tools are singletons resolved via `components.get(SomeComponent)`.
- A `World` binds `scene + camera + renderer`.
- Most BIM-aware tools operate on **Fragments**, not raw IFC.
- Most selection/visibility/highlighting APIs communicate through `ModelIdMap`.

If one sentence has to describe the stack:

1. create `Components`
2. create `World`
3. initialize `FragmentsManager`
4. load fragment models
5. plug tools on top of fragments with `ModelIdMap`

## The recurring bootstrap pattern

This is the dominant pattern across almost every example:

```ts
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";

const components = new OBC.Components();
const worlds = components.get(OBC.Worlds);

const world = worlds.create<
  OBC.SimpleScene,
  OBC.OrthoPerspectiveCamera,
  OBF.PostproductionRenderer
>();

world.scene = new OBC.SimpleScene(components);
world.scene.setup();

const container = document.getElementById("container")!;
world.renderer = new OBF.PostproductionRenderer(components, container);
world.camera = new OBC.OrthoPerspectiveCamera(components);

components.init();
await world.camera.controls.setLookAt(68, 23, -8.5, 21.5, -5.5, 23);
```

Common variants:

- `OBC.SimpleRenderer` for a simpler viewer
- `OBF.PostproductionRenderer` when you need outlines, AO, edge passes, better visuals
- `OBC.SimpleCamera` in basic demos
- `OBC.OrthoPerspectiveCamera` in most BIM-oriented examples

## Fragments are the real runtime format

The examples are explicit about this:

- IFC is not the runtime-native format for interaction.
- The engine works on top of **Fragments**.
- `IfcLoader` exists mainly to convert IFC into Fragments and load them.
- For production, the preferred path is:
  - convert IFC once
  - store `.frag`
  - later load `.frag` directly

Implication:

- if your feature needs visibility, selection, classification, measurements, clipping, viewpoints, 2D views, or postprocessing, think in terms of loaded fragment models.

## Canonical FragmentsManager setup

This setup is repeated everywhere and should be treated as standard:

```ts
const workerUrl = await OBC.FragmentsManager.getWorker();
const fragments = components.get(OBC.FragmentsManager);
fragments.init(workerUrl);

world.camera.controls.addEventListener("update", () => fragments.core.update());

world.onCameraChanged.add((camera) => {
  for (const [, model] of fragments.list) {
    model.useCamera(camera.three);
  }
  fragments.core.update(true);
});

fragments.list.onItemSet.add(({ value: model }) => {
  model.useCamera(world.camera.three);
  world.scene.three.add(model.object);
  fragments.core.update(true);
});

fragments.core.models.materials.list.onItemSet.add(({ value: material }) => {
  if (!("isLodMaterial" in material && material.isLodMaterial)) {
    material.polygonOffset = true;
    material.polygonOffsetUnits = 1;
    material.polygonOffsetFactor = Math.random();
  }
});
```

What each part does:

- `fragments.init(workerUrl)` starts the worker-backed fragment runtime.
- camera `update` events trigger culling/LOD recalculation.
- `fragments.list.onItemSet` is the hook where newly loaded models are attached to the current world.
- `model.useCamera(...)` is required so fragments know which camera drives culling.
- polygon offset is a recurring z-fighting mitigation.

Important rule:

- initialize `FragmentsManager` once per app instance.

## Loading `.frag` models

Canonical recipe:

```ts
const fragPaths = [
  "https://thatopen.github.io/engine_components/resources/frags/school_arq.frag",
  "https://thatopen.github.io/engine_components/resources/frags/school_str.frag",
];

await Promise.all(
  fragPaths.map(async (path) => {
    const modelId = path.split("/").pop()?.split(".").shift();
    if (!modelId) return null;

    const file = await fetch(path);
    const buffer = await file.arrayBuffer();
    return fragments.core.load(buffer, { modelId });
  }),
);
```

Notes:

- examples usually derive `modelId` from the file name
- multiple fragment files are often loaded in parallel with `Promise.all`
- loaded models appear in `fragments.list`
- export back to `.frag` is done via `model.getBuffer(false)`

## Loading IFC with IfcLoader

Canonical sequence from `IfcLoader/example.ts`:

```ts
const ifcLoader = components.get(OBC.IfcLoader);

await ifcLoader.setup({
  autoSetWasm: false,
  wasm: {
    path: "https://unpkg.com/web-ifc@0.0.77/",
    absolute: true,
  },
});

await ifcLoader.load(buffer, false, "example", {
  processData: {
    progressCallback: (progress) => console.log(progress),
  },
});
```

Important observations from examples:

- `IfcLoader` depends on `FragmentsManager` already being configured
- `ifcLoader.load(...)` results in fragment models being created and added through the fragments pipeline
- the examples recommend downloading and reusing the generated `.frag`

Project recommendation:

- for local/offline/controlled deployments, prefer hosting your own `web-ifc` WASM and fragments worker rather than depending on unpkg

## `ModelIdMap` is the main cross-tool currency

Most advanced tools accept or return:

```ts
type ModelIdMap = {
  [modelId: string]: Set<number>;
};
```

Use cases from examples:

- `Highlighter.selection.select`
- `Hider.isolate(modelIdMap)`
- `Hider.set(false, modelIdMap)`
- `Classifier.addGroupItems(...)`
- `ItemsFinder` query results
- `Viewpoint.getSelectionMap()`
- `Outliner.addItems(modelIdMap)`

This is the main interoperability mechanism between tools.

## Key tools and how to use them

### Worlds

Source:

- `engine_components-main/packages/core/src/core/Worlds/example.ts`

What it gives:

- world creation and wiring of scene, camera, renderer

Key API:

- `components.get(OBC.Worlds)`
- `worlds.create<Scene, Camera, Renderer>()`
- `components.init()`
- `world.scene.setup()`

Operational note:

- `Components` should be disposed when your app is destroyed to avoid leaking Three.js resources

### FragmentsManager

Source:

- `engine_components-main/packages/core/src/fragments/FragmentsManager/example.ts`

What it gives:

- worker-backed fragment loading
- model list management
- export to `.frag`
- disposal of fragment models

Key API:

- `OBC.FragmentsManager.getWorker()`
- `fragments.init(workerUrl)`
- `fragments.core.load(buffer, { modelId })`
- `fragments.core.disposeModel(modelId)`
- `model.getBuffer(false)`

### IfcLoader

Source:

- `engine_components-main/packages/core/src/fragments/IfcLoader/example.ts`

What it gives:

- one-shot IFC -> Fragments conversion
- progress callbacks during conversion

Key API:

- `components.get(OBC.IfcLoader)`
- `await ifcLoader.setup(...)`
- `await ifcLoader.load(uint8Array, ...)`
- `ifcLoader.onIfcImporterInitialized.add(...)`

### Raycasters

Source:

- `engine_components-main/packages/core/src/core/Raycasters/example.ts`

What it gives:

- mouse picking foundation for clipping, highlighting, views, measurements

Common setup:

```ts
const casters = components.get(OBC.Raycasters);
const caster = casters.get(world);
const result = await caster.castRay();
```

Many front-side tools assume raycasting is available.

### Highlighter

Source:

- `engine_components-main/packages/front/src/fragments/Highlighter/example.ts`

What it gives:

- click selection
- Ctrl+click multiselect
- custom highlight styles
- selection events

Canonical setup:

```ts
components.get(OBC.Raycasters).get(world);

const highlighter = components.get(OBF.Highlighter);
highlighter.setup({
  world,
  selectMaterialDefinition: {
    color: new THREE.Color("#bcf124"),
    opacity: 1,
    transparent: false,
    renderedFaces: 0,
  },
});
```

Useful API:

- `highlighter.events.select.onHighlight.add(...)`
- `highlighter.events.select.onClear.add(...)`
- `highlighter.styles.set(name, style)`
- `highlighter.highlightByID(name, modelIdMap, false)`
- `highlighter.clear(name, optionalSubset)`
- `highlighter.selection.select`

Behavior note:

- built-in `"select"` style has precedence over custom styles while item is selected

### Hider

Source:

- `engine_components-main/packages/core/src/fragments/Hider/example.ts`

What it gives:

- isolate a subset
- hide a subset
- restore visibility globally

Key API:

- `await hider.isolate(modelIdMap)`
- `await hider.set(false, modelIdMap)`
- `await hider.set(true)`

Very often paired with:

- `ItemsFinder`
- `Classifier`
- `Viewpoints`
- `Highlighter`

### ItemsFinder

Source:

- `engine_components-main/packages/core/src/fragments/ItemsFinder/example.ts`

What it gives:

- reusable named queries over fragment data

Query building blocks:

- `categories`
- `attributes`
- `relation`

Examples:

```ts
finder.create("Walls & Slabs", [{ categories: [/WALL/, /SLAB/] }]);

finder.create("Masonry Walls", [
  {
    categories: [/WALL/],
    attributes: { queries: [{ name: /Name/, value: /Masonry/ }] },
  },
]);

finder.create("First Level Columns", [
  {
    categories: [/COLUMN/],
    relation: { name: "ContainedInStructure", query: entryLevel },
  },
]);
```

Result retrieval:

- via stored query: `finder.list.get(name)?.test()`
- returns `ModelIdMap`

This is one of the most important building blocks for feature composition.

### Classifier

Source:

- `engine_components-main/packages/core/src/fragments/Classifier/example.ts`

What it gives:

- named element groups
- static membership
- dynamic query-backed membership
- built-in grouping by category/storey/models

Key API:

- `classifier.getGroupData(classificationName, groupName)`
- `classifier.addGroupItems(classificationName, groupName, modelIdMap)`
- `classifier.setGroupQuery(classificationName, groupName, { name: queryName })`
- `await classifier.byCategory()`
- `await classifier.byIfcBuildingStorey({ classificationName: "Levels" })`

Design note:

- use `Classifier` when the UI needs persistent navigable groups
- use `ItemsFinder` when the UI needs reusable queries

### Clipper

Source:

- `engine_components-main/packages/core/src/core/Clipper/example.ts`

What it gives:

- interactive clipping planes

Canonical setup:

```ts
components.get(OBC.Raycasters).get(world);
const clipper = components.get(OBC.Clipper);
clipper.enabled = true;

container.ondblclick = () => {
  if (clipper.enabled) clipper.create(world);
};

window.onkeydown = (event) => {
  if (event.code === "Delete" || event.code === "Backspace") {
    if (clipper.enabled) clipper.delete(world);
  }
};
```

Important fragment integration:

```ts
model.getClippingPlanesEvent = () => {
  return Array.from(world.renderer!.three.clippingPlanes) || [];
};
```

This lets fragment processing respect active clipping planes and skip clipped content earlier.

Useful API:

- `clipper.create(world)`
- `clipper.delete(world)`
- `clipper.deleteAll()`
- `clipper.list`
- `clipper.config.enabled`
- `clipper.config.visible`
- `clipper.config.color`
- `clipper.config.opacity`
- `clipper.config.size`

### LengthMeasurement

Source:

- `engine_components-main/packages/front/src/measurement/LengthMeasurement/example.ts`

What it gives:

- persistent distance measurements with snapping

Canonical setup:

```ts
const measurer = components.get(OBF.LengthMeasurement);
measurer.world = world;
measurer.color = new THREE.Color("#494cb6");
measurer.enabled = true;
measurer.snappings = [
  FRAGS.SnappingClass.POINT,
  FRAGS.SnappingClass.LINE,
];

container.ondblclick = () => measurer.create();
```

Useful API:

- `measurer.list`
- `measurer.lines`
- `measurer.delete()`
- `line.value`
- `line.getCenter(...)`
- `dimension.displayRectangularDimensions()`
- `dimension.displayProjectionDimensions()`
- `dimension.invertRectangularDimensions()`

Behavior note:

- the examples treat `enabled` as something to set after initial configuration

### Views

Source:

- `engine_components-main/packages/core/src/core/Views/example.ts`

What it gives:

- floor plans
- elevations
- arbitrary section views

Canonical setup:

```ts
const views = components.get(OBC.Views);
OBC.Views.defaultRange = 100;
views.world = world;

await views.createFromIfcStoreys({ modelIds: [/arq/] });
views.createElevations({ combine: true });
```

Interactive arbitrary section:

```ts
const caster = components.get(OBC.Raycasters).get(world);

window.addEventListener("dblclick", async () => {
  const result = await caster.castRay();
  if (!result?.normal || !result.point) return;

  const invertedNormal = result.normal.clone().negate();
  const view = views.create(
    invertedNormal,
    result.point.addScaledVector(result.normal, 1),
    { id: `View - ${views.list.size + 1}`, world },
  );

  view.range = 10;
  view.helpersVisible = true;
});
```

Important constraint:

- `createFromIfcStoreys` assumes IFC-derived fragment data

### Viewpoints

Source:

- `engine_components-main/packages/core/src/core/Viewpoints/example.ts`

What it gives:

- BCF-style saved camera positions
- snapshot capture
- associated selected components

Canonical setup:

```ts
const viewpoints = components.get(OBC.Viewpoints);
viewpoints.world = world;

const viewpoint = viewpoints.create();
viewpoint.title = "My Viewpoint";
await viewpoint.updateCamera();
```

Useful API:

- `viewpoint.takeSnapshot()`
- `await viewpoint.updateCamera()`
- `await viewpoint.go()`
- `viewpoint.selectionComponents.add(guid1, guid2)`
- `await viewpoint.getSelectionMap()`
- `await fragments.modelIdMapToGuids(modelIdMap)`

Interoperability:

- viewpoints integrate naturally with `BCFTopics`
- element exchange is GUID-based for portability
- internal app operations often convert that selection back to `ModelIdMap`

### PostproductionRenderer

Source:

- `engine_components-main/packages/front/src/core/PostproductionRenderer/example.ts`

What it gives:

- outlines
- AO
- edge detection
- anti-aliasing
- visual presets

Canonical activation:

```ts
world.renderer.postproduction.enabled = true;
world.dynamicAnchor = false;
```

Useful note from example:

- if orthographic/perspective mode switches, postprocessing camera may need update
- in manual renderer mode, set `world.renderer.needsUpdate = true` on camera updates / resize

Interoperability:

- often paired with `Outliner`
- grid material can be excluded/isolated for base pass handling

## `@thatopen/ui` usage pattern

The UI library is consistently used like this:

```ts
import * as BUI from "@thatopen/ui";
BUI.Manager.init();

const panel = BUI.Component.create(() => {
  return BUI.html`
    <bim-panel active label="Example" class="options-menu">
      <bim-panel-section label="Controls">
        <bim-button label="Action"></bim-button>
      </bim-panel-section>
    </bim-panel>
  `;
});

document.body.append(panel);
```

Common controls seen in examples:

- `bim-panel`
- `bim-panel-section`
- `bim-button`
- `bim-checkbox`
- `bim-number-input`
- `bim-color-input`
- `bim-dropdown`
- `bim-table`
- `bim-label`

Typical mobile pattern:

- create a settings button
- toggle `options-menu-visible` on the panel

## Local worker vs CDN worker

Some front examples use:

```ts
import workerUrl from "@thatopen/fragments/worker?url";
```

instead of:

```ts
const workerUrl = await OBC.FragmentsManager.getWorker();
```

Interpretation:

- CDN worker is the simple default
- local worker import is useful when testing against the exact installed fragments build or when avoiding runtime CDN dependency

For this repository, local hosting is likely preferable.

## Strong recurring conventions

These patterns are repeated so often that they should be treated as defaults:

1. Get components through `components.get(...)`, not manual instantiation.
2. Use Fragments-based runtime for almost everything.
3. Wire `world.camera.controls` updates into `fragments.core.update()`.
4. On fragment model load:
   - `model.useCamera(world.camera.three)`
   - `world.scene.three.add(model.object)`
   - `fragments.core.update(true)`
5. Use `ModelIdMap` to move data between tools.
6. Initialize `BUI.Manager` before using `@thatopen/ui`.
7. Use `Raycasters` before tools that depend on scene picking.
8. When examples use `OrthoPerspectiveCamera`, they usually also use BIM interaction tools.

## Practical anti-patterns and pitfalls

### 1. Loading IFC every session

Bad for production.

Better:

- convert once with `IfcLoader`
- persist `.frag`
- load `.frag` from then on

### 2. Using raw fragment internals directly instead of `FragmentsManager`

The examples explicitly warn against using low-level fragment classes directly inside a Components-based app when a wrapper exists.

Better:

- use `components.get(OBC.FragmentsManager)`

### 3. Forgetting camera wiring for loaded models

Without `model.useCamera(...)`, culling and LOD behavior will be wrong.

### 4. Forgetting `fragments.core.update()`

Many behaviors depend on update calls after camera movement or model additions.

### 5. Treating selections as local arrays instead of `ModelIdMap`

That makes composition with Hider, Highlighter, Classifier, Viewpoints, and Outliner harder.

### 6. Forgetting Raycasters for interactive tools

Needed by:

- `Clipper`
- `Highlighter`
- `Views` interactive creation
- measurements

### 7. Leaving worker/CDN/WASM paths implicit in production

The examples use public URLs for convenience.

For an app, define explicitly:

- where `web-ifc` WASM is hosted
- where fragments worker is hosted
- whether those assets are version-locked with the installed packages

### 8. Ignoring resource disposal

The examples mention disposal less than they should for real applications.

In app code, plan teardown for:

- `Components`
- temporary measurements
- views
- clipping planes
- generated helper objects

## A minimal app skeleton for this repo

If I need to bootstrap a new viewer quickly in this repository, this is the shortest sensible shape:

```ts
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import workerUrl from "@thatopen/fragments/worker?url";

const components = new OBC.Components();
const worlds = components.get(OBC.Worlds);

const world = worlds.create<
  OBC.SimpleScene,
  OBC.OrthoPerspectiveCamera,
  OBF.PostproductionRenderer
>();

world.scene = new OBC.SimpleScene(components);
world.scene.setup();
world.renderer = new OBF.PostproductionRenderer(components, container);
world.camera = new OBC.OrthoPerspectiveCamera(components);

components.init();

const fragments = components.get(OBC.FragmentsManager);
fragments.init(workerUrl);

world.camera.controls.addEventListener("update", () => fragments.core.update());

world.onCameraChanged.add((camera) => {
  for (const [, model] of fragments.list) model.useCamera(camera.three);
  fragments.core.update(true);
});

fragments.list.onItemSet.add(({ value: model }) => {
  model.useCamera(world.camera.three);
  world.scene.three.add(model.object);
  fragments.core.update(true);
});

const file = await fetch("/models/model.frag");
const buffer = await file.arrayBuffer();
await fragments.core.load(buffer, { modelId: "model" });

components.get(OBC.Raycasters).get(world);
```

Then add tools on top:

- highlight: `components.get(OBF.Highlighter)`
- hide/isolate: `components.get(OBC.Hider)`
- search/query: `components.get(OBC.ItemsFinder)`
- classify: `components.get(OBC.Classifier)`
- measure: `components.get(OBF.LengthMeasurement)`
- clip: `components.get(OBC.Clipper)`

## Best example files to revisit first

For future work, these are the highest-value local examples:

- `engine_components-main/packages/core/src/core/Worlds/example.ts`
- `engine_components-main/packages/core/src/fragments/FragmentsManager/example.ts`
- `engine_components-main/packages/core/src/fragments/IfcLoader/example.ts`
- `engine_components-main/packages/front/src/fragments/Highlighter/example.ts`
- `engine_components-main/packages/core/src/fragments/Hider/example.ts`
- `engine_components-main/packages/core/src/fragments/ItemsFinder/example.ts`
- `engine_components-main/packages/core/src/fragments/Classifier/example.ts`
- `engine_components-main/packages/core/src/core/Clipper/example.ts`
- `engine_components-main/packages/front/src/measurement/LengthMeasurement/example.ts`
- `engine_components-main/packages/core/src/core/Views/example.ts`
- `engine_components-main/packages/core/src/core/Viewpoints/example.ts`
- `engine_components-main/packages/front/src/core/PostproductionRenderer/example.ts`

## Summary

The library is not a random set of widgets. It has a clear architecture:

- `Components` owns singletons
- `World` owns rendering context
- `FragmentsManager` owns BIM runtime geometry
- `ModelIdMap` is the shared contract between higher-level tools

If the app respects that structure, most features compose cleanly.
