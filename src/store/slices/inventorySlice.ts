import { createAsyncThunk, createSelector, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { apiService } from '../../services';
import { API_ENDPOINTS } from '../../constants';

export interface InventoryItem {
  id: string;
  item_name: string;
  category: string;
  thumbnail_url: string | null;
  cubic_feet_volume: number;
  estimated_weight_lbs: number;
  is_active: boolean;
}

interface InventoryState {
  items: InventoryItem[];
  loading: boolean;
  error: string | null;
}

const initialState: InventoryState = {
  items: [],
  loading: false,
  error: null,
};

// The backend response shape/casing isn't guaranteed (some endpoints wrap in
// `{ data: [...] }`, others in `{ items: [...] }` or a Spring-style
// `{ content: [...] }` page, and field casing can be snake_case or
// camelCase). These helpers normalize whatever comes back so the rest of the
// app can rely on the exact `InventoryItem` shape.
type RawInventoryItem = Record<string, any>;

function extractItemsArray(response: unknown): RawInventoryItem[] {
  if (Array.isArray(response)) return response;
  if (response && typeof response === 'object') {
    const obj = response as Record<string, any>;
    if (Array.isArray(obj.data)) return obj.data;
    if (Array.isArray(obj.items)) return obj.items;
    if (Array.isArray(obj.content)) return obj.content; // Spring Data Page<T>
  }
  return [];
}

function toBoolean(value: unknown, fallback = true): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  if (typeof value === 'number') return value !== 0;
  return fallback;
}

function normalizeInventoryItem(raw: RawInventoryItem): InventoryItem {
  return {
    id: String(raw.id ?? raw.itemId ?? raw.item_id ?? ''),
    item_name: raw.item_name ?? raw.itemName ?? raw.name ?? '',
    category: raw.category ?? raw.categoryName ?? raw.category_name ?? 'Uncategorized',
    thumbnail_url: raw.thumbnail_url ?? raw.thumbnailUrl ?? null,
    cubic_feet_volume: Number(raw.cubic_feet_volume ?? raw.cubicFeetVolume ?? 0),
    estimated_weight_lbs: Number(raw.estimated_weight_lbs ?? raw.estimatedWeightLbs ?? 0),
    // Some endpoints omit an explicit flag entirely when they only ever return
    // active rows (e.g. the /moving-services endpoint) — default to true in
    // that case rather than silently filtering everything out.
    is_active: toBoolean(raw.is_active ?? raw.isActive ?? raw.active, true),
  };
}

export const fetchInventoryItems = createAsyncThunk(
  'inventory/fetch',
  async () => {
    const response = await apiService.get<unknown>(API_ENDPOINTS.INVENTORY_ITEMS);
    return extractItemsArray(response).map(normalizeInventoryItem);
  },
  {
    // Skip the network call if we already have data (or one is already in
    // flight) — makes it safe to dispatch this thunk from every screen that
    // needs it (address step, item steps, summary, app startup) without
    // worrying about redundant refetches.
    condition: (_, { getState }) => {
      const { inventory } = getState() as { inventory: InventoryState };
      return !inventory.loading && inventory.items.length === 0;
    },
  }
);

const inventorySlice = createSlice({
  name: 'inventory',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchInventoryItems.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInventoryItems.fulfilled, (state, action: PayloadAction<InventoryItem[]>) => {
        state.items = action.payload;
        state.loading = false;
      })
      .addCase(fetchInventoryItems.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Failed to load inventory items';
      });
  },
});

export default inventorySlice.reducer;

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------
type InventorySliceState = { inventory: InventoryState };

export const selectInventoryItems = (state: InventorySliceState) => state.inventory.items;
export const selectInventoryLoading = (state: InventorySliceState) => state.inventory.loading;
export const selectInventoryError = (state: InventorySliceState) => state.inventory.error;

// Only items flagged active are relevant for the moving-request wizard.
export const selectActiveInventoryItems = createSelector(
  selectInventoryItems,
  (items) => items.filter((item) => item.is_active)
);

// Distinct, sorted list of categories derived from the active inventory items.
// This drives how many "item selection" steps the moving-request wizard has.
export const selectInventoryCategories = createSelector(
  selectActiveInventoryItems,
  (items) => Array.from(new Set(items.map((item) => item.category))).sort()
);

// Active items grouped by category, e.g. { Bedroom: [...], Kitchen: [...] }.
// Handy for rendering a whole step (one category) at once.
export const selectInventoryItemsGroupedByCategory = createSelector(
  selectActiveInventoryItems,
  (items) =>
    items.reduce<Record<string, InventoryItem[]>>((groups, item) => {
      (groups[item.category] ||= []).push(item);
      return groups;
    }, {})
);

// Factory that generates (and memoizes/caches) a selector scoped to a single
// category, e.g. makeSelectInventoryItemsByCategory('Bedroom')(state).
const categorySelectorCache = new Map<string, (state: InventorySliceState) => InventoryItem[]>();
export const makeSelectInventoryItemsByCategory = (category: string) => {
  const cached = categorySelectorCache.get(category);
  if (cached) return cached;

  const selector = createSelector(selectActiveInventoryItems, (items) =>
    items.filter((item) => item.category === category)
  );
  categorySelectorCache.set(category, selector);
  return selector;
};


