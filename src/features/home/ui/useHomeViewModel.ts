import { firstName } from '@/features/auth/domain/types';
import { useAuthStore } from '@/features/auth/state/authStore';
import { useProfile } from '@/features/profile/hooks/useProfile';
import { formatHeight, formatRest, formatWeight, UNIT_SYSTEMS } from '@/features/training/domain/preferences';
import { useTrainingPreferencesStore } from '@/features/training/state/trainingPreferencesStore';
import { goTab } from '@/shared/actions';

/**
 * Home, for now: who is signed in, what Set up chose, and whether the day summaries can reach Streak.
 * The training wave and the workout feed arrive with workout logging.
 */
export function useHomeViewModel() {
  const user = useAuthStore((s) => s.user);
  const { data: profile } = useProfile(user);
  const unit = useTrainingPreferencesStore((s) => s.unit);
  const bodyweightKg = useTrainingPreferencesStore((s) => s.bodyweightKg);
  const heightCm = useTrainingPreferencesStore((s) => s.heightCm);
  const restSeconds = useTrainingPreferencesStore((s) => s.restSeconds);

  const isGuest = user?.provider === 'guest';
  const name = firstName({ displayName: profile?.displayName ?? user?.displayName ?? null });

  return {
    title: name ? `Welcome, ${name}` : 'Welcome',
    accountLine: isGuest ? 'Guest · your training stays on this phone' : (user?.email ?? 'Signed in'),
    setup: [
      { label: 'Units', value: `${UNIT_SYSTEMS[unit].label} (${UNIT_SYSTEMS[unit].detail})` },
      { label: 'Bodyweight', value: formatWeight(bodyweightKg, unit) },
      { label: 'Height', value: formatHeight(heightCm, unit) },
      { label: 'Default rest', value: formatRest(restSeconds) },
    ],
    streakTitle: isGuest ? 'Not connected to Streak' : 'Connected to Streak',
    streakLine: isGuest
      ? 'Sign in with your Streak account and each training day appears there as a second wave.'
      : 'Each training day you log appears in Streak as a second wave. Only the date, level, volume and set count are shared.',
    onOpenWorkout: () => goTab('workout'),
  };
}

export type HomeViewModel = ReturnType<typeof useHomeViewModel>;
