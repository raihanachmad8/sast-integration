import { QueryProvider } from '@/components/providers/QueryProvider';
import { AuthenticatedShell } from '@/components/layout/AuthenticatedShell';

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <AuthenticatedShell>{children}</AuthenticatedShell>
    </QueryProvider>
  );
}
