// API base URL
// NOTE: 127.0.0.1/localhost refers to the device/emulator itself, NOT your
// dev machine — that's why requests were failing with "Network Error".
//   - Physical device: use your machine's LAN IP (found via `hostname -I`) —
//     the device and dev machine must be on the same Wi-Fi network, and the
//     backend must bind to 0.0.0.0 (all interfaces), not just 127.0.0.1.
//   - Android Emulator: use 10.0.2.2 instead (special alias to host machine)
//   - iOS Simulator: 127.0.0.1 works fine (shares host network)
export const API_BASE_URL = __DEV__
  ? 'http://10.0.0.236:8080/api/v1'
  : 'https://api.production.com';

// App constants
export const APP_NAME = 'LycheeTech Moving App';
export const APP_VERSION = '1.0.0';

// OAuth Web Client ID (from google-services.json, client_type: 3)
// Required by Google Sign-In / Credential Manager to obtain an ID token
// that can be exchanged for a Firebase credential.
export const GOOGLE_WEB_CLIENT_ID =
  '421396089888-pjujm9ns7dervsss2mdcgtpbqgrtp3nu.apps.googleusercontent.com';

// Google Places API key for address autocomplete (moving-request wizard).
// NOTE: This must be a separate key from GOOGLE_WEB_CLIENT_ID above — that
// one is an OAuth client ID for Firebase/Google Sign-In, this is a Places API
// key from Google Cloud Console with "Places API" enabled.
//
// Used via `react-native-google-places-sdk` (native Places SDK for
// Android/iOS, initialized once in `app/_layout.tsx`), NOT a raw REST call.
// Because the native SDK attaches this app's package name + SHA-1
// certificate fingerprint (Android) / bundle ID (iOS) to every request, the
// key CAN and SHOULD be restricted:
//   Console path: APIs & Services > Credentials > (this key) > Application
//   restrictions > "Android apps" -> add package name `com.lycheetech.moving`
//   + the SHA-1 fingerprint of your signing cert (debug AND release each
//   need their own entry — get the debug one via:
//   `keytool -list -v -keystore android/app/debug.keystore -alias androiddebugkey -storepass android -keypass android`).
//   Also add an "iOS apps" entry with the bundle ID if/when iOS is built.
// Also ensure "Places API" (legacy) is enabled under API restrictions, and
// billing is enabled on the project.
export const GOOGLE_PLACES_API_KEY = 'AIzaSyBg7fYlAWwn4Fu7BFnKoiV0kT_KoStdEiI';

// Storage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: '@auth_token',
  USER_DATA: '@user_data',
  THEME: '@theme',
} as const;

// API endpoints
export const API_ENDPOINTS = {
  // NOTE: No LOGIN/REGISTER here — those are handled entirely by Firebase
  // (see AuthContext/useAuth), not this backend. LOGOUT is kept in case the
  // backend needs to invalidate a server-side session/refresh token on
  // sign-out; remove it too if that's not the case.
  LOGOUT: '/auth/logout',
  PROFILE: '/users/me',
  UPDATE_PROFILE: '/user/profile/update',
  CREATE_PROFILE: '/users',
  SERVICES: '/moving-services',
  INVENTORY_ITEMS: '/inventory-items',
  // Maps to the `rfqs` table: user_id is derived server-side from the
  // Firebase ID token (never sent by the client); status_id defaults to the
  // initial rfq_statuses row server-side too — the client never sets it.
  RFQS: '/rfqs',
  // "Stitch-at-the-End" photo upload pattern (SmallMovingWizardScreen):
  // the client asks for a short-lived S3 presigned PUT URL per photo here,
  // uploads the raw bytes directly to S3 (never through this backend), then
  // only sends the resulting `s3ObjectKeys` as part of the final RFQS POST.
  MEDIA_PRESIGN: '/media/presign',
  MOVE_SCOPES: '/move-scopes',
  // Open (in-progress/unconfirmed) requests for a given backend user — an
  // RFQ that's been submitted but hasn't been completed/canceled yet
  // (`status: "OPEN"`). userId is the backend `users.id` (NOT the Firebase
  // uid) — see userSlice's `User.id`.
  OPEN_REQUESTS: (userId: string | number) => `/rfqs/user/${userId}/open`,
  // All bids (quotes) submitted by movers against a given RFQ —
  // `@GetMapping("/rfq/{rfqId}")` on the backend's bid controller.
  BIDS_FOR_RFQ: (rfqId: string) => `bids/rfq/${rfqId}`,
} as const;

// Theme colors
export const COLORS = {
  primary: '#007AFF',
  secondary: '#5856D6',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  background: {
    light: '#FFFFFF',
    dark: '#000000',
  },
  text: {
    light: '#000000',
    dark: '#FFFFFF',
  },
  border: {
    light: '#E5E5E5',
    dark: '#38383A',
  },
} as const;

// Spacing
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

// Font sizes
export const FONT_SIZES = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 24,
  xxl: 32,
} as const;
