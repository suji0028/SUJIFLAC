import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AudioProvider } from '../src/player/AudioContext';
import { C, FONT_FAMILY } from '../src/theme';

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    BlackMustang: require('../src/BlackMustang.ttf'),
    BlackPink: require('../src/blackPink.ttf')
  });

  if (fontError) throw fontError;
  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: C.bg }} />;

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