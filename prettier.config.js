/** @type {import("prettier").Config} */
export default {
	useTabs: true,
	singleQuote: true,
	trailingComma: 'all',
	semi: false,
	printWidth: 80,
	plugins: [
		'prettier-plugin-tailwindcss',
		'@trivago/prettier-plugin-sort-imports',
	],
	arrowParens: 'avoid',
	importOrder: [
		'@/core',
		'@/shared',
		'@/',
		'^\\./\\$types$',
		'^\\$lib/core',
		'^\\$lib/domain',
		'^\\$lib/app',
		'^\\$lib/data',
		'^\\$lib/',
		'^[./]',
	],
	importOrderSeparation: true,
	importOrderSortSpecifiers: true,
}
