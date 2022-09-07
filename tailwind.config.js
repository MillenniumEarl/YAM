module.exports = {
  content: [
    "./packages/renderer/index.html",
    "./packages/renderer/src/App.vue",
    "./packages/renderer/src/components/*.vue",
    "./packages/renderer/dist/*.{vue,js,ts,jsx,tsx}"],
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
