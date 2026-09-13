import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages base URL: usually the repository name
  base: '/FlipperConvertMCT/',
});
