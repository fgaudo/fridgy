import { visualizer } from 'rollup-plugin-visualizer'
import { defineConfig } from 'vite'
import { ViteEjsPlugin } from 'vite-plugin-ejs'
import { viteSingleFile } from 'vite-plugin-singlefile'
import solid from 'vite-plugin-solid'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig(_params => ({
	test: {
		coverage: {
			provider: 'v8',
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
		visualizer({
			open: true,
			template: 'network',
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
	server: {
		host: '::',
	},
}))
