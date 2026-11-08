import React, { useEffect, useMemo } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ActiveRequestBiddingFeed, Bid } from '../../components/bidding';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  fetchBidsForRfq,
  selectBidsForRfq,
  selectBidsLoading,
  selectBidsError,
  markBidAcceptedLocally,
  removeBidLocally,
} from '../../store/slices/bidSlice';
import { selectOpenRequests } from '../../store/slices/openRequestSlice';

/**
 * Route entry for the "Active Request & Bidding Feed" screen — kept thin
 * per expo-router convention; all display logic lives in
 * `<ActiveRequestBiddingFeed />`. This component is the data-fetching glue:
 * reads `rfqId` from the URL (set by `BookingFlow` on submit, e.g.
 * `/moving-request/bids?rfqId=...`), loads that RFQ's bids from
 * `GET /rfq/{rfqId}`, and derives the "Request Blueprint" summary from the
 * matching entry already cached in `openRequestSlice` (populated by
 * `OpenRequestSync` in app/_layout.tsx) — no extra network call needed for
 * the addresses/date shown at the top of the feed.
 */
export default function BidsRoute() {
  const { rfqId } = useLocalSearchParams<{ rfqId?: string }>();
  const dispatch = useAppDispatch();

  const bids = useAppSelector(selectBidsForRfq(rfqId));
  const loading = useAppSelector(selectBidsLoading);
  const error = useAppSelector(selectBidsError);
  const openRequests = useAppSelector(selectOpenRequests);

  useEffect(() => {
    if (rfqId) {
      dispatch(fetchBidsForRfq(rfqId));
    }
  }, [dispatch, rfqId]);

  const request = useMemo(() => {
    const match = openRequests.find((r) => r.id === rfqId);
    if (!match) return undefined;
    return {
      fromAddress: match.originAddress.formattedAddress,
      toAddress: match.destinationAddress.formattedAddress,
      moveDate: match.moveDate,
      specialtyItemLabel: match.specialtyItems[0]
        ? `${match.specialtyItems[0].quantity}x ${match.specialtyItems[0].itemName}`
        : undefined,
    };
  }, [openRequests, rfqId]);

  const handleAcceptBid = (bid: Bid) => {
    if (!rfqId) return;
    // Optimistic local update — swap for a real "accept" network call once
    // that endpoint exists on the backend.
    dispatch(markBidAcceptedLocally({ rfqId, bidId: bid.id }));
  };

  const handleDeclineBid = (bid: Bid) => {
    if (!rfqId) return;
    // Optimistic local update — swap for a real "decline" network call once
    // that endpoint exists on the backend.
    dispatch(removeBidLocally({ rfqId, bidId: bid.id }));
  };

  return (
    <ActiveRequestBiddingFeed
      request={request}
      bids={bids}
      loading={loading}
      error={error}
      onAcceptBid={handleAcceptBid}
      onDeclineBid={handleDeclineBid}
    />
  );
}
