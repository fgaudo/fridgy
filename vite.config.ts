import react from '@vitejs/plugin-react-swc'
import tsConfigPaths from 'rollup-plugin-tsconfig-paths'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [react()],
	build: {
		rollupOptions: {
			plugins: [tsConfigPaths()],
			input: './src/presentation/index.html'
		}
	}
})
