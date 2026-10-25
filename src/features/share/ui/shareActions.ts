import * as Clipboard from 'expo-clipboard';
import { Asset, requestPermissionsAsync } from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import type { RefObject } from 'react';
import { Platform, type View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

/**
 * What leaves the app: the clipboard, the system share sheet, the Photos library, and the capture that
 * makes the picture. Each is a thin call into its Expo module, kept here so the screen never touches a
 * native module and a test can stand in for the lot.
 */

/** Android 11 (API 30) saves pictures without asking: the app writes only its own file. */
const ANDROID_SAVES_WITHOUT_ASKING = 30;

export async function copyToClipboard(text: string): Promise<void> {
  await Clipboard.setStringAsync(text);
}

/**
 * The card as a PNG file on disk (a temporary one), at the card's own size times the phone's pixel
 * density. Transparent wherever the card has no fill, which is what makes a Clear picture clear.
 */
export function capturePicture(card: RefObject<View | null>): Promise<string> {
  return captureRef(card, { format: 'png', quality: 1, result: 'tmpfile' });
}

export type ShareOutcome = 'shared' | 'unavailable';

/** Opens the system share sheet with the picture; the person picks where it goes (Instagram included). */
export async function sharePicture(uri: string): Promise<ShareOutcome> {
  if (!(await Sharing.isAvailableAsync())) return 'unavailable';
  await Sharing.shareAsync(uri, {
    mimeType: 'image/png',
    UTI: 'public.png',
    dialogTitle: 'Share your workout',
  });
  return 'shared';
}

export type SaveOutcome = 'saved' | 'denied';

/** Whether this phone has to be asked before a picture is added to Photos. */
function mustAskToSave(): boolean {
  return Platform.OS !== 'android' || Number(Platform.Version) < ANDROID_SAVES_WITHOUT_ASKING;
}

/**
 * Adds the picture to Photos. Asks for add-only access (never to read the library), and only now, the
 * first time the person saves. A refusal is an outcome, not an error: the screen says so in words.
 */
export async function savePicture(uri: string): Promise<SaveOutcome> {
  if (mustAskToSave()) {
    const permission = await requestPermissionsAsync(true);
    if (!permission.granted) return 'denied';
  }
  await Asset.create(uri);
  return 'saved';
}
