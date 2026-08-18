import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Container, Text, Layout } from '../../components/ui';
import { useColors } from '../../hooks/useColors';
import { spacing } from '../../../themes';

export default function ExploreScreen() {
  const colors = useColors();

  return (
    <Container>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Layout spacing={spacing.lg}>
          <Text variant="title">Explore Services</Text>

          <View style={[styles.serviceCard, { borderColor: colors.border }]}>
            <Text style={styles.serviceIcon}>🏠</Text>
            <Text variant="body" style={styles.serviceTitle}>Residential Moving</Text>
            <Text variant="caption" style={[styles.serviceDescription, { color: colors.text }]}>
              Full-service residential moving
            </Text>
          </View>

          <View style={[styles.serviceCard, { borderColor: colors.border }]}>
            <Text style={styles.serviceIcon}>📦</Text>
            <Text variant="body" style={styles.serviceTitle}>Small Moving</Text>
            <Text variant="caption" style={[styles.serviceDescription, { color: colors.text }]}>
              Small items and furniture moving
            </Text>
          </View>

          <View style={[styles.serviceCard, { borderColor: colors.border }]}>
            <MaterialCommunityIcons
              name="dump-truck"
              size={48}
              color={colors.primary}
              style={styles.serviceIconVector}
            />
            <Text variant="body" style={styles.serviceTitle}>Trash & Garbage Removal</Text>
            <Text variant="caption" style={[styles.serviceDescription, { color: colors.text }]}>
              Trash and garbage removal
            </Text>
          </View>

          <View style={[styles.serviceCard, { borderColor: colors.border }]}>
            <Text style={styles.serviceIcon}>🚗</Text>
            <Text variant="body" style={styles.serviceTitle}>Pickup & Drop-off</Text>
            <Text variant="caption" style={[styles.serviceDescription, { color: colors.text }]}>
              Quick pick-up and drop-off service
            </Text>
          </View>

          <View style={[styles.serviceCard, { borderColor: colors.border }]}>
            <Text style={styles.serviceIcon}>🏢</Text>
            <Text variant="body" style={styles.serviceTitle}>Commercial Moving</Text>
            <Text variant="caption" style={[styles.serviceDescription, { color: colors.text }]}>
              Office and commercial relocation services
            </Text>
          </View>

          <View style={[styles.serviceCard, { borderColor: colors.border }]}>
            <Text style={styles.serviceIcon}>📥</Text>
            <Text variant="body" style={styles.serviceTitle}>Storage Solutions</Text>
            <Text variant="caption" style={[styles.serviceDescription, { color: colors.text }]}>
              Short-term and long-term storage options
            </Text>
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
