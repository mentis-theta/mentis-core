import React from 'react';
import { useNavigate } from 'react-router-dom';

const PrivacyPolicy: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col p-6">
            <div className="max-w-3xl mx-auto w-full bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-slate-200">
                <button 
                    onClick={() => navigate(-1)} 
                    className="mb-8 text-blue-600 font-medium hover:underline flex items-center gap-2"
                >
                    &larr; Voltar
                </button>
                <h1 className="text-3xl font-bold text-slate-900 mb-6">Política de Privacidade</h1>
                <div className="prose prose-slate max-w-none text-slate-700 space-y-4">
                    <p><strong>Última atualização:</strong> {new Date().toLocaleDateString('pt-BR')}</p>
                    <p>A proteção da sua privacidade é fundamental para o Mentis. Esta Política detalha como processamos seus dados em conformidade com a Lei Geral de Proteção de Dados Pessoais (LGPD - Lei nº 13.709/2018).</p>
                    <h2 className="text-xl font-bold text-slate-900 mt-6">1. Coleta e Tratamento de Dados Pessoais Sensíveis</h2>
                    <p>Coletamos informações necessárias estritamente para os fins de agendamento e composição de prontuário, como nome, contato e histórico de sessões. O tratamento destes dados visa unicamente resguardar a qualidade do serviço terapêutico.</p>
                    <h2 className="text-xl font-bold text-slate-900 mt-6">2. Armazenamento e Criptografia</h2>
                    <p>Todos os dados são mantidos de forma segura utilizando as práticas líderes da indústria de saúde digital com criptografia em trânsito e em repouso. O sigilo profissional é garantido tecnicamente de forma que a equipe do Mentis não possui acesso irrestrito aos conteúdos clínicos.</p>
                    <h2 className="text-xl font-bold text-slate-900 mt-6">3. Compartilhamento de Informações</h2>
                    <p>O Mentis compromete-se a não vender ou compartilhar dados pessoais dos pacientes com terceiros para fins de marketing ou publicidade. Compartilhamentos só ocorrerão sob determinação legal explícita.</p>
                    <h2 className="text-xl font-bold text-slate-900 mt-6">4. Seus Direitos</h2>
                    <p>Você tem total direito sobre seus dados. A qualquer momento, solicitando ao profissional de saúde responsável, é possível solicitar a retificação, a portabilidade ou a exclusão dos dados nos limites prescritos na legislação vigente de guarda clínica.</p>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
