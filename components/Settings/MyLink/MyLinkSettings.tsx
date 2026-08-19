import React from 'react';
import { BioSection } from './BioSection';
import { MarketingSection } from './MarketingSection';
import { LocationsSection } from './LocationsSection';
import { ServicesSection } from './ServicesSection';
import { PoliciesSection } from './PoliciesSection';
import { ServiceHoursSettings } from '../ServiceHoursSettings';
import { LinkIcon } from '@/components/Icons';
import { useAuth } from '@/contexts/AuthContext';

export const MyLinkSettings = () => {
    const { currentUser } = useAuth();
    return (
        <div className="max-w-4xl mx-auto pb-12">
            <div className="mb-6 border-b border-border/40 pb-4">
                <h2 className="text-base font-black text-foreground uppercase tracking-tight flex items-center">
                    <LinkIcon className="w-5 h-5 mr-2 text-primary/60" />
                    Meu Link (Perfil Público)
                </h2>
                <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest mt-1 opacity-70">
                    Configure seu cartão de visitas digital e regras de agendamento.
                </p>
            </div>

            {/* Warning if Agenda is Closed */}
            {currentUser?.schedulingSettings?.active === false && (
                <div className="mb-8 bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg flex items-start">
                    <div className="mr-3">
                        <svg className="h-6 w-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <div>
                        <h4 className="text-amber-800 font-bold">Agenda Pública Fechada</h4>
                        <p className="text-amber-700 text-sm mt-1">
                            A opção <strong>"Liberar Site de Agendamento"</strong> está desligada.
                            Seu link público mostrará uma mensagem de "Agenda Fechada" para os pacientes.
                            <br />
                            Vá até a seção <a href="#policies" className="underline font-semibold hover:text-amber-900">Controles e Políticas</a> abaixo para ativá-la.
                        </p>
                    </div>
                </div>
            )}

            <div className="space-y-12">
                <section id="bio" className="scroll-mt-6">
                    <BioSection />
                </section>

                <section id="marketing" className="scroll-mt-6">
                    <MarketingSection />
                </section>

                <section id="locations" className="scroll-mt-6">
                    <LocationsSection />
                </section>

                <section id="services" className="scroll-mt-6">
                    <ServicesSection />
                </section>

                <section id="policies" className="scroll-mt-6">
                    <PoliciesSection />
                </section>

                <section id="hours" className="scroll-mt-6">
                    <ServiceHoursSettings />
                </section>
            </div>
        </div>
    );
};
