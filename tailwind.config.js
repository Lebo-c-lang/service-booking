/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#202B26",
        paper: "#F5F4EE",
        line: "#E1E4DC",
        teal: {
          50: "#EDF4EF",
          100: "#D9E8DC",
          400: "#3E8068",
          600: "#174C3D",
          700: "#10372E",
        },
        amber: {
          50: "#FDF3E7",
          400: "#D97706",
          600: "#B45F05",
        },
      },
      fontFamily: {
        sans: ["DM Sans", "system-ui", "sans-serif"],
        display: ["Fraunces", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};
