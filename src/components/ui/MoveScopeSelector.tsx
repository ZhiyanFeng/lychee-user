import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
} from 'react-native';
import { useTheme } from '../../hooks';
import { SPACING, FONT_SIZES } from '../../constants';

/**
 * Minimal shape this component needs from a move scope — matches (but
 * doesn't require the full) `MoveScope` from `moveScopesSlice`, so
 * callers can pass those objects straight through.
 */
export interface MoveScopeOption {
  id: number;
  slug?: string;
  displayName: string;
  category: string;
  /**
   * Sub-heading within a category used to group related options (e.g.
   * "Full House" vs "Basement Suite" under the "House" category). Options
   * without one are grouped under their own `category` name instead.
   */
  sectionName?: string;
  roomCount?: number;
  isBasement?: boolean;
}

interface MoveScopeSelectorProps {
  /** Label rendered above the trigger, mirroring Input's own label. */
  label?: string;
  /** Distinct, ordered category names — drive the tabs at the top of the sheet. */
  categories: string[];
  /** Full flat list of selectable types across all categories; filtered by the active tab. */
  options: MoveScopeOption[];
  value: MoveScopeOption | null;
  /** Invoked with the tapped option once the user picks a pill; the sheet closes right after. */
  onSelectMoveScope: (option: MoveScopeOption) => void;
  placeholder?: string;
  /**
   * Renders the trigger as a plain, non-pressable summary (muted
   * background, no chevron, no modal) instead of an interactive dropdown —
   * for contexts where the move scope was already locked in by an earlier
   * step (e.g. Small Moving's "What Are You Moving?") and shouldn't be
   * re-editable later in the flow.
   */
  readOnly?: boolean;
}

/**
 * Formats a move scope as "<Category> — <Type>[ Basement]", e.g.
 * "House — 2 Bed" or "House — 2 Bed Basement" for a `2-bed-basement` option.
 * Shared by this component's own trigger summary text and anywhere else
 * (e.g. the booking wizard's review step) that needs the same label.
 */
export function formatMoveScopeLabel(option: MoveScopeOption | null | undefined): string {
  if (!option) return '';
  return `${option.category} — ${option.displayName}${option.isBasement ? ' Basement' : ''}`;
}


/**
 * Single summary trigger ("Apartment — 2 Bedroom" / placeholder) that opens a
 * bottom-sheet-style modal for picking a move scope:
 *
 *   ┌──────────────────────────────────────────┐
 *   │ Select Property Details               ✕ │
 *   ├──────────────────────────────────────────┤
 *   │ [House] [Townhouse] [Apartment] [Storage]│ ← scrollable category tabs
 *   ├──────────────────────────────────────────┤
 *   │ Full House                                │
 *   │  [2 Bed] [3 Bed] [4 Bed] [5+ Bed]          │ ← grouped by sectionName
 *   │                                            │
 *   │ Basement Suite                             │
 *   │  [1 Bed] [2 Bed] [3 Bed]                   │
 *   └──────────────────────────────────────────┘
 *
 * Tapping a category tab filters `options` down to that category; those are
 * then grouped by `sectionName` (falling back to the category itself when a
 * type has no section) so e.g. a house's "Full House" vs "Basement Suite"
 * options render under their own headings rather than one flat pill grid.
 * Selecting a pill invokes `onSelectMoveScope` and closes the sheet.
 *
 * Built on the built-in `Modal` (transparent + slide-up) rather than a
 * dedicated bottom-sheet library, since none is installed in this project
 * and this UI doesn't need drag-to-dismiss/snap-point behavior.
 */
export const MoveScopeSelector: React.FC<MoveScopeSelectorProps> = ({
  label,
  categories,
  options,
  value,
  onSelectMoveScope,
  placeholder = 'Select a move scope',
  readOnly = false,
}) => {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(
    value?.category ?? categories[0] ?? null
  );

  // Options in the active category, grouped by sectionName (in first-seen
  // order) so e.g. "Full House" renders before "Basement Suite" without
  // needing the caller to pre-sort/group the flat catalog array.
  const sections = useMemo(() => {
    const inCategory = options.filter((option) => option.category === activeCategory);
    const order: string[] = [];
    const bySection = new Map<string, MoveScopeOption[]>();
    inCategory.forEach((option) => {
      const key = option.sectionName || option.category;
      if (!bySection.has(key)) {
        bySection.set(key, []);
        order.push(key);
      }
      bySection.get(key)!.push(option);
    });
    return order.map((sectionName) => ({ sectionName, options: bySection.get(sectionName)! }));
  }, [options, activeCategory]);

  const summaryText = value ? formatMoveScopeLabel(value) : placeholder;

  const handleOpen = () => {
    setActiveCategory(value?.category ?? categories[0] ?? null);
    setVisible(true);
  };
  const handleClose = () => setVisible(false);
  const handleSelect = (option: MoveScopeOption) => {
    onSelectMoveScope(option);
    setVisible(false);
  };

  return (
    <View style={styles.container}>
      {label && <Text style={[styles.label, { color: colors.text }]}>{label}</Text>}
      <Pressable
        onPress={readOnly ? undefined : handleOpen}
        disabled={readOnly}
        style={[
          styles.trigger,
          { borderColor: colors.border, backgroundColor: colors.background },
          readOnly && { backgroundColor: colors.border + '26' },
        ]}
      >
        <Text
          style={[styles.triggerText, { color: value ? colors.text : colors.border }]}
          numberOfLines={1}
        >
          {summaryText}
        </Text>
        {!readOnly && <Text style={{ color: colors.text }}>▼</Text>}
      </Pressable>

      <Modal visible={visible && !readOnly} transparent animationType="slide" onRequestClose={handleClose}>
        <View style={styles.modalContainer}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
          <View style={[styles.sheet, { backgroundColor: colors.background }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>Select Property Details</Text>
              <Pressable onPress={handleClose} hitSlop={12}>
                <Text style={{ color: colors.text, fontSize: FONT_SIZES.lg }}>✕</Text>
              </Pressable>
            </View>

            {/* Top category tabs — horizontally scrollable so they don't
                clip/wrap awkwardly on narrow screens. */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabsRow}
            >
              {categories.map((category) => {
                const active = category === activeCategory;
                return (
                  <Pressable
                    key={category}
                    onPress={() => setActiveCategory(category)}
                    style={[
                      styles.tab,
                      { borderColor: colors.border },
                      active && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                  >
                    <Text style={[styles.tabText, { color: active ? '#FFFFFF' : colors.text }]}>
                      {category}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Sections within the active category, each with its own
                heading + row of tappable pill cards. */}
            <ScrollView contentContainerStyle={styles.sectionsContainer}>
              {sections.length === 0 ? (
                <Text style={{ color: colors.text, opacity: 0.6 }}>
                  No move scopes in this category yet.
                </Text>
              ) : (
                sections.map((section) => (
                  <View key={section.sectionName} style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                      {section.sectionName}
                    </Text>
                    <View style={styles.pillWrap}>
                      {section.options.map((option) => {
                        const selected = value?.id === option.id;
                        return (
                          <Pressable
                            key={option.id}
                            onPress={() => handleSelect(option)}
                            style={[
                              styles.pill,
                              { borderColor: colors.border },
                              selected && { backgroundColor: colors.primary, borderColor: colors.primary },
                            ]}
                          >
                            <Text style={[styles.pillText, { color: selected ? '#FFFFFF' : colors.text }]}>
                              {option.displayName}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    height: 44,
  },
  triggerText: {
    fontSize: FONT_SIZES.md,
    flexShrink: 1,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xl,
    maxHeight: '75%',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: SPACING.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  sheetTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },
  tabsRow: {
    gap: SPACING.sm,
    paddingBottom: SPACING.md,
  },
  tab: {
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  tabText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  sectionsContainer: {
    paddingBottom: SPACING.md,
  },
  section: {
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  pillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  pill: {
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  pillText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
});
