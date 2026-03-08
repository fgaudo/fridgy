// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config')
const expoConfig = require('eslint-config-expo/flat')
const stylistic = require('@stylistic/eslint-plugin')
const eslintConfigPrettier = require('eslint-config-prettier/flat')
const typescriptEslint = require('typescript-eslint')

module.exports = defineConfig([
	expoConfig,
	{
		languageOptions: {
			parserOptions: {
				projectService: true,
			},
		},
	},
	typescriptEslint.configs.strictTypeChecked,
	{ plugins: { '@stylistic': stylistic } },
	{
		rules: {
			'@typescript-eslint/no-invalid-void-type': ['off'],
			'@typescript-eslint/no-redeclare': ['off'],
			'import/namespace': ['off'],
			'@typescript-eslint/no-unused-vars': ['off'],
			'@stylistic/quotes': ['error', 'single'],
			'@typescript-eslint/consistent-type-assertions': [
				'error',
				{ assertionStyle: 'never' },
			],
			'@typescript-eslint/strict-boolean-expressions': [
				'error',
				{
					allowAny: false,
					allowNullableBoolean: false,
					allowNullableEnum: false,
					allowNullableNumber: false,
					allowNullableObject: false,
					allowNullableString: false,
					allowNumber: false,
					allowRuleToRunWithoutStrictNullChecksIKnowWhatIAmDoing: false,
					allowString: false,
				},
			],
		},
	},
	{
		ignores: ['dist/*'],
	},
	eslintConfigPrettier,
])
