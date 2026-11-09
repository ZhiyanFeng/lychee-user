import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from '../ui';
import { useTheme } from '../../hooks';
import { SPACING, FONT_SIZES } from '../../constants';

interface EmptyBookingsStateProps {
  onBookNow: () => void;
}

/**
 * "NONE" state of `RecentActivityCard` — rendered when the signed-in user
 * has no open/confirmed RFQs at all. A gray dashed-border placeholder plus
 * a single high-visibility CTA into the booking flow.
 */
export function EmptyBookingsState({ onBookNow }: EmptyBookingsStateProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { borderColor: colors.border }]}>
      <Text variant="body" style={[styles.message, { color: colors.text }]}>
        No recent activity
      </Text>
      <Button
        title="Book Your First Move"
        onPress={onBookNow}
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: SPACING.xl,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    gap: SPACING.md,
  },
  message: {
    fontSize: FONT_SIZES.md,
    opacity: 0.7,
  },
  button: {
    marginTop: SPACING.sm,
    minWidth: 220,
    backgroundColor: '#1D4ED8', // royal blue
  },
});
