import { defineConfig, loadEnv } from "vite"
import react from "@vitejs/plugin-react"
import { viteSingleFile } from "vite-plugin-singlefile"

const DEFAULT_GAS_URL = "https://script.google.com/macros/s/AKfycbwk9HWv51gflogjbCeqGMcKeneJTB2DZy5cZ_Zqlc1bdFEtcmqTFQwEDkDTYAQoJzDhTg/exec";

// This is your main configuration file
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const gasTarget = env.VITE_GAS_API_URL || DEFAULT_GAS_URL;
  const gasProxyPathFromEnv = env.VITE_GAS_DEV_PROXY_PATH || "/api/gas";

  let gasProxyOrigin = "";
  let gasProxyPath = "";
  if (gasTarget) {
    try {
      const parsed = new URL(gasTarget);
      gasProxyOrigin = parsed.origin;
      gasProxyPath = parsed.pathname || "/";
    } catch {
      gasProxyOrigin = "";
      gasProxyPath = "";
    }
  }

  return {
    plugins: [react(), viteSingleFile()], // viteSingleFile is added here
    build: {
      target: "esnext",
      assetsInlineLimit: 100000000,
      chunkSizeWarningLimit: 100000000,
      cssCodeSplit: false,
      outDir: "dist",
    },
    server: gasProxyOrigin
      ? {
          proxy: {
            [gasProxyPathFromEnv]: {
              target: gasProxyOrigin,
              changeOrigin: true,
              secure: true,
              rewrite: () => gasProxyPath,
            },
          },
        }
      : undefined,
  };
})
