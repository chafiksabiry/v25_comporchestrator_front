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


// Éviter la redirection si nous sommes déjà sur app1
if (!userId && !window.location.pathname.includes('/app1')) {
  
  window.location.href = "/app1";
} */
const companyId = import.meta.env.VITE_ENV === 'test' 
  ? '6807abfc2c1ca099fe2b13c5'
  : Cookies.get('userId');


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
  
  return Promise.resolve();
}

export async function mount(props: RenderProps) {
  
  render(props);
  return Promise.resolve();
}

export async function unmount(props: RenderProps) {
  
  const { container } = props;
  const rootElement = container
    ? container.querySelector('#root')
    : document.getElementById('root');

  if (rootElement && root) {
    
    root.unmount();
    root = null;
  } else {
    console.warn('[App] Root element not found for unmounting!');
  }
  return Promise.resolve();
}

if (!qiankunWindow.__POWERED_BY_QIANKUN__) {
  
  render({});
} else {
  
  render({});
}
