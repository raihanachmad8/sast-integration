const SEVERITY_COLORS: Record<string, { color: string; bg: string }> = {
  CRITICAL: { color: '#f85149', bg: 'rgba(248,81,73,0.12)' },
  HIGH:     { color: '#e3b341', bg: 'rgba(227,179,65,0.12)' },
  MEDIUM:   { color: '#58a6ff', bg: 'rgba(88,166,255,0.12)' },
  LOW:      { color: '#3fb950', bg: 'rgba(63,185,80,0.12)'  },
};

const DEFAULT_SEVERITY = { color: '#8b949e', bg: 'rgba(139,148,158,0.1)' };

/** Severity badge used inside the dashboard mock. */
export function SeverityBadge({ level, count }: { level: string; count: number }) {
  const c = SEVERITY_COLORS[level] ?? DEFAULT_SEVERITY;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '7px 12px',
        borderRadius: 8,
        background: c.bg,
        border: `1px solid ${c.color}28`,
        marginBottom: 6,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: c.color,
            display: 'inline-block',
            boxShadow: `0 0 6px ${c.color}`,
          }}
        />
        <span style={{ fontSize: 11.5, fontWeight: 600, color: c.color, letterSpacing: '0.04em' }}>
          {level}
        </span>
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, color: '#e6edf3' }}>{count}</span>
    </div>
  );
}
