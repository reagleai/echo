import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function sanitizeUrl(url: string | null | undefined): string {
  if (!url) return "#";
  try {
    const parsed = new URL(url);
    if (["http:", "https:"].includes(parsed.protocol)) {
      if (parsed.hostname.includes("google.com")) {
        return parsed.toString();
      }
    }
  } catch (e) {
    // Ignore malformed
  }
  return "#";
}
