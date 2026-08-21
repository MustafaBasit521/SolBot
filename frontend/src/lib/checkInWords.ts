// Maps a 0-100 slider value to one of 5 words, matching the design's
// "worded as descriptions rather than scores" note -- the raw number is
// never shown to the user, only these labels.
function wordFor(value: number, words: [string, string, string, string, string]): string {
  const bucket = Math.min(4, Math.floor(value / 20));
  return words[bucket];
}

export const MOOD_WORDS: [string, string, string, string, string] = [
  "Low",
  "Heavy",
  "Steady",
  "Light",
  "Bright",
];
export const STRESS_WORDS: [string, string, string, string, string] = [
  "Calm",
  "Mild",
  "Tight",
  "Strained",
  "Very high",
];
export const ENERGY_WORDS: [string, string, string, string, string] = [
  "Depleted",
  "Low",
  "Steady",
  "Good",
  "Full",
];
export const SOCIAL_WORDS: [string, string, string, string, string] = [
  "Isolated",
  "Distant",
  "Neutral",
  "Connected",
  "Close",
];
export const OVERALL_WORDS: [string, string, string, string, string] = [
  "Struggling",
  "Getting by",
  "Okay",
  "Doing well",
  "Good",
];

export function moodWord(value: number): string {
  return wordFor(value, MOOD_WORDS);
}
export function stressWord(value: number): string {
  return wordFor(value, STRESS_WORDS);
}
export function energyWord(value: number): string {
  return wordFor(value, ENERGY_WORDS);
}
export function socialWord(value: number): string {
  return wordFor(value, SOCIAL_WORDS);
}
export function overallWord(value: number): string {
  return wordFor(value, OVERALL_WORDS);
}
