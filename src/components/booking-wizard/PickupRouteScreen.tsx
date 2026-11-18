import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * A resolved, geocoded address — the shape both the Pickup and Destination
 * slots settle into once the user picks a concrete place (vs. the raw text
 * they're still typing). Mirrors the fields a Places Autocomplete/Geocoding
 * integration would hand back, so wiring a real provider in later only
 * means replacing `resolveAddress` below.
 */
export interface AddressDetails {
  formattedAddress: string;
  placeId: string;
  latitude: number;
  longitude: number;
}

interface RecentLocation {
  id: string;
  /** Short label, e.g. "Home" / "Work" / "Recent". */
  label: string;
  address: AddressDetails;
  icon: keyof typeof Ionicons.glyphMap;
}

interface RouteEstimate {
  distanceKm: number;
  durationMinutes: number;
}

type Slot = 'pickup' | 'destination';

interface PickupRouteScreenProps {
  /** Pre-fills the pickup slot, e.g. re-entering this step with a saved draft. */
  initialPickup?: AddressDetails | null;
  /** Pre-fills the destination slot. */
  initialDestination?: AddressDetails | null;
  /** Rows shown in the "Recent & Saved Locations" section before both slots are filled. */
  recentLocations?: RecentLocation[];
  /**
   * Resolves free-typed search text into a concrete `AddressDetails` for
   * either slot — swap this for a real Places Autocomplete/Geocoding call.
   * Defaults to a tiny local mock so this screen renders and behaves
   * correctly standalone, with no network/API-key setup required.
   */
  onResolveAddress?: (slot: Slot, query: string) => Promise<AddressDetails | null>;
  /** Resolves the device's current location for the GPS shortcut on the Pickup row. */
  onUseCurrentLocation?: () => Promise<AddressDetails | null>;
  /** Computes the distance/duration summary once both slots are filled. Defaults to a straight-line estimate. */
  onEstimateRoute?: (pickup: AddressDetails, destination: AddressDetails) => RouteEstimate;
  /** Opens a UI for adding an extra stop between pickup and destination. */
  onAddStop?: () => void;
  onBack?: () => void;
  onNext?: (pickup: AddressDetails, destination: AddressDetails) => void;
}

const DEFAULT_RECENT_LOCATIONS: RecentLocation[] = [
  {
    id: 'home',
    label: 'Home',
    address: {
      formattedAddress: '482 Maple Street, Springfield, IL',
      placeId: 'mock-home',
      latitude: 39.7817,
      longitude: -89.6501,
    },
    icon: 'home-outline',
  },
  {
    id: 'work',
    label: 'Work',
    address: {
      formattedAddress: '100 Corporate Plaza, Springfield, IL',
      placeId: 'mock-work',
      latitude: 39.7991,
      longitude: -89.6441,
    },
    icon: 'briefcase-outline',
  },
  {
    id: 'recent-1',
    label: 'Recent',
    address: {
      formattedAddress: '27 Birchwood Lane, Springfield, IL',
      placeId: 'mock-recent-1',
      latitude: 39.76,
      longitude: -89.665,
    },
    icon: 'time-outline',
  },
];

/** Tiny mock resolver: wraps the typed text in an `AddressDetails` with made-up coordinates near Springfield, IL so the Route Preview Card below has something plausible to estimate from. Replace via `onResolveAddress` for real geocoding. */
async function mockResolveAddress(slot: Slot, query: string): Promise<AddressDetails | null> {
  if (!query.trim()) return null;
  const jitter = slot === 'pickup' ? 0 : 0.03;
  return {
    formattedAddress: query.trim(),
    placeId: `mock-${slot}-${query.trim().toLowerCase()}`,
    latitude: 39.78 + jitter,
    longitude: -89.65 + jitter,
  };
}

/** Haversine distance in kilometers, used for the default route estimate. */
function haversineKm(a: AddressDetails, b: AddressDetails): number {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function defaultEstimateRoute(pickup: AddressDetails, destination: AddressDetails): RouteEstimate {
  const distanceKm = haversineKm(pickup, destination) * 1.3; // rough road-vs-straight-line padding
  const AVG_CITY_SPEED_KMH = 35;
  const durationMinutes = (distanceKm / AVG_CITY_SPEED_KMH) * 60;
  return { distanceKm, durationMinutes };
}

/**
 * Step 1/3 of the booking wizard: a single connected "route card" housing
 * the pickup/destination address fields (replacing two disconnected input
 * boxes), with a dynamic middle section that shows quick-fill recent/saved
 * locations before both ends are picked, and a live route preview (distance
 * + ETA) once they are. The primary CTA lives in a sticky bottom footer
 * that's disabled until both addresses resolve.
 */
export function PickupRouteScreen({
  initialPickup = null,
  initialDestination = null,
  recentLocations = DEFAULT_RECENT_LOCATIONS,
  onResolveAddress = mockResolveAddress,
  onUseCurrentLocation,
  onEstimateRoute = defaultEstimateRoute,
  onAddStop,
  onBack,
  onNext,
}: PickupRouteScreenProps) {
  const [pickupText, setPickupText] = useState(initialPickup?.formattedAddress ?? '');
  const [destinationText, setDestinationText] = useState(
    initialDestination?.formattedAddress ?? ''
  );
  const [pickup, setPickup] = useState<AddressDetails | null>(initialPickup);
  const [destination, setDestination] = useState<AddressDetails | null>(initialDestination);
  const [locatingGps, setLocatingGps] = useState(false);

  const canProceed = Boolean(pickup && destination);

  const routeEstimate = useMemo(
    () => (pickup && destination ? onEstimateRoute(pickup, destination) : null),
    [pickup, destination, onEstimateRoute]
  );

  // Resolves whichever slot's text was just edited into a concrete
  // AddressDetails as soon as the user stops typing — a real integration
  // would instead show a suggestions dropdown and resolve on tap, but this
  // keeps the screen fully interactive/runnable without one.
  const handleBlur = async (slot: Slot) => {
    const query = slot === 'pickup' ? pickupText : destinationText;
    const existing = slot === 'pickup' ? pickup : destination;
    if (existing?.formattedAddress === query.trim()) return;
    const resolved = await onResolveAddress(slot, query);
    if (slot === 'pickup') {
      setPickup(resolved);
    } else {
      setDestination(resolved);
    }
  };

  const handleUseCurrentLocation = async () => {
    if (!onUseCurrentLocation) return;
    setLocatingGps(true);
    try {
      const resolved = await onUseCurrentLocation();
      if (resolved) {
        setPickup(resolved);
        setPickupText(resolved.formattedAddress);
      }
    } finally {
      setLocatingGps(false);
    }
  };

  const handleSwap = () => {
    setPickup(destination);
    setDestination(pickup);
    setPickupText(destinationText);
    setDestinationText(pickupText);
  };

  const handleSelectRecent = (location: RecentLocation) => {
    // Fills whichever slot is still empty — pickup first, then destination —
    // so tapping a recent location is always a single, unambiguous action.
    if (!pickup) {
      setPickup(location.address);
      setPickupText(location.address.formattedAddress);
    } else if (!destination) {
      setDestination(location.address);
      setDestinationText(location.address.formattedAddress);
    }
  };

  const handleNext = () => {
    if (pickup && destination) {
      onNext?.(pickup, destination);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header + progress */}
      <View className="border-b border-gray-100 bg-white px-4 pb-3 pt-2">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={onBack}
            hitSlop={12}
            className="h-9 w-9 items-center justify-center"
          >
            <Ionicons name="chevron-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-900">Pickup & Route</Text>
          <View className="rounded-full bg-gray-100 px-3 py-1">
            <Text className="text-xs font-semibold text-gray-600">1/3</Text>
          </View>
        </View>
        <View className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
          <View className="h-full w-1/3 rounded-full bg-blue-600" />
        </View>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-4 pb-6 pt-4"
          keyboardShouldPersistTaps="handled"
        >
          {/* Connected route card */}
          <View className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <View className="flex-row">
              {/* Visual timeline: pickup dot, dashed connector, destination pin */}
              <View className="mr-3 w-4 items-center">
                <View className="mt-3 h-3 w-3 rounded-full bg-blue-600" />
                <View className="my-1 w-0 flex-1 border-l-2 border-dashed border-gray-300" />
                <View className="mb-3 h-3 w-3 rounded-sm bg-red-500" />
              </View>

              <View className="flex-1">
                {/* Pickup row */}
                <View className="flex-row items-center">
                  <TextInput
                    className="h-11 flex-1 text-base text-gray-900"
                    placeholder="Search pickup address..."
                    placeholderTextColor="#6B7280"
                    value={pickupText}
                    onChangeText={setPickupText}
                    onBlur={() => handleBlur('pickup')}
                  />
                  <TouchableOpacity
                    onPress={handleUseCurrentLocation}
                    hitSlop={8}
                    className="ml-2 h-8 w-8 items-center justify-center rounded-full"
                    accessibilityLabel="Use current location"
                  >
                    <Ionicons
                      name={locatingGps ? 'refresh' : 'locate-outline'}
                      size={20}
                      color="#007AFF"
                    />
                  </TouchableOpacity>
                </View>

                {/* Divider + swap action */}
                <View className="relative justify-center py-1.5">
                  <View className="h-px w-full bg-gray-200" />
                  <TouchableOpacity
                    onPress={handleSwap}
                    hitSlop={8}
                    accessibilityLabel="Swap pickup and destination"
                    className="absolute right-0 -top-2.5 rounded-full border border-gray-200 bg-gray-100 p-1.5"
                  >
                    <Ionicons name="swap-vertical-outline" size={14} color="#4B5563" />
                  </TouchableOpacity>
                </View>

                {/* Destination row */}
                <View className="flex-row items-center">
                  <TextInput
                    className="h-11 flex-1 text-base text-gray-900"
                    placeholder="Search destination address..."
                    placeholderTextColor="#6B7280"
                    value={destinationText}
                    onChangeText={setDestinationText}
                    onBlur={() => handleBlur('destination')}
                  />
                </View>
              </View>
            </View>

            {onAddStop && (
              <TouchableOpacity
                onPress={onAddStop}
                className="mt-3 flex-row items-center border-t border-gray-100 pt-3"
              >
                <Ionicons name="add-circle-outline" size={16} color="#007AFF" />
                <Text className="ml-1.5 text-sm font-semibold text-blue-600">Add Stop</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Dynamic middle content */}
          {!canProceed ? (
            <View className="mt-6">
              <Text className="mb-3 text-sm font-bold text-gray-900">
                Recent & Saved Locations
              </Text>
              <View className="gap-2">
                {recentLocations.map((location) => (
                  <TouchableOpacity
                    key={location.id}
                    onPress={() => handleSelectRecent(location)}
                    className="flex-row items-center rounded-xl border border-gray-200 bg-white px-3 py-3"
                  >
                    <View className="h-9 w-9 items-center justify-center rounded-full bg-gray-100">
                      <Ionicons name={location.icon} size={18} color="#4B5563" />
                    </View>
                    <View className="ml-3 flex-1">
                      <Text className="text-sm font-semibold text-gray-900">
                        {location.label}
                      </Text>
                      <Text className="text-xs text-gray-500" numberOfLines={1}>
                        {location.address.formattedAddress}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            <View className="mt-6">
              <View className="h-44 items-center justify-center overflow-hidden rounded-xl bg-gray-100">
                <Ionicons name="map-outline" size={32} color="#9CA3AF" />
                <Text className="mt-2 text-xs text-gray-500">Route preview</Text>
              </View>
              <View className="mt-3 flex-row items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3">
                <View className="flex-row items-center">
                  <Ionicons name="speedometer-outline" size={18} color="#007AFF" />
                  <Text className="ml-2 text-sm font-semibold text-gray-900">
                    {routeEstimate ? `${routeEstimate.distanceKm.toFixed(1)} km` : '—'}
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Ionicons name="time-outline" size={18} color="#007AFF" />
                  <Text className="ml-2 text-sm font-semibold text-gray-900">
                    {routeEstimate ? `${Math.round(routeEstimate.durationMinutes)} mins` : '—'}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Sticky bottom footer */}
        <View className="border-t border-gray-100 bg-white px-4 py-3">
          <TouchableOpacity
            onPress={handleNext}
            disabled={!canProceed}
            className={`items-center justify-center rounded-xl py-4 ${
              canProceed ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <Text
              className={`text-base font-bold ${canProceed ? 'text-white' : 'text-gray-500'}`}
            >
              Next: Schedule & Delivery
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
