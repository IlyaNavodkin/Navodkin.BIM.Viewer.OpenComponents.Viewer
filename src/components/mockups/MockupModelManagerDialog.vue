<template>
  <q-dialog v-model="dialogModel" persistent>
    <q-card class="manager-card">
      <q-card-section class="row items-start justify-between q-col-gutter-md">
        <div>
          <div class="text-h6 text-weight-bold">Диспетчер моделей</div>
          <div class="section-subtitle">
            Управление загруженными IFC-моделями в mock workspace.
          </div>
        </div>

        <q-btn
          icon="close"
          flat
          round
          dense
          @click="dialogModel = false"
        />
      </q-card-section>

      <q-separator />

      <q-card-section class="upload-section">
        <q-file
          v-model="selectedFiles"
          accept=".ifc"
          multiple
          outlined
          use-chips
          clearable
          dense
          label="Выберите IFC-файлы"
          class="upload-field"
        >
          <template #prepend>
            <q-icon name="upload_file" />
          </template>
        </q-file>

        <q-btn
          label="Загрузить в пространство"
          no-caps
          unelevated
          class="upload-button"
          :disable="!selectedFiles?.length || isUploading"
          @click="handleUpload"
        />
      </q-card-section>

      <q-card-section v-if="isUploading" class="q-pt-none">
        <div class="progress-caption">
          Псевдозагрузка: {{ uploadQueue.join(", ") }}
        </div>
        <q-linear-progress indeterminate rounded class="progress-bar" />
      </q-card-section>

      <q-separator />

      <q-card-section class="models-section">
        <div class="section-label">Загруженные модели</div>

        <q-list v-if="models.length" separator>
          <q-item v-for="model in models" :key="model.id" class="model-item">
            <q-item-section avatar top>
              <q-avatar
                rounded
                size="36px"
                :class="model.status === 'ready' ? 'avatar-ready' : 'avatar-processing'"
              >
                <q-icon
                  :name="model.status === 'ready' ? 'deployed_code' : 'sync'"
                />
              </q-avatar>
            </q-item-section>

            <q-item-section>
              <q-item-label class="text-weight-medium">
                {{ model.name }}
              </q-item-label>
              <q-item-label caption>
                {{ model.discipline }} · {{ formatDate(model.uploadedAt) }}
              </q-item-label>
            </q-item-section>

            <q-item-section side top>
              <q-chip
                square
                dense
                :class="model.status === 'ready' ? 'chip-ready' : 'chip-processing'"
              >
                {{ model.status === "ready" ? "Готова" : "Обработка" }}
              </q-chip>
              <q-btn
                icon="delete"
                flat
                round
                dense
                color="negative"
                :disable="model.status === 'processing'"
                @click="removeModel(model.id)"
              />
            </q-item-section>
          </q-item>
        </q-list>

        <q-banner v-else rounded class="empty-banner">
          Пока нет моделей. Загрузите IFC-файл, чтобы наполнить пространство.
        </q-banner>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useMockupWorkspace } from "../../composables/mockups/useMockupWorkspace";

const modelValue = defineModel<boolean>({ required: true });

const selectedFiles = ref<File[] | null>(null);
const { isUploading, models, removeModel, uploadIfcFiles, uploadQueue } =
  useMockupWorkspace();

const dialogModel = computed({
  get: () => modelValue.value,
  set: (value: boolean) => {
    modelValue.value = value;
  },
});

async function handleUpload() {
  if (!selectedFiles.value?.length) {
    return;
  }

  await uploadIfcFiles(selectedFiles.value);
  selectedFiles.value = null;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
</script>

<style scoped>
.manager-card {
  width: min(92vw, 760px);
  border-radius: 24px;
  background: var(--ds-color-bg-surface);
}

.section-subtitle {
  margin-top: 6px;
  color: var(--ds-color-text-secondary);
}

.upload-section {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: end;
}

.upload-field :deep(.q-field__control) {
  border-radius: 14px;
}

.upload-button {
  min-height: 40px;
  border-radius: 14px;
  background: var(--ds-color-brand-500);
  color: var(--ds-color-text-on-brand);
}

.progress-caption {
  font-size: 12px;
  color: var(--ds-color-text-secondary);
  margin-bottom: 8px;
}

.progress-bar :deep(.q-linear-progress__model) {
  background: var(--ds-color-accent-500);
}

.progress-bar :deep(.q-linear-progress__track) {
  background: var(--ds-color-bg-surface-muted);
}

.models-section {
  display: grid;
  gap: 12px;
}

.section-label {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ds-color-text-secondary);
}

.model-item {
  padding-inline: 0;
}

.avatar-ready {
  background: color-mix(in srgb, var(--ds-color-accent-500) 18%, white);
  color: var(--ds-color-accent-500);
}

.avatar-processing {
  background: color-mix(in srgb, var(--ds-color-brand-500) 14%, white);
  color: var(--ds-color-brand-500);
}

.chip-ready {
  background: color-mix(in srgb, var(--ds-color-accent-500) 18%, white);
  color: var(--ds-color-accent-500);
}

.chip-processing {
  background: color-mix(in srgb, var(--ds-color-brand-500) 14%, white);
  color: var(--ds-color-brand-500);
}

.empty-banner {
  background: var(--ds-color-bg-surface-muted);
  color: var(--ds-color-text-primary);
}

@media (max-width: 640px) {
  .upload-section {
    grid-template-columns: 1fr;
  }
}
</style>
