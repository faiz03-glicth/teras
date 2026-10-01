import type { IconName } from '../ui/icons';

export type TabId = 'home' | 'workout' | 'profile';

export interface TabItem {
  id: TabId;
  label: string;
  icon: IconName;
}

/** Tab order, left to right. Three sections; the bar holds no action button. */
export const TAB_ITEMS: readonly TabItem[] = [
  { id: 'home', label: 'Home', icon: 'house' },
  { id: 'workout', label: 'Workout', icon: 'dumbbell' },
  { id: 'profile', label: 'Profile', icon: 'user' },
];
