import { apiService } from '../services';
import { API_ENDPOINTS } from '../constants';
import type { ApiResponse, AdditionalServiceType } from '../types';
import type { ParkingType } from '../store/slices/movingRequestSlice';
import { extractErrorMessage } from './http';

export type { AdditionalServiceType };

/**
 * Address shape expected by `POST /rfqs` — matches
 * `movingRequestSlice.addressToPayload` exactly (the Residential Moving
 * wizard's proven-working contract against the same endpoint), since
 * `SmallMovingWizardScreen` now captures addresses via the same Google
 * Places autocomplete (`Step1Locations`/`Step2Schedule`) rather than plain
 * typed fields. `moveScope`/`hasElevator`/`stairsCount`/`parkingType`
 * are additional access-details fields the backend has agreed to accept
 * alongside the core address fields.
 */
export interface RfqAddressInput {
  formattedAddress: string;
  placeId: string;
  latitude: number;
  longitude: number;
  unitApartmentNumber?: string;
  city: string;
  stateProvince: string;
  postalCode: string;
  country?: string;
  moveScope?: string;
  hasElevator?: boolean | null;
  stairsCount?: number;
  parkingType?: ParkingType;
}

export interface RfqSpecialtyItemInput {
  itemName: string;
  quantity: number;
  notes?: string;
}

export interface RfqRequest {
  serviceId: number;
  originAddress: RfqAddressInput;
  destinationAddress: RfqAddressInput;
  /** 'YYYY-MM-DD' — backend's `moveDate` column is `@Future` (LocalDate). */
  moveDate: string;
  /** Delivery time window (e.g. "Morning"/"Afternoon"/"Evening"), picked in Step 2. */
  timeWindow?: string;
  notes: string;
  specialtyItems: RfqSpecialtyItemInput[];
  /**
   * Ordered S3 keys from `presignUpload`/`uploadToS3` — index in this array
   * becomes `displayOrder` server-side, so callers must send them in the
   * exact UI display order and never reorder/dedupe before submit.
   * Optional/nullable — send `[]` if no photos were added.
   */
  s3ObjectKeys: string[];
  /** "Flexible with move date (±2 days)" switch, Step 2. Optional on input — backend defaults to `false` if omitted. */
  isFlexibleDate?: boolean;
  /** Selected "Additional Services" chips, Step 2. Optional on input — backend defaults to `[]` if omitted. */
  additionalServices?: AdditionalServiceType[];
}

export interface CreateRfqResult {
  id: string;
}

/**
 * Builds an `RfqAddressInput` from the wizard's `AddressDetails` state —
 * the same shape `movingRequestSlice.addressToPayload` sends for the
 * Residential Moving wizard, plus the access-details fields this screen
 * also collects (via the reused `Step1Locations`/`Step2Schedule`).
 */
export function addressToRfqPayload(address: {
  formattedAddress: string;
  googlePlaceId: string;
  latitude: number;
  longitude: number;
  unitApartmentNumber?: string;
  city?: string;
  stateProvince?: string;
  postalCode?: string;
  country?: string;
  moveScope?: string;
  hasElevator?: boolean | null;
  stairsCount?: number;
  parkingType?: ParkingType;
} | null): RfqAddressInput {
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
    moveScope: address?.moveScope,
    hasElevator: address?.hasElevator ?? null,
    stairsCount: address?.stairsCount,
    parkingType: address?.parkingType,
  };
}

// The backend's actual create-RFQ response shape isn't pinned down by the
// spec, so this defensively accepts either the `ApiResponse<{ id }>`
// wrapper or a bare `{ id }` object (same defensive spirit as
// `openRequestSlice`'s `extractOpenRequestsArray`).
function extractRfqId(response: unknown): string {
  if (response && typeof response === 'object') {
    const obj = response as Record<string, any>;
    const id = obj.id ?? obj.data?.id;
    if (id != null) return String(id);
  }
  return '';
}

/**
 * Final wizard step: submits the completed RFQ, including the already
 * S3-uploaded photo keys. Kept as its own client (rather than reusing
 * `movingRequestSlice.submitMovingRequest`) since `SmallMovingWizardScreen`
 * keeps its draft in local component state (not Redux) and also needs to
 * send `s3ObjectKeys`/`timeWindow`, which that slice's submit thunk doesn't
 * handle.
 */
export async function createRfq(payload: RfqRequest): Promise<CreateRfqResult> {
  try {
    const response = await apiService.post<ApiResponse<Record<string, any>> | Record<string, any>>(
      API_ENDPOINTS.RFQS,
      payload
    );
    if (response && typeof response === 'object' && 'success' in response && !response.success) {
      throw new Error((response as ApiResponse<unknown>).message || 'Failed to submit your moving request');
    }
    return { id: extractRfqId(response) };
  } catch (error) {
    throw new Error(extractErrorMessage(error, 'Failed to submit your moving request'));
  }
}
