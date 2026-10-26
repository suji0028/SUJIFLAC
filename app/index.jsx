import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AppText from '../src/components/AppText';
import AlbumArt from '../src/components/AlbumArt';
import { C, FONT_FAMILY, formatTime, albumKeyFor } from '../src/theme';
import { chooseMusicFolder, getSavedFolder, loadCachedSongs, loadSortOrder, saveSortOrder, scanFolder } from '../src/library';
import { useAudio } from '../src/player/AudioContext';

const SORT_OPTIONS = [
  { id: 'lastAdded', label: 'Last added', icon: 'time-outline' },
  { id: 'alphabetical', label: 'Alphabetical', icon: 'text-outline' },
  { id: 'size', label: 'File size', icon: 'server-outline' },
  { id: 'length', label: 'Song length', icon: 'hourglass-outline' }
];

export default function LibraryScreen() {
  const [songs, setSongs] = useState([]);
  const [folder, setFolder] = useState(null);
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('Songs');
  const [sortOrder, setSortOrder] = useState('alphabetical');
  const [sortVisible, setSortVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const { current, playSong, status, toggle } = useAudio();

  useEffect(() => {
    (async () => {
      const [savedFolder, cached] = await Promise.all([getSavedFolder(), loadCachedSongs()]);
      setFolder(savedFolder);
      setSongs(cached);
      if (savedFolder && (!cached.length || cached.some((song) => song.sizeBytes == null || song.artworkChecked == null))) {
        runScan(savedFolder);
      }
    })();
    loadSortOrder().then(setSortOrder).catch((error) => console.warn('Could not load song sort preference', error));
  }, []);

  async function runScan(uri) {
    setBusy(true);
    setProgress(0);
    try {
      const result = await scanFolder(uri, setProgress);
      setSongs(result);
      setFolder(uri);
    } catch (e) {
      console.warn(e);
    } finally {
      setBusy(false);
    }
  }

  async function pickFolder() {
    const uri = await chooseMusicFolder();
    if (uri) await runScan(uri);
  }

  const albums = useMemo(() => {
    const map = new Map();
    songs.forEach((song) => {
      const key = albumKeyFor(song);
      if (!map.has(key)) map.set(key, { key, album: song.album, artist: song.albumArtist || song.artist, songs: [] });
      map.get(key).songs.push(song);
    });
    return [...map.values()];
  }, [songs]);

  const filtered = useMemo(() => songs.filter((s) =>
    `${s.title} ${s.artist} ${s.album}`.toLowerCase().includes(query.toLowerCase())
  ), [songs, query]);

  const sortedSongs = useMemo(() => {
    const result = [...filtered];
    result.sort((a, b) => {
      if (sortOrder === 'lastAdded') return (b.addedAt || 0) - (a.addedAt || 0);
      if (sortOrder === 'size') return (b.sizeBytes || 0) - (a.sizeBytes || 0);
      if (sortOrder === 'length') return (b.duration || 0) - (a.duration || 0);
      return a.title.localeCompare(b.title);
    });
    return result;
  }, [filtered, sortOrder]);

  async function selectSortOrder(order) {
    setSortOrder(order);
    setSortVisible(false);
    try {
      await saveSortOrder(order);
    } catch (error) {
      console.warn('Could not save song sort preference', error);
    }
  }

  const row = ({ item }) => (
    <Pressable onPress={() => playSong(item, sortedSongs)} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 }}>
      <AlbumArt uri={item.artworkUri} />
      <View style={{ flex: 1 }}>
        <AppText numberOfLines={1} style={{ color: item.id === current?.id ? C.redBright : C.white, fontWeight: '700', fontSize: 15 }}>{item.title}</AppText>
        <AppText numberOfLines={1} style={{ color: C.muted, marginTop: 4, fontSize: 12 }}>{item.artist} · {item.album}</AppText>
      </View>
      <AppText style={{ color: C.muted, fontSize: 12 }}>{item.duration ? formatTime(item.duration) : '—'}</AppText>
      <Pressable hitSlop={10} onPress={() => playSong(item, sortedSongs)}><Ionicons name="ellipsis-vertical" color={C.white} size={18} /></Pressable>
    </Pressable>
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: C.bg, paddingHorizontal: 18, paddingTop: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="App info" onPress={() => router.push('/app-info')}>
          <AppText style={{ color: C.white, fontSize: 29, fontWeight: '900', letterSpacing: -1 }}>LOCAL<AppText style={{ color: C.redBright }}>BEATS</AppText></AppText>
          <AppText style={{ color: C.muted, fontSize: 11, letterSpacing: 2 }}>YOUR MUSIC. YOUR DEVICE.</AppText>
        </Pressable>
        <Pressable onPress={pickFolder} style={{ backgroundColor: C.red, padding: 12, borderRadius: 12 }}>
          <Ionicons name="folder-open" color={C.white} size={22} />
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.panel, borderRadius: 12, paddingHorizontal: 12, marginBottom: 18 }}>
        <Ionicons name="search" color={C.muted} size={19} />
        <TextInput value={query} onChangeText={setQuery} placeholder="Search songs, artists, albums" placeholderTextColor={C.muted} style={{ color: C.white, padding: 13, flex: 1, fontFamily: FONT_FAMILY }} />
      </View>

      <View style={{ flexDirection: 'row', marginBottom: 12, gap: 10 }}>
        {[['Songs', 'musical-notes'], ['Albums', 'albums']].map(([label, icon]) => (
          <Pressable key={label} onPress={() => setActiveTab(label)} style={{ minHeight: 48, backgroundColor: activeTab === label ? C.red : C.panel, borderRadius: 24, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Ionicons name={icon} size={16} color={C.white} /><AppText style={{ color: C.white, fontWeight: '700', fontSize: 13, includeFontPadding: false }}>{label}</AppText>
          </Pressable>
        ))}
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <AppText style={{ color: C.white, fontSize: 19, fontWeight: '800', flexShrink: 1 }}>{activeTab === 'Songs' ? 'All songs' : 'All albums'} <AppText style={{ color: C.muted, fontSize: 13 }}>({activeTab === 'Songs' ? filtered.length : albums.length})</AppText></AppText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {activeTab === 'Songs' && (
            <Pressable accessibilityLabel="Sort songs" onPress={() => setSortVisible(true)} style={{ padding: 8 }}>
              <Ionicons name="filter" color={C.white} size={19} />
            </Pressable>
          )}
          <Pressable onPress={() => folder ? runScan(folder) : pickFolder()} style={{ paddingVertical: 8, paddingLeft: 6 }}>
            <AppText style={{ color: C.white, fontWeight: '700', fontSize: 12 }}>SCAN</AppText>
          </Pressable>
        </View>
      </View>

      {busy ? <View style={{ padding: 28, alignItems: 'center' }}><ActivityIndicator color={C.redBright} /><AppText style={{ color: C.white, marginTop: 10 }}>Scanning… {progress} audio files</AppText></View> :
      songs.length === 0 ? (
        <View style={{ alignItems: 'center', paddingTop: 50 }}>
          <AlbumArt size={90} />
          <AppText style={{ color: C.white, fontSize: 19, fontWeight: '800', marginTop: 18 }}>Your library is empty</AppText>
          <AppText style={{ color: C.muted, textAlign: 'center', marginTop: 8, lineHeight: 20 }}>Choose the folder where your music is stored to start building your library.</AppText>
          <Pressable onPress={pickFolder} style={{ backgroundColor: C.red, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 12, marginTop: 20 }}><AppText style={{ color: C.redBright, fontWeight: '800' }}>CHOOSE MUSIC FOLDER</AppText></Pressable>
        </View>
      ) : activeTab === 'Songs' ? (
        <FlatList key="songs-list" data={sortedSongs} renderItem={row} keyExtractor={(item) => item.id} contentContainerStyle={{ paddingBottom: current ? 100 : 24 }} />
      ) : (
        <FlatList
          key="albums-grid"
          data={albums.filter((a) => `${a.album} ${a.artist}`.toLowerCase().includes(query.toLowerCase()))}
          keyExtractor={(item) => item.key}
          numColumns={2}
          columnWrapperStyle={{ gap: 12 }}
          contentContainerStyle={{ paddingBottom: current ? 100 : 24 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push({ pathname: '/album/[albumKey]', params: { albumKey: encodeURIComponent(item.key) } })}
              style={{ flex: 1, marginBottom: 18, backgroundColor: C.panel, padding: 10, borderRadius: 14 }}
            >
              <AlbumArt size={140} uri={item.songs[0]?.artworkUri} style={{ width: '100%', height: 140 }} />
              <AppText numberOfLines={1} style={{ color: C.white, fontWeight: '800', marginTop: 10 }}>{item.album}</AppText>
              <AppText numberOfLines={1} style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>{item.artist}</AppText>
              <AppText style={{ color: C.redBright, fontSize: 11, marginTop: 6 }}>{item.songs.length} TRACKS</AppText>
            </Pressable>
          )}
        />
      )}

      {current && (
        <Pressable onPress={() => router.push('/now-playing')} style={{ position: 'absolute', bottom: 12, left: 12, right: 12, backgroundColor: C.panel, borderColor: C.line, borderWidth: 1, borderRadius: 15, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <AlbumArt size={44} uri={current.artworkUri} />
          <View style={{ flex: 1 }}>
            <AppText numberOfLines={1} style={{ color: C.white, fontWeight: '800' }}>{current.title}</AppText>
            <AppText numberOfLines={1} style={{ color: C.muted, fontSize: 12 }}>{current.artist}</AppText>
          </View>
          <Pressable onPress={(e) => { e.stopPropagation?.(); toggle(); }}><Ionicons name={status.playing ? 'pause' : 'play'} size={23} color={C.white} /></Pressable>
        </Pressable>
      )}

      <Modal visible={sortVisible} transparent animationType="fade" onRequestClose={() => setSortVisible(false)}>
        <Pressable onPress={() => setSortVisible(false)} style={{ flex: 1, backgroundColor: '#0009', justifyContent: 'flex-end' }}>
          <Pressable onPress={(event) => event.stopPropagation()} style={{ backgroundColor: C.panel, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, paddingBottom: 32, borderWidth: 1, borderColor: C.line }}>
            <AppText style={{ color: C.white, fontWeight: '800', fontSize: 18, marginBottom: 14 }}>Sort songs</AppText>
            {SORT_OPTIONS.map((option) => (
              <Pressable key={option.id} onPress={() => selectSortOrder(option.id)} style={{ minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Ionicons name={option.icon} size={20} color={sortOrder === option.id ? C.redBright : C.muted} />
                <AppText style={{ color: sortOrder === option.id ? C.redBright : C.white, fontSize: 15, flex: 1 }}>{option.label}</AppText>
                {sortOrder === option.id && <Ionicons name="checkmark" size={20} color={C.redBright} />}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}