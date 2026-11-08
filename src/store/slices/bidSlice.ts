import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { apiService } from '../../services';
import { API_ENDPOINTS } from '../../constants';

/** How a mover priced their quote — flat job price vs. hourly rate. */
export type BidPricingType = 'FIXED' | 'HOURLY';

/** A bid's lifecycle status as returned by the backend. */
export type BidStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | string;

/**
 * Mirrors a single element of GET /rfq/{rfqId}'s `data` array — a mover's
 * quote against a specific RFQ.
 *
 * Example payload:
 * {
 *   "id": "a1b2c3d4-...",
 *   "moverId": "e5f6a7b8-...",
 *   "moverName": "Toronto Movers Inc.",
 *   "rfqId": "c9d0e1f2-...",
 *   "status": "PENDING",
 *   "pricingType": "FIXED",
 *   "price": 450.00,
 *   "minHours": 0,
 *   "details": "Includes 2 movers and a 16ft truck",
 *   "createdAt": "2026-10-09T14:32:10"
 * }
 */
export interface Bid {
  id: string;
  moverId: string;
  moverName: string;
  rfqId: string;
  status: BidStatus;
  pricingType: BidPricingType;
  price: number;
  minHours: number;
  details: string;
  createdAt: string | null;
}

interface BidState {
  // Keyed by rfqId so bids for multiple requests (e.g. navigating between
  // past/active bidding feeds) don't stomp on each other in the same store.
  byRfqId: Record<string, Bid[]>;
  loading: boolean;
  error: string | null;
}

const initialState: BidState = {
  byRfqId: {},
  loading: false,
  error: null,
};

// Tolerate snake_case or camelCase field casing from the backend — same
// normalization approach used throughout the other slices.
type RawBid = Record<string, any>;

function extractBidsArray(response: unknown): RawBid[] {
  if (Array.isArray(response)) return response;
  if (response && typeof response === 'object') {
    const obj = response as Record<string, any>;
    if (Array.isArray(obj.data)) return obj.data;
    if (Array.isArray(obj.items)) return obj.items;
    if (Array.isArray(obj.content)) return obj.content; // Spring Data Page<T>
  }
  return [];
}

function normalizeBid(raw: RawBid): Bid {
  return {
    id: String(raw.id ?? ''),
    moverId: String(raw.moverId ?? raw.mover_id ?? ''),
    moverName: raw.moverName ?? raw.mover_name ?? '',
    rfqId: String(raw.rfqId ?? raw.rfq_id ?? ''),
    status: raw.status ?? 'PENDING',
    pricingType: (raw.pricingType ?? raw.pricing_type ?? 'FIXED') as BidPricingType,
    price: Number(raw.price ?? 0),
    minHours: Number(raw.minHours ?? raw.min_hours ?? 0),
    details: raw.details ?? '',
    createdAt: raw.createdAt ?? raw.created_at ?? null,
  };
}

/**
 * Fetches every mover's bid against a given RFQ from `GET /rfq/{rfqId}` —
 * powers the "Active Request & Bidding Feed" screen
 * (`components/bidding/ActiveRequestBiddingFeed`).
 */
export const fetchBidsForRfq = createAsyncThunk(
  'bid/fetchForRfq',
  async (rfqId: string) => {
    const response = await apiService.get<unknown>(API_ENDPOINTS.BIDS_FOR_RFQ(rfqId));
    const bids = extractBidsArray(response).map(normalizeBid);
    return { rfqId, bids };
  }
);

const bidSlice = createSlice({
  name: 'bid',
  initialState,
  reducers: {
    // Optimistic local removal when the customer declines a bid — avoids
    // waiting on a round-trip before the card disappears from the feed.
    // Pair with a real "decline" network call in the caller once that
    // endpoint exists.
    removeBidLocally: (state, action: PayloadAction<{ rfqId: string; bidId: string }>) => {
      const { rfqId, bidId } = action.payload;
      const existing = state.byRfqId[rfqId];
      if (existing) {
        state.byRfqId[rfqId] = existing.filter((bid) => bid.id !== bidId);
      }
    },
    // Marks a bid ACCEPTED locally (optimistic) — same caveat as above,
    // pair with a real "accept" network call once that endpoint exists.
    markBidAcceptedLocally: (state, action: PayloadAction<{ rfqId: string; bidId: string }>) => {
      const { rfqId, bidId } = action.payload;
      const existing = state.byRfqId[rfqId];
      const bid = existing?.find((b) => b.id === bidId);
      if (bid) {
        bid.status = 'ACCEPTED';
      }
    },
    clearBids: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBidsForRfq.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchBidsForRfq.fulfilled,
        (state, action: PayloadAction<{ rfqId: string; bids: Bid[] }>) => {
          state.byRfqId[action.payload.rfqId] = action.payload.bids;
          state.loading = false;
        }
      )
      .addCase(fetchBidsForRfq.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Failed to load bids';
      });
  },
});

export const { removeBidLocally, markBidAcceptedLocally, clearBids } = bidSlice.actions;
export default bidSlice.reducer;

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------
type BidSliceState = { bid: BidState };

export const selectBidsLoading = (state: BidSliceState) => state.bid.loading;
export const selectBidsError = (state: BidSliceState) => state.bid.error;
export const selectBidsForRfq =
  (rfqId: string | undefined) =>
  (state: BidSliceState): Bid[] =>
    (rfqId && state.bid.byRfqId[rfqId]) || [];

