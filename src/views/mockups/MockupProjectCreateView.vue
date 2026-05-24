<template>
  <q-layout view="lHh Lpr lFf" class="page-layout">
    <q-page-container>
      <q-page class="create-page q-pa-md q-pa-lg-xl">
        <div class="create-shell">
          <div class="hero-column">
            <q-badge rounded class="hero-badge">Quasar Mockup Flow</q-badge>
            <h1 class="hero-title">Создание BIM-проекта</h1>
            <p class="hero-copy">
              Макет покрывает проектный onboarding, mock workspace, дерево
              элементов, диспетчер моделей и компактную панель свойств на
              мокнутых данных.
            </p>

            <div class="hero-points">
              <q-chip square class="hero-chip">Create project</q-chip>
              <q-chip square class="hero-chip">Model manager dialog</q-chip>
              <q-chip square class="hero-chip">Compact IFC tree</q-chip>
              <q-chip square class="hero-chip">Property sets</q-chip>
            </div>

            <q-btn
              v-if="currentProject"
              :to="{ name: 'mockup-workspace' }"
              label="Вернуться в workspace"
              no-caps
              outline
              class="secondary-button"
            />
          </div>

          <q-card flat class="form-card">
            <q-card-section class="q-pa-lg">
              <div class="card-title">Новый проект</div>
              <div class="card-subtitle">
                Имя обязательно. После создания откроется mock 3D workspace.
              </div>

              <q-form class="project-form" @submit.prevent="submitProject">
                <q-input
                  v-model="form.name"
                  outlined
                  label="Имя проекта"
                  maxlength="80"
                  lazy-rules
                  :rules="[(value) => Boolean(value?.trim()) || 'Укажите имя проекта']"
                />

                <q-input
                  v-model="form.description"
                  type="textarea"
                  outlined
                  autogrow
                  label="Описание проекта"
                  maxlength="240"
                />

                <div class="actions-row">
                  <q-btn
                    type="button"
                    flat
                    no-caps
                    label="Очистить"
                    class="ghost-button"
                    @click="resetForm"
                  />
                  <q-btn
                    type="submit"
                    no-caps
                    unelevated
                    label="Создать проект"
                    class="primary-button"
                  />
                </div>
              </q-form>
            </q-card-section>
          </q-card>
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { reactive } from "vue";
import { useRouter } from "vue-router";
import { useMockupWorkspace } from "../../composables/mockups/useMockupWorkspace";

const router = useRouter();
const { createProject, currentProject } = useMockupWorkspace();

const form = reactive({
  description:
    "Координация IFC-моделей, навигация по дереву элементов и просмотр свойств.",
  name: "Башня А · Концепт",
});

function submitProject() {
  if (!form.name.trim()) {
    return;
  }

  createProject({
    description: form.description,
    name: form.name,
  });

  router.push({ name: "mockup-workspace" });
}

function resetForm() {
  form.name = "";
  form.description = "";
}
</script>

<style scoped>
.page-layout {
  background:
    radial-gradient(circle at top, var(--ds-color-bg-overlay), transparent 26%),
    linear-gradient(
      145deg,
      var(--ds-color-bg-canvas) 0%,
      var(--ds-color-bg-page) 42%,
      var(--ds-color-brand-600) 100%
    );
}

.create-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
}

.create-shell {
  width: min(100%, 1120px);
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(360px, 460px);
  gap: 36px;
  align-items: center;
}

.hero-column {
  color: var(--ds-color-text-on-dark);
}

.hero-badge {
  background: rgba(248, 251, 255, 0.16);
  color: var(--ds-color-text-on-dark);
  padding: 8px 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  margin-bottom: 20px;
}

.hero-title {
  margin: 0;
  font-size: clamp(42px, 6vw, 72px);
  line-height: 0.96;
  font-weight: 700;
}

.hero-copy {
  margin: 18px 0 0;
  max-width: 620px;
  font-size: 18px;
  line-height: 1.7;
  color: rgba(247, 247, 242, 0.76);
}

.hero-points {
  margin-top: 28px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.hero-chip {
  background: rgba(248, 251, 255, 0.16);
  color: var(--ds-color-text-on-dark);
}

.secondary-button {
  margin-top: 24px;
  border-radius: 14px;
  color: var(--ds-color-text-on-dark);
}

.form-card {
  border-radius: 28px;
  background: var(--ds-color-bg-overlay);
  box-shadow: 0 24px 80px rgba(9, 19, 37, 0.28);
  backdrop-filter: blur(18px);
}

.card-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--ds-color-text-primary);
}

.card-subtitle {
  margin-top: 8px;
  line-height: 1.5;
  color: var(--ds-color-text-secondary);
}

.project-form {
  margin-top: 26px;
  display: grid;
  gap: 18px;
}

.project-form :deep(.q-field__control) {
  border-radius: 16px;
}

.actions-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.ghost-button,
.primary-button {
  min-height: 48px;
  border-radius: 16px;
}

.ghost-button {
  color: var(--ds-color-text-secondary);
}

.primary-button {
  background: var(--ds-color-brand-500);
  color: var(--ds-color-text-on-brand);
}

@media (max-width: 960px) {
  .create-shell {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .actions-row {
    flex-direction: column-reverse;
  }
}
</style>
