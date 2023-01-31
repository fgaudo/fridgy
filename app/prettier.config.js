module.exports = {
	plugins: [
		require('prettier-plugin-tailwindcss'),
		require('@trivago/prettier-plugin-sort-imports')
	],
	semi: false,
	printWidth: 80,
	singleQuote: true,
	trailingComma: 'none',
	jsxBracketSameLine: true,
	useTabs: true,
	importOrder: [
		'^@/domain',
		'^@/application',
		'^@/presentation',
		'@/infrastructure',
		'^[./]'
	],
	singleAttributePerLine: true,
	importOrderSeparation: true,
	importOrderSortSpecifiers: true,
	arrowParens: 'avoid'
}
