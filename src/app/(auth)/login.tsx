import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { Container, Button, Input, Layout } from '../../components/ui';
import { Text as CustomText } from '../../components/ui/text';
import { useColors } from '../../hooks/useColors';
import { useAuth } from '../../contexts';
import { spacing } from '../../../themes';

export default function LoginScreen() {
  const router = useRouter();
  const colors = useColors();
  const { signIn, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await signIn(email, password);
      router.replace('/(app)');
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      router.replace('/(app)');
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <Container>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Layout spacing={spacing.lg}>
            {/* Header */}
            <View style={styles.header}>
              <CustomText variant="title" style={styles.title}>
                Welcome Back
              </CustomText>
              <CustomText variant="body" style={[styles.subtitle, { color: colors.text }]}>
                Sign in to continue
              </CustomText>
            </View>

            {/* Error Message */}
            {error ? (
              <View style={[styles.errorContainer, { backgroundColor: `${colors.border}` }]}>
                <CustomText variant="caption" style={{ color: '#FF3B30' }}>
                  {error}
                </CustomText>
              </View>
            ) : null}

            {/* Form */}
            <View style={styles.form}>
              <Input
                label="Email"
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />

              <Input
                label="Password"
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="password"
              />

              <Link href="/(auth)/forgot-password" asChild>
                <Text style={[styles.forgotPassword, { color: colors.primary }]}>
                  Forgot Password?
                </Text>
              </Link>

              <Button
                title={loading ? 'Signing In...' : 'Sign In'}
                onPress={handleLogin}
                disabled={loading || googleLoading}
                style={styles.loginButton}
              />

              <View style={styles.dividerContainer}>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                <Text style={[styles.dividerText, { color: colors.text }]}>OR</Text>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              </View>

              <Button
                title={googleLoading ? 'Signing In...' : 'Continue with Google'}
                onPress={handleGoogleSignIn}
                variant="outline"
                disabled={loading || googleLoading}
                loading={googleLoading}
                style={styles.googleButton}
              />
            </View>

            {/* Register Link */}
            <View style={styles.footer}>
              <Text style={{ color: colors.text }}>
                Don't have an account?{' '}
              </Text>
              <Link href="/(auth)/register" asChild>
                <Text style={[styles.registerLink, { color: colors.primary }]}>
                  Sign Up
                </Text>
              </Link>
            </View>
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
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    marginBottom: spacing.sm,
  },
  subtitle: {
    opacity: 0.7,
  },
  errorContainer: {
    padding: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  form: {
    width: '100%',
  },
  forgotPassword: {
    textAlign: 'right',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    fontSize: 14,
  },
  loginButton: {
    marginTop: spacing.md,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: spacing.sm,
    fontSize: 12,
    opacity: 0.6,
  },
  googleButton: {
    marginTop: spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  registerLink: {
    fontWeight: '600',
  },
});
