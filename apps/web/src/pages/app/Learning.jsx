import PageHeader from '../../components/ui/PageHeader';

const PIPELINE = [
  { step: 'Data Ingestion', status: 'complete', detail: '847 alias entries from CEDA Ashoka + data.gov.in' },
  { step: 'Entity Resolution', status: 'complete', detail: '34 resolutions processed overnight' },
  { step: 'Embedding Index', status: 'active', detail: 'Corpus: 847 entries · 91% avg match confidence' },
  { step: 'Feedback Loop', status: 'active', detail: '3 new aliases learned from trader corrections' },
  { step: 'Model Retraining', status: 'scheduled', detail: 'Next run: Sunday 02:00 IST' },
];

export default function Learning() {
  return (
    <div className="space-y-6">
      <PageHeader title="Adaptive Learning" subtitle="Continuous improvement via Adaption pipeline and alias resolution" />

      <div className="card p-6">
        <h3 className="font-semibold mb-6">Adaption Pipeline</h3>
        <div className="relative">
          {PIPELINE.map((p, i) => (
            <div key={p.step} className="flex gap-4 mb-6 last:mb-0">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                  p.status === 'complete' ? 'bg-green-600' : p.status === 'active' ? 'bg-blue-600 animate-pulse' : 'bg-gray-300'
                }`}>
                  {p.status === 'complete' ? '✓' : i + 1}
                </div>
                {i < PIPELINE.length - 1 && <div className="w-0.5 flex-1 bg-gray-200 mt-1" />}
              </div>
              <div className="pb-4">
                <p className="font-semibold text-sm">{p.step}</p>
                <p className="text-sm text-gray-500">{p.detail}</p>
                <span className={`text-[10px] uppercase font-bold mt-1 inline-block px-2 py-0.5 rounded ${
                  p.status === 'complete' ? 'bg-green-100 text-green-700' : p.status === 'active' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                }`}>{p.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="card p-4"><p className="text-xs text-gray-500">Alias Corpus</p><p className="text-2xl font-bold">847</p><p className="text-xs text-green-600">+3 this week</p></div>
        <div className="card p-4"><p className="text-xs text-gray-500">Resolution Accuracy</p><p className="text-2xl font-bold">94.2%</p></div>
        <div className="card p-4"><p className="text-xs text-gray-500">Languages Supported</p><p className="text-2xl font-bold">6</p><p className="text-xs text-gray-400">EN · HI · MR · GU · PA · +</p></div>
      </div>

      <div className="card p-4">
        <h3 className="font-semibold text-sm mb-3">Recent Alias Learnings</h3>
        {[
          { alias: 'Kapas', resolved: 'Cotton', method: 'Semantic Match', confidence: 94 },
          { alias: 'Tur', resolved: 'Pigeon Pea', method: 'Trigram', confidence: 88 },
          { alias: 'Moong', resolved: 'Green Gram', method: 'LLM', confidence: 91 },
        ].map((a) => (
          <div key={a.alias} className="flex justify-between text-sm py-2 border-b">
            <span><strong>{a.alias}</strong> → {a.resolved}</span>
            <span className="text-gray-500">{a.method} ({a.confidence}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}
