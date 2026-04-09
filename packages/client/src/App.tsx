import React, { useEffect } from 'react';
import Editor from './pages/Editor';
import { useEditorStore } from './store/editorStore';

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {error: Error | null}> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, color: '#f85149', background: '#0d1117', height: '100vh', fontFamily: 'monospace' }}>
          <h2>Error</h2>
          <pre style={{ whiteSpace: 'pre-wrap', color: '#c9d1d9' }}>{this.state.error.message}</pre>
          <pre style={{ whiteSpace: 'pre-wrap', color: '#8b949e', fontSize: 11 }}>{this.state.error.stack}</pre>
          <button onClick={() => window.location.reload()} style={{ marginTop: 20, padding: '8px 16px', background: '#238636', border: 'none', color: '#fff', borderRadius: 6, cursor: 'pointer' }}>
            새로고침
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  useEffect(() => {
    (window as any).__editorStore = useEditorStore;
  }, []);
  return <ErrorBoundary><Editor /></ErrorBoundary>;
}
