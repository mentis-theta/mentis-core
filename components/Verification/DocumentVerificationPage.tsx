import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/services/supabaseClient';
import { ShieldCheck, ShieldAlert, FileText, Calendar, User, CheckCircle } from 'lucide-react';
import Button from '@/components/Button';

interface DocumentMetadata {
    patientInitials: string;
    psychologistName: string;
    psychologistCrp: string;
    issueDate: string;
    validityString?: string;
}

interface VerificationResult {
    id: string;
    status: 'draft' | 'sealed' | 'revoked';
    type: string;
    metadata: DocumentMetadata;
    created_at: string;
    updated_at: string;
    revocation_reason?: string;
}

const DocumentVerificationPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [result, setResult] = useState<VerificationResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const verifyDoc = async () => {
            if (!id) return;
            try {
                // Chama a RPC cega
                const { data, error: rpcError } = await supabase.rpc('verify_clinical_document', { doc_id: id });
                
                if (rpcError) throw rpcError;
                if (!data) throw new Error('Documento não encontrado no registro oficial.');
                
                setResult(data as VerificationResult);
            } catch (err: any) {
                console.error('Erro ao verificar documento:', err);
                setError('Este código de verificação é inválido ou o documento não existe.');
            } finally {
                setLoading(false);
            }
        };
        verifyDoc();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="mt-4 text-slate-500 font-medium">Autenticando documento no Mentis Trust Center...</p>
            </div>
        );
    }

    if (error || !result) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-red-100">
                    <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <ShieldAlert className="w-10 h-10" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">Documento Inválido</h1>
                    <p className="text-slate-600 mb-8">{error}</p>
                    <Button onClick={() => navigate('/')} className="w-full">Voltar para o Início</Button>
                </div>
            </div>
        );
    }

    const isRevoked = result.status === 'revoked';
    const isDraft = result.status === 'draft'; // Drafts shouldn't usually have a QR code, but just in case.

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 md:p-8">
            <div className="max-w-xl w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
                {/* Header */}
                <div className={`p-8 text-center text-white ${isRevoked ? 'bg-red-600' : isDraft ? 'bg-amber-500' : 'bg-emerald-600'}`}>
                    <div className="flex justify-center mb-4">
                        {isRevoked ? <ShieldAlert className="w-16 h-16 opacity-90" /> : <ShieldCheck className="w-16 h-16 opacity-90" />}
                    </div>
                    <h1 className="text-3xl font-bold mb-2">
                        {isRevoked ? 'Documento Revogado' : isDraft ? 'Documento em Rascunho' : 'Documento Autêntico'}
                    </h1>
                    <p className="text-white/80 font-medium">
                        {isRevoked 
                            ? 'Este documento foi cancelado pelo emissor e não tem mais validade.' 
                            : isDraft 
                            ? 'Este documento ainda não foi assinado digitalmente.' 
                            : 'Este registro foi selado criptograficamente e tem sua origem comprovada.'}
                    </p>
                </div>

                {/* Content */}
                <div className="p-8">
                    <div className="space-y-6">
                        <div className="flex items-start gap-4">
                            <div className="bg-slate-100 p-3 rounded-xl text-slate-500"><FileText className="w-6 h-6" /></div>
                            <div>
                                <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Tipo de Documento</p>
                                <p className="text-lg font-bold text-slate-800 capitalize">{result.type}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="bg-slate-100 p-3 rounded-xl text-slate-500"><User className="w-6 h-6" /></div>
                            <div>
                                <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Paciente</p>
                                <p className="text-lg font-bold text-slate-800">{result.metadata.patientInitials || '***'}</p>
                                <p className="text-xs text-slate-500 mt-1">Nome mascarado em conformidade com a LGPD</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="bg-slate-100 p-3 rounded-xl text-slate-500"><CheckCircle className="w-6 h-6" /></div>
                            <div>
                                <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Emitido Por</p>
                                <p className="text-lg font-bold text-slate-800">{result.metadata.psychologistName || 'Profissional'}</p>
                                <p className="text-sm font-medium text-slate-600">CRP: {result.metadata.psychologistCrp || 'Não informado'}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="bg-slate-100 p-3 rounded-xl text-slate-500"><Calendar className="w-6 h-6" /></div>
                            <div>
                                <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Data de Emissão</p>
                                <p className="text-lg font-bold text-slate-800">
                                    {new Date(result.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                </p>
                            </div>
                        </div>

                        {isRevoked && result.revocation_reason && (
                            <div className="mt-8 p-4 bg-red-50 border border-red-100 rounded-xl">
                                <p className="text-sm font-bold text-red-900 mb-1">Motivo da Revogação</p>
                                <p className="text-sm text-red-800">{result.revocation_reason}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Security Badge */}
                <div className="bg-slate-50 p-6 border-t border-slate-100 text-center">
                    <p className="text-xs text-slate-500 font-medium">
                        Verificado por Mentis Trust Center &copy; {new Date().getFullYear()}
                        <br/>ID: {result.id}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default DocumentVerificationPage;
