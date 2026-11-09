import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../hooks';
import { SPACING, FONT_SIZES } from '../../constants';

interface BookingHeaderProps {
  /** Concise screen title, e.g. "Pickup & Route". */
  title: string;
  step: number;
  totalSteps: number;
  onBack: () => void;
}

/**
 * Unified wizard header — "Option B: Minimal Header Title + Badge".
 * Replaces the old `← Step X of Y` + `X/Y` text ProgressBar with a single
 * compact top bar (back arrow + bold title, and a rounded step-fraction
 * badge on the right) plus a full-width accent progress bar underneath.
 * Rendered inline in each step's scroll content (not the native Stack
 * header) so the back chevron can step backward through the form.
 */
export function BookingHeader({ title, step, totalSteps, onBack }: BookingHeaderProps) {
  const { colors } = useTheme();
  const progress = Math.min(1, Math.max(0, step / totalSteps));

  return (
    <View style={styles.headerContainer}>
      <View style={styles.topRow}>
        <Pressable onPress={onBack} hitSlop={12} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={colors.text} />
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {title}
          </Text>
        </Pressable>

        <View style={[styles.badge, { backgroundColor: colors.border }]}>
          <Text style={[styles.badgeText, { color: colors.text }]}>
            {step}/{totalSteps}
          </Text>
        </View>
      </View>

      <View style={[styles.progressBarTrack, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.progressBarFill,
            { backgroundColor: colors.primary, width: `${progress * 100}%` },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingBottom: SPACING.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flexShrink: 1,
    // Keeps the tap target comfortably above the 44px minimum even though
    // the visual row is compact.
    paddingVertical: SPACING.xs,
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    flexShrink: 1,
  },
  badge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  progressBarTrack: {
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
  },
});

