import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import userReducer from './slices/userSlice';
import servicesReducer from './slices/servicesSlice';
import movingRequestReducer from './slices/movingRequestSlice';
import propertyTypesReducer from './slices/propertyTypesSlice';
import openRequestReducer from './slices/openRequestSlice';
import bidReducer from './slices/bidSlice';

// Reactotron must be configured (src/config/reactotron.ts, imported from
// index.ts) *before* this module runs, so its enhancer exists in time to be
// passed into configureStore below. Dev-only — never included in prod
// builds since __DEV__ is statically false there and Metro/Hermes strip the
// unreachable branch.
const reactotron = __DEV__ ? require('../config/reactotron').default : undefined;

export const store = configureStore({
  reducer: {
    user: userReducer,
    services: servicesReducer,
    movingRequest: movingRequestReducer,
    propertyTypes: propertyTypesReducer,
    openRequest: openRequestReducer,
    bid: bidReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
  enhancers: (getDefaultEnhancers) =>
    __DEV__ && reactotron?.createEnhancer
      ? getDefaultEnhancers().concat(reactotron.createEnhancer())
      : getDefaultEnhancers(),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Custom hooks for typed dispatch and selector
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
