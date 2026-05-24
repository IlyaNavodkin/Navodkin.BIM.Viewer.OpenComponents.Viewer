<template>
  <q-layout view="hHh lpr lFf" class="workspace-layout">
    <q-header class="workspace-header" bordered>
      <q-toolbar class="toolbar-shell">
        <q-btn
          flat
          round
          dense
          icon="menu"
          class="mobile-toggle lt-md"
          @click="leftDrawerOpen = !leftDrawerOpen"
        />

        <div class="header-copy">
          <div class="header-title">
            {{ currentProject?.name ?? "Mock workspace" }}
          </div>
          <div class="header-subtitle">
            {{
              currentProject?.description ||
              "Сценарий проекта еще не инициализирован."
            }}
          </div>
        </div>

        <q-space />

        <q-btn
          flat
          round
          dense
          icon="tune"
          class="mobile-toggle lt-md"
          @click="rightDrawerOpen = !rightDrawerOpen"
        />

        <q-btn
          icon="account_tree"
          label="Диспетчер моделей"
          no-caps
          unelevated
          class="manager-button"
          @click="modelManagerOpen = true"
        />

        <q-btn
          :to="{ name: 'mockup-project-create' }"
          icon="add_circle"
          label="Новый проект"
          no-caps
          flat
          class="secondary-button"
        />
      </q-toolbar>
    </q-header>

    <q-drawer
      v-if="!isDesktop"
      v-model="leftDrawerOpen"
      :width="leftSidebarWidth"
      overlay
      behavior="mobile"
      class="workspace-drawer"
    >
      <MockupResizableSidebar
        v-model:width="leftSidebarWidth"
        side="left"
        variant="drawer"
        :resizable="false"
        class="mobile-sidebar"
      >
        <MockupElementTreeSidebar />
      </MockupResizableSidebar>
    </q-drawer>

    <q-drawer
      v-if="!isDesktop"
      v-model="rightDrawerOpen"
      side="right"
      :width="rightSidebarWidth"
      overlay
      behavior="mobile"
      class="workspace-drawer"
    >
      <MockupResizableSidebar
        v-model:width="rightSidebarWidth"
        side="right"
        variant="drawer"
        :resizable="false"
        class="mobile-sidebar"
      >
        <MockupPropertiesSidebar />
      </MockupResizableSidebar>
    </q-drawer>

    <q-page-container>
      <q-page class="workspace-page">
        <div class="workspace-stage">
          <div class="viewport-layer">
            <MockupViewportPlaceholder />
          </div>

          <div v-if="isDesktop" class="dock-panel dock-panel-left">
            <MockupResizableSidebar
              v-model:width="leftSidebarWidth"
              side="left"
              class="dock-sidebar"
            >
              <MockupElementTreeSidebar />
            </MockupResizableSidebar>
          </div>

          <div v-if="isDesktop" class="dock-panel dock-panel-right">
            <MockupResizableSidebar
              v-model:width="rightSidebarWidth"
              side="right"
              class="dock-sidebar"
            >
              <MockupPropertiesSidebar />
            </MockupResizableSidebar>
          </div>

          <q-banner
            v-if="!currentProject"
            rounded
            inline-actions
            class="empty-workspace"
          >
            Состояние mock workspace хранится только локально в памяти.
            Сначала создайте проект, затем вернитесь сюда для просмотра
            интерактивного сценария.
            <template #action>
              <q-btn
                :to="{ name: 'mockup-project-create' }"
                flat
                no-caps
                label="Перейти к созданию"
              />
            </template>
          </q-banner>
        </div>
      </q-page>
    </q-page-container>

    <MockupModelManagerDialog v-model="modelManagerOpen" />
  </q-layout>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useQuasar } from "quasar";
import MockupElementTreeSidebar from "../../components/mockups/MockupElementTreeSidebar.vue";
import MockupModelManagerDialog from "../../components/mockups/MockupModelManagerDialog.vue";
import MockupPropertiesSidebar from "../../components/mockups/MockupPropertiesSidebar.vue";
import MockupResizableSidebar from "../../components/mockups/MockupResizableSidebar.vue";
import MockupViewportPlaceholder from "../../components/mockups/MockupViewportPlaceholder.vue";
import { useMockupWorkspace } from "../../composables/mockups/useMockupWorkspace";

const $q = useQuasar();
const { currentProject } = useMockupWorkspace();

const isDesktop = computed(() => $q.screen.gt.sm);
const leftDrawerOpen = ref(false);
const leftSidebarWidth = ref(318);
const modelManagerOpen = ref(false);
const rightDrawerOpen = ref(false);
const rightSidebarWidth = ref(348);

watch(isDesktop, () => {
  leftDrawerOpen.value = false;
  rightDrawerOpen.value = false;
});
</script>

<style scoped>
.workspace-layout {
  background:
    radial-gradient(circle at top, rgba(255, 255, 255, 0.14), transparent 22%),
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--ds-color-bg-page) 82%, black) 0%,
      var(--ds-color-bg-canvas) 100%
    );
}

.workspace-header {
  background: rgba(9, 19, 37, 0.72);
  color: var(--ds-color-text-on-dark);
  backdrop-filter: blur(18px);
  border-color: rgba(255, 255, 255, 0.08);
}

.toolbar-shell {
  min-height: 72px;
  gap: 12px;
  padding-inline: 12px;
}

.mobile-toggle {
  color: var(--ds-color-text-on-dark);
}

.header-copy {
  min-width: 0;
}

.header-title {
  font-size: 16px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.header-subtitle {
  margin-top: 4px;
  font-size: 12px;
  color: rgba(247, 247, 242, 0.7);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.manager-button {
  border-radius: 14px;
  background: var(--ds-color-accent-500);
  color: var(--ds-color-text-on-brand);
}

.secondary-button {
  border-radius: 14px;
  color: var(--ds-color-text-on-dark);
}

.workspace-drawer {
  background: rgba(248, 251, 255, 0.94);
  backdrop-filter: blur(16px);
}

.workspace-page {
  min-height: calc(100vh - 72px);
  padding: 12px;
}

.workspace-stage {
  position: relative;
  min-height: calc(100vh - 96px);
  height: calc(100vh - 96px);
}

.viewport-layer {
  position: absolute;
  inset: 0;
  z-index: 1;
}

.viewport-layer :deep(.viewport-card) {
  height: 100%;
  min-height: 100%;
}

.dock-panel {
  position: absolute;
  top: 12px;
  bottom: 12px;
  z-index: 3;
  display: flex;
  min-height: 0;
}

.dock-panel-left {
  left: 12px;
}

.dock-panel-right {
  right: 12px;
}

.mobile-sidebar {
  height: 100%;
  border-radius: 0;
  border: 0;
  box-shadow: none;
}

.dock-sidebar {
  height: 100%;
}

.empty-workspace {
  position: absolute;
  left: 50%;
  bottom: 18px;
  z-index: 4;
  width: min(720px, calc(100% - 36px));
  transform: translateX(-50%);
  background: rgba(248, 251, 255, 0.9);
  color: var(--ds-color-text-primary);
}

@media (max-width: 1023px) {
  .workspace-page {
    padding: 10px;
  }

  .workspace-stage {
    min-height: calc(100vh - 92px);
    height: auto;
  }
}

@media (max-width: 640px) {
  .toolbar-shell {
    flex-wrap: wrap;
    justify-content: space-between;
  }

  .header-copy {
    order: 1;
    width: 100%;
  }

  .workspace-page {
    padding: 8px;
  }

  .workspace-stage {
    min-height: calc(100vh - 112px);
  }

  .empty-workspace {
    left: 8px;
    right: 8px;
    bottom: 12px;
    width: auto;
    transform: none;
  }
}
</style>
