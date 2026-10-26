import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requireOptionalNativeModule } from 'expo-modules-core';

const SETTINGS_KEY = 'localbeats.equalizer.v1';
const AudioEffects = Platform.OS === 'android'
  ? requireOptionalNativeModule('LocalBeatsAudioMetadata')
  : null;

export async function getEqualizerInfo() {
  if (!AudioEffects) return { supported: false };
  return AudioEffects.getEqualizerInfo();
}

export async function loadEqualizerLevels() {
  const stored = await AsyncStorage.getItem(SETTINGS_KEY);
  if (!stored) return { bass: 0, treble: 0 };
  const levels = JSON.parse(stored);
  return {
    bass: Number.isFinite(levels.bass) ? levels.bass : 0,
    treble: Number.isFinite(levels.treble) ? levels.treble : 0
  };
}

export async function applyEqualizerLevels(bass, treble) {
  if (!AudioEffects) {
    throw new Error('The Android equalizer is not available in this app build.');
  }
  return AudioEffects.setEqualizer(bass, treble);
}

export async function setEqualizerLevels(bass, treble) {
  const levels = await applyEqualizerLevels(bass, treble);
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(levels));
  return levels;
}
