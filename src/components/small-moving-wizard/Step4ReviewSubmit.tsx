import React from 'react';
import { View, Image, StyleSheet, Pressable } from 'react-native';
import { Text, formatMoveScopeLabel } from '../ui';
import type { MoveScopeOption } from '../ui';
import type { AddressDetails } from '../../store/slices/movingRequestSlice';
import type { RfqPhotoItem } from '../../hooks/useRfqPhotoUpload';
import { useTheme } from '../../hooks';
import { formatDisplayDate } from '../../utils/date';
import { SPACING, FONT_SIZES } from '../../constants';

interface Step4ReviewSubmitProps {
  moveType: MoveScopeOption | null;
  fromAddress: AddressDetails | null;
  toAddress: AddressDetails | null;
  pickupMoveScope: MoveScopeOption | null;
  destinationMoveScope: MoveScopeOption | null;
  moveDate: string;
  timeWindow: string;
  notes: string;
  photos: RfqPhotoItem[];
  submitError: string | null;
  /** Mirrors `Step3Review`'s `needsProfile` — true when the signed-in user
   * has no backend `users` row yet, so Submit is replaced by "Create
   * Profile" in the wizard's sticky bottom footer (see
   * `SmallMovingWizardScreen`). */
  needsProfile: boolean;
  onEditMoveType: () => void;
  onEditAddresses: () => void;
  onEditSchedule: () => void;
  onEditPhotos: () => void;
}

/**
 * Step 5 of `SmallMovingWizardScreen`: a read-only summary of everything
 * captured in Steps 1-4 (the move-type choice, plus the same
 * address/move-scope/access details/schedule fields as the Residential
 * wizard's `Step3Review`) plus the uploaded photo thumbnails, with "Edit"
 * shortcuts jumping back to any earlier step. The final Submit RFQ action
 * is rendered by the parent's sticky bottom footer (see
 * `SmallMovingWizardScreen`), not here, so it stays visible at the bottom
 * of the screen while this summary scrolls.
 */
export function Step4ReviewSubmit({
  moveType,
  fromAddress,
  toAddress,
  pickupMoveScope,
  destinationMoveScope,
  moveDate,
  timeWindow,
  notes,
  photos,
  submitError,
  needsProfile,
  onEditMoveType,
  onEditAddresses,
  onEditSchedule,
  onEditPhotos,
}: Step4ReviewSubmitProps) {
  const { colors } = useTheme();
  const uploadedPhotos = photos.filter((p) => p.status === 'uploaded');
  const pickupLabel = pickupMoveScope ? ` (${formatMoveScopeLabel(pickupMoveScope)})` : '';
  const dropoffLabel = destinationMoveScope
    ? ` (${formatMoveScopeLabel(destinationMoveScope)})`
    : '';

  return (
    <View>
      <View style={[styles.card, { borderColor: colors.border }]}>
        <View style={styles.cardHeaderRow}>
          <Text variant="body" style={styles.cardTitle}>
            📦 What You're Moving
          </Text>
          <Pressable onPress={onEditMoveType} hitSlop={8}>
            <Text variant="caption" style={{ color: colors.primary, fontWeight: '700' }}>
              Edit
            </Text>
          </Pressable>
        </View>
        <Text variant="body">{moveType?.displayName ?? '—'}</Text>
      </View>

      <View style={[styles.card, { borderColor: colors.border }]}>
        <View style={styles.cardHeaderRow}>
          <Text variant="body" style={styles.cardTitle}>
            📍 Addresses
          </Text>
          <Pressable onPress={onEditAddresses} hitSlop={8}>
            <Text variant="caption" style={{ color: colors.primary, fontWeight: '700' }}>
              Edit
            </Text>
          </Pressable>
        </View>
        <Text variant="body">
          Pickup: {fromAddress?.formattedAddress ?? '—'}
          {pickupLabel}
        </Text>
        <Text variant="body">
          Dropoff: {toAddress?.formattedAddress ?? '—'}
          {dropoffLabel}
        </Text>
      </View>

      <View style={[styles.card, { borderColor: colors.border }]}>
        <View style={styles.cardHeaderRow}>
          <Text variant="body" style={styles.cardTitle}>
            📅 Schedule & Details
          </Text>
          <Pressable onPress={onEditSchedule} hitSlop={8}>
            <Text variant="caption" style={{ color: colors.primary, fontWeight: '700' }}>
              Edit
            </Text>
          </Pressable>
        </View>
        <Text variant="body">
          {formatDisplayDate(moveDate, '—')}
          {timeWindow ? ` (${timeWindow} Slot)` : ''}
        </Text>
        {notes.trim() ? (
          <>
            <Text variant="caption" style={[styles.label, { color: colors.text }]}>
              Notes
            </Text>
            <Text variant="body">{notes.trim()}</Text>
          </>
        ) : null}
      </View>

      <View style={[styles.card, { borderColor: colors.border }]}>
        <View style={styles.cardHeaderRow}>
          <Text variant="body" style={styles.cardTitle}>
            🖼️ Photos ({uploadedPhotos.length})
          </Text>
          <Pressable onPress={onEditPhotos} hitSlop={8}>
            <Text variant="caption" style={{ color: colors.primary, fontWeight: '700' }}>
              Edit
            </Text>
          </Pressable>
        </View>

        {uploadedPhotos.length === 0 ? (
          <Text variant="caption" style={{ color: colors.text, opacity: 0.6 }}>
            No photos added
          </Text>
        ) : (
          <View style={styles.photoRow}>
            {uploadedPhotos.map((photo) => (
              <Image key={photo.id} source={{ uri: photo.localUri }} style={styles.thumbnail} />
            ))}
          </View>
        )}
      </View>

      {needsProfile ? (
        <View style={[styles.banner, { borderColor: '#FF9500', backgroundColor: '#FF95001A' }]}>
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
        <Text variant="caption" style={{ color: colors.error }}>
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
    padding: SPACING.md,
    marginBottom: SPACING.md,
    gap: SPACING.xs,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  cardTitle: {
    fontWeight: '700',
    fontSize: FONT_SIZES.md,
  },
  label: {
    fontWeight: '600',
    marginTop: SPACING.xs,
    opacity: 0.7,
  },
  photoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: 8,
  },
  banner: {
    borderWidth: 1,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    gap: SPACING.xs,
  },
  bannerTitle: {
    fontWeight: '700',
  },
});
