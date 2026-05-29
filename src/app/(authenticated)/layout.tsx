import { QueryProvider } from '@/components/providers/query-provider';
import { AppShell } from '@/components/layout/app-shell';

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <AppShell>{children}</AppShell>
    </QueryProvider>
  );
}
