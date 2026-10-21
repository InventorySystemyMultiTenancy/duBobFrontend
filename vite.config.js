import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Identificador único de cada build. O app compara com /version.json para
// avisar quem está com a página aberta que saiu uma versão nova.
const BUILD_ID = String(Date.now())

const versionFilePlugin = () => ({
  name: 'version-file',
  apply: 'build',
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: 'version.json',
      source: JSON.stringify({ version: BUILD_ID }),
    })
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), versionFilePlugin()],
  define: {
    __APP_VERSION__: JSON.stringify(BUILD_ID),
  },
})
