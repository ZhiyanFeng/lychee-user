import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AddressAutocompleteInput, MoveScopeSelector } from '../ui';
import type { GooglePlaceSelection, MoveScopeOption } from '../ui';
import type { AddressDetails, ParkingType } from '../../store/slices/movingRequestSlice';
import { AccessDetailsFields } from './AccessDetailsFields';
import { estimateRoute } from '../../utils/route';


interface Step1LocationsProps {
  fromAddress: AddressDetails | null;
  toAddress: AddressDetails | null;
  pickupMoveScope: MoveScopeOption | null;
  destinationMoveScope: MoveScopeOption | null;
  propertyCategories: string[];
  moveScopes: MoveScopeOption[];
  onSelectPlace: (slot: 'from' | 'to', place: GooglePlaceSelection) => void;
  onSelectPickupMoveScope: (option: MoveScopeOption) => void;
  onChangePickupElevator: (hasElevator: boolean) => void;
  onChangePickupStairs: (count: number) => void;
  onChangePickupParking: (parkingType: ParkingType) => void;
  onSelectDestinationMoveScope: (option: MoveScopeOption) => void;
  onChangeDestinationElevator: (hasElevator: boolean) => void;
  onChangeDestinationStairs: (count: number) => void;
  onChangeDestinationParking: (parkingType: ParkingType) => void;
  /**
   * Overrides for the move-scope picker's label/placeholder — the
   * Residential wizard (`BookingFlow`) calls this "Property Type" since its
   * picker only ever offers House/Apartment/Townhouse/Storage categories,
   * while the Small Moving wizard keeps the "Move Scope" wording (its own
   * Step 1 already asks "What Are You Moving?" up front). Defaults preserve
   * the original Small Moving wording so that wizard is unaffected.
   */
  pickupLabel?: string;
  pickupPlaceholder?: string;
  destinationLabel?: string;
  destinationPlaceholder?: string;
  /**
   * Renders the Pickup/Destination Move Scope pickers as read-only summary
   * text instead of interactive dropdowns — used by the Small Moving
   * wizard, where the move scope is already locked in by its own Step 1
   * ("What Are You Moving?") and shouldn't be changeable again here.
   * Defaults to `false` so the Residential wizard (`BookingFlow`), which
   * has no earlier move-scope step, is unaffected.
   */
  moveScopeReadOnly?: boolean;
}

/**
 * Step 1 of the booking wizard — "Pickup & Route": a Pickup card (address +
 * move scope + access details) and a mirrored Destination card (address,
 * then once resolved, the same move scope + access fields), plus a compact
 * Route Summary banner once both addresses are in. Purely presentational —
 * all state lives in the parent wizard (`<BookingFlow />` /
 * `<SmallMovingWizardScreen />`) so it survives moving back and forth
 * between steps (and so layout-changing updates can be wrapped in
 * `LayoutAnimation.configureNext` right at the source).
 *
 * Both cards' "Access Details" stay completely hidden until their move
 * scope is chosen, then dynamically swap fields based on its `category`
 * (Dynamic Conditional Swap), via the shared `<AccessDetailsFields />`:
 *   - Apartment / Storage: Elevator (Yes/No) first; Stairs only appears
 *     (and only then) once "No (Walk-up)" is chosen. Parking offers
 *     Building Lot/Bay or Street.
 *   - House / Townhouse: no Elevator field at all — just a plain Stairs
 *     count (None/1/2+) and Driveway/Street parking.
 */
export function Step1Locations({
  fromAddress,
  toAddress,
  pickupMoveScope,
  destinationMoveScope,
  propertyCategories,
  moveScopes,
  onSelectPlace,
  onSelectPickupMoveScope,
  onChangePickupElevator,
  onChangePickupStairs,
  onChangePickupParking,
  onSelectDestinationMoveScope,
  onChangeDestinationElevator,
  onChangeDestinationStairs,
  onChangeDestinationParking,
  pickupLabel = 'Pickup Move Scope',
  pickupPlaceholder = 'Select move scope',
  destinationLabel = 'Destination Move Scope',
  destinationPlaceholder = 'Select destination move scope',
  moveScopeReadOnly = false,
}: Step1LocationsProps) {
  // Only meaningful once both addresses have resolved to real coordinates
  // (never while either is still raw typed text).
  const routeEstimate = useMemo(() => {
    if (!fromAddress || !toAddress) return null;
    return estimateRoute(fromAddress, toAddress);
  }, [fromAddress, toAddress]);

  return (
    <View>
      <View className="bg-white border border-gray-200 rounded-2xl p-4 mb-4">
        <AddressAutocompleteInput
          label="Pickup Address"
          placeholder="Search pickup address..."
          value={fromAddress?.formattedAddress}
          zIndex={2}
          onSelectPlace={(place) => onSelectPlace('from', place)}
        />
        {/* Only actionable once a pickup address has actually been resolved
            (fromAddress is only set via onSelectPlace, never raw typed
            text) — move scope/access details aren't meaningful before then. */}
        {fromAddress && (
          <>
            <MoveScopeSelector
              label={pickupLabel}
              categories={propertyCategories}
              options={moveScopes}
              value={pickupMoveScope}
              onSelectMoveScope={onSelectPickupMoveScope}
              placeholder={pickupPlaceholder}
              readOnly={moveScopeReadOnly}
            />
            {/* Progressive disclosure: Access Details stay hidden entirely
                until a move scope is chosen. */}
            {pickupMoveScope && (
              <AccessDetailsFields
                label="Pickup Access Details"
                address={fromAddress}
                moveScope={pickupMoveScope}
                onChangeElevator={onChangePickupElevator}
                onChangeStairs={onChangePickupStairs}
                onChangeParking={onChangePickupParking}
              />
            )}
          </>
        )}
      </View>

      <View className="bg-white border border-gray-200 rounded-2xl p-4 mb-4">
        <AddressAutocompleteInput
          label="Destination Address"
          placeholder="Search destination address..."
          value={toAddress?.formattedAddress}
          zIndex={1}
          onSelectPlace={(place) => onSelectPlace('to', place)}
        />
        {/* Mirrors the Pickup card above: hidden entirely until a
            destination address has resolved, then the same progressive
            move-scope → access-details disclosure. */}
        {toAddress && (
          <>
            <MoveScopeSelector
              label={destinationLabel}
              categories={propertyCategories}
              options={moveScopes}
              value={destinationMoveScope}
              onSelectMoveScope={onSelectDestinationMoveScope}
              placeholder={destinationPlaceholder}
              readOnly={moveScopeReadOnly}
            />
            {destinationMoveScope && (
              <AccessDetailsFields
                label="Destination Access Details"
                address={toAddress}
                moveScope={destinationMoveScope}
                onChangeElevator={onChangeDestinationElevator}
                onChangeStairs={onChangeDestinationStairs}
                onChangeParking={onChangeDestinationParking}
              />
            )}
          </>
        )}
      </View>

      {routeEstimate && (
        <View className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex-row justify-between items-center mb-4">
          <View className="flex-row items-center">
            <Feather name="map" size={16} color="#1D4ED8" />
            <Text className="ml-2 text-blue-800 font-medium">
              {routeEstimate.distanceKm.toFixed(1)} km
            </Text>
          </View>
          <View className="flex-row items-center">
            <Feather name="clock" size={16} color="#1D4ED8" />
            <Text className="ml-2 text-blue-800 font-medium">
              {Math.round(routeEstimate.durationMinutes)} mins
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}
