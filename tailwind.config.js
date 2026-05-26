/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#5B0638",
        secondary: "#E4007F",
        accent: "#EAF9FF",
        "accent-dark": "#00A7D8",
        "text-main": "#24111D",
        "text-muted": "#725264",
        "card-bg": "#FFFFFF",
        "border-soft": "#BEEBFA",
        ink: "#EAF9FF",
        ember: "#E4007F",
        gold: "#FDD100",
        lacquer: "#FFFFFF",
        smoke: "#725264",
        cream: "#5B0638",
        rosso: "#C2185B",
      },
      fontFamily: {
        display: ["Montserrat", "Inter", "sans-serif"],
        body: ["Montserrat", "Inter", "sans-serif"],
        script: ["Montserrat", "Inter", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 4px rgba(91,6,56,0.08), 0 8px 22px rgba(0,167,216,0.10)",
        "card-hover":
          "0 2px 10px rgba(91,6,56,0.14), 0 12px 30px rgba(228,0,127,0.16)",
        glow: "0 0 0 1px rgba(228,0,127,0.20), 0 10px 28px rgba(91,6,56,0.16)",
      },
      backgroundImage: {
        texture:
          "radial-gradient(circle at 10% 20%, rgba(228,0,127,0.10), transparent 35%), radial-gradient(circle at 90% 0%, rgba(0,167,216,0.16), transparent 40%)",
      },
    },
  },
  plugins: [],
};
