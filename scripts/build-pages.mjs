import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const output = path.join(root, 'dist');
mkdirSync(output, { recursive: true });
for (const entry of ['index.html', 'style.css', 'favicon.svg', 'src']) {
  cpSync(path.join(root, entry), path.join(output, entry), { recursive: true });
}
writeFileSync(path.join(output, '.nojekyll'), '');
console.log('GitHub Pages files prepared in dist/.');
