import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { cookies } from 'next/headers';
import { DemoProvider } from '@/demo/demo-provider';
import { AppShell } from '@/components/app-shell';
import './globals.css';
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-fallback',
  display: 'swap',
});
export const metadata: Metadata = {
  title: 'DeliveryProof — Your workspace',
  description:
    'A demo workspace for clear digital deliveries and reviewed dispute evidence.',
};
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const preference = (await cookies()).get('deliveryproof-theme')?.value;
  const initialTheme = preference === 'dark' ? 'dark' : 'light';
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <DemoProvider initialTheme={initialTheme}>
          <AppShell>{children}</AppShell>
        </DemoProvider>
      </body>
    </html>
  );
}
