module.exports = {
	env: {
		browser: true,
		es2021: true
	},
	settings: {
		react: {
			version: 'detect'
		}
	},
	extends: [
		'eslint:recommended',
		'plugin:react/recommended',
		'plugin:@typescript-eslint/recommended',
		'plugin:@typescript-eslint/recommended-requiring-type-checking',
		'plugin:@typescript-eslint/strict',
		'plugin:react/jsx-runtime',
		'plugin:react-hooks/recommended',

		'plugin:functional/strict',
		'plugin:functional/external-typescript-recommended',

		'prettier'
	],
	overrides: [],
	parser: '@typescript-eslint/parser',
	parserOptions: {
		ecmaVersion: 'latest',
		sourceType: 'module',
		project: './tsconfig.json'
	},
	root: true,
	plugins: [
		'react',
		'react-hooks',
		'@typescript-eslint',
		'functional',
		'eslint-plugin-tsdoc'
	],
	rules: {
		'no-shadow': 'error',
		'functional/prefer-immutable-types': [
			'error',
			{
				enforcement: 'ReadonlyDeep',
				ignoreInferredTypes: true,
				ignoreTypePattern: [
					'Observable',
					'Maybe',
					'Single',
					'Once[A-Z]',
					'On[A-Z]'
				]
			}
		],
		'@typescript-eslint/no-unnecessary-type-assertion': 'error',
		'functional/functional-parameters': 'off',
		'functional/no-promise-reject': 'error',
		'functional/type-declaration-immutability': 'off',

		'tsdoc/syntax': 'warn'
	}
}
