import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Container, Text, Button } from '../ui';
import { useColors } from '../../hooks/useColors';
import { spacing } from '../../../themes';

interface EmptyBookingsViewProps {
  /** Fired by both the header "+ New Booking" and the empty-state card's
   * "Create Your First Booking" triggers — both start the same flow. */
  onCreateBooking: () => void;
}

/**
 * "No active request" state for the Bookings tab: a dashed-border calendar
 * placeholder card plus a couple of entry points into starting a new
 * booking. Rendered by `bookings.tsx` whenever `activeRequest` is
 * null/undefined (see `BiddingFeedView` for the opposite state, once a
 * request is out for bids).
 */
export function EmptyBookingsView({ onCreateBooking }: EmptyBookingsViewProps) {
  const colors = useColors();

  return (
    <Container>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text variant="title">My Bookings</Text>
          <Button
            title="+ New Booking"
            onPress={onCreateBooking}
            style={styles.newBookingButton}
          />
        </View>

        <View style={[styles.emptyState, { borderColor: colors.border }]}>
          <Text style={styles.emptyIcon}>📅</Text>
          <Text variant="body" style={styles.emptyTitle}>No Bookings Yet</Text>
          <Text variant="caption" style={[styles.emptyDescription, { color: colors.text }]}>
            Your scheduled moves will appear here
          </Text>
          <Button
            title="Create Your First Booking"
            onPress={onCreateBooking}
            style={styles.emptyButton}
          />
        </View>

        <View style={styles.section}>
          <Text variant="body" style={styles.sectionTitle}>Upcoming</Text>
          <Text variant="caption" style={{ color: colors.text, opacity: 0.7 }}>
            No upcoming bookings
          </Text>
        </View>

        <View style={styles.section}>
          <Text variant="body" style={styles.sectionTitle}>Past</Text>
          <Text variant="caption" style={{ color: colors.text, opacity: 0.7 }}>
            No past bookings
          </Text>
        </View>
      </View>
    </Container>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  newBookingButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  emptyState: {
    padding: spacing.xl,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: spacing.lg,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontWeight: '600',
    fontSize: 18,
  },
  emptyDescription: {
    textAlign: 'center',
    opacity: 0.7,
  },
  emptyButton: {
    marginTop: spacing.md,
  },
  section: {
    marginTop: spacing.xl,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
});


