# Padrão de Cor Oficial Mentis (Cinematic Purple)

Este documento foi extraído e consolidado a partir da implementação da **Tela de Autenticação Cinematográfica** (Fev/2026). Ele deve ser usado como guia absoluto para futuras aplicações de UI/UX em todo o projeto *Mentis*, garantindo a consistência visual da marca.

## 1. Cores Base (Paleta Tailwind)

A cor de primazia e identidade profunda da aplicação não é mais o azul claro genérico, e sim o **Violeta Magnético (Violet-600 a Violet-400)**. Deve-se abandonar o uso de azuis anêmicos.

- **Cor Principal (Mentis Purple):** `violet-600` (`#7c3aed`)
- **Cor Principal (Dark Mode / Glow):** `violet-400` (`#a78bfa`)
- **Fundo Principal (Light Mode):** `slate-50` ou `zinc-50` (Evitar o branco puro `bg-white` solto na tela, deixar branco somente para Cards com Drop Shadow).
- **Fundo Principal (Dark Mode):** `slate-900` (`#0f172a`)

## 2. Botões Principais (Call To Action)

O formato padrão de todos os botões primários da aplicação (CTAs de Cadastro, Validação, Ações Primárias) agora obedece ao estilo "Pílula Cinestésica":

```tsx
<button
  className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-full shadow-lg shadow-violet-500/25 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 disabled:opacity-50 disabled:cursor-not-allowed"
>
  Ação Primária
</button>
```

- **Format:** `rounded-full` (Pílula).
- **Shadow:** Casting Orgânico `shadow-lg shadow-violet-500/25` (Cria uma "aura luminescente" no entorno do botão, não uma sombra preta opaca).
- **Interactive:** `hover:scale-[1.02] active:scale-[0.98]` com uma transição de `duration-200`.

## 3. Imagens Rasterizadas (PNGs/Logos Base) -> Transmutação de Cor

Quando for necessário transformar Imagens, Logos (preto) ou SVGs opacos para a cor exata "Mentis Purple" rodando no cliente via CSS Puro, utilizar a **Matriz Multi-Filter** arquitetada para o logo principal.

**O Efeito "Acendimento Mentis CSS":**
```css
.filter-mentis-purple {
  filter: brightness(0) saturate(100%) invert(28%) sepia(91%) saturate(2853%) hue-rotate(245deg) brightness(98%) contrast(97%) drop-shadow(0 0 8px rgba(124, 58, 237, 0.3));
}
```
*Este filtro engole inteiramente a representação RGB e obriga o navegador a desenhar o arquivo na cor `#7c3aed` com uma refração/aura (`drop-shadow`) violeta leve no entorno da imagem transparente.*

## 4. Tipografia de Títulos (Glow State)

Sempre que a palavra **Mentis** aparecer em tela destacada, ou títulos em sessões premium, se deve adicionar a "Emana" violeta em seus arredores com a lógica Dark Mode vs Light Mode via Text-Shadow:

- **Light Mode:** `color: #7c3aed; text-shadow: 0 0 12px rgba(124,58,237,0.25);`
- **Dark Mode:** `color: #a78bfa; text-shadow: 0 0 12px rgba(167,139,250,0.25);`
