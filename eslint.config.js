import eslint from '@eslint/js'
import eslintConfig from 'eslint-config-prettier'
import solid from 'eslint-plugin-solid/configs/typescript.js'
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
	{
		rules: {
			'@typescript-eslint/no-unnecessary-type-assertion':
				'error',
			'@typescript-eslint/no-unused-vars': 'warn',
			'@typescript-eslint/no-confusing-void-expression':
				'error',
			'@typescript-eslint/switch-exhaustiveness-check':
				'error',
			'solid/reactivity': 'off',
		},
	},
]
