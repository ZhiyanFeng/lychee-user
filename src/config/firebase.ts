import auth, { GoogleAuthProvider } from '@react-native-firebase/auth';
import crashlytics from '@react-native-firebase/crashlytics';

// Firebase is already initialized via google-services.json
// Export the auth instance for use throughout the app
export const firebaseAuth = auth();
export const firebaseCrashlytics = crashlytics();
export { GoogleAuthProvider };

export default {
  auth: firebaseAuth,
  crashlytics: firebaseCrashlytics,
};
