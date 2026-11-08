import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks';
import { SPACING, FONT_SIZES } from '../../constants';
import { fromISODate, getMonthGrid, isSameDay, startOfDay, toISODate, tomorrow, WEEKDAY_LABELS } from '../../utils/date';

interface DatePickerModalProps {
  visible: boolean;
  /** Currently selected date as 'YYYY-MM-DD', or '' if none picked yet. */
  value: string;
  onSelect: (value: string) => void;
  onClose: () => void;
  /**
   * Defaults to tomorrow — the backend's `moveDate` column is `@Future`
   * (`LocalDate`), which rejects today's date, not just past dates, so
   * today must be unselectable here too.
   */
  minimumDate?: Date;
}

const MONTH_LABEL_FORMAT: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' };

/**
 * Bottom-sheet-style month calendar for picking the move date — deliberately
 * not a raw text input, per the wizard's "no typed dates" requirement. Built
 * on the same `Modal` (transparent + slide-up) pattern as
 * `PropertyTypeSelector` rather than a native date-picker library, since
 * none is installed in this project.
 */
export function DatePickerModal({ visible, value, onSelect, onClose, minimumDate }: DatePickerModalProps) {
  const { colors } = useTheme();
  // The earliest selectable day — tomorrow by default, since the backend
  // rejects today's date (`@Future`, not `@FutureOrPresent`).
  const earliestSelectable = useMemo(() => minimumDate ?? tomorrow(), [minimumDate]);
  const today = useMemo(() => startOfDay(new Date()), []);
  const selected = useMemo(() => fromISODate(value), [value]);
  const [cursor, setCursor] = useState(() => selected ?? earliestSelectable);

  // Re-sync the visible month whenever the sheet is (re)opened, so it
  // always starts on the selected date's month (or the earliest selectable
  // month, if none chosen yet).
  useEffect(() => {
    if (visible) {
      setCursor(selected ?? earliestSelectable);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const grid = useMemo(() => getMonthGrid(cursor.getFullYear(), cursor.getMonth()), [cursor]);
  const monthLabel = cursor.toLocaleDateString('en-US', MONTH_LABEL_FORMAT);

  const goToPreviousMonth = () => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1));
  const goToNextMonth = () => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1));

  const handleSelectDay = (day: Date) => {
    if (day < earliestSelectable) return; // today and past dates aren't bookable
    onSelect(toISODate(day));
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.background }]}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Select Move Date</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={{ color: colors.text, fontSize: FONT_SIZES.lg }}>✕</Text>
            </Pressable>
          </View>

          <View style={styles.monthRow}>
            <Pressable onPress={goToPreviousMonth} hitSlop={12} style={styles.monthArrow}>
              <Feather name="chevron-left" size={22} color={colors.text} />
            </Pressable>
            <Text style={[styles.monthLabel, { color: colors.text }]}>{monthLabel}</Text>
            <Pressable onPress={goToNextMonth} hitSlop={12} style={styles.monthArrow}>
              <Feather name="chevron-right" size={22} color={colors.text} />
            </Pressable>
          </View>

          <View style={styles.weekdayRow}>
            {WEEKDAY_LABELS.map((label, index) => (
              <Text
                key={`${label}-${index}`}
                style={[styles.weekdayLabel, { color: colors.text, opacity: 0.6 }]}
              >
                {label}
              </Text>
            ))}
          </View>

          <View style={styles.grid}>
            {grid.map(({ date, inCurrentMonth }) => {
              // "Disabled" covers today too (not just the actual past),
              // since the backend's `@Future` moveDate column rejects today.
              const isDisabled = date < earliestSelectable;
              const isSelected = selected ? isSameDay(date, selected) : false;
              const isToday = isSameDay(date, today);
              return (
                <Pressable
                  key={date.toISOString()}
                  onPress={() => handleSelectDay(date)}
                  disabled={isDisabled}
                  style={[
                    styles.day,
                    isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
                    isToday && !isSelected && { borderColor: colors.primary },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      {
                        color: isSelected ? '#FFFFFF' : colors.text,
                        opacity: isDisabled || !inCurrentMonth ? 0.35 : 1,
                      },
                    ]}
                  >
                    {date.getDate()}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const DAY_SIZE = 40;

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xl,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: SPACING.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  sheetTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  monthArrow: {
    padding: SPACING.xs,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  weekdayRow: {
    flexDirection: 'row',
  },
  weekdayLabel: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  day: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    maxHeight: DAY_SIZE + SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: DAY_SIZE / 2,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dayText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
});

