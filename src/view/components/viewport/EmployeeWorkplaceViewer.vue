<script lang="ts" setup>
import { ref, onMounted, onUnmounted, computed } from "vue";
import { useViewer } from "@/view/components/composables/viewer/useViewerFacade";
import { useEmployeeWorkplace } from "@/view/components/composables/viewer/features/useEmployeeWorkplace";
import LoadingScreen from "./common/LoadingScreen.vue";
import EmployeeWorkplacePanel from "./EmployeeWorkplacePanel.vue";

const containerRef = ref<HTMLDivElement | null>(null);

const viewer = useViewer();
const employeeWorkplace = useEmployeeWorkplace();

const isModelLoaded = computed(() => {
  return viewer.modelManager.isModelLoaded.value;
});

const isLoading = computed(() => {
  return viewer.modelManager.isLoading.value;
});

const loadingProgress = computed(() => {
  return viewer.modelManager.loadingProgress.value;
});

// Обработчики событий от панели
const handleLevelChange = (level: string) => {
  employeeWorkplace.selectedLevel.value = level;
};

const handleSearchChange = (query: string) => {
  employeeWorkplace.searchQuery.value = query;
};

const handleOccupancyChange = (filter: string) => {
  employeeWorkplace.occupancyFilter.value = filter;
};

const handleCardHover = (localId: number | null) => {
  employeeWorkplace.handleCardHover(localId);
};

const handleCardClick = (localId: number) => {
  employeeWorkplace.handleCardClick(localId);
};

const handleCardLeave = () => {
  employeeWorkplace.handleCardLeave();
};

onMounted(async () => {
  if (!containerRef.value) {
    console.error("Container element not found");
    return;
  }

  try {
    await viewer.core.setupViewer(containerRef.value);
  } catch (error) {
    console.error("Error initializing viewer:", error);
  }
});

onUnmounted(() => {
  viewer.core.disposeViewer();
});
</script>

<template>
  <div :class="$style.root" tabindex="0">
    <LoadingScreen v-if="isLoading" :progress="loadingProgress" />

    <div :class="$style.layout">
      <div :class="$style.mainContent">
        <div :class="$style.toolbar">
          <span :class="$style.toolbarTitle">3D Viewer</span>
          <input
            v-if="!isModelLoaded"
            type="file"
            accept=".ifc"
            @change="viewer.modelManager.handleFileChange"
            :class="$style.fileInput"
          />
        </div>

        <div ref="containerRef" :class="$style.viewport">
          <!-- Панель рабочих мест -->
          <EmployeeWorkplacePanel
            v-if="isModelLoaded"
            :workplace-cards="employeeWorkplace.filteredWorkplaceCards.value"
            :available-levels="employeeWorkplace.availableLevels.value"
            :selected-level="employeeWorkplace.selectedLevel.value"
            :search-query="employeeWorkplace.searchQuery.value"
            :occupancy-filter="employeeWorkplace.occupancyFilter.value"
            :selected-local-id="employeeWorkplace.selectedLocalId.value"
            @update:selectedLevel="handleLevelChange"
            @update:searchQuery="handleSearchChange"
            @update:occupancyFilter="handleOccupancyChange"
            @cardHover="handleCardHover"
            @cardClick="handleCardClick"
            @cardLeave="handleCardLeave"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style module lang="scss">
.root {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 400px;
  position: relative;
  overflow: hidden;
  background: #f5f5f5;
  outline: none;

  &:focus {
    outline: none;
  }
}

.layout {
  display: flex;
  flex-direction: row;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.mainContent {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  height: 100%;
  overflow: hidden;
  background: #ffffff;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 50px;
  padding: 0 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  z-index: 100;
}

.toolbarTitle {
  font-size: 16px;
  font-weight: 600;
  color: white;
  letter-spacing: 0.5px;
}

.fileInput {
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  color: white;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(10px);

  &::file-selector-button {
    padding: 4px 12px;
    margin-right: 12px;
    background: rgba(255, 255, 255, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.5);
    border-radius: 4px;
    color: white;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      background: rgba(255, 255, 255, 0.4);
    }
  }

  &:hover {
    background: rgba(255, 255, 255, 0.25);
    border-color: rgba(255, 255, 255, 0.4);
  }
}

.viewport {
  position: relative;
  flex: 1;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: #1a1a1a;
}
</style>
