import type { Metadata } from 'next';
import { AntdProvider } from '@/components/providers/antd-provider';
import '@fortawesome/fontawesome-free/css/all.min.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'SAST Integration',
  description: 'Intelligent SAST platform for C/C++ with AI-powered verification',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AntdProvider>{children}</AntdProvider>
      </body>
    </html>
  );
}
