/** Tiny Italian pluralization helper (count === 1 → singular, else plural). */
export function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

/** `"1 giurato"` / `"3 giurati"` — count prefixed to the right form. */
export function pluralizeWithCount(count: number, singular: string, plural: string): string {
  return `${count} ${pluralize(count, singular, plural)}`;
}
