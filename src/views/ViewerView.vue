<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import LoadingOverlay from "../components/LoadingOverlay.vue";
import { useIFCViewer } from "../composables/useIFCViewer";
import EmployeeWorkplacePanel from "../components/EmployeeWorkplacePanel.vue";

const router = useRouter();
const route = useRoute();
const containerRef = ref<HTMLElement | null>(null);
const { disposeViewer, setupViewer, modelLoading, employeeWorkplace } =
  useIFCViewer({
    modelPath: "/Test_IFC_Building.ifc",
    modelName: "Test_IFC_Building",
    selectionColor: "#bcf124",
  });

function goBack() {
  router.push("/");
}

onMounted(async () => {
  if (!containerRef.value) return;

  const employeeIdParam = route.params.employeeId;
  const employeeId = Array.isArray(employeeIdParam)
    ? employeeIdParam[0]
    : employeeIdParam;

  await setupViewer(
    containerRef.value,
    typeof employeeId === "string" ? employeeId : undefined
  );
});

onBeforeUnmount(() => {
  disposeViewer();
});

const handleCardClick = (localId: number) => {
  employeeWorkplace.selectWorkplaceById(localId);
};
</script>

<template>
  <div class="viewer-container">
    <LoadingOverlay
      :isLoading="modelLoading.isLoading"
      :progress="modelLoading.progress"
      :modelName="modelLoading.modelName"
    />
    <div class="full-screen" id="container" ref="containerRef">
      <button @click="goBack" class="back-button">← Назад</button>

      <EmployeeWorkplacePanel
        v-if="!modelLoading.isLoading"
        :workplace-cards="employeeWorkplace.filteredWorkplaceCards.value"
        :available-levels="employeeWorkplace.availableLevels.value"
        :selected-level="employeeWorkplace.selectedLevel.value"
        :search-query="employeeWorkplace.searchQuery.value"
        :occupancy-filter="employeeWorkplace.occupancyFilter.value"
        :selected-local-id="employeeWorkplace.selectedLocalId.value"
        :is-loading="employeeWorkplace.isLoading.value"
        @update:selectedLevel="employeeWorkplace.handleLevelChange"
        @update:searchQuery="employeeWorkplace.handleSearchChange"
        @update:occupancyFilter="employeeWorkplace.handleOccupancyChange"
        @cardClick="handleCardClick"
      />
    </div>
  </div>
</template>

<style scoped>
.viewer-container {
  position: relative;
  width: 100vw;
  height: 100vh;
}

.full-screen {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.back-button {
  position: fixed;
  top: 20px;
  left: 20px;
  z-index: 10001;
  padding: 10px 20px;
  font-size: 16px;
  font-weight: bold;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border: 2px solid #bcf124;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: "Plus Jakarta Sans", sans-serif;
}

.back-button:hover {
  background: rgba(0, 0, 0, 0.9);
  border-color: #a0d020;
}
</style>
