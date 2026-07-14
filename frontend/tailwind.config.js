/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "rgb(var(--bg-main) / <alpha-value>)",
        secondaryBg: "rgb(var(--bg-secondary) / <alpha-value>)",
        primaryText: "rgb(var(--text-primary) / <alpha-value>)",
        secondaryText: "rgb(var(--text-secondary) / <alpha-value>)",
        mutedText: "rgb(var(--text-muted) / <alpha-value>)",
        themeBorder: "rgb(var(--card-border) / <alpha-value>)",
        hoverBg: "rgb(var(--hover-bg) / <alpha-value>)",
        
        primary: {
          DEFAULT: "#3b82f6",
          dark: "#1d4ed8",
        },
        electric: "#2563eb",
        purpleAccent: "#a855f7",
        cyanAccent: "rgb(var(--color-accent) / <alpha-value>)",
        accent: "rgb(var(--color-accent) / <alpha-value>)",
        cardBg: "rgba(var(--card-bg), 0.6)",
        cardBorder: "rgba(var(--card-border), 0.08)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
      },
      backdropBlur: {
        xs: "2px",
      },
      animation: {
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "float": "float 6s ease-in-out infinite",
        "spin-slow": "spin 12s linear infinite",
        "shimmer": "shimmer 2s infinite linear",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" }
        }
      }
    },
  },
  plugins: [],
}
