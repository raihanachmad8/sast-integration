import { QueryProvider } from '@/components/providers/query-provider';

function ShieldIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

export default function UnauthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <section style={{ minHeight: '100vh', background: '#eef2f6' }}>
        <div style={{ display: 'grid', minHeight: '100vh', gridTemplateColumns: '1fr 1fr' }}>
          {/* Left panel: branding */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', background: '#0f766e', padding: '48px 64px', color: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldIcon />
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>SAST Integration</div>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.16em', color: '#99f6e4' }}>Security Review Console</div>
              </div>
            </div>

            <h1 style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.3, margin: 0 }}>
              Review scanner findings<br />with clear AI attribution.
            </h1>
            <p style={{ marginTop: 16, fontSize: 15, lineHeight: 1.7, color: '#ccfbf1', maxWidth: 420 }}>
              Connect repositories, queue scans, verify findings with QLoRA AI, and manage workspace access — all in one place.
            </p>

            <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, maxWidth: 340 }}>
              {[
                { value: '3', label: 'Scanners' },
                { value: 'QLoRA', label: 'AI Verifier' },
                { value: 'RBAC', label: 'Permissions' },
              ].map((item) => (
                <div key={item.label} style={{ borderRadius: 12, background: 'rgba(255,255,255,0.1)', padding: '14px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 700 }}>{item.value}</div>
                  <div style={{ fontSize: 11, color: '#99f6e4', marginTop: 4 }}>{item.label}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 380 }}>
              {[
                'Connect GitHub, GitLab, or Gitea',
                'Run Semgrep, Gitleaks, Flawfinder',
                'AI-assisted TP/FP with confidence score',
                'Workspace RBAC with 4 role levels',
              ].map((text) => (
                <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#ccfbf1' }}>
                  <span style={{ color: '#5eead4', fontWeight: 700 }}>✓</span> {text}
                </div>
              ))}
            </div>
          </div>

          {/* Right panel: form */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 64px' }}>
            <div style={{ width: '100%', maxWidth: 400 }}>
              {children}
            </div>
          </div>
        </div>
      </section>
    </QueryProvider>
  );
}
