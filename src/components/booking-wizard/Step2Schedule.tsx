import React, { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Input, PropertyTypeSelector, PillGroup, Text } from '../ui';
import type { PropertyTypeOption, PillOption } from '../ui';
import type { AddressDetails, ParkingType, SpecialtyItem } from '../../store/slices/movingRequestSlice';
import { AccessDetailsFields } from './AccessDetailsFields';
import { DatePickerModal } from './DatePickerModal';
import { SpecialtyItemsFields } from './SpecialtyItemsFields';
import { useTheme } from '../../hooks';
import { formatDisplayDate } from '../../utils/date';
import { spacing } from '../../../themes';
import { SPACING, FONT_SIZES } from '../../constants';

const TIME_WINDOW_OPTIONS: PillOption<string>[] = [
  { label: 'Morning', value: 'Morning' },
  { label: 'Afternoon', value: 'Afternoon' },
  { label: 'Evening', value: 'Evening' },
];

interface Step2ScheduleProps {
  toAddress: AddressDetails | null;
  destinationPropertyType: PropertyTypeOption | null;
  propertyCategories: string[];
  propertyTypes: PropertyTypeOption[];
  onSelectDestinationPropertyType: (option: PropertyTypeOption) => void;
  onChangeDestinationElevator: (hasElevator: boolean) => void;
  onChangeDestinationStairs: (count: number) => void;
  onChangeDestinationParking: (parkingType: ParkingType) => void;
  moveDate: string;
  onChangeMoveDate: (value: string) => void;
  timeWindow: string;
  onChangeTimeWindow: (value: string) => void;
  notes: string;
  onChangeNotes: (text: string) => void;
  specialtyItems: SpecialtyItem[];
  onAddSpecialtyItem: (item: SpecialtyItem) => void;
  onRemoveSpecialtyItem: (index: number) => void;
  specialtyItemDraftName: string;
  onChangeSpecialtyItemDraftName: (name: string) => void;
  specialtyItemDraftQuantity: number;
  onChangeSpecialtyItemDraftQuantity: (quantity: number) => void;
}

/**
 * Step 2 of the booking wizard: destination property type + access details
 * (progressive disclosure + the same Dynamic Conditional Swap rules as Step
 * 1, via the shared `<AccessDetailsFields />`), the move date (picked from a
 * calendar sheet — never a raw text input), a coarse delivery time window, a
 * structured heavy/special items list (added via `<SpecialtyItemsFields />`),
 * and finally a general free-text note to movers — placed last, directly
 * above the wizard's "Next" button, since it's the catch-all for anything
 * not captured by the structured fields above it. Purely presentational.
 */
export function Step2Schedule({
  toAddress,
  destinationPropertyType,
  propertyCategories,
  propertyTypes,
  onSelectDestinationPropertyType,
  onChangeDestinationElevator,
  onChangeDestinationStairs,
  onChangeDestinationParking,
  moveDate,
  onChangeMoveDate,
  timeWindow,
  onChangeTimeWindow,
  notes,
  onChangeNotes,
  specialtyItems,
  onAddSpecialtyItem,
  onRemoveSpecialtyItem,
  specialtyItemDraftName,
  onChangeSpecialtyItemDraftName,
  specialtyItemDraftQuantity,
  onChangeSpecialtyItemDraftQuantity,
}: Step2ScheduleProps) {
  const { colors } = useTheme();
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  return (
    <View>
      <View style={styles.section}>
        <PropertyTypeSelector
          label="Destination Property Type"
          categories={propertyCategories}
          options={propertyTypes}
          value={destinationPropertyType}
          onSelectPropertyType={onSelectDestinationPropertyType}
          placeholder="Select destination property type"
        />
        {/* Progressive disclosure: hidden entirely until a property type is
            chosen, then swaps fields using the exact same rules as Step 1. */}
        {toAddress && destinationPropertyType && (
          <AccessDetailsFields
            label="Destination Access Details"
            address={toAddress}
            propertyType={destinationPropertyType}
            onChangeElevator={onChangeDestinationElevator}
            onChangeStairs={onChangeDestinationStairs}
            onChangeParking={onChangeDestinationParking}
          />
        )}
      </View>

      <Text style={[styles.label, styles.moveDateLabel, { color: colors.text }]}>Move Date</Text>
      <Pressable
        onPress={() => setDatePickerVisible(true)}
        style={[styles.dateTrigger, { borderColor: colors.border, backgroundColor: colors.background }]}
      >
        <View style={styles.dateTriggerLeft}>
          <Feather name="calendar" size={18} color={colors.text} />
          <Text style={[styles.dateTriggerText, { color: moveDate ? colors.text : colors.border }]}>
            {formatDisplayDate(moveDate)}
          </Text>
        </View>
        <Text style={{ color: colors.text }}>▼</Text>
      </Pressable>
      <DatePickerModal
        visible={datePickerVisible}
        value={moveDate}
        onSelect={onChangeMoveDate}
        onClose={() => setDatePickerVisible(false)}
      />

      <PillGroup
        label="Time Window"
        options={TIME_WINDOW_OPTIONS}
        value={timeWindow || null}
        onChange={onChangeTimeWindow}
        layout="inline"
        variant="segmented"
      />
      <SpecialtyItemsFields
        items={specialtyItems}
        onAdd={onAddSpecialtyItem}
        onRemove={onRemoveSpecialtyItem}
        draftName={specialtyItemDraftName}
        onChangeDraftName={onChangeSpecialtyItemDraftName}
        draftQuantity={specialtyItemDraftQuantity}
        onChangeDraftQuantity={onChangeSpecialtyItemDraftQuantity}
      />
      <View style={styles.notesSection}>
        <Input
          label="Notes for Movers (optional)"
          placeholder="e.g. Please bring extra movers, gate code is 1234..."
          value={notes}
          onChangeText={onChangeNotes}
          multiline
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  moveDateLabel: {
    marginTop: SPACING.xs,
  },
  notesSection: {
    marginTop: spacing.sm,
  },
  dateTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    height: 44,
    marginBottom: SPACING.sm,
  },
  dateTriggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  dateTriggerText: {
    fontSize: FONT_SIZES.md,
  },
});
