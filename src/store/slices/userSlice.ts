import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { userService } from '../../services';

/**
 * Mirrors the backend `users` table:
 *   id, firebase_uid, email                          -> identity/auth mapping (NOT NULL/UNIQUE)
 *   first_name, last_name, phone_number, avatar_url   -> profile info (NOT NULL except avatar_url)
 *   rating_avg, completed_moves, canceled_moves       -> live marketplace aggregates, server-computed
 *                                                         (rolling average from reviews / move history —
 *                                                         read-only from the client's perspective)
 */
export interface User {
  id: string;
  firebaseUid: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  avatarUrl: string | null;
  ratingAvg: number;
  completedMoves: number;
  canceledMoves: number;
}

interface UserState {
  data: User | null;
  loading: boolean;
  error: string | null;
  // null  = not checked yet
  // true  = row exists in the `users` table
  // false = confirmed missing (GET /user/profile returned 404) — the user is
  //         authenticated via Firebase but hasn't completed their profile.
  exists: boolean | null;
}

const initialState: UserState = {
  data: null,
  loading: false,
  error: null,
  exists: null,
};

// Tolerate snake_case or camelCase field casing from the backend — same
// normalization approach already used for inventory items / moving services.
type RawUser = Record<string, any>;

function normalizeUser(raw: RawUser): User {
  return {
    id: String(raw.id ?? ''),
    firebaseUid: raw.firebase_uid ?? raw.firebaseUid ?? '',
    email: raw.email ?? '',
    firstName: raw.first_name ?? raw.firstName ?? '',
    lastName: raw.last_name ?? raw.lastName ?? '',
    phoneNumber: raw.phone_number ?? raw.phoneNumber ?? '',
    avatarUrl: raw.avatar_url ?? raw.avatarUrl ?? null,
    ratingAvg: Number(raw.rating_avg ?? raw.ratingAvg ?? 5),
    completedMoves: Number(raw.completed_moves ?? raw.completedMoves ?? 0),
    canceledMoves: Number(raw.canceled_moves ?? raw.canceledMoves ?? 0),
  };
}

export const fetchUser = createAsyncThunk(
  'user/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const response = await userService.getUser();
      return normalizeUser(response as RawUser);
    } catch (err: any) {
      // 404 = authenticated but no `users` row yet. Signal that distinctly
      // from network/server errors so the UI can offer "complete profile"
      // instead of showing a generic failure.
      if (err?.response?.status === 404) {
        return rejectWithValue({ notFound: true });
      }
      throw err;
    }
  },
  {
    // Skip the network call if we already have the user loaded, one is in
    // flight, or we've already confirmed the row doesn't exist. Cleared back
    // to initial on sign-out via `clearUser`, so a new sign-in re-fetches.
    condition: (_, { getState }) => {
      const { user } = getState() as { user: UserState };
      return !user.loading && user.data === null && user.exists !== false;
    },
  }
);

export interface CreateUserInput {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email: string;
}

export const createUser = createAsyncThunk(
  'user/create',
  async (input: CreateUserInput) => {
    const payload = {
      firstName: input.firstName,
      lastName: input.lastName,
      phoneNumber: input.phoneNumber,
      email: input.email,
    };
    const response = await userService.createUser(payload);
    return normalizeUser(response as RawUser);
  }
);

export const updateUser = createAsyncThunk(
  'user/update',
  async (
    changes: Partial<Omit<User, 'id' | 'firebaseUid' | 'ratingAvg' | 'completedMoves' | 'canceledMoves'>>
  ) => {
    const payload = {
      firstName: changes.firstName,
      lastName: changes.lastName,
      phoneNumber: changes.phoneNumber,
      avatarUrl: changes.avatarUrl,
      email: changes.email,
    };
    const response = await userService.updateUser(payload);
    return normalizeUser(response as RawUser);
  }
);

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    // Wipes any cached user data — call this on sign-out so a different
    // user signing in on the same device session doesn't briefly see stale data.
    clearUser: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUser.fulfilled, (state, action: PayloadAction<User>) => {
        state.data = action.payload;
        state.exists = true;
        state.loading = false;
      })
      .addCase(fetchUser.rejected, (state, action) => {
        state.loading = false;
        const payload = action.payload as { notFound?: boolean } | undefined;
        if (payload?.notFound) {
          state.exists = false;
          state.error = null;
        } else {
          state.error = action.error.message ?? 'Failed to load user';
        }
      })
      .addCase(createUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createUser.fulfilled, (state, action: PayloadAction<User>) => {
        state.data = action.payload;
        state.exists = true;
        state.loading = false;
      })
      .addCase(createUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Failed to create profile';
      })
      .addCase(updateUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateUser.fulfilled, (state, action: PayloadAction<User>) => {
        state.data = action.payload;
        state.loading = false;
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Failed to update user';
      });
  },
});

export const { clearUser } = userSlice.actions;
export default userSlice.reducer;

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------
type UserSliceState = { user: UserState };

export const selectUser = (state: UserSliceState) => state.user.data;
export const selectUserLoading = (state: UserSliceState) => state.user.loading;
export const selectUserError = (state: UserSliceState) => state.user.error;
export const selectUserExists = (state: UserSliceState) => state.user.exists;

export const selectUserFullName = (state: UserSliceState) => {
  const user = state.user.data;
  if (!user) return null;
  return `${user.firstName} ${user.lastName}`.trim();
};

export const selectUserRatingAvg = (state: UserSliceState) => state.user.data?.ratingAvg ?? null;
export const selectUserCompletedMoves = (state: UserSliceState) => state.user.data?.completedMoves ?? 0;
export const selectUserCanceledMoves = (state: UserSliceState) => state.user.data?.canceledMoves ?? 0;

