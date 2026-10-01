import * as WebBrowser from 'expo-web-browser';

import { links } from '../lib/links';
import { showInfo } from '../ui/toast';
import type { LegalDoc } from './types';

async function openInAppBrowser(url: string): Promise<void> {
  try {
    await WebBrowser.openBrowserAsync(url);
  } catch {
    showInfo({ title: "Couldn't open the page", sub: 'Check your connection and try again.' });
  }
}

/** Terms, Privacy Policy and Acknowledgements; shared by the Login footer, Data & privacy and About. */
export function openLegal(doc: LegalDoc): Promise<void> {
  return openInAppBrowser(links.legal(doc));
}

/** Shared by Profile → Help & feedback and About → Help center. */
export function openHelpCenter(): Promise<void> {
  return openInAppBrowser(links.helpCenter());
}

/** About → Send feedback: the help center, where feedback reaches the team. */
export function sendFeedback(): Promise<void> {
  return openHelpCenter();
}

/** About → Rate: there's no store listing to rate yet, and it says so rather than pretending. */
export async function rateApp(): Promise<void> {
  showInfo({ title: 'Rating isn’t available yet', sub: 'You can rate Teras once it’s in the app stores.' });
}
