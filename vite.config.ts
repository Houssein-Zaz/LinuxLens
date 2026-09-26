/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { absoluteMetaTags, siteUrl } from './scripts/seo';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'linuxlens-meta',
      transformIndexHtml: (html) => html.replace('<!-- meta-absolues -->', absoluteMetaTags(siteUrl(process.env))),
    },
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    // Les pages chargées à la demande sont compilées au premier rendu, plus lent quand toute la suite tourne
    testTimeout: 15000,
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
  },
});
