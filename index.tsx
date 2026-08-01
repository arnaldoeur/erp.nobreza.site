
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { SystemProvider } from './contexts/SystemContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

interface ErrorBoundaryProps { children: React.ReactNode }
interface ErrorBoundaryState { hasError: boolean; error: Error | null }

/**
 * Rede de segurança para erros de renderização.
 *
 * Em produção mostra uma mensagem legível e um botão para recarregar. O
 * rastreio da pilha só aparece em desenvolvimento — apresentá-lo ao
 * utilizador final revela a estrutura interna da aplicação e não o ajuda em
 * nada.
 */
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[erro] Falha na renderização:', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
        <div style={{ maxWidth: '32rem', margin: '4rem auto', backgroundColor: 'white', padding: '2rem', borderRadius: '1rem', border: '1px solid #e2e8f0' }}>
          <h1 style={{ fontSize: '1.25rem', color: '#0f172a', marginBottom: '0.75rem' }}>Ocorreu um erro inesperado</h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            A aplicação encontrou um problema e não conseguiu continuar. Recarregue a página.
            Se o erro se repetir, contacte o suporte.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', fontWeight: 600, cursor: 'pointer' }}
          >
            Recarregar
          </button>
          {import.meta.env.DEV && (
            <pre style={{ backgroundColor: '#fef2f2', color: '#991b1b', padding: '1rem', borderRadius: '0.5rem', marginTop: '1.5rem', fontSize: '0.75rem', overflow: 'auto' }}>
              {this.state.error?.stack}
            </pre>
          )}
        </div>
      </div>
    );
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
