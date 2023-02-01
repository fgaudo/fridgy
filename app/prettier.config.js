module.exports = {
	plugins: [
		require.resolve('@trivago/prettier-plugin-sort-imports'),
		require('prettier-plugin-tailwindcss')
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
	singleAttributePerLine: false,
	importOrderSeparation: true,
	importOrderSortSpecifiers: true,
	arrowParens: 'avoid'
}
