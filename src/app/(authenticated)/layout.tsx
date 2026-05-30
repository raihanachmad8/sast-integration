import { QueryProvider } from '@/components/providers/query-provider';
import { AuthenticatedShell } from '@/components/layout/authenticated-shell';

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <AuthenticatedShell>{children}</AuthenticatedShell>
    </QueryProvider>
  );
}
