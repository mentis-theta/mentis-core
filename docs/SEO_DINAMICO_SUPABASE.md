# Arquitetura de SEO Dinâmico (Mentis SaaS)

Como o Mentis opera com Vite (React SPA), não temos processamento Server-Side Rendering (SSR) nativo (como existe no Next.js). Por isso, as redes sociais (WhatsApp, Twitter, LinkedIn) que não renderizam Javascript enxergariam apenas a tag genérica do \`index.html\`.

Para resolver o vazamento ou insuficiência de meta-dados por profissional mantendo o isolamento arquitetural da nossa SPA, usamos uma **Supabase Edge Function** que trabalha na camada do Edge / Proxy.

## 1. Código da Edge Function (\`seo-handler\`)
O código estrutural em Deno foi criado em:
\`supabase/functions/seo-handler/index.ts\`

**Como funciona a lógica:**
1. A função inspeciona o Header **User-Agent**.
2. **É Bot?** Query no banco de dados, monta uma string HTML oca contendo as propriedades vitais de OpenGraph (\`og:image\`, \`og:title\`, \`og:description\`) para desenhar o Card do Link no WhatsApp/Insta, e retorna na hora.
3. **É Humano (Chrome/Safari)?** Usamos \`fetch()\` nativo para baixar em tempo de execução o \`index.html\` real do nosso front-end hospedado e repassamos ao usuário. Assim a engine Client-Side do React é acionada normalmente, o app é "hidratado" e a tela de vitrine funciona perfeita.

## 2. Passo a Passo de Roteamento / Configuração

Para que os cliques na URL de fato passem por essa função antes do Vite, precisamos criar os _Rewrites_. A forma como se configura varia um pouco caso seu front-end esteja na **Vercel** ou caso vocês usem **Supabase Hosting/API**.

### Opção A: Vercel (Caso o App Front-End Mentis esteja na Vercel)
O método ideal é instruir a malha da Vercel para interceptar e repassar requisições com bots. 
No \`vercel.json\` que está na raiz do seu projeto:

```json
{
  "rewrites": [
    {
      "source": "/book/:uid",
      "has": [
        {
          "type": "header",
          "key": "user-agent",
          "value": "(?i).*(whatsapp|facebook|twitter|slack|linkedin|bot).*"
        }
      ],
      "destination": "https://<seu-projeto-supabase>.supabase.co/functions/v1/seo-handler"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```
*Isto força apenas os bots a baterem na Função do Supabase.*

### Opção B: Roteamento API Gateway (Supabase Custom Domain / Reverse Proxy)
Caso a regra fique diretamente sob a API do Supabase operando requisições conjuntas, a nossa Edge Function do código acima que já faz a lógica condicional de *Bot vs Human* lida com o repasse.
Você só precisa subir a função:
```bash
supabase functions deploy seo-handler --no-verify-jwt
supabase secrets set FRONTEND_URL="https://mentis.seudominio.com"
```
Neste cenário (Opção B), todas as visitas aos links \`/book/:uid\` devem apontar os DNS / Nginx para \`<seu-projeto>.supabase.co/functions/v1/seo-handler/book/... \`.

## 3. O \`index.html\` (Limpeza)
A regra global para o seu \`index.html\` principal atual já está aplicada. Não existem injecões estáticas de pacientes ou psicólogos lá. O Header possui estritamente \`<title>Mentis - Clínica Inteligente</title>\`, o que garante a privacidade total caso a função Edge em algum momento falhe e o Crawler bata no front nativo.
