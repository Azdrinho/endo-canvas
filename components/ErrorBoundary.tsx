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
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#101010] p-6 text-white">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1a1a1a] p-6 shadow-2xl">
          <h1 className="text-lg font-bold">Algo quebrou nesta tela</h1>
          <p className="mt-2 text-sm text-white/60">
            Seus dados estão salvos — nada foi perdido. Recarregar costuma resolver.
          </p>

          <pre className="mt-4 max-h-32 overflow-auto rounded-lg bg-black/40 p-3 text-[11px] leading-relaxed text-white/50">
            {error.message || String(error)}
          </pre>

          <div className="mt-5 flex gap-2">
            <button
              onClick={() => window.location.reload()}
              className="flex-1 rounded-full bg-white px-4 py-2 text-sm font-bold text-black transition-opacity hover:opacity-85"
            >
              Recarregar
            </button>
            <button
              onClick={() => this.setState({ error: null })}
              className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10"
            >
              Tentar de novo
            </button>
          </div>
        </div>
      </div>
    );
  }
}
