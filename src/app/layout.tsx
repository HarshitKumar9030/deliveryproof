import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { cookies } from 'next/headers';
import { auth } from '@/auth';
import { WorkspaceProvider } from '@/components/workspace-provider';
import { RouteShell } from '@/components/route-shell';
import './globals.css';
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-fallback',
  display: 'swap',
});
export const metadata: Metadata = {
  title: 'DeliveryProof — Your workspace',
  description:
    'Clear digital deliveries and reviewed dispute evidence.',
};
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const preference = (await cookies()).get('deliveryproof-theme')?.value;
  const session = await auth();
  const user = session?.user?.id ? { id: session.user.id, name: session.user.name || 'Your account', email: session.user.email || '' } : null;
  const initialTheme = preference === 'dark' ? 'dark' : 'light';
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <WorkspaceProvider initialTheme={initialTheme} user={user}>
          <RouteShell>{children}</RouteShell>
        </WorkspaceProvider>
      </body>
    </html>
  );
}
