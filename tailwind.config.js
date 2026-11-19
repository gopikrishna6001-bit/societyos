export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        slate: {
          50: "#F7F5F0",
          100: "#252525",
          200: "#EAE6DE",
          300: "#252525",
          400: "#5C5852",
          500: "#5C5852",
          600: "#8A847C",
          700: "#EAE6DE",
          800: "#EAE6DE",
          900: "#FFFFFF",
          950: "#F7F5F0",
        },
        amber: {
          300: "#8C4E3B",
          400: "#A65F49",
          500: "#A65F49",
          950: "#252525",
        },
        red: {
          300: "#9F1239",
          900: "#F3D6D8",
          950: "#FBF4F4",
        },
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        display: ["Manrope", "sans-serif"],
      },
      boxShadow: {
        card: "none",
      },
      screens: {
        sm: "376px",
        md: "768px",
        lg: "1024px",
        xl: "1440px",
      },
    },
  },
};
