// Reactotron must be the very first thing imported so it's connected before
// the Redux store (src/store/index.ts) and any Firebase/service calls are
// created — otherwise early actions/network requests would happen before
// the enhancer/logger is attached. Dev-only, no-ops out entirely in prod.
if (__DEV__) {
  require('./src/config/reactotron');
}

import 'expo-router/entry';
