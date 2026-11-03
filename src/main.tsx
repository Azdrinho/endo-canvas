import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './editor/ErrorBoundary';
import './styles.css';
import { useEditor } from './store/editor';

// Dev-only handle on the real store. A dynamic import of the store module
// from the console resolves to a different URL than the app's (HMR appends a
// query), which yields a second, independent instance -- so driving the
// editor from a script silently puppeteered a phantom copy while the visible
// card never moved. This is the one that is actually on screen.
if (import.meta.env.DEV) {
  (window as unknown as { __editor?: typeof useEditor }).__editor = useEditor;
}

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
