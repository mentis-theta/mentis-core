import type { TemplateDefinition, DocumentVariables, Patient, User } from '@/types';
import { formatDate, capitalizeName } from '@/utils/formatters';
import { differenceInYears } from 'date-fns';
import { CFP_GUIDELINES } from '@/services/prompts';
import { FileText, ClipboardList, Send, FileBarChart, Microscope } from 'lucide-react';
import React from 'react';

/**
 * Template Definitions for DocStation
 * CFP Resolution 06/2019 Compliant
 */

export const TEMPLATES: TemplateDefinition[] = [
    {
        id: 'atestado',
        name: 'Atestado Psicológico',
        description: 'Documento que atesta uma condição psicológica (estado mental, aptidão ou inaptidão)',
        icon: React.createElement(FileText, { className: "w-6 h-6 text-blue-500" }),
        structure: 'simple',
        defaultContent: `Atesto para os devidos fins que {PACIENTE_NOME}, portador(a) do CPF {PACIENTE_CPF}, apresenta [descrever condição psicológica, estado mental, aptidão/inaptidão].`,
        aiPrompt: `Gere um ATESTADO PSICOLÓGICO profissional.
Formato: "Atesto para os devidos fins que [NOME] apresenta [condição/aptidão]."
Mantenha formal e focado na condição psicológica, não em comparecimento.`
    },
    {
        id: 'declaracao',
        name: 'Declaração de Comparecimento',
        description: 'Declaração formal de presença em sessão',
        icon: React.createElement(ClipboardList, { className: "w-6 h-6 text-emerald-500" }),
        structure: 'simple',
        defaultContent: `Declaro para os devidos fins que {PACIENTE_NOME}, portador(a) do CPF {PACIENTE_CPF}, esteve presente em atendimento psicológico no dia {DATA_HOJE}.

Finalidade: [Inserir finalidade, ex: comprovação trabalhista/escolar]`,
        aiPrompt: `Gere uma DECLARAÇÃO DE COMPARECIMENTO formal.
Formato: "Declaro para os devidos fins que [NOME], portador(a) do CPF [CPF], esteve presente em atendimento psicológico."
Seja conciso e profissional.`
    },
    {
        id: 'encaminhamento',
        name: 'Encaminhamento',
        description: 'Encaminhamento para outro profissional ou instituição',
        icon: React.createElement(Send, { className: "w-6 h-6 text-amber-500" }),
        structure: 'simple',
        defaultContent: `Encaminho o(a) paciente {PACIENTE_NOME}, portador(a) do CPF {PACIENTE_CPF}, para avaliação e acompanhamento.

Motivo do Encaminhamento:
[Descreva aqui o motivo do encaminhamento]

Observações:
[Informações clínicas relevantes]`,
        aiPrompt: `Gere um ENCAMINHAMENTO profissional baseado no histórico clínico.
Inclua:
- Motivo do encaminhamento (baseado nas sessões e diagnóstico)
- Observações clínicas relevantes
- Solicitação específica ao profissional/instituição destinatária

Seja técnico mas acessível.`
    },
    {
        id: 'relatorio',
        name: 'Relatório Psicológico',
        description: 'Relatório narrativo sobre o acompanhamento',
        icon: React.createElement(FileBarChart, { className: "w-6 h-6 text-purple-500" }),
        structure: 'structured',
        sections: [
            {
                id: '1. IDENTIFICAÇÃO',
                title: '1. IDENTIFICAÇÃO',
                allowedFacts: { types: ['PatientInfo'] },
                systemPrompt: 'Escreva a identificação da pessoa atendida, finalidade do documento e autoria.'
            },
            {
                id: '2. EXAME DO ESTADO MENTAL',
                title: '2. EXAME DO ESTADO MENTAL',
                allowedFacts: { types: ['Observation'] },
                systemPrompt: 'Descreva a orientação, aparência, humor, afeto, pensamento, atenção e memória da pessoa.'
            },
            {
                id: '3. DESCRIÇÃO DA DEMANDA',
                title: '3. DESCRIÇÃO DA DEMANDA',
                allowedFacts: { types: ['Report'] },
                systemPrompt: 'Descreva a queixa principal e o contexto que levou à busca pelo acompanhamento psicológico.'
            },
            {
                id: '4. PROCEDIMENTOS',
                title: '4. PROCEDIMENTOS',
                allowedFacts: { origins: ['psychometric', 'test', 'psychologist'] },
                systemPrompt: 'Especifique os métodos utilizados, instrumentos psicométricos, técnicas e número de encontros realizados.'
            },
            {
                id: '5. ANÁLISE CLÍNICA',
                title: '5. ANÁLISE CLÍNICA',
                allowedFacts: { types: ['Symptom', 'Behavior'] },
                systemPrompt: 'Apresente a análise clínica dos dados coletados, focando em funcionalidade e impacto na vida do paciente. Mantenha o texto impessoal na terceira pessoa.'
            },
            {
                id: '6. CONCLUSÃO',
                title: '6. CONCLUSÃO',
                allowedFacts: { origins: ['clinicalInference'] },
                systemPrompt: 'Sintetize os achados, responda à demanda inicial e estabeleça os objetivos ou encaminhamentos. OBRIGATÓRIO constar a validade temporal do documento no final.'
            }
        ],
        structuredTemplate: {
            '1. IDENTIFICAÇÃO': `Paciente: {PACIENTE_NOME}\nIdade: {PACIENTE_IDADE} anos\nCPF: {PACIENTE_CPF}\nSolicitante: [Nome do solicitante]\n\nPsicólogo(a) Responsável: {PSI_NOME}\nCRP: {PSI_CRP}\n\nFinalidade: Documentação do estado psicológico e funcional atual da paciente para eventual utilização perante órgãos administrativos e previdenciários.`,
            '2. EXAME DO ESTADO MENTAL': `[Descreva: Orientação, aparência, humor, afeto, pensamento, atenção, memória]`,
            '3. DESCRIÇÃO DA DEMANDA': `[Descreva a queixa principal e o contexto do acompanhamento temporário ou contínuo]`,
            '4. PROCEDIMENTOS': `[Descreva os métodos utilizados: número de sessões, técnicas aplicadas, instrumentos psicométricos]`,
            '5. ANÁLISE CLÍNICA': `[Apresente a análise clínica dos dados coletados durante os atendimentos. Se atente à funcionalidade e não apenas à gravidade dos sintomas]`,
            '6. CONCLUSÃO': `[Apresente as conclusões, resultados do acompanhamento e recomendações focadas em reabilitação]\n\nAs informações contidas neste documento possuem validade de [XX] dias/meses a partir da data de emissão, considerando a natureza dinâmica e não cristalizada dos fenômenos psicológicos avaliados.`
        },
        aiPrompt: `Gere um RELATÓRIO PSICOLÓGICO estruturado em 6 seções.

RETORNE OBRIGATORIAMENTE UM OBJETO JSON VÁLIDO.
As chaves do JSON devem ser EXATAMENTE estas (incluindo numeração):
"1. IDENTIFICAÇÃO" (Dados do paciente e Finalidade)
"2. EXAME DO ESTADO MENTAL" (Orientação, aparência, humor, afeto, pensamento, atenção, memória. OBRIGATÓRIO)
"3. DESCRIÇÃO DA DEMANDA" (Queixa principal e contexto)
"4. PROCEDIMENTOS" (Métodos utilizados: número de sessões, técnicas, período, instrumentos psicométricos aplicados. Explicite limitações se houver poucas sessões)
"5. ANÁLISE CLÍNICA" (Análise clínica fundamentada dos dados. Foque na limitação funcional e correlação clínica, não apenas em adjetivos de gravidade. Descreva autorrelatos como "Segundo relato da paciente" e observações como "Observou-se")
"6. CONCLUSÃO" (Conclusões, objetivos terapêuticos e foco em prognóstico/reabilitação. OBRIGATÓRIO: Ao final do texto desta seção, inclua o parágrafo de validade temporal: "As informações contidas neste documento possuem validade de [XX] dias a partir da data de emissão, considerando a natureza dinâmica e não cristalizada dos fenômenos psicológicos avaliados.")

Os valores devem ser os textos correspondentes a cada seção, bem redigidos e formatados. Não inclua texto fora do bloco JSON.
Use linguagem técnica e profissional. Nunca invente escores para os testes, apenas use se fornecidos.`
    },
    {
        id: 'laudo',
        name: 'Laudo Psicológico',
        description: 'Laudo estruturado conforme CFP 06/2019 (6 seções)',
        icon: React.createElement(Microscope, { className: "w-6 h-6 text-indigo-500" }),
        structure: 'structured',
        sections: [
            {
                id: '1. IDENTIFICAÇÃO',
                title: '1. IDENTIFICAÇÃO',
                allowedFacts: { types: ['PatientInfo'] },
                systemPrompt: 'Escreva a identificação detalhada da pessoa avaliada, solicitante, finalidade do documento e autoria.'
            },
            {
                id: '2. EXAME DO ESTADO MENTAL',
                title: '2. EXAME DO ESTADO MENTAL',
                allowedFacts: { types: ['Observation'] },
                systemPrompt: 'Descreva o estado mental atual do indivíduo de forma técnica: orientação, afeto, pensamento, atenção, sensopercepção, memória e inteligência.'
            },
            {
                id: '3. DESCRIÇÃO DA DEMANDA',
                title: '3. DESCRIÇÃO DA DEMANDA',
                allowedFacts: { types: ['Report'] },
                systemPrompt: 'Narrar de forma precisa o motivo, quem solicitou e o histórico relevante que culminou na avaliação.'
            },
            {
                id: '4. PROCEDIMENTOS',
                title: '4. PROCEDIMENTOS',
                allowedFacts: { origins: ['psychometric', 'test', 'psychologist'] },
                systemPrompt: 'Listar de forma metódica o processo avaliativo, citando número de sessões e a base epistemológica/técnica das ferramentas ou testes psicológicos utilizados.'
            },
            {
                id: '5. ANÁLISE CLÍNICA',
                title: '5. ANÁLISE CLÍNICA',
                allowedFacts: { types: ['Symptom', 'Behavior', 'Intervention'] },
                systemPrompt: 'Integração analítica rigorosa dos dados colhidos sob a luz do referencial teórico adotado. Não usar adjetivos subjetivos, focar na análise das funções mentais superiores e dinâmica biopsicossocial.'
            },
            {
                id: '6. CONCLUSÃO',
                title: '6. CONCLUSÃO',
                allowedFacts: { origins: ['clinicalInference'] },
                systemPrompt: 'Fechamento diagnóstico ou prognóstico. Desfecho que responde à demanda inicial apontando condutas ou encaminhamentos. É mandatório definir a validade temporal do documento.'
            },
            {
                id: '7. REFERÊNCIAS',
                title: '7. REFERÊNCIAS',
                allowedFacts: {},
                systemPrompt: 'Apenas caso tenha citado bibliografias técnicas, gerar referências no padrão ABNT. Senão, listar os manuais dos testes psicométricos aplicados.'
            }
        ],
        structuredTemplate: {
            '1. IDENTIFICAÇÃO': `Paciente: {PACIENTE_NOME}\nIdade: {PACIENTE_IDADE} anos\nCPF: {PACIENTE_CPF}\nSolicitante: [Nome do solicitante]\n\nPsicólogo(a) Responsável: {PSI_NOME}\nCRP: {PSI_CRP}\n\nFinalidade: [Descreva a finalidade principal do laudo]`,
            '2. EXAME DO ESTADO MENTAL': `[Descreva: Orientação, aparência, humor, afeto, pensamento, atenção, memória]`,
            '3. DESCRIÇÃO DA DEMANDA': `[Descreva o motivo da avaliação psicológica, quem solicitou e o contexto da solicitação]`,
            '4. PROCEDIMENTOS': `[Descreva os recursos metodológicos utilizados na avaliação:\n- Entrevistas clínicas e números de encontros\n- Testes psicológicos aplicados\n- Instrumentos adicionais]`,
            '5. ANÁLISE CLÍNICA': `[Apresente a exposição dinâmica e fundamentada em teoria psicológica dos dados coletados, interpretando os achados cruzados com prejuízo funcional]`,
            '6. CONCLUSÃO': `[Apresente as conclusões da avaliação, respondendo categoricamente à demanda inicial com encaminhamentos se necessário]\n\nAs informações contidas neste documento possuem validade de [XX] dias/meses a partir da data de emissão, considerando a natureza dinâmica e não cristalizada dos fenômenos psicológicos avaliados.`,
            '7. REFERÊNCIAS': `[Liste as referências bibliográficas utilizadas para fundamentação teórica, seguindo obrigatoriamente as normas atuais da ABNT]`
        },
        aiPrompt: `\${CFP_GUIDELINES}

Gere um LAUDO PSICOLÓGICO completo seguindo RIGOROSAMENTE a CFP 06/2019 e as regras institucionais Mentis.

RETORNE OBRIGATORIAMENTE UM OBJETO JSON VÁLIDO.
As chaves do JSON devem ser EXATAMENTE estas (incluindo numeração):
"1. IDENTIFICAÇÃO" (Dados completos do paciente e data da avaliação)
"2. EXAME DO ESTADO MENTAL" (Orientação, aparência, humor, afeto, pensamento, atenção, memória)
"3. DESCRIÇÃO DA DEMANDA" (Motivo da avaliação e contexto da solicitação)
"4. PROCEDIMENTOS" (Instrumentos e técnicas: entrevistas, testes, número de sessões. Mencionar limitação se poucas sessões)
"5. ANÁLISE CLÍNICA" (Análise técnica FUNDAMENTADA EM TEORIA PSICOLÓGICA dos dados coletados. Foque em funcionalidade, evite alarmismo. Diferencie "autorrelato" de "observação" de forma estrita)
"6. CONCLUSÃO" (Conclusões interdisciplinares, prognóstico e foco na reabilitação. OBRIGATÓRIO: Ao final do texto desta seção, inclua o parágrafo de validade temporal: "As informações contidas neste documento possuem validade de [XX] dias a partir da data de emissão, considerando a natureza dinâmica e não cristalizada dos fenômenos psicológicos avaliados.")
"7. REFERÊNCIAS" (Referências bibliográficas em formato ABNT - OBRIGATÓRIO)

Os valores devem ser os textos correspondentes a cada seção, com parágrafos bem definidos. Não inclua texto fora do bloco JSON.`
    }
];

/**
 * Generate variables from patient and therapist data
 */
export function generateVariables(patient: Patient | null, therapist: User | null): DocumentVariables {
    const today = new Date();
    const formattedDate = formatDate(today.toISOString());

    let age = '___';
    if (patient?.birthDate) {
        try {
            age = differenceInYears(today, new Date(patient.birthDate)).toString();
        } catch (e) {
            age = '___';
        }
    }

    return {
        PACIENTE_NOME: patient ? capitalizeName(patient.name) : '[NOME DO PACIENTE]',
        PACIENTE_CPF: patient?.cpf || '[CPF]',
        PACIENTE_NASCIMENTO: patient?.birthDate ? formatDate(patient.birthDate) : '[DATA DE NASCIMENTO]',
        PACIENTE_IDADE: age,
        DATA_HOJE: formattedDate,
        PSI_NOME: therapist ? capitalizeName(therapist.name) : '[NOME DO PSICÓLOGO]',
        PSI_CRP: therapist?.crp || therapist?.councilNumber || '[CRP]',
        PSI_ESPECIALIDADE: therapist?.specialty || 'Psicologia Clínica',
        CLINICA_NOME: therapist?.clinicName || ''
    };
}

/**
 * Replace variables in template content
 */
export function replaceVariables(content: string, variables: DocumentVariables): string {
    let result = content;

    Object.entries(variables).forEach(([key, value]) => {
        const placeholder = `{${key}}`;
        result = result.replace(new RegExp(placeholder, 'g'), value);
    });

    return result;
}

/**
 * Replace variables in structured template content
 */
export function replaceStructuredVariables(sections: Record<string, string>, variables: DocumentVariables): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, content] of Object.entries(sections)) {
        result[key] = replaceVariables(content, variables);
    }
    return result;
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): TemplateDefinition | undefined {
    return TEMPLATES.find(t => t.id === id);
}
