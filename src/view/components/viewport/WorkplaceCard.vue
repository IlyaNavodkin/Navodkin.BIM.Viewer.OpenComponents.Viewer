<script lang="ts" setup>
import type { ElementData } from "../composables/viewer";
import { useElementFilter } from "../composables/viewer/features/useElementFilter";

interface Props {
  element: ElementData;
  isSelected?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isSelected: false,
});

const emit = defineEmits<{
  click: [element: ElementData];
  mouseenter: [element: ElementData];
  mouseleave: [element: ElementData];
}>();

const { getPlacementNumber, isPlacementOccupied, getEmployeeByPlacement } =
  useElementFilter();

const handleClick = () => {
  emit("click", props.element);
};

const handleMouseEnter = () => {
  emit("mouseenter", props.element);
};

const handleMouseLeave = () => {
  emit("mouseleave", props.element);
};
</script>

<template>
  <div
    :class="[$style.card, { [$style.cardActive]: isSelected }]"
    @click="handleClick"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <div :class="$style.cardInfo">
      <div :class="$style.cardName">
        Место #
        {{ getPlacementNumber(element) || `Element ${element.LocalId}` }}
      </div>
      <div v-if="isPlacementOccupied(element)" :class="$style.employeeInfo">
        <div :class="$style.employeeAvatar">
          <img
            :src="getEmployeeByPlacement(element)?.previewUrlAvatar"
            :alt="getEmployeeByPlacement(element)?.name"
          />
        </div>
        <div :class="$style.employeeDetails">
          <div :class="$style.employeeName">
            {{ getEmployeeByPlacement(element)?.name }}
          </div>
          <div :class="$style.employeeStatus">Занято</div>
        </div>
      </div>
      <div v-else :class="$style.placementStatus">
        <span :class="$style.statusFree">Свободно</span>
      </div>
      <div :class="$style.cardDetails">
        <span :class="$style.cardId">ID: {{ element.LocalId }}</span>
      </div>
    </div>
  </div>
</template>

<style module lang="scss">
.card {
  display: flex;
  align-items: flex-start;
  padding: 12px;
  background: #fafafa;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;

  &:hover {
    background: #f0f0f0;
    border-color: #667eea;
    transform: translateX(-4px);
    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.15);
  }

  &:active {
    transform: translateX(-2px);
  }

  &.cardActive {
    background: linear-gradient(
      135deg,
      rgba(102, 126, 234, 0.1) 0%,
      rgba(118, 75, 162, 0.1) 100%
    );
    border: 2px solid #667eea;
    border-left: 4px solid #667eea;
    box-shadow: 0 2px 12px rgba(102, 126, 234, 0.25);

    &:hover {
      background: linear-gradient(
        135deg,
        rgba(102, 126, 234, 0.15) 0%,
        rgba(118, 75, 162, 0.15) 100%
      );
      border-color: #764ba2;
      border-left-color: #764ba2;
    }

    .cardName {
      color: #667eea;
      font-weight: 700;
    }
  }
}

.cardInfo {
  flex: 1;
  min-width: 0;
}

.cardName {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
  word-break: break-word;
  line-height: 1.3;
}

.cardDetails {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 11px;
  color: #999;
  padding-top: 4px;
  border-top: 1px solid #e0e0e0;
  margin-top: 8px;
}

.cardId {
  color: #aaa;
}

.employeeInfo {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
  padding: 8px;
  background: rgba(102, 126, 234, 0.05);
  border-radius: 6px;
  border: 1px solid rgba(102, 126, 234, 0.2);
}

.employeeAvatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  border: 2px solid rgba(102, 126, 234, 0.3);
  background: #fff;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.employeeDetails {
  flex: 1;
  min-width: 0;
}

.employeeName {
  font-size: 13px;
  font-weight: 600;
  color: #333;
  margin-bottom: 2px;
}

.employeeStatus {
  font-size: 11px;
  color: #667eea;
  font-weight: 500;
}

.placementStatus {
  margin-top: 8px;
  padding: 6px 10px;
  background: rgba(102, 126, 234, 0.1);
  border-radius: 6px;
  border: 1px solid rgba(102, 126, 234, 0.2);
  display: inline-block;
}

.statusFree {
  font-size: 12px;
  color: #667eea;
  font-weight: 600;
}
</style>
