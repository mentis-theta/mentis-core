import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
    children: ReactNode;
    fallbackMessage?: string;
    onReset?: () => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class GranularErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('[GranularErrorBoundary] Caught error:', error, errorInfo);
        // Here you would typically log to Sentry or another telemetry service
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: null });
        if (this.props.onReset) {
            this.props.onReset();
        }
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="w-full h-full min-h-[200px] flex items-center justify-center p-6 bg-surface/50 border border-border/40 rounded-2xl animate-pulse-soft">
                    <div className="flex flex-col items-center text-center max-w-sm">
                        <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center mb-4">
                            <AlertTriangle className="w-6 h-6 text-amber-500" />
                        </div>
                        <h3 className="text-sm font-semibold text-foreground mb-2">
                            {this.props.fallbackMessage || 'Erro ao carregar componente.'}
                        </h3>
                        <p className="text-xs text-foreground-muted mb-6">
                            Ocorreu uma falha isolada nesta área. O restante do sistema continua funcional.
                        </p>
                        <button
                            onClick={this.handleReset}
                            className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-full text-xs font-medium transition-colors"
                        >
                            <RefreshCcw className="w-3 h-3" />
                            Tentar Novamente
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
