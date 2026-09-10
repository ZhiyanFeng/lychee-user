import { useEffect } from 'react';
import { Slot } from 'expo-router';
import { Provider } from 'react-redux';
import GooglePlacesSDK from 'react-native-google-places-sdk';
import { store, useAppDispatch } from '../store';
import { AuthProvider, useAuth } from '../contexts';
import { GOOGLE_PLACES_API_KEY } from '../constants';
import { fetchServices } from '../store/slices/servicesSlice';
import { fetchInventoryItems } from '../store/slices/inventorySlice';
import { fetchUser, clearUser } from '../store/slices/userSlice';

/**
 * Prefetches small, global, rarely-changing "lookup"/reference data (moving
 * services, inventory items/categories) once at app start, so it's already
 * warm in the Redux store by the time the user reaches Explore or the
 * moving-request wizard — instead of each screen showing its own loading
 * spinner on first visit.
 *
 * Safe to also dispatch these same thunks from individual screens (Explore,
 * moving-request/*) as defensive fallbacks (e.g. deep-linking directly into
 * a step) — the `condition` option on each thunk makes redundant dispatches
 * a no-op rather than firing a duplicate network request.
 *
 * Rendered as its own child component (not inline in RootLayout) because
 * `useAppDispatch` requires being inside the <Provider> below.
 */
function LookupDataPrefetcher() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    // Both endpoints are unauthenticated today (api.service.ts's request
    // interceptor doesn't attach a token yet), so it's safe to prefetch
    // immediately at app start rather than waiting for sign-in. If these
    // endpoints later require auth, gate this on the authenticated user from
    // useAuth() instead.
    dispatch(fetchServices());
    dispatch(fetchInventoryItems());
  }, [dispatch]);

  return null;
}

/**
 * Keeps the backend `users` row in sync with Firebase auth state: loads it
 * as soon as Firebase confirms a signed-in user (both on fresh login and on
 * cold-start with a persisted session), and clears it on sign-out so a
 * different account signing in on the same device never sees stale data.
 *
 * A 404 from GET /user/profile is handled inside `fetchUser` and recorded as
 * `exists: false` — that's the signal the Profile screen uses to switch
 * between "complete your profile" (create) and "edit profile" (update).
 */
function UserSync() {
  const dispatch = useAppDispatch();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      dispatch(fetchUser());
    } else {
      dispatch(clearUser());
    }
  }, [dispatch, user]);

  return null;
}

export default function RootLayout() {
  useEffect(() => {
    // Must be initialized exactly once before any fetchPredictions/
    // fetchPlaceByID call — the native Places SDK (unlike the old REST-based
    // autocomplete library) attaches this app's package name/bundle ID +
    // signing certificate to every request, so the API key can safely be
    // restricted to "Android apps"/"iOS apps" in Google Cloud Console.
    GooglePlacesSDK.initialize(GOOGLE_PLACES_API_KEY);
  }, []);

  return (
    <Provider store={store}>
      <AuthProvider>
        <LookupDataPrefetcher />
        <UserSync />
        <Slot />
      </AuthProvider>
    </Provider>
  );
}
