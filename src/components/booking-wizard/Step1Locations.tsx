import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AddressAutocompleteInput, PropertyTypeSelector } from '../ui';
import type { GooglePlaceSelection, PropertyTypeOption } from '../ui';
import type { AddressDetails, ParkingType } from '../../store/slices/movingRequestSlice';
import { AccessDetailsFields } from './AccessDetailsFields';
import { spacing } from '../../../themes';


interface Step1LocationsProps {
  fromAddress: AddressDetails | null;
  toAddress: AddressDetails | null;
  pickupPropertyType: PropertyTypeOption | null;
  propertyCategories: string[];
  propertyTypes: PropertyTypeOption[];
  onSelectPlace: (slot: 'from' | 'to', place: GooglePlaceSelection) => void;
  onSelectPickupPropertyType: (option: PropertyTypeOption) => void;
  onChangePickupElevator: (hasElevator: boolean) => void;
  onChangePickupStairs: (count: number) => void;
  onChangePickupParking: (parkingType: ParkingType) => void;
}

/**
 * Step 1 of the booking wizard: pickup address + property type + access
 * details, and the destination address. Purely presentational — all state
 * lives in `<BookingFlow />` so it survives moving back and forth between
 * steps (and so layout-changing updates can be wrapped in
 * `LayoutAnimation.configureNext` right at the source).
 *
 * "Pickup Access Details" stays completely hidden until a property type is
 * chosen, then dynamically swaps fields based on its `category` (Dynamic
 * Conditional Swap):
 *   - Apartment / Storage: Elevator (Yes/No) first; Stairs only appears
 *     (and only then) once "No (Walk-up)" is chosen. Parking offers
 *     Building Lot/Bay or Street.
 *   - House / Townhouse: no Elevator field at all — just a plain Stairs
 *     count (None/1/2+) and Driveway/Street parking.
 */
export function Step1Locations({
  fromAddress,
  toAddress,
  pickupPropertyType,
  propertyCategories,
  propertyTypes,
  onSelectPlace,
  onSelectPickupPropertyType,
  onChangePickupElevator,
  onChangePickupStairs,
  onChangePickupParking,
}: Step1LocationsProps) {
  return (
    <View>
      <View style={styles.section}>
        <AddressAutocompleteInput
          label="Pickup Address"
          placeholder="Search pickup address..."
          value={fromAddress?.formattedAddress}
          zIndex={2}
          onSelectPlace={(place) => onSelectPlace('from', place)}
        />
        {/* Only actionable once a pickup address has actually been resolved
            (fromAddress is only set via onSelectPlace, never raw typed
            text) — property type/access details aren't meaningful before then. */}
        {fromAddress && (
          <>
            <PropertyTypeSelector
              label="Pickup Property Type"
              categories={propertyCategories}
              options={propertyTypes}
              value={pickupPropertyType}
              onSelectPropertyType={onSelectPickupPropertyType}
              placeholder="Select property type"
            />
            {/* Progressive disclosure: Access Details stay hidden entirely
                until a property type is chosen. */}
            {pickupPropertyType && (
              <AccessDetailsFields
                label="Pickup Access Details"
                address={fromAddress}
                propertyType={pickupPropertyType}
                onChangeElevator={onChangePickupElevator}
                onChangeStairs={onChangePickupStairs}
                onChangeParking={onChangePickupParking}
              />
            )}
          </>
        )}
      </View>
      <AddressAutocompleteInput
        label="Destination Address"
        placeholder="Search destination address..."
        value={toAddress?.formattedAddress}
        zIndex={1}
        onSelectPlace={(place) => onSelectPlace('to', place)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.md,
  },
});
