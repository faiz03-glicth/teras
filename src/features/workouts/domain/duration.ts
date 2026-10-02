/** PURE: whole seconds from a workout's start to its finish; 0 if it has not finished or they run backwards. */
export function sessionSeconds(startedAt: string, endedAt: string | null): number {
  if (!endedAt) return 0;
  return Math.max(0, Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000));
}

/**
 * PURE: how long a workout ran, in whole minutes: "62 min". Not the rest timer's minutes:seconds — an
 * hour-long session reading "62:00" is the wrong register for a feed. A session that ran at all reads at
 * least "1 min", so a quick one never looks like it never happened.
 */
export function formatMinutes(totalSeconds: number): string {
  if (!(totalSeconds > 0)) return '0 min';
  return `${Math.max(1, Math.round(totalSeconds / 60))} min`;
}
