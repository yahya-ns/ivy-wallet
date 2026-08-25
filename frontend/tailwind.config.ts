import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ivy: {
          purple: "#5C3DF5",
          "purple-light": "#7962F7",
          green: "#12B880",
          red: "#F53D3D",
          blue: "#3193F5",
          yellow: "#F5D018",
          orange: "#F57A3D",
          dark: "#09090A",
          darkGray: "#1C1C1F",
          lightGray: "#28282C",
          surface: "#1C1C1F",
          background: "#09090A",
          text: "#FAFAFC",
          muted: "#74747A",
        },
      },
      borderRadius: {
        'ivy': '24px',
        'ivy-sm': '16px',
        'ivy-lg': '32px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
