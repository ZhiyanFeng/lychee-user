import { Stack } from 'expo-router';
import { useColors } from '../../hooks/useColors';

export default function MovingRequestLayout() {
  const colors = useColors();

  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      {/*
        The wizard renders its own in-body header (<BookingHeader />, with a
        back chevron that steps backward through the form and exits to
        Explore on step 1) — the native Stack header is hidden here so
        there's only one back control on screen, not two.
      */}
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="bids" options={{ title: 'Bidding Feed' }} />
    </Stack>
  );
}



