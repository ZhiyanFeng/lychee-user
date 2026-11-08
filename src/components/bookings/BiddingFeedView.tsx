// Deprecated: this component duplicated `ActiveRequestBiddingFeed`
// (src/components/bidding/ActiveRequestBiddingFeed.tsx) with its own
// mock-only `MoveQuote`/`ActiveMovingRequest` types. The Bookings tab
// (src/app/(app)/bookings.tsx) now renders `<ActiveRequestBiddingFeed />`
// directly, fed entirely from Redux (`openRequestSlice` + `bidSlice`) — no
// screen imports this file anymore. Kept as an empty placeholder rather
// than deleted outright; safe to remove entirely.
export {};
