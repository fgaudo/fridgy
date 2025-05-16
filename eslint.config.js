import { includeIgnoreFile } from '@eslint/compat'
import js from '@eslint/js'
import stylistic from '@stylistic/eslint-plugin-ts'
import prettier from 'eslint-config-prettier'
import svelte from 'eslint-plugin-svelte'
import globals from 'globals'
import { fileURLToPath } from 'node:url'
import ts from 'typescript-eslint'
import { URL } from 'url'

import svelteConfig from './svelte.config.js'

const gitignorePath = fileURLToPath(new URL('./.gitignore', import.meta.url))

export default ts.config(
	includeIgnoreFile(gitignorePath),
	js.configs.recommended,
	...ts.configs.strictTypeChecked,
	...ts.configs.stylisticTypeChecked,
	...svelte.configs.recommended,
	prettier,
	...svelte.configs.prettier,
	{
		plugins: { '@stylistic/ts': stylistic },

		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},

			globals: {
				...globals.browser,
				...globals.node,
			},
		},
		ignores: ['eslint.config.js', 'svelte.config.js'],
		rules: {
			'no-undef': 'off',
			'@stylistic/ts/quotes': ['error', 'backtick'],
			'svelte/no-useless-mustaches': 'off',
			'@typescript-eslint/no-unnecessary-condition': [
				'error',
				{
					allowConstantLoopConditions: 'only-allowed-literals',
				},
			],
			'@typescript-eslint/consistent-type-definitions': ['off'],
		},
	},
	{
		files: ['**/*.svelte'],

		rules: {
			'@typescript-eslint/no-unsafe-assignment': 'off',
		},
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],

		languageOptions: {
			parserOptions: {
				projectService: true,
				extraFileExtensions: ['.svelte'],
				parser: ts.parser,
				svelteConfig,
			},
		},
	},
)
