import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './button';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorCount: number;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private timeoutId?: NodeJS.Timeout;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorCount: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    console.error('Error stack:', error.stack);
    console.error('Component stack:', errorInfo.componentStack);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    
    // Check if this is the useAuth context error
    if (error.message.includes('useAuth must be used within an AuthProvider')) {
      console.error('Auth context error detected - this may be a timing issue');
      // For auth context errors, don't auto-retry as it may be a structural issue
      this.setState(prevState => ({ 
        errorCount: 10 // Set high to prevent auto-retry
      }));
      return;
    }
    
    // Increment error count
    this.setState(prevState => ({ 
      errorCount: prevState.errorCount + 1 
    }));

    // Auto-retry after 3 seconds for first few errors
    if (this.state.errorCount < 3) {
      this.timeoutId = setTimeout(() => {
        this.resetError();
      }, 3000);
    }
  }

  componentWillUnmount() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  }

  resetError = () => {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      const { fallback: Fallback } = this.props;
      
      if (Fallback && this.state.error) {
        return <Fallback error={this.state.error} resetError={this.resetError} />;
      }

      // Show auto-retry message for first few errors
      const showAutoRetry = this.state.errorCount < 3;

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="text-center space-y-4 max-w-md">
            <AlertTriangle className="h-16 w-16 text-destructive mx-auto" />
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Algo deu errado
              </h2>
              <p className="text-muted-foreground mb-4">
                {showAutoRetry 
                  ? "Ocorreu um erro. Tentando reconectar automaticamente..."
                  : "Ocorreu um erro inesperado. Tente recarregar a página."
                }
              </p>
              {showAutoRetry && (
                <div className="mb-4">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto text-primary" />
                </div>
              )}
              <div className="space-x-4">
                <Button onClick={this.resetError} variant="outline">
                  Tentar novamente
                </Button>
                <Button onClick={() => window.location.reload()}>
                  Recarregar página
                </Button>
              </div>
              {this.state.error && (
                <details className="mt-4 text-left">
                  <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                    Detalhes do erro
                  </summary>
                  <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                    {this.state.error.message}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}