import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Container, Layout, Button, Text, formatMoveScopeLabel } from '../ui';
import type { GooglePlaceSelection, MoveScopeOption } from '../ui';
import { useColors } from '../../hooks/useColors';
import { BookingHeader, Step1Locations, Step2Schedule } from '../booking-wizard';
import { Step1MoveType } from './Step1MoveType';
import { Step3PhotoUpload } from './Step3PhotoUpload';
import { Step4ReviewSubmit } from './Step4ReviewSubmit';
import { spacing } from '../../../themes';
import { isFutureDate } from '../../utils/date';
import { useRfqPhotoUpload } from '../../hooks/useRfqPhotoUpload';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchUser, selectUser, selectUserExists } from '../../store/slices/userSlice';
import { fetchOpenRequests } from '../../store/slices/openRequestSlice';
import { fetchMoveScopes, selectMoveScopes } from '../../store/slices/moveScopesSlice';
import type { AddressDetails, ParkingType } from '../../store/slices/movingRequestSlice';
import type { AdditionalServiceType } from '../../types';
import {
  setSmallMovingDraft,
  resetSmallMovingRequest,
  selectSmallMovingDraft,
} from '../../store/slices/smallMovingRequestSlice';
import { createRfq, addressToRfqPayload } from '../../api/rfq';

// rfqs.move_date is a DATE column — validate the plain 'YYYY-MM-DD' shape
// client-side before ever sending it, same guard as BookingFlow.
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TOTAL_STEPS = 5;
type Slot = 'from' | 'to';

// The backend's "Small Move" category — shared by this wizard's own
// move-type step and the filtered move-scope pickers in Steps 2-3 (see
// `smallMoveOptions` below).
const SMALL_MOVE_CATEGORY = 'Small Move';

const STEP_TITLES: Record<number, string> = {
  1: 'What Are You Moving?',
  2: 'Pickup & Route',
  3: 'Schedule & Details',
  4: 'Photos',
  5: 'Review & Submit',
};

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function animateNextLayout() {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
}

/**
 * 5-step Small Moving RFQ creation wizard using the "Stitch-at-the-End"
 * photo upload pattern: photos are presigned + uploaded straight to S3 as
 * soon as they're picked in Step 4 (see `useRfqPhotoUpload`), and only
 * their resulting `s3ObjectKey`s are "stitched" into the final `POST
 * /rfqs` payload on Step 5's submit.
 *
 * Step 1 ("What Are You Moving?") lets the customer pick between the
 * backend's "Small Move" category move scopes (e.g. "Single Room / Dorm"
 * vs "Furniture / Specific Items") before anything else — that choice
 * pre-fills and restricts the pickup/destination move-scope pickers shown
 * in Steps 2-3 down to just this category (see `smallMoveOptions` below).
 *
 * Steps 2-3 reuse the Residential Moving wizard's `Step1Locations`/
 * `Step2Schedule` components verbatim (same Google Places autocomplete,
 * move scope picker, and Dynamic Conditional Swap access-details
 * logic) — see `booking-wizard/BookingFlow.tsx` for the canonical
 * reference this mirrors. Unlike `BookingFlow`, every field here still
 * lives purely in this component's local state (not `movingRequestSlice`)
 * — this is a separate, independently-navigable wizard (entered directly
 * from Explore via `serviceId` route param rather than a Redux-dispatched
 * draft), so sharing that slice would mean mixing two unrelated in-progress
 * drafts. Keeping it local (rather than dispatching a Redux action per
 * field edit, the way `BookingFlow` does) also means a failed submit can
 * retry instantly without re-uploading any photos.
 *
 * The one exception: this wizard's own `smallMovingRequestSlice` snapshots
 * the whole draft (addresses, schedule, uploaded photos) right before
 * navigating to `/profile/edit` for an unregistered user, and local state
 * is re-seeded from it on mount — otherwise expo-router's `<Slot />` root
 * layout would unmount this screen on that navigation and silently wipe
 * everything the user had entered. See `handleCreateProfile` below.
 */
export function SmallMovingWizardScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { serviceId: serviceIdParam } = useLocalSearchParams<{ serviceId?: string }>();
  const backendUser = useAppSelector(selectUser);
  const userExists = useAppSelector(selectUserExists);
  const savedDraft = useAppSelector(selectSmallMovingDraft);

  const allMoveScopes = useAppSelector(selectMoveScopes);
  // This wizard only ever deals with the "Small Move" category — unlike
  // `BookingFlow`, the pickup/destination move-scope pickers in Steps 2-3
  // never need the full Apartment/House/Townhouse catalog, so both the new
  // Step 1 and those pickers are scoped down to just these options.
  const smallMoveOptions = useMemo(
    () => allMoveScopes.filter((option) => option.category === SMALL_MOVE_CATEGORY),
    [allMoveScopes]
  );
  const smallMoveCategories = useMemo(
    () => Array.from(new Set(smallMoveOptions.map((option) => option.category))),
    [smallMoveOptions]
  );

  const [step, setStep] = useState(savedDraft.wizardStep || 1);
  const [moveType, setMoveType] = useState<MoveScopeOption | null>(savedDraft.moveType);
  const [fromAddress, setFromAddress] = useState<AddressDetails | null>(savedDraft.fromAddress);
  const [toAddress, setToAddress] = useState<AddressDetails | null>(savedDraft.toAddress);
  const [selectedMoveScopeBySlot, setSelectedMoveScopeBySlot] = useState<
    Record<Slot, MoveScopeOption | null>
  >(savedDraft.selectedMoveScopeBySlot);
  const [moveDate, setMoveDate] = useState(savedDraft.moveDate);
  const [timeWindow, setTimeWindow] = useState(savedDraft.timeWindow);
  const [notes, setNotes] = useState(savedDraft.notes);
  const [isFlexibleDate, setIsFlexibleDate] = useState(savedDraft.isFlexibleDate);
  const [additionalServices, setAdditionalServices] = useState<AdditionalServiceType[]>(
    savedDraft.additionalServices
  );
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pickerError, setPickerError] = useState<string | null>(null);

  const {
    photos,
    isUploading,
    s3ObjectKeys,
    pickFromLibrary,
    takePhoto,
    retryPhoto,
    removePhoto,
    movePhoto,
  } = useRfqPhotoUpload(savedDraft.photos);

  useEffect(() => {
    dispatch(fetchMoveScopes());
  }, [dispatch]);

  const buildAutoDefaultChanges = (option: MoveScopeOption): Partial<AddressDetails> => {
    const changes: Partial<AddressDetails> = { moveScope: formatMoveScopeLabel(option) };
    if (option.isBasement || option.category === 'Townhouse') {
      changes.stairsCount = 1;
    }
    if (option.category === 'Apartment') {
      changes.hasElevator = true;
    }
    return changes;
  };

  const handleSelectPlace = (slot: Slot, place: GooglePlaceSelection) => {
    const setter = slot === 'from' ? setFromAddress : setToAddress;
    const previous = slot === 'from' ? fromAddress : toAddress;
    // Step 1's move-type choice pre-fills this slot's move scope (see
    // `handleSelectMoveType`) before an address even exists yet, so once
    // one's picked here, apply that same pre-fill's auto-default changes
    // (unless the user already customized them on a previous address pick).
    const prefilled = !previous?.moveScope ? selectedMoveScopeBySlot[slot] : null;
    setter({
      ...place,
      moveScope: previous?.moveScope,
      stairsCount: previous?.stairsCount,
      parkingType: previous?.parkingType,
      hasElevator: previous?.hasElevator ?? null,
      parkingRestrictions: previous?.parkingRestrictions,
      ...(prefilled ? buildAutoDefaultChanges(prefilled) : {}),
    });
  };

  const handleLogisticsChange = (slot: Slot, changes: Partial<AddressDetails>) => {
    const setter = slot === 'from' ? setFromAddress : setToAddress;
    setter((prev) => (prev ? { ...prev, ...changes } : prev));
  };

  const handleSelectMoveType = (option: MoveScopeOption) => {
    animateNextLayout();
    setMoveType(option);
    // Pre-fill both pickup/destination move-scope pickers with this same
    // choice — Small Moving requests are almost always a single move type
    // end-to-end, but the user can still override either one in Steps 2-3
    // since those pickers stay restricted to `smallMoveOptions`.
    setSelectedMoveScopeBySlot({ from: option, to: option });
  };

  const handleSelectPickupMoveScope = (option: MoveScopeOption) => {
    animateNextLayout();
    setSelectedMoveScopeBySlot((prev) => ({ ...prev, from: option }));
    handleLogisticsChange('from', buildAutoDefaultChanges(option));
  };

  const handleSelectDestinationMoveScope = (option: MoveScopeOption) => {
    animateNextLayout();
    setSelectedMoveScopeBySlot((prev) => ({ ...prev, to: option }));
    handleLogisticsChange('to', buildAutoDefaultChanges(option));
  };

  const handleChangeElevator = (slot: Slot, hasElevator: boolean) => {
    animateNextLayout();
    const setter = slot === 'from' ? setFromAddress : setToAddress;
    setter((prev) => {
      if (!prev) return prev;
      if (hasElevator) {
        return { ...prev, hasElevator: true, stairsCount: 0 };
      }
      return {
        ...prev,
        hasElevator: false,
        stairsCount: prev.stairsCount && prev.stairsCount > 0 ? prev.stairsCount : 1,
      };
    });
  };

  const handlePickFromLibrary = async () => {
    setPickerError(null);
    const result = await pickFromLibrary();
    if (result.error) setPickerError(result.error);
  };

  const handleTakePhoto = async () => {
    setPickerError(null);
    const result = await takePhoto();
    if (result.error) setPickerError(result.error);
  };

  const handleBack = () => {
    animateNextLayout();
    if (step > 1) {
      setFormError('');
      setStep((current) => current - 1);
      return;
    }
    // Mirrors BookingFlow's rule: if there's navigation history (e.g. this
    // wizard was pushed from Explore), go back to wherever the user came
    // from; otherwise (a direct deep link) fall back to Explore.
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(app)/explore');
    }
  };

  const handleNext = () => {
    if (step === 1) {
      if (!moveType) {
        setFormError("Please select what you're moving");
        return;
      }
      setFormError('');
      animateNextLayout();
      setStep(2);
      return;
    }
    if (step === 2) {
      if (!fromAddress || !toAddress) {
        setFormError('Please select both the pickup and destination addresses from the suggestions');
        return;
      }
      setFormError('');
      animateNextLayout();
      setStep(3);
      return;
    }
    if (step === 3) {
      if (!DATE_PATTERN.test(moveDate)) {
        setFormError('Please select your move date');
        return;
      }
      if (!isFutureDate(moveDate)) {
        setFormError("Please select a move date in the future — today's date can't be used.");
        return;
      }
      if (!timeWindow) {
        setFormError('Please choose a delivery time window');
        return;
      }
      setFormError('');
      animateNextLayout();
      setStep(4);
      return;
    }
    if (step === 4) {
      if (isUploading) {
        setFormError('Please wait for all photos to finish uploading.');
        return;
      }
      setFormError('');
      animateNextLayout();
      setStep(5);
    }
  };

  const handleToggleAdditionalService = (service: AdditionalServiceType) => {
    setAdditionalServices((current) =>
      current.includes(service) ? current.filter((item) => item !== service) : [...current, service]
    );
  };

  // Snapshots every field this wizard currently holds in local state into
  // `smallMovingRequestSlice` — called right before navigating away to
  // `/profile/edit`, since expo-router's `<Slot />` root layout unmounts
  // this screen on that navigation (see the component doc comment above).
  // `stepOverride` lets the caller pin which step the wizard should resume
  // on next mount, regardless of which step is actually active right now
  // (mirrors `BookingFlow.persistDraftToStore`).
  const persistDraftToStore = (stepOverride?: number) => {
    dispatch(
      setSmallMovingDraft({
        wizardStep: stepOverride ?? step,
        moveType,
        fromAddress,
        toAddress,
        selectedMoveScopeBySlot,
        moveDate,
        timeWindow,
        notes,
        isFlexibleDate,
        additionalServices,
        photos,
      })
    );
  };

  // Navigates to the profile-creation screen rather than submitting. Saves
  // the in-progress draft first (see `persistDraftToStore`) so nothing is
  // lost while the user is away completing their profile, and pins the
  // resume point to Step 5 (Review & Submit) so navigating back always
  // lands the user ready to tap "Submit RFQ" again, instead of restarting
  // the wizard from Step 1.
  const handleCreateProfile = () => {
    persistDraftToStore(5);
    router.push('/profile/edit');
  };

  const handleSubmit = async () => {
    if (!fromAddress || !toAddress) return;
    // Defense-in-depth: re-validate even on the final submit tap, in case
    // the app was left open past midnight since the date was picked back
    // on Step 3 — the backend's `@Future` moveDate would otherwise reject
    // ("crash") the request with a validation error.
    if (!isFutureDate(moveDate)) {
      setFormError("Please select a move date in the future — today's date can't be used.");
      setStep(3);
      return;
    }

    // Force profile completion before submitting an RFQ — movers need a
    // name/phone number to reach the requester, and without a `users` row
    // the backend has nothing to attach the request to. Mirrors
    // `BookingFlow.handleSubmit`'s gating exactly.
    let hasProfile = userExists;
    if (hasProfile === null) {
      // Not checked yet (e.g. UserSync hasn't resolved on a very fast tap)
      // — check now rather than letting a stale null slip through.
      try {
        await dispatch(fetchUser()).unwrap();
        hasProfile = true;
      } catch (err: any) {
        hasProfile = err?.notFound ? false : null;
      }
    }
    if (hasProfile === false) {
      setFormError('Please complete your profile before submitting a move request.');
      handleCreateProfile(); // persists the draft before navigating away
      return;
    }

    setSubmitError(null);
    setSubmitting(true);
    try {
      const result = await createRfq({
        serviceId: Number(serviceIdParam) || 0,
        originAddress: addressToRfqPayload(fromAddress),
        destinationAddress: addressToRfqPayload(toAddress),
        moveDate,
        timeWindow,
        notes: notes.trim(),
        specialtyItems: [],
        s3ObjectKeys,
        isFlexibleDate,
        additionalServices,
      });

      // Refresh openRequestSlice so Home's RecentActivityCard and the bids
      // screen we're about to navigate to both see this new RFQ right
      // away, instead of waiting for the next natural sync.
      if (backendUser?.id) {
        await dispatch(fetchOpenRequests(backendUser.id));
      }

      Alert.alert('Request Submitted!', 'Movers can now start bidding on your move.', [
        {
          text: 'OK',
          onPress: () => {
            // Clears any snapshot saved via `persistDraftToStore` so a
            // future visit to this wizard never resumes a stale, already-
            // submitted draft.
            dispatch(resetSmallMovingRequest());
            // Land back on Home (rather than the bids screen) — Home's
            // RecentActivityCard already shows the new RFQ immediately
            // thanks to the `fetchOpenRequests` refresh above.
            router.replace('/(app)');
          },
        },
      ]);
    } catch (error) {
      // Keep all wizard state (including already-uploaded s3ObjectKeys)
      // intact so the user can retry without re-uploading photos.
      setSubmitError(error instanceof Error ? error.message : 'Failed to submit your moving request');
    } finally {
      setSubmitting(false);
    }
  };

  const needsProfile = userExists === false;

  return (
    <Container>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <BookingHeader
            title={STEP_TITLES[step]}
            step={step}
            totalSteps={TOTAL_STEPS}
            onBack={handleBack}
          />
          <Layout spacing={spacing.lg}>
            {formError ? (
              <Text variant="caption" style={{ color: '#FF3B30' }}>
                {formError}
              </Text>
            ) : null}

            {step === 1 && (
              <Step1MoveType
                options={smallMoveOptions}
                value={moveType}
                onSelectMoveType={handleSelectMoveType}
              />
            )}

            {step === 2 && (
              <Step1Locations
                fromAddress={fromAddress}
                toAddress={toAddress}
                pickupMoveScope={selectedMoveScopeBySlot.from}
                destinationMoveScope={selectedMoveScopeBySlot.to}
                propertyCategories={smallMoveCategories}
                moveScopes={smallMoveOptions}
                onSelectPlace={handleSelectPlace}
                onSelectPickupMoveScope={handleSelectPickupMoveScope}
                onChangePickupElevator={(hasElevator) => handleChangeElevator('from', hasElevator)}
                onChangePickupStairs={(count) => handleLogisticsChange('from', { stairsCount: count })}
                onChangePickupParking={(parkingType: ParkingType) =>
                  handleLogisticsChange('from', { parkingType })
                }
                onSelectDestinationMoveScope={handleSelectDestinationMoveScope}
                onChangeDestinationElevator={(hasElevator) => handleChangeElevator('to', hasElevator)}
                onChangeDestinationStairs={(count) =>
                  handleLogisticsChange('to', { stairsCount: count })
                }
                onChangeDestinationParking={(parkingType: ParkingType) =>
                  handleLogisticsChange('to', { parkingType })
                }
                moveScopeReadOnly
              />
            )}

            {step === 3 && (
              <Step2Schedule
                moveDate={moveDate}
                onChangeMoveDate={setMoveDate}
                timeWindow={timeWindow}
                onChangeTimeWindow={setTimeWindow}
                notes={notes}
                onChangeNotes={setNotes}
                showSpecialtyItems={false}
                isFlexibleDate={isFlexibleDate}
                onChangeIsFlexibleDate={setIsFlexibleDate}
                additionalServices={additionalServices}
                onToggleAdditionalService={handleToggleAdditionalService}
              />
            )}

            {step === 4 && (
              <Step3PhotoUpload
                photos={photos}
                onPickFromLibrary={handlePickFromLibrary}
                onTakePhoto={handleTakePhoto}
                onRetry={retryPhoto}
                onRemove={removePhoto}
                onMoveUp={(id) => movePhoto(id, 'up')}
                onMoveDown={(id) => movePhoto(id, 'down')}
                pickerError={pickerError}
              />
            )}

            {step === 5 && (
              <Step4ReviewSubmit
                moveType={moveType}
                fromAddress={fromAddress}
                toAddress={toAddress}
                pickupMoveScope={selectedMoveScopeBySlot.from}
                destinationMoveScope={selectedMoveScopeBySlot.to}
                moveDate={moveDate}
                timeWindow={timeWindow}
                notes={notes}
                photos={photos}
                submitError={submitError}
                needsProfile={needsProfile}
                onEditMoveType={() => setStep(1)}
                onEditAddresses={() => setStep(2)}
                onEditSchedule={() => setStep(3)}
                onEditPhotos={() => setStep(4)}
              />
            )}
          </Layout>
        </ScrollView>

        {/* Sticky bottom footer: keeps the Next/Submit action pinned to the
            bottom of every step instead of scrolling away with the content
            above, mirroring `PickupRouteScreen`'s footer pattern. */}
        <View
          style={[
            styles.footer,
            {
              borderTopColor: colors.border,
              backgroundColor: colors.background,
              paddingBottom: Math.max(insets.bottom, spacing.md),
            },
          ]}
        >
          {step < TOTAL_STEPS ? (
            <Button
              title={
                step === 1
                  ? 'Next: Pickup & Route'
                  : step === 2
                    ? 'Next: Schedule & Delivery'
                    : step === 3
                      ? 'Next: Photos'
                      : 'Next: Review'
              }
              onPress={handleNext}
              disabled={step === 4 && isUploading}
            />
          ) : needsProfile ? (
            <Button title="Create Profile" onPress={handleCreateProfile} />
          ) : (
            <Button
              title={submitting ? 'Submitting...' : 'Submit RFQ'}
              onPress={handleSubmit}
              disabled={submitting}
              loading={submitting}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </Container>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: spacing.lg,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.md,
    marginHorizontal: -16, // Cancels Container's 16px padding so the
    // footer's border/background span the full screen width.
    paddingHorizontal: 16,
  },
});
