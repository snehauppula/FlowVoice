export function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

/** Calendar days (Asia/Kolkata) ending today, oldest first. */
export function lastDays(days: number): { key: string; label: string }[] {
  const now = Date.now();
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(now - (days - 1 - i) * 86_400_000);
    return {
      key: d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }),
      label: d.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }),
    };
  });
}
