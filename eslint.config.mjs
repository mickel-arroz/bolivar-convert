import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import eslintConfigPrettier from 'eslint-config-prettier'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  eslintConfigPrettier, // Disables ESLint rules that conflict with Prettier
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts'
  ]),
  {
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react',
              importNames: ['default'],
              message:
                'No uses \'import React from "react"\'. Importa solo los hooks/funciones específicas que necesites.'
            }
          ],
          patterns: [
            {
              group: ['react'],
              importNames: ['*'],
              message:
                'No uses \'import * as React from "react"\'. Importa solo los hooks/funciones específicas que necesites.'
            }
          ]
        }
      ]
    }
  }
])

export default eslintConfig
