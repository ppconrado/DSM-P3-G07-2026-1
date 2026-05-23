import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import { Lato, Montserrat, Open_Sans, Roboto_Mono } from 'next/font/google';
import './globals.css';
import { site } from '@/lib/site';

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
});
const lato = Lato({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-lato',
});
const openSans = Open_Sans({
  subsets: ['latin'],
  variable: '--font-open-sans',
});
const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  variable: '--font-roboto-mono',
});

export const metadata: Metadata = {
  title: {
    default: site.name,
    template: `%s | ${site.name}`,
  },
  description: site.slogan,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="pt-BR"
      className={`${montserrat.variable} ${lato.variable} ${openSans.variable} ${robotoMono.variable}`}
      style={{ '--admin-left-width': '390px' } as CSSProperties}
    >
      <body className="font-sans antialiased">
        <a
          href="#main-content"
          className="sr-only rounded-md bg-academy-primary px-4 py-2 text-white focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50"
        >
          Pular para o conteúdo principal
        </a>
        {children}
      </body>
    </html>
  );
}
