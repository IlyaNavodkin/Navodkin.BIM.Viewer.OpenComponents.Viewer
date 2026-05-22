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
            <q-badge rounded class="topbar-badge">Brand Tokens Lab</q-badge>
          </div>

          <q-card flat class="main-card">
            <q-card-section class="heading">
              <div class="text-h5 text-weight-bold">Design System Colors</div>
              <div class="text-body2 subtitle">
                Tune values, preview result and copy generated :root block.
              </div>
            </q-card-section>

            <q-separator />

            <q-card-section class="toolbar">
              <q-btn
                label="Reset Defaults"
                no-caps
                flat
                class="btn-muted"
                @click="resetDefaults"
              />
              <q-btn
                label="Copy :root CSS"
                no-caps
                unelevated
                class="btn-primary"
                @click="copyCss"
              />
            </q-card-section>

            <q-separator />

            <q-card-section class="token-grid">
              <q-card flat bordered class="token-panel">
                <q-card-section>
                  <div class="panel-title">Editable Tokens</div>
                  <div class="panel-subtitle">
                    Changes apply instantly across this app.
                  </div>
                </q-card-section>
                <q-separator />
                <q-card-section class="token-list">
                  <div
                    v-for="token in tokenDefs"
                    :key="token.key"
                    class="token-row"
                  >
                    <q-input
                      :model-value="tokens[token.key]"
                      @update:model-value="setToken(token.key, String($event))"
                      :label="token.label"
                      outlined
                      dense
                      class="token-input"
                    />
                    <input
                      v-if="token.picker"
                      :value="tokens[token.key]"
                      @input="
                        setToken(
                          token.key,
                          ($event.target as HTMLInputElement).value,
                        )
                      "
                      class="native-picker"
                      type="color"
                    />
                    <div v-else class="token-swatch token-swatch-overlay">
                      <span class="checker" />
                    </div>
                    <code class="token-key">{{ token.key }}</code>
                  </div>
                </q-card-section>
              </q-card>

              <q-card flat bordered class="token-panel">
                <q-card-section>
                  <div class="panel-title">Palette Preview</div>
                  <div class="panel-subtitle">
                    Quick visual for every token.
                  </div>
                </q-card-section>
                <q-separator />
                <q-card-section class="swatch-grid">
                  <div
                    v-for="token in tokenDefs"
                    :key="`swatch-${token.key}`"
                    class="swatch-item"
                  >
                    <div
                      class="swatch-color"
                      :style="{ background: tokens[token.key] }"
                    />
                    <div class="swatch-meta">
                      <div class="swatch-label">{{ token.label }}</div>
                      <code class="swatch-value">{{ tokens[token.key] }}</code>
                    </div>
                  </div>
                </q-card-section>
              </q-card>
            </q-card-section>

            <q-separator />

            <q-card-section class="preview-grid">
              <div class="preview-shell">
                <div class="preview-header">
                  <div class="preview-title">App Header</div>
                  <q-btn no-caps dense class="preview-btn"
                    >Primary Action</q-btn
                  >
                </div>
                <div class="preview-body">
                  <q-card flat class="preview-card">
                    <q-card-section>
                      <div
                        class="text-subtitle1 text-weight-bold preview-card-title"
                      >
                        Surface Card
                      </div>
                      <div class="preview-card-text">
                        Body text and muted text preview on your surface token.
                      </div>
                    </q-card-section>
                  </q-card>
                  <q-banner rounded class="preview-banner">
                    Focus border and accent token preview.
                  </q-banner>
                </div>
              </div>

              <q-input
                type="textarea"
                autogrow
                readonly
                outlined
                :model-value="cssOutput"
                label="Generated :root block"
                class="css-output"
              />
            </q-card-section>
          </q-card>
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { computed, reactive } from "vue";

type TokenKey =
  | "--ds-color-brand-500"
  | "--ds-color-brand-600"
  | "--ds-color-accent-500"
  | "--ds-color-bg-canvas"
  | "--ds-color-bg-page"
  | "--ds-color-bg-surface"
  | "--ds-color-bg-surface-muted"
  | "--ds-color-bg-overlay"
  | "--ds-color-text-primary"
  | "--ds-color-text-secondary"
  | "--ds-color-text-muted"
  | "--ds-color-text-on-brand"
  | "--ds-color-text-on-dark"
  | "--ds-color-border-default"
  | "--ds-color-border-strong"
  | "--ds-color-border-focus";

type TokenDef = {
  key: TokenKey;
  label: string;
  picker: boolean;
};

const defaults: Record<TokenKey, string> = {
  "--ds-color-brand-500": "#1976d2",
  "--ds-color-brand-600": "#1565c0",
  "--ds-color-accent-500": "#26a69a",
  "--ds-color-bg-canvas": "#0a1224",
  "--ds-color-bg-page": "#121a2f",
  "--ds-color-bg-surface": "#f8fbff",
  "--ds-color-bg-surface-muted": "#eef3f9",
  "--ds-color-bg-overlay": "rgba(255, 255, 255, 0.72)",
  "--ds-color-text-primary": "#0f1729",
  "--ds-color-text-secondary": "#5e6675",
  "--ds-color-text-muted": "#8a93a5",
  "--ds-color-text-on-brand": "#ffffff",
  "--ds-color-text-on-dark": "#f7f7f2",
  "--ds-color-border-default": "#d8e0ea",
  "--ds-color-border-strong": "#b7c4d4",
  "--ds-color-border-focus": "#1976d2",
};

const tokenDefs: TokenDef[] = [
  { key: "--ds-color-brand-500", label: "Brand 500", picker: true },
  { key: "--ds-color-brand-600", label: "Brand 600", picker: true },
  { key: "--ds-color-accent-500", label: "Accent 500", picker: true },
  { key: "--ds-color-bg-canvas", label: "Background Canvas", picker: true },
  { key: "--ds-color-bg-page", label: "Background Page", picker: true },
  { key: "--ds-color-bg-surface", label: "Background Surface", picker: true },
  {
    key: "--ds-color-bg-surface-muted",
    label: "Background Surface Muted",
    picker: true,
  },
  { key: "--ds-color-bg-overlay", label: "Background Overlay", picker: false },
  { key: "--ds-color-text-primary", label: "Text Primary", picker: true },
  { key: "--ds-color-text-secondary", label: "Text Secondary", picker: true },
  { key: "--ds-color-text-muted", label: "Text Muted", picker: true },
  { key: "--ds-color-text-on-brand", label: "Text On Brand", picker: true },
  { key: "--ds-color-text-on-dark", label: "Text On Dark", picker: true },
  { key: "--ds-color-border-default", label: "Border Default", picker: true },
  { key: "--ds-color-border-strong", label: "Border Strong", picker: true },
  { key: "--ds-color-border-focus", label: "Border Focus", picker: true },
];

const tokens = reactive<Record<TokenKey, string>>({ ...defaults });

applyAllTokens();

const cssOutput = computed(() => {
  const lines = tokenDefs.map(
    (token) => `  ${token.key}: ${tokens[token.key]};`,
  );

  return [":root {", ...lines, "}"].join("\n");
});

function setToken(key: TokenKey, value: string) {
  tokens[key] = value;
  document.documentElement.style.setProperty(key, value);
}

function applyAllTokens() {
  tokenDefs.forEach((token) => {
    document.documentElement.style.setProperty(token.key, tokens[token.key]);
  });
}

function resetDefaults() {
  tokenDefs.forEach((token) => {
    tokens[token.key] = defaults[token.key];
  });
  applyAllTokens();
}

async function copyCss() {
  await navigator.clipboard.writeText(cssOutput.value);
}
</script>

<style scoped>
.page-layout {
  background:
    radial-gradient(
      circle at 10% 0,
      var(--ds-color-bg-overlay),
      transparent 32%
    ),
    linear-gradient(
      145deg,
      var(--ds-color-bg-canvas) 0%,
      var(--ds-color-bg-page) 52%,
      var(--ds-color-brand-600) 100%
    );
}

.page-shell {
  width: min(100%, 1220px);
  margin: 0 auto;
}

.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.topbar-link {
  color: var(--ds-color-text-on-dark);
}

.topbar-badge {
  background: var(--ds-color-bg-surface);
  color: var(--ds-color-text-primary);
}

.main-card {
  border-radius: 18px;
  background: var(--ds-color-bg-surface);
  border: 1px solid var(--ds-color-border-default);
}

.heading {
  color: var(--ds-color-text-primary);
}

.subtitle {
  color: var(--ds-color-text-secondary);
}

.toolbar {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.btn-primary {
  background: var(--ds-color-brand-500);
  color: var(--ds-color-text-on-brand);
}

.btn-muted {
  color: var(--ds-color-text-secondary);
}

.token-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
  gap: 14px;
}

.token-panel {
  border-radius: 14px;
  border-color: var(--ds-color-border-default);
  background: var(--ds-color-bg-surface);
}

.panel-title {
  color: var(--ds-color-text-primary);
  font-size: 18px;
  font-weight: 700;
}

.panel-subtitle {
  color: var(--ds-color-text-secondary);
  margin-top: 4px;
  font-size: 14px;
}

.token-list {
  display: grid;
  gap: 10px;
}

.token-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 44px minmax(0, 220px);
  gap: 10px;
  align-items: center;
}

.token-input :deep(.q-field__native),
.token-input :deep(.q-field__label),
.token-input :deep(.q-field__input) {
  color: var(--ds-color-text-secondary);
}

.native-picker {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  border: 1px solid var(--ds-color-border-default);
  padding: 0;
  background: transparent;
}

.token-swatch {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  border: 1px solid var(--ds-color-border-default);
  position: relative;
  overflow: hidden;
}

.checker {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(
      45deg,
      transparent 25%,
      var(--ds-color-border-default) 25% 50%,
      transparent 50% 75%,
      var(--ds-color-border-default) 75%
    ),
    linear-gradient(
      45deg,
      transparent 25%,
      var(--ds-color-border-default) 25% 50%,
      transparent 50% 75%,
      var(--ds-color-border-default) 75%
    );
  background-size: 12px 12px;
  background-position:
    0 0,
    6px 6px;
  opacity: 0.5;
}

.token-swatch-overlay::after {
  content: "";
  position: absolute;
  inset: 0;
  background: var(--ds-color-bg-overlay);
}

.token-key {
  color: var(--ds-color-text-muted);
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.swatch-grid {
  display: grid;
  gap: 10px;
}

.swatch-item {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
}

.swatch-color {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  border: 1px solid var(--ds-color-border-default);
}

.swatch-meta {
  min-width: 0;
}

.swatch-label {
  color: var(--ds-color-text-primary);
  font-size: 14px;
  font-weight: 600;
}

.swatch-value {
  color: var(--ds-color-text-muted);
  font-size: 12px;
}

.preview-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 460px);
  gap: 14px;
}

.preview-shell {
  border: 1px solid var(--ds-color-border-default);
  border-radius: 14px;
  overflow: hidden;
}

.preview-header {
  padding: 14px;
  background: var(--ds-color-bg-page);
  color: var(--ds-color-text-on-dark);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.preview-title {
  font-size: 16px;
  font-weight: 700;
}

.preview-btn {
  background: var(--ds-color-brand-500);
  color: var(--ds-color-text-on-brand);
}

.preview-body {
  background: var(--ds-color-bg-surface-muted);
  padding: 14px;
  display: grid;
  gap: 10px;
}

.preview-card {
  background: var(--ds-color-bg-surface);
  border: 1px solid var(--ds-color-border-default);
}

.preview-card-title {
  color: var(--ds-color-text-primary);
}

.preview-card-text {
  color: var(--ds-color-text-secondary);
}

.preview-banner {
  border: 1px solid var(--ds-color-border-focus);
  background: var(--ds-color-bg-overlay);
  color: var(--ds-color-text-primary);
}

.css-output :deep(.q-field__native),
.css-output :deep(.q-field__label) {
  color: var(--ds-color-text-secondary);
}

@media (max-width: 1060px) {
  .token-grid,
  .preview-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .token-row {
    grid-template-columns: 1fr;
  }

  .token-key {
    white-space: normal;
  }
}
</style>
