import eslint from '@eslint/js'
import eslintConfig from 'eslint-config-prettier'
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
		files: [
			'src/index.ts',
			'src/ui/**/*.ts',
			'src/ui/**/*.tsx',
		],
		rules: {
			'@typescript-eslint/no-non-null-assertion':
				'off',
			'@typescript-eslint/no-unnecessary-type-assertion':
				'error',
		},
	},
	{
		rules: {
			'@typescript-eslint/no-unnecessary-type-assertion':
				'error',
			'@typescript-eslint/no-unused-vars': 'off',
		},
	},
	eslintConfig,
	{ ignores: ['*.js', '*.ts'] },
]
