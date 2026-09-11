import Reactotron from 'reactotron-react-native';
import { reactotronRedux } from 'reactotron-redux';

/**
 * Reactotron setup — dev-only Redux/state/API inspector.
 *
 * Import this module as early as possible (see `index.ts`), before the
 * Redux store is created, so the enhancer created here (`Reactotron.createEnhancer()`)
 * is ready by the time `configureStore` runs in `src/store/index.ts`.
 *
 * Connect with the Reactotron desktop app (https://github.com/infinitered/reactotron)
 * running on the same machine/network as your Metro bundler. It auto-detects
 * the device via the same connection used for Fast Refresh, no extra config
 * needed for the emulator/simulator. For a physical device, you may need to
 * run `adb reverse tcp:9090 tcp:9090` (Android) so it can reach your machine.
 */
const reactotron = Reactotron.configure({
  name: 'LycheeTech Moving App',
})
  .useReactNative({
    networking: true, // logs fetch/axios requests+responses
    editor: false,
    errors: { veto: () => false },
    overlay: false,
  })
  .use(reactotronRedux())
  .connect();

// Makes `console.tron.log(...)` etc. available anywhere in the app for
// ad-hoc debugging without importing this module directly.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Console {
    interface Console {
      tron: typeof Reactotron;
    }
  }
}
// @ts-ignore - attach for convenience (console.tron.log/display/...)
console.tron = Reactotron;

export default reactotron;

