<template>
  <aside :class="$style.sidebar">
    <div :class="$style.header">
      <div>
        <div :class="$style.title">Properties</div>
        <div :class="$style.subtitle">
          Inspect grouped IFC metadata for the active selection.
        </div>
      </div>
      <div :class="$style.typeChip">
        {{
          hasMultipleSelection
            ? `${highlightedNodeCount} selected`
            : selectedElement
              ? `${selectedElement.properties.length} sets`
              : "No selection"
        }}
      </div>
    </div>

    <label :class="$style.searchField">
      <q-icon name="search" size="14px" :class="$style.searchIcon" />
      <input
        v-model="searchTerm"
        :class="$style.searchInput"
        type="search"
        placeholder="Search property, group, or value"
        :disabled="!canShowProperties"
      />
    </label>

    <template v-if="canShowProperties && selectedElement">
      <div :class="$style.selectionCard">
        <div :class="$style.selectionLabel">{{ selectedElement.displayName }}</div>
        <div :class="$style.selectionMeta">
          <span>Model: {{ selectedElement.modelId }}</span>
          <span>Local ID: {{ selectedElement.localId }}</span>
          <span>{{ filteredEntryCount }} entries</span>
        </div>
      </div>

      <div v-if="filteredGroups.length" :class="$style.body">
        <section
          v-for="group in filteredGroups"
          :key="group.name"
          :class="$style.group"
        >
          <div :class="$style.groupHeader">
            <h3 :class="$style.groupTitle">{{ group.name }}</h3>
            <span :class="$style.groupCount">{{ group.entries.length }}</span>
          </div>

          <dl :class="$style.propertyList">
            <template v-for="entry in group.entries" :key="`${group.name}:${entry.name}`">
              <dt :class="$style.propertyName">{{ entry.name }}</dt>
              <dd :class="$style.propertyValue">{{ entry.value }}</dd>
            </template>
          </dl>
        </section>
      </div>

      <div v-else :class="$style.emptyState">
        <div :class="$style.emptyTitle">No properties matched the filter</div>
        <div :class="$style.emptyText">
          Clear or broaden the current search to inspect more IFC metadata.
        </div>
      </div>
    </template>

    <div v-else-if="hasMultipleSelection" :class="$style.emptyState">
      <div :class="$style.emptyTitle">Multiple items selected</div>
      <div :class="$style.emptyText">
        Keep a single tree item active to inspect one IFC property set at a time.
      </div>
    </div>

    <div v-else :class="$style.emptyState">
      <div :class="$style.emptyTitle">No element selected</div>
      <div :class="$style.emptyText">
        Select an IFC element in the tree or directly in the viewer to inspect grouped properties.
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import type { IfcViewerPropertyGroup, IfcViewerSelectedElement } from "../../types/ifcViewer";

export interface IIfcViewerPropertiesSidebarProps {
  selectedElement: IfcViewerSelectedElement | null;
  highlightedNodeCount: number;
}

const props = defineProps<IIfcViewerPropertiesSidebarProps>();
const searchTerm = ref("");
const hasMultipleSelection = computed(() => props.highlightedNodeCount > 1);
const canShowProperties = computed(
  () => Boolean(props.selectedElement) && !hasMultipleSelection.value,
);

const filteredGroups = computed<IfcViewerPropertyGroup[]>(() => {
  if (!canShowProperties.value || !props.selectedElement) {
    return [];
  }

  const normalized = searchTerm.value.trim().toLowerCase();
  if (!normalized) {
    return props.selectedElement.properties;
  }

  return props.selectedElement.properties
    .map((group) => {
      const groupMatches = group.name.toLowerCase().includes(normalized);
      const entries = group.entries.filter((entry) =>
        `${entry.name} ${entry.value}`.toLowerCase().includes(normalized)
      );

      if (!groupMatches && !entries.length) {
        return null;
      }

      return {
        ...group,
        entries: entries.length ? entries : group.entries,
      };
    })
    .filter((group): group is IfcViewerPropertyGroup => Boolean(group));
});

const filteredEntryCount = computed(() =>
  filteredGroups.value.reduce((total, group) => total + group.entries.length, 0)
);
</script>

<style module>
.sidebar {
  height: 100%;
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-rows: auto auto auto minmax(0, 1fr);
  gap: 12px;
  padding: 12px;
  color: var(--ds-color-text-primary);
}

.header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: start;
}

.title {
  font-size: 15px;
  font-weight: 700;
}

.subtitle {
  margin-top: 4px;
  font-size: 12px;
  color: var(--ds-color-text-secondary);
}

.typeChip {
  flex: 0 0 auto;
  padding: 8px 10px;
  border-radius: 12px;
  background: rgba(238, 243, 249, 0.9);
  color: var(--ds-color-text-secondary);
  font-size: 12px;
  font-weight: 700;
}

.searchField {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 12px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.66);
  border: 1px solid rgba(216, 224, 234, 0.88);
}

.searchIcon {
  color: var(--ds-color-text-muted);
}

.searchInput {
  width: 100%;
  min-width: 0;
  border: 0;
  padding: 0;
  background: transparent;
  color: var(--ds-color-text-primary);
  font: inherit;
  outline: none;
}

.searchInput:disabled {
  cursor: not-allowed;
}

.selectionCard {
  padding: 14px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(216, 224, 234, 0.88);
}

.selectionLabel {
  font-size: 14px;
  font-weight: 700;
  color: var(--ds-color-text-primary);
  word-break: break-word;
}

.selectionMeta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
  margin-top: 8px;
  color: var(--ds-color-text-secondary);
  font-size: 11px;
}

.body {
  min-height: 0;
  overflow: auto;
  display: grid;
  gap: 10px;
  padding-right: 4px;
}

.group {
  padding: 14px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.74);
  border: 1px solid rgba(216, 224, 234, 0.88);
}

.groupHeader {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
}

.groupTitle {
  margin: 0;
  font-size: 13px;
  color: var(--ds-color-text-primary);
}

.groupCount {
  flex: 0 0 auto;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(238, 243, 249, 0.9);
  color: var(--ds-color-text-secondary);
  font-size: 11px;
  font-weight: 700;
}

.propertyList {
  display: grid;
  grid-template-columns: minmax(0, 112px) minmax(0, 1fr);
  gap: 8px 12px;
  margin: 12px 0 0;
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
  margin: auto 0;
  padding: 24px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.66);
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
