import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    startup: "src/startup.ts",
    migrate: "src/migrate.ts",
    "migrations/*": "src/infrastructure/persistence/migrations/*.ts",
  },
  format: "esm",
  deps: {
    alwaysBundle: ["@calibrate/local-runtime-config"],
  },
});
