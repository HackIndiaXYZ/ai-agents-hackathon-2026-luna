export function ModelCredibilityBadge({ model }) {
  if (!model) return null;
  return (
    <span className="text-[11px] text-gray-500 font-mono">
      [{model.modelType?.toUpperCase()} · {model.realRows} rows · {model.realDataPct}% real · MAPE {model.mape}%]
    </span>
  );
}

export function ModelCredibilityCard({ model, commodity }) {
  if (!model) return null;
  return (
    <div className="card p-4 space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm">Model Credibility — {commodity}</h4>
        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded">High Credibility</span>
      </div>
      <p className="text-sm text-gray-600">Model: {model.modelType?.toUpperCase()} · Real data: {model.realRows} rows · Coverage: {model.realDataPct}% real · MAPE: {model.mape}%</p>
      <p className="text-xs text-gray-500">Training period: {model.trainingPeriod}</p>
      <p className="text-xs text-gray-500">Data sources: {model.dataSources?.join(', ')}</p>
    </div>
  );
}
