import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, PillGroup } from '../ui';
import type { MoveScopeOption } from '../ui';
import { useTheme } from '../../hooks';
import { SPACING } from '../../constants';

interface Step1MoveTypeProps {
  /** The "Small Move" category's move scopes (e.g. "Single Room / Dorm", "Furniture / Specific Items"). */
  options: MoveScopeOption[];
  value: MoveScopeOption | null;
  onSelectMoveType: (option: MoveScopeOption) => void;
}

/**
 * Step 1 of `SmallMovingWizardScreen`: lets the customer pick what kind of
 * small move this is, using the backend's "Small Move" category move
 * scopes (`displayName`s like "Single Room / Dorm" / "Furniture / Specific
 * Items") rather than a hardcoded list. The selection both gets carried
 * through to Step 4's review and pre-fills/filters the pickup & destination
 * move-scope pickers in Steps 2-3 down to just this category, since a Small
 * Moving request never needs the full Apartment/House/Townhouse catalog.
 */
export function Step1MoveType({ options, value, onSelectMoveType }: Step1MoveTypeProps) {
  const { colors } = useTheme();

  const handleChange = (id: number) => {
    const selected = options.find((option) => option.id === id);
    if (selected) onSelectMoveType(selected);
  };

  return (
    <View>
      <Text variant="body" style={[styles.helperText, { color: colors.text }]}>
        What are you moving? This helps us tailor the rest of your request.
      </Text>
      <PillGroup
        options={options.map((option) => ({ label: option.displayName, value: option.id }))}
        value={value?.id ?? null}
        onChange={handleChange}
        optionsDirection="column"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  helperText: {
    marginBottom: SPACING.md,
    opacity: 0.8,
  },
});
