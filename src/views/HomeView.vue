<template>
  <q-layout view="lHh Lpr lFf" class="home-layout">
    <q-page-container>
      <q-page class="upload-page flex flex-center q-pa-md">
        <div class="upload-shell">
          <div class="hero-copy">
            <q-badge rounded class="hero-badge">Open BIM Workspace</q-badge>
            <h1 class="hero-title">IFC Viewer</h1>
            <p class="hero-subtitle">
              Upload an IFC file to prepare the model for preview and further
              processing.
            </p>

            <div class="quick-links">
              <q-btn
                :to="{ name: 'brand-tokens' }"
                label="Brand Tokens Lab"
                no-caps
                outline
                class="quick-btn"
              />
              <q-btn
                :to="{ name: 'quasar-form' }"
                label="Form Creation Demo"
                no-caps
                outline
                class="quick-btn"
              />
              <q-btn
                :to="{ name: 'quasar-components' }"
                label="Core Components Demo"
                no-caps
                outline
                class="quick-btn"
              />
            </div>
          </div>

          <q-card flat class="upload-card">
            <q-card-section class="q-pa-lg q-pa-md-xl">
              <div class="card-title">IFC Upload</div>
              <div class="card-subtitle">
                Local <strong>.ifc</strong> file is supported.
              </div>

              <q-form class="upload-form" @submit.prevent="onSubmit">
                <q-file
                  v-model="ifcFile"
                  accept=".ifc"
                  label="Choose IFC file"
                  outlined
                  clearable
                  use-chips
                  class="file-input"
                >
                  <template #prepend>
                    <q-icon name="upload_file" />
                  </template>
                </q-file>

                <div v-if="ifcFile" class="file-meta">
                  <q-chip square icon="description" class="file-chip">
                    {{ ifcFile.name }}
                  </q-chip>
                  <span class="file-size">{{ formattedFileSize }}</span>
                </div>

                <q-btn
                  type="submit"
                  label="Continue"
                  no-caps
                  unelevated
                  class="submit-button"
                  :disable="!ifcFile"
                />
              </q-form>
            </q-card-section>
          </q-card>
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";

const ifcFile = ref<File | null>(null);

const formattedFileSize = computed(() => {
  if (!ifcFile.value) {
    return "";
  }

  const sizeInMb = ifcFile.value.size / (1024 * 1024);
  return `${sizeInMb.toFixed(2)} MB`;
});

function onSubmit() {
  if (!ifcFile.value) {
    return;
  }

  console.info("IFC file selected", {
    name: ifcFile.value.name,
    size: ifcFile.value.size,
  });
}
</script>

<style scoped>
.home-layout {
  background:
    radial-gradient(circle at top, var(--ds-color-bg-overlay), transparent 34%),
    linear-gradient(
      145deg,
      var(--ds-color-bg-canvas) 0%,
      var(--ds-color-bg-page) 45%,
      var(--ds-color-brand-600) 100%
    );
}

.upload-page {
  min-height: 100vh;
}

.upload-shell {
  width: min(100%, 980px);
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(360px, 420px);
  gap: 32px;
  align-items: center;
}

.hero-copy {
  color: var(--ds-color-text-on-dark);
}

.hero-badge {
  background: var(--ds-color-bg-surface);
  color: var(--ds-color-text-primary);
  padding: 8px 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  margin-bottom: 20px;
}

.hero-title {
  margin: 0 0 16px;
  font-size: clamp(48px, 7vw, 82px);
  line-height: 0.95;
  font-weight: 700;
}

.hero-subtitle {
  margin: 0;
  max-width: 520px;
  font-size: 18px;
  line-height: 1.6;
  color: var(--ds-color-text-on-dark);
  opacity: 0.76;
}

.quick-links {
  margin-top: 32px;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.quick-btn {
  border-radius: 14px;
  color: var(--ds-color-text-on-dark);
}

.upload-card {
  border-radius: 28px;
  background: var(--ds-color-bg-overlay);
  box-shadow: 0 26px 80px
    color-mix(in srgb, var(--ds-color-bg-canvas) 34%, transparent);
  backdrop-filter: blur(20px);
}

.card-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--ds-color-text-primary);
}

.card-subtitle {
  margin-top: 8px;
  color: var(--ds-color-text-secondary);
  line-height: 1.5;
}

.upload-form {
  margin-top: 28px;
  display: grid;
  gap: 18px;
}

.file-input {
  border-radius: 18px;
}

.file-input :deep(.q-field__control),
.file-input :deep(.q-field__marginal) {
  color: var(--ds-color-text-primary);
}

.file-input :deep(.q-field__label),
.file-input :deep(.q-field__native),
.file-input :deep(.q-chip__content),
.file-input :deep(.q-chip__icon) {
  color: var(--ds-color-text-secondary);
}

.file-chip {
  background: var(--ds-color-bg-page);
  color: var(--ds-color-text-on-brand);
}

.file-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.file-size {
  font-size: 14px;
  font-weight: 600;
  color: var(--ds-color-text-secondary);
}

.submit-button {
  min-height: 52px;
  border-radius: 16px;
  font-size: 16px;
  font-weight: 600;
  background: var(--ds-color-bg-page);
  color: var(--ds-color-text-on-brand);
}

.submit-button:disabled {
  background: var(--ds-color-border-strong) !important;
  color: var(--ds-color-text-muted) !important;
}

@media (max-width: 900px) {
  .upload-shell {
    grid-template-columns: 1fr;
  }

  .hero-copy {
    text-align: center;
  }

  .hero-subtitle {
    margin: 0 auto;
  }

  .quick-links {
    justify-content: center;
  }
}

@media (max-width: 600px) {
  .upload-card {
    border-radius: 22px;
  }

  .card-title {
    font-size: 24px;
  }
}
</style>
