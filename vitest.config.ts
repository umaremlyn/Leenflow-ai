import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    globals:     true,
    setupFiles:  ["./src/tests/setup.ts"],
    coverage: {
      reporter:  ["text", "json", "html"],
      include:   ["src/lib/**", "src/app/api/**"],
      exclude:   ["src/tests/**", "node_modules/**"],
    },
  },
  resolve: {
    alias: { "@": resolve(__dirname, "./src") },
  },
});
