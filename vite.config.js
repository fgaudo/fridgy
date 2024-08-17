/// <reference types="vitest" />
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import solid from 'vite-plugin-solid'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
	plugins: [
		solid(),
		tsconfigPaths(),
		viteSingleFile({
			removeViteModuleLoader: true,
		}),
	],
	root: 'src',
	publicDir: '../public',
	build: {
		emptyOutDir: true,
		outDir: '../dist',
		rollupOptions: {
			plugins: [],
		},
	},
	server: { host: '::' },
})
