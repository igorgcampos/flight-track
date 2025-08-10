#!/usr/bin/env node

import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { minify } from 'terser';
import { minify as minifyHtml } from 'html-minifier-terser';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BUILD_DIR = join(__dirname, 'dist');
const PUBLIC_DIR = join(__dirname, 'public');

async function ensureDir(dir) {
  try {
    await mkdir(dir, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
}

async function minifyJavaScript(inputPath, outputPath) {
  console.log(`Minifying ${inputPath}...`);
  const code = await readFile(inputPath, 'utf8');
  const result = await minify(code, {
    compress: {
      drop_console: true,
      drop_debugger: true,
      pure_funcs: ['console.log', 'console.info', 'console.debug']
    },
    mangle: true,
    format: {
      comments: false
    }
  });
  
  await writeFile(outputPath, result.code);
  
  const originalSize = Buffer.byteLength(code, 'utf8');
  const minifiedSize = Buffer.byteLength(result.code, 'utf8');
  const savings = ((originalSize - minifiedSize) / originalSize * 100).toFixed(1);
  
  console.log(`  ${originalSize} → ${minifiedSize} bytes (${savings}% smaller)`);
}

async function minifyCSS(inputPath, outputPath) {
  console.log(`Copying CSS ${inputPath}...`);
  const css = await readFile(inputPath, 'utf8');
  
  // Simple CSS minification
  const minified = css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/;\s*}/g, '}')
    .replace(/{\s*/g, '{')
    .replace(/;\s*/g, ';')
    .trim();
  
  await writeFile(outputPath, minified);
  
  const originalSize = Buffer.byteLength(css, 'utf8');
  const minifiedSize = Buffer.byteLength(minified, 'utf8');
  const savings = ((originalSize - minifiedSize) / originalSize * 100).toFixed(1);
  
  console.log(`  ${originalSize} → ${minifiedSize} bytes (${savings}% smaller)`);
}

async function minifyHTML(inputPath, outputPath) {
  console.log(`Minifying ${inputPath}...`);
  const html = await readFile(inputPath, 'utf8');
  const minified = await minifyHtml(html, {
    removeComments: true,
    removeEmptyAttributes: true,
    removeScriptTypeAttributes: true,
    removeStyleLinkTypeAttributes: true,
    minifyJS: true,
    minifyCSS: true,
    collapseWhitespace: true,
    conservativeCollapse: true
  });
  
  await writeFile(outputPath, minified);
  
  const originalSize = Buffer.byteLength(html, 'utf8');
  const minifiedSize = Buffer.byteLength(minified, 'utf8');
  const savings = ((originalSize - minifiedSize) / originalSize * 100).toFixed(1);
  
  console.log(`  ${originalSize} → ${minifiedSize} bytes (${savings}% smaller)`);
}

async function build() {
  console.log('🏗️  Building production assets...');
  
  // Create build directories
  await ensureDir(BUILD_DIR);
  await ensureDir(join(BUILD_DIR, 'css'));
  await ensureDir(join(BUILD_DIR, 'js'));
  
  try {
    // Minify JavaScript files
    await minifyJavaScript(
      join(PUBLIC_DIR, 'js', 'app.js'),
      join(BUILD_DIR, 'js', 'app.min.js')
    );
    
    await minifyJavaScript(
      join(PUBLIC_DIR, 'js', 'autocomplete.js'),
      join(BUILD_DIR, 'js', 'autocomplete.min.js')
    );
    
    // Minify CSS
    await minifyCSS(
      join(PUBLIC_DIR, 'css', 'styles.css'),
      join(BUILD_DIR, 'css', 'styles.min.css')
    );
    
    // Process HTML and update asset references
    const html = await readFile(join(PUBLIC_DIR, 'index.html'), 'utf8');
    const optimizedHtml = html
      .replace('./css/styles.css', './css/styles.min.css')
      .replace('./js/autocomplete.js', './js/autocomplete.min.js')
      .replace('./js/app.js', './js/app.min.js');
    
    const minified = await minifyHtml(optimizedHtml, {
      removeComments: true,
      removeEmptyAttributes: true,
      removeScriptTypeAttributes: true,
      removeStyleLinkTypeAttributes: true,
      minifyJS: true,
      minifyCSS: true,
      collapseWhitespace: true,
      conservativeCollapse: true
    });
    
    await writeFile(join(BUILD_DIR, 'index.html'), minified);
    
    const originalSize = Buffer.byteLength(html, 'utf8');
    const minifiedSize = Buffer.byteLength(minified, 'utf8');
    const savings = ((originalSize - minifiedSize) / originalSize * 100).toFixed(1);
    
    console.log(`  ${originalSize} → ${minifiedSize} bytes (${savings}% smaller)`);
    
    console.log('✅ Build completed successfully!');
    console.log(`📦 Production assets available in: ${BUILD_DIR}`);
    
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

build();