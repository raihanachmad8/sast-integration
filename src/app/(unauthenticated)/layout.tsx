import { QueryProvider } from '@/components/providers/query-provider';
import { ConfigProvider } from 'antd';
import { AUTH_THEME } from '@/commons/constants';
import styles from './auth.module.css';

function ShieldIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

export default function UnauthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <ConfigProvider theme={{ token: { colorPrimary: AUTH_THEME.PRIMARY } }}>
        <div className={styles.authLayout}>
          <div className={styles.brandPanel}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: AUTH_THEME.PANEL_ICON_BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldIcon />
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>SAST Integration</div>
                <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: AUTH_THEME.TEXT_SUBTLE }}>Security Review Console</div>
              </div>
            </div>

            <h1 style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.3, margin: 0 }}>
              Review scanner findings<br />with clear AI attribution.
            </h1>
            <p style={{ marginTop: 12, fontSize: 14, lineHeight: 1.6, color: AUTH_THEME.TEXT_MUTED, maxWidth: 380 }}>
              Connect repositories, queue scans, verify findings with AI, and manage workspace access — all in one place.
            </p>

            <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, maxWidth: 300 }}>
              {[
                { value: '3', label: 'Scanners' },
                { value: 'QLoRA', label: 'AI Verifier' },
                { value: 'RBAC', label: 'Permissions' },
              ].map((item) => (
                <div key={item.label} style={{ borderRadius: 10, background: AUTH_THEME.PANEL_BG, padding: '10px 8px', textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{item.value}</div>
                  <div style={{ fontSize: 10, color: AUTH_THEME.TEXT_SUBTLE, marginTop: 2 }}>{item.label}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                'Connect GitHub, GitLab, or Gitea',
                'Run Semgrep, Gitleaks, Flawfinder',
                'AI-assisted TP/FP with confidence score',
                'Workspace RBAC with 4 role levels',
              ].map((text) => (
                <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: AUTH_THEME.TEXT_MUTED }}>
                  <span style={{ color: AUTH_THEME.ACCENT }}>✓</span> {text}
                </div>
              ))}
            </div>
          </div>

          <div className={styles.formPanel}>
            <div className={styles.formWrapper}>
              {children}
            </div>
          </div>
        </div>
      </ConfigProvider>
    </QueryProvider>
  );
}
