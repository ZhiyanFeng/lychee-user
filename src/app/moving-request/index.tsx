import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { Container, Button, AddressAutocompleteInput, Input, Layout, Text } from '../../components/ui';
import type { GooglePlaceSelection } from '../../components/ui';
import { useColors } from '../../hooks/useColors';
import { spacing } from '../../../themes';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchInventoryItems, selectInventoryCategories, selectInventoryLoading, selectInventoryError } from '../../store/slices/inventorySlice';
import {
  AddressDetails,
  setAddress,
  selectFromAddress,
  selectToAddress,
} from '../../store/slices/movingRequestSlice';

/**
 * Step 1 of the residential-moving wizard: capture the origin ("from") and
 * destination ("to") addresses, matching the backend `addresses` table
 * (Google place data + parsed city/state/postal/country + custom logistics
 * fields: label, unit/apartment #, elevator, parking restrictions). Every
 * following step corresponds to one inventory-item category fetched from
 * the backend.
 */
export default function MoveAddressStep() {
  const router = useRouter();
  const colors = useColors();
  const dispatch = useAppDispatch();

  const savedFromAddress = useAppSelector(selectFromAddress);
  const savedToAddress = useAppSelector(selectToAddress);
  const categories = useAppSelector(selectInventoryCategories);
  const loading = useAppSelector(selectInventoryLoading);
  const error = useAppSelector(selectInventoryError);

  const [fromAddress, setFromAddress] = useState<AddressDetails | null>(savedFromAddress);
  const [toAddress, setToAddress] = useState<AddressDetails | null>(savedToAddress);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    dispatch(fetchInventoryItems());
  }, [dispatch]);

  const handleSelectPlace = (slot: 'from' | 'to', place: GooglePlaceSelection) => {
    const setter = slot === 'from' ? setFromAddress : setToAddress;
    const previous = slot === 'from' ? fromAddress : toAddress;
    setter({
      ...place,
      // Preserve any logistics fields the user already filled in if they
      // change the address search (e.g. picked the wrong suggestion first).
      label: previous?.label,
      unitApartmentNumber: previous?.unitApartmentNumber,
      hasElevator: previous?.hasElevator ?? false,
      parkingRestrictions: previous?.parkingRestrictions,
    });
  };

  const handleLogisticsChange = (
    slot: 'from' | 'to',
    changes: Partial<AddressDetails>
  ) => {
    const setter = slot === 'from' ? setFromAddress : setToAddress;
    setter((prev) => (prev ? { ...prev, ...changes } : prev));
  };

  const handleNext = () => {
    if (!fromAddress || !toAddress) {
      setFormError('Please select both the pickup and destination addresses from the suggestions');
      return;
    }
    setFormError('');
    dispatch(setAddress({ slot: 'from', address: fromAddress }));
    dispatch(setAddress({ slot: 'to', address: toAddress }));

    if (categories.length === 0) {
      // Nothing to itemize yet — go straight to the summary.
      router.push('/moving-request/summary');
      return;
    }
    router.push('/moving-request/items/0');
  };

  const renderLogisticsFields = (slot: 'from' | 'to', address: AddressDetails | null) => {
    if (!address) return null;
    return (
      <View style={styles.logisticsGroup}>
        <Input
          label="Label (optional)"
          placeholder="Home, Office, Storage"
          value={address.label ?? ''}
          onChangeText={(text) => handleLogisticsChange(slot, { label: text })}
        />
        <Input
          label="Unit / Apartment # (optional)"
          placeholder="Apt 4B"
          value={address.unitApartmentNumber ?? ''}
          onChangeText={(text) => handleLogisticsChange(slot, { unitApartmentNumber: text })}
        />
        <View style={styles.switchRow}>
          <Text variant="body">Building has an elevator</Text>
          <Switch
            value={address.hasElevator}
            onValueChange={(value) => handleLogisticsChange(slot, { hasElevator: value })}
          />
        </View>
        <Input
          label="Parking restrictions (optional)"
          placeholder="e.g. No parking after 6pm, permit required"
          value={address.parkingRestrictions ?? ''}
          onChangeText={(text) => handleLogisticsChange(slot, { parkingRestrictions: text })}
          multiline
        />
      </View>
    );
  };



  return (
    <Container>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Layout spacing={spacing.lg}>
            <View>
              <Text variant="title">Where are you moving?</Text>
              <Text variant="caption" style={{ color: colors.text, opacity: 0.7 }}>
                Step 1 of {categories.length + 1}: Move addresses
              </Text>
            </View>

            {formError ? (
              <Text variant="caption" style={{ color: '#FF3B30' }}>
                {formError}
              </Text>
            ) : null}

            {error && (
              <Text variant="caption" style={{ color: '#FF3B30' }}>
                Couldn't load inventory items: {error}
              </Text>
            )}

            <View>
              <AddressAutocompleteInput
                label="Pickup Address"
                placeholder="123 Main St, City, State"
                value={fromAddress?.formattedAddress}
                zIndex={2}
                onSelectPlace={(place) => handleSelectPlace('from', place)}
              />
              {renderLogisticsFields('from', fromAddress)}

              <AddressAutocompleteInput
                label="Destination Address"
                placeholder="456 Oak Ave, City, State"
                value={toAddress?.formattedAddress}
                zIndex={1}
                onSelectPlace={(place) => handleSelectPlace('to', place)}
              />
              {renderLogisticsFields('to', toAddress)}
            </View>

            <Button
              title={loading ? 'Loading inventory...' : 'Next: Select Items'}
              onPress={handleNext}
              disabled={loading}
            />
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
  logisticsGroup: {
    marginBottom: spacing.lg,
    paddingLeft: spacing.sm,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
});





