import { redirect } from 'next/navigation';

export default function SecurityPage() {
  // Redirect handled by middleware - this page should never render
  redirect('/profile');
}
