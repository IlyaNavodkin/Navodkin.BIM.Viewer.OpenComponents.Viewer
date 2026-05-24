<template>
  <div class="sidebar-panel">
    <div class="sidebar-header">
      <div class="sidebar-title">Свойства</div>
      <q-chip square dense class="type-chip">
        {{ selectedElement?.type ?? "Нет выбора" }}
      </q-chip>
    </div>

    <q-input
      v-model="searchTerm"
      dense
      outlined
      clearable
      placeholder="Поиск по имени, типу и значению"
      class="search-input"
      :disable="!selectedElement"
    >
      <template #prepend>
        <q-icon name="search" />
      </template>
    </q-input>

    <template v-if="canShowProperties">
      <q-card flat bordered class="selection-card">
        <q-card-section class="q-pa-sm">
          <div class="selection-label">{{ selectedElement.label }}</div>
          <div class="selection-meta">
            {{ selectedElement.type }} · {{ filteredPropertyCount }} свойств в выдаче
          </div>
        </q-card-section>
      </q-card>

      <div v-if="filteredSets.length" class="properties-scroll">
        <q-card
          v-for="propertySet in filteredSets"
          :key="propertySet.id"
          flat
          bordered
          class="set-card"
        >
          <q-card-section class="set-header">
            {{ propertySet.name }}
          </q-card-section>

          <q-markup-table flat dense class="properties-table">
            <thead>
              <tr>
                <th class="property-name">Имя</th>
                <th class="property-type">Тип</th>
                <th class="property-value">Значение</th>
              </tr>
            </thead>

            <tbody>
              <tr v-for="property in propertySet.properties" :key="property.id">
                <td class="property-name">{{ property.name }}</td>
                <td class="property-type">{{ property.dataType }}</td>
                <td class="property-value">{{ property.value }}</td>
              </tr>
            </tbody>
          </q-markup-table>
        </q-card>
      </div>

      <q-banner v-else rounded class="empty-banner">
        По текущему фильтру свойства не найдены.
      </q-banner>
    </template>

    <q-banner v-else-if="hasMultipleSelection" rounded class="empty-banner">
      Выбрано несколько элементов. Чтобы увидеть свойства, выберите один элемент.
    </q-banner>

    <q-banner v-else rounded class="empty-banner">
      Выберите элемент в дереве или в mock viewport, чтобы увидеть property sets.
    </q-banner>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useMockupWorkspace } from "../../composables/mockups/useMockupWorkspace";

const searchTerm = ref("");
const { highlightedElementIds, selectedElement } = useMockupWorkspace();
const hasMultipleSelection = computed(() => highlightedElementIds.value.length > 1);
const canShowProperties = computed(
  () => Boolean(selectedElement.value) && !hasMultipleSelection.value
);

const filteredSets = computed(() => {
  if (!canShowProperties.value || !selectedElement.value) {
    return [];
  }

  const normalized = searchTerm.value.trim().toLowerCase();
  if (!normalized) {
    return selectedElement.value.propertySets;
  }

  return selectedElement.value.propertySets
    .map((propertySet) => ({
      ...propertySet,
      properties: propertySet.properties.filter((property) => {
        const haystack =
          `${property.name} ${property.dataType} ${property.value}`.toLowerCase();
        return haystack.includes(normalized);
      }),
    }))
    .filter((propertySet) => propertySet.properties.length > 0);
});

const filteredPropertyCount = computed(() =>
  filteredSets.value.reduce(
    (total, propertySet) => total + propertySet.properties.length,
    0
  )
);
</script>

<style scoped>
.sidebar-panel {
  height: 100%;
  display: grid;
  grid-template-rows: auto auto auto minmax(0, 1fr);
  gap: 12px;
  padding: 12px;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
}

.sidebar-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--ds-color-text-primary);
}

.type-chip {
  background: var(--ds-color-bg-surface-muted);
  color: var(--ds-color-text-secondary);
}

.search-input :deep(.q-field__control) {
  border-radius: 12px;
}

.search-input :deep(.q-field__native),
.search-input :deep(.q-field__prepend) {
  font-size: 12px;
}

.selection-card {
  border-radius: 14px;
  border-color: var(--ds-color-border-default);
}

.selection-label {
  font-size: 13px;
  font-weight: 700;
  color: var(--ds-color-text-primary);
}

.selection-meta {
  margin-top: 4px;
  font-size: 11px;
  color: var(--ds-color-text-secondary);
}

.properties-scroll {
  overflow: auto;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  align-content: flex-start;
  gap: 10px;
  padding-right: 4px;
}

.set-card {
  flex: 0 0 auto;
  align-self: stretch;
  border-radius: 14px;
  border-color: var(--ds-color-border-default);
  overflow: hidden;
}

.set-header {
  padding: 10px 12px 6px;
  font-size: 12px;
  font-weight: 700;
  color: var(--ds-color-text-primary);
}

.properties-table {
  font-size: 11px;
}

.properties-table thead th {
  padding: 6px 12px;
  font-size: 10px;
  font-weight: 700;
  color: var(--ds-color-text-secondary);
  text-align: left;
  background: color-mix(
    in srgb,
    var(--ds-color-bg-surface-muted) 78%,
    transparent
  );
  position: sticky;
  top: 0;
  z-index: 1;
}

.properties-table td {
  padding: 6px 12px;
  vertical-align: top;
}

.property-name {
  width: 34%;
  color: var(--ds-color-text-secondary);
}

.property-type {
  width: 22%;
  color: var(--ds-color-text-secondary);
}

.property-value {
  color: var(--ds-color-text-primary);
  word-break: break-word;
}

.empty-banner {
  background: var(--ds-color-bg-surface-muted);
  color: var(--ds-color-text-primary);
}
</style>
