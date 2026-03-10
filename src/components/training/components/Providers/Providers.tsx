'use client';

import React from 'react';
import { AuthProvider } from './AuthProvider';
import { SocketProvider } from './SocketProvider';
import ErrorBoundary from '../ErrorBoundary/ErrorBoundary';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <SocketProvider>
          {children}
        </SocketProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default Providers;