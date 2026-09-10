import { Stack } from 'expo-router';
import { useColors } from '../../hooks/useColors';

export default function MovingRequestLayout() {
  const colors = useColors();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerBackTitle: 'Back',
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Move Details' }} />
      <Stack.Screen name="items/[step]" options={{ title: 'Select Items' }} />
      <Stack.Screen name="summary" options={{ title: 'Review & Submit' }} />
    </Stack>
  );
}

