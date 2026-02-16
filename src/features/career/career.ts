
export type Career = "general" | "emergency" | "critical" | "pediatrics";

const KEY = "nd_career";

export function getCareer(): Career | null {
  if (typeof window === "undefined") return null;
  return (localStorage.getItem(KEY) as Career) || null;
}

export function setCareer(c: Career) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, c);
}
