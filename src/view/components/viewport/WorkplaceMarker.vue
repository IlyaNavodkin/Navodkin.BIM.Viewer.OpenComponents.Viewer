<script lang="ts" setup>
import { watch, computed } from "vue";
import type { WorkplaceCardData } from "./WorkplaceCard.vue";
import { useViewerManagerStore } from "@/stores/useViewerManagerStore";

export interface WorkplaceMarkerProps {
  card: WorkplaceCardData;
  viewerId: string;
}

const props = defineProps<WorkplaceMarkerProps>();

const viewerManager = useViewerManagerStore();
const viewerStore = viewerManager.getViewer(props.viewerId);

const isSelected = computed(() => {
  return viewerStore.features.employeeWorkplace.markers.isSelected(
    props.card.localId
  );
});

const handleClick = (event: MouseEvent) => {
  event.stopPropagation();
  console.log("🟢 Marker clicked:", props.card.localId);

  viewerStore.features.employeeWorkplace.markers.handleClick(
    props.card.localId
  );
};

watch(
  () => isSelected.value,
  (newVal) => {
    console.log("🟢 isSelected changed for", props.card.localId, ":", newVal);
  }
);

const getAvatarPlaceholder = (name: string | null) => {
  if (!name) return "?";
  return name.charAt(0).toUpperCase();
};
</script>

<template>
  <div
    :class="[
      $style.marker,
      {
        [$style.markerOccupied]: card.isOccupied,
        [$style.markerVacant]: !card.isOccupied,
        [$style.markerSelected]: isSelected,
      },
    ]"
    @click="handleClick"
  >
    <div v-if="isSelected" :class="$style.selectedInfo">
      <div :class="$style.workplaceNumber">
        {{ card.workplaceNumber || "?" }}
      </div>
      <div :class="$style.employeeName">
        {{ card.employeeName || "Свободно" }}
      </div>
    </div>
    <div :class="$style.avatar">
      <img
        v-if="card.employeeAvatarUrl"
        :src="card.employeeAvatarUrl"
        :alt="card.employeeName || 'Avatar'"
        :class="$style.avatarImage"
      />

      <div v-else :class="$style.avatarPlaceholder">
        {{ getAvatarPlaceholder(card.employeeName) }}
      </div>
    </div>

    <div v-if="!card.isOccupied" :class="$style.pulse"></div>
  </div>
</template>

<style module lang="scss">
.marker {
  position: relative;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);

  &:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
  }

  &:active {
    transform: scale(0.95);
  }

  &.markerOccupied {
    background: #10b981;
    border: 3px solid #34d399;
  }

  &.markerVacant {
    background: #f59e0b;
    border: 3px solid #fbbf24;
  }

  &.markerSelected {
    background: #667eea;
    border: 3px solid #a78bfa;
    box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.3),
      0 8px 24px rgba(102, 126, 234, 0.4);
    transform: scale(1.2);
    z-index: 1000;

    &:hover {
      transform: scale(1.25);
      box-shadow: 0 0 0 6px rgba(102, 126, 234, 0.4),
        0 12px 32px rgba(102, 126, 234, 0.5);
    }
  }
}

.avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;
}

.avatarImage {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatarPlaceholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 700;
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.selectedInfo {
  position: absolute;
  top: -45px;
  left: 50%;
  transform: translateX(-50%);
  background: #667eea;
  color: white;
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
  z-index: 1001;
  display: flex;
  align-items: center;
  gap: 6px;
}

.workplaceNumber {
  background: rgba(255, 255, 255, 0.25);
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 800;
  font-size: 12px;
}

.employeeName {
  font-weight: 600;
  font-size: 11px;
}

.closeBtn {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid white;
  background: #ef4444;
  color: white;
  font-size: 12px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  z-index: 2;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);

  &:hover {
    transform: scale(1.15);
    background: #dc2626;
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
  }

  &:active {
    transform: scale(0.95);
  }
}

.pulse {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: rgba(245, 158, 11, 0.4);
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  z-index: 0;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
  50% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(1.5);
  }
}
</style>
