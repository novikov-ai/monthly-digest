#!/usr/bin/env node
/**
 * Build script — inlines src/style.css, src/config.js and src/app.js
 * into a single self-contained chess_digest.html.
 *
 * Usage:  node build.js
 *
 * No npm dependencies required.
 */

const fs   = require('fs');
const path = require('path');

const SRC  = 'index.html';
const DEST = 'monthly_digest.html';

if (!fs.existsSync(SRC)) {
  console.error(`Error: ${SRC} not found. Run this script from the project root.`);
  process.exit(1);
}

let html = fs.readFileSync(SRC, 'utf8');

// Replace <link rel="stylesheet" href="..."> with an inline <style> block
html = html.replace(
  /<link rel="stylesheet" href="([^"]+)"[^>]*\/?>/g,
  (_, href) => {
    const css = fs.readFileSync(path.join(__dirname, href), 'utf8');
    return `<style>\n${css}\n</style>`;
  }
);

// Replace <script src="..."></script> with inline <script> blocks
html = html.replace(
  /<script src="([^"]+)"><\/script>/g,
  (_, src) => {
    const js = fs.readFileSync(path.join(__dirname, src), 'utf8');
    return `<script>\n${js}\n</script>`;
  }
);

fs.writeFileSync(DEST, html);
const kb = (fs.statSync(DEST).size / 1024).toFixed(1);
console.log(`Built ${DEST}  (${kb} KB)`);
