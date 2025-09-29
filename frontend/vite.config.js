import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import vercel from "vite-plugin-vercel";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), vercel(), tailwindcss()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "@components": resolve(__dirname, "./src/components"),
      "@pages": resolve(__dirname, "./src/pages"),
      "@assets": resolve(__dirname, "./src/assets"),
      "@hooks": resolve(__dirname, "./src/hooks"),
      "@context": resolve(__dirname, "./src/context"),
      "@utils": resolve(__dirname, "./src/utils"),
      "@services": resolve(__dirname, "./src/services"),
      "@styles": resolve(__dirname, "./src/styles"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
