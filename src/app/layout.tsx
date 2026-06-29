import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';

import { AntdProvider } from '@/commons/providers/AntdProvider';
import '@fortawesome/fontawesome-free/css/all.min.css';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: 'SAST Integration',
  description: 'Intelligent SAST platform for C/C++ with AI-powered verification',
  openGraph: {
    title: 'SAST Integration',
    description: 'AI-powered security analysis platform for modern development teams. Ship secure code faster with intelligent verification.',
    type: 'website',
    locale: 'en_US',
    siteName: 'SAST Integration',
    images: [
      {
        url: '/og.svg',
        width: 1200,
        height: 630,
        alt: 'SAST Integration — AI-Powered Security Analysis',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SAST Integration',
    description: 'AI-powered security analysis platform for modern development teams.',
    images: ['/og.svg'],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: '/favicon.svg',
  },
};

export const viewport: Viewport = {
  themeColor: '#0f766e',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable} data-scroll-behavior="smooth">
      <body className={inter.className}>
        <AntdProvider>{children}</AntdProvider>
      </body>
    </html>
  );
}
