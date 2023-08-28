/* eslint-env node */

import { chrome } from "../../electron-vendors.config.json";
import { join } from "path";
import { builtinModules } from "module";
import vue from "@vitejs/plugin-vue";
import Icons from "unplugin-icons/vite";
import IconsResolver from "unplugin-icons/resolver";
import Components from "unplugin-vue-components/vite";

const PACKAGE_ROOT = __dirname;

/**
 * @type {import('vite').UserConfig}
 * @see https://vitejs.dev/config/
 */
const config = {
  mode: process.env.MODE,
  root: PACKAGE_ROOT,
  resolve: {
    alias: {
      "/@/": join(PACKAGE_ROOT, "src") + "/",
    },
  },
  plugins: [
    vue(),
    Components({
      resolvers: IconsResolver(),
    }),
    Icons(),
  ],
  base: "",
  server: {
    fs: {
      strict: true,
    },
  },
  build: {
    sourcemap: true,
    target: `chrome${chrome}`,
    outDir: "dist",
    assetsDir: ".",
    rollupOptions: {
      external: [
        ...builtinModules,
      ],
    },
    emptyOutDir: true,
    brotliSize: false,
  },
};

export default config;
