/** @type {import("prettier").Config} */
export default {
	plugins: [
		'@trivago/prettier-plugin-sort-imports',
		'prettier-plugin-tailwindcss'
	],
	semi: false,
	printWidth: 80,
	singleQuote: true,
	trailingComma: 'none',
	bracketSameLine: true,
	useTabs: true,
	importOrder: [
		'<THIRD_PARTY_MODULES>',
		'^@/core',
		'^@/domain',
		'^@/app',
		'^@/data',
		'^@/ui',
		'^[./]'
	],
	singleAttributePerLine: true,
	importOrderSeparation: true,
	importOrderSortSpecifiers: true,
	arrowParens: 'avoid'
}
