import tsconfigPaths from "vite-tsconfig-paths";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ["src/**/*.test.ts"],
    exclude: [...configDefaults.exclude, "dist/**"],
    globals: true,
    environment: "node",
  },
});
