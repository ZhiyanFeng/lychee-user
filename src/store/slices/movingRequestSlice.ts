import { createSelector, createSlice, PayloadAction } from '@reduxjs/toolkit';

/**
 * Mirrors the backend `addresses` table:
 *   google_place_id, formatted_address, latitude, longitude   -> NOT NULL
 *   postal_code, city, state_province, country                -> parsed extras
 *   label, unit_apartment_number, has_elevator,
 *   parking_restrictions                                       -> custom logistics fields
 *
 * `id`/`user_id`/timestamps are server-assigned and not tracked client-side.
 */
export interface AddressDetails {
  googlePlaceId: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  postalCode?: string;
  city?: string;
  stateProvince?: string;
  country?: string;
  label?: string;
  unitApartmentNumber?: string;
  hasElevator: boolean;
  parkingRestrictions?: string;
}

type AddressSlot = 'from' | 'to';

interface MovingRequestState {
  fromAddress: AddressDetails | null;
  toAddress: AddressDetails | null;
  // inventoryItemId -> quantity the customer wants moved
  itemQuantities: Record<string, number>;
}

const initialState: MovingRequestState = {
  fromAddress: null,
  toAddress: null,
  itemQuantities: {},
};

const movingRequestSlice = createSlice({
  name: 'movingRequest',
  initialState,
  reducers: {
    // Full replace — used when the user selects a new place from the Google
    // Places autocomplete dropdown (resolves the NOT NULL Google fields).
    setAddress: (
      state,
      action: PayloadAction<{ slot: AddressSlot; address: AddressDetails }>
    ) => {
      const { slot, address } = action.payload;
      if (slot === 'from') {
        state.fromAddress = address;
      } else {
        state.toAddress = address;
      }
    },
    // Partial patch — used for the custom logistics fields (label, unit,
    // elevator, parking) that the user fills in after selecting a place.
    updateAddressDetails: (
      state,
      action: PayloadAction<{ slot: AddressSlot; changes: Partial<AddressDetails> }>
    ) => {
      const { slot, changes } = action.payload;
      const target = slot === 'from' ? state.fromAddress : state.toAddress;
      if (!target) return;
      Object.assign(target, changes);
    },
    setItemQuantity: (
      state,
      action: PayloadAction<{ itemId: string; quantity: number }>
    ) => {
      const { itemId, quantity } = action.payload;
      if (quantity > 0) {
        state.itemQuantities[itemId] = quantity;
      } else {
        delete state.itemQuantities[itemId];
      }
    },
    resetMovingRequest: () => initialState,
  },
});

export const { setAddress, updateAddressDetails, setItemQuantity, resetMovingRequest } =
  movingRequestSlice.actions;
export default movingRequestSlice.reducer;

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------
type MovingRequestSliceState = { movingRequest: MovingRequestState };

export const selectFromAddress = (state: MovingRequestSliceState) =>
  state.movingRequest.fromAddress;

export const selectToAddress = (state: MovingRequestSliceState) =>
  state.movingRequest.toAddress;

export const selectMovingAddresses = createSelector(
  selectFromAddress,
  selectToAddress,
  (fromAddress, toAddress) => ({ fromAddress, toAddress })
);

export const selectItemQuantities = (state: MovingRequestSliceState) =>
  state.movingRequest.itemQuantities;

export const selectItemQuantity =
  (itemId: string) => (state: MovingRequestSliceState) =>
    state.movingRequest.itemQuantities[itemId] ?? 0;

// Total number of individual items selected across all categories/steps.
export const selectTotalSelectedItemCount = createSelector(
  selectItemQuantities,
  (quantities) => Object.values(quantities).reduce((sum, qty) => sum + qty, 0)
);

