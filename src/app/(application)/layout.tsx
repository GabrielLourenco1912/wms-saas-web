import { AuthProvider } from '@/features/auth/AuthProvider';

export default function ApplicationLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
