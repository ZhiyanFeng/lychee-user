import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Container, Button, Input, Layout, Text } from '../../components/ui';
import { useColors } from '../../hooks/useColors';
import { useAuth } from '../../hooks';
import { spacing } from '../../../themes';
import { formatE164Input, isValidE164Phone, toE164 } from '../../utils/helpers';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  createUser,
  updateUser,
  fetchUser,
  selectUser,
  selectUserExists,
  selectUserLoading,
  selectUserError,
} from '../../store/slices/userSlice';

/**
 * Profile -> Edit.
 *
 * Two modes, chosen from `selectUserExists`:
 *   - exists === false  -> "Complete your profile": the person is signed in via
 *     Firebase but has no `users` row yet. Pre-fill first/last name + email
 *     from the Google/Firebase account and POST to create the row.
 *   - exists === true   -> "Edit profile": pre-fill from the backend row and
 *     PUT to update it.
 *
 * Email is shown read-only in both modes — it's the Firebase identity and
 * the backend derives/validates it from the ID token, so letting the user
 * edit it here would just desync the two.
 */
export default function EditProfileScreen() {
  const router = useRouter();
  const colors = useColors();
  const dispatch = useAppDispatch();
  const { user: firebaseUser } = useAuth();

  const backendUser = useAppSelector(selectUser);
  const exists = useAppSelector(selectUserExists);
  const loading = useAppSelector(selectUserLoading);
  const apiError = useAppSelector(selectUserError);

  const isCreateMode = exists === false;

  // Best-effort split of the Google display name ("Jane Q Doe" -> "Jane" /
  // "Q Doe") used only as a pre-fill for create mode; the user can correct it.
  const googleName = useMemo(() => {
    const parts = (firebaseUser?.displayName ?? '').trim().split(/\s+/).filter(Boolean);
    return {
      first: parts[0] ?? '',
      last: parts.slice(1).join(' '),
    };
  }, [firebaseUser?.displayName]);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [formError, setFormError] = useState('');
  const [saved, setSaved] = useState(false);

  // Defensive: if we landed here before UserSync resolved (or `exists` is
  // still null), make sure the lookup has been kicked off. The thunk's
  // `condition` makes this a no-op when data is already loaded/in flight.
  useEffect(() => {
    if (firebaseUser) dispatch(fetchUser());
  }, [dispatch, firebaseUser]);

  // Seed the form once we know which mode we're in. Re-seeds if the backend
  // row arrives after mount (e.g. slow network), but never clobbers edits
  // mid-typing because it only depends on the source data, not local state.
  useEffect(() => {
    if (exists === true && backendUser) {
      setFirstName(backendUser.firstName);
      setLastName(backendUser.lastName);
      setPhoneNumber(formatE164Input(backendUser.phoneNumber));
    } else if (exists === false) {
      setFirstName(googleName.first);
      setLastName(googleName.last);
      setPhoneNumber('');
    }
  }, [exists, backendUser, googleName.first, googleName.last]);

  const email = backendUser?.email || firebaseUser?.email || '';

  const validate = (): string | null => {
    if (!firstName.trim()) return 'First name is required';
    if (!lastName.trim()) return 'Last name is required';
    if (!isValidE164Phone(phoneNumber)) {
      return 'Please enter a valid phone number, including country code (e.g. +14155552671)';
    }
    if (!email) return 'No email found on your account';
    return null;
  };

  const handleSave = async () => {
    const validationError = validate();
    if (validationError) {
      setFormError(validationError);
      return;
    }
    setFormError('');
    setSaved(false);

    const payload = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phoneNumber: toE164(phoneNumber) ?? phoneNumber.trim(),
      email,
    };

    try {
      if (isCreateMode) {
        await dispatch(createUser(payload)).unwrap();
      } else {
        await dispatch(updateUser(payload)).unwrap();
      }
      setSaved(true);
      // Give the user a beat to see the confirmation, then return.
      setTimeout(() => router.back(), 600);
    } catch {
      // Error text is surfaced via `selectUserError` below.
    }
  };

  // While we don't yet know whether the row exists, avoid flashing the wrong
  // mode's copy / pre-fill.
  if (exists === null && loading) {
    return (
      <Container>
        <Layout spacing={spacing.lg} style={styles.centered}>
          <Text variant="body">Loading your profile...</Text>
        </Layout>
      </Container>
    );
  }

  return (
    <Container>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Layout spacing={spacing.lg}>
            <View>
              <Text variant="title">
                {isCreateMode ? 'Complete Your Profile' : 'Edit Profile'}
              </Text>
              <Text variant="caption" style={{ color: colors.text, opacity: 0.7 }}>
                {isCreateMode
                  ? 'We need a few details so movers can reach you about your quotes.'
                  : 'Update your contact details.'}
              </Text>
            </View>

            {formError || apiError ? (
              <Text variant="caption" style={{ color: '#FF3B30' }}>
                {formError || apiError}
              </Text>
            ) : null}

            {saved ? (
              <Text variant="caption" style={{ color: '#34C759' }}>
                {isCreateMode ? 'Profile created!' : 'Profile updated!'}
              </Text>
            ) : null}

            <View>
              <Input
                label="First Name"
                placeholder="Jane"
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
                autoComplete="given-name"
                textContentType="givenName"
              />
              <Input
                label="Last Name"
                placeholder="Doe"
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
                autoComplete="family-name"
                textContentType="familyName"
              />
              <Input
                label="Email"
                value={email}
                editable={false}
                selectTextOnFocus={false}
                style={styles.readOnlyInput}
              />
              <Input
                label="Phone Number"
                placeholder="+14155552671"
                value={phoneNumber}
                onChangeText={(text) => setPhoneNumber(formatE164Input(text))}
                keyboardType="phone-pad"
                autoComplete="tel"
                textContentType="telephoneNumber"
              />
              <Text variant="caption" style={{ color: colors.text, opacity: 0.6 }}>
                Include your country code, e.g. +1 for the US/Canada (E.164 format).
              </Text>
            </View>

            <Button
              title={loading ? 'Saving...' : isCreateMode ? 'Create Profile' : 'Save Changes'}
              onPress={handleSave}
              disabled={loading}
            />
            <Button title="Cancel" variant="outline" onPress={() => router.back()} disabled={loading} />
          </Layout>
        </ScrollView>
      </KeyboardAvoidingView>
    </Container>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: spacing.lg,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  readOnlyInput: {
    opacity: 0.6,
  },
});

