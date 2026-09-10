import React, { useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Container, Button, Layout, Text } from '../../components/ui';
import { useColors } from '../../hooks/useColors';
import { spacing } from '../../../themes';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  fetchInventoryItems,
  selectActiveInventoryItems,
} from '../../store/slices/inventorySlice';
import {
  AddressDetails,
  selectFromAddress,
  selectToAddress,
  selectItemQuantities,
  selectTotalSelectedItemCount,
  resetMovingRequest,
} from '../../store/slices/movingRequestSlice';

/**
 * Final step: review the addresses + all selected items (across every
 * category) before submitting the moving request.
 */
export default function MovingRequestSummary() {
  const router = useRouter();
  const colors = useColors();
  const dispatch = useAppDispatch();

  const fromAddress = useAppSelector(selectFromAddress);
  const toAddress = useAppSelector(selectToAddress);
  const quantities = useAppSelector(selectItemQuantities);
  const totalItems = useAppSelector(selectTotalSelectedItemCount);
  const allItems = useAppSelector(selectActiveInventoryItems);

  // Defensive fallback for landing here directly without the root-level
  // prefetch having completed yet. No need to manually check "already
  // loaded" here — fetchInventoryItems's own `condition` guard makes this a
  // no-op if data is already present.
  useEffect(() => {
    dispatch(fetchInventoryItems());
  }, [dispatch]);

  const selectedItems = allItems.filter((item) => (quantities[item.id] ?? 0) > 0);

  const handleSubmit = () => {
    // TODO: POST the moving request — fromAddress/toAddress here already
    // match the backend `addresses` table shape (google_place_id,
    // formatted_address, latitude, longitude, postal_code, city,
    // state_province, country, label, unit_apartment_number, has_elevator,
    // parking_restrictions) — plus the itemized quantities.
    dispatch(resetMovingRequest());
    router.push('/(app)/bookings');
  };

  const renderAddress = (title: string, address: AddressDetails | null) => (
    <View style={[styles.card, { borderColor: colors.border }]}>
      <Text variant="body" style={styles.cardTitle}>{title}</Text>
      {address ? (
        <>
          <Text variant="caption" style={{ color: colors.text }}>
            {address.formattedAddress}
          </Text>
          {(address.city || address.stateProvince || address.postalCode) && (
            <Text variant="caption" style={{ color: colors.text, opacity: 0.7 }}>
              {[address.city, address.stateProvince, address.postalCode].filter(Boolean).join(', ')}
              {address.country ? `, ${address.country}` : ''}
            </Text>
          )}
          {address.label ? (
            <Text variant="caption" style={{ color: colors.text, opacity: 0.7 }}>
              Label: {address.label}
            </Text>
          ) : null}
          {address.unitApartmentNumber ? (
            <Text variant="caption" style={{ color: colors.text, opacity: 0.7 }}>
              Unit/Apt: {address.unitApartmentNumber}
            </Text>
          ) : null}
          <Text variant="caption" style={{ color: colors.text, opacity: 0.7 }}>
            Elevator: {address.hasElevator ? 'Yes' : 'No'}
          </Text>
          {address.parkingRestrictions ? (
            <Text variant="caption" style={{ color: colors.text, opacity: 0.7 }}>
              Parking: {address.parkingRestrictions}
            </Text>
          ) : null}
        </>
      ) : (
        <Text variant="caption" style={{ color: colors.text, opacity: 0.7 }}>—</Text>
      )}
    </View>
  );


  return (
    <Container>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Layout spacing={spacing.lg}>
          <Text variant="title">Review Your Move</Text>

          {renderAddress('Pickup Address', fromAddress)}
          {renderAddress('Destination Address', toAddress)}

          <View style={[styles.card, { borderColor: colors.border }]}>
            <Text variant="body" style={styles.cardTitle}>
              Items ({totalItems} total)
            </Text>
            {selectedItems.length === 0 ? (
              <Text variant="caption" style={{ color: colors.text, opacity: 0.7 }}>
                No items selected.
              </Text>
            ) : (
              selectedItems.map((item) => (
                <View key={item.id} style={styles.itemLine}>
                  <Text variant="caption" style={{ color: colors.text }}>
                    {item.item_name} ({item.category})
                  </Text>
                  <Text variant="caption" style={{ color: colors.text }}>
                    x{quantities[item.id]}
                  </Text>
                </View>
              ))
            )}
          </View>

          <Button title="Submit Move Request" onPress={handleSubmit} />
          <Button title="Back" variant="outline" onPress={() => router.back()} />
        </Layout>
      </ScrollView>
    </Container>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingVertical: spacing.lg,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.xs,
  },
  cardTitle: {
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  itemLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});

