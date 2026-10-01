/*
 * Each test loads `sounds` fresh, with the native audio module present or not: a development build made
 * before expo-audio was added has no module, and the app must stay silent there instead of crashing.
 */
type Sounds = typeof import('../sounds').sounds;

function loadSounds({ nativeModule, enabled = true }: { nativeModule: boolean; enabled?: boolean }) {
  type Status = { error: string | null };
  const player = {
    volume: 1,
    seekTo: jest.fn(async () => undefined),
    play: jest.fn(),
    remove: jest.fn(),
    addListener: jest.fn((_event: 'playbackStatusUpdate', _listener: (status: Status) => void) => ({
      remove: jest.fn(),
    })),
  };
  /** A status update from the native player, to the listener the sounds service registered last. */
  const emitStatus = (status: Status) => player.addListener.mock.calls.at(-1)?.[1](status);
  const audio = {
    createAudioPlayer: jest.fn(() => player),
    setAudioModeAsync: jest.fn(async () => undefined),
  };
  let sounds!: Sounds;
  jest.isolateModules(() => {
    jest.doMock('expo', () => ({ requireOptionalNativeModule: () => (nativeModule ? {} : null) }));
    jest.doMock('expo-audio', () => audio);
    require('@/shared/state/soundPreferencesStore').useSoundPreferencesStore.setState({
      soundEffects: enabled,
    });
    sounds = require('../sounds').sounds;
  });
  return { sounds, audio, player, emitStatus };
}

afterEach(() => {
  jest.dontMock('expo');
  jest.dontMock('expo-audio');
  // `sounds` requires expo-audio lazily (at its first play), outside isolateModules: without a reset, every
  // later test would get the first test's mock.
  jest.resetModules();
});

describe('sounds', () => {
  it('stay silent (and never load expo-audio) on a build without the audio module', () => {
    const { sounds, audio } = loadSounds({ nativeModule: false });
    expect(() => sounds.play('logoFlip')).not.toThrow();
    expect(audio.createAudioPlayer).not.toHaveBeenCalled();
  });

  it('play from the start, quietly, without pausing other audio or ignoring the silent switch', () => {
    const { sounds, audio, player } = loadSounds({ nativeModule: true });
    sounds.preload('logoFlip');
    expect(audio.setAudioModeAsync).toHaveBeenCalledWith(
      expect.objectContaining({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }),
    );
    expect(player.volume).toBeLessThan(1);

    sounds.play('logoFlip');
    sounds.play('logoFlip');
    // One player, reused and restarted each time.
    expect(audio.createAudioPlayer).toHaveBeenCalledTimes(1);
    expect(player.seekTo).toHaveBeenCalledWith(0);
    expect(player.play).toHaveBeenCalledTimes(2);
  });

  it('stay silent when the person has turned sound effects off in settings', () => {
    const { sounds, player } = loadSounds({ nativeModule: true, enabled: false });
    sounds.play('logoFlip');
    expect(player.play).not.toHaveBeenCalled();
  });

  it('load an effect again after its file failed to load, instead of staying silent', () => {
    const { sounds, audio, player, emitStatus } = loadSounds({ nativeModule: true });
    sounds.preload('logoFlip');
    emitStatus({ error: null });
    expect(player.remove).not.toHaveBeenCalled();

    // E.g. the dev server was restarting when the file was requested.
    emitStatus({ error: 'Source error' });
    expect(player.remove).toHaveBeenCalledTimes(1);

    sounds.play('logoFlip');
    expect(audio.createAudioPlayer).toHaveBeenCalledTimes(2);
    expect(player.play).toHaveBeenCalledTimes(1);
  });

  it('are feedback only: a failing player is ignored', () => {
    const { sounds, player } = loadSounds({ nativeModule: true });
    player.play.mockImplementation(() => {
      throw new Error('no output');
    });
    expect(() => sounds.play('logoFlip')).not.toThrow();
  });
});
