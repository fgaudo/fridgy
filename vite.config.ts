import { sveltekit } from '@sveltejs/kit/vite'
import tailwindcss from '@tailwindcss/vite'
import { svelteTesting } from '@testing-library/svelte/vite'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import devtoolsJson from 'vite-plugin-devtools-json'
import tsconfigPaths from 'vite-tsconfig-paths'

const file = fileURLToPath(new URL('package.json', import.meta.url))
const json = readFileSync(file, 'utf8')
const pkg = JSON.parse(json)

export default defineConfig(() => ({
	plugins: [tailwindcss(), sveltekit(), tsconfigPaths(), devtoolsJson()],
	define: {
		__VERSION__: JSON.stringify(pkg['version']),
	},
	test: {
		projects: [
			{
				extends: `./vite.config.ts`,
				plugins: [svelteTesting()],
				test: {
					name: `client`,
					environment: `jsdom`,
					clearMocks: true,
					include: [`src/**/*.svelte.{test,spec}.{js,ts}`],
					exclude: [`src/lib/server/**`],
					setupFiles: [`./vitest-setup-client.ts`],
				},
			},
			{
				extends: `./vite.config.ts`,
				test: {
					name: `server`,
					environment: `node`,
					include: [`src/**/*.{test,spec}.{js,ts}`],
					exclude: [`src/**/*.svelte.{test,spec}.{js,ts}`],
				},
			},
		],
	},
}))
