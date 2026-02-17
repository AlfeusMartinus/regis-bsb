/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                "primary": "#13ec6d",
                "background-light": "#f6f8f7",
                "background-dark": "#102218",
                "primary-dark": "#0ebf57",
            },
            fontFamily: {
                "sans": ["Lexend", "sans-serif"],
                "display": ["Lexend", "sans-serif"],
                "body": ["Lexend", "sans-serif"],
            },
            borderRadius: {
                "DEFAULT": "0.25rem",
                "lg": "0.5rem",
                "xl": "0.75rem",
                "full": "9999px"
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                grow: {
                    '0%': { transform: 'scaleX(0)' },
                    '100%': { transform: 'scaleX(1)' },
                }
            },
            animation: {
                fadeIn: 'fadeIn 0.3s ease-out forwards',
                grow: 'grow 1s ease-out forwards',
            }
        },
    },
    plugins: [],
}
