import type { ActivityColorKey } from '@/theme';
import type { IconName } from '@/shared/ui/icons';

export interface Benefit {
  icon: IconName;
  color: ActivityColorKey;
  title: string;
  description: string;
}

/** Why an account helps, shown on Sign in. Only what is true today: workout detail stays on the phone. */
export const LOGIN_BENEFITS: readonly Benefit[] = [
  {
    icon: 'flame',
    color: 'orange',
    title: 'Your training in Streak',
    description: 'Each training day shows up as a second wave',
  },
  {
    icon: 'user',
    color: 'blue',
    title: 'One account for both apps',
    description: 'Use the same sign-in as Streak',
  },
  {
    icon: 'lock',
    color: 'purple',
    title: 'Private by default',
    description: 'Exercises, sets and weights never leave this phone',
  },
];
