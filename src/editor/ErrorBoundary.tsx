import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

// Without this, any thrown error anywhere in the tree unmounts the whole app
// and leaves a blank white page -- no message, no way back, and for a tool
// people use for real work that reads as "the system is down". React has no
// hook equivalent for this, so it has to be a class.
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Kept as console.error on purpose: the production build strips
    // console.log but keeps warn/error, and this is exactly the case where a
    // stack in the user's devtools is what makes a bug report actionable.
    console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', background: '#0E0E10', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 420, background: '#151518', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 24 }}>
          <h1 style={{ margin: 0, fontSize: 16, color: '#F2F2F4' }}>Algo quebrou nesta tela</h1>
          <p style={{ margin: '8px 0 0', fontSize: 13, lineHeight: 1.5, color: '#8A8A94' }}>
            Nada do seu trabalho foi perdido. Recarregar costuma resolver.
          </p>
          <pre style={{ margin: '16px 0 0', maxHeight: 128, overflow: 'auto', background: 'rgba(0,0,0,0.4)', borderRadius: 10, padding: 12, fontSize: 11, lineHeight: 1.5, color: 'rgba(242,242,244,0.6)' }}>
            {error.message || String(error)}
          </pre>
          <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
            <button onClick={() => window.location.reload()} style={{ flex: 1, padding: '10px 16px', borderRadius: 999, border: 'none', background: '#FFFFFF', color: '#101013', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              Recarregar
            </button>
            <button onClick={() => this.setState({ error: null })} style={{ padding: '10px 16px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'rgba(242,242,244,0.8)', fontSize: 13, cursor: 'pointer' }}>
              Tentar de novo
            </button>
          </div>
        </div>
      </div>
    );
  }
}
