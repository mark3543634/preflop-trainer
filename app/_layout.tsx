// Root layout: hydrate persisted stores once, set the dark theme, host the stack.
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { colors } from '../src/theme';
import { useSettings } from '../src/store/settingsStore';
import { useStats } from '../src/store/statsStore';
import { usePresets } from '../src/store/presetsStore';
import { useReview } from '../src/store/reviewStore';
import { t } from '../src/i18n';
import { clearRetiredGamification } from '../src/storage';

export default function RootLayout() {
  const settingsReady = useSettings((state) => state.hydrated);
  const statsReady = useStats((state) => state.hydrated);
  const presetsReady = usePresets((state) => state.hydrated);
  const reviewReady = useReview((state) => state.hydrated);
  useEffect(() => {
    // Hydrate every domain store from AsyncStorage on launch.
    void useSettings.getState().hydrate();
    // Purge obsolete gamification values left by older app versions.
    void clearRetiredGamification();
    void useStats.getState().hydrate();
    void usePresets.getState().hydrate();
    void useReview.getState().hydrate();
  }, []);

  const hydrated = settingsReady && statsReady && presetsReady && reviewReady;

  if (!hydrated) {
    return (
      <SafeAreaProvider>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.bg },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="training"
          options={{ title: t('screen.training'), presentation: 'card' }}
        />
        <Stack.Screen name="review" options={{ title: t('screen.review') }} />
        <Stack.Screen name="heatmap/[id]" options={{ title: t('screen.range') }} />
      </Stack>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
});
