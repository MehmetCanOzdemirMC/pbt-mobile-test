/**
 * Analytics Tab Screen
 *
 * Wrapper for AnalyticsScreen (reuse existing component)
 * Port from: web/src/components/AnalyticsDashboard.jsx
 */

import React from 'react';
import AnalyticsScreen from '../../AnalyticsScreen';

export default function AnalyticsTabScreen() {
  // Reuse existing AnalyticsScreen component
  return <AnalyticsScreen />;
}
