/** The three pictures a workout can be shared as. */
export type ShareLayout = 'summary' | 'lifts' | 'muscles';

/** The three grounds the picture can have: clear (for a Story over a photo), Black, or Parchment. */
export type ShareLook = 'clear' | 'black' | 'parchment';

export const SHARE_LAYOUTS: readonly { value: ShareLayout; label: string }[] = [
  { value: 'summary', label: 'Summary' },
  { value: 'lifts', label: 'Lifts' },
  { value: 'muscles', label: 'Muscles' },
];

export const SHARE_LOOKS: readonly { value: ShareLook; label: string }[] = [
  { value: 'clear', label: 'Clear' },
  { value: 'black', label: 'Black' },
  { value: 'parchment', label: 'Parchment' },
];
