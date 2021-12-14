module.exports = {
  content: ["./packages/renderer/index.html", "./packages/renderer/src/**/*.{vue,js,ts,jsx,tsx}"],
  theme: {
    extend: {},
  },
  variants: {
    extend: {
      backgroundColor: ["even", "odd"],
    },
  },
  plugins: [
    require("@tailwindcss/forms"),
    require("tailwind-scrollbar"),
  ],
};
