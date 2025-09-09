import { includeIgnoreFile } from '@eslint/compat'
import js from '@eslint/js'
import stylistic from '@stylistic/eslint-plugin'
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
		languageOptions: {
			globals: { ...globals.browser, ...globals.node },
		},
		rules: { 'no-undef': 'off' },
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
	{
		plugins: { '@stylistic': stylistic },

		rules: {
			'no-undef': 'off',
			'@stylistic/quotes': ['error', 'backtick'],
			'svelte/no-useless-mustaches': 'off',
			'svelte/no-at-html-tags': 'off',
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
)
