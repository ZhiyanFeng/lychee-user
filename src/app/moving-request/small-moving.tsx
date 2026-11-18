import React from 'react';
import { SmallMovingWizardScreen } from '../../components/small-moving-wizard';

/**
 * Route entry for the Small Moving RFQ wizard — kept thin per expo-router
 * convention; all state/logic lives in `<SmallMovingWizardScreen />`.
 */
export default function SmallMovingRoute() {
  return <SmallMovingWizardScreen />;
}
