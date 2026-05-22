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
            <q-badge rounded class="topbar-badge">
              Quasar Components Demo
            </q-badge>
          </div>

          <q-card flat class="showcase-card">
            <q-card-section>
              <div class="text-h5 text-weight-bold">Core Components</div>
              <div class="showcase-subtitle q-mt-xs">
                Buttons, chips, tabs, progress and list patterns.
              </div>
            </q-card-section>

            <q-separator />

            <q-card-section class="grid">
              <q-card flat bordered class="block">
                <q-card-section>
                  <div class="text-subtitle1 text-weight-bold q-mb-sm">
                    Buttons
                  </div>
                  <div class="row q-gutter-sm">
                    <q-btn
                      label="Primary"
                      no-caps
                      unelevated
                      class="btn-brand"
                    />
                    <q-btn
                      icon="check"
                      label="Success"
                      no-caps
                      unelevated
                      class="btn-accent"
                    />
                    <q-btn
                      outline
                      label="Outline"
                      no-caps
                      class="btn-outline"
                    />
                  </div>
                </q-card-section>
              </q-card>

              <q-card flat bordered class="block">
                <q-card-section>
                  <div class="text-subtitle1 text-weight-bold q-mb-sm">
                    Status chips
                  </div>
                  <div class="row q-gutter-sm">
                    <q-chip class="chip-ready">Ready</q-chip>
                    <q-chip class="chip-pending">Pending</q-chip>
                    <q-chip class="chip-blocked">Blocked</q-chip>
                  </div>
                </q-card-section>
              </q-card>

              <q-card flat bordered class="block">
                <q-card-section>
                  <div class="text-subtitle1 text-weight-bold q-mb-sm">
                    Progress
                  </div>
                  <q-linear-progress
                    size="18px"
                    :value="0.72"
                    rounded
                    class="progress-brand"
                  />
                  <div class="progress-caption q-mt-sm">
                    Model preprocessing: 72%
                  </div>
                </q-card-section>
              </q-card>
            </q-card-section>

            <q-separator />

            <q-tabs v-model="tab" align="left" class="tabs-brand">
              <q-tab name="materials" label="Materials" />
              <q-tab name="floors" label="Floors" />
              <q-tab name="issues" label="Issues" />
            </q-tabs>

            <q-tab-panels v-model="tab" animated>
              <q-tab-panel name="materials">
                <q-list separator>
                  <q-item>
                    <q-item-section avatar>
                      <q-icon name="category" class="item-icon" />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label>Concrete C30/37</q-item-label>
                      <q-item-label caption>Load-bearing elements</q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item>
                    <q-item-section avatar>
                      <q-icon name="category" class="item-icon" />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label>Steel S355</q-item-label>
                      <q-item-label caption>Columns and trusses</q-item-label>
                    </q-item-section>
                  </q-item>
                </q-list>
              </q-tab-panel>

              <q-tab-panel name="floors">
                <q-list bordered separator>
                  <q-item v-for="floor in floors" :key="floor.id">
                    <q-item-section>{{ floor.name }}</q-item-section>
                    <q-item-section side>
                      <q-badge class="floor-badge">{{ floor.area }}</q-badge>
                    </q-item-section>
                  </q-item>
                </q-list>
              </q-tab-panel>

              <q-tab-panel name="issues">
                <q-banner rounded class="issues-banner">
                  3 coordination issues require review this week.
                </q-banner>
              </q-tab-panel>
            </q-tab-panels>
          </q-card>
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref } from "vue";

type FloorInfo = {
  id: number;
  name: string;
  area: string;
};

const tab = ref("materials");
const floors: FloorInfo[] = [
  { id: 1, name: "Level 01", area: "1,240 m2" },
  { id: 2, name: "Level 02", area: "1,180 m2" },
  { id: 3, name: "Roof", area: "540 m2" },
];
</script>

<style scoped>
.page-layout {
  background:
    radial-gradient(
      circle at 20% 0,
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
  width: min(100%, 980px);
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

.showcase-card {
  border-radius: 18px;
  background: var(--ds-color-bg-surface);
}

.showcase-subtitle {
  color: var(--ds-color-text-secondary);
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.block {
  border-radius: 14px;
  border-color: var(--ds-color-border-default);
}

.btn-brand {
  background: var(--ds-color-brand-500);
  color: var(--ds-color-text-on-brand);
}

.btn-accent {
  background: var(--ds-color-accent-500);
  color: var(--ds-color-text-on-brand);
}

.btn-outline {
  color: var(--ds-color-text-primary);
}

.chip-ready {
  background: var(--ds-color-accent-500);
  color: var(--ds-color-text-on-brand);
}

.chip-pending {
  background: var(--ds-color-bg-surface-muted);
  color: var(--ds-color-text-secondary);
}

.chip-blocked {
  background: var(--ds-color-brand-600);
  color: var(--ds-color-text-on-brand);
}

.progress-brand :deep(.q-linear-progress__track) {
  background: var(--ds-color-bg-surface-muted);
}

.progress-brand :deep(.q-linear-progress__model) {
  background: var(--ds-color-accent-500);
}

.progress-caption {
  color: var(--ds-color-text-secondary);
}

.tabs-brand {
  color: var(--ds-color-text-secondary);
}

.tabs-brand :deep(.q-tab--active) {
  color: var(--ds-color-brand-500);
}

.tabs-brand :deep(.q-tabs__content .q-tab__indicator) {
  background: var(--ds-color-brand-500);
}

.item-icon {
  color: var(--ds-color-accent-500);
}

.floor-badge {
  background: var(--ds-color-bg-page);
  color: var(--ds-color-text-on-brand);
}

.issues-banner {
  background: var(--ds-color-bg-surface-muted);
  color: var(--ds-color-text-primary);
}

@media (max-width: 900px) {
  .grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .topbar {
    flex-wrap: wrap;
  }
}
</style>
