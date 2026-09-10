import React, { useEffect } from 'react';
import { View, StyleSheet, FlatList, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Container, Button, Layout, Text } from '../../../components/ui';
import { useColors } from '../../../hooks/useColors';
import { spacing } from '../../../../themes';
import { useAppDispatch, useAppSelector } from '../../../store';
import {
  InventoryItem,
  fetchInventoryItems,
  selectInventoryLoading,
  selectInventoryCategories,
  makeSelectInventoryItemsByCategory,
} from '../../../store/slices/inventorySlice';
import { setItemQuantity, selectItemQuantities } from '../../../store/slices/movingRequestSlice';

/**
 * One step per inventory-item category. `step` is the index into the
 * category list produced by `selectInventoryCategories`, so the wizard
 * automatically grows/shrinks based on whatever categories the backend
 * returns — no hardcoded screens per category.
 */
export default function CategoryItemsStep() {
  const { step } = useLocalSearchParams<{ step: string }>();
  const router = useRouter();
  const colors = useColors();
  const dispatch = useAppDispatch();

  const inventoryLoading = useAppSelector(selectInventoryLoading);
  const categories = useAppSelector(selectInventoryCategories);
  const quantities = useAppSelector(selectItemQuantities);

  // Defensive fallback for landing on this step directly (deep link, fast
  // refresh, etc.) without the root-level prefetch having completed yet.
  // No need to manually check "already loaded" here — fetchInventoryItems's
  // own `condition` guard makes this a no-op if data is already present.
  useEffect(() => {
    dispatch(fetchInventoryItems());
  }, [dispatch]);

  const stepIndex = Number(step ?? 0);
  const category = categories[stepIndex];
  const items = useAppSelector(makeSelectInventoryItemsByCategory(category ?? ''));

  const isLastStep = stepIndex >= categories.length - 1;
  const isFirstItemStep = stepIndex === 0;

  const handleQuantityChange = (item: InventoryItem, delta: number) => {
    const current = quantities[item.id] ?? 0;
    const next = Math.max(0, current + delta);
    dispatch(setItemQuantity({ itemId: item.id, quantity: next }));
  };

  const handleBack = () => {
    if (isFirstItemStep) {
      router.push('/moving-request');
    } else {
      router.push(`/moving-request/items/${stepIndex - 1}`);
    }
  };

  const handleNext = () => {
    if (isLastStep) {
      router.push('/moving-request/summary');
    } else {
      router.push(`/moving-request/items/${stepIndex + 1}`);
    }
  };

  if (!category) {
    return (
      <Container>
        <Layout spacing={spacing.lg} style={styles.centered}>
          <Text variant="body">
            {inventoryLoading ? 'Loading inventory...' : 'No inventory categories available.'}
          </Text>
          <Button title="Back" onPress={() => router.push('/moving-request')} />
        </Layout>
      </Container>
    );
  }


  const renderItem = ({ item }: { item: InventoryItem }) => {
    const quantity = quantities[item.id] ?? 0;
    return (
      <View style={[styles.itemRow, { borderColor: colors.border }]}>
        {item.thumbnail_url ? (
          <Image source={{ uri: item.thumbnail_url }} style={styles.thumbnail} />
        ) : (
          <View style={[styles.thumbnailPlaceholder, { backgroundColor: colors.border }]} />
        )}

        <View style={styles.itemInfo}>
          <Text variant="body" style={styles.itemName}>{item.item_name}</Text>
          <Text variant="caption" style={{ color: colors.text, opacity: 0.6 }}>
            {item.cubic_feet_volume} ft³ · {item.estimated_weight_lbs} lbs
          </Text>
        </View>

        <View style={styles.stepper}>
          <Button
            title="-"
            size="small"
            variant="outline"
            onPress={() => handleQuantityChange(item, -1)}
            disabled={quantity === 0}
            style={styles.stepperButton}
          />
          <Text variant="body" style={styles.quantityText}>{quantity}</Text>
          <Button
            title="+"
            size="small"
            variant="outline"
            onPress={() => handleQuantityChange(item, 1)}
            style={styles.stepperButton}
          />
        </View>
      </View>
    );
  };

  return (
    <Container>
      <View style={styles.header}>
        <Text variant="title">{category}</Text>
        <Text variant="caption" style={{ color: colors.text, opacity: 0.7 }}>
          Step {stepIndex + 2} of {categories.length + 1}: Select {category.toLowerCase()} items
        </Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text variant="body" style={{ color: colors.text, opacity: 0.7 }}>
            No items found in this category.
          </Text>
        }
      />

      <View style={styles.footer}>
        <Button title="Back" variant="outline" onPress={handleBack} style={styles.footerButton} />
        <Button
          title={isLastStep ? 'Review Order' : 'Next'}
          onPress={handleNext}
          style={styles.footerButton}
        />
      </View>
    </Container>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: spacing.md,
  },
  listContent: {
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  thumbnailPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontWeight: '600',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  stepperButton: {
    minHeight: 32,
    minWidth: 32,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  quantityText: {
    minWidth: 24,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  footerButton: {
    flex: 1,
  },
});

