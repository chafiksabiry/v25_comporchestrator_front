import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { registerMicroApps, start, initGlobalState } from 'qiankun';
import './index.css';
import 'systemjs';

const initialState = { userId: null };
const actions = initGlobalState(initialState);

// Listen for changes (for debugging)
// actions.onGlobalStateChange((state, /*prev*/) => {
//   
// });

// 

// Register microfrontends
registerMicroApps([
  {
    name: 'app1',
    entry: 'https://harx25register.netlify.app/',
    container: '#container-app1',
    activeRule: '/app1',
    props: {
      sandbox: {
        experimentalStyleIsolation: true,
      },
      actions,
    },
  },
  // ... autres apps ...
  {
    name: 'app6',
    entry: 'https://harxv25gigcreationfrontend.netlify.app/',
    container: '#container-app6',
    activeRule: '/app6',
    props: {
      sandbox: {
        experimentalStyleIsolation: true,
      },
      actions,
    },
  },
  {
    name: 'repdashboard',
    entry: 'https://harxv25dashboardrepfront.netlify.app/',
    container: '#container-app8',
    activeRule: '/repdashboard/*',
    props: {
      sandbox: {
        experimentalStyleIsolation: true,
      },
      actions,
    },
  },
  // ... autres apps ...
]);

const startQiankun = async () => {
  try {
    start({
      prefetch: true,
      sandbox: {
        strictStyleIsolation: true,
        experimentalStyleIsolation: true,
      },
      singular: false,
      fetch: (url, options) => {
        // 
        return fetch(url, {
          ...options,
          mode: "cors",
        });
      },
    });
    // 
  } catch (error) {
    console.error('[Host] Failed to start Qiankun:', error);
  }
};

// Mount host app first
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('[Host] Root element not found');
}

const root = ReactDOM.createRoot(rootElement);
root.render(<App />);

// Start Qiankun after host app is mounted
startQiankun();

// Add debug logs for route changes
// window.addEventListener('popstate', () => {
//   
// }); 
