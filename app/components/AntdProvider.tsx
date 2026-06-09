'use client';

import React from 'react';
import { App, ConfigProvider, theme } from 'antd';
import esES from 'antd/locale/es_ES';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

export default function AntdProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        locale={esES}
        theme={{
          algorithm: theme.darkAlgorithm,
          token: {
            colorPrimary: '#FAAD14',
            colorBgBase: '#141414',
            colorTextBase: '#FFFFFF',
            fontFamily:
              'var(--font-sora), "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif',
            borderRadius: 16,
          },
          components: {
            Table: {
              colorBgContainer: 'rgba(13, 17, 23, 0.68)',
              colorBorderSecondary: 'rgba(255, 209, 102, 0.14)',
              headerBg: 'rgba(255, 255, 255, 0.06)',
              headerColor: '#f7d774',
              rowHoverBg: 'rgba(255, 255, 255, 0.07)',
            },
            Menu: {
              darkItemBg: '#0d0d0d',
              darkItemSelectedBg: '#FAAD14',
              darkItemSelectedColor: '#000',
            },
            Card: {
              colorBgContainer: 'rgba(13, 17, 23, 0.72)',
              colorBorderSecondary: 'rgba(255, 209, 102, 0.14)',
            },
            Button: {
              colorPrimaryHover: '#ffc53d',
            },
          },
        }}
      >
        <App>{children}</App>
      </ConfigProvider>
    </QueryClientProvider>
  );
}
