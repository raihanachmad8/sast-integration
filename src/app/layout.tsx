import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AntdProvider } from '@/commons/providers/AntdProvider';
import '@fortawesome/fontawesome-free/css/all.min.css';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'SAST Integration',
  description: 'Intelligent SAST platform for C/C++ with AI-powered verification',
  openGraph: {
    title: 'SAST Integration',
    description: 'AI-powered security analysis platform for modern development teams. Ship secure code faster with intelligent verification.',
    type: 'website',
    locale: 'en_US',
    siteName: 'SAST Integration',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SAST Integration',
    description: 'AI-powered security analysis platform for modern development teams.',
  },
  robots: {
    index: true,
    follow: true,
  },
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
