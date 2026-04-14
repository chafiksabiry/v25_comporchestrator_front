import React from 'react';
import { StrictMode } from 'react';
import { createRoot, Root } from 'react-dom/client';
import App from './App';
import './index.css';
import './public-path'; // For Qiankun public path setup
import 'systemjs';
import Cookies from 'js-cookie';

// Keep a reference to the React Root instance
let root: Root | null = null;

// Function to render the React app
function render(props: { container?: HTMLElement }) {
  const { container } = props;
  const rootElement = container
    ? container.querySelector('#root') // Use the container provided by Qiankun
    : document.getElementById('root'); // Fallback for standalone mode

  if (!rootElement) {
    console.warn('[App] Root element not found!');
    return;
  }

  console.log('[App] Rendering in container:', rootElement);

  // Initialize React root if not already created
  if (!root) {
    root = createRoot(rootElement);
  }

  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

// Standalone mode check (if running outside Qiankun)
if (!window.__POWERED_BY_QIANKUN__) {
  console.log('[App] Running in standalone mode');
  
  // Set user ID and company ID cookies in standalone mode
  const userId = Cookies.get('userId') || "680a27ffefa3d29d628d0016";
  const companyId = Cookies.get('companyId') || "684ace43641398dc582f1acc"; // Default company ID from GigForm.tsx

  if (userId) {
    console.log('[App] Setting user ID cookie:', userId);
    Cookies.set('userId', userId);
  } else {
    console.warn('[App] VITE_USER_ID environment variable not set');
  }

  if (companyId) {
    console.log('[App] Setting company ID cookie:', companyId);
    Cookies.set('companyId', companyId);
  } else {
    console.warn('[App] VITE_COMPANY_ID environment variable not set');
  }
  
  render({});
}

// Qiankun lifecycle methods
export async function bootstrap() {
  console.log('[App] Bootstrapping...');
  console.log('beforeLoad hook triggered');
  // You can add any setup needed for bootstrapping here
}

export async function mount(props: any) {
  console.log('[App] Mounting...', props);
  console.log('beforeMount hook triggered');
  render(props); // Mount the app
}

export async function unmount(props: any) {
  console.log('[App] Unmounting...', props);
  console.log('afterUnmount hook triggered');

  const { container } = props;
  const rootElement = container
    ? container.querySelector('#root') // Find root in the container
    : document.getElementById('root'); // Fallback for standalone mode

  if (root) {
    console.log('[App] Unmounting from container:', rootElement);
    root.unmount();
    root = null;
  } else {
    console.warn('[App] React Root instance not found for unmounting!');
  }
}