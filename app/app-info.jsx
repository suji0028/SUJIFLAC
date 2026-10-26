import React, { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, View } from 'react-native';
import Constants from 'expo-constants';
import AppText from '../src/components/AppText';
import { C } from '../src/theme';

const REPOSITORY = 'suji0028/SUJIFLAC';
const RELEASES_API = `https://api.github.com/repos/${REPOSITORY}/releases/latest`;
const RELEASES_PAGE = `https://github.com/${REPOSITORY}/releases`;
const APP_VERSION = Constants.expoConfig?.version || 'Unknown';

function compareVersions(left, right) {
  const parse = (version) => {
    const match = version.replace(/^v/i, '').match(/^(\d+(?:\.\d+)*)$/);
    return match ? match[1].split('.').map(Number) : null;
  };
  const current = parse(left);
  const latest = parse(right);
  if (!current || !latest) return null;

  for (let index = 0; index < Math.max(current.length, latest.length); index += 1) {
    const difference = (latest[index] || 0) - (current[index] || 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

export default function AppInfoScreen() {
  const [checking, setChecking] = useState(false);
  const [update, setUpdate] = useState(null);

  async function checkForUpdates() {
    setChecking(true);
    setUpdate({ message: 'Checking GitHub for the latest release…', kind: 'info' });
    try {
      const response = await fetch(RELEASES_API, {
        headers: { Accept: 'application/vnd.github+json' }
      });
      if (response.status === 404) {
        setUpdate({ message: 'No published release was found yet.', kind: 'error' });
        return;
      }
      if (!response.ok) {
        throw new Error(`GitHub returned HTTP ${response.status}.`);
      }

      const release = await response.json();
      const latestVersion = release.tag_name?.replace(/^v/i, '');
      const versionComparison = compareVersions(APP_VERSION, latestVersion || '');
      if (versionComparison === null) {
        throw new Error('The latest release tag must use a version such as v1.0.1.');
      }
      if (versionComparison <= 0) {
        setUpdate({ message: `You're up to date (version ${APP_VERSION}).`, kind: 'success' });
        return;
      }

      const apk = release.assets?.find((asset) => asset.name === 'app-release.apk');
      if (!apk?.browser_download_url) {
        setUpdate({
          message: `Version ${latestVersion} is available, but its app-release.apk is missing from the GitHub release.`,
          kind: 'error'
        });
        return;
      }

      setUpdate({
        message: `Version ${latestVersion} is available. Download it, then confirm installation in Android.`,
        kind: 'success',
        downloadUrl: apk.browser_download_url
      });
    } catch (error) {
      console.warn('Could not check for LocalBeats updates', error);
      setUpdate({ message: `Could not check for updates: ${error.message}`, kind: 'error' });
    } finally {
      setChecking(false);
    }
  }

  async function downloadUpdate() {
    try {
      await Linking.openURL(update.downloadUrl);
    } catch (error) {
      console.warn('Could not open the update download', error);
      setUpdate({ message: `Could not open the APK download: ${error.message}`, kind: 'error' });
    }
  }

  const messageColor = update?.kind === 'error'
    ? C.redBright
    : update?.kind === 'success' ? '#9BD89D' : C.muted;

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, backgroundColor: C.bg, padding: 22 }}>
      <View style={{ alignItems: 'center', marginTop: 32, marginBottom: 36 }}>
        <AppText style={{ color: C.white, fontSize: 30, fontWeight: '900', letterSpacing: -1 }}>
          LOCAL<AppText style={{ color: C.redBright }}>BEATS</AppText>
        </AppText>
        <AppText style={{ color: C.muted, marginTop: 8 }}>YOUR MUSIC. YOUR DEVICE.</AppText>
      </View>

      <View style={{ backgroundColor: C.panel, borderColor: C.line, borderWidth: 1, borderRadius: 16, padding: 18 }}>
        <AppText style={{ color: C.muted, fontSize: 12, letterSpacing: 1 }}>INSTALLED VERSION</AppText>
        <AppText accessibilityLabel={`Version ${APP_VERSION}`} style={{ color: C.white, fontSize: 22, fontWeight: '800', marginTop: 8 }}>
          {APP_VERSION}
        </AppText>
      </View>

      <Pressable
        accessibilityRole="button"
        disabled={checking}
        onPress={checkForUpdates}
        style={{ backgroundColor: C.red, borderRadius: 13, minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 18 }}
      >
        {checking && <ActivityIndicator color={C.white} />}
        <AppText style={{ color: C.white, fontWeight: '900', letterSpacing: 0.5 }}>
          {checking ? 'CHECKING…' : 'CHECK FOR UPDATES'}
        </AppText>
      </Pressable>

      {update && (
        <View accessibilityLiveRegion="polite" style={{ marginTop: 14 }}>
          <AppText style={{ color: messageColor, lineHeight: 21 }}>{update.message}</AppText>
          {update.downloadUrl && (
            <Pressable
              accessibilityRole="button"
              onPress={downloadUpdate}
              style={{ backgroundColor: C.panel, borderColor: C.line, borderWidth: 1, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 12 }}
            >
              <AppText style={{ color: C.white, fontWeight: '800' }}>DOWNLOAD UPDATE</AppText>
            </Pressable>
          )}
        </View>
      )}

      <AppText style={{ color: C.muted, lineHeight: 21, marginTop: 30 }}>
        Updates are hosted on GitHub. After downloading an update, Android will ask you to confirm installation.
      </AppText>
      <Pressable accessibilityRole="link" onPress={() => Linking.openURL(RELEASES_PAGE)} style={{ paddingVertical: 14 }}>
        <AppText style={{ color: C.redBright, fontWeight: '700' }}>VIEW GITHUB RELEASES</AppText>
      </Pressable>
    </ScrollView>
  );
}
