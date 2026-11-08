import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { apiService } from '../../services';
import { API_ENDPOINTS } from '../../constants';

/**
 * Mirrors the nested address objects inside GET /user/{userId}/open's
 * `originAddress`/`destinationAddress` — same shape `addressToPayload`
 * (movingRequestSlice) sends on create, echoed back by the backend.
 */
export interface OpenRequestAddress {
  formattedAddress: string;
  placeId: string;
  latitude: number;
  longitude: number;
  unitApartmentNumber: string;
  city: string;
  stateProvince: string;
  postalCode: string;
  country: string;
}

/** A single heavy/special item called out on the request, as echoed back by the backend. */
export interface OpenRequestSpecialtyItem {
  itemName: string;
  quantity: number;
  notes?: string;
}

/**
 * Mirrors a single element of GET /user/{userId}/open's `data` array — an
 * RFQ the signed-in user has submitted that's still open (not yet
 * completed/canceled).
 *
 * Example payload:
 * {
 *   "createdAt": "2026-10-08T10:25:57.885572",
 *   "destinationAddress": { "formattedAddress": "...", "placeId": "...", ... },
 *   "estimatedDistanceKm": 28.66,
 *   "id": "c96911b8-c39f-414c-a688-61940044efb4",
 *   "moveDate": "2026-10-09",
 *   "notes": "",
 *   "originAddress": { ... },
 *   "serviceId": 1,
 *   "serviceName": "Residential Moving",
 *   "specialtyItems": [],
 *   "status": "OPEN",
 *   "userId": "01f782c6-ff4d-432c-8b03-1e8feba48e5d",
 *   "userName": "Paul Feng"
 * }
 */
export interface OpenRequest {
  id: string;
  userId: string;
  userName: string;
  serviceId: number | null;
  serviceName: string;
  originAddress: OpenRequestAddress;
  destinationAddress: OpenRequestAddress;
  estimatedDistanceKm: number | null;
  moveDate: string;
  notes: string;
  specialtyItems: OpenRequestSpecialtyItem[];
  status: string;
  createdAt: string | null;
}

interface OpenRequestState {
  items: OpenRequest[];
  loading: boolean;
  error: string | null;
}

const initialState: OpenRequestState = {
  items: [],
  loading: false,
  error: null,
};

// Tolerate snake_case or camelCase field casing from the backend — same
// normalization approach already used elsewhere (users, services, property
// types).
type RawOpenRequest = Record<string, any>;

function extractOpenRequestsArray(response: unknown): RawOpenRequest[] {
  if (Array.isArray(response)) return response;
  if (response && typeof response === 'object') {
    const obj = response as Record<string, any>;
    if (Array.isArray(obj.data)) return obj.data;
    if (Array.isArray(obj.items)) return obj.items;
    if (Array.isArray(obj.content)) return obj.content; // Spring Data Page<T>
    // Some backends may return a single open request object instead of a list.
    if (obj.id != null) return [obj];
  }
  return [];
}

function normalizeAddress(raw: RawOpenRequest | undefined): OpenRequestAddress {
  const data = raw ?? {};
  return {
    formattedAddress: data.formattedAddress ?? data.formatted_address ?? '',
    placeId: data.placeId ?? data.place_id ?? '',
    latitude: Number(data.latitude ?? 0),
    longitude: Number(data.longitude ?? 0),
    unitApartmentNumber: data.unitApartmentNumber ?? data.unit_apartment_number ?? '',
    city: data.city ?? '',
    stateProvince: data.stateProvince ?? data.state_province ?? '',
    postalCode: data.postalCode ?? data.postal_code ?? '',
    country: data.country ?? '',
  };
}

function normalizeSpecialtyItem(raw: RawOpenRequest): OpenRequestSpecialtyItem {
  return {
    itemName: raw.itemName ?? raw.item_name ?? '',
    quantity: Number(raw.quantity ?? 0),
    notes: raw.notes ?? undefined,
  };
}

function normalizeOpenRequest(raw: RawOpenRequest): OpenRequest {
  return {
    id: String(raw.id ?? ''),
    userId: String(raw.userId ?? raw.user_id ?? ''),
    userName: raw.userName ?? raw.user_name ?? '',
    serviceId: raw.serviceId ?? raw.service_id ?? null,
    serviceName: raw.serviceName ?? raw.service_name ?? '',
    originAddress: normalizeAddress(raw.originAddress ?? raw.origin_address),
    destinationAddress: normalizeAddress(raw.destinationAddress ?? raw.destination_address),
    estimatedDistanceKm: raw.estimatedDistanceKm ?? raw.estimated_distance_km ?? null,
    moveDate: raw.moveDate ?? raw.move_date ?? '',
    notes: raw.notes ?? '',
    specialtyItems: Array.isArray(raw.specialtyItems ?? raw.specialty_items)
      ? (raw.specialtyItems ?? raw.specialty_items).map(normalizeSpecialtyItem)
      : [],
    status: raw.status ?? '',
    createdAt: raw.createdAt ?? raw.created_at ?? null,
  };
}

/**
 * Fetches the signed-in user's open (in-progress) requests from
 * `/user/{userId}/open`. Takes the backend `users.id` as an argument rather
 * than reading it from state itself, so callers (e.g. `OpenRequestSync` in
 * app/_layout.tsx) stay in control of *when* it's safe to call — i.e. only
 * once the `users` row has actually been fetched/created.
 */
export const fetchOpenRequests = createAsyncThunk(
  'openRequest/fetch',
  async (userId: string | number) => {
    const response = await apiService.get<unknown>(API_ENDPOINTS.OPEN_REQUESTS(userId));
    return extractOpenRequestsArray(response).map(normalizeOpenRequest);
  }
);

const openRequestSlice = createSlice({
  name: 'openRequest',
  initialState,
  reducers: {
    // Wipes cached open requests — call on sign-out so a different user
    // signing in on the same device session doesn't briefly see stale data.
    clearOpenRequests: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOpenRequests.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOpenRequests.fulfilled, (state, action: PayloadAction<OpenRequest[]>) => {
        state.items = action.payload;
        state.loading = false;
      })
      .addCase(fetchOpenRequests.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Failed to load open requests';
      });
  },
});

export const { clearOpenRequests } = openRequestSlice.actions;
export default openRequestSlice.reducer;

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------
type OpenRequestSliceState = { openRequest: OpenRequestState };

export const selectOpenRequests = (state: OpenRequestSliceState) => state.openRequest.items;
export const selectOpenRequestsLoading = (state: OpenRequestSliceState) =>
  state.openRequest.loading;
export const selectOpenRequestsError = (state: OpenRequestSliceState) => state.openRequest.error;
export const selectHasOpenRequest = (state: OpenRequestSliceState) =>
  state.openRequest.items.length > 0;
// Most backends return at most one truly "open" RFQ per user at a time —
// convenience selector for screens (e.g. Explore/Bookings) that just want to
// know "does the user have an active request right now" and, if so, which one.
export const selectActiveOpenRequest = (state: OpenRequestSliceState) =>
  state.openRequest.items[0] ?? null;

