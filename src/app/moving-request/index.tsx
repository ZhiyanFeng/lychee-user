import React from 'react';
import { BookingFlow } from '../../components/booking-wizard';

/**
 * Route entry for the moving-request wizard — kept thin per expo-router
 * convention; all state/logic lives in `<BookingFlow />` so it's testable
 * and reusable independent of file-based routing.
 */
export default function MovingRequestRoute() {
  return <BookingFlow />;
}
