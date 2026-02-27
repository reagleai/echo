import { Info } from "lucide-react";

const DOMAIN_DESCRIPTIONS: Record<string, string> = {
  product:
    "Searching LinkedIn for product management insights — frameworks, mental models, lessons learned, and contrarian takes from industry leaders.",
  marketing:
    "Searching LinkedIn for marketing insights — case studies, playbooks, growth experiments, and proven strategies from practitioners.",
};

export default function SearchQueryPreview({ domain }: { domain: string }) {
  const description = DOMAIN_DESCRIPTIONS[domain] || DOMAIN_DESCRIPTIONS.product;

  return (
    <div className="flex items-start gap-2 rounded-lg border border-border bg-muted px-4 py-3">
      <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
