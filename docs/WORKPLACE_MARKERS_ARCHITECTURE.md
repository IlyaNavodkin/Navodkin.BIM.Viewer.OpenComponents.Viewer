# Архитектура маркеров рабочих мест

## 📦 Структура

### 1. **Store** - `useWorkplaceMarkersStore`
**Файл:** `src/stores/useWorkplaceMarkersStore.ts`

Централизованное хранилище состояний маркеров с использованием Pinia.

#### State:
- `selectedMarkers: Map<number, boolean>` - выделенные маркеры
- `markerVisibility: Map<number, boolean>` - видимость маркеров
- `currentSelectedLocalId: number | null` - текущий выделенный ID
- `onSelectCallback: Function | null` - callback для обработки выбора

#### Getters:
- `isMarkerSelected(localId)` - проверка выделения маркера
- `isMarkerVisible(localId)` - проверка видимости маркера
- `selectedLocalIds` - массив всех выделенных ID

#### Actions:
- `selectMarker(localId)` - выделить маркер (сбросив остальные)
- `clearSelection()` - сбросить выделение
- `toggleMarkerSelection(localId)` - переключить выделение
- `setMarkerVisibility(localId, visible)` - установить видимость
- `handleMarkerClick(localId)` - обработать клик
- `setOnSelectCallback(callback)` - установить callback
- `reset()` - сбросить все состояния

---

### 2. **Composable** - `useWorkplaceMarkers`
**Файл:** `src/view/components/composables/viewer/features/useWorkplaceMarkers.ts`

Управление 3D маркерами в сцене.

#### Обязанности:
- Создание Vue компонентов маркеров
- Позиционирование маркеров в 3D пространстве
- Управление CSS2DObject
- Синхронизация с viewer selection через watcher
- Обновление store при изменениях

#### Ключевые методы:
- `init()` - инициализация + установка callback в store
- `createMarkersForWorkplaces(cards)` - создание маркеров для рабочих мест
- `clearAllMarkers()` - очистка всех маркеров + сброс store
- `updateMarkerVisibility(localId, visible)` - управление видимостью

#### Watcher:
```typescript
watch(
  () => viewerStore.features.selection.highlightedElement,
  (highlightedElement) => {
    const selectedLocalId = highlightedElement?.localId ?? null;
    if (selectedLocalId !== null) {
      markersStore.selectMarker(selectedLocalId);
    } else {
      markersStore.clearSelection();
    }
  }
);
```

---

### 3. **Component** - `WorkplaceMarker.vue`
**Файл:** `src/view/components/viewport/WorkplaceMarker.vue`

Vue компонент для отображения маркера.

#### Props:
- `card: WorkplaceCardData` - данные рабочего места

#### Использование Store:
```typescript
const markersStore = useWorkplaceMarkersStore();

const isSelected = computed(() => {
  return markersStore.isMarkerSelected(props.card.localId);
});

const handleClick = (event: MouseEvent) => {
  markersStore.handleMarkerClick(props.card.localId);
};
```

#### Визуальные состояния:
- `.markerOccupied` - занятое место (зеленый)
- `.markerVacant` - свободное место (оранжевый)
- `.markerSelected` - выделенный маркер (фиолетовый с подсветкой)

---

## 🔄 Поток данных

```
User Click на маркер
    ↓
WorkplaceMarker.vue: handleClick()
    ↓
markersStore.handleMarkerClick(localId)
    ↓
onSelectCallback(localId) [установлен в useWorkplaceMarkers.init()]
    ↓
CustomEvent "workplace-marker-select"
    ↓
useEmployeeWorkplace обрабатывает событие
    ↓
viewerStore.features.selection.highlight.set()
    ↓
Watcher в useWorkplaceMarkers
    ↓
markersStore.selectMarker(localId)
    ↓
WorkplaceMarker.vue: computed isSelected обновляется
    ↓
UI обновляется (фиолетовая подсветка)
```

---

## ✅ Преимущества архитектуры

### 1. **Единый источник истины**
- Все состояния в одном месте (store)
- Нет рассинхронизации между компонентами

### 2. **Реактивность из коробки**
- Pinia обеспечивает автоматическую реактивность
- Computed properties автоматически обновляются

### 3. **Отсутствие provide/inject**
- Прямой доступ к store из любого компонента
- Нет проблем с изолированными Vue приложениями

### 4. **Type-safe**
- TypeScript видит всю структуру store
- Автодополнение в IDE

### 5. **Легко тестировать**
- Store можно тестировать изолированно
- Легко мокировать для unit-тестов

### 6. **Легко отлаживать**
- Vue DevTools показывает состояние store
- Логи в actions для трейсинга

---

## 🎯 Использование

### Инициализация:
```typescript
const workplaceMarkers = useWorkplaceMarkers(viewerId);
workplaceMarkers.init();
```

### Создание маркеров:
```typescript
await workplaceMarkers.createMarkersForWorkplaces(workplaceCards);
```

### Очистка:
```typescript
workplaceMarkers.clearAllMarkers();
```

### Программное выделение:
```typescript
const markersStore = useWorkplaceMarkersStore();
markersStore.selectMarker(localId);
```

---

## 📝 Примечания

- Каждый маркер - это отдельное изолированное Vue приложение (createApp)
- Store доступен глобально через Pinia
- Watcher синхронизирует состояние с viewer selection
- Callback устанавливается один раз при инициализации

