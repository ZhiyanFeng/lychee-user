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
  const data = raw?.data ?? raw;
  return {
    id: String(data.id ?? ''),
    firebaseUid: data.firebase_uid ?? data.firebaseUid ?? '',
    email: data.email ?? '',
    firstName: data.first_name ?? data.firstName ?? '',
    lastName: data.last_name ?? data.lastName ?? '',
    phoneNumber: data.phone_number ?? data.phoneNumber ?? '',
    avatarUrl: data.avatar_url ?? data.avatarUrl ?? null,
    ratingAvg: Number(data.rating_avg ?? data.ratingAvg ?? 5),
    completedMoves: Number(data.completed_moves ?? data.completedMoves ?? 0),
    canceledMoves: Number(data.canceled_moves ?? data.canceledMoves ?? 0),
  };
}

// Small helper for the retry-on-empty-id backoff below.
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const fetchUser = createAsyncThunk(
  'user/fetch',
  async (_, { rejectWithValue }) => {
    try {
      // Guard against a malformed/incomplete response where the row comes
      // back with an empty `id` (e.g. backend still finishing a write, or a
      // transient bad payload) — retry a few times with a short backoff
      // rather than caching a broken user into state.
      const maxAttempts = 3;
      let normalized = normalizeUser((await userService.getUser()) as RawUser);

      for (let attempt = 1; attempt < maxAttempts && !normalized.id; attempt++) {
        await delay(300 * attempt);
        normalized = normalizeUser((await userService.getUser()) as RawUser);
      }

      if (!normalized.id) {
        throw new Error('User profile fetch returned an empty id after retrying');
      }

      return normalized;
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
    // Skip the network call only if we already have the user loaded or one
    // is already in flight. Deliberately does NOT skip based on a stale
    // `exists: false` from an earlier check — a profile may have since been
    // created (e.g. via another device/session), so callers that need fresh
    // data (like the edit screen, on every mount) must be able to re-check
    // the backend rather than getting stuck on an outdated "not found".
    // Cleared back to initial on sign-out via `clearUser`, so a new sign-in
    // always re-fetches.
    condition: (_, { getState }) => {
      const { user } = getState() as { user: UserState };
      return !user.loading && user.data === null;
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
    const normalized = normalizeUser(response as RawUser);
    // Prefer what we just submitted over the create response's echo for
    // these fields — some backends return stubbed/incomplete data on
    // create, which would otherwise silently overwrite what the user typed
    // (e.g. showing a stale/mock name next time the edit screen prefills).
    return {
      ...normalized,
      firstName: input.firstName,
      lastName: input.lastName,
      phoneNumber: input.phoneNumber,
      email: input.email,
    };
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
    const normalized = normalizeUser(response as RawUser);
    // Same rationale as createUser: trust the values we just submitted over
    // a potentially stale/incomplete echo from the update response.
    return {
      ...normalized,
      ...(changes.firstName !== undefined && { firstName: changes.firstName }),
      ...(changes.lastName !== undefined && { lastName: changes.lastName }),
      ...(changes.phoneNumber !== undefined && { phoneNumber: changes.phoneNumber }),
      ...(changes.email !== undefined && { email: changes.email }),
    };
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

