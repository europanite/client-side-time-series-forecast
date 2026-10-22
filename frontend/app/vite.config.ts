import { defineConfig } from "vite";

export default defineConfig({
  base: "/client-side-time-series-forecast/",
  assetsInclude: ["**/*.wasm"],
  optimizeDeps: {
    include: ["ml-xgboost", "@wlearn/lightgbm"],
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    commonjsOptions: { transformMixedEsModules: true },
  },
});