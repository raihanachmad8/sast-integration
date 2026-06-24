const AI_STATS = [
  { value: '16', label: 'True Positive', color: '#3fb950', bg: 'rgba(63,185,80,0.08)', border: 'rgba(63,185,80,0.2)' },
  { value: '7', label: 'False Positive', color: '#f85149', bg: 'rgba(248,81,73,0.08)', border: 'rgba(248,81,73,0.2)' },
  { value: '94%', label: 'Accuracy', color: '#5eead4', bg: 'rgba(94,234,212,0.08)', border: 'rgba(94,234,212,0.2)' },
] as const;

/** AI verification summary panel inside the dashboard mock. */
export function AiVerificationPanel() {
  return (
    <div
      className="lp-result-3"
      style={{
        paddingTop: 12,
        borderTop: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', color: '#a78bfa', textTransform: 'uppercase' }}>
          🤖 AI Verification
        </span>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>QLoRA LLM</span>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {AI_STATS.map((stat) => (
          <div
            key={stat.label}
            style={{
              flex: 1,
              padding: '8px 10px',
              borderRadius: 8,
              background: stat.bg,
              border: `1px solid ${stat.border}`,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 800, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 3 }}>{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
