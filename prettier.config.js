/** @type {import("prettier").Config} */
export default {
	plugins: [
		'@trivago/prettier-plugin-sort-imports',
		'prettier-plugin-tailwindcss',
	],
	semi: false,
	printWidth: 50,
	singleQuote: true,
	trailingComma: 'all',
	bracketSpacing: true,
	bracketSameLine: true,
	useTabs: true,
	importOrder: [
		'\\.css$',
		'<THIRD_PARTY_MODULES>',
		'^@/core',
		'^@/domain',
		'^@/app',
		'^@/data',
		'^@/ui',
		'^[./]',
	],
	singleAttributePerLine: true,
	importOrderSeparation: true,
	importOrderSortSpecifiers: true,
	arrowParens: 'avoid',
}
