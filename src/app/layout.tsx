import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
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
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <DemoProvider>
          <AppShell>{children}</AppShell>
        </DemoProvider>
      </body>
    </html>
  );
}
