import eslint from '@eslint/js'
import eslintConfig from 'eslint-config-prettier'
import solid from 'eslint-plugin-solid/configs/typescript.js'
import sonarjs from 'eslint-plugin-sonarjs'
import tseslint from 'typescript-eslint'

export default [
	eslint.configs.recommended,
	...tseslint.configs.strictTypeChecked,
	...tseslint.configs.stylisticTypeChecked,
	{
		languageOptions: {
			parserOptions: {
				project: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
	},
	{
		files: ['**/*.{ts,tsx}'],
		...solid,
	},
	eslintConfig,
	{ ignores: ['*.js', '*.ts'] },
	{
		files: [
			'src/index.ts',
			'src/ui/**/*.ts',
			'src/ui/**/*.tsx',
		],
		rules: {
			'@typescript-eslint/no-non-null-assertion':
				'off',
		},
	},
	sonarjs.configs.recommended,
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
	{
		files: ['src/**/*.test.ts'],
		rules: {
			'sonarjs/no-duplicate-string': 'off',
		},
	},
]
