import adapter from '@sveltejs/adapter-static'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

/** @type {import('@sveltejs/kit').Config} */
export default {
	preprocess: vitePreprocess(),
	compilerOptions: {
		runes: true,
	},
	kit: {
		alias: {
			'@/core': 'src/core',
			'@/feature': 'src/business/feature',
			'@/shared': 'src/business/shared',
		},
		adapter: adapter({
			// default options are shown. On some platforms
			// these options are set automatically — see below
			pages: 'build',
			assets: 'build',
			fallback: undefined,
			precompress: false,
			strict: true,
		}),
	},
}
