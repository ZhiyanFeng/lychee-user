import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, formatMoveScopeLabel } from '../ui';
import type { MoveScopeOption } from '../ui';
import type { AddressDetails, SpecialtyItem } from '../../store/slices/movingRequestSlice';
import { useColors } from '../../hooks/useColors';
import { formatDisplayDate } from '../../utils/date';
import { spacing } from '../../../themes';

interface Step3ReviewProps {
  fromAddress: AddressDetails | null;
  toAddress: AddressDetails | null;
  pickupMoveScope: MoveScopeOption | null;
  destinationMoveScope: MoveScopeOption | null;
  moveDate: string;
  timeWindow: string;
  notes: string;
  specialtyItems: SpecialtyItem[];
  submitError: string | null;
  /** True if the signed-in Firebase user has no `users` row yet — surfaces a
   * "Complete your profile first" banner in that case; the actual
   * Submit/Create Profile action lives in the wizard's sticky bottom
   * footer (see `BookingFlow`), not in this component. */
  needsProfile: boolean;
}

/**
 * Step 3 of the booking wizard: a read-only summary of everything captured
 * in steps 1-2, and an explainer banner for the hourly-bidding pricing model
 * (no fixed quote shown here — movers bid after reviewing logistics). The
 * final Submit/Create Profile action is rendered by the parent's sticky
 * bottom footer, not here, so it stays visible at the bottom of the screen
 * while this summary scrolls.
 */
export function Step3Review({
  fromAddress,
  toAddress,
  pickupMoveScope,
  destinationMoveScope,
  moveDate,
  timeWindow,
  notes,
  specialtyItems,
  submitError,
  needsProfile,
}: Step3ReviewProps) {
  const colors = useColors();
  const pickupLabel = pickupMoveScope ? ` (${formatMoveScopeLabel(pickupMoveScope)})` : '';
  const dropoffLabel = destinationMoveScope
    ? ` (${formatMoveScopeLabel(destinationMoveScope)})`
    : '';
  const specialtyItemsSummary = specialtyItems
    .map((item) => `${item.itemName} x${item.quantity}`)
    .join(', ');

  return (
    <View>
      <View style={[styles.card, { borderColor: colors.border }]}>
        <Text variant="body">
          📍 Pickup: {fromAddress?.formattedAddress ?? '—'}
          {pickupLabel}
        </Text>
        <Text variant="body">
          📍 Dropoff: {toAddress?.formattedAddress ?? '—'}
          {dropoffLabel}
        </Text>
        <Text variant="body">
          📅 Date: {formatDisplayDate(moveDate, '—')}
          {timeWindow ? ` (${timeWindow} Slot)` : ''}
        </Text>
        {notes.trim() ? <Text variant="body">📝 Notes: {notes.trim()}</Text> : null}
        {specialtyItemsSummary ? (
          <Text variant="body">📦 Special Items: {specialtyItemsSummary}</Text>
        ) : null}
      </View>

      <View
        style={[
          styles.banner,
          { borderColor: colors.primary, backgroundColor: `${colors.primary}1A` },
        ]}
      >
        <Text variant="body" style={[styles.bannerTitle, { color: colors.primary }]}>
          ℹ️ Hourly Bidding Model
        </Text>
        <Text variant="caption" style={{ color: colors.text, opacity: 0.8 }}>
          Movers will inspect your pickup/delivery access details and submit
          hourly bids — you pick the best offer once bids come in, rather
          than paying a fixed flat quote upfront.
        </Text>
      </View>

      {needsProfile ? (
        <View
          style={[
            styles.banner,
            { borderColor: '#FF9500', backgroundColor: '#FF95001A' },
          ]}
        >
          <Text variant="body" style={[styles.bannerTitle, { color: '#FF9500' }]}>
            ⚠️ Complete your profile first
          </Text>
          <Text variant="caption" style={{ color: colors.text, opacity: 0.8 }}>
            Movers need your name and phone number to reach you about quotes.
            Create your profile, then come back here to submit.
          </Text>
        </View>
      ) : null}

      {submitError ? (
        <Text variant="caption" style={{ color: '#FF3B30' }}>
          {submitError}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.xs,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  banner: {
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  bannerTitle: {
    fontWeight: '700',
  },
});

