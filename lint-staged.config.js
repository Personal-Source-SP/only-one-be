module.exports = {
    '*.ts': ['eslint --fix', 'tsc-files --noEmit'],
    // '{!(package)*.json,*.code-snippets,.!(browserslist)*rc}': [
    //   'yarn lint:prettier --parser json',
    // ],
    // 'package.json': ['yarn lint:prettier'],
    // '*.md': ['yarn lint:markdownlint', 'yarn lint:prettier'],
};
