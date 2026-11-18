import { createAsyncThunk, createSelector, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { apiService } from '../../services';
import { API_ENDPOINTS } from '../../constants';
import type { RootState } from '../index';
import type { AdditionalServiceType } from '../../types';
/**
 * Client-side "from"/"to" address capture. Richer than the backend actually
 * persists — the `rfqs` table only has flat `origin_address`/
 * `destination_address` TEXT columns, but we keep the structured Google
 * Places fields (coordinates, parsed city/state/postal, logistics details)
 * around locally for the autocomplete UX and in case a future backend
 * revision wants them. Only `formattedAddress` (via `addressToText` below)
 * is actually sent on submit.
 */
/**
 * Where the moving truck can park at an address. The options actually
 * offered depend on the move scope's category — see `StepLocations`
 * (Apartment/Storage -> loading_bay|street, House/Townhouse ->
 * driveway|street) — but the stored value is one flat union so the field
 * means the same thing regardless of which pill set produced it.
 */
export type ParkingType = 'driveway' | 'street' | 'loading_bay';
export interface AddressDetails {
  googlePlaceId: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  postalCode?: string;
  city?: string;
  stateProvince?: string;
  country?: string;
  moveScope?: string;
  unitApartmentNumber?: string;
  /**
   * `null` = not yet answered. Only meaningful for Apartment/Storage
   * category properties (House/Townhouse hide the Elevator field entirely
   * in favor of a plain Stairs count) — see `StepLocations`'s Dynamic
   * Conditional Swap.
   */
  hasElevator: boolean | null;
  parkingRestrictions?: string;
  /**
   * Flights of stairs to navigate at this address. Meaning depends on the
   * active category's pill set: for House/Townhouse, 0 = "None", 1 = "1
   * Flight", 2 = "2+ Flights"; for Apartment/Storage (walk-up only, since
   * an elevator building has none), 1 = "1 Flight", 2 = "2 Flights", 3 =
   * "3+ Flights". Feeds into the hourly-bidding logistics movers see (more
   * stairs generally means more time/labor).
   */
  stairsCount?: number;
  parkingType?: ParkingType;
}
/**
 * A single heavy/special item called out for the move (e.g. "Piano" x1),
 * sent to the backend as the structured `specialtyItems` array — distinct
 * from the free-text `notes` field, which is a general message to movers.
 */
export interface SpecialtyItem {
  itemName: string;
  quantity: number;
  notes?: string;
}
type AddressSlot = 'from' | 'to';
interface MovingRequestState {
  fromAddress: AddressDetails | null;
  toAddress: AddressDetails | null;
  // Sent to the backend as a number (createRfq's `serviceId`).
  serviceId: number | null;
  // Selected move-scope id (moveScopesSlice) for the PICKUP address,
  // e.g. "Studio Apartment". Not part of the backend's createRfq contract
  // today — kept locally for the Access Details UI logic, but not sent on
  // submit.
  moveScopeId: number | null;
  // Same as `moveScopeId` above, but for the DESTINATION address. Kept
  // as a separate field (rather than reusing `moveScopeId`) since the
  // pickup and destination move scopes are independent selections —
  // without this, navigating away mid-wizard (e.g. to complete a profile)
  // and back would silently lose Step 2's move scope / Access Details.
  destinationMoveScopeId: number | null;
  // createRfq's `moveDate` — kept as a plain 'YYYY-MM-DD' string client-side.
  moveDate: string;
  // Coarse delivery window (e.g. "Morning"/"Afternoon"/"Evening") rather than
  // an exact time, since the hourly-bidding model means movers set the exact
  // start time when they bid. Not part of the backend's createRfq contract
  // today — kept locally for display in the Step 3 summary only.
  timeWindow: string;
  // General free-text note to movers (e.g. "Have a piano, please bring extra
  // movers") — sent to the backend as the top-level `notes` field.
  description: string;
  // Structured heavy/special items list — sent to the backend as
  // `specialtyItems`. Distinct from `description`/`notes` above.
  specialtyItems: SpecialtyItem[];
  // Step 2's "Flexible with move date (±2 days)" switch — sent to the
  // backend as the top-level `isFlexibleDate` field.
  isFlexibleDate: boolean;
  // Step 2's multi-select "Additional Services" chips — sent to the
  // backend as the top-level `additionalServices` array.
  additionalServices: AdditionalServiceType[];
  // Which step of the 3-step wizard the user was last on (1 = Locations,
  // 2 = Destination & Schedule, 3 = Review & Submit). Persisted so that
  // navigating away mid-wizard (e.g. to complete a profile from the Step 3
  // "Create Profile" prompt) and back resumes exactly where the user left
  // off, instead of restarting the whole wizard from Step 1.
  wizardStep: number;
  submitting: boolean;
  submitError: string | null;
  // id of the rfq just created, once submission succeeds.
  submittedRfqId: string | null;
}
const initialState: MovingRequestState = {
  fromAddress: null,
  toAddress: null,
  serviceId: null,
  moveScopeId: null,
  destinationMoveScopeId: null,
  moveDate: '',
  timeWindow: '',
  description: '',
  specialtyItems: [],
  isFlexibleDate: false,
  additionalServices: [],
  wizardStep: 1,
  submitting: false,
  submitError: null,
  submittedRfqId: null,
};
/**
 * Shapes a client-side `AddressDetails` into the nested address object the
 * backend's createRfq endpoint expects (`placeId` rather than
 * `googlePlaceId`; logistics-only fields like stairs/elevator/parking stay
 * client-side since they aren't part of this contract).
 */
function addressToPayload(address: AddressDetails | null) {
  return {
    formattedAddress: address?.formattedAddress ?? '',
    placeId: address?.googlePlaceId ?? '',
    latitude: address?.latitude ?? 0,
    longitude: address?.longitude ?? 0,
    unitApartmentNumber: address?.unitApartmentNumber ?? '',
    city: address?.city ?? '',
    stateProvince: address?.stateProvince ?? '',
    postalCode: address?.postalCode ?? '',
    country: address?.country ?? '',
  };
}
/**
 * Submits the wizard's accumulated state as a new RFQ. Reads everything it
 * needs from `getState()` (addresses, service, date, notes, specialty
 * items) rather than taking an argument, since every field it needs already
 * lives in Redux by the time the user reaches the summary/submit step.
 *
 * Payload shape matches the backend's createRfq contract exactly:
 * {
 *   serviceId: number,
 *   originAddress: { formattedAddress, placeId, latitude, longitude,
 *                     unitApartmentNumber, city, stateProvince, postalCode, country },
 *   destinationAddress: { ...same shape... },
 *   moveDate: 'YYYY-MM-DD',
 *   notes: string,
 *   specialtyItems: [{ itemName, quantity, notes }],
 *   isFlexibleDate: boolean,
 *   additionalServices: AdditionalServiceType[],
 * }
 */
export const submitMovingRequest = createAsyncThunk(
  'movingRequest/submit',
  async (_, { getState }) => {
    const state = getState() as RootState;
    const {
      fromAddress,
      toAddress,
      serviceId,
      moveDate,
      description,
      specialtyItems,
      isFlexibleDate,
      additionalServices,
    } = state.movingRequest;
    const payload = {
      serviceId: serviceId ?? undefined,
      originAddress: addressToPayload(fromAddress),
      destinationAddress: addressToPayload(toAddress),
      moveDate,
      notes: description.trim(),
      specialtyItems,
      isFlexibleDate,
      additionalServices,
    };
    const response = await apiService.post<Record<string, any>>(API_ENDPOINTS.RFQS, payload);
    const rfqId = String(response?.id ?? response?.data?.id ?? '');
    return { rfqId };
  }
);
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
    // Partial patch — used for the custom logistics fields (moveScope, unit,
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
    setServiceId: (state, action: PayloadAction<number | null>) => {
      state.serviceId = action.payload;
    },
    setMoveScopeId: (state, action: PayloadAction<number | null>) => {
      state.moveScopeId = action.payload;
    },
    setDestinationMoveScopeId: (state, action: PayloadAction<number | null>) => {
      state.destinationMoveScopeId = action.payload;
    },
    setWizardStep: (state, action: PayloadAction<number>) => {
      state.wizardStep = action.payload;
    },
    setMoveDate: (state, action: PayloadAction<string>) => {
      state.moveDate = action.payload;
    },
    setTimeWindow: (state, action: PayloadAction<string>) => {
      state.timeWindow = action.payload;
    },
    setDescription: (state, action: PayloadAction<string>) => {
      state.description = action.payload;
    },
    setSpecialtyItems: (state, action: PayloadAction<SpecialtyItem[]>) => {
      state.specialtyItems = action.payload;
    },
    addSpecialtyItem: (state, action: PayloadAction<SpecialtyItem>) => {
      state.specialtyItems.push(action.payload);
    },
    removeSpecialtyItem: (state, action: PayloadAction<number>) => {
      state.specialtyItems.splice(action.payload, 1);
    },
    setIsFlexibleDate: (state, action: PayloadAction<boolean>) => {
      state.isFlexibleDate = action.payload;
    },
    // Toggles a single chip on/off — used directly by Step2Schedule's
    // "Additional Services" chip `onPress` rather than requiring the caller
    // to compute the next array itself.
    toggleAdditionalService: (state, action: PayloadAction<AdditionalServiceType>) => {
      const service = action.payload;
      if (state.additionalServices.includes(service)) {
        state.additionalServices = state.additionalServices.filter((item) => item !== service);
      } else {
        state.additionalServices.push(service);
      }
    },
    resetMovingRequest: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(submitMovingRequest.pending, (state) => {
        state.submitting = true;
        state.submitError = null;
      })
      .addCase(submitMovingRequest.fulfilled, (state, action) => {
        state.submitting = false;
        state.submittedRfqId = action.payload.rfqId || null;
      })
      .addCase(submitMovingRequest.rejected, (state, action) => {
        state.submitting = false;
        state.submitError = action.error.message ?? 'Failed to submit your moving request';
      });
  },
});
export const {
  setAddress,
  updateAddressDetails,
  setServiceId,
  setMoveScopeId,
  setDestinationMoveScopeId,
  setWizardStep,
  setMoveDate,
  setTimeWindow,
  setDescription,
  setSpecialtyItems,
  addSpecialtyItem,
  removeSpecialtyItem,
  setIsFlexibleDate,
  toggleAdditionalService,
  resetMovingRequest,
} = movingRequestSlice.actions;
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
export const selectServiceId = (state: MovingRequestSliceState) => state.movingRequest.serviceId;
export const selectMoveScopeId = (state: MovingRequestSliceState) =>
  state.movingRequest.moveScopeId;
export const selectDestinationMoveScopeId = (state: MovingRequestSliceState) =>
  state.movingRequest.destinationMoveScopeId;
export const selectWizardStep = (state: MovingRequestSliceState) => state.movingRequest.wizardStep;
export const selectMoveDate = (state: MovingRequestSliceState) => state.movingRequest.moveDate;
export const selectTimeWindow = (state: MovingRequestSliceState) => state.movingRequest.timeWindow;

export const selectDescription = (state: MovingRequestSliceState) => state.movingRequest.description;
export const selectSpecialtyItems = (state: MovingRequestSliceState) =>
  state.movingRequest.specialtyItems;
export const selectIsFlexibleDate = (state: MovingRequestSliceState) =>
  state.movingRequest.isFlexibleDate;
export const selectAdditionalServices = (state: MovingRequestSliceState) =>
  state.movingRequest.additionalServices;
export const selectSubmitting = (state: MovingRequestSliceState) => state.movingRequest.submitting;
export const selectSubmitError = (state: MovingRequestSliceState) => state.movingRequest.submitError;
export const selectSubmittedRfqId = (state: MovingRequestSliceState) =>
  state.movingRequest.submittedRfqId;
