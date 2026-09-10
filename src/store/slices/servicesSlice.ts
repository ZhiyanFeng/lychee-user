import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiService } from '../../services';
import { API_ENDPOINTS } from '../../constants';

export interface MovingService {
  id: string;
  code: string;
  name: string;
  description: string;
  active: boolean;
}

interface ServicesApiResponse {
  data: MovingService[];
  message?: string;
}

interface ServicesState {
  items: MovingService[];
  loading: boolean;
  error: string | null;
}

const initialState: ServicesState = {
  items: [],
  loading: false,
  error: null,
};

export const fetchServices = createAsyncThunk(
  'services/fetch',
  async () => {
    const response = await apiService.get<ServicesApiResponse>(API_ENDPOINTS.SERVICES);
    return response.data;
  },
  {
    // Skip the network call entirely if we already have data (or a request
    // is already in flight) — this is what makes it safe/cheap to dispatch
    // this thunk from every screen that needs it (Explore, app startup,
    // etc.) without worrying about redundant refetches.
    condition: (_, { getState }) => {
      const { services } = getState() as { services: ServicesState };
      return !services.loading && services.items.length === 0;
    },
  }
);

const servicesSlice = createSlice({
  name: 'services',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchServices.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchServices.fulfilled, (state, action: PayloadAction<MovingService[]>) => {
        state.items = action.payload;
        state.loading = false;
      })
      .addCase(fetchServices.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Failed to load services';
      });
  },
});

export default servicesSlice.reducer;

// The backend already filters to active services only, so no client-side
// is_active filtering is needed here.
export const selectServices = (state: { services: ServicesState }) => state.services.items;

