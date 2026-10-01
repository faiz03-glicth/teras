/** "Faiz Ahmad" → "FA"; "faiz@x.co" → "F"; empty → "?". */
export function initials(name: string | null | undefined): string {
  const words = (name ?? '')
    .trim()
    .split(/[\s@._-]+/)
    .filter(Boolean);
  const letters = words.length > 1 && !name?.includes('@') ? [words[0], words.at(-1)] : [words[0]];
  const result = letters.map((word) => word?.[0]?.toUpperCase() ?? '').join('');
  return result || '?';
}
