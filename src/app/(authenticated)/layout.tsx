import { AuthenticatedShell } from '@/commons/components/layout/AuthenticatedShell';
import { QueryProvider } from '@/commons/providers/QueryProvider';

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <AuthenticatedShell>{children}</AuthenticatedShell>
    </QueryProvider>
  );
}
