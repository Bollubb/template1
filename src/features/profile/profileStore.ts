export type LocalProfile = {
  id: string;
  name: string;
  profession: string;
  bio: string;
  createdAt: number; // epoch ms
};

const LS_PROFILE = "nd_profile";
const LS_AVATAR = "nd_avatar";
const LS_ACCOUNT_CREATED = "nd_account_created";

function safeJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function getAccountCreated(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(LS_ACCOUNT_CREATED) === "1";
}

export function setAccountCreated(v: boolean) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_ACCOUNT_CREATED, v ? "1" : "0");
  } catch {}
}

export function getLocalProfile(): LocalProfile {
  if (typeof window === "undefined") {
    return { id: "me", name: "", profession: "", bio: "", createdAt: 0 };
  }

  const raw = safeJson<any>(localStorage.getItem(LS_PROFILE), {});
  const name = typeof raw?.name === "string" ? raw.name : "";
  const profession = typeof raw?.profession === "string" ? raw.profession : "";
  const bio = typeof raw?.bio === "string" ? raw.bio : "";
  const createdAt = Number(raw?.createdAt || 0);

  return {
    id: "me",
    name,
    profession,
    bio,
    createdAt: Number.isFinite(createdAt) ? createdAt : 0,
  };
}

export function saveLocalProfile(next: Partial<Pick<LocalProfile, "name" | "profession" | "bio" | "createdAt">>) {
  if (typeof window === "undefined") return;
  const cur = getLocalProfile();
  const merged = { ...cur, ...next };
  try {
    localStorage.setItem(LS_PROFILE, JSON.stringify(merged));
  } catch {}
}

export function getAvatar(): string | null {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(LS_AVATAR);
  return v && typeof v === "string" ? v : null;
}

export function setAvatar(v: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (!v) localStorage.removeItem(LS_AVATAR);
    else localStorage.setItem(LS_AVATAR, v);
  } catch {}
}
