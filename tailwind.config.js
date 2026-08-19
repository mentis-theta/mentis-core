/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./contexts/**/*.{js,ts,jsx,tsx}",
        "./hooks/**/*.{js,ts,jsx,tsx}",
        "./services/**/*.{js,ts,jsx,tsx}",
        "./utils/**/*.{js,ts,jsx,tsx}"
    ],
    darkMode: 'class',
    safelist: [
        {
            pattern: /bg-(slate|gray|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(100|600|900)/,
            variants: ['dark', 'hover'],
        },
        {
            pattern: /text-(slate|gray|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(200|400|600|800)/,
            variants: ['dark', 'hover'],
        },
        {
            pattern: /border-(slate|gray|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(200|300|500|700)/,
            variants: ['dark'],
        },
        {
            pattern: /ring-(slate|gray|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(200|400)/,
        }
    ],
    theme: {
        extend: {
            colors: {
                background: 'hsl(var(--background) / <alpha-value>)',
                'surface-container-lowest': 'hsl(var(--surface) / <alpha-value>)',
                'surface-container-low': 'hsl(var(--surface-dim) / <alpha-value>)',
                'surface-container': 'hsl(var(--canvas) / <alpha-value>)',
                'on-surface': 'hsl(var(--foreground) / <alpha-value>)',
                'on-surface-variant': 'hsl(var(--foreground-muted) / <alpha-value>)',
                // Aliases para compatibilidade
                canvas: 'hsl(var(--canvas) / <alpha-value>)',
                surface: 'hsl(var(--surface) / <alpha-value>)',
                'surface-dim': 'hsl(var(--surface-dim) / <alpha-value>)',
                foreground: 'hsl(var(--foreground) / <alpha-value>)',
                'foreground-muted': 'hsl(var(--foreground-muted) / <alpha-value>)',
                border: 'hsl(var(--border) / <alpha-value>)',
                primary: 'hsl(var(--primary) / <alpha-value>)',
                'primary-foreground': 'hsl(var(--primary-foreground) / <alpha-value>)',
                therapeutic: 'hsl(var(--therapeutic) / <alpha-value>)',
                success: 'hsl(var(--success) / <alpha-value>)',
                warning: 'hsl(var(--warning) / <alpha-value>)',
                error: 'hsl(var(--error) / <alpha-value>)',
                info: 'hsl(var(--info) / <alpha-value>)',
                'primary-soft': 'var(--primary-soft)', // legacy
                secondary: 'var(--secondary)', // legacy
                'bg-paper': 'var(--bg-paper)', // legacy
                'text-main': 'var(--text-main)', // legacy
            },
            screens: {
                'xs': '475px',
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            }
        },
    },
    plugins: [
        require('@tailwindcss/typography'),
        function ({ addUtilities }) {
            addUtilities({
                '.pb-safe': {
                    'padding-bottom': 'env(safe-area-inset-bottom, 0px)',
                },
            });
        },
    ],
}
