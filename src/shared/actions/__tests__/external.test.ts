import * as WebBrowser from 'expo-web-browser';
import { toast } from 'sonner-native';

import { openHelpCenter, openLegal, rateApp, sendFeedback } from '../external';

jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn(async () => ({ type: 'opened' })) }));
jest.mock('../../lib/links', () => ({
  links: {
    legal: (doc: string) => `https://teras.example.com/${doc}`,
    helpCenter: () => 'https://teras.example.com/help',
  },
}));

const openBrowser = jest.mocked(WebBrowser.openBrowserAsync);

beforeEach(() => jest.clearAllMocks());

describe('external actions', () => {
  it('opens legal documents and the help center in the in-app browser', async () => {
    await openLegal('terms');
    await openLegal('privacy');
    await openHelpCenter();
    expect(openBrowser.mock.calls).toEqual([
      ['https://teras.example.com/terms'],
      ['https://teras.example.com/privacy'],
      ['https://teras.example.com/help'],
    ]);
  });

  it('tells the person when the page cannot open', async () => {
    openBrowser.mockRejectedValueOnce(new Error('no browser'));
    await openLegal('acknowledgements');
    expect(toast.info).toHaveBeenCalledWith("Couldn't open the page", expect.anything());
  });

  it('sends feedback through the help center, and says rating is not available yet', async () => {
    await sendFeedback();
    expect(openBrowser).toHaveBeenLastCalledWith('https://teras.example.com/help');
    await rateApp();
    expect(toast.info).toHaveBeenCalledWith('Rating isn’t available yet', expect.anything());
  });
});
