/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{ts,tsx}'],
    theme: {
        extend: {
            colors: {
                // MEDHUB brand — navy/teal clinical palette
                primary: {
                    50: '#f0f9ff',
                    100: '#e0f2fe',
                    200: '#bae6fd',
                    300: '#7dd3fc',
                    400: '#38bdf8',
                    500: '#0ea5e9',
                    600: '#0284c7',
                    700: '#0369a1',
                    800: '#075985',
                    900: '#0c4a6e',
                    950: '#082f49',
                },
                surface: {
                    DEFAULT: '#0f172a',
                    elevated: '#1e293b',
                    overlay: '#334155',
                },
                clinical: {
                    success: '#10b981',
                    warning: '#f59e0b',
                    danger: '#ef4444',
                    info: '#6366f1',
                },
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            borderRadius: {
                xl: '1rem',
                '2xl': '1.5rem',
            },
        },
    },
    plugins: [],
};
