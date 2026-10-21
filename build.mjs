import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
process.chdir(fileURLToPath(new URL('.', import.meta.url)));
await build({entryPoints:['app.js'], bundle:true, format:'iife', target:['es2022'], minify:true, legalComments:'inline', outfile:'app.bundle.js'});
console.log('app.bundle.js actualizado. Abre index.html o ejecuta npm start.');
