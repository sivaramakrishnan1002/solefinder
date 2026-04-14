/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "system-ui", "sans-serif"],
        display: ["'Space Grotesk'", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#eefbf3",
          100: "#d7f5e2",
          200: "#b1ebc5",
          300: "#7fdaa1",
          400: "#49c77a",
          500: "#24ac5f",
          600: "#17884a",
          700: "#146c3c",
          800: "#145632",
          900: "#114729",
        },
      },
      boxShadow: {
        soft: "0 24px 60px -28px rgba(15, 23, 42, 0.28)",
        glow: "0 30px 80px -30px rgba(36, 172, 95, 0.45)",
      },
      backgroundImage: {
        "hero-grid":
          "radial-gradient(circle at top, rgba(255,255,255,0.18), transparent 32%), linear-gradient(135deg, rgba(17,24,39,0.12) 0%, rgba(17,24,39,0) 42%)",
      },
      animation: {
        float: "float 7s ease-in-out infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
    },
  },
  plugins: [],
};
