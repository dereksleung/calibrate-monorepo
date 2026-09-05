import { defineConfig } from "tsdown";

export default defineConfig({
  entry: "src/app.ts",
  format: "esm",
  deps: {
    alwaysBundle: ["@calibrate/local-runtime-config"],
  },
});
