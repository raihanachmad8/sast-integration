import { QueryProvider } from '@/components/providers/query-provider';

export default function UnauthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <section style={{ minHeight: '100vh', background: '#eef2f6' }}>
        <div style={{ display: 'grid', minHeight: '100vh', gridTemplateColumns: '1fr 1fr' }}>
          {/* Left panel: branding */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', background: '#0f766e', padding: '48px 64px', color: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🛡️</div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>SAST Integration</div>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.16em', color: '#99f6e4' }}>Security review console</div>
              </div>
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 700, lineHeight: 1.2 }}>
              Review scanner findings<br />with clear AI attribution.
            </h1>
            <p style={{ marginTop: 16, fontSize: 15, lineHeight: 1.7, color: '#ccfbf1', maxWidth: 420 }}>
              Connect repositories, queue scans, verify findings with QLoRA AI, and manage workspace access — all in one place.
            </p>
            <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, maxWidth: 340 }}>
              <div style={{ borderRadius: 12, background: 'rgba(255,255,255,0.1)', padding: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700 }}>2</div>
                <div style={{ fontSize: 11, color: '#99f6e4', marginTop: 4 }}>Scanners</div>
              </div>
              <div style={{ borderRadius: 12, background: 'rgba(255,255,255,0.1)', padding: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700 }}>QLoRA</div>
                <div style={{ fontSize: 11, color: '#99f6e4', marginTop: 4 }}>AI verifier</div>
              </div>
              <div style={{ borderRadius: 12, background: 'rgba(255,255,255,0.1)', padding: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700 }}>RBAC</div>
                <div style={{ fontSize: 11, color: '#99f6e4', marginTop: 4 }}>Permissions</div>
              </div>
            </div>
            <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 340 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#ccfbf1' }}>✓ Connect GitHub, GitLab, or Gitea</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#ccfbf1' }}>✓ Run Semgrep, Gitleaks, Flawfinder</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#ccfbf1' }}>✓ AI-assisted TP/FP with confidence score</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#ccfbf1' }}>✓ Workspace RBAC with 4 role levels</div>
            </div>
          </div>

          {/* Right panel: form */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 64px' }}>
            <div style={{ width: '100%', maxWidth: 420 }}>
              {children}
            </div>
          </div>
        </div>
      </section>
    </QueryProvider>
  );
}
