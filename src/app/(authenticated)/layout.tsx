import { QueryProvider } from '@/commons/providers/QueryProvider';
import { AuthenticatedShell } from '@/commons/components/layout/AuthenticatedShell';

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <AuthenticatedShell>{children}</AuthenticatedShell>
    </QueryProvider>
  );
}
