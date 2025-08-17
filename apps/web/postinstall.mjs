import fs from 'node:fs';
const dir = './src/lib';
if (!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive: true});
