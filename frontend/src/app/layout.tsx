import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';

export const metadata: Metadata = {
  title: 'Rete Mali - Taman Baca & Komunitas',
  description:
    'Rete Mali adalah taman baca dan komunitas yang menyediakan akses buku, kegiatan literasi, dan program sosial untuk masyarakat.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="antialiased font-sans">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
