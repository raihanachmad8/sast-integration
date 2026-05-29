import { AuthProvider } from '@/lib/auth/auth-provider';

export default function UnauthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f5f5f5' }}>
        {children}
      </div>
    </AuthProvider>
  );
}
