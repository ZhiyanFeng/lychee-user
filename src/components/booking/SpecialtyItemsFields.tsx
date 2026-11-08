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

  const canAdd = draftName.trim().length > 0 && draftQuantity > 0;

  const handleAdd = () => {
    const itemName = draftName.trim();
    if (!itemName || draftQuantity <= 0) return;
    onAdd({ itemName, quantity: draftQuantity, notes: '' });
    onChangeDraftName('');
    onChangeDraftQuantity(0);
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.text }]}>Heavy / Special Items (optional)</Text>

      {items.map((item, index) => (
        <View key={`${item.itemName}-${index}`} style={[styles.row, { borderColor: colors.border }]}>
          <View style={styles.rowText}>
            <Text style={[styles.rowTitle, { color: colors.text }]}>
              {item.itemName} × {item.quantity}
            </Text>
          </View>
          <Pressable onPress={() => onRemove(index)} hitSlop={12} style={styles.removeButton}>
            <Feather name="x" size={18} color={colors.text} />
          </Pressable>
        </View>
      ))}

      <View style={[styles.draftCard, { borderColor: colors.border }]}>
        <View style={styles.draftRow}>
          <TextInput
            value={draftName}
            onChangeText={onChangeDraftName}
            placeholder="e.g. Piano, safe, treadmill..."
            placeholderTextColor={colors.border}
            style={[
              styles.draftInput,
              styles.nameInput,
              { color: colors.text, borderColor: colors.border },
            ]}
          />
          <View style={styles.stepper}>
            <Pressable
              onPress={() => onChangeDraftQuantity(Math.max(0, draftQuantity - 1))}
              hitSlop={8}
              style={[styles.stepperButton, { borderColor: colors.border }]}
            >
              <Feather name="minus" size={16} color={colors.text} />
            </Pressable>
            <Text style={[styles.stepperValue, { color: colors.text }]}>{draftQuantity}</Text>
            <Pressable
              onPress={() => onChangeDraftQuantity(draftQuantity + 1)}
              hitSlop={8}
              style={[styles.stepperButton, { borderColor: colors.border }]}
            >
              <Feather name="plus" size={16} color={colors.text} />
            </Pressable>
          </View>
        </View>

        <Pressable
          onPress={handleAdd}
          disabled={!canAdd}
          style={[
            styles.addButton,
            { borderColor: colors.primary },
            !canAdd && styles.addButtonDisabled,
          ]}
        >
          <Feather name="plus-circle" size={18} color={colors.primary} />
          <Text style={[styles.addButtonText, { color: colors.primary }]}>Add Item</Text>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    padding: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  rowText: {
    flex: 1,
    paddingRight: SPACING.sm,
  },
  rowTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  removeButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  draftCard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: SPACING.sm,
    gap: SPACING.sm,
  },
  draftInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZES.md,
    minHeight: 44,
  },
  draftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  nameInput: {
    flex: 1,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  stepperButton: {
    width: 36,
    height: 36,
    borderWidth: 1,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    minWidth: 24,
    textAlign: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    borderWidth: 1,
    borderRadius: 8,
    minHeight: 44,
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
});

