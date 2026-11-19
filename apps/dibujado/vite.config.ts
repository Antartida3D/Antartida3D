import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// Vercel Web Analytics (https://vercel.com/docs/analytics/quickstart, "html" snippet).
// The script only exists on Vercel deployments, so builds elsewhere (preview, e2e) leave it out.
const vercelAnalytics: Plugin = {
  name: 'vercel-analytics',
  apply: 'build',
  transformIndexHtml: () =>
    process.env.VERCEL
      ? [
          {
            tag: 'script',
            children: 'window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };',
            injectTo: 'head',
          },
          { tag: 'script', attrs: { defer: true, src: '/_vercel/insights/script.js' }, injectTo: 'head' },
        ]
      : [],
};

export default defineConfig({
  plugins: [react(), vercelAnalytics],
  server: { port: 5103, strictPort: true },
  preview: { port: 5103, strictPort: true },
});
