import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from '../ui';
import { useTheme } from '../../hooks';
import { SPACING, FONT_SIZES } from '../../constants';
import { OpenRequest } from '../../store/slices/openRequestSlice';

interface ConfirmedBookingDetailsCardProps {
  rfq: OpenRequest;
  onTrackDriver: () => void;
  onMessageMover: () => void;
}

/**
 * "CONFIRMED" state of `RecentActivityCard` — a mover has been booked and
 * the request is locked in for its scheduled date. Driver/carrier metadata
 * is placeholder copy until the backend exposes an assigned-mover endpoint.
 */
export function ConfirmedBookingDetailsCard({
  rfq,
  onTrackDriver,
  onMessageMover,
}: ConfirmedBookingDetailsCardProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: colors.background }]}>
      {/* Header row */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.icon}>🚚</Text>
          <Text variant="body" style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {rfq.serviceName || 'Residential Move'}
          </Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Status: CONFIRMED</Text>
        </View>
      </View>

      {/* Schedule row */}
      <Text style={[styles.scheduleText, { color: colors.text }]}>
        📅 Scheduled for {rfq.moveDate}
      </Text>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* Mover row */}
      <Text style={[styles.moverText, { color: colors.text }]}>
        Driver: Lychee Home Service (★ 4.9)
      </Text>

      {/* Action row */}
      <View style={styles.actionsRow}>
        <Button
          title="Track Driver Location"
          onPress={onTrackDriver}
          style={styles.primaryAction}
        />
        <Button
          title="Message Mover"
          onPress={onMessageMover}
          variant="outline"
          style={styles.secondaryAction}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: SPACING.md,
    gap: SPACING.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    flex: 1,
    paddingRight: SPACING.sm,
  },
  icon: {
    fontSize: FONT_SIZES.lg,
  },
  title: {
    fontWeight: '700',
    flexShrink: 1,
  },
  badge: {
    backgroundColor: '#E8F9EE', // stable bright green accent
    borderWidth: 1,
    borderColor: '#34C759',
    borderRadius: 16,
    paddingVertical: SPACING.xs / 2,
    paddingHorizontal: SPACING.sm,
  },
  badgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: '#1E7A3C',
  },
  scheduleText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: SPACING.xs,
  },
  moverText: {
    fontSize: FONT_SIZES.sm,
    opacity: 0.85,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  primaryAction: {
    flex: 1,
  },
  secondaryAction: {
    flex: 1,
  },
});
