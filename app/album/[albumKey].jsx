import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import AppText from '../../src/components/AppText';
import AlbumArt from '../../src/components/AlbumArt';
import { C, albumKeyFor, formatTime } from '../../src/theme';
import { loadCachedSongs } from '../../src/library';
import { useAudio } from '../../src/player/AudioContext';

export default function AlbumScreen() {
  const { albumKey } = useLocalSearchParams();
  const [songs, setSongs] = useState([]);
  const { playSong } = useAudio();

  useEffect(() => {
    loadCachedSongs().then((all) => setSongs(all.filter((s) => albumKeyFor(s) === decodeURIComponent(albumKey || '')).sort((a,b) => (a.trackNumber || 999) - (b.trackNumber || 999))));
  }, [albumKey]);

  const first = songs[0];
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, padding: 18 }}>
      <AlbumArt uri={first?.artworkUri} size={210} style={{ width: '100%', height: 210, borderRadius: 18 }} />
      <AppText variant="metadata" style={{ color: C.white, fontSize: 28, fontWeight: '900', marginTop: 20 }}>{first?.album || 'Unknown Album'}</AppText>
      <AppText variant="metadata" style={{ color: C.muted, fontSize: 15, marginTop: 5 }}>{first?.albumArtist || first?.artist || 'Unknown artist'}</AppText>
      <AppText variant="metadata" style={{ color: C.muted, fontSize: 12, marginTop: 8 }}>{songs.length} TRACKS{first?.year ? ` · ${first.year}` : ''}</AppText>
      <Pressable disabled={!songs.length} onPress={() => playSong(songs[0], songs)} style={{ backgroundColor: C.red, borderRadius: 13, padding: 14, alignItems: 'center', marginVertical: 18 }}>
        <AppText style={{ color: C.redBright, fontWeight: '900', letterSpacing: 1 }}>▶  PLAY ALBUM</AppText>
      </Pressable>
      <FlatList data={songs} keyExtractor={(s) => s.id} renderItem={({ item, index }) => (
        <Pressable onPress={() => playSong(item, songs)} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12, borderBottomWidth: 1, borderBottomColor: C.line }}>
          <AppText variant="metadata" style={{ color: C.muted, width: 20 }}>{item.trackNumber || index + 1}</AppText>
          <View style={{ flex: 1 }}>
            <AppText variant="songTitle" numberOfLines={1} style={{ color: C.white, fontWeight: '700' }}>{item.title}</AppText>
            <AppText variant="metadata" style={{ color: C.muted, marginTop: 4, fontSize: 12 }}>{item.artist}</AppText>
          </View>
          <AppText variant="metadata" style={{ color: C.muted, fontSize: 12 }}>{item.duration ? formatTime(item.duration) : '—'}</AppText>
        </Pressable>
      )} />
    </View>
  );
}