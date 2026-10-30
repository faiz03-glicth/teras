import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { capturePicture, savePicture, sharePicture } from '../shareActions';

jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(async () => true) }));
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(async () => true),
  shareAsync: jest.fn(async () => undefined),
}));
jest.mock('expo-media-library', () => ({
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  Asset: { create: jest.fn(async () => ({})) },
}));
jest.mock('react-native-view-shot', () => ({ captureRef: jest.fn(async () => 'file:///cache/card.png') }));

const URI = 'file:///cache/card.png';

beforeEach(() => jest.clearAllMocks());
afterEach(() => jest.restoreAllMocks());

/** Pretends to be an Android phone running API level `api`. */
function android(api: number) {
  jest.replaceProperty(Platform, 'OS', 'android');
  jest.spyOn(Platform, 'Version', 'get').mockReturnValue(api);
}

describe('capturePicture', () => {
  it('captures the card as a PNG in a temporary file, at the full quality', async () => {
    const card = { current: null };

    await expect(capturePicture(card)).resolves.toBe(URI);

    expect(captureRef).toHaveBeenCalledWith(card, { format: 'png', quality: 1, result: 'tmpfile' });
  });
});

describe('sharePicture', () => {
  it('opens the share sheet with the PNG', async () => {
    await expect(sharePicture(URI)).resolves.toBe('shared');

    expect(Sharing.shareAsync).toHaveBeenCalledWith(
      URI,
      expect.objectContaining({ mimeType: 'image/png', UTI: 'public.png' }),
    );
  });

  it('does not try when this phone has no share sheet', async () => {
    jest.mocked(Sharing.isAvailableAsync).mockResolvedValueOnce(false);

    await expect(sharePicture(URI)).resolves.toBe('unavailable');

    expect(Sharing.shareAsync).not.toHaveBeenCalled();
  });
});

describe('savePicture', () => {
  it('asks an iPhone for add-only access, then adds the picture to Photos', async () => {
    await expect(savePicture(URI)).resolves.toBe('saved');

    expect(MediaLibrary.requestPermissionsAsync).toHaveBeenCalledWith(true);
    expect(MediaLibrary.Asset.create).toHaveBeenCalledWith(URI);
  });

  it('saves nothing when the person says no', async () => {
    jest.mocked(MediaLibrary.requestPermissionsAsync).mockResolvedValueOnce({ granted: false } as never);

    await expect(savePicture(URI)).resolves.toBe('denied');

    expect(MediaLibrary.Asset.create).not.toHaveBeenCalled();
  });

  it('does not ask on Android 11 and later, which let an app save its own picture', async () => {
    android(30);

    await expect(savePicture(URI)).resolves.toBe('saved');

    expect(MediaLibrary.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(MediaLibrary.Asset.create).toHaveBeenCalledWith(URI);
  });

  it('asks on Android 10 and earlier, which need the storage permission to save', async () => {
    android(29);

    await expect(savePicture(URI)).resolves.toBe('saved');

    expect(MediaLibrary.requestPermissionsAsync).toHaveBeenCalledWith(true);
  });

  it('lets a failure to write the file through, for the screen to word', async () => {
    jest.mocked(MediaLibrary.Asset.create).mockRejectedValueOnce(new Error('disk full'));

    await expect(savePicture(URI)).rejects.toThrow('disk full');
  });
});
