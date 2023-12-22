module.exports = {
	root: true,
	env: { browser: true, es2020: true },
	extends: [
		'eslint:recommended',
		'plugin:react/recommended',
		'plugin:@typescript-eslint/strict-type-checked',
		'plugin:@typescript-eslint/stylistic-type-checked',
		'plugin:react/jsx-runtime',
		'plugin:react-hooks/recommended',
		'prettier'
	],
	parserOptions: {
		project: true,
		tsconfigRootDir: __dirname
	},
	ignorePatterns: ['dist', '.eslintrc.cjs'],
	parser: '@typescript-eslint/parser',
	plugins: ['@typescript-eslint', 'react-refresh', 'react'],
	rules: {
		'react-refresh/only-export-components': [
			'warn',
			{ allowConstantExport: true }
		],
		'react/jsx-filename-extension': [1, { extensions: ['.tsx'] }]
	}
}
