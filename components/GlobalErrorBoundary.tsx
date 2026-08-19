import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import Button from './Button';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error in React tree:', error, errorInfo);
        // Aqui poderíamos futuramente integrar Sentry ou um serviço de log
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: null });
        window.location.href = '/dashboard';
    };

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }
            
            return (
                <div className="flex h-screen w-full items-center justify-center bg-background p-4 text-foreground">
                    <div className="relative max-w-md w-full bg-surface border border-border/40 rounded-2xl p-8 shadow-xl text-center flex flex-col items-center">
                        <div className="bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 p-4 rounded-full mb-6">
                            <AlertTriangle className="w-12 h-12" />
                        </div>
                        <h2 className="text-2xl font-bold text-on-surface mb-2">Ops! Algo deu errado.</h2>
                        <p className="text-foreground-muted mb-8 text-sm">
                            Encontramos um erro inesperado e não conseguimos renderizar esta página. 
                            Nossa equipe técnica já foi notificada.
                        </p>
                        
                        <Button 
                            onClick={this.handleReset} 
                            variant="primary" 
                            className="w-full flex items-center justify-center gap-2"
                        >
                            <RefreshCcw className="w-4 h-4" />
                            Recarregar Aplicação
                        </Button>
                        
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <div className="mt-6 p-4 bg-slate-900 rounded-lg overflow-auto max-h-48 text-left w-full">
                                <p className="text-red-400 font-mono text-xs whitespace-pre-wrap break-words">
                                    {this.state.error.toString()}
                                </p>
                            </div>
                        )}
                        
                        <div className="absolute bottom-2 right-4 text-[10px] text-slate-500/50 font-mono tracking-wider pointer-events-none">
                            [ERR-CRASH-BOUNDARY]
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
