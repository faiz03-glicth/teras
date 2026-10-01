import { requireOptionalNativeModule } from 'expo';
import type { AudioPlayer } from 'expo-audio';

import { useSoundPreferencesStore } from '../state/soundPreferencesStore';

type ExpoAudio = typeof import('expo-audio');

/** Every sound effect, by meaning. Files live in assets/sounds. */
const SOURCES = {
  /**
   * The login mark tossed like a coin: the flick as the flip starts, the spin, the catch as it lands, then a
   * wooden clack as each diagonal of its new face stacks in.
   */
  logoFlip: require('../../../assets/sounds/logo-flip.wav') as number,
  /** The Welcome heatmap collapsing: wooden blocks falling, one impact per row (see heatmapRebuild). */
  heatmapCollapse: require('../../../assets/sounds/heatmap-collapse.wav') as number,
  /** The Welcome heatmap stacking itself back up: a wooden clack on each heard landing. */
  heatmapStack: require('../../../assets/sounds/heatmap-stack.wav') as number,
  /** A page of the onboarding pager settling into place: one wooden block set down. */
  pageClack: require('../../../assets/sounds/page-clack.wav') as number,
  /** A date crossing the date picker's centre: one small, dry wooden tick (quiet: it repeats as you scroll). */
  dateTick: require('../../../assets/sounds/date-tick.wav') as number,
} as const;
export type SoundName = keyof typeof SOURCES;

/** Effects sit under whatever else is playing, never over it. */
const VOLUME = 0.6;

let audio: ExpoAudio | null | undefined;
const players = new Map<SoundName, AudioPlayer>();

/**
 * expo-audio, once. A development build made before expo-audio was added has no native audio module, and
 * importing the library would crash there; so it is only loaded when the module exists (otherwise sounds
 * are simply silent until the next build).
 */
function loadAudio(): ExpoAudio | null {
  if (audio !== undefined) return audio;
  audio = requireOptionalNativeModule('ExpoAudio')
    ? // eslint-disable-next-line @typescript-eslint/no-require-imports -- deliberately lazy, see above
      (require('expo-audio') as ExpoAudio)
    : null;
  // Interface sounds: silent when the phone is on silent, and never pause the person's music.
  audio
    ?.setAudioModeAsync({
      playsInSilentMode: false,
      interruptionMode: 'mixWithOthers',
      shouldPlayInBackground: false,
    })
    .catch(() => undefined);
  return audio;
}

function playerFor(name: SoundName): AudioPlayer | null {
  const existing = players.get(name);
  if (existing) return existing;
  const lib = loadAudio();
  if (!lib) return null;
  const player = lib.createAudioPlayer(SOURCES[name]);
  player.volume = VOLUME;
  // Kept for the app's lifetime: each effect is tiny and replayed often. Unless its file fails to load
  // (a development build streams it from the dev server, which may be restarting): a failed player never
  // plays again, so it is released and the next play loads the file afresh.
  const subscription = player.addListener('playbackStatusUpdate', (status) => {
    if (!status.error) return;
    subscription.remove();
    if (players.get(name) === player) players.delete(name);
    player.remove();
  });
  players.set(name, player);
  return player;
}

/** Sound effects are feedback, never required: any failure (no audio module, no output) is ignored. */
export const sounds = {
  /** Loads an effect ahead of time, so its first play starts on cue. */
  preload(name: SoundName): void {
    try {
      playerFor(name);
    } catch {
      // Feedback only.
    }
  },
  /** Plays an effect from the start (restarting it if it's already playing), unless sounds are off. */
  play(name: SoundName): void {
    if (!useSoundPreferencesStore.getState().soundEffects) return;
    try {
      const player = playerFor(name);
      if (!player) return;
      void player.seekTo(0);
      player.play();
    } catch {
      // Feedback only.
    }
  },
};
