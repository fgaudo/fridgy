// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config')
const expoConfig = require('eslint-config-expo/flat')
const stylistic = require('@stylistic/eslint-plugin')
const reactHooks = require('eslint-plugin-react-hooks')
const effect = require('@effect/eslint-plugin')

module.exports = defineConfig([
	...reactHooks.configs.flat.recommended,
	expoConfig,
	{ plugins: { '@stylistic': stylistic }, '@effect': effect },
	{
		rules: {
			'@typescript-eslint/no-redeclare': ['off'],
			'import/namespace': ['off'],
			'@typescript-eslint/no-unused-vars': ['off'],
			'@stylistic/quotes': ['error', 'single'],
		},
	},
	{
		ignores: ['dist/*'],
	},
])
