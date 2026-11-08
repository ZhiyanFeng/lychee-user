import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '../../hooks';
import { SPACING, FONT_SIZES } from '../../constants';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A single mover's quote on the active moving request — mirrors a bid
 * returned by `GET /rfq/{rfqId}` (see `store/slices/bidSlice`).
 */
export interface Bid {
  id: string;
  moverId: string;
  moverName: string;
  rfqId: string;
  /** "PENDING" | "ACCEPTED" | "DECLINED" (backend-defined, open string). */
  status: string;
  /** "FIXED" = flat job price; "HOURLY" = rate per hour (see `minHours`). */
  pricingType: 'FIXED' | 'HOURLY';
  price: number;
  /** Only meaningful when `pricingType === 'HOURLY'`. */
  minHours: number;
  details: string;
  createdAt: string | null;
}

/** The request being bid on — drives the "Request Blueprint" summary card. */
export interface RequestBlueprint {
  fromAddress: string;
  toAddress: string;
  moveDate: string;
  /** e.g. "1x Piano" — a single headline specialty-item badge. Optional
   * since not every request has heavy/special items called out. */
  specialtyItemLabel?: string;
}

interface ActiveRequestBiddingFeedProps {
  /** The RFQ movers are bidding on — sourced from `openRequestSlice` (no
   * local default; omit only while that data hasn't resolved yet). */
  request?: RequestBlueprint;
  /** Bids to render — sourced from `bidSlice`'s `fetchBidsForRfq`. */
  bids: Bid[];
  /** True while the initial/refresh fetch of `bids` is in flight. */
  loading?: boolean;
  /** Set if the bids fetch failed — shown in place of the feed. */
  error?: string | null;
  onAcceptBid?: (bid: Bid) => void;
  onDeclineBid?: (bid: Bid) => void;
}


// ---------------------------------------------------------------------------
// Bid card
// ---------------------------------------------------------------------------

interface BidCardProps {
  bid: Bid;
  onAccept: () => void;
  onDecline: () => void;
}

/** "$450" for FIXED, "$85/hr · 3hr min" for HOURLY. */
function formatPrice(bid: Bid): string {
  if (bid.pricingType === 'HOURLY') {
    return bid.minHours > 0
      ? `$${bid.price}/hr · ${bid.minHours}hr min`
      : `$${bid.price}/hr`;
  }
  return `$${bid.price}`;
}

function BidCard({ bid, onAccept, onDecline }: BidCardProps) {
  const { colors } = useTheme();
  const isDecided = bid.status !== 'PENDING';

  return (
    <View style={[styles.bidCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <View style={styles.bidCardHeader}>
        <View style={styles.bidCardMoverInfo}>
          <Text style={[styles.moverName, { color: colors.text }]}>{bid.moverName}</Text>
          <Text style={[styles.moverMeta, { color: colors.text }]}>
            {bid.pricingType === 'HOURLY' ? 'Hourly rate' : 'Flat rate'}
            {bid.status !== 'PENDING' ? ` · ${bid.status}` : ''}
          </Text>
        </View>
        <Text style={[styles.price, { color: colors.primary }]}>{formatPrice(bid)}</Text>
      </View>

      {bid.details ? <Text style={[styles.notes, { color: colors.text }]}>{bid.details}</Text> : null}

      {!isDecided && (
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.declineButton, { borderColor: colors.border }]}
            onPress={onDecline}
            activeOpacity={0.7}
          >
            <Text style={[styles.declineButtonText, { color: colors.text }]}>Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton, { backgroundColor: colors.primary }]}
            onPress={onAccept}
            activeOpacity={0.8}
          >
            <Text style={styles.acceptButtonText}>Accept Bid</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main screen component
// ---------------------------------------------------------------------------

/**
 * "Active Request & Bidding Feed" screen: a live-status banner, a read-only
 * summary of the request movers are bidding on ("Request Blueprint"), and a
 * scrollable feed of incoming quotes the customer can Accept or Decline.
 *
 * Bids are mirrored into local `useState` (seeded from the `bids` prop) so
 * declining a bid filters it out of the feed immediately without waiting on
 * a round-trip; the local copy is re-synced whenever the `bids` prop changes
 * (e.g. the caller's redux-backed fetch resolves/refreshes) via the effect
 * below. `request`/`bids` must come from the caller (Redux-backed — see
 * `app/moving-request/bids.tsx` and `app/(app)/bookings.tsx`) — this
 * component holds no data of its own.
 */
export function ActiveRequestBiddingFeed({
  request,
  bids: bidsProp,
  loading = false,
  error = null,
  onAcceptBid,
  onDeclineBid,
}: ActiveRequestBiddingFeedProps) {
  const { colors } = useTheme();
  const [bids, setBids] = useState<Bid[]>(bidsProp);

  // Re-sync local state whenever the caller hands us a fresh `bids` array
  // (initial fetch resolving, pull-to-refresh, etc.) — without this, the
  // feed would be stuck showing whatever was present on first mount.
  useEffect(() => {
    setBids(bidsProp);
  }, [bidsProp]);

  const handleDecline = (bid: Bid) => {
    setBids((prev) => prev.filter((b) => b.id !== bid.id));
    onDeclineBid?.(bid);
  };

  const handleAccept = (bid: Bid) => {
    onAcceptBid?.(bid);
  };

  if (loading && bids.length === 0) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <ActivityIndicator color={colors.primary} />
        <Text style={[styles.emptyText, { color: colors.text, marginTop: SPACING.sm }]}>
          Loading bids…
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <Text style={[styles.emptyText, { color: colors.error }]}>{error}</Text>
      </View>
    );
  }

  if (!request) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <Text style={[styles.emptyText, { color: colors.text }]}>
          No active request found.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Live Status Banner */}
      <View style={[styles.liveBanner, { backgroundColor: `${colors.primary}1A` }]}>
        <View style={[styles.liveDot, { backgroundColor: colors.primary }]} />
        <Text style={[styles.liveBannerText, { color: colors.primary }]}>
          Live Auction: {bids.length} Offers Available
        </Text>
      </View>

      {/* 2. Request Blueprint Card */}
      <View style={[styles.blueprintCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <Text style={[styles.routeText, { color: colors.text }]}>📍 From: {request.fromAddress}</Text>
        <Text style={[styles.routeText, { color: colors.text }]}>🏁 To: {request.toAddress}</Text>

        <View style={styles.badgeRow}>
          <View style={[styles.badge, styles.badgeNeutral, { backgroundColor: colors.border + '40' }]}>
            <Text style={[styles.badgeText, { color: colors.text }]}>📅 {request.moveDate}</Text>
          </View>
          {request.specialtyItemLabel ? (
            <View style={[styles.badge, styles.badgeWarning]}>
              <Text style={[styles.badgeText, styles.badgeWarningText]}>
                🎹 {request.specialtyItemLabel}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* 3. Live Bidding Feed Section */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Received Quotes</Text>

      {bids.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.text }]}>
          No offers remaining — check back soon for more quotes.
        </Text>
      ) : (
        bids.map((bid) => (
          <BidCard
            key={bid.id}
            bid={bid}
            onAccept={() => handleAccept(bid)}
            onDecline={() => handleDecline(bid)}
          />
        ))
      )}
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },

  // Live Status Banner
  liveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    borderRadius: 10,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  liveBannerText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
  },

  // Request Blueprint Card
  blueprintCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: SPACING.md,
    gap: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  routeText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  badge: {
    borderRadius: 16,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
  badgeNeutral: {
    // backgroundColor set inline from theme (colors.border + alpha)
  },
  badgeWarning: {
    backgroundColor: '#FF95001A',
    borderWidth: 1,
    borderColor: '#FF9500',
  },
  badgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  badgeWarningText: {
    color: '#FF9500',
  },

  // Section header
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  emptyText: {
    fontSize: FONT_SIZES.sm,
    opacity: 0.7,
  },

  // Bid Card
  bidCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  bidCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  bidCardMoverInfo: {
    flex: 1,
    paddingRight: SPACING.sm,
    gap: 2,
  },
  moverName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
  moverMeta: {
    fontSize: FONT_SIZES.xs,
    opacity: 0.7,
  },
  price: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '800',
  },
  notes: {
    fontSize: FONT_SIZES.sm,
    opacity: 0.85,
    lineHeight: 20,
  },

  // Actions
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  actionButton: {
    borderRadius: 8,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineButton: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  declineButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    opacity: 0.6,
  },
  acceptButton: {
    // backgroundColor set inline from theme (colors.primary)
  },
  acceptButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

