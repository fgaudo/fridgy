/// <reference types="vitest" />
import { defineConfig } from 'vite'
import { ViteEjsPlugin } from 'vite-plugin-ejs'
import { viteSingleFile } from 'vite-plugin-singlefile'
import solid from 'vite-plugin-solid'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig(({ mode }) => ({
	test: {
		coverage: {
			reportsDirectory: '../coverage',
		},
	},
	plugins: [
		solid(),
		tsconfigPaths(),
		viteSingleFile({
			removeViteModuleLoader: true,
		}),
		ViteEjsPlugin(),
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
}))
