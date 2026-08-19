export interface GuideSection {
    title: string;
    items: string[];
}

export interface ToolGuide {
    title: string;
    subtitle: string;
    sections: GuideSection[];
}

export const toolGuides: Record<string, ToolGuide> = {
    anamnesis: {
        title: 'Guia da Anamnese Estruturada',
        subtitle: 'Entrevista Clínica Inicial',
        sections: [
            {
                title: 'O que é?',
                items: [
                    'A Anamnese é a entrevista clínica inicial que reúne o histórico completo do paciente.',
                    'Inclui queixa principal, histórico pessoal, familiar, médico/psiquiátrico e estilo de vida.',
                    'É a base para formulação de caso e hipótese diagnóstica.',
                ],
            },
            {
                title: 'Como usar',
                items: [
                    'Clique em "Editar" para preencher ou atualizar os campos manualmente.',
                    'Use "Preencher com IA" para que a inteligência artificial analise as sessões e sugira o conteúdo.',
                    'Revise sempre o conteúdo gerado pela IA antes de salvar.',
                    'Após editar, clique em "Salvar Registro" para persistir os dados.',
                ],
            },
        ],
    },

    genogram: {
        title: 'Guia do Genograma',
        subtitle: 'Mapeamento da Árvore Familiar',
        sections: [
            {
                title: 'O que é?',
                items: [
                    'O Genograma é uma representação gráfica da estrutura familiar e dos padrões de relacionamento.',
                    'Quadrados representam homens e círculos representam mulheres.',
                    'As linhas indicam vínculos: normal, conflituoso, distante ou fusionado.',
                ],
            },
            {
                title: 'Como usar',
                items: [
                    'Use os botões "+ Homem" e "+ Mulher" para adicionar membros à árvore.',
                    'Arraste os nós para posicioná-los no canvas.',
                    'Conecte os membros arrastando de uma borda (handle) para outra.',
                    'Clique em uma linha para ciclar entre os estilos de vínculo (Normal → Conflito → Distante → Fusionado).',
                    'Conectores laterais criam linhas de união (casamento/parceria).',
                    'Clique em um nó para editar nome, idade e status de falecido.',
                    'Use "Gerar com IA" para que a IA construa a árvore a partir das sessões.',
                ],
            },
        ],
    },

    systemicMap: {
        title: 'Guia do Ecomapa Bioecológico',
        subtitle: 'Teoria dos Sistemas de Bronfenbrenner',
        sections: [
            {
                title: 'O que é?',
                items: [
                    'O Ecomapa mapeia a rede de relações do paciente com seu ambiente social.',
                    'Baseado na Teoria Bioecológica de Bronfenbrenner (Micro, Exo e Macrossistema).',
                    'Identifica fontes de apoio, estresse e recursos ao redor do paciente.',
                ],
            },
            {
                title: 'Como usar',
                items: [
                    'Use os botões flutuantes no canto esquerdo para adicionar Estressores, Recursos, Família ou Instituições.',
                    'Arraste das bordas de um círculo até outro para criar conexões.',
                    'Clique em qualquer linha para abrir o menu rápido e definir o tipo de vínculo (Conflito, Apoio ou Neutro).',
                    'Use "Gerar com IA" para que a IA construa o mapa a partir das sessões.',
                    'Baixe o mapa como imagem PNG pelo botão de download.',
                ],
            },
        ],
    },

    treatmentPlan: {
        title: 'Guia do Plano Terapêutico',
        subtitle: 'Metas e Intervenções Clínicas',
        sections: [
            {
                title: 'O que é?',
                items: [
                    'O Plano Terapêutico organiza as metas do tratamento e as intervenções planejadas.',
                    'Permite acompanhar o progresso: metas em andamento, pausadas e alcançadas.',
                    'Cada meta pode ter múltiplas intervenções associadas.',
                ],
            },
            {
                title: 'Como usar',
                items: [
                    'Clique em "Nova Meta" para criar uma meta terapêutica.',
                    'Defina título, descrição e intervenções para cada meta.',
                    'Use o ícone de check verde para marcar uma meta como "Alcançada".',
                    'Edite ou exclua metas usando os ícones de lápis e lixeira.',
                    'As conquistas são listadas separadamente para acompanhamento.',
                ],
            },
        ],
    },

    rpd: {
        title: 'Guia do RPD',
        subtitle: 'Registro de Pensamentos Disfuncionais',
        sections: [
            {
                title: 'O que é?',
                items: [
                    'O RPD (Registro de Pensamento Disfuncional) é uma técnica central da TCC.',
                    'Ajuda o paciente a identificar a situação, o pensamento automático, a emoção e a resposta racional.',
                    'Permite monitorar distorções cognitivas e reestruturar padrões de pensamento.',
                ],
            },
            {
                title: 'Como usar',
                items: [
                    'Clique em "Novo Registro" para abrir o formulário.',
                    'Preencha situação, pensamento automático, emoção, intensidade e resposta racional.',
                    'Registros do paciente (via Portal) aparecem com destaque em roxo.',
                    'Use "Adicionar Orientação" nos registros do paciente para enviar feedback terapêutico.',
                    'A intensidade emocional é mostrada por cores: verde (baixa), amarelo (média), vermelho (alta).',
                ],
            },
        ],
    },

    inventories: {
        title: 'Guia de Psicometria e Avaliações',
        subtitle: 'Escalas Clínicas, Rastreio Cognitivo e Orientação Vocacional',
        sections: [
            {
                title: 'O que é?',
                items: [
                    'O Hub de Avaliações centraliza todos os instrumentos métricos do Mentis.',
                    'Escalas Clínicas: Acompanhamento de sintomas (GAD-7, PHQ-9, ASRS-18, etc.) com gráficos evolutivos.',
                    'Rastreio Cognitivo: Testes laboratoriais interativos de atenção (Stroop) e memória visuoespacial (Cubos de Corsi) com medição em milissegundos.',
                    'Orientação Vocacional: Avaliação baseada no modelo RIASEC (O*NET) com análise avançada por Inteligência Artificial.',
                ],
            },
            {
                title: 'Como usar',
                items: [
                    'Para Escalas Clínicas: Escolha a escala, clique em "Nova Aferição" e acompanhe a linha de tendência.',
                    'Para Rastreio Cognitivo: Peça ao paciente para realizar o Stroop ou Corsi durante a sessão (via teclado, mouse ou touch). O Mentis calcula automaticamente o Span Direto e os Efeitos de Interferência.',
                    'Para Vocacional: Realize as 48 questões de Holland e clique em "Sintetizar Perfil com IA" para obter um relatório focado em adaptação e neurodivergência.',
                    'O Histórico em sanfona guarda todas as execuções e resultados detalhados.',
                ],
            },
        ],
    },

    act_matrix: {
        title: 'Guia da Matriz ACT',
        subtitle: 'Terapia de Aceitação e Compromisso',
        sections: [
            {
                title: 'O que é?',
                items: [
                    'A Matriz ACT é uma ferramenta visual para mapear flexibilidade psicológica.',
                    'Divide-se em 4 quadrantes: Esquiva, Ações Comprometidas, Ganchos e Valores.',
                    'Ajuda o paciente a conectar seus comportamentos aos seus valores.',
                ],
            },
            {
                title: 'Como usar',
                items: [
                    'Clique em "Adicionar" dentro de cada quadrante para inserir um item.',
                    'Esquiva (vermelho): comportamentos de fuga da dor emocional.',
                    'Ações Comprometidas (verde): ações práticas alinhadas aos valores.',
                    'Ganchos (laranja): pensamentos e emoções que "fisgam" o paciente.',
                    'Valores (azul): o que realmente importa para o paciente.',
                    'Passe o mouse sobre um item e clique no X para removê-lo.',
                ],
            },
        ],
    },

    emdr: {
        title: 'Guia do Workspace EMDR',
        subtitle: 'Dessensibilização e Reprocessamento',
        sections: [
            {
                title: 'O que é?',
                items: [
                    'Ferramenta para sessões de EMDR (Eye Movement Desensitization and Reprocessing).',
                    'Inclui barra de estimulação bilateral visual com velocidade e cor ajustáveis.',
                    'Permite registrar escalas SUDS (estresse) e VoC (crença positiva) a cada set.',
                ],
            },
            {
                title: 'Como usar',
                items: [
                    'Clique em "Iniciar Set" para ativar a barra de estimulação bilateral.',
                    'Ajuste a velocidade: Lenta (instalação), Média ou Rápida (dessensibilização).',
                    'Escolha a cor da barra conforme preferência do paciente.',
                    'Preencha a Memória Alvo, Crença Negativa e Crença Positiva.',
                    'Após cada set, ajuste o SUDS e VoC e clique em "Salvar Set Atual".',
                    'Use o campo "Lugar Seguro" para anotar detalhes sensoriais de estabilização.',
                    'Acompanhe a queda do SUDS no painel "Evolução do Reprocessamento".',
                ],
            },
        ],
    },

    documents: {
        title: 'Guia da Central de Documentos',
        subtitle: 'Gestão de Arquivos Clínicos',
        sections: [
            {
                title: 'O que é?',
                items: [
                    'Central para gerenciar todos os documentos do paciente.',
                    'Divide-se em "Documentos Emitidos" (gerados pelo sistema) e "Arquivos & Uploads" (importados).',
                ],
            },
            {
                title: 'Como usar',
                items: [
                    'Clique em "Criar Documento" para gerar documentos clínicos pelo sistema (atestados, encaminhamentos etc.).',
                    'Clique em "Importar Arquivo" para anexar arquivos externos (laudos, exames etc.).',
                    'Use o ícone de download para baixar qualquer documento.',
                    'Use o ícone de lixeira para excluir um documento (ação irreversível).',
                ],
            },
        ],
    },

    coping: {
        title: 'Guia de Cartões de Enfrentamento',
        subtitle: 'Lembretes para momentos de crise',
        sections: [
            {
                title: 'O que é?',
                items: [
                    'Ferramenta inspirada na TCC e ACT para criar frases curtas que ajudam o paciente a lidar com situações difíceis.',
                    'Podem ser focados em Defusão Cognitiva, Conexão com Valores ou Aterramento (Grounding).',
                ],
            },
            {
                title: 'Como usar',
                items: [
                    'Clique em "Novo Cartão" para escrever uma frase e associá-la a uma categoria.',
                    'Os cartões criados por você ficarão visíveis para o paciente na aba "Portal do Paciente".',
                    'O paciente também pode criar os próprios cartões, que aparecerão aqui com a marcação "Criado pelo Paciente".',
                ],
            },
        ],
    },

    stroop: {
        title: 'Guia do Teste de Stroop',
        subtitle: 'Atenção Seletiva e Controle Inibitório',
        sections: [
            {
                title: 'O que é?',
                items: [
                    'Paradigma cognitivo clássico de domínio público para avaliar atenção seletiva e controle inibitório.',
                    'O paciente vê o nome de uma cor escrito em uma cor diferente e deve identificar a COR DA TINTA, ignorando a palavra.',
                    'Mede o efeito de interferência: quanto mais difícil ignorar a palavra, maior a latência de resposta.',
                ],
            },
            {
                title: 'Como usar',
                items: [
                    'Clique em "Iniciar Teste" para começar. As instruções serão exibidas automaticamente.',
                    'O paciente fará 5 trials de treino (não pontuam) antes de iniciar os 100 trials reais.',
                    'Método de resposta: teclado (teclas 1-4) ou clique nos botões coloridos na tela.',
                    'Ao final, os resultados (tempo de reação, interferência, acurácia) são calculados automaticamente.',
                    'Clique em "Salvar no Prontuário" para criptografar e persistir os dados.',
                ],
            },
        ],
    },

    corsi: {
        title: 'Guia dos Cubos de Corsi',
        subtitle: 'Memória de Trabalho Visuoespacial',
        sections: [
            {
                title: 'O que é?',
                items: [
                    'Paradigma de domínio público para avaliar memória de trabalho visuoespacial (spatial span).',
                    'Uma sequência de blocos "pisca" na tela. O paciente reproduz a sequência clicando nos blocos na mesma ordem.',
                    'A dificuldade aumenta progressivamente: de 2 blocos até o máximo que o paciente conseguir.',
                ],
            },
            {
                title: 'Como usar',
                items: [
                    'Clique em "Iniciar Teste" para começar. Uma demonstração de 2 blocos será exibida.',
                    'Observe a sequência (os blocos mudam de cor brevemente) e depois clique nos blocos na mesma ordem.',
                    'O span aumenta em +1 bloco a cada acerto. Duas falhas consecutivas no mesmo nível encerram o teste.',
                    'O resultado principal é o "span direto": a maior sequência reproduzida corretamente.',
                ],
            },
        ],
    },

    riasec: {
        title: 'Guia do RIASEC',
        subtitle: 'Orientação Vocacional — Tipologia de Holland',
        sections: [
            {
                title: 'O que é?',
                items: [
                    'Inventário de interesses profissionais baseado na Tipologia de Holland (O*NET Interest Profiler).',
                    'Mapeia o perfil do paciente em 6 tipos: Realista, Investigativo, Artístico, Social, Empreendedor e Convencional.',
                    'Gera um código Holland de 3 letras (ex: "SAE") e um gráfico hexagonal do perfil.',
                ],
            },
            {
                title: 'Como usar',
                items: [
                    'Clique em "Iniciar Avaliação". Os 48 itens serão apresentados como cards deslizantes.',
                    'O paciente avalia cada atividade em uma escala de 1 (Desagrado Total) a 5 (Agrado Total).',
                    'Ao final, o perfil hexagonal e o código Holland são calculados automaticamente.',
                    'Use o botão "Gerar Análise com IA" para cruzar o perfil com tendências de mercado via Gemini.',
                ],
            },
        ],
    },
};
