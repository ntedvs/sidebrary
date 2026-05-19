import babel from "@rolldown/plugin-babel"
import tailwindcss from "@tailwindcss/vite"
import react, { reactCompilerPreset } from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset()] }), tailwindcss()],
  server: {
    proxy: {
      "/api": { target: "https://sidebrary-intake.ream-33b.workers.dev", changeOrigin: true },
      "/sites": { target: "https://sidebrary-intake.ream-33b.workers.dev", changeOrigin: true },
    },
  },
})
