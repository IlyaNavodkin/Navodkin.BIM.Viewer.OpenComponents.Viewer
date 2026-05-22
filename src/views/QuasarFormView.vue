<template>
  <q-layout view="lHh Lpr lFf" class="page-layout">
    <q-page-container>
      <q-page class="q-pa-md q-pa-lg-xl">
        <div class="page-shell">
          <div class="topbar">
            <q-btn
              :to="{ name: 'home' }"
              icon="arrow_back"
              label="Back to Home"
              no-caps
              flat
              class="topbar-link"
            />
            <q-badge rounded class="topbar-badge">Quasar Form Demo</q-badge>
          </div>

          <q-card flat class="form-card">
            <q-card-section>
              <div class="text-h5 text-weight-bold">Create Model Profile</div>
              <div class="form-subtitle q-mt-xs">
                Example page with form controls from Quasar.
              </div>
            </q-card-section>

            <q-separator />

            <q-card-section>
              <q-form class="form-grid" @submit.prevent="submitForm">
                <q-input
                  v-model="form.modelName"
                  label="Model name"
                  outlined
                  dense
                  :rules="[(v) => !!v || 'Required']"
                />

                <q-select
                  v-model="form.discipline"
                  :options="disciplines"
                  label="Discipline"
                  outlined
                  dense
                />

                <q-input
                  v-model.number="form.floorCount"
                  type="number"
                  min="1"
                  label="Floor count"
                  outlined
                  dense
                />

                <q-input
                  v-model="form.description"
                  label="Description"
                  type="textarea"
                  autogrow
                  outlined
                />

                <q-toggle v-model="form.isPublic" label="Public visibility" />

                <q-checkbox
                  v-model="form.sendNotification"
                  label="Send notification to team"
                />

                <div class="actions">
                  <q-btn
                    type="submit"
                    label="Create"
                    no-caps
                    unelevated
                    class="action-primary"
                  />
                  <q-btn
                    label="Reset"
                    no-caps
                    flat
                    class="action-secondary"
                    @click="resetForm"
                  />
                </div>
              </q-form>
            </q-card-section>
          </q-card>

          <q-banner v-if="isSubmitted" rounded class="result-banner">
            <template #avatar>
              <q-icon name="check_circle" class="result-icon" />
            </template>
            Model profile created for "<strong>{{ form.modelName }}</strong
            >".
          </q-banner>
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue";

type FormState = {
  modelName: string;
  discipline: string | null;
  floorCount: number;
  description: string;
  isPublic: boolean;
  sendNotification: boolean;
};

const disciplines = ["Architecture", "Structure", "MEP", "Infrastructure"];

const defaultState: FormState = {
  modelName: "",
  discipline: null,
  floorCount: 1,
  description: "",
  isPublic: true,
  sendNotification: false,
};

const form = reactive<FormState>({ ...defaultState });
const isSubmitted = ref(false);

function submitForm() {
  isSubmitted.value = true;
}

function resetForm() {
  Object.assign(form, defaultState);
  isSubmitted.value = false;
}
</script>

<style scoped>
.page-layout {
  background:
    radial-gradient(
      circle at 80% 0,
      var(--ds-color-bg-overlay),
      transparent 30%
    ),
    linear-gradient(
      135deg,
      var(--ds-color-bg-page) 0%,
      var(--ds-color-brand-600) 100%
    );
}

.page-shell {
  width: min(100%, 860px);
  margin: 0 auto;
  display: grid;
  gap: 18px;
}

.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.topbar-link {
  color: var(--ds-color-text-on-dark);
}

.topbar-badge {
  background: var(--ds-color-bg-surface);
  color: var(--ds-color-text-primary);
}

.form-card {
  border-radius: 18px;
  background: var(--ds-color-bg-surface);
}

.form-subtitle {
  color: var(--ds-color-text-secondary);
}

.form-grid {
  display: grid;
  gap: 14px;
}

.form-grid :deep(.q-field__label),
.form-grid :deep(.q-placeholder),
.form-grid :deep(.q-field__native),
.form-grid :deep(.q-field__input),
.form-grid :deep(.q-checkbox__label),
.form-grid :deep(.q-toggle__label) {
  color: var(--ds-color-text-secondary);
}

.form-grid :deep(.q-toggle__inner--truthy),
.form-grid :deep(.q-checkbox__inner--truthy) {
  color: var(--ds-color-accent-500);
}

.actions {
  display: flex;
  gap: 10px;
  margin-top: 6px;
}

.action-primary {
  background: var(--ds-color-brand-500);
  color: var(--ds-color-text-on-brand);
}

.action-secondary {
  color: var(--ds-color-text-secondary);
}

.result-banner {
  background: var(--ds-color-bg-surface-muted);
  color: var(--ds-color-text-primary);
}

.result-icon {
  color: var(--ds-color-accent-500);
}

@media (max-width: 640px) {
  .topbar {
    flex-wrap: wrap;
  }
}
</style>
