/** Engine row in the scanner status panel. */
export function EngineRow({ name, status, findings }: { name: string; status: 'done' | 'running'; findings?: number }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '5px 0',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: status === 'done' ? '#3fb950' : '#f59e0b',
            display: 'inline-block',
            boxShadow: status === 'running' ? '0 0 6px #f59e0b' : 'none',
          }}
        />
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>{name}</span>
      </div>
      {status === 'done' && findings !== undefined ? (
        <span style={{ fontSize: 12, color: '#5eead4', fontWeight: token.fontWeightStrong }}>{findings} found</span>
      ) : (
        <span style={{ fontSize: 11, color: '#f59e0b' }}>scanning…</span>
      )}
    </div>
  );
}
