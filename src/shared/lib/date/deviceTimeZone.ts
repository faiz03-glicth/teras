/** The device's IANA time zone, e.g. "Asia/Kuala_Lumpur". Falls back to UTC if Intl can't tell. */
export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/** Current time as an ISO-8601 UTC string (the format stored in every timestamp column). */
export const nowIso = (): string => new Date().toISOString();
