import React from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { SpecialtyItem } from '../../store/slices/movingRequestSlice';
import { useTheme } from '../../hooks';
import { SPACING, FONT_SIZES } from '../../constants';

interface SpecialtyItemsFieldsProps {
  items: SpecialtyItem[];
  onAdd: (item: SpecialtyItem) => void;
  onRemove: (index: number) => void;
  /**
   * The "add a new item" draft row (name + quantity, before it's committed
   * to `items` via `onAdd`) is controlled from the parent — like every
   * other field in the booking wizard — rather than held in this
   * component's own local state. `Step2Schedule` is conditionally mounted
   * (only rendered while `step === 2`), so a draft kept in local state here
   * would be silently wiped the moment the user taps "Next"/"Back" before
   * pressing "Add Item".
   */
  draftName: string;
  onChangeDraftName: (name: string) => void;
  draftQuantity: number;
  onChangeDraftQuantity: (quantity: number) => void;
}

/**
 * Structured "heavy / special items" list — sent to the backend as the
 * `specialtyItems` array (distinct from the general free-text `notes`
 * field). Lets the user add any number of rows, each with an item name and
 * a +/- quantity stepper (minimum 1), then remove any row via its ✕
 * button. Per-item notes were removed to avoid duplicating the overarching
 * "Notes for Movers" free-text field directly above this section — extra
 * details about a heavy item (e.g. "Upright piano, heavy") belong there
 * instead. `notes` is still sent per item (as `""`) so the backend payload
 * shape is unchanged.
 */
export function SpecialtyItemsFields({
  items,
  onAdd,
  onRemove,
  draftName,
  onChangeDraftName,
  draftQuantity,
  onChangeDraftQuantity,
}: SpecialtyItemsFieldsProps) {
  const { colors } = useTheme();

  const canAdd = draftName.trim().length > 0 && draftQuantity >= 1;

  const handleAdd = () => {
    const itemName = draftName.trim();
    if (!itemName || draftQuantity < 1) return;
    onAdd({ itemName, quantity: draftQuantity, notes: '' });
    onChangeDraftName('');
    onChangeDraftQuantity(1);
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.text }]}>Heavy / Special Items (optional)</Text>

      <View className="flex-row flex-wrap gap-2 mb-2">
        {items.map((item, index) => (
          <View
            key={`${item.itemName}-${index}`}
            className="flex-row items-center bg-gray-100 border border-gray-200 rounded-full pl-3 pr-1 py-1"
          >
            <Text className="text-gray-800 font-medium mr-1">
              {item.itemName} × {item.quantity}
            </Text>
            <Pressable onPress={() => onRemove(index)} hitSlop={12} className="p-1">
              <Feather name="x" size={16} color="#374151" />
            </Pressable>
          </View>
        ))}
      </View>

      <View className="gap-2">
        <View className="flex-row items-center gap-2">
          <TextInput
            value={draftName}
            onChangeText={onChangeDraftName}
            placeholder="e.g. Piano, safe, treadmill..."
            placeholderTextColor="#6B7280"
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-base text-gray-900"
          />
          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={() => onChangeDraftQuantity(Math.max(1, draftQuantity - 1))}
              hitSlop={8}
              className="w-9 h-9 border border-gray-200 rounded-full items-center justify-center"
            >
              <Feather name="minus" size={16} color="#374151" />
            </Pressable>
            <Text className="text-base font-semibold text-gray-900 min-w-[24px] text-center">
              {draftQuantity}
            </Text>
            <Pressable
              onPress={() => onChangeDraftQuantity(draftQuantity + 1)}
              hitSlop={8}
              className="w-9 h-9 border border-gray-200 rounded-full items-center justify-center"
            >
              <Feather name="plus" size={16} color="#374151" />
            </Pressable>
          </View>
        </View>

        <Pressable
          onPress={handleAdd}
          disabled={!canAdd}
          className={`flex-row items-center justify-center gap-1 border rounded-xl min-h-[44px] ${
            canAdd ? 'border-blue-600' : 'border-gray-200 opacity-50'
          }`}
        >
          <Feather name="plus-circle" size={18} color={canAdd ? '#2563EB' : '#9CA3AF'} />
          <Text className={`font-semibold ${canAdd ? 'text-blue-600' : 'text-gray-400'}`}>
            Add Item
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
});

