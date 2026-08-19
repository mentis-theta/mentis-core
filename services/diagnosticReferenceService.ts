export interface DiagnosticReference {
    code: string; // CID-11 code
    dsm5Label: string;
    cid11Label: string;
    keywords: string[];
    criteria?: string;
}

// Base simplificada DSM-5-TR / CID-11
export const diagnosticReferences: DiagnosticReference[] = [
    // --- Transtornos do Neurodesenvolvimento ---
    {
        code: "6A02",
        dsm5Label: "Transtorno do Espectro Autista (TEA)",
        cid11Label: "Transtorno do espectro autista",
        keywords: ["autismo", "tea", "asperger", "neurodesenvolvimento", "interação social", "estereotipia"],
    },
    {
        code: "6A05",
        dsm5Label: "Transtorno de Déficit de Atenção/Hiperatividade (TDAH)",
        cid11Label: "Transtorno de déficit de atenção e hiperatividade",
        keywords: ["tdah", "atenção", "hiperatividade", "impulsividade", "neurodesenvolvimento"],
    },
    // --- Transtornos Depressivos ---
    {
        code: "6A70",
        dsm5Label: "Transtorno Depressivo Maior, Episódio Único",
        cid11Label: "Transtorno depressivo de episódio único",
        keywords: ["depressão", "episódio único", "humor deprimido", "anergia", "anhedonia"],
    },
    {
        code: "6A71",
        dsm5Label: "Transtorno Depressivo Maior, Recorrente",
        cid11Label: "Transtorno depressivo recorrente",
        keywords: ["depressão", "recorrente", "humor deprimido", "anergia", "anhedonia"],
    },
    {
        code: "6A73",
        dsm5Label: "Transtorno Depressivo Persistente (Distimia)",
        cid11Label: "Transtorno depressivo persistente",
        keywords: ["distimia", "depressão crônica", "persistente", "humor"],
    },
    // --- Transtornos Bipolares ---
    {
        code: "6A60",
        dsm5Label: "Transtorno Bipolar Tipo I",
        cid11Label: "Transtorno bipolar tipo I",
        keywords: ["bipolar", "tab", "tipo 1", "mania", "episódio maníaco"],
    },
    {
        code: "6A61",
        dsm5Label: "Transtorno Bipolar Tipo II",
        cid11Label: "Transtorno bipolar tipo II",
        keywords: ["bipolar", "tab", "tipo 2", "hipomania", "depressão"],
    },
    // --- Transtornos de Ansiedade ---
    {
        code: "6B00",
        dsm5Label: "Transtorno de Ansiedade Generalizada (TAG)",
        cid11Label: "Transtorno de ansiedade generalizada",
        keywords: ["ansiedade", "tag", "preocupação", "tensão", "generalizada"],
    },
    {
        code: "6B01",
        dsm5Label: "Transtorno de Pânico",
        cid11Label: "Transtorno de pânico",
        keywords: ["pânico", "ataque", "ansiedade paroxística", "medo"],
    },
    {
        code: "6B03",
        dsm5Label: "Agorafobia",
        cid11Label: "Agorafobia",
        keywords: ["agorafobia", "medo de sair", "multidões", "espaços abertos"],
    },
    {
        code: "6B04",
        dsm5Label: "Transtorno de Ansiedade Social (Fobia Social)",
        cid11Label: "Transtorno de ansiedade social",
        keywords: ["fobia social", "ansiedade social", "exposição", "julgamento"],
    },
    // --- Transtornos Relacionados a Trauma e a Estressores ---
    {
        code: "6B40",
        dsm5Label: "Transtorno de Estresse Pós-Traumático (TEPT)",
        cid11Label: "Transtorno de estresse pós-traumático",
        keywords: ["tept", "trauma", "flashback", "evitação", "hipervigilância"],
    },
    {
        code: "6B41",
        dsm5Label: "Transtorno de Estresse Pós-Traumático Complexo (TEPT-C)",
        cid11Label: "Transtorno de estresse pós-traumático complexo",
        keywords: ["tept complexo", "trauma prolongado", "abuso crônico", "regulação emocional"],
    },
    {
        code: "6B43",
        dsm5Label: "Transtorno de Adaptação",
        cid11Label: "Transtorno de adaptação",
        keywords: ["adaptação", "ajustamento", "estressor", "mudança de vida"],
    },
    // --- Transtorno Obsessivo-Compulsivo ---
    {
        code: "6B20",
        dsm5Label: "Transtorno Obsessivo-Compulsivo (TOC)",
        cid11Label: "Transtorno obsessivo-compulsivo",
        keywords: ["toc", "obsessão", "compulsão", "ritual", "pensamento intrusivo"],
    },
    // --- Transtornos Alimentares ---
    {
        code: "6B80",
        dsm5Label: "Anorexia Nervosa",
        cid11Label: "Anorexia nervosa",
        keywords: ["anorexia", "alimentar", "restrição", "peso", "imagem corporal"],
    },
    {
        code: "6B81",
        dsm5Label: "Bulimia Nervosa",
        cid11Label: "Bulimia nervosa",
        keywords: ["bulimia", "alimentar", "compulsão", "purgação", "vômito"],
    },
    {
        code: "6B82",
        dsm5Label: "Transtorno de Compulsão Alimentar",
        cid11Label: "Transtorno de compulsão alimentar",
        keywords: ["compulsão alimentar", "tca", "binge", "comer compulsivo"],
    },
    // --- Transtornos de Personalidade ---
    {
        code: "6D10",
        dsm5Label: "Transtorno de Personalidade",
        cid11Label: "Transtorno de personalidade (geral)",
        keywords: ["personalidade", "traços", "padrão inflexível"],
    },
    {
        code: "6D11.5",
        dsm5Label: "Transtorno de Personalidade Borderline",
        cid11Label: "Padrão borderline (padrão de instabilidade)",
        keywords: ["borderline", "tpb", "limítrofe", "instabilidade", "vazio", "abandono"],
    },
    {
        code: "6D11.4",
        dsm5Label: "Transtorno de Personalidade Antissocial",
        cid11Label: "Padrão dissocial",
        keywords: ["antissocial", "psicopatia", "sociopatia", "regras", "empatia"],
    },
    // --- Espectro da Esquizofrenia ---
    {
        code: "6A20",
        dsm5Label: "Esquizofrenia",
        cid11Label: "Esquizofrenia",
        keywords: ["esquizofrenia", "psicose", "alucinação", "delírio", "sintomas negativos"],
    },
    // --- Transtornos do Sono-Vigília ---
    {
        code: "7A00",
        dsm5Label: "Transtorno de Insônia",
        cid11Label: "Transtorno de insônia crônica",
        keywords: ["insônia", "sono", "dificuldade de dormir", "despertar precoce"],
    },
    // --- Transtornos Relacionados a Substâncias ---
    {
        code: "6C40",
        dsm5Label: "Transtorno por Uso de Álcool",
        cid11Label: "Transtornos devidos ao uso de álcool",
        keywords: ["álcool", "alcoolismo", "substância", "dependência"],
    },
    {
        code: "6C43",
        dsm5Label: "Transtorno por Uso de Cocaína",
        cid11Label: "Transtornos devidos ao uso de cocaína",
        keywords: ["cocaína", "droga", "substância", "dependência", "estimulante"],
    }
];

export function searchDiagnostics(query: string, limit = 5): DiagnosticReference[] {
    const normalizedQuery = query.toLowerCase().trim();
    if (!normalizedQuery) return [];

    return diagnosticReferences
        .filter(ref => {
            const matchesCode = ref.code.toLowerCase().includes(normalizedQuery);
            const matchesDSM = ref.dsm5Label.toLowerCase().includes(normalizedQuery);
            const matchesCID = ref.cid11Label.toLowerCase().includes(normalizedQuery);
            const matchesKeyword = ref.keywords.some(k => k.toLowerCase().includes(normalizedQuery));
            
            return matchesCode || matchesDSM || matchesCID || matchesKeyword;
        })
        .slice(0, limit);
}
