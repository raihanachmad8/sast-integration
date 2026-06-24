'use client';

import React from 'react';
import { App, ConfigProvider } from 'antd';
import { antdTheme } from '@/config/antd-theme';

const isDev = process.env.NODE_ENV === 'development';

// Dev: runtime CSS-in-JS for hot reload
// Production: static CSS (no runtime overhead)
function DevAntdProvider({ children }: { children: React.ReactNode }) {
  // Dynamic import to avoid bundling cssinjs in production
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createCache, extractStyle, StyleProvider } = require('@ant-design/cssinjs');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useServerInsertedHTML } = require('next/navigation');

  const cache = createCache();
  const isServerInserted = React.useRef(false);

  useServerInsertedHTML(() => {
    if (isServerInserted.current) {
      return;
    }
    isServerInserted.current = true;
    return (
      <style id="antd" dangerouslySetInnerHTML={{ __html: extractStyle(cache, true) }} />
    );
  });

  return (
    <StyleProvider cache={cache}>
      <ConfigProvider theme={antdTheme}>
        <App>{children}</App>
      </ConfigProvider>
    </StyleProvider>
  );
}

// Production: static CSS loaded via layout.tsx, no runtime CSS-in-JS
function ProdAntdProvider({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider theme={antdTheme}>
      <App>{children}</App>
    </ConfigProvider>
  );
}

export const AntdProvider = isDev ? DevAntdProvider : ProdAntdProvider;
