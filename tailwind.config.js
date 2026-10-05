/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#171717",
        paper: "#FAFAF9",
        line: "#E4E4E1",
        teal: {
          50: "#EEF5F4",
          100: "#D5E6E4",
          400: "#2C7A77",
          600: "#0B4F4F",
          700: "#073A3A",
        },
        amber: {
          50: "#FDF3E7",
          400: "#D97706",
          600: "#B45F05",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
