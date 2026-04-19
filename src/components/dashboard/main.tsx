import React from 'react';
import './public-path';
import { qiankunWindow } from 'vite-plugin-qiankun/dist/helper';

import { StrictMode } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { Provider } from 'react-redux';
import { ToastContainer } from 'react-toastify';
import { store } from './store';
import App from './App';
import './index.css';
import 'react-toastify/dist/ReactToastify.css';
import Cookies from 'js-cookie';

let root: Root | null = null;

// Vérification de l'authentification avec localStorage
/* const userId = localStorage.getItem('userId');
console.log('Stored user config:', userId);

// Éviter la redirection si nous sommes déjà sur app1
if (!userId && !window.location.pathname.includes('/app1')) {
  console.log('No user config found, redirecting to app1');
  window.location.href = "/app1";
} */
const companyId = import.meta.env.VITE_ENV === 'test' 
  ? '6807abfc2c1ca099fe2b13c5'
  : Cookies.get('userId');
console.log('Stored userId:', companyId);

/*   if (companyId == null){
    window.location.href = "/app1"
  } */

interface RenderProps {
  container?: HTMLElement;
}

function render(props: RenderProps) {
  const { container } = props;
  const rootElement = container
    ? container.querySelector('#root')
    : document.getElementById('root');

  if (!rootElement) {
    console.error('[App] Root element not found! Please ensure #root element exists in the DOM');
    return;
  }

  console.log('[App] Rendering in container:', rootElement);
  if (!root) {
    root = createRoot(rootElement);
  }
  
  try {
    root.render(
      <Provider store={store}>
        <App />
        <ToastContainer />
      </Provider>
    );
  } catch (error) {
    console.error('[App] Error rendering application:', error);
  }
}

export async function bootstrap() {
  console.time('[App] bootstrap');
  console.log('[App] Bootstrapping...');
  return Promise.resolve();
}

export async function mount(props: RenderProps) {
  console.log('[App] Mounting...', props);
  render(props);
  return Promise.resolve();
}

export async function unmount(props: RenderProps) {
  console.log('[App] Unmounting...', props);
  const { container } = props;
  const rootElement = container
    ? container.querySelector('#root')
    : document.getElementById('root');

  if (rootElement && root) {
    console.log('[App] Unmounting from container:', rootElement);
    root.unmount();
    root = null;
  } else {
    console.warn('[App] Root element not found for unmounting!');
  }
  return Promise.resolve();
}
console.log('qiankunWindow', qiankunWindow);
if (!qiankunWindow.__POWERED_BY_QIANKUN__) {
  console.log('[App] Running in standalone mode');
  render({});
} else {
  console.log('[App] Running inside Qiankun');
  render({});
}
