import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';

import { useAuthStore } from '@/features/auth/state/authStore';
import { useTrainingPreferencesStore } from '@/features/training/state/trainingPreferencesStore';
import type { MuscleSetRow, Workout } from '@/features/workouts/data/WorkoutRepository';
import * as actions from '@/shared/actions';
import { createFakeRepositories, testUser } from '@test/fakes/fakeRepositories';
import { pushDay } from '@test/fakes/shareWorkout';
import { createWrapper } from '@test/providers';
import { renderInScheme, styleOf } from '@test/render';

import { copyText } from '../../domain/copyText';
import { buildShareModel } from '../../domain/shareModel';
import { CARD_LOOKS } from '../cardLooks';
import { ShareSheet } from '../ShareSheet';
import { SHARE_MESSAGES } from '../useShareViewModel';

jest.mock('@/shared/actions', () => require('@test/mocks/navigationActions'));
// Friday 2 October 2026.
jest.mock('@/shared/lib/date/useToday', () => ({ useToday: () => '2026-10-02' }));
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(async () => true) }));
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(async () => true),
  shareAsync: jest.fn(async () => undefined),
}));
jest.mock('expo-media-library', () => ({
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  Asset: { create: jest.fn(async () => ({})) },
}));
jest.mock('react-native-view-shot', () => ({ captureRef: jest.fn(async () => 'file:///cache/share.png') }));

// Whole sheets render slowly when the full suite runs in parallel.
jest.setTimeout(15_000);

const PICTURE = 'file:///cache/share.png';
const initialAuth = useAuthStore.getState();
/** The drawing and the words on the card are one picture to a screen reader, so they are hidden from it. */
const hidden = { includeHiddenElements: true } as const;

const muscleRows: MuscleSetRow[] = [
  { workoutId: 'w1', date: '2026-10-02', primaryMuscle: 'chest', secondaryMuscles: ['triceps'], doneSets: 3 },
  { workoutId: 'other', date: '2026-10-02', primaryMuscle: 'quads', secondaryMuscles: [], doneSets: 3 },
];

type Repositories = ReturnType<typeof createFakeRepositories>;

function share(
  id: string | null = 'w1',
  { workout = pushDay() as Workout | null, prepare = (_: Repositories) => undefined as void } = {},
) {
  const repositories = createFakeRepositories();
  repositories.workouts.logged.mockResolvedValue(workout);
  repositories.workouts.newRecords.mockResolvedValue([
    { exerciseId: 'bench-press-barbell', name: 'Bench Press (Barbell)', type: 'weighted', value: 62.5 },
  ]);
  repositories.workouts.muscleSets.mockResolvedValue(muscleRows);
  prepare(repositories);
  const { Wrapper } = createWrapper(repositories);
  const view = renderInScheme(<ShareSheet id={id} />, 'dark', { wrapper: Wrapper });
  return { ...view, repositories };
}

/** The same model the sheet builds, to compare its text with. */
const expectedModel = () =>
  buildShareModel({
    workout: pushDay(),
    unit: 'kg',
    today: '2026-10-02' as never,
    records: new Set(['bench-press-barbell']),
    muscleRows,
  });

const ready = () => screen.findByTestId('share-card', hidden);
const pick = (name: string) => fireEvent.press(screen.getByRole('radio', { name }));
const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));

beforeEach(() => {
  jest.clearAllMocks();
  act(() => {
    useAuthStore.setState({ ...initialAuth, status: 'signedIn', user: testUser() }, true);
    useTrainingPreferencesStore.setState({ unit: 'kg' });
  });
});

describe('the share sheet', () => {
  it('shows the workout as a picture, named for a screen reader by what it says', async () => {
    share();

    const card = await ready();
    expect(card.props.accessibilityLabel).toBe('Workout picture: Push Day, 62 min, 3,095 kg, 10 sets');
    expect(screen.getByText('Push Day · Fri, 2 Oct')).toBeTruthy();
  });

  it('opens on Summary over a Clear background: three big numbers and the Teras mark', async () => {
    share();
    await ready();

    expect(screen.getByRole('radio', { name: 'Summary' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Clear' })).toBeChecked();
    expect(screen.getByTestId('share-card-summary', hidden)).toBeTruthy();
    for (const text of ['62', 'min', '3,095', 'kg', '10', 'sets', 'TERAS']) {
      expect(screen.getAllByText(text, hidden).length).toBeGreaterThan(0);
    }
    expect(screen.getByText('BACKGROUND · SAVES AS A TRANSPARENT PNG')).toBeTruthy();
  });

  it('shows the numbers in pounds when that is the unit', async () => {
    act(() => useTrainingPreferencesStore.setState({ unit: 'lb' }));
    share();
    await ready();

    expect(screen.getByText('6,823', hidden)).toBeTruthy();
    expect(screen.getByText('lb', hidden)).toBeTruthy();
  });

  it('draws one card, and makes no picture until a key needs it', async () => {
    share();
    await ready();

    pick('Lifts');
    pick('Black');
    pick('Muscles');

    expect(screen.getAllByTestId('share-card', hidden)).toHaveLength(1);
    expect(captureRef).not.toHaveBeenCalled();
  });
});

describe('the layout picker', () => {
  it('switches the picture to the three best lifts, records first', async () => {
    share();
    await ready();

    pick('Lifts');

    expect(screen.getByRole('radio', { name: 'Lifts' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Summary' })).not.toBeChecked();
    expect(screen.queryByTestId('share-card-summary', hidden)).toBeNull();
    expect(screen.getByTestId('share-card-lifts', hidden)).toBeTruthy();
    // The bench press set a record, so it leads; then the pull-up and the lateral raise by strength.
    expect(
      within(screen.getByTestId('share-card-lifts', hidden))
        .getAllByText(/ × |reps/, hidden)
        .map((node) => node.props.children),
    ).toEqual(['62.5 kg × 6', '12 reps', '10 kg × 12']);
    expect(screen.getByText('Bench Press (Barbell)', hidden)).toBeTruthy();
    expect(screen.queryByText('Plank', hidden)).toBeNull();
    expect((await ready()).props.accessibilityLabel).toContain(
      'best lifts: Bench Press (Barbell) 62.5 kg × 6',
    );
  });

  it("switches the picture to the muscles this workout worked, and only this workout's", async () => {
    share();
    await ready();

    pick('Muscles');

    expect(screen.getByRole('radio', { name: 'Muscles' })).toBeChecked();
    expect(screen.getByTestId('share-body-front', hidden)).toBeTruthy();
    expect(screen.getByTestId('share-body-back', hidden)).toBeTruthy();
    // Chest is a main mover (front), triceps only helped (back); the quads belong to another workout.
    const fill = (region: string) => screen.getByTestId(`share-region-${region}`, hidden).props.fill;
    expect(fill('pectorals')).not.toEqual(fill('quadriceps'));
    expect(fill('triceps')).not.toEqual(fill('quadriceps'));
    expect(fill('triceps')).not.toEqual(fill('pectorals'));
    expect(fill('quadriceps')).toEqual(fill('abdomen'));
    expect((await ready()).props.accessibilityLabel).toBe('Workout picture: Push Day, muscles worked: Chest');
  });
});

describe('the background picker', () => {
  it("switches to Black: the app's black card, with no checkerboard behind it", async () => {
    share();
    expect(await screen.findByTestId('share-checkerboard', hidden)).toBeTruthy();

    pick('Black');

    expect(screen.getByRole('radio', { name: 'Black' })).toBeChecked();
    expect(styleOf(await ready()).backgroundColor).toBe('#161616');
    expect(screen.queryByTestId('share-checkerboard', hidden)).toBeNull();
    expect(screen.getByText('BACKGROUND')).toBeTruthy();
  });

  it('switches to Parchment', async () => {
    share();
    await ready();

    pick('Parchment');

    expect(styleOf(screen.getByTestId('share-card', hidden)).backgroundColor).toBe(CARD_LOOKS.parchment.fill);
  });

  it('leaves Clear with no fill, on a checkerboard, with a soft shadow under white words', async () => {
    share();

    const card = await ready();
    expect(styleOf(card).backgroundColor).toBe('transparent');
    expect(screen.getByTestId('share-checkerboard', hidden)).toBeTruthy();
    expect(styleOf(screen.getByTestId('share-card-title', hidden))).toMatchObject({
      color: '#FFFFFF',
      textShadowRadius: 8,
    });
  });

  it('keeps the card at the size of a Story whatever the look', async () => {
    share();
    await ready();

    for (const name of ['Black', 'Parchment', 'Clear']) {
      pick(name);
      expect(styleOf(screen.getByTestId('share-card', hidden))).toMatchObject({ width: 360, height: 640 });
    }
  });
});

describe('Copy text', () => {
  it('puts the plain-text summary on the clipboard and says so', async () => {
    share();
    await ready();

    press('Copy text');

    await waitFor(() => expect(Clipboard.setStringAsync).toHaveBeenCalledWith(copyText(expectedModel())));
    expect(await screen.findByText('Copied to clipboard')).toBeTruthy();
    expect(screen.getByTestId('share-result')).toHaveTextContent(SHARE_MESSAGES.copied);
  });

  it('shows that same text beforehand', async () => {
    share();
    await ready();

    expect(screen.getByTestId('share-text-preview')).toHaveTextContent(
      /Bench Press \(Barbell\): 3 sets, best 62.5 kg × 6 \(new record\)/,
    );
    expect(screen.getByTestId('share-text-preview')).toHaveTextContent(/Logged with Teras$/);
  });

  it('says so when the text could not be copied', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.mocked(Clipboard.setStringAsync).mockRejectedValueOnce(new Error('denied'));
    share();
    await ready();

    press('Copy text');

    expect(await screen.findByText(SHARE_MESSAGES.copyFailed)).toBeTruthy();
    error.mockRestore();
  });
});

describe('Save image', () => {
  it('makes a PNG, asks for add-only access to Photos, saves it, and says it is transparent', async () => {
    share();
    await ready();

    press('Save image');

    expect(await screen.findByText('Saved to Photos · transparent PNG')).toBeTruthy();
    expect(captureRef).toHaveBeenCalledWith(
      expect.objectContaining({ current: expect.anything() }),
      expect.objectContaining({ format: 'png', result: 'tmpfile' }),
    );
    expect(MediaLibrary.requestPermissionsAsync).toHaveBeenCalledWith(true);
    expect(MediaLibrary.Asset.create).toHaveBeenCalledWith(PICTURE);
  });

  it('does not call a Black picture transparent', async () => {
    share();
    await ready();
    pick('Black');

    press('Save image');

    expect(await screen.findByText('Saved to Photos')).toBeTruthy();
    expect(screen.queryByText(/transparent PNG$/)).toBeNull();
  });

  it('clears the last result when the look changes, since it was about the old picture', async () => {
    share();
    await ready();
    press('Save image');
    await screen.findByText('Saved to Photos · transparent PNG');

    pick('Parchment');

    expect(screen.getByTestId('share-result')).not.toHaveTextContent('Saved to Photos');
  });

  it('says why, in words, when the person has not allowed Photos, and saves nothing', async () => {
    jest.mocked(MediaLibrary.requestPermissionsAsync).mockResolvedValueOnce({ granted: false } as never);
    share();
    await ready();

    press('Save image');

    expect(await screen.findByText(SHARE_MESSAGES.denied)).toBeTruthy();
    expect(MediaLibrary.Asset.create).not.toHaveBeenCalled();
  });

  it('does not ask for Photos until Save is tapped', async () => {
    share();
    await ready();

    pick('Lifts');
    press('Copy text');
    await screen.findByText('Copied to clipboard');

    expect(MediaLibrary.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('says so when the picture could not be made or saved', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.mocked(captureRef).mockRejectedValueOnce(new Error('blank'));
    share();
    await ready();

    press('Save image');

    expect(await screen.findByText(SHARE_MESSAGES.saveFailed)).toBeTruthy();
    expect(MediaLibrary.Asset.create).not.toHaveBeenCalled();
    error.mockRestore();
  });
});

describe('Share', () => {
  it("opens the phone's share sheet with the PNG", async () => {
    share();
    await ready();

    press('Share');

    await waitFor(() =>
      expect(Sharing.shareAsync).toHaveBeenCalledWith(
        PICTURE,
        expect.objectContaining({ mimeType: 'image/png', UTI: 'public.png' }),
      ),
    );
    expect(captureRef).toHaveBeenCalledTimes(1);
  });

  it('says so when this phone cannot share', async () => {
    jest.mocked(Sharing.isAvailableAsync).mockResolvedValueOnce(false);
    share();
    await ready();

    press('Share');

    expect(await screen.findByText(SHARE_MESSAGES.shareUnavailable)).toBeTruthy();
    expect(Sharing.shareAsync).not.toHaveBeenCalled();
  });

  it('says so when the share sheet could not be opened', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.mocked(Sharing.shareAsync).mockRejectedValueOnce(new Error('no activity'));
    share();
    await ready();

    press('Share');

    expect(await screen.findByText(SHARE_MESSAGES.shareFailed)).toBeTruthy();
    error.mockRestore();
  });

  it("is labelled Share, not Instagram: the phone's sheet decides where it goes", async () => {
    share();
    await ready();

    expect(screen.queryByRole('button', { name: /instagram/i })).toBeNull();
    expect(screen.getByRole('button', { name: 'Share' })).toBeTruthy();
  });
});

describe('when there is no workout to share', () => {
  it('says the workout was not found for a link to nothing', async () => {
    share('w1', { workout: null });

    expect(await screen.findByText('Workout not found')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Share' })).toBeNull();
  });

  it('says the same for an id that cannot be one', async () => {
    const { repositories } = share(null);

    expect(await screen.findByText('Workout not found')).toBeTruthy();
    expect(repositories.workouts.logged).not.toHaveBeenCalled();
  });

  it('does not share a workout that has not finished', async () => {
    share('w1', { workout: pushDay({ endedAt: null }) });

    expect(await screen.findByText('Workout not found')).toBeTruthy();
  });

  it('offers to try again when the workout could not be read', async () => {
    const { repositories } = share('w1', {
      prepare: (fakes) => fakes.workouts.logged.mockRejectedValueOnce(new Error('disk')),
    });

    fireEvent.press(await screen.findByRole('button', { name: 'Retry' }));

    await ready();
    expect(repositories.workouts.logged).toHaveBeenCalledTimes(2);
  });

  it('still makes the picture when the records and muscles could not be read', async () => {
    share('w1', {
      prepare: (fakes) => {
        fakes.workouts.newRecords.mockRejectedValue(new Error('disk'));
        fakes.workouts.muscleSets.mockRejectedValue(new Error('disk'));
      },
    });

    expect((await ready()).props.accessibilityLabel).toContain('Push Day');
    pick('Muscles');
    expect(screen.getByTestId('share-body', hidden)).toBeTruthy();
  });
});

describe('closing', () => {
  it('goes back', async () => {
    share();
    await ready();

    fireEvent.press(screen.getByRole('button', { name: 'Close' }));

    expect(actions.goBack).toHaveBeenCalled();
  });
});
