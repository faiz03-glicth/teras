/** One tap of the rest bar's − or +. */
export const REST_STEP_SECONDS = 15;

/** PURE: whole seconds of rest still to wait (rounded up, so "0:01" shows until it is over); 0 with none. */
export function restLeft(endsAt: string | null, now: number): number {
  if (endsAt === null) return 0;
  return Math.max(0, Math.ceil((new Date(endsAt).getTime() - now) / 1000));
}

/**
 * PURE: the rest's end moved one step later (+1) or earlier (−1). Moving it to or past now ends the rest,
 * rather than leaving a timer at zero.
 */
export function adjustRest(endsAt: string | null, direction: 1 | -1, now: number): string | null {
  if (endsAt === null) return null;
  const moved = new Date(endsAt).getTime() + direction * REST_STEP_SECONDS * 1000;
  return moved <= now ? null : new Date(moved).toISOString();
}

/** PURE: seconds as a clock, "1:30". */
export function restClock(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
