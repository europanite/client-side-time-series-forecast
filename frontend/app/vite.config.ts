import { defineConfig } from "vite";

export default defineConfig({
  base: "/client_side_time_series_forecast/",
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