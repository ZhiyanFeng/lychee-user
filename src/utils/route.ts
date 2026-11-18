/**
 * Lightweight client-side route estimate (distance + drive time) used to
 * populate the "Pickup & Route" screen's Route Summary banner before a real
 * directions/routing API is wired in. Swap `estimateRoute`'s body for a
 * Google Directions (or similar) call once that integration exists — every
 * call site only depends on this function's signature, not its internals.
 */

export interface RouteEstimate {
  distanceKm: number;
  durationMinutes: number;
}

interface LatLng {
  latitude: number;
  longitude: number;
}

/** Haversine distance in kilometers between two coordinates. */
function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

const AVG_CITY_SPEED_KMH = 35;
// Rough padding to approximate road distance from a straight-line estimate.
const ROAD_VS_STRAIGHT_LINE_FACTOR = 1.3;

export function estimateRoute(pickup: LatLng, destination: LatLng): RouteEstimate {
  const distanceKm = haversineKm(pickup, destination) * ROAD_VS_STRAIGHT_LINE_FACTOR;
  const durationMinutes = (distanceKm / AVG_CITY_SPEED_KMH) * 60;
  return { distanceKm, durationMinutes };
}
