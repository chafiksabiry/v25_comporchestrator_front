import React from 'react';
import { qiankunWindow, renderWithQiankun } from 'vite-plugin-qiankun/dist/helper';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

let root: ReturnType<typeof createRoot> | null = null;

function render(props: any) {
  const { container } = props;
  const rootElement = container
    ? container.querySelector('#root')
    : document.getElementById('root');

  if (rootElement) {
    if (!root) {
      root = createRoot(rootElement);
    }
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  }
}

renderWithQiankun({
  mount(props) {
    console.log('[app11] mounting with qiankun', props);
    render(props);
  },
  bootstrap() {
    console.log('[app11] bootstrapping');
  },
  unmount(props: any) {
    console.log('[app11] unmounting', props);
    root?.unmount();
    root = null;
  },
  update(props: any) {
    console.log('[app11] updating', props);
  }
});

// Standalone mode
if (!qiankunWindow.__POWERED_BY_QIANKUN__) {
  render({});
}
