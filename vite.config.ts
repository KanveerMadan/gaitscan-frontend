import react from "@vitejs/plugin-react";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => {
  // Fail the production build instead of shipping a bundle that calls "undefined/auth/login".
  if (mode === "production" && !loadEnv(mode, ".").VITE_API_BASE_URL) {
    throw new Error("VITE_API_BASE_URL must be set for production builds (see .env.example).");
  }
  return {
    plugins: [react()],
    server: { port: 3000 },
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: "./src/setupTests.js",
      env: { VITE_API_BASE_URL: "http://api.test" },
    },
  };
});
