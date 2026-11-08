import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { EmptyBookingsView } from '../../components/bookings';
import { ActiveRequestBiddingFeed, Bid } from '../../components/bidding';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  selectActiveOpenRequest,
  selectOpenRequestsLoading,
} from '../../store/slices/openRequestSlice';
import {
  fetchBidsForRfq,
  selectBidsForRfq,
  selectBidsLoading,
  selectBidsError,
  markBidAcceptedLocally,
  removeBidLocally,
} from '../../store/slices/bidSlice';

/**
 * Bookings tab root: dynamically renders one of two states depending on
 * whether the customer currently has an active moving request out for
 * bids, instead of hardcoding a single static layout:
 *   - no active request -> `<EmptyBookingsView />`
 *     ("No Bookings Yet" + create-a-booking entry points).
 *   - an active request exists -> `<ActiveRequestBiddingFeed />`
 *     (live auction banner, route/date/specialty-item summary card, and
 *     the scrollable Accept/Decline quote feed).
 *
 * Both the active request (`openRequestSlice`, kept warm by `OpenRequestSync`
 * in app/_layout.tsx) and its bids (`bidSlice`, fetched here on demand) come
 * entirely from Redux — no local mock/simulated data.
 */
export default function BookingsScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const activeRequest = useAppSelector(selectActiveOpenRequest);
  const openRequestsLoading = useAppSelector(selectOpenRequestsLoading);
  const bids = useAppSelector(selectBidsForRfq(activeRequest?.id));
  const bidsLoading = useAppSelector(selectBidsLoading);
  const bidsError = useAppSelector(selectBidsError);

  useEffect(() => {
    if (activeRequest?.id) {
      dispatch(fetchBidsForRfq(activeRequest.id));
    }
  }, [dispatch, activeRequest?.id]);

  const handleCreateBooking = () => {
    router.push('/moving-request');
  };

  const handleAcceptBid = (bid: Bid) => {
    if (!activeRequest) return;
    dispatch(markBidAcceptedLocally({ rfqId: activeRequest.id, bidId: bid.id }));
  };

  const handleDeclineBid = (bid: Bid) => {
    if (!activeRequest) return;
    dispatch(removeBidLocally({ rfqId: activeRequest.id, bidId: bid.id }));
  };

  // Still resolving whether an open request exists — render nothing (or a
  // spinner) rather than flashing the empty state first.
  if (openRequestsLoading && !activeRequest) {
    return null;
  }

  if (!activeRequest) {
    return <EmptyBookingsView onCreateBooking={handleCreateBooking} />;
  }

  return (
    <ActiveRequestBiddingFeed
      request={{
        fromAddress: activeRequest.originAddress.formattedAddress,
        toAddress: activeRequest.destinationAddress.formattedAddress,
        moveDate: activeRequest.moveDate,
        specialtyItemLabel: activeRequest.specialtyItems[0]
          ? `${activeRequest.specialtyItems[0].quantity}x ${activeRequest.specialtyItems[0].itemName}`
          : undefined,
      }}
      bids={bids}
      loading={bidsLoading}
      error={bidsError}
      onAcceptBid={handleAcceptBid}
      onDeclineBid={handleDeclineBid}
    />
  );
}
