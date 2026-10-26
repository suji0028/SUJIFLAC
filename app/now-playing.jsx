import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import AppText from '../src/components/AppText';
import AlbumArt from '../src/components/AlbumArt';
import RotaryControl from '../src/components/RotaryControl';
import { C, formatTime } from '../src/theme';
import { useAudio } from '../src/player/AudioContext';
import { applyEqualizerLevels, getEqualizerInfo, loadEqualizerLevels, setEqualizerLevels } from '../src/player/equalizer';

export default function NowPlayingScreen() {
  const { current, status, toggle, next, previous, seek } = useAudio();
  const [equalizerAvailable, setEqualizerAvailable] = useState(false);
  const [equalizerLevels, setEqualizerLevelsState] = useState({ bass: 0, treble: 0 });
  const [equalizerError, setEqualizerError] = useState('');
  const equalizerLevelsRef = useRef(equalizerLevels);

  useEffect(() => {
    let active = true;
    Promise.all([getEqualizerInfo(), loadEqualizerLevels()])
      .then(async ([info, levels]) => {
        if (!active) return;
        setEqualizerAvailable(info.supported === true);
        if (info.supported) {
          const applied = await setEqualizerLevels(levels.bass, levels.treble);
          if (active) {
            setEqualizerLevelsState(applied);
            equalizerLevelsRef.current = applied;
          }
        } else {
          setEqualizerLevelsState(levels);
          equalizerLevelsRef.current = levels;
          setEqualizerError('Equalizer is only available on supported Android devices.');
        }
      })
      .catch((error) => {
        console.warn('Could not initialize audio equalizer', error);
        if (active) {
          setEqualizerAvailable(false);
          setEqualizerError('Equalizer is not supported by this device.');
        }
      });
    return () => {
      active = false;
    };
  }, []);

  async function updateEqualizerValue(key, value, persist) {
    const nextLevels = { ...equalizerLevelsRef.current, [key]: value };
    equalizerLevelsRef.current = nextLevels;
    setEqualizerLevelsState(nextLevels);
    setEqualizerError('');
    try {
      if (persist) {
        const applied = await setEqualizerLevels(nextLevels.bass, nextLevels.treble);
        equalizerLevelsRef.current = applied;
        setEqualizerLevelsState(applied);
      } else {
        await applyEqualizerLevels(nextLevels.bass, nextLevels.treble);
      }
    } catch (error) {
      console.warn('Could not apply equalizer settings', error);
      setEqualizerAvailable(false);
      setEqualizerError('Equalizer is not supported by this device.');
    }
  }

  if (!current) return <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}><AppText style={{ color: C.white }}>Choose a song to start playing.</AppText></View>;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 24, flexGrow: 1, justifyContent: 'center' }}>
      <AlbumArt uri={current.artworkUri} size={300} style={{ width: '100%', height: 300, borderRadius: 24, shadowColor: C.red, shadowOpacity: .25, shadowRadius: 28, elevation: 8 }} />
      <AppText variant="songTitle" numberOfLines={2} style={{ color: C.white, fontSize: 26, fontWeight: '900', marginTop: 30 }}>{current.title}</AppText>
      <AppText variant="metadata" style={{ color: C.muted, fontSize: 16, marginTop: 7 }}>{current.artist}</AppText>
      <AppText variant="metadata" style={{ color: C.redBright, fontSize: 12, marginTop: 5 }}>{current.album}</AppText>
      <Slider
        minimumValue={0}
        maximumValue={Math.max(status.duration || 1, 1)}
        value={status.currentTime || 0}
        minimumTrackTintColor={C.redBright}
        maximumTrackTintColor={C.line}
        thumbTintColor={C.white}
        onSlidingComplete={seek}
        style={{ marginTop: 28, marginHorizontal: -8 }}
      />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <AppText style={{ color: C.muted, fontSize: 12 }}>{formatTime(status.currentTime)}</AppText>
        <AppText style={{ color: C.muted, fontSize: 12 }}>-{formatTime(Math.max(0, (status.duration || 0) - (status.currentTime || 0)))}</AppText>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginTop: 28 }}>
        <Pressable onPress={previous}><Ionicons name="play-skip-back" size={30} color={C.white} /></Pressable>
        <Pressable onPress={toggle} style={{ width: 74, height: 74, borderRadius: 37, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={status.playing ? 'pause' : 'play'} size={34} color={C.white} />
        </Pressable>
        <Pressable onPress={next}><Ionicons name="play-skip-forward" size={30} color={C.white} /></Pressable>
      </View>
      <View style={{ backgroundColor: C.panel, borderRadius: 16, borderWidth: 1, borderColor: C.line, padding: 16, marginTop: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Ionicons name="options-outline" size={20} color={C.redBright} />
          <AppText style={{ color: C.white, fontWeight: '800', fontSize: 15, flex: 1 }}>Equalizer</AppText>
          <AppText style={{ color: C.muted, fontSize: 11 }}>BASS / TREBLE</AppText>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-evenly', paddingTop: 8 }}>
          <RotaryControl
            label="Bass"
            value={equalizerLevels.bass}
            enabled={equalizerAvailable}
            onValueChange={(value) => updateEqualizerValue('bass', value, false)}
            onValueChangeComplete={(value) => updateEqualizerValue('bass', value, true)}
          />
          <RotaryControl
            label="Treble"
            value={equalizerLevels.treble}
            enabled={equalizerAvailable}
            onValueChange={(value) => updateEqualizerValue('treble', value, false)}
            onValueChangeComplete={(value) => updateEqualizerValue('treble', value, true)}
          />
        </View>
        {equalizerError ? <AppText style={{ color: C.redBright, fontSize: 11, marginTop: 6 }}>{equalizerError}</AppText> : null}
      </View>
      <AppText style={{ color: C.muted, fontSize: 11, textAlign: 'center', marginTop: 28 }}>LOCAL PLAYBACK · NO STREAMING</AppText>
    </ScrollView>
  );
}