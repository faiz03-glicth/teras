import { useCallback, useMemo, useRef, useState, type RefObject } from 'react';
import { AccessibilityInfo, type View } from 'react-native';

import { useMuscleSets } from '@/features/muscles/hooks/useMuscleSets';
import { useTrainingPreferencesStore } from '@/features/training/state/trainingPreferencesStore';
import {
  useLoggedWorkout,
  useNewRecords,
  useWorkoutOwner,
} from '@/features/workouts/hooks/useWorkoutQueries';
import { goBack } from '@/shared/actions';
import { useToday } from '@/shared/lib/date/useToday';
import { haptics } from '@/shared/lib/haptics';

import { copyText } from '../domain/copyText';
import { buildShareModel } from '../domain/shareModel';
import { SHARE_LAYOUTS, SHARE_LOOKS, type ShareLayout, type ShareLook } from '../domain/types';
import { capturePicture, copyToClipboard, savePicture, sharePicture } from './shareActions';

/** What each key says when it is done, or why it could not be. */
export const SHARE_MESSAGES = {
  copied: 'Copied to clipboard',
  savedClear: 'Saved to Photos · transparent PNG',
  saved: 'Saved to Photos',
  denied: "Teras can't save to Photos without permission. Turn it on in your phone's Settings.",
  copyFailed: "Couldn't copy the text. Try again.",
  saveFailed: "Couldn't save the picture. Try again.",
  shareFailed: "Couldn't open the share sheet. Try again.",
  shareUnavailable: "Sharing isn't available on this phone.",
} as const;

export type ShareKey = 'copy' | 'save' | 'share';

/** The line under the keys: what the last tap did. `problem` when it did not work. */
export interface ShareResult {
  message: string;
  problem: boolean;
}

/**
 * Share a workout: the finished workout, worded; the look and layout the person picks; and the three ways
 * out (copy the text, save the picture, open the share sheet). The picture is only captured when a key
 * needs it, and every key reports in words under the keys, since a toast would not reach a screen reader
 * the same way. The sheet owns the ref to the card (a view model that held it would make every read of the
 * view model look like a read of a ref); the keys capture it when tapped.
 */
export function useShareViewModel(id: string | null, card: RefObject<View | null>) {
  const owner = useWorkoutOwner();
  const today = useToday();
  const unit = useTrainingPreferencesStore((state) => state.unit);
  const query = useLoggedWorkout(owner, id);
  // Only a finished workout has a picture to make.
  const workout = query.data && query.data.endedAt !== null ? query.data : null;
  const records = useNewRecords(owner, id);
  const day = workout?.date ?? today;
  const muscles = useMuscleSets(day, day, workout !== null);

  const [layout, setLayout] = useState<ShareLayout>('summary');
  const [look, setLook] = useState<ShareLook>('clear');
  const [busy, setBusy] = useState<ShareKey | null>(null);
  const [result, setResult] = useState<ShareResult | null>(null);
  // Read synchronously, so two quick taps before the screen redraws still start one job.
  const working = useRef(false);

  const model = useMemo(
    () =>
      workout
        ? buildShareModel({
            workout,
            unit,
            today,
            records: new Set((records.data ?? []).map((record) => record.exerciseId)),
            muscleRows: muscles.data ?? [],
          })
        : null,
    [muscles.data, records.data, today, unit, workout],
  );

  // Records and muscles only decorate the picture: if either could not be read, it is made without them.
  const status =
    id === null
      ? ('missing' as const)
      : query.isError
        ? ('error' as const)
        : query.isPending
          ? ('loading' as const)
          : workout === null
            ? ('missing' as const)
            : records.isPending || muscles.isPending
              ? ('loading' as const)
              : ('ready' as const);

  const { refetch } = query;
  const onRetry = useCallback(() => void refetch(), [refetch]);

  const report = useCallback((message: string, problem = false) => {
    setResult({ message, problem });
    void AccessibilityInfo.announceForAccessibility(message);
  }, []);

  // The key that is working is the only one pressed: a second tap on any key waits for the first.
  const run = useCallback(
    async (key: ShareKey, work: () => Promise<void>, failed: string) => {
      if (working.current) return;
      working.current = true;
      setBusy(key);
      try {
        await work();
      } catch (cause) {
        console.error(`[share] ${key} failed (${cause instanceof Error ? cause.name : 'unknown'})`); // TODO(Sentry)
        report(failed, true);
      } finally {
        working.current = false;
        setBusy(null);
      }
    },
    [report],
  );

  const onCopy = useCallback(() => {
    if (!model) return;
    void run(
      'copy',
      async () => {
        await copyToClipboard(copyText(model));
        haptics.success();
        report(SHARE_MESSAGES.copied);
      },
      SHARE_MESSAGES.copyFailed,
    );
  }, [model, report, run]);

  const onSave = useCallback(() => {
    if (!model) return;
    void run(
      'save',
      async () => {
        const outcome = await savePicture(await capturePicture(card));
        if (outcome === 'denied') {
          report(SHARE_MESSAGES.denied, true);
          return;
        }
        haptics.success();
        report(look === 'clear' ? SHARE_MESSAGES.savedClear : SHARE_MESSAGES.saved);
      },
      SHARE_MESSAGES.saveFailed,
    );
  }, [card, look, model, report, run]);

  const onShare = useCallback(() => {
    if (!model) return;
    void run(
      'share',
      async () => {
        const outcome = await sharePicture(await capturePicture(card));
        if (outcome === 'unavailable') report(SHARE_MESSAGES.shareUnavailable, true);
        else setResult(null);
      },
      SHARE_MESSAGES.shareFailed,
    );
  }, [card, model, report, run]);

  // A new look or layout makes the last result stale ("Saved … transparent PNG" is about the old picture).
  const onLayout = useCallback((next: ShareLayout) => {
    setLayout(next);
    setResult(null);
  }, []);
  const onLook = useCallback((next: ShareLook) => {
    setLook(next);
    setResult(null);
  }, []);

  return {
    status,
    model,
    layout,
    look,
    layouts: SHARE_LAYOUTS,
    looks: SHARE_LOOKS,
    backgroundLabel: look === 'clear' ? 'Background · saves as a transparent PNG' : 'Background',
    copyPreview: model ? copyText(model) : '',
    busy,
    result,
    onLayout,
    onLook,
    onCopy,
    onSave,
    onShare,
    onRetry,
    onClose: () => goBack(),
  };
}

export type ShareViewModel = ReturnType<typeof useShareViewModel>;
