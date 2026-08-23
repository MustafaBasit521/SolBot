export function timeOfDayGreeting(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function dateLine(now: Date = new Date()): string {
  const day = now.toLocaleDateString(undefined, { weekday: "long" }).toUpperCase();
  const monthDay = now.toLocaleDateString(undefined, { day: "numeric", month: "long" }).toUpperCase();
  return `${day} · ${monthDay}`;
}

export function relativeTime(dateStr: string, now: Date = new Date()): string {
  const then = new Date(dateStr);
  const diffMs = now.getTime() - then.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
}

// A real, computed comparison (recent half vs. earlier half of the window),
// not a fabricated insight -- honest about only describing what the numbers
// actually show, and silent (returns null) when there isn't enough data to
// say anything meaningful.
export function moodTrendCaption(values: number[]): string | null {
  if (values.length < 4) return null;

  const mid = Math.floor(values.length / 2);
  const earlier = values.slice(0, mid);
  const recent = values.slice(mid);
  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const diff = avg(recent) - avg(earlier);

  if (diff > 8) return "Mood has been trending up over this period.";
  if (diff < -8) return "Mood has been trending down over this period.";
  return "Mood has been fairly steady over this period.";
}
