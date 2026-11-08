import React, { useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Container, Text, Layout } from '../../components/ui';
import { useColors } from '../../hooks/useColors';
import { spacing } from '../../../themes';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchServices, selectServices, MovingService } from '../../store/slices/servicesSlice';
import { fetchPropertyTypes } from '../../store/slices/propertyTypesSlice';
import { resetMovingRequest, setServiceId } from '../../store/slices/movingRequestSlice';

// Local icon lookup keyed by `moving_services.code`, since the backend row
// has no icon column.
const SERVICE_ICONS: Record<string, string> = {
  RESIDENTIAL_MOVING: '🏠',
  SMALL_MOVING: '📦',
  TRASH_GARBAGE: 'dump-truck', // rendered via MaterialCommunityIcons
  PICKUP_DROPOFF: '🚗',
  COMMERCIAL_MOVING: '🏢',
  STORAGE_SOLUTIONS: '📥',
};

// Services that kick off the step-by-step moving-request wizard when tapped.
const SERVICE_ROUTES: Record<string, string> = {
  RESIDENTIAL_MOVING: '/moving-request',
};

export default function ExploreScreen() {
  const colors = useColors();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const services = useAppSelector(selectServices);
  const { loading, error } = useAppSelector((state) => state.services);

  useEffect(() => {
    dispatch(fetchServices());
    // Pre-warms property types so they're already loaded by the time the
    // user reaches the moving-request wizard (thunk's `condition` guard
    // makes this a no-op if already fetched/in flight).
    dispatch(fetchPropertyTypes());
  }, [dispatch]);

  const handleServicePress = (service: MovingService) => {
    const route = SERVICE_ROUTES[service.code];
    if (!route) return;
    // Start the wizard fresh each time it's entered from Explore, then
    // record which service the user picked so movingRequestSlice already
    // has it by the time they reach the moving-request screen. The
    // backend's createRfq contract expects a numeric serviceId.
    dispatch(resetMovingRequest());
    dispatch(setServiceId(Number(service.id)));
    router.push(route as any);
  };


  const renderIcon = (code: string) => {
    const icon = SERVICE_ICONS[code];
    if (icon === 'dump-truck') {
      return (
        <MaterialCommunityIcons
          name="dump-truck"
          size={48}
          color={colors.primary}
          style={styles.serviceIconVector}
        />
      );
    }
    return <Text style={styles.serviceIcon}>{icon ?? '📦'}</Text>;
  };

  return (
    <Container>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Layout spacing={spacing.lg}>
          <Text variant="title">Explore Services</Text>

          {loading && (
            <Text variant="caption" style={{ color: colors.text }}>
              Loading services...
            </Text>
          )}

          {error && (
            <Text variant="caption" style={{ color: '#FF3B30' }}>
              {error}
            </Text>
          )}

          {!loading && !error && services.length === 0 && (
            <Text variant="caption" style={{ color: colors.text, opacity: 0.7 }}>
              No services available right now.
            </Text>
          )}

          {services.map((service) => {
            const isPressable = Boolean(SERVICE_ROUTES[service.code]);
            const CardWrapper = isPressable ? TouchableOpacity : View;
            return (
              <CardWrapper
                key={service.id}
                style={[styles.serviceCard, { borderColor: colors.border }]}
                {...(isPressable
                  ? { onPress: () => handleServicePress(service), activeOpacity: 0.7 }
                  : {})}
              >
                {renderIcon(service.code)}
                <Text variant="body" style={styles.serviceTitle}>{service.name}</Text>
                <Text variant="caption" style={[styles.serviceDescription, { color: colors.text }]}>
                  {service.description}
                </Text>
              </CardWrapper>
            );
          })}
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
  serviceCard: {
    padding: spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: spacing.sm,
  },
  serviceIcon: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  serviceIconVector: {
    marginBottom: spacing.sm,
  },
  serviceTitle: {
    fontWeight: '600',
    fontSize: 18,
  },
  serviceDescription: {
    textAlign: 'center',
    opacity: 0.7,
  },
});
