const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');

const root = process.cwd();
const ignoredDirs = new Set(['node_modules', '.expo', '.git']);
const extensions = new Set(['.js', '.jsx']);

function collectFiles(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) {
        collectFiles(path.join(dir, entry.name), files);
      }
      continue;
    }

    if (extensions.has(path.extname(entry.name))) {
      files.push(path.join(dir, entry.name));
    }
  }

  return files;
}

const files = collectFiles(root);
const failures = [];

for (const file of files) {
  const code = fs.readFileSync(file, 'utf8');

  try {
    parser.parse(code, {
      sourceType: 'module',
      plugins: ['jsx'],
    });
  } catch (error) {
    failures.push(`${path.relative(root, file)}: ${error.message}`);
  }
}

if (failures.length > 0) {
  console.error('Falha ao validar JSX:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`JSX válido em ${files.length} arquivo(s).`);
