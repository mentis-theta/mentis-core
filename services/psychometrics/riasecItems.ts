/**
 * Banco de itens do O*NET Interest Profiler (Mini-IP) — 48 itens (Domínio Público).
 * Traduzido e adaptado para rastreio vocacional clínico.
 * 
 * Cada item tem 5 opções de resposta (Likert 1-5):
 * 1 - Desagrado Total
 * 2 - Desagrado
 * 3 - Indiferente
 * 4 - Agrado
 * 5 - Agrado Total
 */

export type RiasecType = 'R' | 'I' | 'A' | 'S' | 'E' | 'C';

export interface RiasecItem {
  id: string;
  text: string;
  type: RiasecType;
  order: number;
}

const rawItems: RiasecItem[] = [
  // Realistic (R) - 8 itens
  { id: 'r1', text: 'Construir armários de cozinha', type: 'R', order: 1 },
  { id: 'r2', text: 'Assentar tijolos ou azulejos', type: 'R', order: 7 },
  { id: 'r3', text: 'Consertar aparelhos eletrodomésticos', type: 'R', order: 13 },
  { id: 'r4', text: 'Criar ou consertar equipamentos mecânicos', type: 'R', order: 19 },
  { id: 'r5', text: 'Montar peças eletrônicas', type: 'R', order: 25 },
  { id: 'r6', text: 'Dirigir um caminhão ou trator', type: 'R', order: 31 },
  { id: 'r7', text: 'Testar a qualidade de peças', type: 'R', order: 37 },
  { id: 'r8', text: 'Operar máquinas de fábrica', type: 'R', order: 43 },

  // Investigative (I) - 8 itens
  { id: 'i1', text: 'Estudar o movimento dos planetas', type: 'I', order: 2 },
  { id: 'i2', text: 'Investigar a causa de um incêndio', type: 'I', order: 8 },
  { id: 'i3', text: 'Pesquisar curas para doenças', type: 'I', order: 14 },
  { id: 'i4', text: 'Trabalhar em um laboratório de química', type: 'I', order: 20 },
  { id: 'i5', text: 'Inventar peças para painéis solares', type: 'I', order: 26 },
  { id: 'i6', text: 'Analisar exames de sangue', type: 'I', order: 32 },
  { id: 'i7', text: 'Estudar o crescimento de bactérias', type: 'I', order: 38 },
  { id: 'i8', text: 'Pesquisar por que a natureza evolui', type: 'I', order: 44 },

  // Artistic (A) - 8 itens
  { id: 'a1', text: 'Escrever livros ou peças de teatro', type: 'A', order: 3 },
  { id: 'a2', text: 'Tocar um instrumento musical', type: 'A', order: 9 },
  { id: 'a3', text: 'Compor ou arranjar músicas', type: 'A', order: 15 },
  { id: 'a4', text: 'Criar efeitos especiais para filmes', type: 'A', order: 21 },
  { id: 'a5', text: 'Pintar cenários para peças', type: 'A', order: 27 },
  { id: 'a6', text: 'Escrever roteiros de cinema', type: 'A', order: 33 },
  { id: 'a7', text: 'Desenhar obras de arte', type: 'A', order: 39 },
  { id: 'a8', text: 'Atuar em peças teatrais ou filmes', type: 'A', order: 45 },

  // Social (S) - 8 itens
  { id: 's1', text: 'Ensinar uma pessoa a ler', type: 'S', order: 4 },
  { id: 's2', text: 'Ajudar pessoas com problemas familiares', type: 'S', order: 10 },
  { id: 's3', text: 'Dar aulas ou orientar jovens', type: 'S', order: 16 },
  { id: 's4', text: 'Trabalhar com jovens em projetos sociais', type: 'S', order: 22 },
  { id: 's5', text: 'Cuidar de pessoas doentes', type: 'S', order: 28 },
  { id: 's6', text: 'Aconselhar pessoas sobre seus problemas', type: 'S', order: 34 },
  { id: 's7', text: 'Ajudar pessoas a encontrar emprego', type: 'S', order: 40 },
  { id: 's8', text: 'Fazer trabalho voluntário para a comunidade', type: 'S', order: 46 },

  // Enterprising (E) - 8 itens
  { id: 'e1', text: 'Comprar e vender ações ou investimentos', type: 'E', order: 5 },
  { id: 'e2', text: 'Gerenciar o próprio negócio', type: 'E', order: 11 },
  { id: 'e3', text: 'Ir a reuniões de negócios', type: 'E', order: 17 },
  { id: 'e4', text: 'Coordenar o trabalho de uma equipe', type: 'E', order: 23 },
  { id: 'e5', text: 'Vender produtos para clientes', type: 'E', order: 29 },
  { id: 'e6', text: 'Negociar contratos de negócios', type: 'E', order: 35 },
  { id: 'e7', text: 'Promover campanhas políticas', type: 'E', order: 41 },
  { id: 'e8', text: 'Representar clientes em processos', type: 'E', order: 47 },

  // Conventional (C) - 8 itens
  { id: 'c1', text: 'Organizar arquivos ou registros', type: 'C' as RiasecType, order: 6 },
  { id: 'c2', text: 'Calcular salários e folha de pagamento', type: 'C' as RiasecType, order: 12 },
  { id: 'c3', text: 'Operar planilhas e calculadoras', type: 'C' as RiasecType, order: 18 },
  { id: 'c4', text: 'Lidar com orçamentos detalhados', type: 'C' as RiasecType, order: 24 },
  { id: 'c5', text: 'Digitar documentos e formulários', type: 'C' as RiasecType, order: 30 },
  { id: 'c6', text: 'Verificar erros em planilhas financeiras', type: 'C' as RiasecType, order: 36 },
  { id: 'c7', text: 'Garantir que regras contábeis sejam seguidas', type: 'C' as RiasecType, order: 42 },
  { id: 'c8', text: 'Manter inventários ou estoque organizados', type: 'C' as RiasecType, order: 48 },
] as RiasecItem[];

export const RIASEC_ITEMS = rawItems.sort((a, b) => a.order - b.order);
