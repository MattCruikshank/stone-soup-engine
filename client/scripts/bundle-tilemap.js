#!/usr/bin/env node
/**
 * Copies tilemap-editor source files to public/ for dynamic loading.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = resolve(__dirname, '../src/editor/tilemap');
const outDir = resolve(__dirname, '../public/tilemap');

mkdirSync(outDir, { recursive: true });

writeFileSync(resolve(outDir, 'tilemap-editor.js'), readFileSync(resolve(srcDir, 'tilemap-editor.js')));
writeFileSync(resolve(outDir, 'tilemap-editor.css'), readFileSync(resolve(srcDir, 'styles.css')));

console.log('Tilemap editor: copied to public/tilemap/');
