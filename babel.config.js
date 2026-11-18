// Learn more https://docs.expo.dev/versions/latest/config/babel/
const { inspectorBabelPlugin } = require('react-native-dev-inspector/metro');

module.exports = function (api) {
  api.cache(true);
  return {
    // `jsxImportSource: 'nativewind'` + the `nativewind/babel` preset below
    // compile `className` props on RN primitives into StyleSheet objects at
    // build time, so Tailwind utility classes work the same way they do on
    // the web without any runtime CSS engine.
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
    plugins: [
      // Embeds precise file/line source info at compile time, so tapping a
      // component in the Inspector overlay (src/app/_layout.tsx) reliably
      // resolves a location instead of showing "No source info available"
      // for components the runtime-only fiber inspection can't pin down
      // (inline JSX in callbacks, mapped lists, HOC-wrapped components, etc).
      inspectorBabelPlugin,
    ],
  };
};

