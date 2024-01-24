/// <reference types="vitest" />
import analyze from 'rollup-plugin-analyzer'
import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
	plugins: [solid(), tsconfigPaths()],
	build: {
		rollupOptions: {
			plugins: [analyze()],
		},
	},
	test: {
		dir: './src',
	},
})
