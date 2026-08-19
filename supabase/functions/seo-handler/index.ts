// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

/**
 * Edge Function para SEO Dinâmico (Mentis)
 * 
 * Invokada em rotas como /book/:uid.
 * Se for crawler social: responde com meta tags dinâmicas.
 * Se for humano: responde com o index.html da SPA Vite.
 */

// Ambiente
const FRONTEND_URL = Deno.env.get("FRONTEND_URL") ?? "https://mentis-app.com";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

// Identificadores comuns de web crawlers
const BOT_AGENTS = [
    "facebookexternalhit",
    "whatsapp",
    "twitterbot",
    "telegrambot",
    "linkedinbot",
    "pinterest",
    "slackbot",
    "vkShare",
    "W3C_Validator",
    "discordbot",
    "applebot",
    "googlebot"
];

// O template HTML "oco" contendo exclusivamente meta tags necessárias para link previews
const TEMPLATE = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <title>{{TITLE}}</title>
    <meta property="og:title" content="{{TITLE}}">
    <meta property="og:description" content="{{DESCRIPTION}}">
    <meta property="og:image" content="{{IMAGE}}">
    <meta property="og:url" content="{{URL}}">
    <meta property="og:type" content="profile">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="{{TITLE}}">
    <meta name="twitter:description" content="{{DESCRIPTION}}">
    <meta name="twitter:image" content="{{IMAGE}}">
</head>
<body>
    <script>window.location.href="{{URL}}";</script>
</body>
</html>`;

serve(async (req) => {
    const url = new URL(req.url);
    const userAgent = req.headers.get("user-agent")?.toLowerCase() || "";

    // 1. Lógica de User-Agent: É Bot?
    const isBot = BOT_AGENTS.some((bot) => userAgent.includes(bot));

    // 2. Fallback para Humanos
    if (!isBot) {
        // Se for humano, servimos o HTML da nossa SPA (Vite) normalmente.
        // Assim, o React inicializa e o roteamento via AppRoutes assume a tela via o :uid.
        try {
            const response = await fetch(`${FRONTEND_URL}/index.html`);
            const text = await response.text();
            return new Response(text, {
                headers: { "Content-Type": "text/html; charset=utf-8" },
            });
        } catch (e) {
            return new Response("Erro ao carregar Clinical OS", { status: 500 });
        }
    }

    // 3. Extraindo o UID da URL
    // Assumindo estrutura /book/123-abc-456
    const pathParts = url.pathname.split("/");
    const uid = pathParts[pathParts.length - 1];

    if (!uid || uid === "book") {
        // Retorna index genérico se der problema extrair UID
        return Response.redirect(`${FRONTEND_URL}/`, 301);
    }

    // 4. Query Dinâmica
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Substituir "users" pela tabela pública onde guarda infos do psicólogo
    const { data: profile } = await supabase
        .from("profiles")
        .select("name, photo_url, crp") // Ajustar colunas conf. banco real
        .eq("id", uid)
        .single();

    if (!profile) {
        return new Response("Psicólogo(a) não encontrado(a)", { status: 404 });
    }

    // 5. Build dinâmico da página SEO
    const titleText = `Agende com ${profile.name} | Mentis`;
    const descText = `Psicólogo(a). ${profile.crp ? 'CRP: ' + profile.crp : ''}. Agende sua sessão pelo link oficial Mentis.`;

    // Fallback para cover default caso não tenha foto
    const imageUrl = profile.photo_url || `${FRONTEND_URL}/open-graph-default.jpg`;

    const finalHtml = TEMPLATE
        .replace(/{{TITLE}}/g, titleText)
        .replace(/{{DESCRIPTION}}/g, descText)
        .replace(/{{IMAGE}}/g, imageUrl)
        .replace(/{{URL}}/g, req.url);

    // 6. Resposta enxuta pro Crawler da Rede Social (e em cache na Edge pra veloz resposta)
    return new Response(finalHtml, {
        headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "public, max-age=3600, s-maxage=3600", // Edge cache por 1hr
        },
    });
});
