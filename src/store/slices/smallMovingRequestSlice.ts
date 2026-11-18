import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { AddressDetails } from './movingRequestSlice';
import type { MoveScopeOption } from '../../components/ui';
import type { AdditionalServiceType } from '../../types';
import type { RfqPhotoItem } from '../../hooks/useRfqPhotoUpload';

type Slot = 'from' | 'to';

/**
 * Small Moving wizard's in-progress draft — exists purely so the wizard can
 * survive the round trip to `/profile/edit` and back when a signed-in user
 * without a backend `users` row tries to submit (see
 * `SmallMovingWizardScreen.handleCreateProfile`). expo-router's `<Slot />`
 * root layout fully unmounts the previous route on navigation (it doesn't
 * keep a native stack around the way `<Stack />` would), so without this
 * the wizard's local component state — addresses, schedule, uploaded
 * photos — would be silently wiped out the moment the user navigated away
 * to complete their profile.
 *
 * Deliberately kept as its own slice rather than reusing `movingRequest`
 * (Residential's draft slice): the two wizards are independently
 * navigable and may have unrelated in-progress drafts at different times,
 * and `SmallMovingWizardScreen`'s fields (move type, S3 photo keys) don't
 * map 1:1 onto `movingRequestSlice`'s shape anyway.
 */
interface SmallMovingRequestState {
  wizardStep: number;
  moveType: MoveScopeOption | null;
  fromAddress: AddressDetails | null;
  toAddress: AddressDetails | null;
  selectedMoveScopeBySlot: Record<Slot, MoveScopeOption | null>;
  moveDate: string;
  timeWindow: string;
  notes: string;
  isFlexibleDate: boolean;
  additionalServices: AdditionalServiceType[];
  // Full photo items (incl. `localUri`/`status`/`s3ObjectKey`) rather than
  // just the uploaded S3 keys, so `useRfqPhotoUpload` can rehydrate its
  // state exactly as the user left it (including a photo stuck mid-upload
  // or errored, so "Retry" still works) after remounting.
  photos: RfqPhotoItem[];
}

const initialState: SmallMovingRequestState = {
  wizardStep: 1,
  moveType: null,
  fromAddress: null,
  toAddress: null,
  selectedMoveScopeBySlot: { from: null, to: null },
  moveDate: '',
  timeWindow: '',
  notes: '',
  isFlexibleDate: false,
  additionalServices: [],
  photos: [],
};

const smallMovingRequestSlice = createSlice({
  name: 'smallMovingRequest',
  initialState,
  reducers: {
    // Single "save everything" action (rather than one setter per field,
    // like `movingRequestSlice`) since this slice only ever needs to
    // persist/restore the whole draft at once around the profile-creation
    // round trip, never update one field at a time from the UI.
    setSmallMovingDraft: (state, action: PayloadAction<Partial<SmallMovingRequestState>>) => {
      Object.assign(state, action.payload);
    },
    resetSmallMovingRequest: () => initialState,
  },
});

export const { setSmallMovingDraft, resetSmallMovingRequest } = smallMovingRequestSlice.actions;
export default smallMovingRequestSlice.reducer;

type SmallMovingRequestSliceState = { smallMovingRequest: SmallMovingRequestState };

export const selectSmallMovingDraft = (state: SmallMovingRequestSliceState) =>
  state.smallMovingRequest;
