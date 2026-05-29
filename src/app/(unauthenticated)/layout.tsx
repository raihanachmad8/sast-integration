import { QueryProvider } from '@/components/providers/query-provider';

export default function UnauthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f5f5f5' }}>
        {children}
      </div>
    </QueryProvider>
  );
}
