import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/token': 'http://127.0.0.1:8000',
      '/register': 'http://127.0.0.1:8000',
      '/users': 'http://127.0.0.1:8000',
      '/logs': 'http://127.0.0.1:8000',
      '/stats': 'http://127.0.0.1:8000',
      '/search': 'http://127.0.0.1:8000',
      '/upload-audio': 'http://127.0.0.1:8000'
    }
  }
})
