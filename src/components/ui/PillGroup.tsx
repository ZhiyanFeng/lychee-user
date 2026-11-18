import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks';
import { SPACING, FONT_SIZES } from '../../constants';

export interface PillOption<T extends string | number = string> {
  label: string;
  value: T;
}

interface PillGroupProps<T extends string | number = string> {
  /** Label rendered above the pill row, mirroring Input's own label. */
  label?: string;
  options: PillOption<T>[];
  /** `null` renders every pill unselected (e.g. before the user has picked one). */
  value: T | null;
  onChange: (value: T) => void;
  /**
   * `'stacked'` (default) renders the label above the options, like Input.
   * `'inline'` renders the label and the options side-by-side on one row —
   * more compact for short label/option-set pairs (e.g. "Stairs", "Parking").
   */
  layout?: 'stacked' | 'inline';
  /**
   * `'pills'` (default) renders each option as its own separate floating
   * pill. `'segmented'` renders all options tightly packed inside a single
   * bordered, light-grey container — a segmented control — with the active
   * option highlighted by a solid primary-color background. Both variants
   * report the exact same `value`/`onChange` shape, so swapping the look
   * never touches any state/payload logic.
   */
  variant?: 'pills' | 'segmented';
  /**
   * `'row'` (default) wraps pills left-to-right. `'column'` stacks each
   * pill on its own full-width row instead — useful when options have
   * longer labels that read better as a vertical list (e.g. Small Moving's
   * "What are you moving?" step).
   */
  optionsDirection?: 'row' | 'column';
}

/**
 * Compact single-select row of tappable pills (e.g. Stairs: None / 1 Flight
 * / 2+), used throughout the booking wizard wherever a short, fixed set of
 * mutually exclusive choices needs a lighter-weight UI than a full
 * dropdown/bottom sheet. Wraps onto multiple lines rather than clipping or
 * scrolling, since these option sets are always short.
 */
export function PillGroup<T extends string | number = string>({
  label,
  options,
  value,
  onChange,
  layout = 'stacked',
  variant = 'pills',
  optionsDirection = 'row',
}: PillGroupProps<T>) {
  const { colors } = useTheme();
  const isInline = layout === 'inline';
  const isSegmented = variant === 'segmented';
  const isColumn = optionsDirection === 'column';

  const optionsNode = isSegmented ? (
    <View style={[styles.segmented, { borderColor: colors.border, backgroundColor: colors.border + '26' }]}>
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            onPress={() => onChange(option.value)}
            hitSlop={4}
            style={[
              styles.segment,
              index > 0 && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.border },
              selected && { backgroundColor: colors.primary },
            ]}
          >
            <Text style={[styles.segmentText, { color: selected ? '#FFFFFF' : colors.text }]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  ) : (
    <View style={[styles.row, isColumn && styles.column]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            onPress={() => onChange(option.value)}
            hitSlop={4}
            style={[
              styles.pill,
              { borderColor: colors.border },
              isColumn && styles.pillFullWidth,
              selected && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
          >
            <Text style={[styles.pillText, { color: selected ? '#FFFFFF' : colors.text }]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  if (isInline) {
    return (
      <View style={[styles.container, styles.inlineContainer]}>
        {label && <Text style={[styles.label, styles.inlineLabel, { color: colors.text }]}>{label}</Text>}
        {optionsNode}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {label && <Text style={[styles.label, { color: colors.text }]}>{label}</Text>}
      {optionsNode}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
  },
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  inlineLabel: {
    marginBottom: 0,
    marginRight: SPACING.sm,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  column: {
    flexDirection: 'column',
    flexWrap: 'nowrap',
  },
  pill: {
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillFullWidth: {
    alignSelf: 'stretch',
  },
  pillText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  segmented: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  segment: {
    paddingVertical: SPACING.xs + 2,
    paddingHorizontal: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
});

