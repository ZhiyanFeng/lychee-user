import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Container, Text, Layout } from '../../components/ui';
import { useColors } from '../../hooks/useColors';
import { spacing } from '../../../themes';
import { RecentActivityCard } from '../../components/bookings';

export default function HomeScreen() {
  const router = useRouter();
  const colors = useColors();

  // Sends the user to pick a service on Explore first, rather than
  // straight into the wizard — Explore's own service-tile handler resets
  // the draft and starts the wizard at Step 1 (see `explore.tsx`).
  const handleNewBooking = () => {
    router.push('/(app)/explore');
  };

  return (
    <Container>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Layout spacing={spacing.lg}>
          {/* Welcome Section */}
          <View style={styles.welcomeSection}>
            <Text variant="title" style={styles.welcomeTitle}>
              Welcome to LycheeTech
            </Text>
            <Text variant="body" style={[styles.welcomeSubtitle, { color: colors.text }]}>
              Your moving partner
            </Text>
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text variant="title" style={styles.sectionTitle}>
              Quick Actions
            </Text>

            <View style={styles.actionGrid}>
              <TouchableOpacity
                style={[styles.actionCard, { backgroundColor: colors.primary + '20' }]}
                onPress={handleNewBooking}
                activeOpacity={0.7}
              >
                <Text style={styles.actionIcon}>📦</Text>
                <Text variant="body" style={styles.actionTitle}>New Booking</Text>
                <Text variant="caption" style={styles.actionDescription}>
                  Schedule a move
                </Text>
              </TouchableOpacity>

              <View style={[styles.actionCard, { backgroundColor: colors.primary + '20' }]}>
                <Text style={styles.actionIcon}>🚚</Text>
                <Text variant="body" style={styles.actionTitle}>Track Move</Text>
                <Text variant="caption" style={styles.actionDescription}>
                  Track in real-time
                </Text>
              </View>

              <View style={[styles.actionCard, { backgroundColor: colors.primary + '20' }]}>
                <Text style={styles.actionIcon}>💬</Text>
                <Text variant="body" style={styles.actionTitle}>Support</Text>
                <Text variant="caption" style={styles.actionDescription}>
                  Get help now
                </Text>
              </View>

              <View style={[styles.actionCard, { backgroundColor: colors.primary + '20' }]}>
                <Text style={styles.actionIcon}>📋</Text>
                <Text variant="body" style={styles.actionTitle}>History</Text>
                <Text variant="caption" style={styles.actionDescription}>
                  View past moves
                </Text>
              </View>
            </View>
          </View>

          {/* Recent Activity */}
          <View style={styles.section}>
            <Text variant="title" style={styles.sectionTitle}>
              Recent Activity
            </Text>
            <RecentActivityCard />
          </View>
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
  welcomeSection: {
    alignItems: 'center',
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  welcomeTitle: {
    marginBottom: spacing.sm,
  },
  welcomeSubtitle: {
    opacity: 0.7,
  },
  section: {
    // No marginTop here — `Layout`'s `gap` prop already spaces every
    // top-level section consistently; adding a margin here too previously
    // doubled up the gap specifically before "Quick Actions" (on top of
    // `welcomeSection`'s own bottom padding), making that gap noticeably
    // larger/less even than the rest of the screen.
  },
  sectionTitle: {
    marginBottom: spacing.md,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  actionCard: {
    flex: 1,
    minWidth: '45%',
    padding: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: spacing.xs,
  },
  actionTitle: {
    fontWeight: '600',
  },
  actionDescription: {
    opacity: 0.7,
    textAlign: 'center',
  },
});
