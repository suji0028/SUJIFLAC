import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requireOptionalNativeModule } from 'expo-modules-core';

const AUDIO_EXT = /\.(mp3|m4a|aac|wav|flac|ogg|opus|wma|aiff|alac)$/i;
const FOLDER_KEY = 'localbeats.folderUri';
const SONGS_KEY = 'localbeats.songs.v5';
const SORT_KEY = 'localbeats.sortOrder';
const AudioMetadata = requireOptionalNativeModule('LocalBeatsAudioMetadata');

const filenameTitle = (name) =>
  name.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').trim() || 'Unknown title';

function fileNameFromUri(uri) {
  const encodedName = uri.split('/').pop() || '';
  const documentId = decodeURIComponent(encodedName);
  return documentId.split('/').pop() || 'Unknown title';
}

async function songFromFile(file, onMetadataError) {
  const name = file.name || 'Unknown title';
  let metadata = null;
  if (AudioMetadata) {
    try {
      metadata = await AudioMetadata.getMetadata(file.uri);
    } catch {
      onMetadataError();
    }
  }

  const title = metadata?.title?.trim();
  const artist = metadata?.artist?.trim();
  const album = metadata?.album?.trim();
  return {
    id: file.uri,
    uri: file.uri,
    fileName: name,
    title: title || filenameTitle(name),
    artist: artist || 'Unknown artist',
    album: album || 'Unknown album',
    albumArtist: metadata?.albumArtist?.trim() || artist || 'Unknown artist',
    genre: metadata?.genre?.trim() || '',
    year: metadata?.year?.trim() || '',
    trackNumber: metadata?.trackNumber || null,
    duration: metadata?.duration || 0,
    artworkUri: metadata?.artworkUri || null,
    artworkChecked: Boolean(metadata),
    sizeBytes: metadata?.sizeBytes || 0,
    metadataStatus: title || artist || album ? 'embedded' : 'filename-fallback'
  };
}

export async function refreshSongArtwork(song) {
  if (!AudioMetadata) {
    throw new Error('Audio metadata reader is not available. Rebuild and reinstall the Android app.');
  }

  const metadata = await AudioMetadata.getMetadata(song.uri);
  const updatedSong = {
    ...song,
    artworkUri: metadata?.artworkUri || song.artworkUri || null,
    artworkChecked: true
  };
  const cachedSongs = await loadCachedSongs();
  const updatedCache = cachedSongs.map((cachedSong) =>
    cachedSong.id === updatedSong.id ? { ...cachedSong, ...updatedSong } : cachedSong
  );
  if (!updatedCache.some((cachedSong) => cachedSong.id === updatedSong.id)) {
    updatedCache.push(updatedSong);
  }
  await AsyncStorage.setItem(SONGS_KEY, JSON.stringify(updatedCache));
  return updatedSong;
}

export async function chooseMusicFolder() {
  const result = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!result.granted) return null;
  await AsyncStorage.setItem(FOLDER_KEY, result.directoryUri);
  return result.directoryUri;
}

export async function getSavedFolder() {
  return AsyncStorage.getItem(FOLDER_KEY);
}

export async function loadCachedSongs() {
  try {
    return JSON.parse((await AsyncStorage.getItem(SONGS_KEY)) || '[]');
  } catch {
    return [];
  }
}

export async function loadSortOrder() {
  return (await AsyncStorage.getItem(SORT_KEY)) || 'alphabetical';
}

export async function saveSortOrder(sortOrder) {
  await AsyncStorage.setItem(SORT_KEY, sortOrder);
}

export async function scanFolder(folderUri, onProgress = () => {}) {
  if (!AudioMetadata) {
    console.warn('Audio metadata reader is unavailable. Rebuild and reinstall the Android app to read embedded tags.');
  }

  const files = [];
  const visited = new Set();

  async function walk(uri) {
    if (visited.has(uri)) return;
    visited.add(uri);

    let entries;
    try {
      entries = await FileSystem.StorageAccessFramework.readDirectoryAsync(uri);
    } catch {
      return;
    }

    for (const entryUri of entries) {
      let name;
      try {
        name = fileNameFromUri(entryUri);
      } catch (error) {
        console.warn('Could not decode a folder entry name', error);
        continue;
      }

      if (AUDIO_EXT.test(name)) {
        files.push({ uri: entryUri, name });
      } else {
        try {
          const children = await FileSystem.StorageAccessFramework.readDirectoryAsync(entryUri);
          if (children) await walk(entryUri);
        } catch {}
      }
    }
  }

  await walk(folderUri);
  const found = new Array(files.length);
  const cachedById = new Map((await loadCachedSongs()).map((song) => [song.id, song]));
  let nextFile = 0;
  let completed = 0;
  let metadataFailures = 0;

  async function processFiles() {
    while (nextFile < files.length) {
      const fileIndex = nextFile++;
      found[fileIndex] = await songFromFile(files[fileIndex], () => {
        metadataFailures += 1;
      });
      const previous = cachedById.get(files[fileIndex].uri);
      found[fileIndex].addedAt = previous?.addedAt || Date.now();
      completed += 1;
      onProgress(completed);
    }
  }

  await Promise.all(Array.from({ length: Math.min(6, files.length) }, processFiles));
  if (metadataFailures) {
    console.warn(`Embedded metadata could not be read for ${metadataFailures} audio file(s); filename fallbacks were used.`);
  }
  found.sort((a, b) => a.title.localeCompare(b.title));
  await AsyncStorage.setItem(SONGS_KEY, JSON.stringify(found));
  return found;
}