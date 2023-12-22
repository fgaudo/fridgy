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
	jsxBracketSameLine: true,
	useTabs: true,
	importOrder: [
		'<THIRD_PARTY_MODULES>',
		'^@/core',
		'^@/domain',
		'^@/application',
		'^@/presentation',
		'@/data',
		'^[./]'
	],
	singleAttributePerLine: true,
	importOrderSeparation: true,
	importOrderSortSpecifiers: true,
	arrowParens: 'avoid'
}
