import React from 'react';
import './public-path';  // For proper Qiankun integration
import { qiankunWindow } from 'vite-plugin-qiankun/dist/helper';

import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';



// Store the root instance for proper unmounting
let root: ReturnType<typeof createRoot> | null = null;

function render(props: { container?: HTMLElement }) {
  const { container } = props;
  const rootElement = container
    ? container.querySelector('#root')
    : document.getElementById('root');

  if (rootElement) {
    
    // Create the root instance if it doesn't exist
    if (!root) {
      root = createRoot(rootElement);
    }
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } else {
    console.warn('[app11] Root element not found!');
  }
}

export async function bootstrap() {
  console.time('[app11] bootstrap');
  
  return Promise.resolve();
}

export async function mount(props: any) {
  
  const { container } = props;
  if (container) {
    
  } else {
    console.warn('[app11] No container found for mounting');
  }
  render(props);
  return Promise.resolve();
}

export async function unmount(props: any) {
  
  const { container } = props;
  const rootElement = container
    ? container.querySelector('#root')
    : document.getElementById('root');

  if (rootElement && root) {
    
    root.unmount();
    root = null;  // Reset the root instance
  } else {
    console.warn('[app11] Root element not found for unmounting!');
  }
  return Promise.resolve();
}

// Standalone mode: If the app is running outside Qiankun, it will use this code
if (!qiankunWindow.__POWERED_BY_QIANKUN__) {
  
  
  // Wait for the DOM to be fully loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      render({});
    });
  } else {
    try {
      render({});
    } catch (error) {
      console.error('[app11] Error rendering app:', error);
    }
  }
} else {
  
  // Qiankun will control the lifecycle via mount, but we ensure initial render
  render({});
}
