import { QueryProvider } from '@/components/providers/QueryProvider';
import { AuthWrapper } from './auth-wrapper';

export default function UnauthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <AuthWrapper>{children}</AuthWrapper>
    </QueryProvider>
  );
}
