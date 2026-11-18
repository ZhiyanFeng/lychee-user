// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const { withInspector } = require('react-native-dev-inspector/metro');
const { withNativeWind } = require('nativewind/metro');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Enables tapping a component on-screen (via the Inspector overlay, see
// src/app/_layout.tsx) to jump straight to its source location in
// WebStorm/IntelliJ. Only affects dev builds — no-op in production since
// the <Inspector>/<InspectorDevMenu> components are gated on __DEV__.
module.exports = withNativeWind(withInspector(config, { editor: 'webstorm' }), {
  input: './global.css',
});

