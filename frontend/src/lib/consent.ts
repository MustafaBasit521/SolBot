const PREFIX = "solbot_consent_";

export function hasAcceptedConsent(userId: string): boolean {
  return localStorage.getItem(PREFIX + userId) === "true";
}

export function acceptConsent(userId: string): void {
  localStorage.setItem(PREFIX + userId, "true");
}
