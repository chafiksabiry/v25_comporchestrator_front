import React from 'react';
import './public-path';  // For proper Qiankun integration
import { qiankunWindow } from 'vite-plugin-qiankun/dist/helper';
import { logger } from './utils/logger';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary';
import './index.css';
import Cookies from 'js-cookie';

// Function to decode JWT token
const decodeToken = (token: string) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('[Training] Error decoding token:', error);
    return null;
  }
};

const userId = Cookies.get('userId');
const token = localStorage.getItem('token');

// Set default companyId if not present (for testing)
let companyId = Cookies.get('companyId');
if (!companyId) {
  companyId = '68cab073cfa9381f0ed56393'; // Default company ID
  Cookies.set('companyId', companyId, { expires: 365 });
  logger.log('[Training] Set default companyId in cookie:', companyId);
}

logger.log('[Training] Stored userId from cookie:', userId);
logger.log('[Training] Stored companyId from cookie:', companyId);
logger.log('[Training] Stored token from localStorage:', token ? 'Present' : 'Not found');

// Check authentication - redirect if not logged in (check both userId and token)
if (!token || !userId) {
  logger.warn('[Training] Authentication failed - redirecting to login');

  // Redirect to main app login page
  if (window.location.hostname === 'training.harx.ai') {
    // If accessed directly via training.harx.ai, redirect to main app
    window.location.href = 'https://harx25pageslinks.netlify.app/app1';
  } else {
    // If accessed via v25.harx.ai (Qiankun), redirect to app1
    window.location.href = '/app1';
  }
} else {
  // Decode token and get user info
  const userInfo = decodeToken(token);
  logger.log('[Training] User authenticated:', userInfo?.name || userInfo?.fullName || 'Unknown');

  // Check if token is expired
  if (userInfo && userInfo.exp && userInfo.exp * 1000 < Date.now()) {
    logger.warn('[Training] Token is expired, redirecting to /app1');
    localStorage.removeItem('token');
    Cookies.remove('userId');
    window.location.href = '/app1';
  }
}

// Store the root instance for proper unmounting
let root: ReturnType<typeof createRoot> | null = null;

function render(props: { container?: HTMLElement }) {
  const { container } = props;
  logger.debug('[Training] Rendering app');

  const rootElement = container
    ? container.querySelector('#root')
    : document.getElementById('root');

  if (rootElement) {
    // Create the root instance if it doesn't exist
    if (!root) {
      root = createRoot(rootElement);
    }
    root.render(
      <StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </StrictMode>
    );
  } else {
    logger.error('[Training] Root element not found!');
  }
}

export async function bootstrap() {
  logger.debug('[Training] Bootstrapping...');
  return Promise.resolve();
}

export async function mount(props: any) {
  logger.debug('[Training] Mounting...');
  render(props);
  return Promise.resolve();
}

export async function unmount(props: any) {
  logger.debug('[Training] Unmounting...');
  const { container } = props;
  const rootElement = container
    ? container.querySelector('#root')
    : document.getElementById('root');

  if (rootElement && root) {
    root.unmount();
    root = null;  // Reset the root instance
  }
  return Promise.resolve();
}

// Add error handling for module loading
window.addEventListener('error', (event) => {
  console.error('[Training] Error loading module:', event);
});

// Standalone mode: If the app is running outside Qiankun, it will use this code
if (!qiankunWindow.__POWERED_BY_QIANKUN__) {
  logger.debug('[Training] Running in standalone mode');

  // Wait for the DOM to be fully loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      render({});
    });
  } else {
    try {
      render({});
    } catch (error) {
      logger.error('[Training] Error rendering app:', error);
    }
  }
} else {
  logger.debug('[Training] Running inside Qiankun');
  // Qiankun will control the lifecycle
  render({});
}
