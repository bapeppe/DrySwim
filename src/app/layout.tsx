import type { Metadata, Viewport } from 'next';
import { AppShell } from '@/components/app-shell';
import './globals.css';
export const metadata: Metadata = {
  title: { default: 'SwimDryland · La forza fuori dall’acqua', template: '%s · SwimDryland' },
  description:
    'Allenamenti a secco per giovani nuotatori. Forza, mobilità e controllo, un movimento alla volta.',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'SwimDryland' },
  icons: { icon: '/icon.svg', apple: '/icon-192.png' },
  manifest: '/manifest.webmanifest',
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#086e80' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
