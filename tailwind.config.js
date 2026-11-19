export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        slate: {
          50: "#f7f4ee",
          100: "#1c1917",
          200: "#efeae2",
          300: "#3d342c",
          400: "#4f473f",
          500: "#5c534a",
          600: "#8d8378",
          700: "#d5cec3",
          800: "#e6e0d6",
          900: "#fffdf8",
          950: "#f7f4ee",
        },
        amber: {
          300: "#0c5c4a",
          400: "#0f6b56",
          500: "#0f6b56",
          950: "#06281f",
        },
        red: {
          300: "#9f1239",
          900: "#fecdd3",
          950: "#fff1f2",
        },
      },
      fontFamily: {
        sans: ['"Source Sans 3"', "sans-serif"],
      },
      boxShadow: {
        card: "0 10px 24px rgba(28, 25, 23, 0.08)",
      },
    },
  },
};
