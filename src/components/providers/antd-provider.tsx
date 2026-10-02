'use client';

import { App, ConfigProvider } from 'antd';
import { antdTheme } from '@/config/antd-theme';

export function AntdProvider({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider theme={antdTheme}>
      <App>{children}</App>
    </ConfigProvider>
  );
}
