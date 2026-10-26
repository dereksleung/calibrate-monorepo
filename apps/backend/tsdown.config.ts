import { defineConfig } from "tsdown";

export default defineConfig({
  entry: "src/startup.ts",
  format: "esm",
  deps: {
    alwaysBundle: ["@calibrate/local-runtime-config"],
  },
});
