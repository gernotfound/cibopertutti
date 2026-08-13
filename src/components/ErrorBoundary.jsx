import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Errore catturato da ErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a0a',
          color: '#fff',
          textAlign: 'center',
          padding: '2rem'
        }}>
          <h1 style={{fontSize: '4rem', margin: '0 0 1rem 0'}}>🛠️</h1>
          <h2 style={{color: '#ff3366'}}>Ops! Qualcosa è andato storto.</h2>
          <p style={{color: '#aaa', maxWidth: '400px', marginBottom: '2rem'}}>
            C'è stato un problema imprevisto. Ricarica la pagina per riprovare.
          </p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              background: '#fff',
              color: '#000',
              border: 'none',
              padding: '0.8rem 2rem',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            RICARICA PAGINA
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
