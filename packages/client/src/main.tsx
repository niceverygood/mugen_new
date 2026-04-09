import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { useEditorStore } from './store/editorStore';

// Expose store for debugging
(window as any).__editorStore = useEditorStore;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
