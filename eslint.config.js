import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import pluginVue from 'eslint-plugin-vue'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'

export default defineConfigWithVueTs(
  {
    name: 'app/files-to-lint',
    files: ['**/*.{ts,mts,tsx,vue}']
  },
  {
    name: 'app/files-to-ignore',
    ignores: [
      '**/dist/**',
      '**/dist-ssr/**',
      '**/coverage/**',
      '**/node_modules/**',
      '**/.vercel/**'
    ]
  },
  pluginVue.configs['flat/essential'],
  vueTsConfigs.recommended,
  {
    rules: {
      // The codebase intentionally keeps loosely-typed Firestore doc payloads as
      // `Record<string, any>` at the data-access boundary (mapped to typed models
      // immediately after) — enforcing no-explicit-any there would mean churning
      // every store without a correctness benefit.
      '@typescript-eslint/no-explicit-any': 'off',
      'vue/multi-word-component-names': 'off',
      // Established convention for discarding destructured keys, e.g.
      // `const { id: _i, createdAt: _c, ...rest } = deal`.
      '@typescript-eslint/no-unused-vars': ['error', { varsIgnorePattern: '^_', argsIgnorePattern: '^_' }]
    }
  },
  skipFormatting
)
