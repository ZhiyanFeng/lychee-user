// Learn more https://docs.expo.dev/versions/latest/config/babel/
const { inspectorBabelPlugin } = require('react-native-dev-inspector/metro');

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
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

