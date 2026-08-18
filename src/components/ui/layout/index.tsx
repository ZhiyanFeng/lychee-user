import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';

interface LayoutProps extends ViewProps {
  direction?: 'row' | 'column';
  spacing?: number;
  children: React.ReactNode;
}

export function Layout({
  direction = 'column',
  spacing = 16,
  children,
  style,
  ...props
}: LayoutProps) {
  return (
    <View
      style={[
        styles.layout,
        { flexDirection: direction, gap: spacing },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  layout: {
    // Intentionally no `flex: 1` here — this component is almost always used
    // as the direct child of a ScrollView. Giving it flex: 1 would clamp its
    // height to the visible viewport instead of letting it grow to its full
    // content size, which breaks scrolling to reveal overflowing content.
  },
});
