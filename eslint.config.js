import eslint from '@eslint/js'
import eslintConfig from 'eslint-config-prettier'
import solid from 'eslint-plugin-solid'
import tseslint from 'typescript-eslint'

export default [
	eslint.configs.recommended,
	...tseslint.configs.strictTypeChecked,
	...tseslint.configs.stylisticTypeChecked,
	{
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
	},
	{
		files: ['**/*.{ts,tsx}'],
		...solid.configs['flat/typescript'],
		rules: {
			...solid.configs['flat/typescript'].rules,
			'solid/reactivity': 'warn',

			'solid/self-closing-comp': [
				'warn',
				{
					component: 'all', // "all" | "none"
					html: 'void', // "all" | "void" | "none"
				},
			],
		},
	},
	eslintConfig,
	{ ignores: ['*.js', '*.ts'] },
	{
		files: [
			'src/*.ts',
			'src/*.ts',
			'src/ui/**/*.ts',
			'src/ui/**/*.tsx',
		],
		rules: {
			'@typescript-eslint/no-non-null-assertion':
				'off',
		},
	},
	{
		rules: {
			'@typescript-eslint/no-unnecessary-type-assertion':
				'error',

			'@typescript-eslint/no-unused-vars': [
				'warn', // or "error"
				{
					argsIgnorePattern: '^_$',
					varsIgnorePattern: '^_$',
					caughtErrorsIgnorePattern: '^_$',
				},
			],
			'@typescript-eslint/no-confusing-void-expression':
				'error',
			'@typescript-eslint/switch-exhaustiveness-check':
				'error',
		},
	},
	{
		files: ['src/**/*.ts'],
		rules: {
			'@typescript-eslint/consistent-type-assertions':
				[
					'error',
					{
						assertionStyle: 'never',
					},
				],
		},
	},
	{
		files: ['src/**/*.test.ts'],
		rules: {
			'@typescript-eslint/consistent-type-assertions':
				[
					'error',
					{
						assertionStyle: 'as',
						objectLiteralTypeAssertions: 'allow',
					},
				],
		},
	},
]
