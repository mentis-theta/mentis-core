import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { ValidationIssue } from '@/types';

interface RiskEscalationBannerProps {
    issues: ValidationIssue[];
}

export const RiskEscalationBanner: React.FC<RiskEscalationBannerProps> = ({ issues }) => {
    // Foca apenas nos alertas gerados pelo Longitudinal Validator (ex: RISK_ESCALATION_DETECTED)
    const fatalIssues = issues.filter(issue => issue.severity === 'fatal' || issue.severity === 'high');

    if (fatalIssues.length === 0) return null;

    return (
        <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-md shadow-sm mb-6 animate-pulse-soft">
            <div className="flex items-start">
                <div className="flex-shrink-0">
                    <AlertTriangle className="h-6 w-6 text-rose-500" />
                </div>
                <div className="ml-3">
                    <h3 className="text-sm font-bold text-rose-800">
                        Atenção Clínica Necessária
                    </h3>
                    <div className="mt-2 text-sm text-rose-700">
                        <ul className="list-disc pl-5 space-y-1">
                            {fatalIssues.map((issue, idx) => (
                                <li key={idx}>
                                    <strong>{issue.code}:</strong> {issue.message}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="mt-3 text-xs text-rose-600 font-medium">
                        Recomenda-se revisão imediata do rascunho e avaliação de conduta clínica antes da geração do documento final.
                    </div>
                </div>
            </div>
        </div>
    );
};
