import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    base: './', // Usar rutas relativas para builds portables
    resolve: {
        alias: {
            '@': '/src',
        },
    },
})
