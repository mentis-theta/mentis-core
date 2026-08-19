import React from 'react';
import { useNavigate } from 'react-router-dom';

const TermsOfUse: React.FC = () => {
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
                <h1 className="text-3xl font-bold text-slate-900 mb-6">Termos de Uso</h1>
                <div className="prose prose-slate max-w-none text-slate-700 space-y-4">
                    <p><strong>Última atualização:</strong> {new Date().toLocaleDateString('pt-BR')}</p>
                    <p>Bem-vindo ao Mentis. Estes Termos de Uso regem a utilização da nossa plataforma de gestão e agendamento para profissionais de saúde.</p>
                    <h2 className="text-xl font-bold text-slate-900 mt-6">1. Aceitação dos Termos</h2>
                    <p>Ao utilizar o Mentis, você concorda com estes termos. O serviço destina-se a facilitar a gestão de pacientes, incluindo agendamentos, prontuários, e comunicação mútua baseada no sigilo profissional.</p>
                    <h2 className="text-xl font-bold text-slate-900 mt-6">2. Sigilo Prontuário e Segurança</h2>
                    <p>Garantimos que todas as informações de saúde transitadas pela plataforma contam com criptografia de ponta a ponta e são de acesso exclusivo do profissional de saúde responsável, em respeito às normativas do Conselho Federal de Psicologia e outras entidades regulamentadoras.</p>
                    <h2 className="text-xl font-bold text-slate-900 mt-6">3. Responsabilidades do Profissional</h2>
                    <p>O profissional de saúde é o único responsável legal pela guarda das informações, devendo utilizar os recursos do sistema em concordância com a LGPD e o sigilo decorrente de sua profissão.</p>
                    <h2 className="text-xl font-bold text-slate-900 mt-6">4. Modificações no Serviço</h2>
                    <p>O Mentis reserva-se o direito de atualizar continuamente o software, podendo adicionar ou remover funcionalidades com o objetivo de melhorar a experiência e a segurança dos usuários.</p>
                </div>
            </div>
        </div>
    );
};

export default TermsOfUse;
