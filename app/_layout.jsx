import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AudioProvider } from '../src/player/AudioContext';
import { C, FONT_FAMILY } from '../src/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AudioProvider>
        <StatusBar style="light" backgroundColor={C.bg} />
        <Stack screenOptions={{
          headerStyle: { backgroundColor: C.bg },
          headerTintColor: C.white,
          headerTitleStyle: { fontFamily: FONT_FAMILY, fontWeight: '800' },
          contentStyle: { backgroundColor: C.bg }
        }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="app-info" options={{ title: 'APP INFO' }} />
          <Stack.Screen name="album/[albumKey]" options={{ title: 'ALBUM' }} />
          <Stack.Screen name="now-playing" options={{ title: 'NOW PLAYING' }} />
        </Stack>
      </AudioProvider>
    </SafeAreaProvider>
  );
}