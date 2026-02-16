const LS_PREMIUM = "nd_premium"; // soft flag (future: entitlement)

export function isPremium(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(LS_PREMIUM) === "1";
  } catch {
    return false;
  }
}

export function setPremium(v: boolean) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_PREMIUM, v ? "1" : "0");
  } catch {}
}

export function xpMultiplier(): number {
  return isPremium() ? 2 : 1;
}
