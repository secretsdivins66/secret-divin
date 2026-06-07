import { StrictMode, Component, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      const err = this.state.error as Error;
      return (
        <div style={{ minHeight: '100vh', background: '#0a0e2e', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#111a55', border: '1px solid #e53935', borderRadius: '8px', padding: '32px', maxWidth: '600px', width: '100%' }}>
            <h1 style={{ color: '#e53935', marginBottom: '12px', fontSize: '1.2rem' }}>Erreur de chargement</h1>
            <pre style={{ color: '#b0b8d4', fontSize: '0.85rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{err.message}</pre>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
