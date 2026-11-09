import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '../ui';
import { useTheme } from '../../hooks';
import { SPACING, FONT_SIZES } from '../../constants';
import { useAppDispatch, useAppSelector } from '../../store';
import { resetMovingRequest } from '../../store/slices/movingRequestSlice';
import {
  selectActiveOpenRequest,
  selectOpenRequestsLoading,
  selectOpenRequestsError,
} from '../../store/slices/openRequestSlice';
import { EmptyBookingsState } from './EmptyBookingsState';
import { LiveBiddingFeedCard } from './LiveBiddingFeedCard';
import { ConfirmedBookingDetailsCard } from './ConfirmedBookingDetailsCard';

/**
 * Home dashboard's "Recent Activity" section. Reads the signed-in user's
 * active open RFQ straight from `openRequestSlice` — the same Redux state
 * `bookings.tsx` renders from, kept warm app-wide by `OpenRequestSync`
 * (app/_layout.tsx) as soon as the backend user resolves — rather than
 * firing its own fetch, so nothing is re-fetched just because this card
 * remounts (e.g. navigating away from Home and back). Rather than exposing
 * a raw list, it switches on the active RFQ's `status` to pick exactly one
 * of three layouts:
 *   - no open RFQ at all       -> `EmptyBookingsState` ("NONE")
 *   - "OPEN" or "BIDDING"      -> `LiveBiddingFeedCard`
 *   - "CONFIRMED"              -> `ConfirmedBookingDetailsCard`
 *
 * Loading/error states are handled here so the three layout components stay
 * pure presentational pieces driven entirely by props.
 */
export function RecentActivityCard() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { colors } = useTheme();

  const activeRfq = useAppSelector(selectActiveOpenRequest);
  const loading = useAppSelector(selectOpenRequestsLoading);
  const error = useAppSelector(selectOpenRequestsError);

  if (loading && !activeRfq) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
      </View>
    );
  }

  const status = activeRfq?.status?.toUpperCase();

  // Clears any in-progress draft/step first so this always lands on Step 1
  // of the wizard (`BookingFlow` seeds its local state from the same
  // `movingRequestSlice`, including `wizardStep`), rather than resuming
  // wherever a previous abandoned attempt left off.
  const handleBookNow = () => {
    dispatch(resetMovingRequest());
    router.push('/moving-request');
  };
  const handleViewFeed = () => activeRfq && router.push(`/moving-request/bids?rfqId=${activeRfq.id}`);
  const handleTrackDriver = () => activeRfq && router.push(`/moving-request/bids?rfqId=${activeRfq.id}`);
  const handleMessageMover = () => activeRfq && router.push(`/moving-request/bids?rfqId=${activeRfq.id}`);

  switch (status) {
    case 'OPEN':
    case 'BIDDING':
      return <LiveBiddingFeedCard rfq={activeRfq!} onViewFeed={handleViewFeed} />;
    case 'CONFIRMED':
      return (
        <ConfirmedBookingDetailsCard
          rfq={activeRfq!}
          onTrackDriver={handleTrackDriver}
          onMessageMover={handleMessageMover}
        />
      );
    default:
      return <EmptyBookingsState onBookNow={handleBookNow} />;
  }
}

const styles = StyleSheet.create({
  centered: {
    paddingVertical: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
  },
});
