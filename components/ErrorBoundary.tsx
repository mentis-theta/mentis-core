import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { trackEvent } from '../services/telemetryService';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Em dev, loga normalmente. Em prod, apenas envia para telemetria sem vazar detalhes.
        if (import.meta.env.DEV) {
            console.error('[ErrorBoundary]', error, errorInfo);
        }

        trackEvent('app_crash', {
            error_message: error.message,
            component_stack: errorInfo.componentStack?.slice(0, 500) || 'N/A',
        });

        // Auto-reload on chunk load errors (usually happens after a new deployment)
        if (
            error.message.includes('Failed to fetch dynamically imported module') ||
            error.message.includes('Importing a module script failed')
        ) {
            const isReloaded = sessionStorage.getItem('mentis_reloaded_from_error_boundary');
            if (!isReloaded) {
                sessionStorage.setItem('mentis_reloaded_from_error_boundary', 'true');
                window.location.reload();
            }
        }
    }

    private handleReload = () => {
        window.location.reload();
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-background p-4">
                    <div className="max-w-md w-full bg-surface p-8 rounded-[32px] border border-border/40 shadow-sm text-center space-y-6">
                        <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle className="w-8 h-8 text-rose-500" />
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-xl font-black text-foreground uppercase tracking-tight">Ops, encontramos uma instabilidade.</h1>
                            <p className="text-sm font-medium text-foreground-muted opacity-80">
                                Nossa equipe técnica já foi notificada. Por favor, tente recarregar o sistema para continuar.
                            </p>
                        </div>
                        <button
                            onClick={this.handleReload}
                            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 px-6 rounded-full font-bold text-sm transition-all hover:bg-primary/90 active:scale-[0.98]"
                        >
                            <RefreshCcw className="w-4 h-4" />
                            Recarregar Sistema
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
