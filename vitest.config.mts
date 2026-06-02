import { defineConfig } from "vitest/config";
import { configDefaults } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "node",
    restoreMocks: true,
    exclude: [...configDefaults.exclude, "e2e"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "**/__tests__/**",
        "**/*.test.{ts,tsx}",
        "**/*.spec.{ts,tsx}",
        "**/node_modules/**",
        "**/.next/**",
        "**/coverage/**",
        "src/lib/supabase/database.types.ts",
        "src/middleware.ts",
      ],
    },
  },
});
