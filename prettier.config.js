/** @type {import("prettier").Config} */
export default {
	useTabs: true,
	singleQuote: true,
	trailingComma: 'all',
	printWidth: 50,
	plugins: [
		'prettier-plugin-svelte',
		'prettier-plugin-tailwindcss',
		'@trivago/prettier-plugin-sort-imports',
	],
	arrowParens: 'avoid',
	overrides: [
		{
			files: '*.svelte',
			options: {
				parser: 'svelte',
			},
		},
	],
	importOrder: [
		'^\\$lib/core',
		'^\\$lib/domain',
		'^\\$lib/app',
		'^\\$lib/data',
		'^[./]',
	],
	importOrderSeparation: true,
	importOrderSortSpecifiers: true,
};
