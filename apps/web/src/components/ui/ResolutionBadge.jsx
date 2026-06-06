const tiers = {
  exact: { label: 'Exact Match', icon: '⚡', color: 'bg-green-100 text-green-800 border-green-200' },
  trigram: { label: 'Trigram', icon: '🔍', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  embedding: { label: 'Semantic Match', icon: '✦', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  llm: { label: 'LLM Resolved', icon: '✧', color: 'bg-orange-100 text-orange-800 border-orange-200' },
};

export default function ResolutionBadge({ commodity, tier = 'embedding', confidence = 94 }) {
  const t = tiers[tier] || tiers.embedding;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${t.color}`}>
      {t.icon} {commodity} — Resolved via {t.label} ({confidence}%)
    </span>
  );
}
