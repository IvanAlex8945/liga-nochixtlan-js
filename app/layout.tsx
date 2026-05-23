import type { Metadata } from 'next';
import { Cormorant_Garamond, Sora } from 'next/font/google';
import './globals.css';
import AntdProvider from './components/AntdProvider';

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-sora',
});

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['600', '700'],
});

export const metadata: Metadata = {
  title: 'Liga Municipal de Básquetbol – Nochixtlán',
  description: 'Sistema de gestión de la Liga Municipal de Básquetbol de Nochixtlán. Posiciones, estadísticas y calendario.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${sora.variable} ${cormorant.variable}`}>
      <body className="glass-root">
        <AntdProvider>{children}</AntdProvider>
      </body>
    </html>
  );
}
