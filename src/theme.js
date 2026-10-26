export const C = {
  bg: '#5B0808',
  panel: '#0A0808',
  panel2: '#160B0B',
  red: '#080606',
  redBright: '#B12D35',
  white: '#F7EDED',
  muted: '#C19A9A',
  line: '#391212'
};

export const FONT_FAMILY = 'monospace';

export const formatTime = (seconds = 0) => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

export const albumKeyFor = (song) =>
  `${song.album || 'Unknown Album'}::${song.artist || 'Unknown Artist'}`;