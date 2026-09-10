import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import userReducer from './slices/userSlice';
import servicesReducer from './slices/servicesSlice';
import inventoryReducer from './slices/inventorySlice';
import movingRequestReducer from './slices/movingRequestSlice';

export const store = configureStore({
  reducer: {
    user: userReducer,
    services: servicesReducer,
    inventory: inventoryReducer,
    movingRequest: movingRequestReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Custom hooks for typed dispatch and selector
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
