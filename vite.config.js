import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const novalumenSecret = env.NOVALUMEN_API_SECRET || env.VITE_NOVALUMEN_API_SECRET;
  const attachNovalumenSecret = (proxy) => {
    if (!novalumenSecret) return;

    proxy.on('proxyReq', (proxyReq) => {
      proxyReq.setHeader('X-API-Secret', novalumenSecret);
    });
  };

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      proxy: {
        '/novalumen-api': {
          target: 'https://api.novalumen.org',
          changeOrigin: true,
          configure: attachNovalumenSecret,
          rewrite: (path) => path.replace(/^\/novalumen-api/, ''),
        },
        '/novalumen-api-secure': {
          target: 'https://api.novalumen.org',
          changeOrigin: true,
          headers: novalumenSecret
            ? { 'X-API-Secret': novalumenSecret }
            : undefined,
          configure: attachNovalumenSecret,
          rewrite: (path) => path.replace(/^\/novalumen-api-secure/, ''),
        },
      },
    },
  };
})
