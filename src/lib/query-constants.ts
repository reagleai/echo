export const MAX_QUERY_LENGTH = 390;

export const DEFAULT_TOPICS: Record<string, string[]> = {
  product: ["product management", "product leader", "product strategy", "PM career", "building products"],
  marketing: ["content marketing", "growth marketing", "brand strategy", "demand generation", "digital marketing"],
};

export const INTENT_KEYWORDS: Record<string, string[]> = {
  product: [
    "framework", "mental model", "lessons", "mistake", "learned the hard way",
    "unpopular opinion", "contrarian", "here's what I wish", "what worked",
    "what didn't work", "my approach to", "how I think about",
  ],
  marketing: [
    "case study", "playbook", "results", "what worked",
    "behind the scenes", "breakdown", "lessons", "experiment",
    "growth hack", "ROI",
  ],
};

export const EXCLUSIONS = "-job -hiring -apply -recruiter";

export function buildBooleanQuery(domain: string, customKeywords: string[] = []): string {
  const topics = [...(DEFAULT_TOPICS[domain] || []), ...customKeywords];
  const intents = INTENT_KEYWORDS[domain] || [];
  const topicStr = topics.map((t) => `"${t}"`).join(" OR ");
  const intentStr = intents.map((t) => `"${t}"`).join(" OR ");
  return `(${topicStr}) AND (${intentStr}) ${EXCLUSIONS}`;
}
