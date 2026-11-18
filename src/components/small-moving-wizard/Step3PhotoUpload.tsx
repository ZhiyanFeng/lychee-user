import React from 'react';
import { View, Image, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Text, Button } from '../ui';
import { useTheme } from '../../hooks';
import { SPACING, FONT_SIZES } from '../../constants';
import type { RfqPhotoItem } from '../../hooks/useRfqPhotoUpload';

interface Step3PhotoUploadProps {
  photos: RfqPhotoItem[];
  onPickFromLibrary: () => void;
  onTakePhoto: () => void;
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  /** Surfaces a permission-denial message from the picker/camera, if any. */
  pickerError: string | null;
}

// No hard cap is enforced by the upload queue today (see
// `useRfqPhotoUpload`), so the subheader only renders a plain count
// (`Uploaded Photos (2)`). `MAX_PHOTOS` is kept here, unused, purely to
// document the `(2/3)` format the design calls for if a cap is ever added.
const MAX_PHOTOS: number | null = null;

// Roughly a 16:10 card so ~1.5-2 cards are visible per screen, per the
// design spec, while still being tall enough to judge furniture/stairs/box
// photos at a glance.
const CARD_HEIGHT = 190;

/**
 * Step 3 of `SmallMovingWizardScreen`: pick/capture photos (each uploaded to
 * S3 immediately via `useRfqPhotoUpload`), shown as a reorderable vertical
 * list with per-photo status (uploading spinner / uploaded badge / inline
 * retry on error) and a remove (✕) button. No drag-and-drop library is
 * installed in this project, so reordering uses simple move-up/move-down
 * controls instead — functionally equivalent for producing the ordered
 * `s3ObjectKeys` array the backend uses for `displayOrder`.
 */
export function Step3PhotoUpload({
  photos,
  onPickFromLibrary,
  onTakePhoto,
  onRetry,
  onRemove,
  onMoveUp,
  onMoveDown,
  pickerError,
}: Step3PhotoUploadProps) {
  const { colors } = useTheme();

  const subheaderLabel = MAX_PHOTOS
    ? `Uploaded Photos (${photos.length}/${MAX_PHOTOS})`
    : `Uploaded Photos (${photos.length})`;

  return (
    <View>
      <Text variant="body" style={[styles.helperText, { color: colors.text }]}>
        Add photos of the items you're moving (optional) — movers use these to
        give more accurate bids.
      </Text>

      <View style={styles.addButtonsRow}>
        <Button title="📷 Take Photo" variant="outline" onPress={onTakePhoto} style={styles.addButton} />
        <Button
          title="🖼️ Choose Photos"
          variant="outline"
          onPress={onPickFromLibrary}
          style={styles.addButton}
        />
      </View>

      {pickerError ? (
        <Text variant="caption" style={[styles.pickerError, { color: colors.error }]}>
          {pickerError}
        </Text>
      ) : null}

      {/* Pinned subheader showing the running count, right below the
          action buttons so it's clear at a glance how many photos have
          been added as the list below scrolls. */}
      <Text variant="caption" style={[styles.subheader, { color: colors.text }]}>
        {subheaderLabel}
      </Text>

      {photos.length === 0 ? (
        <Pressable
          onPress={onPickFromLibrary}
          style={[styles.emptyState, { borderColor: colors.border }]}
        >
          <Feather name="camera" size={28} color={colors.text} style={styles.emptyStateIcon} />
          <Text variant="body" style={[styles.emptyStateTitle, { color: colors.text }]}>
            No photos added yet
          </Text>
          <Text variant="caption" style={[styles.emptyStateHelp, { color: colors.text }]}>
            Snap a quick pic of bulky furniture, stairs, or boxes to help movers give accurate bids
          </Text>
        </Pressable>
      ) : (
        <View style={styles.list}>
          {photos.map((photo, index) => (
            <View key={photo.id} style={[styles.photoCard, { borderColor: colors.border }]}>
              <Image source={{ uri: photo.localUri }} style={styles.thumbnail} />

              {index === 0 && (
                <View style={[styles.coverBadge, { backgroundColor: colors.text }]}>
                  <Text style={styles.coverBadgeText}>#1 • Cover</Text>
                </View>
              )}

              {photo.status === 'uploading' && (
                <View style={styles.overlay}>
                  <ActivityIndicator color="#FFFFFF" />
                </View>
              )}

              {photo.status === 'uploaded' && (
                <View style={[styles.statusBadge, { backgroundColor: colors.success }]}>
                  <Feather name="check" size={12} color="#FFFFFF" />
                </View>
              )}

              {photo.status === 'error' && (
                <Pressable
                  onPress={() => onRetry(photo.id)}
                  style={[styles.errorOverlay, { backgroundColor: `${colors.error}CC` }]}
                >
                  <Feather name="refresh-cw" size={18} color="#FFFFFF" />
                  <Text style={styles.errorText}>Retry</Text>
                </Pressable>
              )}

              <Pressable
                onPress={() => onRemove(photo.id)}
                hitSlop={8}
                style={styles.removeButton}
              >
                <Feather name="x" size={14} color="#FFFFFF" />
              </Pressable>

              <View style={styles.reorderRow}>
                <Pressable
                  onPress={() => onMoveUp(photo.id)}
                  disabled={index === 0}
                  hitSlop={8}
                  style={[styles.reorderButton, index === 0 && styles.reorderButtonDisabled]}
                >
                  <Feather name="arrow-up" size={14} color={colors.text} />
                </Pressable>
                <Pressable
                  onPress={() => onMoveDown(photo.id)}
                  disabled={index === photos.length - 1}
                  hitSlop={8}
                  style={[
                    styles.reorderButton,
                    index === photos.length - 1 && styles.reorderButtonDisabled,
                  ]}
                >
                  <Feather name="arrow-down" size={14} color={colors.text} />
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  helperText: {
    marginBottom: SPACING.md,
    opacity: 0.8,
  },
  addButtonsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  addButton: {
    flex: 1,
  },
  pickerError: {
    marginBottom: SPACING.sm,
  },
  subheader: {
    fontWeight: '600',
    marginBottom: SPACING.sm,
    opacity: 0.8,
  },
  emptyState: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
  },
  emptyStateIcon: {
    opacity: 0.5,
    marginBottom: SPACING.sm,
  },
  emptyStateTitle: {
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  emptyStateHelp: {
    textAlign: 'center',
    opacity: 0.6,
  },
  list: {
    gap: SPACING.sm,
  },
  photoCard: {
    width: '100%',
    height: CARD_HEIGHT,
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  coverBadgeText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reorderRow: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    gap: 6,
  },
  reorderButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reorderButtonDisabled: {
    opacity: 0.3,
  },
});
