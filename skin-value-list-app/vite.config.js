import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  // ➜ ajoute cette ligne :
  base: '/value-list-app/',   // remplace par le nom de ton dépôt
});
