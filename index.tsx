
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { SystemProvider } from './contexts/SystemContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  public state = { hasError: false, error: null as Error | null };
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', color: 'red', fontFamily: 'monospace', backgroundColor: 'white', height: '100vh', width: '100vw', zIndex: 9999, position: 'fixed', top: 0, left: 0, overflow: 'auto' }}>
          <h1>Something went wrong.</h1>
          <p style={{ fontWeight: 'bold' }}>{this.state.error?.message}</p>
          <pre style={{ backgroundColor: '#fee2e2', padding: '1rem', borderRadius: '0.5rem', marginTop: '1rem' }}>
            {this.state.error?.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <SystemProvider>
        <App />
      </SystemProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('SW registered:', reg))
      .catch(err => console.log('SW error:', err));
  });
}
