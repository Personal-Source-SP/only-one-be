// @ts-nocheck
const rules = {
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-expressions': 'off',
    'import/named': 'off',
    'import/no-named-as-default-member': 'off',
    'import/no-named-as-default': 'off',
    // 'import/order': [
    //     'error',
    //     {
    //         'newlines-between': 'always',
    //         groups: [
    //             'builtin',
    //             ['internal', 'external'],
    //             ['sibling', 'parent', 'index'],
    //         ],
    //         pathGroups: [
    //             {
    //                 pattern: '@src/**',
    //                 group: 'external',
    //                 position: 'after',
    //             },
    //         ],
    //         alphabetize: {
    //             order: 'asc',
    //             caseInsensitive: true,
    //         },
    //     },
    // ],
    'simple-import-sort/imports': 'error',
    'simple-import-sort/exports': 'error',
    'import/first': 'error',
    'import/newline-after-import': 'error',
    'import/no-duplicates': 'error',
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars-experimental': 'off',
    'no-unused-vars': 'off',
};
/**
 * @type {import('eslint').Linter.FlatConfig}
 */
module.exports = {
    parser: '@typescript-eslint/parser',
    parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: __dirname,
        ecmaVersion: 2022,
        sourceType: 'module',
    },
    overrides: [
        {
            files: ['*.ts', '*.tsx'],
            parser: '@typescript-eslint/parser',
        },
    ],
    env: {
        jest: true,
        node: true,
    },
    ignorePatterns: ['.eslintrc.js'],
    extends: [
        'plugin:import/typescript',
        'plugin:prettier/recommended',
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:import/errors',
        'plugin:import/warnings',
    ],
    plugins: ['@typescript-eslint', 'prettier', 'simple-import-sort', 'import'],
    rules: {
        ...rules,
        // 'prettier/prettier': [
        //     'error',
        //     {
        //         semi: true,
        //         trailingComma: 'all',
        //         endOfLine: 'auto',
        //         printWidth: 140,
        //         singleQuote: true,
        //         tabWidth: 4,
        //         useTabs: false,
        //     },
        // ],
    },
    settings: {
        'import/resolver': {
            typescript: {},
        },
    },
    root: true,
};
