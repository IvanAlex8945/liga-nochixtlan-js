'use client';

import React from 'react';
import { ConfigProvider, theme } from 'antd';
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
              "'Inter', 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif",
            borderRadius: 8,
          },
          components: {
            Table: {
              colorBgContainer: '#1a1a1a',
              colorBorderSecondary: '#2a2a2a',
              headerBg: '#111111',
              headerColor: '#FAAD14',
              rowHoverBg: '#242424',
            },
            Menu: {
              darkItemBg: '#0d0d0d',
              darkItemSelectedBg: '#FAAD14',
              darkItemSelectedColor: '#000',
            },
            Card: {
              colorBgContainer: '#1a1a1a',
              colorBorderSecondary: '#2a2a2a',
            },
            Button: {
              colorPrimaryHover: '#ffc53d',
            },
          },
        }}
      >
        {children}
      </ConfigProvider>
    </QueryClientProvider>
  );
}
