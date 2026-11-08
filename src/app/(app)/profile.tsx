import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Container, Text, Layout } from '../../components/ui';
import { useColors } from '../../hooks/useColors';
import { useAuth } from '../../hooks';
import { spacing } from '../../../themes';
import { useAppSelector } from '../../store';
import {
  selectUser,
  selectUserExists,
  selectUserFullName,
} from '../../store/slices/userSlice';

export default function ProfileScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(false);

  const backendUser = useAppSelector(selectUser);
  const userExists = useAppSelector(selectUserExists);
  const fullName = useAppSelector(selectUserFullName);

  // Prefer the backend `users` row (the source of truth once it exists);
  // fall back to the Firebase/Google account for people who haven't
  // completed their profile yet.
  const displayName = fullName || user?.displayName || 'User';
  const displayEmail = backendUser?.email || user?.email || '';
  const needsProfile = userExists === false;

  const handleSignOut = async () => {
    setLoading(true);
    try {
      // `signOut()` from useAuth() wraps the Firebase `auth().signOut()` call
      // (see src/contexts/AuthContext.tsx) — invalidates the active JWT
      // session so subsequent API requests no longer attach a valid token.
      await signOut();
      // `.replace` (not `.push`) so the auth screen replaces this one in the
      // stack — users can't hit the hardware/gesture back button and land
      // back on an authenticated screen after signing out.
      router.replace('/(auth)/login');
    } catch (error: any) {
      console.error('[Profile] Sign-out failed:', error);
      Alert.alert('Sign Out Failed', 'Something went wrong while signing you out. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const confirmSignOut = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log Out', style: 'destructive', onPress: handleSignOut },
      ],
      { cancelable: true }
    );
  };


  return (
    <Container>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Layout spacing={spacing.lg}>
          {/* Profile Header */}
          <View style={styles.header}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text variant="title" style={styles.avatarText}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text variant="title" style={styles.name}>
              {displayName}
            </Text>
            <Text variant="body" style={[styles.email, { color: colors.text }]}>
              {displayEmail}
            </Text>
            {backendUser ? (
              <Text variant="caption" style={{ color: colors.text, opacity: 0.6 }}>
                ★ {backendUser.ratingAvg.toFixed(1)} · {backendUser.completedMoves} completed
              </Text>
            ) : null}
          </View>

          {/* Nudge users who are signed in but haven't created their `users` row */}
          {needsProfile ? (
            <TouchableOpacity
              style={[styles.banner, { borderColor: colors.primary }]}
              onPress={() => router.push('/profile/edit')}
              activeOpacity={0.8}
            >
              <Text variant="body" style={{ fontWeight: '600' }}>Complete your profile</Text>
              <Text variant="caption" style={{ color: colors.text, opacity: 0.7 }}>
                Add your name and phone number so movers can reach you about quotes.
              </Text>
            </TouchableOpacity>
          ) : null}

          {/* Account Section */}
          <View style={styles.section}>
            <Text variant="body" style={styles.sectionTitle}>Account</Text>

            <TouchableOpacity
              style={[styles.menuItem, { borderBottomColor: colors.border }]}
              onPress={() => router.push('/profile/edit')}
            >
              <Text variant="body">{needsProfile ? 'Complete Profile' : 'Edit Profile'}</Text>
              <Text variant="body">›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, { borderBottomColor: colors.border }]}
              onPress={() => router.push('/profile/settings')}
            >
              <Text variant="body">Settings</Text>
              <Text variant="body">›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, { borderBottomColor: colors.border }]}
            >
              <Text variant="body">Payment Methods</Text>
              <Text variant="body">›</Text>
            </TouchableOpacity>
          </View>

          {/* Support Section */}
          <View style={styles.section}>
            <Text variant="body" style={styles.sectionTitle}>Support</Text>

            <TouchableOpacity
              style={[styles.menuItem, { borderBottomColor: colors.border }]}
            >
              <Text variant="body">Help Center</Text>
              <Text variant="body">›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, { borderBottomColor: colors.border }]}
            >
              <Text variant="body">Contact Us</Text>
              <Text variant="body">›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, { borderBottomColor: colors.border }]}
            >
              <Text variant="body">Terms & Privacy</Text>
              <Text variant="body">›</Text>
            </TouchableOpacity>
          </View>

          {/* App Info */}
          <View style={styles.appInfo}>
            <Text variant="caption" style={{ color: colors.text, opacity: 0.5 }}>
              Version 1.0.0
            </Text>
          </View>

          {/* Sign Out Button */}
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={confirmSignOut}
            disabled={loading}
            activeOpacity={0.7}
          >
            <Text variant="body" style={styles.signOutText}>
              {loading ? 'Signing Out...' : 'Log Out'}
            </Text>
          </TouchableOpacity>
        </Layout>
      </ScrollView>
    </Container>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: spacing.lg,
  },
  header: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 40,
  },
  name: {
    marginBottom: spacing.xs,
  },
  email: {
    opacity: 0.7,
  },
  banner: {
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.xs,
  },
  section: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: spacing.md,
    opacity: 0.7,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  appInfo: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  signOutButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.xl,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#dc3545',
    borderRadius: 10,
  },
  signOutText: {
    color: '#dc3545',
    fontWeight: '600',
    textAlign: 'center',
  },
});
