import { createAsyncThunk, createSelector, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { apiService } from '../../services';
import { API_ENDPOINTS } from '../../constants';
/**
 * Mirrors the backend `/property-types` response (`PropertyTypeResponse`):
 *   {
 *     "id": 1,
 *     "slug": "studio-apartment",
 *     "displayName": "Studio Apartment",
 *     "category": "Apartment",
 *     "sectionName": "Living Room",
 *     "roomCount": 0,
 *     "isBasement": false,
 *     "estimatedCubicFeet": 450,
 *     "displayOrder": 1,
 *     "isActive": true
 *   }
 *
 * Used by the moving-request wizard to let the customer pick what kind of
 * property they're moving out of/into (via a category-tabs + pill-card
 * picker), and to pre-estimate total volume (`estimatedCubicFeet`) before/
 * instead of itemizing every piece of furniture individually.
 */
export interface PropertyType {
  id: number;
  slug: string;
  displayName: string;
  category: string;
  sectionName?: string;
  roomCount?: number;
  isBasement: boolean;
  estimatedCubicFeet: number;
  displayOrder: number;
  isActive: boolean;
}
interface PropertyTypesState {
  items: PropertyType[];
  loading: boolean;
  error: string | null;
}
const initialState: PropertyTypesState = {
  items: [],
  loading: false,
  error: null,
};
// The backend response shape/casing isn't guaranteed to stay exactly as
// documented (some endpoints wrap in `{ data: [...] }`, `{ items: [...] }`,
// or a Spring-style `{ content: [...] }` page, and field casing can drift
// between snake_case/camelCase) — same normalization approach already used
// for inventory items / moving services / users.
type RawPropertyType = Record<string, any>;
function extractPropertyTypesArray(response: unknown): RawPropertyType[] {
  if (Array.isArray(response)) return response;
  if (response && typeof response === 'object') {
    const obj = response as Record<string, any>;
    if (Array.isArray(obj.data)) return obj.data;
    if (Array.isArray(obj.items)) return obj.items;
    if (Array.isArray(obj.content)) return obj.content; // Spring Data Page<T>
  }
  return [];
}
function normalizePropertyType(raw: RawPropertyType): PropertyType {
  const roomCount = raw.roomCount ?? raw.room_count;
  return {
    id: Number(raw.id),
    slug: raw.slug ?? '',
    displayName: raw.displayName ?? raw.display_name ?? '',
    category: raw.category ?? raw.category_name ?? '',
    sectionName: raw.sectionName ?? raw.section_name ?? undefined,
    roomCount: roomCount != null ? Number(roomCount) : undefined,
    isBasement: Boolean(raw.isBasement ?? raw.is_basement ?? false),
    estimatedCubicFeet: Number(raw.estimatedCubicFeet ?? raw.estimated_cubic_feet ?? 0),
    displayOrder: Number(raw.displayOrder ?? raw.display_order ?? 0),
    isActive: raw.isActive ?? raw.is_active ?? true,
  };
}
export const fetchPropertyTypes = createAsyncThunk(
  'propertyTypes/fetch',
  async () => {
    const response = await apiService.get<unknown>(API_ENDPOINTS.PROPERTY_TYPES);
    return extractPropertyTypesArray(response)
      .map(normalizePropertyType)
      // Inactive types shouldn't be selectable in the wizard; `displayOrder`
      // is the backend's intended presentation order (e.g. within a group,
      // studio before 1-bedroom before 2-bedroom).
      .filter((propertyType) => propertyType.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  },
  {
    // Skip the network call if we already have data (or one is already in
    // flight) — safe to dispatch this thunk from every screen that needs it
    // without worrying about redundant refetches.
    condition: (_, { getState }) => {
      const { propertyTypes } = getState() as { propertyTypes: PropertyTypesState };
      return !propertyTypes.loading && propertyTypes.items.length === 0;
    },
  }
);
const propertyTypesSlice = createSlice({
  name: 'propertyTypes',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPropertyTypes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPropertyTypes.fulfilled, (state, action: PayloadAction<PropertyType[]>) => {
        state.items = action.payload;
        state.loading = false;
      })
      .addCase(fetchPropertyTypes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Failed to load property types';
      });
  },
});
export default propertyTypesSlice.reducer;
// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------
type PropertyTypesSliceState = { propertyTypes: PropertyTypesState };
export const selectPropertyTypes = (state: PropertyTypesSliceState) => state.propertyTypes.items;
export const selectPropertyTypesLoading = (state: PropertyTypesSliceState) =>
  state.propertyTypes.loading;
export const selectPropertyTypesError = (state: PropertyTypesSliceState) =>
  state.propertyTypes.error;
export const selectPropertyTypeById =
  (id: number) => (state: PropertyTypesSliceState) =>
    state.propertyTypes.items.find((propertyType) => propertyType.id === id) ?? null;
export const selectPropertyTypeBySlug =
  (slug: string) => (state: PropertyTypesSliceState) =>
    state.propertyTypes.items.find((propertyType) => propertyType.slug === slug) ?? null;
// Distinct, order-preserving list of property-type categories (e.g.
// "Apartment", "House", "Office") — drives the category tabs at the top of
// the moving-request wizard's property-type picker.
export const selectPropertyTypeCategories = createSelector(
  selectPropertyTypes,
  (items) => Array.from(new Set(items.map((item) => item.category))).filter(Boolean)
);
// Factory for a selector scoped to one category's property types — the pill
// cards only need to show options within the active tab's category.
export const selectPropertyTypesByCategory =
  (category: string | null) => (state: PropertyTypesSliceState) =>
    category ? state.propertyTypes.items.filter((item) => item.category === category) : [];
