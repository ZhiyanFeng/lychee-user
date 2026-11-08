import { useEffect } from 'react';
import { Slot } from 'expo-router';
import { Provider } from 'react-redux';
import GooglePlacesSDK from 'react-native-google-places-sdk';
import { Inspector, InspectorDevMenu } from 'react-native-dev-inspector';
import { store, useAppDispatch, useAppSelector } from '../store';
import { AuthProvider, useAuth } from '../contexts';
import { GOOGLE_PLACES_API_KEY } from '../constants';
import { fetchServices } from '../store/slices/servicesSlice';
import { fetchUser, clearUser, selectUser } from '../store/slices/userSlice';
import { fetchOpenRequests, clearOpenRequests } from '../store/slices/openRequestSlice';

/**
 * Prefetches small, global, rarely-changing "lookup"/reference data (moving
 * services) once at app start, so it's already warm in the Redux store by
 * the time the user reaches Explore or the moving-request wizard — instead
 * of each screen showing its own loading spinner on first visit.
 *
 * Safe to also dispatch this same thunk from individual screens (Explore,
 * moving-request/*) as defensive fallbacks (e.g. deep-linking directly into
 * a step) — the `condition` option on the thunk makes redundant dispatches
 * a no-op rather than firing a duplicate network request.
 *
 * Rendered as its own child component (not inline in RootLayout) because
 * `useAppDispatch` requires being inside the <Provider> below.
 */
function LookupDataPrefetcher() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    // This endpoint is unauthenticated today (api.service.ts's request
    // interceptor doesn't attach a token yet), so it's safe to prefetch
    // immediately at app start rather than waiting for sign-in. If it later
    // requires auth, gate this on the authenticated user from useAuth()
    // instead.
    dispatch(fetchServices());
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

/**
 * Fetches the signed-in user's open (in-progress) request(s) from
 * `/user/{userId}/open` once the backend `users` row is available — gated
 * on `backendUser.id` (not just Firebase's `user`) since the endpoint needs
 * the backend's UUID, which only exists after `UserSync`'s `fetchUser`
 * resolves. Cleared on sign-out for the same stale-data reason as `UserSync`.
 */
function OpenRequestSync() {
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const backendUser = useAppSelector(selectUser);

  useEffect(() => {
    if (user && backendUser?.id) {
      dispatch(fetchOpenRequests(backendUser.id));
    } else if (!user) {
      dispatch(clearOpenRequests());
    }
  }, [dispatch, user, backendUser?.id]);

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
        <OpenRequestSync />
        {__DEV__ ? (
          // Tap any on-screen component to jump straight to its source file
          // in WebStorm (configured in metro.config.js). InspectorDevMenu
          // adds a toggle to the in-app dev menu to turn tap-to-inspect on/off.
          // Both are dev-only — stripped entirely from production bundles.
          <Inspector>
            <Slot />
            <InspectorDevMenu />
          </Inspector>
        ) : (
          <Slot />
        )}
      </AuthProvider>
    </Provider>
  );
}
