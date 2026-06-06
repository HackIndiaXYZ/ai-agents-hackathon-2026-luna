export default function ExecutionTimeline({ steps = [], expanded, onToggle }) {
  if (!steps.length) return null;
  const done = steps.filter((s) => s.status === 'done').length;
  return (
    <div className="mt-2">
      <button onClick={onToggle} className="text-[11px] text-green-400 font-medium">
        {expanded ? '▼' : '▶'} {done} agents · {(steps.reduce((s, x) => s + (x.ms || 0), 0) / 1000).toFixed(1)}s
      </button>
      {expanded && (
        <div className="mt-2 space-y-1.5 pl-2 border-l border-green-800">
          {steps.map((step, i) => (
            <div key={i} className="text-[11px] text-green-100/80 flex justify-between gap-2">
              <span>✓ {step.label}{step.detail ? ` — ${step.detail}` : ''}</span>
              <span className="text-green-500/60 shrink-0">{step.ms}ms</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
