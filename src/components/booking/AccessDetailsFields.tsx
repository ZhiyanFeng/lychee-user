import React from 'react';
import { PillGroup, Text } from '../ui';
import type { PillOption, PropertyTypeOption } from '../ui';
import type { AddressDetails, ParkingType } from '../../store/slices/movingRequestSlice';
import { StyleSheet } from 'react-native';
import { spacing } from '../../../themes';

// Category buckets that drive the "Dynamic Conditional Swap": Apartment/
// Storage buildings ask Elevator first (Stairs only follows if there's no
// elevator), while House/Townhouse skip Elevator entirely and go straight
// to a plain Stairs count.
const ELEVATOR_CATEGORIES = new Set(['Apartment', 'Storage']);
const STAIRS_ONLY_CATEGORIES = new Set(['House', 'Townhouse']);

const ELEVATOR_OPTIONS: PillOption<'yes' | 'no'>[] = [
  { label: 'Yes', value: 'yes' },
  { label: 'No (Walk-up)', value: 'no' },
];
// Apartment/Storage: only shown once the user says there's no elevator, so
// there's always at least one flight — no "None" option here.
const WALKUP_STAIRS_OPTIONS: PillOption<number>[] = [
  { label: '1 Flight', value: 1 },
  { label: '2 Flights', value: 2 },
  { label: '3+ Flights', value: 3 },
];
const HOUSE_STAIRS_OPTIONS: PillOption<number>[] = [
  { label: 'None', value: 0 },
  { label: '1 Flight', value: 1 },
  { label: '2+ Flights', value: 2 },
];
const APARTMENT_PARKING_OPTIONS: PillOption<ParkingType>[] = [
  { label: 'Building Lot / Bay', value: 'loading_bay' },
  { label: 'Street', value: 'street' },
];
const HOUSE_PARKING_OPTIONS: PillOption<ParkingType>[] = [
  { label: 'Driveway', value: 'driveway' },
  { label: 'Street', value: 'street' },
];

interface AccessDetailsFieldsProps {
  /** Section heading, e.g. "Pickup Access Details" / "Destination Access Details". */
  label: string;
  address: AddressDetails;
  propertyType: PropertyTypeOption;
  onChangeElevator: (hasElevator: boolean) => void;
  onChangeStairs: (count: number) => void;
  onChangeParking: (parkingType: ParkingType) => void;
}

/**
 * The single source of truth for the "Dynamic Conditional Swap" access-detail
 * rules, shared by both Step 1 (pickup) and Step 2 (destination) so the two
 * steps can never drift out of sync:
 *   - Apartment / Storage: Elevator (Yes/No) first; Stairs only appears once
 *     "No (Walk-up)" is chosen, and hides completely otherwise. Parking
 *     offers Building Lot/Bay or Street.
 *   - House / Townhouse: no Elevator field — just a plain Stairs count
 *     (None/1/2+) and Driveway/Street parking.
 *
 * Callers are expected to only render this once a property type has been
 * chosen (progressive disclosure lives at the call site, since the section
 * heading itself is only meaningful once there's something to show).
 */
export function AccessDetailsFields({
  label,
  address,
  propertyType,
  onChangeElevator,
  onChangeStairs,
  onChangeParking,
}: AccessDetailsFieldsProps) {
  const category = propertyType.category;
  const isElevatorCategory = ELEVATOR_CATEGORIES.has(category);
  const isStairsOnlyCategory = STAIRS_ONLY_CATEGORIES.has(category);

  const renderFields = () => {
    if (isElevatorCategory) {
      const elevatorValue =
        address.hasElevator === true ? 'yes' : address.hasElevator === false ? 'no' : null;
      return (
        <>
          <PillGroup
            label="Elevator"
            options={ELEVATOR_OPTIONS}
            value={elevatorValue}
            onChange={(value) => onChangeElevator(value === 'yes')}
            layout="inline"
            variant="segmented"
          />
          {/* Stairs only matters once we know there's no elevator — hidden
              completely (rather than just disabled) when there is one. */}
          {elevatorValue === 'no' && (
            <PillGroup
              label="Stairs"
              options={WALKUP_STAIRS_OPTIONS}
              value={address.stairsCount ?? null}
              onChange={onChangeStairs}
              layout="inline"
              variant="segmented"
            />
          )}
          <PillGroup
            label="Parking"
            options={APARTMENT_PARKING_OPTIONS}
            value={address.parkingType ?? null}
            onChange={onChangeParking}
            layout="inline"
            variant="segmented"
          />
        </>
      );
    }

    // House/Townhouse, or any other category not in either bucket (e.g. an
    // "Office" catalog entry) — fall back to the simpler House-style
    // stairs/parking pills rather than showing nothing.
    void isStairsOnlyCategory; // both branches render identically; kept for clarity/future divergence
    return (
      <>
        <PillGroup
          label="Stairs"
          options={HOUSE_STAIRS_OPTIONS}
          value={address.stairsCount ?? 0}
          onChange={onChangeStairs}
          layout="inline"
          variant="segmented"
        />
        <PillGroup
          label="Parking"
          options={HOUSE_PARKING_OPTIONS}
          value={address.parkingType ?? null}
          onChange={onChangeParking}
          layout="inline"
          variant="segmented"
        />
      </>
    );
  };

  return (
    <>
      <Text variant="body" style={styles.sectionLabel}>
        {label}
      </Text>
      {renderFields()}
    </>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontWeight: '600',
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
});

