<template>
  <q-card flat class="viewport-card">
    <div class="viewport-grid">
      <div class="viewport-overlay top-left">
        <q-badge rounded class="overlay-badge">Mock 3D Workspace</q-badge>
        <div class="overlay-title">
          {{ currentProject?.name ?? "Проект не создан" }}
        </div>
        <div class="overlay-subtitle">
          {{
            currentProject?.description ||
            "Создайте проект, чтобы перейти к сценарию загрузки IFC и навигации по элементам."
          }}
        </div>
      </div>

      <div class="viewport-overlay top-right">
        <q-card flat bordered class="stats-card">
          <q-card-section class="stats-grid">
            <div>
              <div class="stats-label">Модели</div>
              <div class="stats-value">{{ models.length }}</div>
            </div>
            <div>
              <div class="stats-label">Элементы</div>
              <div class="stats-value">{{ totalElements }}</div>
            </div>
            <div>
              <div class="stats-label">Выделено</div>
              <div class="stats-value">{{ highlightedCount }}</div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div class="viewport-center">
        <div class="wireframe-sphere" />
        <div class="wireframe-floor" />
        <div class="wireframe-tag">3D viewport placeholder</div>
      </div>

      <div class="viewport-overlay bottom-left">
        <q-card flat bordered class="focus-card">
          <q-card-section class="q-pa-sm">
            <div class="stats-label">Текущий фокус</div>
            <div class="focus-title">
              {{ selectedElement?.label ?? "Ничего не выбрано" }}
            </div>
            <div class="focus-meta">
              {{ selectedElement?.type ?? "Выберите элемент из дерева" }}
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div class="viewport-overlay bottom-right">
        <q-card flat bordered class="activity-card">
          <q-card-section class="q-pa-sm">
            <div class="stats-label">Mock activity</div>
            <div class="activity-copy">{{ activityMessage }}</div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-card>
</template>

<script setup lang="ts">
import { useMockupWorkspace } from "../../composables/mockups/useMockupWorkspace";

const {
  activityMessage,
  currentProject,
  highlightedCount,
  models,
  selectedElement,
  totalElements,
} = useMockupWorkspace();
</script>

<style scoped>
.viewport-card {
  height: 100%;
  min-height: 560px;
  border-radius: 28px;
  overflow: hidden;
  background:
    radial-gradient(circle at 20% 15%, rgba(38, 166, 154, 0.28), transparent 18%),
    radial-gradient(circle at 80% 12%, rgba(25, 118, 210, 0.24), transparent 18%),
    linear-gradient(135deg, #091325 0%, #12213d 45%, #172e59 100%);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.06);
}

.viewport-grid {
  position: relative;
  height: 100%;
  min-height: 560px;
  overflow: hidden;
}

.viewport-overlay {
  position: absolute;
  z-index: 2;
}

.top-left {
  top: 18px;
  left: 18px;
  max-width: 440px;
}

.top-right {
  top: 18px;
  right: 18px;
}

.bottom-left {
  bottom: 18px;
  left: 18px;
  max-width: 260px;
}

.bottom-right {
  right: 18px;
  bottom: 18px;
  max-width: 340px;
}

.overlay-badge {
  padding: 8px 12px;
  background: rgba(248, 251, 255, 0.16);
  color: var(--ds-color-text-on-dark);
  backdrop-filter: blur(12px);
}

.overlay-title {
  margin-top: 16px;
  font-size: clamp(24px, 3vw, 34px);
  line-height: 1.05;
  font-weight: 700;
  color: var(--ds-color-text-on-dark);
}

.overlay-subtitle {
  margin-top: 10px;
  font-size: 14px;
  line-height: 1.6;
  color: rgba(247, 247, 242, 0.76);
}

.stats-card,
.focus-card,
.activity-card {
  border-radius: 18px;
  background: rgba(248, 251, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.14);
  backdrop-filter: blur(18px);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(72px, 1fr));
  gap: 18px;
}

.stats-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(247, 247, 242, 0.58);
}

.stats-value {
  margin-top: 8px;
  font-size: 24px;
  font-weight: 700;
  color: var(--ds-color-text-on-dark);
}

.viewport-center {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
}

.wireframe-sphere {
  width: min(42vw, 360px);
  aspect-ratio: 1;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.22);
  box-shadow:
    0 0 0 48px rgba(255, 255, 255, 0.03),
    0 0 80px rgba(25, 118, 210, 0.24);
  position: relative;
}

.wireframe-sphere::before,
.wireframe-sphere::after {
  content: "";
  position: absolute;
  inset: 14%;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.wireframe-sphere::after {
  inset: 30% 10%;
}

.wireframe-floor {
  position: absolute;
  width: min(64vw, 580px);
  height: 180px;
  bottom: 18%;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transform: perspective(800px) rotateX(76deg);
  background:
    linear-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.08) 1px, transparent 1px);
  background-size: 34px 34px;
}

.wireframe-tag {
  position: absolute;
  bottom: 22%;
  padding: 10px 14px;
  border-radius: 999px;
  background: rgba(9, 19, 37, 0.64);
  color: var(--ds-color-text-on-dark);
  letter-spacing: 0.04em;
  font-size: 12px;
}

.focus-title {
  margin-top: 8px;
  font-size: 15px;
  font-weight: 700;
  color: var(--ds-color-text-on-dark);
}

.focus-meta,
.activity-copy {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.5;
  color: rgba(247, 247, 242, 0.8);
}

@media (max-width: 900px) {
  .viewport-card,
  .viewport-grid {
    min-height: 460px;
  }

  .top-right,
  .bottom-right {
    right: 14px;
  }

  .top-left,
  .bottom-left {
    left: 14px;
  }
}

@media (max-width: 640px) {
  .top-right,
  .bottom-left,
  .bottom-right {
    position: static;
    margin: 14px;
  }

  .top-left {
    top: 14px;
    left: 14px;
    right: 14px;
    max-width: none;
  }

  .stats-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }

  .wireframe-floor {
    width: 88%;
    bottom: 16%;
  }
}
</style>
