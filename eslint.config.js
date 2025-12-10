// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config')
const expoConfig = require('eslint-config-expo/flat')
const stylistic = require('@stylistic/eslint-plugin')

module.exports = defineConfig([
	expoConfig,
	{ plugins: { '@stylistic': stylistic } },
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
