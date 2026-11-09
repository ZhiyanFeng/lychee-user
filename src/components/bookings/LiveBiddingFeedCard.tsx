import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from '../ui';
import { useTheme } from '../../hooks';
import { SPACING, FONT_SIZES } from '../../constants';
import { OpenRequest } from '../../store/slices/openRequestSlice';

interface LiveBiddingFeedCardProps {
  rfq: OpenRequest;
  onViewFeed: () => void;
}

/**
 * "OPEN" / "BIDDING" state of `RecentActivityCard` — the request has been
 * submitted and is either awaiting its first bids ("OPEN") or already
 * collecting quotes from movers ("BIDDING"). Both map to the same "live
 * auction in progress" layout; the badge/notice copy is intentionally
 * identical for either status since from the customer's perspective nothing
 * actionable differs yet.
 */
export function LiveBiddingFeedCard({ rfq, onViewFeed }: LiveBiddingFeedCardProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: colors.background }]}>
      {/* Header row */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.icon}>📦</Text>
          <Text
            variant="body"
            style={[styles.requestLabel, { color: colors.text }]}
            numberOfLines={1}
          >
            Request #{rfq.id.slice(0, 8)}
          </Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Status: BIDDING</Text>
        </View>
      </View>

      {/* Body row */}
      <View style={styles.body}>
        <Text style={[styles.routeText, { color: colors.text }]} numberOfLines={1}>
          📍 {rfq.originAddress.formattedAddress}
        </Text>
        <Text style={[styles.routeText, { color: colors.text }]} numberOfLines={1}>
          🏁 {rfq.destinationAddress.formattedAddress}
        </Text>
        <View style={styles.metaRow}>
          {rfq.serviceName ? (
            <Text style={[styles.metaText, { color: colors.text }]}>{rfq.serviceName}</Text>
          ) : null}
          <Text style={[styles.metaText, { color: colors.text }]}>📅 {rfq.moveDate}</Text>
        </View>
      </View>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* Notification row */}
      <Text style={styles.notice}>🔥 Active Moving Companies are placing offers!</Text>

      {/* Action row */}
      <Button title="View Live Bidding Feed" onPress={onViewFeed} style={styles.actionButton} />
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
  requestLabel: {
    fontWeight: '700',
    flexShrink: 1,
  },
  badge: {
    backgroundColor: '#FFF3CD', // subtle yellow flash/pulse accent
    borderWidth: 1,
    borderColor: '#FFD60A',
    borderRadius: 16,
    paddingVertical: SPACING.xs / 2,
    paddingHorizontal: SPACING.sm,
  },
  badgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: '#8A6D00',
  },
  body: {
    gap: SPACING.xs / 2,
  },
  routeText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginTop: SPACING.xs,
  },
  metaText: {
    fontSize: FONT_SIZES.xs,
    opacity: 0.7,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: SPACING.xs,
  },
  notice: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: '#B45309',
  },
  actionButton: {
    marginTop: SPACING.xs,
  },
});
