import adapter from '@sveltejs/adapter-static'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

/** @type {import('@sveltejs/kit').Config} */
export default {
	compilerOptions: {
		runes: true,
	},
	kit: {
		adapter: adapter({
			assets: 'build',
			fallback: undefined,
			// default options are shown. On some platforms
			// these options are set automatically — see below
			pages: 'build',
			precompress: false,
			strict: true,
		}),
		alias: {
			'@/core': 'src/core',
			'@/feature': 'src/business/feature',
			'@/shared': 'src/business/shared',
		},
	},
	preprocess: vitePreprocess(),
}
