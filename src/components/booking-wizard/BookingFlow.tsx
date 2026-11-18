import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, LayoutAnimation, UIManager } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Container, Layout, Button, Text, formatMoveScopeLabel } from '../ui';
import type { GooglePlaceSelection, MoveScopeOption } from '../ui';
import { useColors } from '../../hooks/useColors';
import { BookingHeader } from './BookingHeader';
import { Step1Locations } from './Step1Locations';
import { Step2Schedule } from './Step2Schedule';
import { Step3Review } from './Step3Review';
import { spacing } from '../../../themes';
import { isFutureDate } from '../../utils/date';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  fetchMoveScopes,
  selectMoveScopes,
  selectMoveScopeCategories,
  selectMoveScopeById,
} from '../../store/slices/moveScopesSlice';
import { fetchUser, selectUserExists } from '../../store/slices/userSlice';
import {
  AddressDetails,
  ParkingType,
  SpecialtyItem,
  setAddress,
  setMoveScopeId,
  setDestinationMoveScopeId,
  setWizardStep,
  setMoveDate,
  setTimeWindow,
  setDescription,
  setSpecialtyItems,
  setIsFlexibleDate,
  toggleAdditionalService,
  resetMovingRequest,
  submitMovingRequest,
  selectFromAddress,
  selectToAddress,
  selectMoveScopeId,
  selectDestinationMoveScopeId,
  selectWizardStep,
  selectMoveDate,
  selectTimeWindow,
  selectDescription,
  selectSpecialtyItems,
  selectIsFlexibleDate,
  selectAdditionalServices,
  selectSubmitting,
  selectSubmitError,
} from '../../store/slices/movingRequestSlice';
import type { AdditionalServiceType } from '../../types';

// rfqs.move_date is a DATE column — validate the plain 'YYYY-MM-DD' shape
// client-side before ever sending it (the DatePickerModal only ever
// produces well-formed values, but this also guards the state seeded from
// Redux on re-entry).
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TOTAL_STEPS = 3;
type Slot = 'from' | 'to';

// The backend's "Small Move" category is only ever picked via the
// dedicated Small Moving wizard (its own Step 1 "What Are You Moving?"),
// so it's excluded here — Residential customers should only ever see
// House/Apartment/Townhouse/Storage property types in this picker.
const SMALL_MOVE_CATEGORY = 'Small Move';

const STEP_TITLES: Record<number, string> = {
  1: 'Pickup & Route',
  2: 'Schedule & Details',
  3: 'Review & Submit',
};

// LayoutAnimation on Android requires this experimental flag (a no-op, and
// safe to call repeatedly, on iOS/Fabric where it's already enabled or
// doesn't apply). Guarded by a feature check since the API is being phased
// out on the New Architecture and may not exist on every RN version.
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/** Schedules the next layout-affecting state update to animate in/out smoothly. */
function animateNextLayout() {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
}

/**
 * Parent form-state manager for the 3-step hourly-billing/bidding booking
 * wizard:
 *   1. Locations & Pickup Scope — pickup address, pickup move scope
 *      (bottom-sheet picker), progressive pickup access details, and the
 *      destination address.
 *   2. Delivery Scope & Schedule — destination move scope, progressive
 *      destination access details (identical Dynamic Conditional Swap rules
 *      as step 1, via the shared `<AccessDetailsFields />`), the move date
 *      (calendar sheet), delivery time window, and heavy/special item notes.
 *   3. Review & Request Quotes — read-only summary, an hourly-bidding
 *      pricing explainer, and the final submit action.
 *
 * All step components are purely presentational — every field lives in
 * this component's state so nothing is lost moving back and forth between
 * steps, and is only pushed into Redux right before submit. Move-scope
 * selection and Elevator toggles call `animateNextLayout()` right before the
 * state update that reveals/hides the dependent Stairs/Access-Details
 * fields, so those transitions animate in smoothly instead of popping.
 */
export function BookingFlow() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const savedFromAddress = useAppSelector(selectFromAddress);
  const savedToAddress = useAppSelector(selectToAddress);
  const savedMoveScopeId = useAppSelector(selectMoveScopeId);
  const savedDestinationMoveScopeId = useAppSelector(selectDestinationMoveScopeId);
  const savedWizardStep = useAppSelector(selectWizardStep);
  const savedMoveDate = useAppSelector(selectMoveDate);
  const savedTimeWindow = useAppSelector(selectTimeWindow);
  const savedDescription = useAppSelector(selectDescription);
  const savedSpecialtyItems = useAppSelector(selectSpecialtyItems);
  const savedIsFlexibleDate = useAppSelector(selectIsFlexibleDate);
  const additionalServices = useAppSelector(selectAdditionalServices);
  const moveScopeCategoriesRaw = useAppSelector(selectMoveScopeCategories);
  const allMoveScopesRaw = useAppSelector(selectMoveScopes);
  // Exclude the Small Moving wizard's own "Small Move" category from this
  // (Residential) wizard's property-type picker — see `SMALL_MOVE_CATEGORY`.
  const allMoveScopes = useMemo(
    () => allMoveScopesRaw.filter((option) => option.category !== SMALL_MOVE_CATEGORY),
    [allMoveScopesRaw]
  );
  const moveScopeCategories = useMemo(
    () => moveScopeCategoriesRaw.filter((category) => category !== SMALL_MOVE_CATEGORY),
    [moveScopeCategoriesRaw]
  );
  const savedMoveScope = useAppSelector(selectMoveScopeById(savedMoveScopeId ?? -1));
  const savedDestinationMoveScope = useAppSelector(
    selectMoveScopeById(savedDestinationMoveScopeId ?? -1)
  );
  const submitting = useAppSelector(selectSubmitting);
  const submitError = useAppSelector(selectSubmitError);
  const userExists = useAppSelector(selectUserExists);

  const [step, setStep] = useState(savedWizardStep || 1);
  const [fromAddress, setFromAddress] = useState<AddressDetails | null>(savedFromAddress);
  const [toAddress, setToAddress] = useState<AddressDetails | null>(savedToAddress);
  // Property type is picked via a bottom-sheet trigger, captured per
  // address since the pickup and destination properties can be different
  // kinds of buildings. Seed both slots from whatever move scope was
  // already saved (e.g. navigating back into the wizard after completing a
  // profile) — previously only "from" was restored, which silently dropped
  // Step 2's destination move scope / Access Details on remount.
  const [selectedMoveScopeBySlot, setSelectedMoveScopeBySlot] = useState<
    Record<Slot, MoveScopeOption | null>
  >({
    from: savedMoveScope,
    to: savedDestinationMoveScope,
  });
  const [moveDate, setMoveDateLocal] = useState(savedMoveDate);
  const [timeWindow, setTimeWindowLocal] = useState(savedTimeWindow);
  const [notes, setNotesLocal] = useState(savedDescription);
  const [specialtyItems, setSpecialtyItemsLocal] = useState<SpecialtyItem[]>(savedSpecialtyItems);
  // The "add a new item" draft row (name + quantity, before it's committed
  // into `specialtyItems` above) — lifted up here, like every other wizard
  // field, since `Step2Schedule` (and `SpecialtyItemsFields` inside it) only
  // renders while `step === 2` and would otherwise wipe an in-progress draft
  // the moment the user taps "Next"/"Back" before pressing "Add Item".
  const [specialtyItemDraftName, setSpecialtyItemDraftName] = useState('');
  const [specialtyItemDraftQuantity, setSpecialtyItemDraftQuantity] = useState(1);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    dispatch(fetchMoveScopes());
  }, [dispatch]);

  const handleSelectPlace = (slot: Slot, place: GooglePlaceSelection) => {
    const setter = slot === 'from' ? setFromAddress : setToAddress;
    const previous = slot === 'from' ? fromAddress : toAddress;
    setter({
      ...place,
      // Preserve any logistics fields the user already filled in if they
      // change the address search (e.g. picked the wrong suggestion first).
      moveScope: previous?.moveScope,
      stairsCount: previous?.stairsCount,
      parkingType: previous?.parkingType,
      hasElevator: previous?.hasElevator ?? null,
      parkingRestrictions: previous?.parkingRestrictions,
    });
  };

  const handleLogisticsChange = (slot: Slot, changes: Partial<AddressDetails>) => {
    const setter = slot === 'from' ? setFromAddress : setToAddress;
    setter((prev) => (prev ? { ...prev, ...changes } : prev));
  };

  // Shared by both slots: the same Smart Defaults apply whether it's the
  // pickup or destination move scope being chosen.
  const buildAutoDefaultChanges = (option: MoveScopeOption): Partial<AddressDetails> => {
    const changes: Partial<AddressDetails> = { moveScope: formatMoveScopeLabel(option) };
    // Basement suites and townhouses almost always mean at least one flight
    // of stairs, so default it in rather than making the user re-declare
    // something implied by the move scope itself.
    if (option.isBasement || option.category === 'Townhouse') {
      changes.stairsCount = 1;
    }
    // Apartment buildings are assumed to have an elevator by default (the
    // common case) — the user can still flip it to "No (Walk-up)" via the
    // Elevator pills, which then reveals the Stairs selector.
    if (option.category === 'Apartment') {
      changes.hasElevator = true;
    }
    return changes;
  };

  const handleSelectPickupMoveScope = (option: MoveScopeOption) => {
    animateNextLayout(); // Access Details section is about to appear/change shape.
    setSelectedMoveScopeBySlot((prev) => ({ ...prev, from: option }));
    handleLogisticsChange('from', buildAutoDefaultChanges(option));
  };

  const handleSelectDestinationMoveScope = (option: MoveScopeOption) => {
    animateNextLayout();
    setSelectedMoveScopeBySlot((prev) => ({ ...prev, to: option }));
    handleLogisticsChange('to', buildAutoDefaultChanges(option));
  };

  // Elevator "Yes" hides/clears the Stairs selector entirely (stairsCount is
  // forced to 0); "No (Walk-up)" reveals it, defaulting to 1 flight unless
  // the user had already picked a walk-up flight count before toggling back
  // and forth. Identical rule for both pickup and destination.
  const handleChangeElevator = (slot: Slot, hasElevator: boolean) => {
    animateNextLayout(); // Stairs selector is about to appear/disappear.
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

  const handleBack = () => {
    animateNextLayout();
    if (step > 1) {
      setFormError('');
      setStep((current) => current - 1);
    } else {
      router.replace('/(app)/explore');
    }
  };

  const handleAddSpecialtyItem = (item: SpecialtyItem) => {
    setSpecialtyItemsLocal((prev) => [...prev, item]);
  };

  const handleRemoveSpecialtyItem = (index: number) => {
    setSpecialtyItemsLocal((prev) => prev.filter((_, i) => i !== index));
  };

  // Pushes every field currently held in local wizard state into
  // `movingRequestSlice` so it survives even if this screen gets unmounted
  // (e.g. the root layout's <Slot /> doesn't keep previously-pushed routes
  // mounted the way a native <Stack /> would). On remount, `BookingFlow`
  // re-seeds its local state from these same Redux selectors
  // (`savedFromAddress`, `savedToAddress`, etc.), so nothing is lost.
  // `stepOverride` lets a caller pin which step the wizard should resume on
  // next time it mounts, regardless of which step is actually active right
  // now (see `handleCreateProfile`).
  const persistDraftToStore = (stepOverride?: number) => {
    if (fromAddress) dispatch(setAddress({ slot: 'from', address: fromAddress }));
    if (toAddress) dispatch(setAddress({ slot: 'to', address: toAddress }));
    dispatch(setMoveScopeId(selectedMoveScopeBySlot.from?.id ?? null));
    dispatch(setDestinationMoveScopeId(selectedMoveScopeBySlot.to?.id ?? null));
    dispatch(setMoveDate(moveDate));
    dispatch(setTimeWindow(timeWindow));
    dispatch(setDescription(notes));
    dispatch(setSpecialtyItems(specialtyItems));
    dispatch(setWizardStep(stepOverride ?? step));
  };

  // Navigates to the profile-creation screen rather than submitting. Saves
  // the in-progress draft to Redux first (see `persistDraftToStore`) so the
  // wizard's data is never lost while the user is away completing their
  // profile. Explicitly pins the resume point to Step 3 (Review & Submit)
  // — this is only ever reachable from the Step 3 "Create Profile"
  // prompt/banner, and pinning it directly (rather than trusting whatever
  // `step` happens to be) means navigating back always lands the user on
  // the review screen, ready to tap "Submit Move Request", instead of
  // restarting the wizard from Step 1.
  const handleCreateProfile = () => {
    persistDraftToStore(3);
    router.push('/profile/edit');
  };

  const handleNext = () => {
    if (step === 1) {
      if (!fromAddress || !toAddress) {
        setFormError('Please select both the pickup and destination addresses from the suggestions');
        return;
      }
      setFormError('');
      animateNextLayout();
      setStep(2);
      return;
    }
    if (step === 2) {
      if (!DATE_PATTERN.test(moveDate)) {
        setFormError('Please select your move date');
        return;
      }
      // Backend's `moveDate` column is `@Future` (LocalDate) — today's date
      // is rejected, not just past dates, so this must match exactly or
      // the submit request will crash the backend with a validation error.
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
      setStep(3);
    }
  };

  const handleSubmit = async () => {
    if (!fromAddress || !toAddress) return;
    // Defense-in-depth: re-validate even on the final submit tap, in case
    // the app was left open past midnight since the user picked the date
    // back on step 2 — the backend's `@Future` moveDate would otherwise
    // reject ("crash") the request with a validation error.
    if (!isFutureDate(moveDate)) {
      setFormError("Please select a move date in the future — today's date can't be used.");
      setStep(2);
      return;
    }

    // Force profile completion before submitting an RFQ — movers need a
    // name/phone number to reach the requester, and without a `users` row
    // the backend has nothing to attach the request to.
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
      handleCreateProfile(); // persists the draft to Redux before navigating away
      return;
    }

    persistDraftToStore();
    try {
      const result = await dispatch(submitMovingRequest()).unwrap();
      dispatch(resetMovingRequest());
      router.replace(`/moving-request/bids?rfqId=${result.rfqId}`);
    } catch {
      // Error text is surfaced via `selectSubmitError` below.
    }
  };

  const needsProfile = userExists === false;

  return (
    <Container style={step === 2 ? styles.scheduleBackground : undefined}>
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
              <Step1Locations
                fromAddress={fromAddress}
                toAddress={toAddress}
                pickupMoveScope={selectedMoveScopeBySlot.from}
                destinationMoveScope={selectedMoveScopeBySlot.to}
                propertyCategories={moveScopeCategories}
                moveScopes={allMoveScopes}
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
                pickupLabel="Pickup Property Type"
                pickupPlaceholder="Select property type"
                destinationLabel="Destination Property Type"
                destinationPlaceholder="Select destination property type"
              />
            )}

            {step === 2 && (
              <Step2Schedule
                moveDate={moveDate}
                onChangeMoveDate={setMoveDateLocal}
                timeWindow={timeWindow}
                onChangeTimeWindow={setTimeWindowLocal}
                notes={notes}
                onChangeNotes={setNotesLocal}
                specialtyItems={specialtyItems}
                onAddSpecialtyItem={handleAddSpecialtyItem}
                onRemoveSpecialtyItem={handleRemoveSpecialtyItem}
                specialtyItemDraftName={specialtyItemDraftName}
                onChangeSpecialtyItemDraftName={setSpecialtyItemDraftName}
                specialtyItemDraftQuantity={specialtyItemDraftQuantity}
                onChangeSpecialtyItemDraftQuantity={setSpecialtyItemDraftQuantity}
                isFlexibleDate={savedIsFlexibleDate}
                onChangeIsFlexibleDate={(value: boolean) => dispatch(setIsFlexibleDate(value))}
                additionalServices={additionalServices}
                onToggleAdditionalService={(service: AdditionalServiceType) =>
                  dispatch(toggleAdditionalService(service))
                }
              />
            )}

            {step === 3 && (
              <Step3Review
                fromAddress={fromAddress}
                toAddress={toAddress}
                pickupMoveScope={selectedMoveScopeBySlot.from}
                destinationMoveScope={selectedMoveScopeBySlot.to}
                moveDate={moveDate}
                timeWindow={timeWindow}
                notes={notes}
                specialtyItems={specialtyItems}
                submitError={submitError}
                needsProfile={needsProfile}
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
              title={step === 1 ? 'Next: Schedule & Delivery' : 'Next: Review & Request Quotes'}
              onPress={handleNext}
              disabled={step === 2 && (!moveDate || !timeWindow)}
            />
          ) : needsProfile ? (
            <Button title="Create Profile" onPress={handleCreateProfile} />
          ) : (
            <Button
              title={submitting ? 'Submitting...' : 'Submit Move Request'}
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
  // Step 2 ("Schedule & Details") uses a light gray canvas so its white
  // bordered cards stand out, matching the redesigned card-based layout —
  // other steps keep Container's default themed background.
  scheduleBackground: {
    backgroundColor: '#F9FAFB',
  },
});

