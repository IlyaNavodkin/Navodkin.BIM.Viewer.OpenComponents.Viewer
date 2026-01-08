<script lang="ts" setup>
import type { LevelsViewData } from "@/view/components/composables/viewer/data/useDataAccess";

export type WorkplaceCardData = {
  localId: number;
  workplaceNumber: string;
  level: LevelsViewData | null;
  employeeName: string | null;
  employeeAvatarUrl: string | null;
  isOccupied: boolean;
};

interface Props {
  card: WorkplaceCardData;
  isSelected: boolean;
}

interface Emits {
  (e: "click", localId: number): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const handleClick = () => {
  emit("click", props.card.localId);
};

const getAvatarPlaceholder = (name: string | null) => {
  if (!name) return "?";
  return name.charAt(0).toUpperCase();
};
</script>

<template>
  <div
    :class="[
      $style.card,
      { [$style.cardOccupied]: card.isOccupied },
      { [$style.cardVacant]: !card.isOccupied },
      { [$style.cardSelected]: isSelected },
    ]"
    :data-workplace-card-id="card.localId"
    @click="handleClick"
  >
    <!-- Аватар -->
    <div :class="$style.cardAvatar">
      <img
        v-if="card.employeeAvatarUrl"
        :src="card.employeeAvatarUrl"
        :alt="card.employeeName || 'Avatar'"
        :class="$style.cardAvatarImage"
      />
      <div v-else :class="$style.cardAvatarPlaceholder">
        {{ getAvatarPlaceholder(card.employeeName) }}
      </div>
    </div>

    <!-- Информация -->
    <div :class="$style.cardInfo">
      <div :class="$style.cardName">
        {{ card.employeeName || "Свободно" }}
      </div>
      <div :class="$style.cardDetails">
        <span :class="$style.cardWorkplace">{{ card.workplaceNumber }}</span>
        <span v-if="card.level" :class="$style.cardLevel">{{
          card.level.name
        }}</span>
      </div>
    </div>

    <!-- Индикатор статуса -->
    <div
      :class="[
        $style.cardStatus,
        { [$style.cardStatusOccupied]: card.isOccupied },
        { [$style.cardStatusVacant]: !card.isOccupied },
      ]"
    ></div>
  </div>
</template>

<style module lang="scss">
.card {
  display: flex;
  align-items: center;
  padding: 12px;
  margin-bottom: 8px;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    border-color: #667eea;
  }

  &:last-child {
    margin-bottom: 0;
  }

  &.cardOccupied {
    border-color: #10b981;

    &:hover {
      border-color: #059669;
    }
  }

  &.cardVacant {
    border-color: #f59e0b;
    background: #fffbeb;

    &:hover {
      border-color: #d97706;
    }
  }

  &.cardSelected {
    border-color: #667eea;
    border-width: 3px;
    background: linear-gradient(
      135deg,
      rgba(102, 126, 234, 0.05) 0%,
      rgba(118, 75, 162, 0.05) 100%
    );
    box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);

    &:hover {
      border-color: #5568d3;
    }
  }
}

.cardAvatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  margin-right: 12px;
  background: #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cardAvatarImage {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cardAvatarPlaceholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 600;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.cardInfo {
  flex: 1;
  min-width: 0;
}

.cardName {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cardDetails {
  display: flex;
  gap: 8px;
  font-size: 12px;
  color: #6b7280;
}

.cardWorkplace {
  font-weight: 500;
}

.cardLevel {
  &:before {
    content: "•";
    margin-right: 8px;
    color: #9ca3af;
  }
}

.cardStatus {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-left: 8px;

  &.cardStatusOccupied {
    background: #10b981;
  }

  &.cardStatusVacant {
    background: #f59e0b;
  }
}
</style>
