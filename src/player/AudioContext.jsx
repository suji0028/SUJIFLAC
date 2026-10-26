import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { createAudioPlayer, setAudioModeAsync, useAudioPlayerStatus } from 'expo-audio';
import { refreshSongArtwork } from '../library';
import { C } from '../theme';

const AudioContext = createContext(null);
const player = createAudioPlayer(null);

export function AudioProvider({ children }) {
  const [queue, setQueue] = useState([]);
  const [index, setIndex] = useState(-1);
  const [playRequest, setPlayRequest] = useState(0);
  const current = queue[index] || null;
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix'
    }).catch(console.warn);
  }, []);

  useEffect(() => {
    if (!current) return;
    player.replace(current.uri);
    player.play();
  }, [current?.id, playRequest, player]);

  useEffect(() => {
    if (!current) return;
    player.setActiveForLockScreen(true, {
      title: current.title || 'Unknown title',
      artist: current.artist || 'Unknown artist',
      albumTitle: current.album || 'Unknown album',
      ...(current.artworkUri ? { artworkUrl: current.artworkUri } : {})
    }, { showNextTrack: true, showPreviousTrack: true });
  }, [current?.id, current?.title, current?.artist, current?.album, current?.artworkUri, player]);

  useEffect(() => {
    if (status.didJustFinish && queue.length) next();
  }, [status.didJustFinish]);

  const playSong = (song, list = queue) => {
    const nextQueue = list?.length ? list : [song];
    let nextIndex = nextQueue.findIndex((item) => item.id === song.id);
    if (nextIndex < 0) {
      setQueue([song]);
      setIndex(0);
    } else {
      setQueue(nextQueue);
      setIndex(nextIndex);
    }
    setPlayRequest((request) => request + 1);

    if (!song.artworkUri) {
      refreshSongArtwork(song)
        .then((updatedSong) => {
          setQueue((queueItems) =>
            queueItems.map((queueSong) =>
              queueSong.id === updatedSong.id ? { ...queueSong, ...updatedSong } : queueSong
            )
          );
        })
        .catch((error) => console.warn(`Could not load album art for ${song.title}`, error));
    }
  };

  const next = () => {
    if (!queue.length) return;
    const nextIndex = (index + 1) % queue.length;
    if (queue[nextIndex]?.id === current?.id) {
      setPlayRequest((request) => request + 1);
    } else {
      setIndex(nextIndex);
    }
  };

  const previous = () => {
    if (!queue.length) return;
    if ((status.currentTime || 0) > 3) {
      player.seekTo(0);
      return;
    }
    const previousIndex = (index - 1 + queue.length) % queue.length;
    if (queue[previousIndex]?.id === current?.id) {
      setPlayRequest((request) => request + 1);
    } else {
      setIndex(previousIndex);
    }
  };

  const value = useMemo(() => ({
    queue, setQueue, index, current, player, status,
    playSong, next, previous,
    toggle: () => status.playing ? player.pause() : player.play(),
    seek: (seconds) => player.seekTo(seconds),
  }), [queue, index, current, status, player]);

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
}

export const useAudio = () => {
  const value = useContext(AudioContext);
  if (!value) throw new Error('useAudio must be used inside AudioProvider');
  return value;
};