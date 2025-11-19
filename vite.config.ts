import { sveltekit } from '@sveltejs/kit/vite'
import tailwindcss from '@tailwindcss/vite'
import { svelteTesting } from '@testing-library/svelte/vite'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig(() => ({
	plugins: [tailwindcss(), sveltekit(), tsconfigPaths()],

	test: {
		projects: [
			{
				extends: `./vite.config.ts`,
				plugins: [svelteTesting()],
				test: {
					clearMocks: true,
					environment: `jsdom`,
					exclude: [`src/lib/server/**`],
					include: [`src/**/*.svelte.{test,spec}.{js,ts}`],
					name: `client`,
					setupFiles: [`./vitest-setup-client.ts`],
				},
			},
			{
				extends: `./vite.config.ts`,
				test: {
					environment: `node`,
					exclude: [`src/**/*.svelte.{test,spec}.{js,ts}`],
					include: [`src/**/*.{test,spec}.{js,ts}`],
					name: `server`,
				},
			},
		],
	},
}))
