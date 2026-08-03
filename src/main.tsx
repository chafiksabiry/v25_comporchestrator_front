import React from 'react';
import './public-path'; // For proper Qiankun integration
import { renderWithQiankun, qiankunWindow } from 'vite-plugin-qiankun/dist/helper';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import './i18n';
import { initVisitorTrackingScripts } from '@/lib/tracking/initVisitorTrackingScripts';
import { syncVisitorTracking } from '@/lib/tracking/visitorTracking';

initVisitorTrackingScripts();

let root: ReturnType<typeof createRoot> | null = null;

function resolveRootElement(container?: HTMLElement): HTMLElement | null {
  if (container) {
    let el = container.querySelector('#root') as HTMLElement | null;
    if (!el) {
      el = document.createElement('div');
      el.id = 'root';
      container.appendChild(el);
    }
    return el;
  }
  return document.getElementById('root');
}

function render(props: { container?: HTMLElement } = {}) {
  const { container } = props;
  if (qiankunWindow.__POWERED_BY_QIANKUN__ && !container) {
    return;
  }

  const rootElement = resolveRootElement(container);
  if (!rootElement) {
    console.warn('[company] Root element not found!');
    return;
  }

  syncVisitorTracking();
  if (!root) {
    root = createRoot(rootElement);
  }
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

function destroy() {
  if (!root) return;
  try {
    root.unmount();
  } catch {
    /* ignore */
  }
  root = null;
}

renderWithQiankun({
  bootstrap() {
    return Promise.resolve();
  },
  mount(props: any) {
    if (root) {
      try {
        root.unmount();
      } catch {
        /* ignore */
      }
      root = null;
    }
    render(props);
    return Promise.resolve();
  },
  unmount() {
    destroy();
    return Promise.resolve();
  },
  update() {
    return Promise.resolve();
  },
});

if (!qiankunWindow.__POWERED_BY_QIANKUN__) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => render({}));
  } else {
    render({});
  }
} else {
  console.log('[company] Running inside Qiankun — waiting for mount()');
}
