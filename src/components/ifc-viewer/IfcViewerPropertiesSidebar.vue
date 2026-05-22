<template>
  <aside :class="$style.sidebar">
    <template v-if="selectedElement">
      <div :class="$style.header">
        <div :class="$style.eyebrow">Selected Element</div>
        <h2 :class="$style.title">{{ selectedElement.displayName }}</h2>
        <div :class="$style.meta">
          <span>Model: {{ selectedElement.modelId }}</span>
          <span>Local ID: {{ selectedElement.localId }}</span>
        </div>
      </div>

      <div :class="$style.body">
        <section
          v-for="group in selectedElement.properties"
          :key="group.name"
          :class="$style.group"
        >
          <h3 :class="$style.groupTitle">{{ group.name }}</h3>
          <dl :class="$style.propertyList">
            <template v-for="entry in group.entries" :key="`${group.name}:${entry.name}`">
              <dt :class="$style.propertyName">{{ entry.name }}</dt>
              <dd :class="$style.propertyValue">{{ entry.value }}</dd>
            </template>
          </dl>
        </section>
      </div>
    </template>

    <div :class="$style.emptyState" v-else>
      <div :class="$style.emptyTitle">No element selected</div>
      <div :class="$style.emptyText">
        Select an IFC element in the tree or directly in the viewer to inspect
        grouped properties.
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import type { IfcViewerSelectedElement } from "../../types/ifcViewer";

export interface IIfcViewerPropertiesSidebarProps {
  selectedElement: IfcViewerSelectedElement | null;
}

defineProps<IIfcViewerPropertiesSidebarProps>();
</script>

<style module>
.sidebar {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  height: 100%;
  overflow: hidden;
  border-left: 1px solid var(--ds-color-border-default);
  background: color-mix(in srgb, var(--ds-color-bg-surface) 92%, transparent);
}

.header {
  padding: 20px;
  border-bottom: 1px solid var(--ds-color-border-default);
}

.eyebrow {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ds-color-text-muted);
}

.title {
  margin: 8px 0 0;
  font-size: 20px;
  line-height: 1.2;
  color: var(--ds-color-text-primary);
  word-break: break-word;
}

.meta {
  display: grid;
  gap: 4px;
  margin-top: 12px;
  color: var(--ds-color-text-secondary);
  font-size: 12px;
}

.body {
  flex: 1;
  overflow: auto;
  padding: 16px;
  display: grid;
  gap: 12px;
}

.group {
  padding: 14px;
  border-radius: 14px;
  border: 1px solid var(--ds-color-border-default);
  background: var(--ds-color-bg-surface);
}

.groupTitle {
  margin: 0 0 12px;
  font-size: 14px;
  color: var(--ds-color-text-primary);
}

.propertyList {
  display: grid;
  grid-template-columns: minmax(0, 120px) minmax(0, 1fr);
  gap: 8px 12px;
  margin: 0;
}

.propertyName {
  color: var(--ds-color-text-muted);
  font-size: 12px;
}

.propertyValue {
  margin: 0;
  color: var(--ds-color-text-primary);
  font-size: 13px;
  line-height: 1.45;
  word-break: break-word;
}

.emptyState {
  margin: auto 20px;
  padding: 24px;
  border-radius: 20px;
  background: var(--ds-color-bg-surface);
  border: 1px dashed var(--ds-color-border-strong);
}

.emptyTitle {
  color: var(--ds-color-text-primary);
  font-weight: 700;
}

.emptyText {
  margin-top: 8px;
  color: var(--ds-color-text-secondary);
  line-height: 1.5;
}
</style>
